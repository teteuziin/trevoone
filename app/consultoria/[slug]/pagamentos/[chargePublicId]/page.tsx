import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getStudentChargePaymentDetail,
  formatCentsToBrl,
  STATUS_LABELS,
  PIX_KEY_TYPE_LABELS,
  type StudentChargeDerivedStatus,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { CopyPixButton } from "@/components/finance/copy-pix-button";
import { ReceiptUploadForm } from "@/components/finance/receipt-upload-form";

type PageProps = {
  params: Promise<{
    slug: string;
    chargePublicId: string;
  }>;
};

function getStatusBadgeVariant(status: StudentChargeDerivedStatus): BadgeVariant {
  switch (status) {
    case "PAID":
      return "success";
    case "OVERDUE":
      return "danger";
    case "UNDER_REVIEW":
      return "warning";
    case "PENDING":
      return "neutral";
    case "CANCELED":
      return "neutral";
    default:
      return "neutral";
  }
}

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

  // 3. STUDENT role guard
  if (!context.roles.includes("STUDENT")) {
    redirect(`/consultoria/${slug}`);
  }

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

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <PageHeader
          backHref={`/consultoria/${slug}/pagamentos`}
          backLabel="Voltar para pagamentos"
          title={charge.title}
          eyebrow="Cobrança"
        />

        {/* Charge Overview Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-100 pb-4">
            <div className="space-y-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 leading-tight">
                {charge.title}
              </h2>
              {charge.description && (
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-xl">
                  {charge.description}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <Badge variant={getStatusBadgeVariant(charge.derivedStatus)} size="md">
                {STATUS_LABELS[charge.derivedStatus] || charge.derivedStatus}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1 text-xs">
            <div>
              <p className="text-zinc-500 font-medium">Valor</p>
              <p className="text-base sm:text-lg font-bold text-zinc-900 mt-0.5">
                {formatCentsToBrl(charge.amountCents)}
              </p>
            </div>

            <div>
              <p className="text-zinc-500 font-medium">Vencimento</p>
              <p className="text-sm sm:text-base font-semibold text-zinc-800 mt-0.5">
                {formattedDueDate}
              </p>
            </div>

            {formattedPeriod && (
              <div className="col-span-2 sm:col-span-1">
                <p className="text-zinc-500 font-medium">Período de Referência</p>
                <p className="text-xs sm:text-sm font-semibold text-zinc-800 mt-0.5">
                  {formattedPeriod}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Conditional Status Resolution Blocks */}
        {charge.isPaid ? (
          /* PAID STATE */
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3 text-emerald-950">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900">Pagamento confirmado</h3>
                <p className="text-xs text-emerald-800">
                  Esta cobrança já foi confirmada como recebida pela consultoria.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-emerald-200/70 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-emerald-700">Valor confirmado:</span>
                <p className="font-bold text-emerald-950 text-sm mt-0.5">
                  {formatCentsToBrl(charge.paidAmountCents || charge.amountCents)}
                </p>
              </div>
              {charge.paidConfirmedAt && (
                <div>
                  <span className="text-emerald-700">Data de confirmação:</span>
                  <p className="font-semibold text-emerald-950 text-sm mt-0.5">
                    {formatDateTimeBr(charge.paidConfirmedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : charge.state === "CANCELED" ? (
          /* CANCELED STATE */
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-2 text-zinc-700">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-200 text-zinc-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-zinc-900">Cobrança cancelada</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed pl-10.5">
              Esta cobrança foi cancelada pela consultoria e não requer mais pagamento.
            </p>
          </div>
        ) : charge.hasSubmittedReceipt ? (
          /* UNDER REVIEW STATE */
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3 text-amber-950">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-amber-950">Comprovante recebido</h3>
                <p className="text-xs font-semibold text-amber-900">
                  Seu pagamento está em análise.
                </p>
                <p className="text-xs text-amber-800 leading-relaxed pt-1">
                  A consultoria precisa confirmar o recebimento antes que a cobrança seja considerada paga.
                  Assim que o comprovante for revisado, o status será atualizado automaticamente.
                </p>
              </div>
            </div>
          </div>
        ) : !charge.pixSettings ? (
          /* SETTINGS MISSING STATE */
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-2 text-amber-950">
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <h3 className="text-sm font-bold text-amber-950">Pagamento indisponível no momento</h3>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Entre em contato com a consultoria para receber as instruções de pagamento.
            </p>
          </div>
        ) : (
          /* OPEN & READY FOR PAYMENT (PIX PANEL + UPLOAD FORM) */
          <div className="space-y-6">
            {/* Pix Panel */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900">Pagamento via Pix</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Copie a chave Pix abaixo e realize a transferência pelo aplicativo do seu banco.
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Receiver */}
                <div>
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Titular da conta / Recebedor
                  </span>
                  <p className="text-sm font-bold text-zinc-900 mt-0.5">
                    {charge.pixSettings.pixReceiverName}
                  </p>
                </div>

                {/* Pix Key Display & Copy */}
                <div>
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Chave Pix ({PIX_KEY_TYPE_LABELS[charge.pixSettings.pixKeyType] || charge.pixSettings.pixKeyType})
                  </span>

                  <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-2.5">
                    <div className="flex-1 p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-xs text-zinc-900 break-all select-all font-medium">
                      {charge.pixSettings.pixKey}
                    </div>
                    <CopyPixButton pixKey={charge.pixSettings.pixKey} className="shrink-0" />
                  </div>
                </div>

                {/* Payment Instructions if present */}
                {charge.pixSettings.paymentInstructions && (
                  <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1 text-xs">
                    <p className="font-semibold text-zinc-800">Instruções adicionais da consultoria:</p>
                    <p className="text-zinc-600 leading-relaxed whitespace-pre-line">
                      {charge.pixSettings.paymentInstructions}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Upload Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="border-b border-zinc-100 pb-3">
                <h3 className="text-base font-bold text-zinc-900">Comprovante de pagamento</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Após realizar o Pix, anexe o comprovante abaixo para envio e análise da consultoria.
                </p>
              </div>

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
