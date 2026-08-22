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
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  cancelPlatformChargeAction,
  updateSubscriptionAdminStatusAction,
} from "../../actions";

type PageProps = {
  params: Promise<{
    consultancyPublicId: string;
  }>;
};

function getSubscriptionBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "GRACE":
      return "warning";
    case "SUSPENDED":
      return "danger";
    case "CANCELED":
      return "neutral";
    default:
      return "neutral";
  }
}

function getSubscriptionLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Ativa";
    case "GRACE":
      return "Carência";
    case "SUSPENDED":
      return "Suspensa";
    case "CANCELED":
      return "Cancelada";
    default:
      return status;
  }
}

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
      {/* Platform Admin Header */}
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-xs border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin" className="w-[110px] sm:w-[130px] shrink-0">
              <TrevoOneLogo priority size={130} />
            </Link>
            <span className="hidden sm:inline-block text-zinc-300">|</span>
            <Link
              href="/admin/cobranca-plataforma"
              className="hidden sm:inline-block text-xs font-semibold text-zinc-600 hover:text-zinc-900 truncate uppercase tracking-wider"
            >
              Cobrança da Plataforma
            </Link>
            <span className="hidden sm:inline-block text-zinc-300">/</span>
            <span className="hidden sm:inline-block text-xs font-bold text-zinc-900 truncate max-w-[180px]">
              {consultancyName}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/admin/cobranca-plataforma/cobrancas/nova?consultancy=${consultancyPublicId}`}>
              <Button variant="primary" size="sm">
                + Nova Cobrança
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header & Status Card */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                  {consultancyName}
                </h1>
                <Badge variant={getSubscriptionBadgeVariant(effectiveStatus)} size="md">
                  {getSubscriptionLabel(effectiveStatus)}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500">
                Slug: <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">{consultancySlug}</code> • Fuso Horário: {timezone} • Status Administrativo: <strong className="text-zinc-800 font-semibold">{administrativeStatus}</strong>
              </p>
            </div>
          </div>

          {effectiveStatus === "GRACE" && blockingCharge && (
            <Alert variant="warning" title="Consultoria em Período de Carência">
              <p className="text-xs">
                Fatura em atraso: <strong className="font-bold">{blockingCharge.title}</strong> ({formatBrlCents(blockingCharge.amountCents)}) • Vencimento: {formatIsoDateToBr(blockingCharge.dueOn)} • Limite da carência: <strong className="font-bold">{formatIsoDateToBr(blockingCharge.graceEndsOn)}</strong>.
              </p>
            </Alert>
          )}

          {effectiveStatus === "SUSPENDED" && (
            <Alert variant="danger" title="Acesso Operacional Suspenso">
              <p className="text-xs">
                {effectiveReason === "NONPAYMENT"
                  ? "Suspensão automática por inadimplência após vencimento do prazo de carência."
                  : `Suspensão administrativa manual: ${manualSuspensionReason || "Sem motivo informado."}`}
              </p>
            </Alert>
          )}

          {effectiveStatus === "CANCELED" && (
            <Alert variant="info" title="Assinatura Cancelada">
              <p className="text-xs">
                Assinatura encerrada na plataforma Trevo One.
                {cancellationReason && (
                  <span className="block mt-1 font-medium italic">
                    Motivo: &quot;{cancellationReason}&quot;
                  </span>
                )}
              </p>
            </Alert>
          )}

          {/* Gestão Administrativa da Assinatura (Manual Suspend / Reactivate / Cancel) */}
          {administrativeStatus !== "CANCELED" && (
            <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
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
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                >
                  <input
                    type="text"
                    name="reason"
                    placeholder="Motivo da suspensão manual"
                    required
                    className="h-9 px-3 rounded-xl border border-zinc-200 text-xs w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                  <Button type="submit" variant="danger" size="sm" className="shrink-0">
                    Suspender Manualmente
                  </Button>
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
                  <Button type="submit" variant="primary" size="sm" className="shrink-0 bg-emerald-600 hover:bg-emerald-700">
                    Reativar Administrativamente
                  </Button>
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
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <input
                  type="text"
                  name="reason"
                  placeholder="Motivo do cancelamento"
                  required
                  className="h-9 px-3 rounded-xl border border-zinc-200 text-xs w-full sm:w-52 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                />
                <Button type="submit" variant="outline" size="sm" className="shrink-0 text-red-700 hover:bg-red-50 hover:border-red-200">
                  Cancelar Assinatura
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Fila de Comprovantes em Análise desta Consultoria */}
        {pendingReceipts.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" />
              Comprovantes em Análise desta Consultoria ({pendingReceipts.length})
            </h2>
            <div className="divide-y divide-zinc-100">
              {pendingReceipts.map((rc) => (
                <div
                  key={rc.publicId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-zinc-900">{rc.chargeTitle}</p>
                    <p className="text-zinc-500 text-[11px]">
                      Enviado por {rc.submitterName} em {formatIsoDateToBr(rc.createdAt.toISOString().slice(0, 10))} • Arquivo: {rc.fileName}
                    </p>
                  </div>
                  <Link href={`/admin/cobranca-plataforma/comprovantes/${rc.publicId}`} className="shrink-0">
                    <Button variant="primary" size="sm" className="bg-amber-600 hover:bg-amber-700">
                      Avaliar Comprovante →
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Faturas em Aberto */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Faturas em Aberto</h2>
              <p className="text-xs text-zinc-500">Cobranças emitidas pendentes de quitação.</p>
            </div>
            <Link href={`/admin/cobranca-plataforma/cobrancas/nova?consultancy=${consultancyPublicId}`}>
              <Button variant="outline" size="sm">
                + Nova Cobrança
              </Button>
            </Link>
          </div>

          {openCharges.length === 0 ? (
            <p className="text-xs text-zinc-500 py-4 text-center">Nenhuma fatura em aberto para esta consultoria.</p>
          ) : (
            <div className="divide-y divide-zinc-100">
              {openCharges.map((ch) => (
                <div
                  key={ch.publicId}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-zinc-900 text-sm truncate">{ch.title}</span>
                      <span className="font-bold text-zinc-900 text-sm">
                        {formatBrlCents(ch.amountCents)}
                      </span>
                    </div>
                    {ch.description && (
                      <p className="text-zinc-500 text-[11px] truncate">{ch.description}</p>
                    )}
                    <p className="text-zinc-600">
                      Vencimento: <strong className="text-zinc-800 font-semibold">{formatIsoDateToBr(ch.dueOn)}</strong> • Carência: {ch.graceDaysSnapshot} dias
                      {ch.submittedReceiptPublicId && (
                        <span className="text-amber-700 font-semibold ml-2">
                          (Possui comprovante em análise)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="shrink-0">
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
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="text-red-700 hover:bg-red-50 hover:border-red-200"
                        >
                          Cancelar Cobrança
                        </Button>
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
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-zinc-900">Histórico de Faturas Quitadas</h2>
            <div className="divide-y divide-zinc-100">
              {paidCharges.map((ch) => (
                <div
                  key={ch.publicId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">{ch.title}</p>
                    <p className="text-zinc-500 text-[11px]">
                      Vencimento: {formatIsoDateToBr(ch.dueOn)} • Quitado em {formatIsoDateToBr(ch.paidAt?.toISOString().slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-[#00A859] text-sm">
                      {formatBrlCents(ch.amountCents)}
                    </span>
                    <Badge variant="success" size="sm">
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
