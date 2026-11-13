import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
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
      showDashboardWallpaper={true}
      maxWidth="wide"
    >
      <div className="w-full max-w-6xl mx-auto space-y-5 pb-32 sm:pb-16 font-sans">
        {/* =========================================================================
            1. CABEÇALHO TREVOONE
            Hierarquia padrão: Voltar ao painel, Título "Financeiro", Subtítulo e "+ Nova cobrança"
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/consultoria/${slug}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#526058] hover:text-[#102E23] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Voltar ao painel</span>
              </Link>
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#102E23] tracking-tight font-sans break-words">
              Financeiro
            </h1>
            <p className="text-xs sm:text-sm text-[#526058] mt-0.5 leading-relaxed break-words">
              Cobranças de alunos, planos da consultoria e recebimentos via Pix e cartão.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/consultoria/${slug}/financeiro/nova-cobranca`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[44px] shadow-xs cursor-pointer select-none w-full sm:w-auto"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
          <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-950 dark:text-amber-200 flex items-center justify-between gap-2.5 text-xs shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              <p className="font-semibold text-[11px] sm:text-xs text-amber-900 dark:text-amber-200 break-words">
                Modo de simulação — pagamentos reais desativados.
              </p>
            </div>
            <Link
              href={`/consultoria/${slug}/financeiro?aba=recebimento`}
              className="shrink-0 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-950 dark:text-amber-100 transition-colors whitespace-nowrap min-h-[32px] inline-flex items-center justify-center"
            >
              Ajustar →
            </Link>
          </div>
        )}

        {/* =========================================================================
            3. ABAS DE NAVEGAÇÃO DO TREVOONE (4 ÁREAS)
            Visão geral | Cobranças | Planos | Recebimento
            ========================================================================= */}
        <div className="flex items-center gap-1 p-1 bg-[#EAECE6] border border-[#DEE2DA] rounded-2xl w-full sm:w-fit shadow-2xs overflow-x-auto scrollbar-none">
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

        {/* =========================================================================
            ABA 1: VISÃO GERAL
            ========================================================================= */}
        {activeTab === "visao-geral" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* 1. Resumo simples dos valores (KPI Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1.5">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                  Recebido este mês
                </span>
                <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-[#10B981] tracking-tight font-mono tabular-nums">
                  {formatCentsToBrl(dashboard.paidThisMonthCents)}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
                  Total de pagamentos confirmados
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1.5">
                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                  A receber
                </span>
                <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight font-mono tabular-nums">
                  {formatCentsToBrl(dashboard.toReceiveCents)}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
                  Cobranças emitidas aguardando pagamento
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-1.5">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  Cobranças vencidas
                </span>
                <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono tabular-nums">
                  {dashboard.overdueCount}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
                  {dashboard.overdueCount > 0
                    ? "Aguardando regularização dos alunos"
                    : "Nenhuma cobrança em atraso"}
                </p>
              </div>
            </div>

            {/* 2. Ações rápidas */}
            <div className="space-y-2">
              <h3 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
                Ações rápidas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href={`/consultoria/${slug}/financeiro/nova-cobranca`}
                  className="p-4 rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200/80 dark:border-[#303238] hover:border-emerald-500/60 shadow-xs hover:shadow-sm transition-all group flex items-start gap-3 min-h-[72px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-[#176B49] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      Cobrar aluno
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-[#8E95A2] line-clamp-1">
                      Emita uma nova cobrança avulsa
                    </p>
                  </div>
                </Link>

                <Link
                  href={`/consultoria/${slug}/financeiro?aba=planos`}
                  className="p-4 rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200/80 dark:border-[#303238] hover:border-emerald-500/60 shadow-xs hover:shadow-sm transition-all group flex items-start gap-3 min-h-[72px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-[#176B49] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      Criar plano
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-[#8E95A2] line-clamp-1">
                      Cadastre planos com parcelamento
                    </p>
                  </div>
                </Link>

                <Link
                  href={`/consultoria/${slug}/financeiro?aba=cobrancas`}
                  className="p-4 rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200/80 dark:border-[#303238] hover:border-emerald-500/60 shadow-xs hover:shadow-sm transition-all group flex items-start gap-3 min-h-[72px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-[#176B49] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      Ver cobranças
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-[#8E95A2] line-clamp-1">
                      Acompanhe o status dos pagamentos
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
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">
                      {dashboard.underReviewCount === 1
                        ? "1 comprovante aguardando sua análise"
                        : `${dashboard.underReviewCount} comprovantes aguardando sua análise`}
                    </p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
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
                <h3 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
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
                <div className="bg-white dark:bg-[#151619] border border-zinc-200/80 dark:border-[#303238] rounded-2xl p-8 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-zinc-900 dark:text-white">
                      Nenhuma cobrança registrada ainda
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-[#8E95A2] max-w-sm mx-auto mt-0.5">
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
                      className="block bg-white dark:bg-[#151619] border border-zinc-200/80 dark:border-[#303238] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-500/50 hover:shadow-sm transition-all group text-zinc-900 dark:text-white"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-[#10B981] transition-colors truncate min-w-0">
                              {charge.studentName}
                            </span>
                            <FinanceStatusBadge status={charge.derivedStatus} size="sm" />
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-[#8E95A2] font-medium truncate">
                            {charge.title}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
                            Vencimento: <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">{formatDateBr(charge.dueOn)}</strong>
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-zinc-100 dark:border-[#303238] sm:border-t-0 shrink-0">
                          <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight font-mono tabular-nums">
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
            <div className="bg-white dark:bg-[#151619] border border-zinc-200/80 dark:border-[#303238] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-[#303238] pb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isInfinitePayReady ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <h4 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
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
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-500 dark:text-[#8E95A2] text-[11px] block">Conta de recebimento:</span>
                  <p className="font-bold text-zinc-900 dark:text-white font-mono">
                    {infinitePayConfig?.handle ? `$${infinitePayConfig.handle}` : "Não vinculada"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-500 dark:text-[#8E95A2] text-[11px] block">Formas aceitas:</span>
                  <p className="font-bold text-zinc-900 dark:text-white">
                    Pix e Cartão parcelado
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/70 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-500 dark:text-[#8E95A2] text-[11px] block">Ambiente:</span>
                  <p className="font-bold text-amber-700 dark:text-amber-400">
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
            <div className="bg-white dark:bg-[#151619] border border-zinc-200/80 dark:border-[#303238] rounded-2xl p-4 shadow-xs space-y-3">
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
                      className={`px-3.5 py-2 min-h-[44px] inline-flex items-center rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer select-none ${
                        isActive
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs font-bold"
                          : "bg-zinc-100 dark:bg-[#1B1D21] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-[#252830] hover:text-zinc-900 dark:hover:text-white border-transparent"
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
                  <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    name="q"
                    defaultValue={q || ""}
                    placeholder="Buscar aluno ou cobrança..."
                    className="w-full h-11 pl-10 pr-3 text-xs bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200 dark:border-[#303238] rounded-xl text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 font-bold text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl transition-colors cursor-pointer"
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
                    className="block bg-white dark:bg-[#151619] border border-zinc-200/80 dark:border-[#303238] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-500/50 hover:shadow-sm transition-all group text-zinc-900 dark:text-white"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-[#10B981] transition-colors truncate min-w-0">
                            {charge.studentName}
                          </span>
                          <FinanceStatusBadge status={charge.derivedStatus} size="sm" />
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-[#8E95A2] font-medium truncate">
                          {charge.title}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-[#8E95A2]">
                          <span>
                            Vencimento: <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{formatDateBr(charge.dueOn)}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-zinc-100 dark:border-[#303238] sm:border-t-0 shrink-0">
                        <span className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight font-mono tabular-nums">
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

                {/* Pagination */}
                {chargesResult.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-[#151619] border border-zinc-200/80 dark:border-[#303238] rounded-2xl shadow-xs text-xs">
                    <p className="text-zinc-500 dark:text-[#8E95A2] text-center sm:text-left">
                      Página <span className="font-bold text-zinc-900 dark:text-white">{chargesResult.page}</span> de{" "}
                      <span className="font-bold text-zinc-900 dark:text-white">{chargesResult.totalPages}</span> ({chargesResult.total} cobranças)
                    </p>

                    <div className="flex items-center gap-2">
                      {chargesResult.page > 1 && (
                        <Link
                          href={`/consultoria/${slug}/financeiro?aba=cobrancas&page=${chargesResult.page - 1}${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                          className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[44px] flex items-center justify-center"
                        >
                          Anterior
                        </Link>
                      )}

                      {chargesResult.page < chargesResult.totalPages && (
                        <Link
                          href={`/consultoria/${slug}/financeiro?aba=cobrancas&page=${chargesResult.page + 1}${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                          className="px-4 py-2 rounded-xl text-xs font-semibold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors min-h-[44px] flex items-center justify-center"
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
            <div className="bg-white dark:bg-[#151619] border border-zinc-200/80 dark:border-[#303238] rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
              <div>
                <h3 className="font-heading text-sm font-bold text-zinc-900 dark:text-white">
                  Chave Pix para transferência manual (opcional)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-[#8E95A2] mt-0.5">
                  Configure caso queira receber transferências manuais e analisar comprovantes dos alunos que preferirem não pagar pelo checkout automático.
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-[#303238]">
                {isConsultancyAdmin ? (
                  <FinanceSettingsForm slug={slug} initialSettings={settings} />
                ) : (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Chave Pix configurada: <strong className="text-zinc-900 dark:text-white">{settings?.pixKey || "Nenhuma chave cadastrada"}</strong> ({settings?.pixKeyType || "Não definida"}). Apenas administradores da consultoria podem alterá-la.
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
