import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getConsultancySubscriptionDetail,
  getPlatformBillingSettings,
  formatBrlCents,
  formatIsoDateToBr,
} from "@/lib/platform-admin/billing";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { ComprovanteForm } from "./comprovante-form";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ConsultancySubscriptionPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  if (!context.roles.includes("CONSULTANCY_ADMIN")) {
    redirect(`/consultoria/${slug}`);
  }

  const [subscriptionDetail, platformSettings] = await Promise.all([
    getConsultancySubscriptionDetail(context.consultancyId, context.consultancyTimezone),
    getPlatformBillingSettings(),
  ]);

  if (!subscriptionDetail) {
    return (
      <ConsultancyAppShell
        consultancyName={context.consultancyName}
        consultancySlug={context.consultancySlug}
        consultancyLogoUrl={context.consultancyLogoUrl}
        roles={context.roles}
        userName={session.fullName}
        userEmail={session.email}
      >
        <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200">
          <p className="text-zinc-600">Assinatura da consultoria não encontrada.</p>
        </div>
      </ConsultancyAppShell>
    );
  }

  const { effectiveStatus, effectiveReason, openCharges, recentPayments, blockingCharge } = subscriptionDetail;

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="space-y-8 max-w-5xl">
        <PageHeader
          title="Assinatura da consultoria"
          description="Gestão de pagamento e regularização da assinatura da consultoria junto ao Trevo One."
          actions={
            <div className="flex items-center gap-2">
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
          }
        />

        {/* 1. Status Overview Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-zinc-900">Status do plano</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-xs text-zinc-500 font-medium">Status Operacional</span>
              <p className="text-sm font-semibold text-zinc-900">
                {effectiveStatus === "ACTIVE"
                  ? "Totalmente Liberado"
                  : effectiveStatus === "GRACE"
                  ? "Liberado (Em carência)"
                  : "Acesso Suspenso"}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-xs text-zinc-500 font-medium">Faturas em Aberto</span>
              <p className="text-sm font-semibold text-zinc-900">{openCharges.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
              <span className="text-xs text-zinc-500 font-medium">Fuso Horário Operacional</span>
              <p className="text-sm font-semibold text-zinc-900">{context.consultancyTimezone}</p>
            </div>
          </div>

          {effectiveStatus === "GRACE" && blockingCharge && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-1">
              <p className="font-semibold">Aviso de vencimento em carência</p>
              <p>
                A fatura <strong>{blockingCharge.title}</strong> ({formatBrlCents(blockingCharge.amountCents)}) venceu em {formatIsoDateToBr(blockingCharge.dueOn)}. O prazo limite de carência encerra em{" "}
                <strong>{formatIsoDateToBr(blockingCharge.graceEndsOn)}</strong>.
              </p>
            </div>
          )}

          {effectiveStatus === "SUSPENDED" && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm space-y-1">
              <p className="font-semibold">Serviços da consultoria suspensos</p>
              <p>
                {effectiveReason === "NONPAYMENT"
                  ? "O acesso operacional foi suspenso por pendência financeira além do período de carência. Envie o comprovante Pix abaixo para regularização."
                  : `Suspensão administrativa: ${subscriptionDetail.manualSuspensionReason || "Entre em contato com o suporte do Trevo One."}`}
              </p>
            </div>
          )}

          {effectiveStatus === "CANCELED" && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm space-y-1">
              <p className="font-semibold">Assinatura cancelada</p>
              <p>
                Esta consultoria teve sua assinatura cancelada pela administração da plataforma.
                {subscriptionDetail.cancellationReason && ` Motivo: ${subscriptionDetail.cancellationReason}`}
              </p>
            </div>
          )}
        </div>

        {/* 2. Dados de Pagamento Pix da Plataforma */}
        {platformSettings && effectiveStatus !== "CANCELED" && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Dados para pagamento Pix</h2>
                <p className="text-xs text-zinc-500">
                  Transfira o valor da fatura via Pix oficial do Trevo One e anexe o comprovante abaixo.
                </p>
              </div>
              <Badge variant="brand" size="sm">
                Pix Oficial
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                <span className="text-xs text-zinc-500 font-medium">
                  Chave Pix ({platformSettings.pixKeyType})
                </span>
                <p className="text-sm font-mono font-semibold text-zinc-900 select-all">
                  {platformSettings.pixKey}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 space-y-1">
                <span className="text-xs text-zinc-500 font-medium">Favorecido / Razão Social</span>
                <p className="text-sm font-semibold text-zinc-900">{platformSettings.receiverName}</p>
              </div>
            </div>

            {platformSettings.instructions && (
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 text-xs text-zinc-600 whitespace-pre-wrap leading-relaxed">
                {platformSettings.instructions}
              </div>
            )}
          </div>
        )}

        {/* 3. Faturas em Aberto & Envio de Comprovante */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Faturas em aberto</h2>
            <p className="text-xs text-zinc-500">
              Faturas pendentes de quitação para esta consultoria.
            </p>
          </div>

          {openCharges.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-500 text-sm">
              Nenhuma fatura em aberto no momento. Todas as cobranças estão em dia!
            </div>
          ) : (
            <div className="space-y-6">
              {openCharges.map((ch) => (
                <div
                  key={ch.publicId}
                  className="p-5 sm:p-6 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-zinc-900">{ch.title}</h3>
                      {ch.description && (
                        <p className="text-xs text-zinc-500">{ch.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-600">
                        <span>Vencimento: <strong>{formatIsoDateToBr(ch.dueOn)}</strong></span>
                        <span>•</span>
                        <span>Carência: <strong>{ch.graceDaysSnapshot} dias</strong></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-zinc-900">
                        {formatBrlCents(ch.amountCents)}
                      </span>
                    </div>
                  </div>

                  {/* Estado do Comprovante da Fatura */}
                  {ch.submittedReceiptPublicId ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="font-semibold">Comprovante em análise</p>
                        <p className="text-amber-700">
                          Arquivo: {ch.submittedReceiptFileName} (enviado em {formatIsoDateToBr(ch.submittedReceiptAt?.toISOString().slice(0, 10))})
                        </p>
                      </div>
                      <Link
                        href={`/consultoria/${slug}/assinatura/comprovantes/${ch.submittedReceiptPublicId}/arquivo`}
                        target="_blank"
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium transition-colors"
                      >
                        Ver arquivo ↗
                      </Link>
                    </div>
                  ) : effectiveStatus !== "CANCELED" ? (
                    <div className="pt-2 border-t border-zinc-100">
                      <h4 className="text-xs font-semibold text-zinc-800 mb-2">
                        Enviar comprovante de pagamento
                      </h4>
                      <ComprovanteForm
                        slug={slug}
                        chargePublicId={ch.publicId}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Histórico de Pagamentos */}
        {recentPayments.length > 0 && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-zinc-900">Histórico de pagamentos</h2>
            <div className="divide-y divide-zinc-100">
              {recentPayments.map((p) => (
                <div
                  key={p.publicId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-zinc-900">{p.chargeTitle}</p>
                    <p className="text-xs text-zinc-500">
                      Quitado via Pix em {formatIsoDateToBr(p.confirmedAt.toISOString().slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-emerald-700">
                      {formatBrlCents(p.amountCents)}
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
    </ConsultancyAppShell>
  );
}
