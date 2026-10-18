import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { listWorkoutsForProfessional, type WorkoutListItemDto } from "@/lib/training-v2/workout-repository";
import { listAssignmentsForProfessional, type ProfessionalAssignmentListItem } from "@/lib/training-v2/assignment-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { WorkoutAssignmentsList } from "@/components/consultancies/training-v2/workout-assignments-list";
import { WorkoutCardActions } from "@/components/consultancies/training-v2/workout-card-actions";
import { WorkoutCreationSheet } from "@/components/consultancies/training-v2/workout-creation-sheet";
import { WorkoutListControls } from "@/components/consultancies/training-v2/workout-list-controls";
import { Badge } from "@/components/ui/badge";

function DumbbellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

function AlertTriangleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
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

export default async function ConsultancyWorkoutsPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { q, status = "ALL", sort = "recent", page = "1", tab = "routines" } = await searchParams;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const isProfessional =
    context.roles.includes("PERSONAL") || context.roles.includes("CONSULTANCY_ADMIN");
  if (!isProfessional) {
    redirect(`/consultoria/${slug}`);
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx || !ctx.canAuthorTraining) {
    redirect(`/consultoria/${slug}`);
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);

  const isTemplatesTab = tab === "templates";
  const isAssignmentsTab = tab === "assignments";

  const validStatus =
    status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED" ? status : "ALL";

  const validSort =
    sort === "oldest" || sort === "title_asc" ? sort : "recent";

  const currentPage = Math.max(1, parseInt(page, 10) || 1);

  let assignmentsData: { items: ProfessionalAssignmentListItem[]; total: number } = { items: [], total: 0 };
  let workoutsData: { items: WorkoutListItemDto[]; total: number; limit: number } = { items: [], total: 0, limit: 18 };
  let loadError: string | null = null;

  try {
    if (isAssignmentsTab) {
      assignmentsData = await listAssignmentsForProfessional(ctx, {
        status: "ALL",
        limit: 50,
      });
    } else {
      workoutsData = await listWorkoutsForProfessional(ctx, {
        query: q,
        status: validStatus,
        isTemplate: isTemplatesTab,
        sort: validSort,
        page: currentPage,
        limit: 18,
      });
    }
  } catch (err: unknown) {
    console.error("[ConsultancyWorkoutsPage] Erro ao carregar dados:", err);
    loadError = err instanceof Error ? err.message : "Erro desconhecido ao carregar dados";
  }

  const { items, total, limit } = workoutsData;
  const totalPages = Math.ceil(total / limit) || 1;

  const pageTitle = isAssignmentsTab
    ? "Prescrições"
    : isTemplatesTab
    ? "Modelos de Treino"
    : "Treinos";

  const totalCount = isAssignmentsTab ? assignmentsData.total : total;
  const subtitleCountText = isAssignmentsTab
    ? `${totalCount} ${totalCount === 1 ? "prescrição ativa" : "prescrições ativas"}`
    : isTemplatesTab
    ? `${totalCount} ${totalCount === 1 ? "modelo cadastrado" : "modelos cadastrados"}`
    : `${totalCount} ${totalCount === 1 ? "ficha cadastrada" : "fichas cadastradas"}`;

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
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-24 sm:pb-12">
        {/* =========================================================================
            A. CABEÇALHO COMPACTO
            Fundo preto/grafite, cantos arredondados, sem degradê verde.
            Ícone azul, título "Treinos", contagem em texto secundário discreto.
            Ação principal no canto superior direito: "Nova ficha" / "Novo modelo".
            ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <DumbbellIcon className="w-5 h-5 text-blue-400" />
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
            <WorkoutCreationSheet consultancySlug={slug} isTemplatesTab={isTemplatesTab} />
          </div>
        </div>

        {/* =========================================================================
            B. ABAS DE CONTEXTO
            Manter as três visualizações existentes: Treinos, Modelos, Prescrições.
            Aba ativa com destaque esmeralda; abas inativas neutras.
            ========================================================================= */}
        <div className="flex items-center gap-1.5 p-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.08] rounded-2xl w-full sm:w-fit shadow-xs">
          <Link
            href={`/consultoria/${slug}/rotinas`}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[40px] flex items-center justify-center cursor-pointer ${
              !isTemplatesTab && !isAssignmentsTab
                ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/[0.05]"
            }`}
          >
            Treinos
          </Link>
          <Link
            href={`/consultoria/${slug}/rotinas?tab=templates`}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[40px] flex items-center justify-center cursor-pointer ${
              isTemplatesTab
                ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/[0.05]"
            }`}
          >
            Modelos
          </Link>
          <Link
            href={`/consultoria/${slug}/rotinas?tab=assignments`}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[40px] flex items-center justify-center cursor-pointer ${
              isAssignmentsTab
                ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-white/[0.05]"
            }`}
          >
            Prescrições
          </Link>
        </div>

        {isAssignmentsTab ? (
          <WorkoutAssignmentsList
            slug={slug}
            initialItems={assignmentsData.items}
            total={assignmentsData.total}
          />
        ) : (
          <>
            {/* =====================================================================
                C. BARRA DE CONTROLE: BUSCA, FILTROS, ORDENAÇÃO E CONTADOR
                ===================================================================== */}
            <WorkoutListControls
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
                - Lista vazia (nenhuma ficha criada ainda)
                ===================================================================== */}
            {loadError ? (
              <div className="p-8 sm:p-12 text-center rounded-2xl border border-rose-500/30 bg-rose-500/5 text-zinc-900 dark:text-white shadow-xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                  <AlertTriangleIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-rose-600 dark:text-rose-400">
                    Não foi possível carregar os treinos no momento
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Ocorreu uma instabilidade na consulta. Seus dados continuam preservados.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/consultoria/${slug}/rotinas${isTemplatesTab ? "?tab=templates" : ""}`}
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
                    <DumbbellIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      {isTemplatesTab
                        ? "Nenhum modelo encontrado para esta busca"
                        : "Nenhum treino encontrado para esta busca"}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Tente buscar com outros termos ou limpar os filtros aplicados.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href={`/consultoria/${slug}/rotinas${isTemplatesTab ? "?tab=templates" : ""}`}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors cursor-pointer"
                    >
                      Limpar filtros
                    </Link>
                  </div>
                </div>
              ) : (
                /* Estado 2: Lista Vazia Inicial (nenhum item cadastrado) */
                <div className="p-8 sm:p-12 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#151619] shadow-xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <DumbbellIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                      {isTemplatesTab
                        ? "Você ainda não criou nenhum modelo de ficha"
                        : "Você ainda não criou nenhuma ficha"}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {isTemplatesTab
                        ? "Crie modelos padronizados para acelerar a prescrição de treinos aos seus alunos."
                        : "Estruture sua primeira ficha de treino personalizada por categorias e exercícios."}
                    </p>
                  </div>
                  <div className="pt-2">
                    <WorkoutCreationSheet consultancySlug={slug} isTemplatesTab={isTemplatesTab} />
                  </div>
                </div>
              )
            ) : (
              <>
                {/* =================================================================
                    E. APRESENTAÇÃO DAS FICHAS NO DESKTOP (SUPERFÍCIE ÚNICA TABULAR)
                    ================================================================= */}
                <div className="hidden sm:block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#151619] shadow-xs overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 uppercase tracking-wider">
                    <div className="col-span-4">Ficha</div>
                    <div className="col-span-3">Aluno / Vínculo</div>
                    <div className="col-span-2">Status & Versão</div>
                    <div className="col-span-1">Blocos</div>
                    <div className="col-span-1">Atualização</div>
                    <div className="col-span-1 text-right">Ações</div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {items.map((w) => {
                      return (
                        <div
                          key={w.publicId}
                          className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Col 1: Ficha (título + objetivo) */}
                          <div className="col-span-4 min-w-0 pr-2">
                            <Link
                              href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                              className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors block truncate"
                            >
                              {w.title}
                            </Link>
                            {w.objective && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {w.objective}
                              </p>
                            )}
                          </div>

                          {/* Col 2: Aluno/Vínculo */}
                          <div className="col-span-3 min-w-0 pr-2 text-xs">
                            {w.isTemplate ? (
                              <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                                Modelo padrão
                              </span>
                            ) : w.assignedStudentName ? (
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                                {w.assignedStudentName}
                              </span>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-500 font-normal">
                                Sem aluno atribuído
                              </span>
                            )}
                          </div>

                          {/* Col 3: Status & Versão */}
                          <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                            {w.hasActiveDraft ? (
                              <Badge variant="warning" size="sm">
                                Rascunho V{w.draftVersionNumber}
                              </Badge>
                            ) : w.publishedVersionNumber != null ? (
                              <Badge variant="success" size="sm">
                                Publicado V{w.publishedVersionNumber}
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">
                                Arquivado
                              </Badge>
                            )}
                            {w.isTemplate && (
                              <Badge variant="brand" size="sm">
                                Modelo
                              </Badge>
                            )}
                          </div>

                          {/* Col 4: Blocos */}
                          <div className="col-span-1 text-xs text-zinc-600 dark:text-zinc-300 font-medium whitespace-nowrap">
                            <span>{w.blocksCount} {w.blocksCount === 1 ? "bloco" : "blocos"}</span>
                            {w.estimatedDurationMinutes != null && (
                              <span className="block text-[11px] text-zinc-400 dark:text-zinc-500 font-normal">
                                ~{w.estimatedDurationMinutes} min
                              </span>
                            )}
                          </div>

                          {/* Col 5: Atualização */}
                          <div className="col-span-1 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {new Date(w.updatedAt).toLocaleDateString("pt-BR")}
                          </div>

                          {/* Col 6: Ações */}
                          <div className="col-span-1 flex items-center justify-end">
                            <WorkoutCardActions
                              consultancySlug={slug}
                              workoutPublicId={w.publicId}
                              workoutTitle={w.title}
                              isDraft={Boolean(w.hasActiveDraft)}
                              isTemplate={Boolean(w.isTemplate)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* =================================================================
                    F. APRESENTAÇÃO DAS FICHAS NO SMARTPHONE (CARDS RESPONSIVOS)
                    ================================================================= */}
                <div className="sm:hidden space-y-3">
                  {items.map((w) => {
                    return (
                      <div
                        key={w.publicId}
                        className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#151619] shadow-xs space-y-3 transition-colors active:border-emerald-500/50"
                      >
                        {/* Whole Card Body Tap opens workout */}
                        <Link
                          href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                          className="block space-y-2 group cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-emerald-500 transition-colors leading-snug">
                              {w.title}
                            </h3>
                            {w.hasActiveDraft ? (
                              <Badge variant="warning" size="sm">
                                Rascunho V{w.draftVersionNumber}
                              </Badge>
                            ) : w.publishedVersionNumber != null ? (
                              <Badge variant="success" size="sm">
                                Publicado V{w.publishedVersionNumber}
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">
                                Arquivado
                              </Badge>
                            )}
                          </div>

                          {w.objective && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                              {w.objective}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 pt-0.5">
                            {w.isTemplate ? (
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                Modelo padrão
                              </span>
                            ) : w.assignedStudentName ? (
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                Aluno: {w.assignedStudentName}
                              </span>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-500">
                                Sem aluno atribuído
                              </span>
                            )}
                            <span>•</span>
                            <span>{w.blocksCount} {w.blocksCount === 1 ? "bloco" : "blocos"}</span>
                            {w.estimatedDurationMinutes != null && (
                              <>
                                <span>•</span>
                                <span>~{w.estimatedDurationMinutes} min</span>
                              </>
                            )}
                          </div>

                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 pt-0.5">
                            Atualizado em {new Date(w.updatedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </Link>

                        {/* Secondary Actions with isolated click handlers */}
                        <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80">
                          <WorkoutCardActions
                            consultancySlug={slug}
                            workoutPublicId={w.publicId}
                            workoutTitle={w.title}
                            isDraft={Boolean(w.hasActiveDraft)}
                            isTemplate={Boolean(w.isTemplate)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Floating Action Button (respecting safe area) */}
                <div className="sm:hidden fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-20">
                  <WorkoutCreationSheet consultancySlug={slug} isTemplatesTab={isTemplatesTab} isFloating />
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      const url = new URL(`http://localhost/consultoria/${slug}/rotinas`);
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
          </>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
