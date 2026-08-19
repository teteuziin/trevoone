import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import {
  getConsultancySubscriptionDetail,
  formatBrlCents,
  formatIsoDateToBr,
} from "@/lib/platform-admin/billing";
import { getDbConnection } from "@/lib/db/mysql";
import type { RowDataPacket } from "mysql2/promise";
import { TrevoOneLogo } from "@/components/brand/trevo-one-logo";
import { Badge } from "@/components/ui/badge";
import {
  cancelPlatformChargeAction,
  updateSubscriptionAdminStatusAction,
} from "../../actions";

type PageProps = {
  params: Promise<{
    consultancyPublicId: string;
  }>;
};

export default async function PlatformConsultancyBillingDetailPage({ params }: PageProps) {
  const { consultancyPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    redirect("/selecionar-consultoria");
  }

  // Lookup internal id
  let consultancyId = 0;
  let timezone = "America/Sao_Paulo";
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, timezone FROM consultancies WHERE public_id = ? LIMIT 1;`,
      [consultancyPublicId]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      consultancyId = Number(rows[0].id);
      timezone = String(rows[0].timezone);
    }
  } finally {
    if (connection) connection.release();
  }

  if (!consultancyId) {
    redirect("/admin/cobranca-plataforma");
  }

  const detail = await getConsultancySubscriptionDetail(consultancyId, timezone);
  if (!detail) {
    redirect("/admin/cobranca-plataforma");
  }

  const {
    consultancyName,
    consultancySlug,
    administrativeStatus,
    effectiveStatus,
    effectiveReason,
    manualSuspensionReason,
    cancellationReason,
    openCharges,
    paidCharges,
    pendingReceipts,
    blockingCharge,
  } = detail;

  return (
    <main className="min-h-svh w-full bg-zinc-50 text-zinc-900 selection:bg-[#00A859]/10 selection:text-[#00A859]">
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/admin" className="w-[110px] sm:w-[130px] shrink-0">
              <TrevoOneLogo priority size={130} />
            </Link>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              |
            </span>
            <Link
              href="/admin/cobranca-plataforma"
              className="hidden sm:inline-block text-xs font-medium text-zinc-600 hover:text-zinc-900"
            >
              Cobrança da Plataforma
            </Link>
            <span className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              /
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-zinc-900 truncate max-w-[150px] sm:max-w-[200px]">
              {consultancyName}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href={`/admin/cobranca-plataforma/cobrancas/nova?consultancy=${consultancyPublicId}`}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#00A859] hover:bg-[#008f4c] text-white transition-colors"
            >
              + Nova Cobrança
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header & Status Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900">
                  {consultancyName}
                </h1>
                <Badge
                  variant={
                    effectiveStatus === "ACTIVE"
                      ? "brand"
                      : effectiveStatus === "GRACE"
                      ? "warning"
                      : "danger"
                  }
                >
                  {effectiveStatus === "ACTIVE"
                    ? "Ativa"
                    : effectiveStatus === "GRACE"
                    ? "Em Carência"
                    : effectiveStatus === "SUSPENDED"
                    ? "Suspensa"
                    : "Cancelada"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500">
                Slug: <code>{consultancySlug}</code> • Timezone: {timezone} • Status administrativo: <strong>{administrativeStatus}</strong>
              </p>
            </div>
          </div>

          {effectiveStatus === "GRACE" && blockingCharge && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm">
              <p className="font-semibold">Consultoria em período de carência</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Fatura em atraso: <strong>{blockingCharge.title}</strong> ({formatBrlCents(blockingCharge.amountCents)}) • Vencimento: {formatIsoDateToBr(blockingCharge.dueOn)} • Limite da carência: <strong>{formatIsoDateToBr(blockingCharge.graceEndsOn)}</strong>.
              </p>
            </div>
          )}

          {effectiveStatus === "SUSPENDED" && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm">
              <p className="font-semibold">Acesso operacional da consultoria suspenso</p>
              <p className="text-xs text-red-800 mt-0.5">
                {effectiveReason === "NONPAYMENT"
                  ? "Suspensão por inadimplência além do prazo de carência."
                  : `Suspensão administrativa manual: ${manualSuspensionReason || "Sem motivo informado."}`}
              </p>
            </div>
          )}

          {effectiveStatus === "CANCELED" && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm">
              <p className="font-semibold">Assinatura da consultoria cancelada permanentemente</p>
              {cancellationReason && (
                <p className="text-xs text-red-800 mt-0.5">Motivo: {cancellationReason}</p>
              )}
            </div>
          )}

          {/* Gestão Administrativa da Assinatura (Manual Suspend / Reactivate / Cancel) */}
          {administrativeStatus !== "CANCELED" && (
            <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-3">
              {administrativeStatus === "ACTIVE" ? (
                <form
                  action={async (formData) => {
                    "use server";
                    const reason = String(formData.get("reason") || "Suspensão preventiva pela plataforma.");
                    await updateSubscriptionAdminStatusAction({
                      consultancyPublicId,
                      targetStatus: "SUSPENDED",
                      reason,
                    });
                  }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input
                    type="text"
                    name="reason"
                    placeholder="Motivo da suspensão manual"
                    required
                    className="h-8 px-2.5 rounded-lg border border-zinc-200 text-xs w-56 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors"
                  >
                    Suspender Manualmente
                  </button>
                </form>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await updateSubscriptionAdminStatusAction({
                      consultancyPublicId,
                      targetStatus: "ACTIVE",
                      reason: "Reativação administrativa.",
                    });
                  }}
                >
                  <button
                    type="submit"
                    className="h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    Reativar Administrativamente
                  </button>
                </form>
              )}

              <form
                action={async (formData) => {
                  "use server";
                  const reason = String(formData.get("reason") || "Cancelamento de contrato.");
                  await updateSubscriptionAdminStatusAction({
                    consultancyPublicId,
                    targetStatus: "CANCELED",
                    reason,
                  });
                }}
                className="flex flex-wrap items-center gap-2 ml-auto"
              >
                <input
                  type="text"
                  name="reason"
                  placeholder="Motivo do cancelamento"
                  required
                  className="h-8 px-2.5 rounded-lg border border-zinc-200 text-xs w-48 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <button
                  type="submit"
                  className="h-8 px-3 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-red-50 hover:text-red-700 border border-zinc-200 hover:border-red-200 text-zinc-600 transition-colors"
                >
                  Cancelar Assinatura (Permanente)
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Fila de Comprovantes em Análise desta Consultoria */}
        {pendingReceipts.length > 0 && (
          <div className="bg-white rounded-2xl border border-amber-200 p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">
              Comprovantes em análise ({pendingReceipts.length})
            </h2>
            <div className="divide-y divide-zinc-100">
              {pendingReceipts.map((rc) => (
                <div
                  key={rc.publicId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
                >
                  <div>
                    <p className="font-semibold text-zinc-900">{rc.chargeTitle}</p>
                    <p className="text-xs text-zinc-500">
                      Enviado por {rc.submitterName} em {formatIsoDateToBr(rc.createdAt.toISOString().slice(0, 10))} • Arquivo: {rc.fileName}
                    </p>
                  </div>
                  <Link
                    href={`/admin/cobranca-plataforma/comprovantes/${rc.publicId}`}
                    className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                  >
                    Avaliar Comprovante →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Faturas em Aberto */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Faturas em aberto</h2>
            <Link
              href={`/admin/cobranca-plataforma/cobrancas/nova?consultancy=${consultancyPublicId}`}
              className="text-xs font-semibold text-[#00A859] hover:underline"
            >
              + Nova cobrança
            </Link>
          </div>

          {openCharges.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4">Nenhuma fatura em aberto.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {openCharges.map((ch) => (
                <div
                  key={ch.publicId}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs sm:text-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-900">{ch.title}</span>
                      <span className="font-bold text-zinc-900">
                        {formatBrlCents(ch.amountCents)}
                      </span>
                    </div>
                    {ch.description && (
                      <p className="text-xs text-zinc-500">{ch.description}</p>
                    )}
                    <p className="text-xs text-zinc-600">
                      Vencimento: <strong>{formatIsoDateToBr(ch.dueOn)}</strong> • Carência: {ch.graceDaysSnapshot} dias
                      {ch.submittedReceiptPublicId && (
                        <span className="text-amber-700 font-medium ml-2">
                          (Possui comprovante em análise)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!ch.submittedReceiptPublicId && (
                      <form
                        action={async () => {
                          "use server";
                          await cancelPlatformChargeAction({
                            chargePublicId: ch.publicId,
                            consultancyPublicId,
                          });
                        }}
                      >
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                        >
                          Cancelar Cobrança
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Faturas Quitadas */}
        {paidCharges.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">Faturas quitadas</h2>
            <div className="divide-y divide-zinc-100">
              {paidCharges.map((ch) => (
                <div
                  key={ch.publicId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-zinc-900">{ch.title}</p>
                    <p className="text-xs text-zinc-500">
                      Vencimento: {formatIsoDateToBr(ch.dueOn)} • Quitado em {formatIsoDateToBr(ch.paidAt?.toISOString().slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-emerald-700">
                      {formatBrlCents(ch.amountCents)}
                    </span>
                    <Badge variant="brand" size="sm">
                      Quitado
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
