/**
 * TREVO ONE — OFFICIAL INFINITEPAY WEBHOOK HANDLER
 *
 * Endpoint: POST /api/webhooks/infinitepay
 *
 * Security Architecture:
 * InfinitePay webhooks DO NOT have cryptographic signatures.
 * Therefore, receiving a webhook event NEVER releases access on its own.
 * The handler logs the event idempotently into `infinitepay_webhook_events`
 * and performs an official server-to-server POST /payment_check back to CloudWalk
 * using the backend API key before activating any student plan.
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { InfinitePayClient } from "@/lib/infinitepay/client";
import {
  confirmAndActivateCharge,
  getInfinitePayConfig,
} from "@/lib/infinitepay/service";
import type { InfinitePayWebhookPayload } from "@/lib/infinitepay/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let rawBodyText = "";
  let payload: InfinitePayWebhookPayload | null = null;

  try {
    rawBodyText = await req.text();
    payload = JSON.parse(rawBodyText) as InfinitePayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  const orderNsu = payload.order_nsu ? String(payload.order_nsu).trim() : null;
  const transactionNsu = payload.transaction_nsu ? String(payload.transaction_nsu).trim() : null;
  const invoiceSlug = payload.invoice_slug ? String(payload.invoice_slug).trim() : null;
  const captureMethod = payload.capture_method ? String(payload.capture_method).trim() : "unknown";

  const eventPublicId = crypto.randomUUID();
  let connection: PoolConnection | null = null;

  try {
    connection = await getDbConnection();

    // 1. Idempotency Check: record the webhook event
    await connection.execute(
      `INSERT INTO infinitepay_webhook_events (
         public_id,
         order_nsu,
         transaction_nsu,
         invoice_slug,
         capture_method,
         raw_payload,
         status,
         processed,
         received_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', 0, NOW(3));`,
      [
        eventPublicId,
        orderNsu,
        transactionNsu,
        invoiceSlug,
        captureMethod,
        JSON.stringify(payload),
      ]
    );

    if (!orderNsu) {
      await connection.execute(
        `UPDATE infinitepay_webhook_events
         SET status = 'IGNORED_ORPHAN',
             processed = 1,
             processed_at = NOW(3),
             processing_error = 'Payload missing order_nsu'
         WHERE public_id = ?;`,
        [eventPublicId]
      );
      return NextResponse.json({ received: true, status: "ignored_missing_order_nsu" }, { status: 200 });
    }

    // 1.1 Check for refund or chargeback events (audited for admin intervention in v1)
    const isRefundOrChargeback = Boolean(
      payload.event_type?.includes("refund") ||
      payload.event_type?.includes("chargeback") ||
      payload.status?.toLowerCase().includes("refund") ||
      payload.status?.toLowerCase().includes("chargeback")
    );

    if (isRefundOrChargeback) {
      await connection.execute(
        `UPDATE infinitepay_webhook_events
         SET status = 'REFUND_AUDITED',
             processed = 1,
             processed_at = NOW(3),
             processing_error = 'Estorno ou contestação registrado para auditoria administrativa.'
         WHERE public_id = ?;`,
        [eventPublicId]
      );
      return NextResponse.json({ received: true, status: "refund_audited" }, { status: 200 });
    }

    // 1.2 Check for duplicate processed webhook before re-running verification
    if (transactionNsu && orderNsu) {
      const [dupEvents] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM infinitepay_webhook_events
         WHERE order_nsu = ? AND transaction_nsu = ? AND status = 'PROCESSED' AND public_id != ?
         LIMIT 1;`,
        [orderNsu, transactionNsu, eventPublicId]
      );
      if (Array.isArray(dupEvents) && dupEvents.length > 0) {
        await connection.execute(
          `UPDATE infinitepay_webhook_events
           SET status = 'PROCESSED',
               processed = 1,
               processed_at = NOW(3),
               processing_error = 'Duplicate webhook event received and acknowledged idempotently.'
           WHERE public_id = ?;`,
          [eventPublicId]
        );
        return NextResponse.json({ received: true, status: "already_processed" }, { status: 200 });
      }
    }

    // 2. Resolve Charge & Consultancy from database
    const [chargeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         sc.id,
         sc.public_id,
         sc.consultancy_id,
         sc.student_membership_id,
         sc.plan_id,
         sc.amount_cents,
         sc.state,
         sc.infinitepay_slug
       FROM student_charges sc
       WHERE sc.public_id = ?
       LIMIT 1;`,
      [orderNsu]
    );

    if (!Array.isArray(chargeRows) || chargeRows.length === 0) {
      await connection.execute(
        `UPDATE infinitepay_webhook_events
         SET status = 'IGNORED_ORPHAN',
             processed = 1,
             processed_at = NOW(3),
             processing_error = 'Charge order_nsu not found in database'
         WHERE public_id = ?;`,
        [eventPublicId]
      );
      return NextResponse.json({ received: true, status: "ignored_order_not_found" }, { status: 200 });
    }

    const charge = chargeRows[0];
    const consultancyId = Number(charge.consultancy_id);

    // If already paid, mark event as processed idempotently
    if (charge.state === "PAID") {
      await connection.execute(
        `UPDATE infinitepay_webhook_events
         SET status = 'PROCESSED',
             processed = 1,
             processed_at = NOW(3)
         WHERE public_id = ?;`,
        [eventPublicId]
      );
      return NextResponse.json({ received: true, status: "already_paid" }, { status: 200 });
    }

    // 3. Resolve InfinitePay config for official verification call
    const config = await getInfinitePayConfig(consultancyId);
    if (!config || !config.enabled) {
      await connection.execute(
        `UPDATE infinitepay_webhook_events
         SET status = 'FAILED',
             processed = 1,
             processed_at = NOW(3),
             processing_error = 'InfinitePay is not enabled for this consultancy'
         WHERE public_id = ?;`,
        [eventPublicId]
      );
      return NextResponse.json({ received: true, status: "integration_disabled" }, { status: 200 });
    }

    // 4. CRITICAL SECURITY: Official server-to-server POST /payment_check verification
    const checkRes = await InfinitePayClient.paymentCheck(config, {
      handle: config.handle,
      order_nsu: orderNsu,
      slug: invoiceSlug || charge.infinitepay_slug || undefined,
      transaction_nsu: transactionNsu || undefined,
    });

    if (!checkRes.success || !checkRes.paid) {
      await connection.execute(
        `UPDATE infinitepay_webhook_events
         SET status = 'VERIFIED_FAILED',
             processed = 1,
             processed_at = NOW(3),
             processing_error = ?
         WHERE public_id = ?;`,
        [checkRes.error || "Payment not approved according to payment_check", eventPublicId]
      );
      return NextResponse.json({ received: true, status: "payment_not_verified" }, { status: 200 });
    }

    // 4.1 Verify original order amount correspondence
    if (
      checkRes.amount !== undefined &&
      checkRes.amount > 0 &&
      checkRes.amount !== Number(charge.amount_cents)
    ) {
      await connection.execute(
        `UPDATE infinitepay_webhook_events
         SET status = 'VERIFIED_FAILED',
             processed = 1,
             processed_at = NOW(3),
             processing_error = ?
         WHERE public_id = ?;`,
        [
          `Valor original do pedido (${checkRes.amount}) diverge do valor da cobrança (${charge.amount_cents})`,
          eventPublicId,
        ]
      );
      return NextResponse.json({ received: true, status: "divergent_amount" }, { status: 200 });
    }

    // Check for underpayment (buyer paid less than expected)
    // NOTE: paid_amount can legitimately exceed amount_cents if buyer paid credit card installment fees!
    const effectivePaid = checkRes.paid_amount || payload.paid_amount;
    if (
      effectivePaid !== undefined &&
      effectivePaid > 0 &&
      effectivePaid < Number(charge.amount_cents)
    ) {
      await connection.execute(
        `UPDATE infinitepay_webhook_events
         SET status = 'VERIFIED_FAILED',
             processed = 1,
             processed_at = NOW(3),
             processing_error = ?
         WHERE public_id = ?;`,
        [
          `Valor pago (${effectivePaid}) é inferior ao valor da cobrança (${charge.amount_cents})`,
          eventPublicId,
        ]
      );
      return NextResponse.json({ received: true, status: "underpaid" }, { status: 200 });
    }

    // 5. Payment verified directly by CloudWalk! Transactionally activate now.
    const activationRes = await confirmAndActivateCharge({
      consultancyId,
      chargeId: Number(charge.id),
      chargePublicId: String(charge.public_id),
      studentMembershipId: Number(charge.student_membership_id),
      planId: charge.plan_id ? Number(charge.plan_id) : null,
      amountCents: Number(charge.amount_cents),
      paidAmountCents: effectivePaid,
      originalOrderAmountCents: checkRes.amount,
      transactionNsu: checkRes.transaction_nsu || transactionNsu,
      captureMethod: checkRes.capture_method || payload.capture_method || "pix",
      installments: checkRes.installments || payload.installments || 1,
      receiptUrl: checkRes.receipt_url || payload.receipt_url,
    });

    if (!activationRes.success) {
      await connection.execute(
        `UPDATE infinitepay_webhook_events
         SET status = 'FAILED',
             processed = 1,
             processed_at = NOW(3),
             processing_error = ?
         WHERE public_id = ?;`,
        [activationRes.error || "Failed to activate charge transactionally", eventPublicId]
      );
      return NextResponse.json({ received: true, status: "activation_failed" }, { status: 500 });
    }

    // 6. Mark webhook event as PROCESSED & VERIFIED_PAID
    await connection.execute(
      `UPDATE infinitepay_webhook_events
       SET status = 'PROCESSED',
           processed = 1,
           processed_at = NOW(3)
       WHERE public_id = ?;`,
      [eventPublicId]
    );

    return NextResponse.json({ received: true, status: "activated" }, { status: 200 });
  } catch (err: unknown) {
    console.error("[InfinitePay Webhook] Critical exception:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
