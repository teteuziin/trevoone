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
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { AdminExecutiveHeader } from "@/components/admin/admin-executive-header";
import { AdminPageContainer } from "@/components/admin/admin-page-container";
import { ComprovanteForm } from "./comprovante-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function getSubscriptionLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Ativa";
    case "GRACE":
      return "Em Carência";
    case "SUSPENDED":
      return "Suspensa";
    case "CANCELED":
      return "Cancelada";
    default:
      return status;
  }
}

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
        userPublicId={session.userPublicId}
        hasProfilePhoto={session.hasProfilePhoto}
        profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
        showDashboardWallpaper={true}
      >
        <AdminPageContainer>
          <div className="p-8 text-center bg-white dark:bg-[#151619] rounded-2xl border border-zinc-200 dark:border-[#303238] shadow-sm max-w-md mx-auto my-12">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              Assinatura da consultoria não encontrada.
            </p>
            <p className="text-xs text-zinc-500 dark:text-[#8E95A2] mt-1">
              Entre em contato com o suporte da plataforma Trevo One.
            </p>
          </div>
        </AdminPageContainer>
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
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      showDashboardWallpaper={true}
    >
      <AdminPageContainer>
        {/* Executive Header */}
        <AdminExecutiveHeader
          eyebrow="● ADMINISTRAÇÃO · FATURAMENTO"
          title="Assinatura da consultoria"
          subtitle="Acompanhe o status do plano Trevo One, dados de pagamento Pix e histórico de faturas."
          backHref={`/consultoria/${slug}`}
          backLabel="Voltar ao Painel"
          badge={getSubscriptionLabel(effectiveStatus)}
          badgeVariant={effectiveStatus === "ACTIVE" ? "success" : effectiveStatus === "GRACE" ? "warning" : "danger"}
        />

        {/* Status Alerts */}
        {effectiveStatus === "GRACE" && blockingCharge && (
          <Alert variant="warning" title="Aviso de Vencimento em Carência">
            <p className="text-xs leading-relaxed">
              A fatura <strong className="font-bold">{blockingCharge.title}</strong> ({formatBrlCents(blockingCharge.amountCents)}) venceu em {formatIsoDateToBr(blockingCharge.dueOn)}. O prazo limite de carência encerra em{" "}
              <strong className="font-bold">{formatIsoDateToBr(blockingCharge.graceEndsOn)}</strong>. Realize o pagamento e envie o comprovante Pix para evitar a suspensão dos serviços.
            </p>
          </Alert>
        )}

        {effectiveStatus === "SUSPENDED" && (
          <Alert variant="danger" title="Serviços da Consultoria Suspensos">
            <p className="text-xs leading-relaxed">
              {effectiveReason === "NONPAYMENT"
                ? "O acesso operacional foi suspenso por pendência financeira além do período de carência. Envie o comprovante Pix abaixo para solicitar a regularização imediata."
                : `Suspensão administrativa: ${subscriptionDetail.manualSuspensionReason || "Entre em contato com a equipe de suporte do Trevo One."}`}
            </p>
          </Alert>
        )}

        {effectiveStatus === "CANCELED" && (
          <Alert variant="info" title="Assinatura Cancelada">
            <p className="text-xs leading-relaxed">
              Esta consultoria teve sua assinatura encerrada junto à plataforma Trevo One.
              {subscriptionDetail.cancellationReason && (
                <span className="block mt-1 font-medium italic">
                  Motivo registrado: &quot;{subscriptionDetail.cancellationReason}&quot;
                </span>
              )}
            </p>
          </Alert>
        )}

        {/* 1. Card de Visão Geral da Assinatura */}
        <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Resumo do Plano</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-1">
              <span className="text-zinc-500 dark:text-[#8E95A2] text-[11px] font-semibold uppercase tracking-wider block">
                Status Operacional
              </span>
              <p className="text-base font-bold text-zinc-900 dark:text-white">
                {effectiveStatus === "ACTIVE"
                  ? "Totalmente Liberado"
                  : effectiveStatus === "GRACE"
                  ? "Liberado (Em carência)"
                  : effectiveStatus === "SUSPENDED"
                  ? "Acesso Suspenso"
                  : "Cancelado"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-1">
              <span className="text-zinc-500 dark:text-[#8E95A2] text-[11px] font-semibold uppercase tracking-wider block">
                Situação Financeira
              </span>
              <p className="text-base font-bold text-zinc-900 dark:text-white">
                {openCharges.length === 0 ? "Em dia (0 pendências)" : `${openCharges.length} ${openCharges.length === 1 ? "fatura pendente" : "faturas pendentes"}`}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-1">
              <span className="text-zinc-500 dark:text-[#8E95A2] text-[11px] font-semibold uppercase tracking-wider block">
                Próximo Vencimento
              </span>
              <p className="text-base font-bold text-zinc-900 dark:text-white">
                {blockingCharge ? formatIsoDateToBr(blockingCharge.dueOn) : "Sem faturas a vencer"}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 dark:text-[#8E95A2] pt-1">
            Faturamento e vigência calculados com base no fuso horário {context.consultancyTimezone}.
          </p>
        </div>

        {/* 2. Dados de Pagamento Pix Oficial do Trevo One */}
        {platformSettings && effectiveStatus !== "CANCELED" && (
          <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 dark:border-[#303238] pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">Dados para Pagamento Pix</h2>
                <p className="text-xs text-zinc-500 dark:text-[#8E95A2] mt-0.5">
                  Transfira o valor da fatura via Pix oficial do Trevo One e anexe o comprovante abaixo.
                </p>
              </div>
              <Badge variant="success" size="sm">
                Pix Oficial
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-1">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-[#8E95A2] uppercase tracking-wider block">
                  Chave Pix ({platformSettings.pixKeyType})
                </span>
                <p className="text-sm font-mono font-bold text-zinc-900 dark:text-white break-all select-all">
                  {platformSettings.pixKey}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-1">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-[#8E95A2] uppercase tracking-wider block">
                  Favorecido / Razão Social
                </span>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">{platformSettings.receiverName}</p>
              </div>
            </div>

            {platformSettings.instructions && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 whitespace-pre-wrap leading-relaxed">
                <strong className="font-semibold block mb-1">Instruções de Pagamento:</strong>
                {platformSettings.instructions}
              </div>
            )}
          </div>
        )}

        {/* 3. Faturas em Aberto & Form de Comprovante */}
        <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Cobranças &amp; Faturas Pendentes</h2>
            <p className="text-xs text-zinc-500 dark:text-[#8E95A2] mt-0.5">
              Faturas pendentes de quitação da sua consultoria junto à plataforma.
            </p>
          </div>

          {openCharges.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-dashed border-zinc-200 dark:border-[#303238] text-zinc-500 dark:text-[#8E95A2] text-xs">
              Nenhuma fatura pendente no momento. Todas as cobranças da consultoria estão em dia!
            </div>
          ) : (
            <div className="space-y-4">
              {openCharges.map((ch) => (
                <div
                  key={ch.publicId}
                  className="p-5 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-white dark:bg-[#1B1D21] shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-100 dark:border-[#303238] pb-3">
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">{ch.title}</h3>
                      {ch.description && (
                        <p className="text-xs text-zinc-500 dark:text-[#8E95A2]">{ch.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 dark:text-[#8E95A2]">
                        <span>Vencimento: <strong className="text-zinc-900 dark:text-white font-semibold">{formatIsoDateToBr(ch.dueOn)}</strong></span>
                        <span>•</span>
                        <span>Carência: <strong className="text-zinc-900 dark:text-white font-semibold">{ch.graceDaysSnapshot} dias</strong></span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                        {formatBrlCents(ch.amountCents)}
                      </span>
                    </div>
                  </div>

                  {/* Estado do Comprovante da Fatura */}
                  {ch.submittedReceiptPublicId ? (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-bold">Comprovante em análise</p>
                        <p className="opacity-90 truncate">
                          Arquivo: <strong className="font-semibold">{ch.submittedReceiptFileName}</strong> (enviado em {formatIsoDateToBr(ch.submittedReceiptAt?.toISOString().slice(0, 10))})
                        </p>
                      </div>
                      <Link
                        href={`/consultoria/${slug}/assinatura/comprovantes/${ch.submittedReceiptPublicId}/arquivo`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] border border-zinc-200 dark:border-[#303238] text-zinc-800 dark:text-[#E5E7EB] font-semibold text-xs transition-colors shrink-0 min-h-[44px]"
                      >
                        <span>Ver arquivo</span>
                        <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </Link>
                    </div>
                  ) : effectiveStatus !== "CANCELED" ? (
                    <div className="pt-2 border-t border-zinc-100 dark:border-[#303238]">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-white mb-2">
                        Enviar comprovante de pagamento Pix
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
          <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Histórico de Faturas Quitadas</h2>
            <div className="divide-y divide-zinc-100 dark:divide-[#303238]">
              {recentPayments.map((p) => (
                <div
                  key={p.publicId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-zinc-900 dark:text-white">{p.chargeTitle}</p>
                    <p className="text-zinc-500 dark:text-[#8E95A2]">
                      Quitado via Pix em {formatIsoDateToBr(p.confirmedAt.toISOString().slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatBrlCents(p.amountCents)}
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
      </AdminPageContainer>
    </ConsultancyAppShell>
  );
}
