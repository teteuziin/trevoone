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
import { WorkoutQuickActions } from "@/components/consultancies/training-v2/workout-quick-actions";
import { WorkoutMobileScrollActions } from "@/components/consultancies/training-v2/workout-mobile-scroll-actions";

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

function formatDate(val: unknown): string {
  if (!val) return "—";
  try {
    const d = new Date(val as string | number | Date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
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

  const pageTitle = "Treinos";
  const pageSubtitle = isAssignmentsTab
    ? "Acompanhe e atualize os treinos dos seus alunos."
    : isTemplatesTab
    ? "Modelos prontos para acelerar a prescrição de treinos aos seus alunos."
    : "Crie, encontre e acompanhe seus treinos.";

  const latestDraft = workoutsData.items.find((w) => w.hasActiveDraft);

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
      showDashboardWallpaper={false}
      maxWidth="wide"
    >
      <div className="w-full max-w-6xl mx-auto space-y-5 pb-32 sm:pb-16 font-sans">
        {/* =========================================================================
            1. CABEÇALHO TREVOONE COMPACTO
            Desktop: Título "Treinos", subtítulo claro, Ações: "+ Criar treino" e "Criar com IA"
            Mobile: Linha única compacta com "Criar" e "IA" (nomes acessíveis completos)
            ========================================================================= */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#102E23] tracking-tight font-sans">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-[#526058] mt-0.5 truncate sm:whitespace-normal">
              {pageSubtitle}
            </p>
          </div>

          <div id="top-header-actions" className="shrink-0">
            <WorkoutCreationSheet consultancySlug={slug} isTemplatesTab={isTemplatesTab} />
          </div>
        </div>

        {/* =========================================================================
            2. HERO COM CONTINUAÇÃO DE RASCUNHO (COMPACTO E SEM DUPLICAÇÕES)
            ========================================================================= */}
        <WorkoutQuickActions
          consultancySlug={slug}
          latestDraft={
            latestDraft
              ? {
                  publicId: latestDraft.publicId,
                  title: latestDraft.title,
                  updatedAt: latestDraft.updatedAt,
                  blocksCount: latestDraft.blocksCount,
                }
              : null
          }
          activeTab={isAssignmentsTab ? "assignments" : isTemplatesTab ? "templates" : "routines"}
        />

        {/* =========================================================================
            3. ABAS DE CONTEXTO
            Estilo TrevoOne marfim: Meus treinos | Modelos prontos | Treinos dos alunos
            Mobile: Meus treinos | Modelos | Dos alunos
            ========================================================================= */}
        <div className="flex items-center gap-1 p-1 bg-[#EAECE6] border border-[#DEE2DA] rounded-2xl w-full sm:w-fit shadow-2xs">
          <Link
            href={`/consultoria/${slug}/rotinas`}
            className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold rounded-xl select-none transition-all min-h-[36px] sm:min-h-[38px] flex items-center justify-center whitespace-nowrap cursor-pointer ${
              !isTemplatesTab && !isAssignmentsTab
                ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
                : "text-[#526058] hover:text-[#102E23] hover:bg-black/5"
            }`}
          >
            Meus treinos
          </Link>
          <Link
            href={`/consultoria/${slug}/rotinas?tab=templates`}
            className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold rounded-xl select-none transition-all min-h-[36px] sm:min-h-[38px] flex items-center justify-center whitespace-nowrap cursor-pointer ${
              isTemplatesTab
                ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
                : "text-[#526058] hover:text-[#102E23] hover:bg-black/5"
            }`}
          >
            <span className="sm:hidden">Modelos</span>
            <span className="hidden sm:inline">Modelos prontos</span>
          </Link>
          <Link
            href={`/consultoria/${slug}/rotinas?tab=assignments`}
            className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-4 py-2 text-[11px] sm:text-xs font-semibold rounded-xl select-none transition-all min-h-[36px] sm:min-h-[38px] flex items-center justify-center whitespace-nowrap cursor-pointer ${
              isAssignmentsTab
                ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
                : "text-[#526058] hover:text-[#102E23] hover:bg-black/5"
            }`}
          >
            <span className="sm:hidden">Dos alunos</span>
            <span className="hidden sm:inline">Treinos dos alunos</span>
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
                4. BUSCA, FILTROS RÁPIDOS E ORDENAÇÃO
                ===================================================================== */}
            <WorkoutListControls
              consultancySlug={slug}
              currentQuery={q || ""}
              currentStatus={validStatus}
              currentSort={validSort}
              isTemplatesTab={isTemplatesTab}
              totalResults={total}
              hasError={Boolean(loadError)}
            />

            {/* =====================================================================
                5. ESTADOS VAZIOS OU LISTA DE CARDS COMPACTOS
                ===================================================================== */}
            {loadError ? (
              <div className="p-8 sm:p-12 text-center rounded-3xl border border-rose-200 bg-rose-50/50 text-[#102E23] shadow-2xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertTriangleIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-rose-700">
                    Não foi possível carregar os treinos no momento
                  </h3>
                  <p className="text-xs text-[#526058] leading-relaxed">
                    Ocorreu uma instabilidade na consulta. Seus dados continuam preservados.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/consultoria/${slug}/rotinas${isTemplatesTab ? "?tab=templates" : ""}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-[#102E23] text-white hover:bg-[#1A4736] transition-colors"
                  >
                    Tentar novamente
                  </Link>
                </div>
              </div>
            ) : items.length === 0 ? (
              q || validStatus !== "ALL" ? (
                /* Busca/Filtro sem resultados */
                <div className="p-8 sm:p-12 text-center rounded-3xl border border-[#E5E8E2] bg-white shadow-2xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5F5F0] text-[#8C9890] flex items-center justify-center mx-auto">
                    <DumbbellIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-[#102E23]">
                      {isTemplatesTab
                        ? "Nenhum modelo encontrado para esta busca"
                        : "Nenhum treino encontrado para esta busca"}
                    </h3>
                    <p className="text-xs text-[#526058] leading-relaxed">
                      Tente buscar com outros termos ou limpar os filtros aplicados.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      href={`/consultoria/${slug}/rotinas${isTemplatesTab ? "?tab=templates" : ""}`}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold bg-[#F5F5F0] hover:bg-[#EAECE6] text-[#102E23] border border-[#E5E8E2] transition-colors cursor-pointer"
                    >
                      Limpar filtros
                    </Link>
                  </div>
                </div>
              ) : (
                /* Lista Vazia Inicial */
                <div className="p-8 sm:p-12 text-center rounded-3xl border border-[#E5E8E2] bg-white shadow-2xs space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#176B49]/10 text-[#176B49] flex items-center justify-center mx-auto">
                    <DumbbellIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base font-bold text-[#102E23]">
                      {isTemplatesTab
                        ? "Você ainda não criou nenhum modelo de treino"
                        : "Você ainda não criou nenhuma ficha de treino"}
                    </h3>
                    <p className="text-xs text-[#526058] leading-relaxed">
                      {isTemplatesTab
                        ? "Crie modelos padronizados para acelerar a prescrição de treinos aos seus alunos."
                        : "Comece agora montando sua primeira ficha com o novo editor ultrarrápido."}
                    </p>
                  </div>
                  <div className="pt-3">
                    <Link
                      href={`/consultoria/${slug}/rotinas/novo${isTemplatesTab ? "?isTemplate=true" : ""}`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-2xs transition-all cursor-pointer"
                    >
                      <span>{isTemplatesTab ? "+ Criar primeiro modelo" : "+ Criar meu primeiro treino"}</span>
                    </Link>
                  </div>
                </div>
              )
            ) : (
              /* =================================================================
                 6. LISTA DE FICHAS DE TREINO (CARDS COMPACTOS EM LINHA ÚNICA)
                 ================================================================= */
              <div className="space-y-2.5">
                {items.map((w) => {
                  const hasDraft = Boolean(w.hasActiveDraft);
                  const isPublished = Boolean(w.publishedVersionNumber != null && !hasDraft);
                  const studentName = w.assignedStudentName;

                  return (
                    <div
                      key={w.publicId}
                      className="group bg-white rounded-2xl border border-[#E5E8E2] hover:border-[#CCD5CB] p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2.5 sm:gap-3"
                    >
                      {/* Left: Título e linha única de metadados essenciais */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <Link
                          href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                          className="font-bold text-sm sm:text-base text-[#102E23] group-hover:text-[#176B49] transition-colors block truncate leading-tight"
                        >
                          {w.title}
                        </Link>

                        {/* Metadados essenciais em uma linha */}
                        <div className="flex items-center gap-1.5 flex-wrap text-xs text-[#526058]">
                          {/* Status Badge */}
                          {hasDraft ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#FFF8E6] text-[#8C5D00] border border-[#F0D699]">
                              Em elaboração
                            </span>
                          ) : isPublished ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EBF7EE] text-[#12583B] border border-[#C3E6CC]">
                              Publicado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#F0F2ED] text-[#6B7870] border border-[#DEE2D9]">
                              Arquivado
                            </span>
                          )}

                          {/* Student Pill / Template Tag */}
                          {w.isTemplate ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700">
                              <span>·</span>
                              <span>Modelo pronto</span>
                            </span>
                          ) : studentName ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-[#102E23]">
                              <span>·</span>
                              <span className="truncate max-w-[120px] sm:max-w-[180px]">{studentName}</span>
                            </span>
                          ) : null}

                          {/* Divisões e Exercícios */}
                          <span className="inline-flex items-center gap-1">
                            <span>·</span>
                            <span>{w.blocksCount} {w.blocksCount === 1 ? "divisão" : "divisões"}</span>
                            {w.exercisesCount != null && w.exercisesCount > 0 && (
                              <span className="hidden sm:inline-flex items-center gap-1">
                                <span>·</span>
                                <span>{w.exercisesCount} {w.exercisesCount === 1 ? "exercício" : "exercícios"}</span>
                              </span>
                            )}
                          </span>

                          {/* Data de Atualização */}
                          <span className="text-[#8C9890] text-[11px] hidden sm:inline-flex items-center gap-1">
                            <span>·</span>
                            <span>Atualizado {formatDate(w.updatedAt)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Right: Ações Diretas */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {w.isTemplate ? (
                          <Link
                            href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-2xs transition-all cursor-pointer min-h-[34px] sm:min-h-[36px]"
                          >
                            <span>Usar modelo</span>
                            <span aria-hidden="true">→</span>
                          </Link>
                        ) : hasDraft ? (
                          <Link
                            href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-2xs transition-all cursor-pointer min-h-[34px] sm:min-h-[36px]"
                          >
                            <span>Continuar</span>
                            <span aria-hidden="true">→</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#F5F5F0] text-[#102E23] border border-[#D5DDD6] transition-all cursor-pointer min-h-[34px] sm:min-h-[36px]"
                          >
                            <span>Ver treino</span>
                            <span aria-hidden="true">→</span>
                          </Link>
                        )}

                        <WorkoutCardActions
                          consultancySlug={slug}
                          workoutPublicId={w.publicId}
                          workoutTitle={w.title}
                          isDraft={Boolean(w.hasActiveDraft)}
                          isTemplate={Boolean(w.isTemplate)}
                          showPrimaryButton={false}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="pt-4 flex items-center justify-between gap-3 text-xs">
                    <span className="text-[#6B7870]">
                      Página {currentPage} de {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      {currentPage > 1 && (
                        <Link
                          href={`/consultoria/${slug}/rotinas?page=${currentPage - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${validStatus !== "ALL" ? `&status=${validStatus}` : ""}${isTemplatesTab ? "&tab=templates" : ""}`}
                          className="px-3 py-1.5 rounded-xl border border-[#E5E8E2] bg-white text-[#102E23] font-semibold hover:bg-[#F5F5F0] transition-colors"
                        >
                          Anterior
                        </Link>
                      )}
                      {currentPage < totalPages && (
                        <Link
                          href={`/consultoria/${slug}/rotinas?page=${currentPage + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${validStatus !== "ALL" ? `&status=${validStatus}` : ""}${isTemplatesTab ? "&tab=templates" : ""}`}
                          className="px-3 py-1.5 rounded-xl border border-[#E5E8E2] bg-white text-[#102E23] font-semibold hover:bg-[#F5F5F0] transition-colors"
                        >
                          Próxima
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* =========================================================================
            7. AÇÕES FLUTUANTES CONTEXTUAIS MOBILE (APENAS APÓS ROLAGEM)
            Aparece discretamente após rolar para não competir com o cabeçalho
            ========================================================================= */}
        <WorkoutMobileScrollActions
          consultancySlug={slug}
          isTemplatesTab={isTemplatesTab}
        />
      </div>
    </ConsultancyAppShell>
  );
}
