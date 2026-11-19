import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import {
  getStudentChargeDetail,
  assertTrainerStudentScope,
  formatCentsToBrl,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { Alert } from "@/components/ui/alert";
import { FinanceStatusBadge } from "@/components/finance/finance-ui-badges";
import { ChargeCancelDialog } from "@/components/finance/charge-cancel-dialog";
import { ChargeMarkPaidDialog } from "@/components/finance/charge-mark-paid-dialog";
import { CopyLinkButton } from "@/components/finance/copy-link-button";

type PageProps = {
  params: Promise<{
    slug: string;
    chargePublicId: string;
  }>;
};

function formatDatePtBr(isoDate: string | null): string {
  if (!isoDate) return "Não informado";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTimePtBr(isoDateTime: string | null): string {
  if (!isoDateTime) return "Não informado";
  try {
    const date = new Date(isoDateTime);
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDateTime;
  }
}

const FEATURE_CONFIG: Record<
  string,
  { label: string; description: string }
> = {
  training: {
    label: "Treinos e Exercícios",
    description: "Fichas, exercícios e vídeos",
  },
  nutrition: {
    label: "Nutrição e Dietas",
    description: "Planos alimentares e refeições",
  },
  evolution: {
    label: "Evolução e Fotos",
    description: "Fotos de evolução, peso e medidas",
  },
  consultations: {
    label: "Consultas e Check-ins",
    description: "Acompanhamentos e check-ins",
  },
  chat: {
    label: "TrevoChat",
    description: "Comunicação direta com o treinador",
  },
};

export default async function ChargeDetailPage({ params }: PageProps) {
  const { slug, chargePublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  const isConsultancyAdmin = context.roles.includes("CONSULTANCY_ADMIN");
  const isAuthorizedAdmin = isConsultancyAdmin || isPlatformAdmin;
  const isPersonal = context.roles.includes("PERSONAL");

  if (!isAuthorizedAdmin && !isPersonal) {
    redirect(`/consultoria/${slug}`);
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);

  const charge = await getStudentChargeDetail({
    consultancyId: context.consultancyId,
    chargePublicId,
  });

  if (!charge) {
    notFound();
  }

  if (!isAuthorizedAdmin && isPersonal) {
    const isAssigned = await assertTrainerStudentScope({
      consultancyId: context.consultancyId,
      trainerUserId: session.userId,
      studentMembershipPublicId: charge.studentMembershipPublicId,
    });
    if (!isAssigned) {
      redirect(`/consultoria/${slug}`);
    }
  }

  const canMarkPaid =
    isAuthorizedAdmin &&
    !charge.isPaid &&
    charge.derivedStatus !== "PAID" &&
    charge.state !== "CANCELED";

  const canCancel =
    isAuthorizedAdmin &&
    charge.canBeCanceled &&
    !charge.isPaid &&
    charge.state !== "CANCELED";

  const paymentMethodLabel = (() => {
    if (charge.confirmedPaymentMethod === "PIX_MANUAL") return "Pix manual direto";
    if (charge.confirmedPaymentMethod === "DINHEIRO") return "Dinheiro em espécie";
    if (charge.confirmedPaymentMethod === "TRANSFERENCIA") return "Transferência bancária (TED/DOC)";
    if (charge.confirmedPaymentMethod === "MAQUININHA_EXTERNA") return "Maquininha externa / Cartão";
    if (charge.infinitepayCheckoutUrl) return "Checkout InfinitePay (Pix ou Cartão)";
    if (charge.paymentMethod) return charge.paymentMethod;
    return "Não informado";
  })();

  const whatsappShareUrl = charge.infinitepayCheckoutUrl
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(
        `Olá, ${charge.studentName}! Segue o link seguro para pagamento da sua consultoria (${formatCentsToBrl(charge.amountCents)}):\n\n${charge.infinitepayCheckoutUrl}\n\nApós a confirmação, seu acesso será liberado automaticamente!`
      )}`
    : null;

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
      viewModeState={effectiveState}
      themeVariant="trainer-refined"
      showDashboardWallpaper={true}
      maxWidth="wide"
    >
      <div className="w-full max-w-3xl mx-auto space-y-6 pb-24 font-sans">
        {/* Top Header & Navigation */}
        <div>
          <Link
            href={`/consultoria/${slug}/financeiro?aba=cobrancas`}
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[#526058] hover:text-[#102E23] transition-colors mb-3 min-h-[36px]"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar às Cobranças</span>
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-[#176B49] uppercase tracking-wider bg-[#E2F5EC] px-2.5 py-0.5 rounded-full border border-[#B8E6D0]">
                  {charge.planId ? "Plano Comercial" : "Cobrança Personalizada"}
                </span>
                <span className="text-xs text-[#526058] font-medium">
                  Aluno: <strong className="text-[#102E23]">{charge.studentName}</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#102E23] tracking-tight truncate">
                {charge.title}
              </h1>
            </div>

            {/* Admin Action Buttons */}
            {isConsultancyAdmin && (canMarkPaid || canCancel) && (
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {canMarkPaid && (
                  <ChargeMarkPaidDialog
                    slug={slug}
                    chargePublicId={charge.publicId}
                    chargeTitle={charge.title}
                    studentName={charge.studentName}
                    amountCents={charge.amountCents}
                    hasGatewayCheckout={charge.hasGatewayCheckout}
                  />
                )}
                {canCancel && (
                  <ChargeCancelDialog
                    slug={slug}
                    chargePublicId={charge.publicId}
                    chargeTitle={charge.title}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {charge.derivedStatus === "PAID" && (
          <Alert variant="success" title="Cobrança Quitada">
            <p className="text-xs">
              Esta cobrança foi liquidada com sucesso em {formatDateTimePtBr(charge.paidAt || charge.paymentConfirmedAt || null)}. O acesso e recursos contratados estão liberados para o aluno.
            </p>
          </Alert>
        )}

        {charge.derivedStatus === "CANCELED" && (
          <Alert variant="info" title="Cobrança Cancelada">
            <p className="text-xs">
              Esta cobrança foi cancelada em {formatDateTimePtBr(charge.canceledAt)} por {charge.canceledByUserName || "Administrador"}.
              {charge.cancelReason && (
                <span className="block mt-1 font-medium italic">
                  Motivo: &quot;{charge.cancelReason}&quot;
                </span>
              )}
            </p>
          </Alert>
        )}

        {!isConsultancyAdmin && (
          <div className="p-3 bg-[#F5F5F0] border border-[#DEE2DA] rounded-xl text-xs text-[#526058]">
            Visualização de treinador. Operações de liquidação manual e cancelamento são restritas ao Administrador da consultoria.
          </div>
        )}

        {/* Charge Info Card */}
        <div className="bg-white border border-[#E5E8E2] rounded-3xl p-5 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E8E2] pb-5">
            <div>
              <span className="text-[11px] font-bold text-[#526058] uppercase tracking-wider block">
                Valor da Cobrança
              </span>
              <p className="text-2xl sm:text-3xl font-black text-[#102E23] tracking-tight font-sans tabular-nums">
                {formatCentsToBrl(charge.amountCents)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <FinanceStatusBadge status={charge.derivedStatus} size="md" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#F5F5F0] border border-[#DEE2DA]/60 space-y-1">
              <span className="text-[#526058] text-[11px] block">Aluno Destinatário:</span>
              <strong className="text-[#102E23] font-bold text-sm block">{charge.studentName}</strong>
              <p className="text-[11px] text-[#526058]">{charge.studentEmail}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F5F5F0] border border-[#DEE2DA]/60 space-y-1">
              <span className="text-[#526058] text-[11px] block">Data de Vencimento:</span>
              <strong className="text-[#102E23] font-bold text-sm block">{formatDatePtBr(charge.dueOn)}</strong>
              <p className="text-[11px] text-[#526058]">
                {charge.blocksAccess ? "Restringe acesso em caso de atraso" : "Não restringe acesso"}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F5F5F0] border border-[#DEE2DA]/60 space-y-1">
              <span className="text-[#526058] text-[11px] block">Modalidade e Plano:</span>
              <strong className="text-[#102E23] font-bold block">
                {charge.planName ? `Plano: ${charge.planName}` : "Cobrança Personalizada Avulsa"}
              </strong>
              <span className="text-[11px] text-[#526058]">
                {charge.infinitepayCheckoutUrl ? "Recebimento via InfinitePay" : "Recebimento Manual"}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F5F5F0] border border-[#DEE2DA]/60 space-y-1">
              <span className="text-[#526058] text-[11px] block">Período de Referência:</span>
              <strong className="text-[#102E23] font-bold block">
                {charge.referencePeriodStart && charge.referencePeriodEnd
                  ? `${formatDatePtBr(charge.referencePeriodStart)} a ${formatDatePtBr(charge.referencePeriodEnd)}`
                  : "Não informado"}
              </strong>
              <span className="text-[11px] text-[#526058]">
                Emitida em: {formatDateTimePtBr(charge.createdAt)} por {charge.createdByUserName}
              </span>
            </div>
          </div>

          {charge.description && (
            <div className="pt-2 border-t border-[#E5E8E2]">
              <span className="text-xs font-bold text-[#102E23] block mb-1">
                Observações de Emissão:
              </span>
              <p className="text-xs text-[#526058] bg-[#F5F5F0] p-3.5 rounded-2xl border border-[#DEE2DA] leading-relaxed">
                {charge.description}
              </p>
            </div>
          )}
        </div>

        {/* Recursos Contratados (Features) */}
        <div className="bg-white border border-[#E5E8E2] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E8E2] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#102E23]">Recursos e Permissões Contratados</h2>
              <p className="text-xs text-[#526058]">Módulos liberados para o aluno conforme esta cobrança</p>
            </div>
            {charge.featuresJson && (
              <span className="text-[11px] font-bold text-[#176B49] bg-[#E2F5EC] border border-[#B8E6D0] px-2.5 py-0.5 rounded-full">
                Snapshot Personalizado
              </span>
            )}
          </div>

          {charge.featuresJson ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {Object.entries(FEATURE_CONFIG).map(([key, info]) => {
                const isEnabled = Boolean(charge.featuresJson?.[key as keyof typeof charge.featuresJson]);
                return (
                  <div
                    key={key}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                      isEnabled
                        ? "bg-[#E2F5EC]/50 border-[#B8E6D0] text-[#102E23]"
                        : "bg-[#F5F5F0]/60 border-[#DEE2DA] text-[#8A9690] opacity-60"
                    }`}
                  >
                    <div className="min-w-0">
                      <strong className="font-bold block text-xs">{info.label}</strong>
                      <span className="text-[11px] text-[#526058] block truncate">{info.description}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                        isEnabled
                          ? "bg-[#176B49] text-white"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {isEnabled ? "Liberado" : "Bloqueado"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : charge.planId ? (
            <div className="p-4 bg-[#E2F5EC]/40 border border-[#B8E6D0] rounded-2xl text-xs space-y-1">
              <strong className="text-[#102E23] font-bold block">Plano comercial ativo</strong>
              <p className="text-[#526058]">
                Esta cobrança é regida pelo plano comercial <strong>{charge.planName || "da consultoria"}</strong>. O aluno tem acesso completo aos recursos padrão (Treinos, Nutrição, Evolução e TrevoChat) enquanto a assinatura estiver quitada e vigente.
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#526058]">Nenhum recurso específico configurado para esta cobrança.</p>
          )}
        </div>

        {/* Quitação / Informações do Pagamento (se pago) */}
        {(charge.isPaid || charge.derivedStatus === "PAID") && (
          <div className="bg-white border border-[#B8E6D0] rounded-3xl p-5 sm:p-7 shadow-xs space-y-3 bg-gradient-to-br from-white to-[#E2F5EC]/20">
            <div className="flex items-center gap-2 border-b border-[#B8E6D0] pb-3">
              <div className="w-6 h-6 rounded-full bg-[#176B49] text-white text-xs font-bold flex items-center justify-center shrink-0">
                ✓
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#102E23]">Dados de Quitação e Pagamento</h2>
                <p className="text-xs text-[#526058]">Registro de liquidação financeira desta cobrança</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-white border border-[#DEE2DA]">
                <span className="text-[11px] text-[#526058] block">Data do Recebimento:</span>
                <strong className="text-[#102E23] font-bold">
                  {formatDateTimePtBr(charge.paidAt || charge.paymentConfirmedAt || null)}
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-[#DEE2DA]">
                <span className="text-[11px] text-[#526058] block">Forma de Pagamento:</span>
                <strong className="text-[#102E23] font-bold">
                  {paymentMethodLabel}
                </strong>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-[#DEE2DA]">
                <span className="text-[11px] text-[#526058] block">Confirmado por:</span>
                <strong className="text-[#102E23] font-bold">
                  {charge.paymentConfirmedByUserName || (charge.infinitepayCheckoutUrl ? "Gateway InfinitePay (Automático)" : "Administrador")}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* InfinitePay Checkout Card (se houver link ativo) */}
        {charge.infinitepayCheckoutUrl && (
          <div className="bg-white border border-[#E5E8E2] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E8E2] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#102E23]">Link de Pagamento InfinitePay</h2>
                <p className="text-xs text-[#526058]">Compartilhe com o aluno para recebimento por Pix ou Cartão</p>
              </div>
              <span className="text-[11px] font-bold text-[#176B49] bg-[#E2F5EC] border border-[#B8E6D0] px-2.5 py-0.5 rounded-full">
                Checkout Online
              </span>
            </div>

            <div className="p-3 bg-[#F5F5F0] border border-[#DEE2DA] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-mono text-[#102E23] truncate select-all">
                {charge.infinitepayCheckoutUrl}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <CopyLinkButton url={charge.infinitepayCheckoutUrl} />
                {whatsappShareUrl && (
                  <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#1EBE5D] transition-colors min-h-[44px] shadow-2xs"
                  >
                    <span>WhatsApp</span>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>

            <p className="text-[11px] text-[#526058] leading-relaxed">
              💡 Quando o aluno efetuar o pagamento pelo link da InfinitePay, o sistema conciliará a transação e ativará o plano/recursos de forma 100% automática.
            </p>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
