import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { reprocessOrphanAsaasWebhookEvents } from "@/lib/consultancies/asaas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Valida o segredo de autenticação do job de reprocessamento de forma segura contra timing attacks.
 * Exige a variável de ambiente dedicada ASAAS_REPROCESS_CRON_SECRET.
 * Nunca reaproveita ASAAS_WEBHOOK_TOKEN ou outros segredos da aplicação.
 */
function validateReprocessCronSecret(authHeader: string | null, customHeader: string | null): boolean {
  const expectedSecret = process.env.ASAAS_REPROCESS_CRON_SECRET?.trim();
  if (!expectedSecret || expectedSecret.length === 0) {
    return false;
  }

  let providedSecret = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedSecret = authHeader.slice(7).trim();
  } else if (customHeader) {
    providedSecret = customHeader.trim();
  }

  if (!providedSecret || providedSecret.length === 0) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedSecret, "utf8");
  const providedBuffer = Buffer.from(providedSecret, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Rejeita explicitamente requisições GET para evitar acesso acidental via navegador ou cache de CDN/proxy.
 */
export async function GET() {
  return NextResponse.json(
    { error: "METHOD_NOT_ALLOWED: Este endpoint aceita apenas requisições POST autenticadas." },
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

/**
 * Endpoint de manutenção para reprocessamento de webhooks do Asaas marcados como IGNORED_ORPHAN.
 * Aceita estritamente POST autenticado via cabeçalho 'x-cron-secret' ou 'Authorization: Bearer <secret>'.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const customHeader = request.headers.get("x-cron-secret");

    if (!validateReprocessCronSecret(authHeader, customHeader)) {
      return NextResponse.json(
        { error: "UNAUTHORIZED: Segredo de cron inválido ou ausente." },
        {
          status: 401,
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      );
    }

    const result = await reprocessOrphanAsaasWebhookEvents();
    return NextResponse.json(
      { success: true, ...result },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao reprocessar webhooks órfãos." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }
}
