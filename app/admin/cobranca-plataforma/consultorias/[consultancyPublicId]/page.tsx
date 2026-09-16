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
    <div className="w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link href="/admin/cobranca-plataforma">
            <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-[40px] text-xs font-semibold">
              ← Voltar para Cobrança
            </Button>
          </Link>

          <Link href={`/admin/cobranca-plataforma/cobrancas/nova?consultancy=${consultancyPublicId}`}>
            <Button variant="primary" size="sm" className="min-h-[44px] sm:min-h-[40px] text-xs font-semibold shadow-xs">
              + Nova Cobrança
            </Button>
          </Link>
        </div>

        {/* Header & Status Card */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                  {consultancyName}
                </h1>
                <Badge variant={getSubscriptionBadgeVariant(effectiveStatus)} size="md">
                  {getSubscriptionLabel(effectiveStatus)}
                </Badge>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Slug: <code className="bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono">{consultancySlug}</code> • Fuso Horário: {timezone} • Status Administrativo: <strong className="text-[var(--text-primary)] font-semibold">{administrativeStatus}</strong>
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
            <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
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
                    className="min-h-[44px] sm:h-10 px-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] text-xs w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                  />
                  <Button type="submit" variant="danger" size="sm" className="shrink-0 min-h-[44px] sm:min-h-[40px]">
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
                  <Button type="submit" variant="primary" size="sm" className="shrink-0 min-h-[44px] sm:min-h-[40px] shadow-xs">
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
                  className="min-h-[44px] sm:h-10 px-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] text-xs w-full sm:w-52 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
                <Button type="submit" variant="outline" size="sm" className="shrink-0 min-h-[44px] sm:min-h-[40px] text-[var(--danger-foreground)] hover:bg-[var(--danger-soft)] hover:border-[var(--danger-border)]">
                  Cancelar Assinatura
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Fila de Comprovantes em Análise desta Consultoria */}
        {pendingReceipts.length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--warning-border)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning-foreground)] inline-block animate-pulse" />
              Comprovantes em Análise desta Consultoria ({pendingReceipts.length})
            </h2>
            <div className="divide-y divide-[var(--border-subtle)]">
              {pendingReceipts.map((rc) => (
                <div
                  key={rc.publicId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-[var(--text-primary)]">{rc.chargeTitle}</p>
                    <p className="text-[var(--text-secondary)] text-[11px]">
                      Enviado por {rc.submitterName} em {formatIsoDateToBr(rc.createdAt.toISOString().slice(0, 10))} • Arquivo: {rc.fileName}
                    </p>
                  </div>
                  <Link href={`/admin/cobranca-plataforma/comprovantes/${rc.publicId}`} className="shrink-0">
                    <Button variant="primary" size="sm" className="min-h-[44px] sm:min-h-[40px] text-xs font-semibold shadow-xs">
                      Avaliar Comprovante →
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Faturas em Aberto */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Faturas em Aberto</h2>
              <p className="text-xs text-[var(--text-secondary)]">Cobranças emitidas pendentes de quitação.</p>
            </div>
            <Link href={`/admin/cobranca-plataforma/cobrancas/nova?consultancy=${consultancyPublicId}`}>
              <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-[40px] text-xs font-semibold">
                + Nova Cobrança
              </Button>
            </Link>
          </div>

          {openCharges.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">Nenhuma fatura em aberto para esta consultoria.</p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {openCharges.map((ch) => (
                <div
                  key={ch.publicId}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[var(--text-primary)] text-sm truncate">{ch.title}</span>
                      <span className="font-bold text-[var(--brand)] text-sm">
                        {formatBrlCents(ch.amountCents)}
                      </span>
                    </div>
                    {ch.description && (
                      <p className="text-[var(--text-secondary)] text-[11px] truncate">{ch.description}</p>
                    )}
                    <p className="text-[var(--text-secondary)]">
                      Vencimento: <strong className="text-[var(--text-primary)] font-semibold">{formatIsoDateToBr(ch.dueOn)}</strong> • Carência: {ch.graceDaysSnapshot} dias
                      {ch.submittedReceiptPublicId && (
                        <span className="text-[var(--warning-foreground)] font-semibold ml-2">
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
                          className="min-h-[44px] sm:min-h-[40px] text-[var(--danger-foreground)] hover:bg-[var(--danger-soft)] hover:border-[var(--danger-border)]"
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
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Histórico de Faturas Quitadas</h2>
            <div className="divide-y divide-[var(--border-subtle)]">
              {paidCharges.map((ch) => (
                <div
                  key={ch.publicId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{ch.title}</p>
                    <p className="text-[var(--text-tertiary)] text-[11px]">
                      Vencimento: {formatIsoDateToBr(ch.dueOn)} • Quitado em {formatIsoDateToBr(ch.paidAt?.toISOString().slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-bold text-[var(--brand)] text-sm">
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
    </div>
  );
}
