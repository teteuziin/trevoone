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
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ComprovanteForm } from "./comprovante-form";

type PageProps = {
  params: Promise<{
    slug: string;
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
      >
        <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200/90 shadow-xs max-w-md mx-auto my-12">
          <p className="text-sm font-semibold text-zinc-800">
            Assinatura da consultoria não encontrada.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Entre em contato com o suporte da plataforma Trevo One.
          </p>
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
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header Principal */}
        <PageHeader
          eyebrow="MINHA CONSULTORIA"
          title="Assinatura & Faturamento Plataforma"
          description="Acompanhe o status da sua assinatura junto ao Trevo One, consulte os dados de pagamento Pix e submeta comprovantes."
          actions={
            <Badge variant={getSubscriptionBadgeVariant(effectiveStatus)} size="md">
              {getSubscriptionLabel(effectiveStatus)}
            </Badge>
          }
        />

        {/* Status Alerts */}
        {effectiveStatus === "GRACE" && blockingCharge && (
          <Alert variant="warning" title="Aviso de Vencimento em Carência">
            <p className="text-xs">
              A fatura <strong className="font-bold">{blockingCharge.title}</strong> ({formatBrlCents(blockingCharge.amountCents)}) venceu em {formatIsoDateToBr(blockingCharge.dueOn)}. O prazo limite de carência encerra em{" "}
              <strong className="font-bold">{formatIsoDateToBr(blockingCharge.graceEndsOn)}</strong>. Realize o pagamento e envie o comprovante Pix para evitar a suspensão dos serviços.
            </p>
          </Alert>
        )}

        {effectiveStatus === "SUSPENDED" && (
          <Alert variant="danger" title="Serviços da Consultoria Suspensos">
            <p className="text-xs">
              {effectiveReason === "NONPAYMENT"
                ? "O acesso operacional foi suspenso por pendência financeira além do período de carência. Envie o comprovante Pix abaixo para solicitar a regularização imediata."
                : `Suspensão administrativa: ${subscriptionDetail.manualSuspensionReason || "Entre em contato com a equipe de suporte do Trevo One."}`}
            </p>
          </Alert>
        )}

        {effectiveStatus === "CANCELED" && (
          <Alert variant="info" title="Assinatura Cancelada">
            <p className="text-xs">
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
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-zinc-900">Resumo da Assinatura</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
              <span className="text-zinc-500 font-medium block">Status Operacional</span>
              <p className="text-sm font-bold text-zinc-900">
                {effectiveStatus === "ACTIVE"
                  ? "Totalmente Liberado"
                  : effectiveStatus === "GRACE"
                  ? "Liberado (Em carência)"
                  : effectiveStatus === "SUSPENDED"
                  ? "Acesso Suspenso"
                  : "Cancelado"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
              <span className="text-zinc-500 font-medium block">Faturas em Aberto</span>
              <p className="text-sm font-bold text-zinc-900">{openCharges.length}</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
              <span className="text-zinc-500 font-medium block">Fuso Horário Operacional</span>
              <p className="text-sm font-bold text-zinc-900">{context.consultancyTimezone}</p>
            </div>
          </div>
        </div>

        {/* 2. Dados de Pagamento Pix Oficial do Trevo One */}
        {platformSettings && effectiveStatus !== "CANCELED" && (
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-zinc-900">Dados para Pagamento Pix</h2>
                <p className="text-xs text-zinc-500">
                  Transfira o valor da fatura via Pix oficial do Trevo One e anexe o comprovante abaixo.
                </p>
              </div>
              <Badge variant="success" size="sm">
                Pix Oficial
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Chave Pix ({platformSettings.pixKeyType})
                </span>
                <p className="text-sm font-mono font-bold text-zinc-900 break-all select-all">
                  {platformSettings.pixKey}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60 space-y-1">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Favorecido / Razão Social
                </span>
                <p className="text-sm font-bold text-zinc-900">{platformSettings.receiverName}</p>
              </div>
            </div>

            {platformSettings.instructions && (
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/60 text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                <strong className="font-semibold text-amber-900 block mb-1">Instruções de Pagamento:</strong>
                {platformSettings.instructions}
              </div>
            )}
          </div>
        )}

        {/* 3. Faturas em Aberto & Form de Comprovante */}
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Faturas em Aberto</h2>
            <p className="text-xs text-zinc-500">
              Faturas pendentes de quitação da sua consultoria junto à plataforma.
            </p>
          </div>

          {openCharges.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-500 text-xs">
              Nenhuma fatura em aberto no momento. Todas as cobranças da consultoria estão em dia!
            </div>
          ) : (
            <div className="space-y-4">
              {openCharges.map((ch) => (
                <div
                  key={ch.publicId}
                  className="p-5 rounded-2xl border border-zinc-200/90 bg-white shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-100 pb-3">
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900">{ch.title}</h3>
                      {ch.description && (
                        <p className="text-xs text-zinc-500">{ch.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                        <span>Vencimento: <strong className="text-zinc-800 font-semibold">{formatIsoDateToBr(ch.dueOn)}</strong></span>
                        <span>•</span>
                        <span>Carência: <strong className="text-zinc-800 font-semibold">{ch.graceDaysSnapshot} dias</strong></span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
                        {formatBrlCents(ch.amountCents)}
                      </span>
                    </div>
                  </div>

                  {/* Estado do Comprovante da Fatura */}
                  {ch.submittedReceiptPublicId ? (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-bold">Comprovante em análise</p>
                        <p className="text-amber-800 truncate">
                          Arquivo: <strong className="font-semibold">{ch.submittedReceiptFileName}</strong> (enviado em {formatIsoDateToBr(ch.submittedReceiptAt?.toISOString().slice(0, 10))})
                        </p>
                      </div>
                      <Link
                        href={`/consultoria/${slug}/assinatura/comprovantes/${ch.submittedReceiptPublicId}/arquivo`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold text-xs transition-colors shrink-0"
                      >
                        <span>Ver arquivo</span>
                        <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </Link>
                    </div>
                  ) : effectiveStatus !== "CANCELED" ? (
                    <div className="pt-2 border-t border-zinc-100">
                      <h4 className="text-xs font-bold text-zinc-900 mb-2">
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
          <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-zinc-900">Histórico de Faturas Quitadas</h2>
            <div className="divide-y divide-zinc-100">
              {recentPayments.map((p) => (
                <div
                  key={p.publicId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-zinc-900">{p.chargeTitle}</p>
                    <p className="text-zinc-500">
                      Quitado via Pix em {formatIsoDateToBr(p.confirmedAt.toISOString().slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#00A859] text-sm">
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
      </div>
    </ConsultancyAppShell>
  );
}
