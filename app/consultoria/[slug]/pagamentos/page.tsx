import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import {
  getStudentChargesPage,
  formatCentsToBrl,
  type StudentChargeDerivedStatus,
  type StudentChargesListResult,
} from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    view?: string;
    page?: string;
  }>;
};

function formatDateBr(isoDateStr: string): string {
  if (!isoDateStr || !isoDateStr.includes("-")) return isoDateStr;
  const [y, m, d] = isoDateStr.split("-");
  return `${d}/${m}/${y}`;
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

export default async function StudentPaymentsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { view, page } = await searchParams;

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
  const activeView: "pending" | "history" = view === "history" ? "history" : "pending";
  const parsedPage = page ? Math.max(1, parseInt(page, 10)) : 1;

  let result: StudentChargesListResult | null = null;
  let loadError: string | null = null;

  try {
    result = await getStudentChargesPage({
      consultancyId: context.consultancyId,
      studentMembershipId: context.membershipId,
      view: activeView,
      page: parsedPage,
    });
  } catch (err) {
    console.error("[StudentPaymentsPage] Error loading charges:", err);
    loadError = "Não foi possível carregar os dados financeiros no momento. Tente novamente mais tarde.";
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
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
        {/* ===================================================================== */}
        {/* A. CABEÇALHO SÓLIDO EXECUTIVO (Padrão Idêntico ao Painel do Aluno)    */}
        {/* ===================================================================== */}
        <div className="w-full">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="space-y-1">
                {/* Linha de status com ponto verde e contexto da consultoria */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
                  <span className="text-[11px] sm:text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
                    Acompanhamento do Aluno · {context.consultancyName}
                  </span>
                </div>

                {/* Título forte e identificação do aluno */}
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-[28px] font-black text-white tracking-tight">
                    Meus pagamentos
                  </h1>
                  <p className="text-xs sm:text-sm text-[#A1A7B4]">
                    Aluno: <strong className="text-white font-semibold">{session.fullName}</strong>
                  </p>
                </div>
              </div>

              {/* Botão de retorno seguro ao painel */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/consultoria/${slug}`}
                  className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
                >
                  <span>←</span>
                  <span>Voltar ao painel</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* B. ABAS EXECUTIVAS: "Em aberto" e "Histórico"                         */}
        {/* ===================================================================== */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-[#303238] pb-3">
          <Link
            href={`/consultoria/${slug}/pagamentos?view=pending`}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all min-h-[44px] flex items-center gap-2 cursor-pointer ${
              activeView === "pending"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-zinc-100 dark:bg-[#1B1D21] text-zinc-600 dark:text-[#8E95A2] hover:text-zinc-900 dark:hover:text-white border border-zinc-200/60 dark:border-[#303238]"
            }`}
          >
            <span>Em aberto</span>
            {activeView === "pending" && result && result.total > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                {result.total}
              </span>
            )}
          </Link>
          <Link
            href={`/consultoria/${slug}/pagamentos?view=history`}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all min-h-[44px] flex items-center gap-2 cursor-pointer ${
              activeView === "history"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-zinc-100 dark:bg-[#1B1D21] text-zinc-600 dark:text-[#8E95A2] hover:text-zinc-900 dark:hover:text-white border border-zinc-200/60 dark:border-[#303238]"
            }`}
          >
            <span>Histórico</span>
            {activeView === "history" && result && result.total > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                {result.total}
              </span>
            )}
          </Link>
        </div>

        {/* ===================================================================== */}
        {/* C. ESTADOS ESPECÍFICOS: ERRO / VAZIO / LISTA DE COBRANÇAS             */}
        {/* ===================================================================== */}
        {loadError ? (
          <div className="bg-white dark:bg-[#151619] border border-rose-200 dark:border-rose-900/50 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Falha ao carregar pagamentos
            </h3>
            <p className="text-xs text-zinc-500 dark:text-[#8E95A2] max-w-md mx-auto">
              {loadError}
            </p>
            <div>
              <Link
                href={`/consultoria/${slug}/pagamentos?view=${activeView}`}
                className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 min-h-[44px] transition-colors"
              >
                Tentar novamente
              </Link>
            </div>
          </div>
        ) : !result || result.charges.length === 0 ? (
          <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-sm">
            {activeView === "pending" ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Tudo em dia!</h3>
                <p className="text-xs text-zinc-500 dark:text-[#8E95A2] max-w-sm mx-auto">
                  Você não possui nenhuma cobrança em aberto no momento. Seus pagamentos e mensalidades estão regularizados.
                </p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-[#1B1D21] text-zinc-400 dark:text-[#8E95A2] flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Nenhum histórico disponível</h3>
                <p className="text-xs text-zinc-500 dark:text-[#8E95A2] max-w-sm mx-auto">
                  Suas cobranças quitadas ou canceladas anteriormente aparecerão listadas aqui para consulta.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {result.charges.map((charge) => {
              const formattedDueDate = formatDateBr(charge.dueOn);
              const hasPeriod = charge.referencePeriodStart && charge.referencePeriodEnd;
              const formattedPeriod = hasPeriod
                ? `${formatDateBr(charge.referencePeriodStart!)} a ${formatDateBr(charge.referencePeriodEnd!)}`
                : null;
              const badgeStyle = getStatusBadgeConfig(charge.derivedStatus);
              const isOverdue = charge.derivedStatus === "OVERDUE";

              // Ação principal condicional e sem ambiguidade
              let actionLabel = "Ver pagamento";
              let actionButtonClass =
                "px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white min-h-[44px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98";

              if (charge.derivedStatus === "UNDER_REVIEW") {
                actionLabel = "Ver comprovante";
                actionButtonClass =
                  "px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-amber-500/40 text-amber-500 dark:text-amber-400 hover:text-amber-300 min-h-[44px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs";
              } else if (charge.derivedStatus === "PAID") {
                actionLabel = "Ver pagamento";
                actionButtonClass =
                  "px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-zinc-100 dark:bg-[#1B1D21] hover:bg-zinc-200 dark:hover:bg-[#252830] border border-zinc-200 dark:border-[#303238] text-zinc-800 dark:text-[#E5E7EB] hover:text-zinc-900 dark:hover:text-white min-h-[44px] flex items-center justify-center gap-2 transition-all cursor-pointer";
              } else if (charge.derivedStatus === "CANCELED") {
                actionLabel = "Ver detalhes";
                actionButtonClass =
                  "px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-zinc-100 dark:bg-[#1B1D21] hover:bg-zinc-200 dark:hover:bg-[#252830] border border-zinc-200 dark:border-[#303238] text-zinc-500 dark:text-[#8E95A2] min-h-[44px] flex items-center justify-center gap-2 transition-all cursor-pointer";
              }

              return (
                <div
                  key={charge.publicId}
                  className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-5 sm:p-6 shadow-sm hover:border-zinc-300 dark:hover:border-[#40434C] transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Bloco 1: Informações da Cobrança */}
                    <div className="space-y-2 min-w-0 flex-1">
                      {/* 1. Nome ou referência da cobrança & 2. Status */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white break-words group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {charge.title}
                        </h2>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${badgeStyle.className}`}>
                          {badgeStyle.icon}
                          <span>{badgeStyle.label}</span>
                        </span>
                      </div>

                      {/* Competência estruturada (quando existir) */}
                      {formattedPeriod && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-[#8E95A2]">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">Competência:</span>
                          <span>{formattedPeriod}</span>
                        </div>
                      )}

                      {/* 4. Vencimento */}
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-[#8E95A2] flex-wrap">
                        <span className="inline-flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-zinc-400 dark:text-[#8E95A2] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>
                            Vencimento: <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{formattedDueDate}</strong>
                          </span>
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/60">
                            Vencida
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bloco 2: 3. Valor em destaque & 5. Ação principal */}
                    <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center md:items-end lg:items-center justify-between sm:justify-end gap-3.5 pt-3 md:pt-0 border-t border-zinc-100 dark:border-[#303238] md:border-t-0 shrink-0">
                      <div className="text-left sm:text-right md:text-right">
                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-[#8E95A2] uppercase tracking-wider block">
                          Valor
                        </span>
                        <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tabular-nums tracking-tight">
                          {formatCentsToBrl(charge.amountCents)}
                        </span>
                      </div>

                      <Link
                        href={`/consultoria/${slug}/pagamentos/${charge.publicId}`}
                        className={actionButtonClass}
                      >
                        <span>{actionLabel}</span>
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Paginação */}
            {result.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl shadow-sm text-xs">
                <p className="text-zinc-600 dark:text-[#8E95A2] text-center sm:text-left">
                  Página <strong className="font-bold text-zinc-900 dark:text-white">{result.page}</strong> de{" "}
                  <strong className="font-bold text-zinc-900 dark:text-white">{result.totalPages}</strong> ({result.total} {result.total === 1 ? "cobrança" : "cobranças"})
                </p>

                <div className="flex items-center gap-2">
                  {result.page > 1 && (
                    <Link
                      href={`/consultoria/${slug}/pagamentos?view=${activeView}&page=${result.page - 1}`}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] border border-zinc-200 dark:border-[#303238] text-zinc-800 dark:text-[#E5E7EB] min-h-[44px] flex items-center justify-center transition-colors"
                    >
                      Anterior
                    </Link>
                  )}

                  {result.page < result.totalPages && (
                    <Link
                      href={`/consultoria/${slug}/pagamentos?view=${activeView}&page=${result.page + 1}`}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] border border-zinc-200 dark:border-[#303238] text-zinc-800 dark:text-[#E5E7EB] min-h-[44px] flex items-center justify-center transition-colors"
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
    </ConsultancyAppShell>
  );
}
