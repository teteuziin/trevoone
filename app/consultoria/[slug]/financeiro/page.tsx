import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import {
  getConsultancyFinanceSettings,
  getConsultancyFinanceDashboard,
  listConsultancyCharges,
  formatCentsToBrl,
} from "@/lib/consultancies/finance";
import {
  listConsultancyPlans,
  getInfinitePayConfig,
} from "@/lib/infinitepay/service";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { FinanceStatusBadge } from "@/components/finance/finance-ui-badges";
import { FinanceSettingsForm } from "@/components/finance/finance-settings-form";
import { FinancePlansManager } from "@/components/finance/finance-plans-manager";
import { InfinitePaySettingsForm } from "@/components/finance/infinitepay-settings-form";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    aba?: string;
  }>;
};

function formatDateBr(isoDateStr: string): string {
  if (!isoDateStr || !isoDateStr.includes("-")) return isoDateStr;
  const [y, m, d] = isoDateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default async function ConsultancyFinancePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { q, status, page, aba } = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // Allow both CONSULTANCY_ADMIN and PERSONAL
  const isConsultancyAdmin = context.roles.includes("CONSULTANCY_ADMIN");
  const isStaff =
    isConsultancyAdmin ||
    context.roles.includes("PERSONAL");

  if (!isStaff) {
    redirect(`/consultoria/${slug}`);
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);

  const [settings, dashboard, chargesResult, plans, infinitePayConfig] = await Promise.all([
    getConsultancyFinanceSettings(context.consultancyId),
    getConsultancyFinanceDashboard(context.consultancyId),
    listConsultancyCharges({
      consultancyId: context.consultancyId,
      statusFilter: status,
      query: q,
      page: page ? parseInt(page, 10) : 1,
    }),
    listConsultancyPlans({
      consultancyId: context.consultancyId,
      includeInactive: true,
    }),
    getInfinitePayConfig(context.consultancyId),
  ]);

  // Determine active tab: visao-geral (default), cobrancas, planos, recebimento (with configuracoes alias)
  const rawAba = (aba || "").toLowerCase().trim();
  const activeTab: "visao-geral" | "cobrancas" | "planos" | "recebimento" =
    rawAba === "cobrancas"
      ? "cobrancas"
      : rawAba === "planos"
      ? "planos"
      : rawAba === "recebimento" || rawAba === "configuracoes"
      ? "recebimento"
      : rawAba === "visao-geral"
      ? "visao-geral"
      : q || status || page
      ? "cobrancas"
      : "visao-geral";

  const currentStatusFilter = (status || "ALL").toUpperCase();

  const filterTabs = [
    { key: "ALL", label: "Todas" },
    { key: "PENDING", label: "Pendentes" },
    { key: "OVERDUE", label: "Vencidas" },
    { key: "UNDER_REVIEW", label: "Em análise" },
    { key: "PAID", label: "Pagas" },
    { key: "CANCELED", label: "Canceladas" },
  ];

  const isSimulationMode =
    infinitePayConfig?.environment === "SIMULATION" ||
    process.env.INFINITEPAY_ENVIRONMENT === "SIMULATION";

  const isInfinitePayReady = Boolean(
    infinitePayConfig?.enabled && infinitePayConfig?.handle
  );

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
      <div className="w-full max-w-6xl mx-auto space-y-5 pb-32 sm:pb-16 font-sans">
        {/* =========================================================================
            1. CABEÇALHO TREVOONE COMPACTO
            Hierarquia padrão idêntica a Treinos: Título, subtítulo e ação "+ Nova cobrança"
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#102E23] tracking-tight font-sans">
              Financeiro
            </h1>
            <p className="text-xs sm:text-sm text-[#526058] mt-0.5 leading-relaxed break-words">
              Cobranças de alunos, planos da consultoria e recebimentos via Pix e cartão.
            </p>
          </div>

          <div id="top-header-actions" className="shrink-0 w-full sm:w-auto">
            <Link
              href={`/consultoria/${slug}/financeiro/nova-cobranca`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[44px] w-full sm:w-auto shadow-xs cursor-pointer select-none"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>+ Nova cobrança</span>
            </Link>
          </div>
        </div>

        {/* =========================================================================
            2. AVISO DESTACADO DE SIMULAÇÃO (COMPACTO & OBRIGATÓRIO)
            Exibe alerta amigável e claro quando a integração estiver em modo de teste
            ========================================================================= */}
        {isSimulationMode && (
          <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-950 flex items-center justify-between gap-2.5 text-xs shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              <p className="font-semibold text-[11px] sm:text-xs text-amber-950 break-words">
                Modo de simulação — pagamentos reais desativados.
              </p>
            </div>
            <Link
              href={`/consultoria/${slug}/financeiro?aba=recebimento`}
              className="shrink-0 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 transition-colors whitespace-nowrap min-h-[32px] inline-flex items-center justify-center"
            >
              Ajustar →
            </Link>
          </div>
        )}

        {/* =========================================================================
            3. ABAS DE NAVEGAÇÃO DO TREVOONE (4 ÁREAS)
            Visão geral | Cobranças | Planos | Recebimento
            ========================================================================= */}
        <div className="relative w-full sm:w-fit">
          <div className="flex items-center gap-1 p-1 bg-[#EAECE6] border border-[#DEE2DA] rounded-2xl w-full sm:w-fit shadow-2xs overflow-x-auto scrollbar-none pr-14 sm:pr-1 scroll-smooth touch-pan-x">
            <Link
              href={`/consultoria/${slug}/financeiro?aba=visao-geral`}
              className={`flex-1 sm:flex-initial text-center px-3.5 sm:px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[38px] sm:min-h-[40px] flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "visao-geral"
                  ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
                  : "text-[#526058] hover:text-[#102E23] hover:bg-black/5"
              }`}
            >
              <span>Visão geral</span>
            </Link>

            <Link
              href={`/consultoria/${slug}/financeiro?aba=cobrancas`}
              className={`flex-1 sm:flex-initial text-center px-3.5 sm:px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[38px] sm:min-h-[40px] flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "cobrancas"
                  ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
                  : "text-[#526058] hover:text-[#102E23] hover:bg-black/5"
              }`}
            >
              <span>Cobranças</span>
              {chargesResult.total > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-200 text-zinc-700">
                  {chargesResult.total}
                </span>
              )}
            </Link>

            <Link
              href={`/consultoria/${slug}/financeiro?aba=planos`}
              className={`flex-1 sm:flex-initial text-center px-3.5 sm:px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[38px] sm:min-h-[40px] flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "planos"
                  ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
                  : "text-[#526058] hover:text-[#102E23] hover:bg-black/5"
              }`}
            >
              <span>Planos</span>
              {plans.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-200 text-zinc-700">
                  {plans.length}
                </span>
              )}
            </Link>

            <Link
              href={`/consultoria/${slug}/financeiro?aba=recebimento`}
              className={`flex-1 sm:flex-initial text-center px-3.5 sm:px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[38px] sm:min-h-[40px] flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "recebimento"
                  ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
                  : "text-[#526058] hover:text-[#102E23] hover:bg-black/5"
              }`}
            >
              <span>Recebimento</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isInfinitePayReady ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
            </Link>
          </div>

          {/* Indicador visual aprimorado de rolagem horizontal para mobile */}
          <div
            className="sm:hidden pointer-events-none absolute right-0.5 top-0.5 bottom-0.5 w-14 rounded-r-2xl bg-gradient-to-l from-[#EAECE6] via-[#EAECE6]/95 to-transparent flex items-center justify-end pr-1 text-[#102E23]"
            aria-hidden="true"
          >
            <span className="w-5 h-5 rounded-full bg-white/95 shadow-2xs border border-[#D5DDD6] flex items-center justify-center text-[#176B49]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          </div>
        </div>

        {/* =========================================================================
            ABA 1: VISÃO GERAL
            ========================================================================= */}
        {activeTab === "visao-geral" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* 1. Resumo dos Valores (Hero + 2 Cards Menores) */}
            <div className="space-y-3">
              {/* Card Principal: A Receber */}
              <div className="bg-white border border-[#E5E8E2] rounded-3xl p-5 sm:p-6 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-[#526058] uppercase tracking-wider">
                      Total a Receber
                    </span>
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold text-[#102E23] tracking-tight font-sans tabular-nums">
                    {formatCentsToBrl(dashboard.toReceiveCents)}
                  </p>
                  <p className="text-xs text-[#526058]">
                    Cobranças emitidas aguardando pagamento
                  </p>
                </div>
              </div>

              {/* 2 Cards Menores Lado a Lado no Mobile */}
              <div className="grid grid-cols-2 gap-3">
                {/* Recebido no mês */}
                <div className="bg-white border border-[#E5E8E2] rounded-2xl p-4 sm:p-5 shadow-xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#176B49] shrink-0" />
                    <span className="text-[11px] font-bold text-[#526058] uppercase tracking-wider truncate">
                      Recebido no mês
                    </span>
                  </div>
                  <p className="text-lg sm:text-2xl font-extrabold text-[#176B49] tracking-tight font-sans tabular-nums truncate">
                    {formatCentsToBrl(dashboard.paidThisMonthCents)}
                  </p>
                  <p className="text-[11px] text-[#526058] hidden sm:block truncate">
                    Pagamentos confirmados
                  </p>
                </div>

                {/* Em atraso */}
                <div className="bg-white border border-[#E5E8E2] rounded-2xl p-4 sm:p-5 shadow-xs space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dashboard.overdueCount > 0 ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                      <span className="text-[11px] font-bold text-[#526058] uppercase tracking-wider truncate">
                        Em atraso
                      </span>
                    </div>
                    {dashboard.overdueCount === 0 && (
                      <span className="text-[10px] font-bold text-[#176B49] bg-[#E2F5EC] px-1.5 py-0.5 rounded-full shrink-0">
                        Em dia
                      </span>
                    )}
                  </div>
                  <p className={`text-lg sm:text-2xl font-extrabold tracking-tight font-sans tabular-nums truncate ${dashboard.overdueCount > 0 ? "text-rose-700" : "text-[#102E23]"}`}>
                    {dashboard.overdueCount}
                  </p>
                  <p className="text-[11px] text-[#526058] hidden sm:block truncate">
                    {dashboard.overdueCount > 0 ? "Aguardando regularização" : "Nenhum atraso"}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Ações Rápidas Simplificadas (2 cards principais no mobile) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xs font-bold text-[#526058] uppercase tracking-wider">
                  Ações Rápidas
                </h3>
                <Link
                  href={`/consultoria/${slug}/financeiro?aba=planos`}
                  className="text-xs font-bold text-[#176B49] hover:text-[#125438] transition-colors"
                >
                  {isConsultancyAdmin ? "Gerenciar planos →" : "Ver planos →"}
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/consultoria/${slug}/financeiro?aba=cobrancas`}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E5E8E2] hover:border-[#176B49]/40 shadow-xs hover:shadow-sm transition-all group flex flex-col justify-between min-h-[88px]"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#E2F5EC] text-[#176B49] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#102E23] group-hover:text-[#176B49] transition-colors">
                      Ver cobranças
                    </p>
                    <p className="text-[11px] text-[#526058] line-clamp-1 mt-0.5">
                      {chargesResult.total > 0 ? `${chargesResult.total} registradas` : "Histórico completo"}
                    </p>
                  </div>
                </Link>

                <Link
                  href={`/consultoria/${slug}/financeiro?aba=planos`}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#E5E8E2] hover:border-[#176B49]/40 shadow-xs hover:shadow-sm transition-all group flex flex-col justify-between min-h-[88px]"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#E2F5EC] text-[#176B49] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-[#102E23] group-hover:text-[#176B49] transition-colors">
                      {isConsultancyAdmin ? "Gerenciar planos" : "Ver planos"}
                    </p>
                    <p className="text-[11px] text-[#526058] line-clamp-1 mt-0.5">
                      {isConsultancyAdmin ? "Configure planos e parcelamentos" : "Consulte modelos e valores para cobrança"}
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Banner de Comprovantes Pendentes (apenas para Administrador) */}
            {isConsultancyAdmin && dashboard.underReviewCount > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#176B49] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-zinc-900">
                      {dashboard.underReviewCount === 1
                        ? "1 comprovante aguardando sua análise"
                        : `${dashboard.underReviewCount} comprovantes aguardando sua análise`}
                    </p>
                    <p className="text-xs text-emerald-800 font-medium">
                      Confirme os pagamentos manuais para liberar o acesso dos alunos.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/consultoria/${slug}/financeiro/comprovantes`}
                  className="shrink-0 inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[44px]"
                >
                  Ver comprovantes →
                </Link>
              </div>
            )}

            {/* 3. Últimas cobranças */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-sm font-bold text-zinc-900">
                  Últimas cobranças
                </h3>
                <Link
                  href={`/consultoria/${slug}/financeiro?aba=cobrancas`}
                  className="text-xs font-bold text-[#176B49] hover:text-[#125438] transition-colors"
                >
                  Ver todas ({chargesResult.total}) →
                </Link>
              </div>

              {chargesResult.charges.length === 0 ? (
                <div className="bg-white border border-[#E5E8E2] rounded-2xl p-8 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-zinc-900">
                      Nenhuma cobrança registrada ainda
                    </p>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-0.5">
                      Quando você emitir cobranças para seus alunos, elas aparecerão listadas aqui.
                    </p>
                  </div>
                  <Link
                    href={`/consultoria/${slug}/financeiro/nova-cobranca`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[44px]"
                  >
                    + Emitir primeira cobrança
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {chargesResult.charges.slice(0, 5).map((charge) => (
                    <Link
                      key={charge.publicId}
                      href={`/consultoria/${slug}/financeiro/cobrancas/${charge.publicId}`}
                      className="block bg-white border border-[#E5E8E2] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-500/50 hover:shadow-sm transition-all group text-zinc-900"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-zinc-900 group-hover:text-emerald-700 transition-colors truncate min-w-0">
                              {charge.studentName}
                            </span>
                            <FinanceStatusBadge status={charge.derivedStatus} size="sm" />
                          </div>
                          <p className="text-xs text-zinc-500 font-medium truncate">
                            {charge.title}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Vencimento: <strong className="text-zinc-700 font-semibold">{formatDateBr(charge.dueOn)}</strong>
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-zinc-100 sm:border-t-0 shrink-0">
                          <span className="text-base sm:text-lg font-black text-zinc-900 tracking-tight font-mono tabular-nums">
                            {formatCentsToBrl(charge.amountCents)}
                          </span>
                          <span className="inline-flex items-center text-xs font-semibold text-[#176B49] group-hover:translate-x-0.5 transition-transform">
                            <span>Detalhes</span>
                            <svg className="w-4 h-4 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Informação clara sobre o recebimento */}
            <div className="bg-white border border-[#E5E8E2] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isInfinitePayReady ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <h4 className="font-heading text-sm font-bold text-zinc-900">
                    Recebimento de pagamentos
                  </h4>
                </div>
                <Link
                  href={`/consultoria/${slug}/financeiro?aba=recebimento`}
                  className="text-xs font-bold text-[#176B49] hover:text-[#125438] transition-colors"
                >
                  Configurações de recebimento →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 text-[11px] block">Conta de recebimento:</span>
                  <p className="font-bold text-zinc-900 font-mono">
                    {infinitePayConfig?.handle ? `$${infinitePayConfig.handle}` : "Não vinculada"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 text-[11px] block">Formas aceitas:</span>
                  <p className="font-bold text-zinc-900">
                    Pix e Cartão parcelado
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-1">
                  <span className="text-zinc-500 text-[11px] block">Ambiente:</span>
                  <p className="font-bold text-amber-700">
                    {isSimulationMode ? "Modo de simulação" : "Produção"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ABA 2: COBRANÇAS
            ========================================================================= */}
        {activeTab === "cobrancas" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Filter Tabs & Search Bar */}
            <div className="bg-white border border-[#E5E8E2] rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {filterTabs.map((tab) => {
                  const isActive = currentStatusFilter === tab.key;
                  const href =
                    tab.key === "ALL"
                      ? `/consultoria/${slug}/financeiro?aba=cobrancas${q ? `&q=${encodeURIComponent(q)}` : ""}`
                      : `/consultoria/${slug}/financeiro?aba=cobrancas&status=${tab.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

                  return (
                    <Link
                      key={tab.key}
                      href={href}
                      className={`px-3.5 py-2 min-h-[44px] inline-flex items-center rounded-xl text-xs whitespace-nowrap transition-colors border cursor-pointer select-none ${
                        isActive
                          ? "bg-[#E2F5EC] text-[#102E23] border-[#B8E6D0] shadow-2xs font-bold"
                          : "bg-[#F5F5F0] text-[#526058] hover:bg-[#EAECE6] hover:text-[#102E23] border-transparent font-medium"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  );
                })}
              </div>

              {/* Search Form */}
              <form method="GET" action={`/consultoria/${slug}/financeiro`} className="flex items-center gap-2">
                <input type="hidden" name="aba" value="cobrancas" />
                {status && <input type="hidden" name="status" value={status} />}
                <div className="relative flex-1">
                  <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#526058]/70 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    name="q"
                    defaultValue={q || ""}
                    placeholder="Buscar aluno ou cobrança..."
                    className="w-full h-11 pl-10 pr-3.5 text-xs bg-white border border-[#D5DDD6] rounded-xl text-[#102E23] placeholder:text-[#526058]/60 focus:outline-none focus:ring-2 focus:ring-[#176B49]/15 focus:border-[#176B49] transition-all shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 font-bold text-xs bg-[#176B49] hover:bg-[#125438] text-white rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  Buscar
                </button>
              </form>
            </div>

            {/* Charges List / Empty State */}
            {chargesResult.charges.length === 0 ? (
              <EmptyState
                title={
                  q || (status && status !== "ALL")
                    ? "Nenhuma cobrança encontrada para estes filtros"
                    : "Nenhuma cobrança cadastrada"
                }
                description={
                  q
                    ? `Nenhum resultado para "${q}". Tente buscar por outro termo ou limpar os filtros.`
                    : status && status !== "ALL"
                    ? "Não há cobranças registradas com a situação selecionada."
                    : "Cadastre sua primeira cobrança clicando em '+ Nova cobrança'."
                }
              />
            ) : (
              <div className="space-y-2.5">
                {chargesResult.charges.map((charge) => (
                  <Link
                    key={charge.publicId}
                    href={`/consultoria/${slug}/financeiro/cobrancas/${charge.publicId}`}
                    className="block bg-white border border-[#E5E8E2] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#176B49]/40 hover:shadow-sm transition-all group text-[#102E23]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-[#102E23] group-hover:text-[#176B49] transition-colors truncate min-w-0">
                            {charge.studentName}
                          </span>
                          <FinanceStatusBadge status={charge.derivedStatus} size="sm" />
                        </div>

                        <p className="text-xs text-[#526058] font-medium truncate">
                          {charge.title}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#526058]">
                          <span>
                            Vencimento: <strong className="text-[#102E23] font-semibold">{formatDateBr(charge.dueOn)}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-[#F0F2ED] sm:border-t-0 shrink-0">
                        <span className="text-base sm:text-lg font-black text-[#102E23] tracking-tight font-sans tabular-nums">
                          {formatCentsToBrl(charge.amountCents)}
                        </span>

                        <span className="inline-flex items-center text-xs font-bold text-[#176B49] group-hover:translate-x-0.5 transition-transform min-h-[36px]">
                          <span>Detalhes</span>
                          <svg className="w-3.5 h-3.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}

                {/* Pagination */}
                {chargesResult.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white border border-[#E5E8E2] rounded-2xl shadow-xs text-xs">
                    <p className="text-zinc-500 text-center sm:text-left">
                      Página <span className="font-bold text-zinc-900">{chargesResult.page}</span> de{" "}
                      <span className="font-bold text-zinc-900">{chargesResult.totalPages}</span> ({chargesResult.total} cobranças)
                    </p>

                    <div className="flex items-center gap-2">
                      {chargesResult.page > 1 && (
                        <Link
                          href={`/consultoria/${slug}/financeiro?aba=cobrancas&page=${chargesResult.page - 1}${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                          className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200 hover:bg-zinc-100 transition-colors min-h-[44px] flex items-center justify-center text-zinc-700"
                        >
                          Anterior
                        </Link>
                      )}

                      {chargesResult.page < chargesResult.totalPages && (
                        <Link
                          href={`/consultoria/${slug}/financeiro?aba=cobrancas&page=${chargesResult.page + 1}${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                          className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200 hover:bg-zinc-100 transition-colors min-h-[44px] flex items-center justify-center text-zinc-700"
                        >
                          Próxima
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ABA 3: PLANOS
            ========================================================================= */}
        {activeTab === "planos" && (
          <div className="animate-in fade-in duration-150">
            <FinancePlansManager
              consultancySlug={slug}
              initialPlans={plans}
              canManagePlans={isConsultancyAdmin}
            />
          </div>
        )}

        {/* =========================================================================
            ABA 4: RECEBIMENTO
            ========================================================================= */}
        {activeTab === "recebimento" && (
          <div className="space-y-6 max-w-3xl animate-in fade-in duration-150">
            {/* 1. InfinitePay Principal */}
            <InfinitePaySettingsForm
              consultancySlug={slug}
              config={infinitePayConfig}
              canEditSettings={isConsultancyAdmin}
            />

            {/* 2. Área secundária e discreta: Pix manual */}
            <div className="bg-white border border-[#E5E8E2] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
              <div>
                <h3 className="font-heading text-sm font-bold text-zinc-900">
                  Chave Pix para transferência manual (opcional)
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Configure caso queira receber transferências manuais e analisar comprovantes dos alunos que preferirem não pagar pelo checkout automático.
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-100">
                {isConsultancyAdmin ? (
                  <FinanceSettingsForm slug={slug} initialSettings={settings} />
                ) : (
                  <p className="text-xs text-zinc-600">
                    Chave Pix configurada: <strong className="text-zinc-900">{settings?.pixKey || "Nenhuma chave cadastrada"}</strong> ({settings?.pixKeyType || "Não definida"}). Apenas administradores da consultoria podem alterá-la.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
