import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { verifyAndReconcileChargePayment } from "@/lib/infinitepay/service";
import { ReconcilePaymentButton } from "@/components/finance/reconcile-payment-button";

export const dynamic = "force-dynamic";

interface ReturnPageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    chargeId?: string;
    order_nsu?: string;
    slug?: string;
    transaction_nsu?: string;
    receipt_url?: string;
    simulated_checkout?: string;
  }>;
}

export default async function PaymentReturnPage({ params, searchParams }: ReturnPageProps) {
  const { slug } = await params;
  const search = await searchParams;

  const chargePublicId = search.chargeId || search.order_nsu;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/pagamentos/retorno`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const viewModeState = await resolveEffectiveViewMode(slug, context.roles);

  // If charge ID is provided, perform immediate reconciliation via POST /payment_check
  let isPaid = false;
  let statusMessage = "Estamos confirmando seu pagamento junto à InfinitePay.";

  if (chargePublicId) {
    const res = await verifyAndReconcileChargePayment({
      consultancySlug: slug,
      chargePublicId,
      transactionNsu: search.transaction_nsu,
      slug: search.slug,
    });
    isPaid = res.isPaid;
    statusMessage = res.message;
  }

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
      <div className="w-full max-w-xl mx-auto py-12 px-4 space-y-6">
        {isPaid ? (
          <div className="bg-white border border-[#E5E8E2] rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5] flex items-center justify-center mx-auto shadow-2xs">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#176B49] bg-[#E8F0EA] px-3 py-0.5 rounded-full border border-[#CDEED5]">
                Pagamento Aprovado
              </span>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-[#102E23] tracking-tight">
                Seu plano está ativo!
              </h1>
              <p className="text-sm text-[#5A6660] max-w-md mx-auto leading-relaxed">
                Confirmamos o pagamento com a InfinitePay. Seus treinos, avaliações e recursos contratados foram liberados automaticamente.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/consultoria/${slug}`}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-sm text-white bg-[#176B49] hover:bg-[#125438] transition-all min-h-[48px] shadow-xs cursor-pointer"
              >
                Ir para o Início
              </Link>
              <Link
                href={`/consultoria/${slug}/pagamentos`}
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl font-bold text-sm text-[#102E23] bg-[#FAF9F6] hover:bg-[#EBEBE5] border border-[#E5E8E2] transition-all min-h-[48px] cursor-pointer"
              >
                Ver Meus Pagamentos
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E8E2] rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-2xs">
              <svg className="w-8 h-8 animate-spin text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-0.5 rounded-full border border-amber-200">
                Aguardando Confirmação
              </span>
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#102E23] tracking-tight">
                Estamos confirmando seu pagamento
              </h1>
              <p className="text-sm text-[#5A6660] max-w-md mx-auto leading-relaxed">
                {statusMessage}
              </p>
              <p className="text-xs text-[#5A6660] pt-1">
                Pagamentos via Pix costumam ser confirmados em poucos segundos. Compras no cartão podem requerer alguns instantes da operadora.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {chargePublicId && (
                <ReconcilePaymentButton
                  consultancySlug={slug}
                  chargePublicId={chargePublicId}
                  transactionNsu={search.transaction_nsu}
                  slugParam={search.slug}
                />
              )}
              <Link
                href={`/consultoria/${slug}/pagamentos`}
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-3 rounded-xl font-bold text-sm text-[#102E23] bg-[#FAF9F6] hover:bg-[#EBEBE5] border border-[#E5E8E2] transition-all min-h-[48px] cursor-pointer"
              >
                Ver Meus Pagamentos
              </Link>
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
