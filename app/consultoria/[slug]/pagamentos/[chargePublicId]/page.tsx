import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import {
  getStudentChargePaymentDetail,
  formatCentsToBrl,
  PIX_KEY_TYPE_LABELS,
  type StudentChargeDerivedStatus,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { Alert } from "@/components/ui/alert";
import { CopyPixButton } from "@/components/finance/copy-pix-button";
import { ReceiptUploadForm } from "@/components/finance/receipt-upload-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
    chargePublicId: string;
  }>;
};

function formatDateBr(isoDateStr: string): string {
  if (!isoDateStr || !isoDateStr.includes("-")) return isoDateStr;
  const [y, m, d] = isoDateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTimeBr(isoDateTimeStr: string): string {
  if (!isoDateTimeStr) return "";
  try {
    const date = new Date(isoDateTimeStr);
    if (isNaN(date.getTime())) return isoDateTimeStr;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(date);
  } catch {
    return isoDateTimeStr;
  }
}

function getStatusBadgeConfig(status: StudentChargeDerivedStatus): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  switch (status) {
    case "PAID":
      return {
        label: "Pago",
        className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        icon: (
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ),
      };
    case "UNDER_REVIEW":
      return {
        label: "Comprovante em análise",
        className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        icon: (
          <svg className="w-3.5 h-3.5 shrink-0 animate-pulse text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
    case "OVERDUE":
      return {
        label: "Vencido",
        className: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
        icon: (
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        ),
      };
    case "CANCELED":
      return {
        label: "Cancelado",
        className: "bg-zinc-100 dark:bg-[#1B1D21] text-zinc-600 dark:text-[#8E95A2] border-zinc-200 dark:border-[#303238]",
        icon: (
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ),
      };
    case "PENDING":
    default:
      return {
        label: "Pendente",
        className: "bg-zinc-100 dark:bg-[#1B1D21] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-[#303238]",
        icon: (
          <svg className="w-3.5 h-3.5 shrink-0 text-zinc-400 dark:text-[#8E95A2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      };
  }
}

export default async function StudentChargeDetailPage({ params }: PageProps) {
  const { slug, chargePublicId } = await params;

  // 1. Session revalidation
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  // 2. Context revalidation
  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // 3. STUDENT or INFLUENCER (VIP) role guard
  const isAuthorized = context.roles.includes("STUDENT") || context.roles.includes("INFLUENCER");
  if (!isAuthorized) {
    redirect(`/consultoria/${slug}`);
  }

  const viewModeState = await resolveEffectiveViewMode(slug, context.roles);

  // 4. Query student charge with strict ownership validation
  const charge = await getStudentChargePaymentDetail({
    consultancyId: context.consultancyId,
    studentMembershipId: context.membershipId,
    chargePublicId,
  });

  if (!charge) {
    notFound();
  }

  const formattedDueDate = formatDateBr(charge.dueOn);
  const hasPeriod = charge.referencePeriodStart && charge.referencePeriodEnd;
  const formattedPeriod = hasPeriod
    ? `${formatDateBr(charge.referencePeriodStart!)} a ${formatDateBr(charge.referencePeriodEnd!)}`
    : null;

  const canSubmitReceipt = charge.state === "OPEN" && !charge.isPaid && !charge.hasSubmittedReceipt;
  const badgeStyle = getStatusBadgeConfig(charge.derivedStatus);

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
      consultancyPublicId={context.consultancyPublicId}
      activeRole="STUDENT"
      viewModeState={viewModeState}
      showDashboardWallpaper={true}
    >
      <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
        {/* ===================================================================== */}
        {/* A. CABEÇALHO SÓLIDO EXECUTIVO (Padrão Idêntico ao Painel do Aluno)    */}
        {/* ===================================================================== */}
        <div className="w-full">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="space-y-1">
                {/* Linha de status com ponto verde e identificação */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                  <span className="text-[11px] sm:text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
                    Acompanhamento do Aluno · {context.consultancyName}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${badgeStyle.className}`}>
                    {badgeStyle.icon}
                    <span>{badgeStyle.label}</span>
                  </span>
                </div>

                {/* Título forte e identificação do aluno */}
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {charge.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#A1A7B4]">
                    Aluno: <strong className="text-white font-semibold">{session.fullName}</strong>
                  </p>
                </div>
              </div>

              {/* Botão de retorno a pagamentos */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/consultoria/${slug}/pagamentos`}
                  className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
                >
                  <span>←</span>
                  <span>Voltar para pagamentos</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* B. CARD DE RESUMO DA COBRANÇA                                         */}
        {/* ===================================================================== */}
        <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-100 dark:border-[#303238] pb-4">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-[#8E95A2] uppercase tracking-wider block">
                Valor Total da Cobrança
              </span>
              <p className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight tabular-nums">
                {formatCentsToBrl(charge.amountCents)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${badgeStyle.className}`}>
                {badgeStyle.icon}
                <span>{badgeStyle.label}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-1">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-[#8E95A2] uppercase tracking-wider block">
                Data de Vencimento
              </span>
              <strong className="text-sm font-bold text-zinc-900 dark:text-white block">
                {formattedDueDate}
              </strong>
            </div>

            {formattedPeriod && (
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-1">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-[#8E95A2] uppercase tracking-wider block">
                  Período de Competência
                </span>
                <strong className="text-sm font-bold text-zinc-900 dark:text-white block">
                  {formattedPeriod}
                </strong>
              </div>
            )}
          </div>

          {charge.description && (
            <div className="pt-2 border-t border-zinc-100 dark:border-[#303238]">
              <span className="text-xs font-semibold text-zinc-900 dark:text-white block mb-1">
                Observações da Consultoria:
              </span>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-[#1B1D21] p-3.5 rounded-xl border border-zinc-200/80 dark:border-[#303238]">
                {charge.description}
              </p>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* C. MENSAGENS E ALERTAS DE STATUS                                      */}
        {/* ===================================================================== */}
        {charge.derivedStatus === "PAID" && (
          <Alert variant="success" title="Pagamento Confirmado">
            <p className="text-xs">
              Esta cobrança foi quitada com sucesso. Seu acesso aos serviços da consultoria está totalmente liberado.
            </p>
            {charge.paidConfirmedAt && (
              <p className="text-xs mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                Confirmado em {formatDateTimeBr(charge.paidConfirmedAt)} via PIX.
              </p>
            )}
          </Alert>
        )}

        {charge.derivedStatus === "UNDER_REVIEW" && (
          <Alert variant="warning" title="Comprovante em Análise">
            <p className="text-xs">
              Seu comprovante foi enviado e está sendo analisado pela administração da consultoria.
              Assim que aprovado, a cobrança será liquidada automaticamente no seu painel.
            </p>
          </Alert>
        )}

        {charge.derivedStatus === "OVERDUE" && (
          <Alert variant="danger" title="Cobrança com Vencimento Ultrapassado">
            <p className="text-xs">
              Esta mensalidade venceu em {formattedDueDate}. Efetue a transferência Pix e envie o comprovante abaixo para evitar interrupções operacionais.
            </p>
          </Alert>
        )}

        {charge.derivedStatus === "CANCELED" && (
          <Alert variant="info" title="Cobrança Cancelada">
            <p className="text-xs">
              Esta cobrança foi cancelada pela administração da consultoria e não requer pagamento.
            </p>
          </Alert>
        )}

        {/* ===================================================================== */}
        {/* D. DADOS PIX E FORMULÁRIO DE COMPROVANTE (Quando em Aberto)           */}
        {/* ===================================================================== */}
        {canSubmitReceipt && (
          <div className="space-y-6">
            {/* Card com Chave Pix Oficial da Consultoria */}
            {charge.pixSettings ? (
              <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-100 dark:border-[#303238] pb-3">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-white">Pagamento via Pix</h2>
                    <p className="text-xs text-zinc-500 dark:text-[#8E95A2]">
                      Transfira o valor exato no aplicativo do seu banco utilizando a chave oficial abaixo:
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    Pix Oficial
                  </span>
                </div>

                <div className="space-y-3 bg-zinc-50 dark:bg-[#1B1D21] p-4 sm:p-5 rounded-xl border border-zinc-200/80 dark:border-[#303238]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-[#8E95A2] block">
                        Tipo de Chave ({PIX_KEY_TYPE_LABELS[charge.pixSettings.pixKeyType] || charge.pixSettings.pixKeyType})
                      </span>
                      <p className="text-sm sm:text-base font-mono font-bold text-zinc-900 dark:text-white select-all break-all">
                        {charge.pixSettings.pixKey}
                      </p>
                    </div>
                    <CopyPixButton pixKey={charge.pixSettings.pixKey} className="shrink-0" />
                  </div>

                  <div className="pt-2.5 border-t border-zinc-200/60 dark:border-[#303238] flex flex-wrap justify-between gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500 dark:text-[#8E95A2]">Favorecido: </span>
                      <strong className="text-zinc-900 dark:text-white font-semibold">
                        {charge.pixSettings.pixReceiverName}
                      </strong>
                    </div>
                  </div>
                </div>

                {charge.pixSettings.paymentInstructions && (
                  <div className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-xl space-y-1 leading-relaxed">
                    <strong className="font-semibold block">Instruções de Pagamento da Consultoria:</strong>
                    <p className="whitespace-pre-wrap">{charge.pixSettings.paymentInstructions}</p>
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="warning" title="Chave Pix em configuração">
                <p className="text-xs">
                  A consultoria ainda não cadastrou a chave Pix oficial no sistema. Entre em contato com a equipe pelo suporte da consultoria para receber os dados de pagamento.
                </p>
              </Alert>
            )}

            {/* Card com Formulário de Envio do Comprovante */}
            <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 shadow-sm">
              <ReceiptUploadForm
                slug={slug}
                chargePublicId={charge.publicId}
                hasPreviousRejection={charge.hasPreviousRejection}
                previousRejectionReason={charge.previousRejectionReason}
              />
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
