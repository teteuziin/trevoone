import { NextRequest, NextResponse } from "next/server";
import { processAsaasWebhookEvent } from "@/lib/consultancies/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint de Webhook para notificações do gateway Asaas.
 *
 * Configuração no Asaas:
 * - URL: https://trevoone.com/api/webhooks/asaas (ou URL de testes/túnel em desenvolvimento)
 * - Token: Definido na variável ASAAS_WEBHOOK_TOKEN
 * - Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE
 */
export async function POST(request: NextRequest) {
  try {
    const receivedToken =
      request.headers.get("asaas-access-token") ||
      request.headers.get("Asaas-Access-Token") ||
      null;

    const payload = await request.json().catch(() => null);

    if (!payload) {
      return NextResponse.json(
        { error: "Payload JSON inválido ou vazio." },
        { status: 400 }
      );
    }

    const result = await processAsaasWebhookEvent({
      payload,
      receivedToken,
    });

    if (!result.success) {
      const isAuthError =
        result.message.toLowerCase().includes("não autorizado") ||
        result.message.toLowerCase().includes("token");
      return NextResponse.json(
        { error: result.message },
        { status: isAuthError ? 401 : 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: result.message },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao processar evento de webhook." },
      { status: 500 }
    );
  }
}
