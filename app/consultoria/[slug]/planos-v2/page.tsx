import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { listPlansForConsultancy, type PlanListItemDto } from "@/lib/nutrition-v2/plan-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { NutritionPlanCreationSheet } from "@/components/consultancies/nutrition-v2/nutrition-plan-creation-sheet";
import { NutritionPlanListControls } from "@/components/consultancies/nutrition-v2/nutrition-plan-list-controls";
import { NutritionPlanListView } from "@/components/consultancies/nutrition-v2/nutrition-plan-list-view";

function MealPlanIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

function AlertTriangleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
    tab?: string;
  }>;
};

export default async function ConsultancyNutritionPlansPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { q, status = "ALL", sort = "recent", page = "1", tab = "plans" } = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?returnUrl=/consultoria/${slug}/planos-v2`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const ctx = await resolveNutritionAccessContext(slug);
  if (!ctx || !ctx.canViewNutrition) {
    notFound();
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);

  const isTemplatesTab = tab === "templates";

  const validStatus =
    status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED" ? status : "ALL";

  const validSort =
    sort === "oldest" || sort === "title_asc" ? sort : "recent";

  const currentPage = Math.max(1, parseInt(page, 10) || 1);

  let plansData: { items: PlanListItemDto[]; total: number; pageSize: number; totalPages: number } = {
    items: [],
    total: 0,
    pageSize: 18,
    totalPages: 1,
  };
  let loadError: string | null = null;

  try {
    plansData = await listPlansForConsultancy(ctx, {
      query: q,
      status: validStatus,
      isTemplate: isTemplatesTab,
      sort: validSort,
      page: currentPage,
      limit: 18,
    });
  } catch (err: unknown) {
    console.error("[ConsultancyNutritionPlansPage] Erro ao carregar planos alimentares:", err);
    loadError = err instanceof Error ? err.message : "Erro desconhecido ao carregar planos alimentares";
  }

  const { items, total, totalPages } = plansData;

  const pageTitle = isTemplatesTab ? "Modelos de plano" : "Planos alimentares";

  const subtitleCountText = isTemplatesTab
    ? `${total} ${total === 1 ? "modelo cadastrado" : "modelos cadastrados"}`
    : `${total} ${total === 1 ? "plano cadastrado" : "planos cadastrados"}`;

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
      themeVariant="dark-overview"
      showDashboardWallpaper={true}
      maxWidth="default"
    >
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 sm:pb-12">
        {/* =========================================================================
            A. CABEÇALHO COMPACTO
            Fundo preto/grafite, cantos arredondados, sem degradê verde.
            Ícone nutricional verde esmeralda, contagem em texto secundário discreto.
            Ações no canto direito: "Importar plano" (secundária) + "Novo plano" (principal).
            ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
              <MealPlanIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {pageTitle}
                </h1>
                <span className="text-xs sm:text-sm text-[#8E929C] font-normal">
                  {subtitleCountText}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            <NutritionPlanCreationSheet consultancySlug={slug} isTemplatesTab={isTemplatesTab} />
          </div>
        </div>

        {/* =========================================================================
            B. NAVEGAÇÃO LOCAL SIMPLES
            Apenas "Planos" e "Modelos".
            Removidos "Pacientes" e "Biblioteca de Alimentos" desta navegação interna.
            Aba ativa com destaque esmeralda; aba inativa neutra.
            ========================================================================= */}
        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-2xl w-full sm:w-fit shadow-xs">
          <Link
            href={`/consultoria/${slug}/planos-v2`}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[40px] flex items-center justify-center cursor-pointer ${
              !isTemplatesTab
                ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/[0.05]"
            }`}
          >
            Planos
          </Link>
          <Link
            href={`/consultoria/${slug}/planos-v2?tab=templates`}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[40px] flex items-center justify-center cursor-pointer ${
              isTemplatesTab
                ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/[0.05]"
            }`}
          >
            Modelos
          </Link>
        </div>

        {/* =====================================================================
            C. BARRA DE CONTROLE: BUSCA, FILTROS, ORDENAÇÃO E CONTADOR
            ===================================================================== */}
        <NutritionPlanListControls
          consultancySlug={slug}
          currentQuery={q || ""}
          currentStatus={validStatus}
          currentSort={validSort}
          isTemplatesTab={isTemplatesTab}
          totalResults={total}
        />

        {/* =====================================================================
            D. ESTADOS VAZIOS DIFERENCIADOS
            - Erro ao carregar dados
            - Busca sem resultados
            - Lista vazia (nenhum plano criado ainda)
            ===================================================================== */}
        {loadError ? (
          <div className="p-8 sm:p-12 text-center rounded-2xl border border-rose-500/30 bg-rose-500/5 text-zinc-900 dark:text-white shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangleIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">
                Não foi possível carregar os planos alimentares no momento
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Ocorreu uma instabilidade na consulta. Seus dados continuam preservados.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href={`/consultoria/${slug}/planos-v2${isTemplatesTab ? "?tab=templates" : ""}`}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
              >
                Tentar novamente
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          q || validStatus !== "ALL" ? (
            /* Estado 1: Busca/Filtro sem resultados */
            <div className="p-8 sm:p-12 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#151619] shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                <MealPlanIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {isTemplatesTab
                    ? "Nenhum modelo encontrado para esta busca"
                    : "Nenhum plano encontrado para esta busca"}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Tente buscar com outros termos ou limpar os filtros aplicados.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href={`/consultoria/${slug}/planos-v2${isTemplatesTab ? "?tab=templates" : ""}`}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors cursor-pointer"
                >
                  Limpar filtros
                </Link>
              </div>
            </div>
          ) : (
            /* Estado 2: Lista Vazia Inicial (nenhum item cadastrado) */
            <div className="p-6 sm:p-8 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#151619] shadow-xs space-y-2.5 max-w-md mx-auto">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <MealPlanIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {isTemplatesTab ? "Nenhum modelo criado" : "Nenhum plano alimentar criado"}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {isTemplatesTab ? "Use Novo modelo para começar." : "Use Novo plano para começar."}
                </p>
              </div>
            </div>
          )
        ) : (
          <>
            {/* =================================================================
                E. TABELA DESKTOP & CARDS COMPACTOS NO SMARTPHONE
                ================================================================= */}
            <NutritionPlanListView
              consultancySlug={slug}
              items={items}
              isTemplatesTab={isTemplatesTab}
            />

            {/* Mobile Floating Action Button (respecting safe area) */}
            <div className="sm:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-20">
              <NutritionPlanCreationSheet consultancySlug={slug} isTemplatesTab={isTemplatesTab} isFloating />
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const url = new URL(`http://localhost/consultoria/${slug}/planos-v2`);
                  if (isTemplatesTab) url.searchParams.set("tab", "templates");
                  if (q) url.searchParams.set("q", q);
                  if (validStatus !== "ALL") url.searchParams.set("status", validStatus);
                  if (validSort !== "recent") url.searchParams.set("sort", validSort);
                  url.searchParams.set("page", String(p));

                  const isCurrent = p === currentPage;
                  return (
                    <Link
                      key={p}
                      href={url.pathname + url.search}
                      className={`w-9 h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-emerald-500 text-zinc-950 font-bold shadow-sm"
                          : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {p}
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
