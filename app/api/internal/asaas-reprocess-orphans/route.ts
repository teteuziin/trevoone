import { NextRequest, NextResponse } from "next/server";
import { reprocessOrphanAsaasWebhookEvents, resolveAsaasWebhookToken } from "@/lib/consultancies/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint de manutenção para reprocessamento de webhooks do Asaas marcados como IGNORED_ORPHAN.
 *
 * Autenticação via:
 * - Cabeçalho 'x-cron-secret' ou 'Authorization: Bearer <secret>' (CONSULTATION_REMINDERS_CRON_SECRET)
 * - OU cabeçalho 'asaas-access-token' (ASAAS_WEBHOOK_TOKEN)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const customHeader = request.headers.get("x-cron-secret") || "";
    const webhookToken = request.headers.get("asaas-access-token") || "";

    const expectedCronSecret = process.env.CONSULTATION_REMINDERS_CRON_SECRET?.trim() || "";
    const expectedWebhookToken = resolveAsaasWebhookToken();

    const isAuthorized =
      (expectedCronSecret.length > 0 && (authHeader.includes(expectedCronSecret) || customHeader === expectedCronSecret)) ||
      (expectedWebhookToken.length > 0 && webhookToken === expectedWebhookToken);

    if (!isAuthorized) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const result = await reprocessOrphanAsaasWebhookEvents();
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Erro interno ao reprocessar webhooks órfãos." }, { status: 500 });
  }
}
