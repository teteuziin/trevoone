import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  getStudentChargePaymentDetail,
  formatCentsToBrl,
  PIX_KEY_TYPE_LABELS,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { FinanceStatusBadge } from "@/components/finance/finance-ui-badges";
import { CopyPixButton } from "@/components/finance/copy-pix-button";
import { ReceiptUploadForm } from "@/components/finance/receipt-upload-form";

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

  const canSubmitReceipt = charge.state === "OPEN" && !charge.isPaid && !charge.hasSubmittedReceipt;

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
    >
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <PageHeader
          backHref={`/consultoria/${slug}/pagamentos`}
          backLabel="Voltar para pagamentos"
          title={charge.title}
          eyebrow="COBRANÇA"
        />

        {/* Charge Overview Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                Valor da Cobrança
              </span>
              <p className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {formatCentsToBrl(charge.amountCents)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FinanceStatusBadge status={charge.derivedStatus} size="md" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            <div>
              <span className="text-zinc-500 dark:text-zinc-400">Data de Vencimento: </span>
              <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{formattedDueDate}</strong>
            </div>

            {formattedPeriod && (
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Período de Referência: </span>
                <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{formattedPeriod}</strong>
              </div>
            )}
          </div>

          {charge.description && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                Observações da Consultoria:
              </span>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                {charge.description}
              </p>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {charge.derivedStatus === "PAID" && (
          <Alert variant="success" title="Pagamento Confirmado">
            <p className="text-xs">
              Esta cobrança foi quitada com sucesso. Seu acesso à consultoria está liberado.
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
              Seu comprovante foi enviado e está sendo analisado pela equipe da consultoria.
              Assim que for aprovado, a cobrança será liquidada automaticamente.
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

        {/* Pix Instructions & Upload (Only for PENDING or OVERDUE or REJECTED) */}
        {canSubmitReceipt && (
          <div className="space-y-6">
            {/* Pix Details Card */}
            {charge.pixSettings ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Pagamento via Pix</h2>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Realize a transferência no aplicativo do seu banco usando a chave abaixo:
                    </p>
                  </div>
                </div>

                <div className="space-y-3 bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                        Tipo de Chave ({PIX_KEY_TYPE_LABELS[charge.pixSettings.pixKeyType] || charge.pixSettings.pixKeyType})
                      </span>
                      <p className="text-sm sm:text-base font-mono font-bold text-zinc-900 dark:text-zinc-100 break-all">
                        {charge.pixSettings.pixKey}
                      </p>
                    </div>
                    <CopyPixButton pixKey={charge.pixSettings.pixKey} className="shrink-0" />
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap justify-between gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Favorecido: </span>
                      <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">{charge.pixSettings.pixReceiverName}</strong>
                    </div>
                  </div>
                </div>

                {charge.pixSettings.paymentInstructions && (
                  <div className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 rounded-xl space-y-1">
                    <strong className="font-semibold block">Instruções de Pagamento:</strong>
                    <p className="leading-relaxed">{charge.pixSettings.paymentInstructions}</p>
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="warning" title="Chave Pix em configuração">
                <p className="text-xs">
                  A consultoria ainda não cadastrou a chave Pix oficial. Entre em contato com a equipe para receber as instruções de pagamento.
                </p>
              </Alert>
            )}

            {/* Receipt Upload Form Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-sm">
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
