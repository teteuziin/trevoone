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

function DumbbellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

function LayersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="2 12 12 17 22 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function ClockIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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

  const pageTitle = isAssignmentsTab
    ? "Prescrições"
    : isTemplatesTab
    ? "Modelos de Treino"
    : "Treinos";

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
      <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 sm:pb-16 font-sans">
        {/* =========================================================================
            1. CABEÇALHO TREVOONE
            Identidade visual limpa: Título "Treinos", subtítulo claro, CTA primário "+ Criar treino"
            ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1 sm:pt-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#102E23] tracking-tight font-sans">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-[#526058] mt-1">
              {isAssignmentsTab
                ? "Acompanhe e gerencie as prescrições ativas de treino dos seus alunos."
                : isTemplatesTab
                ? "Modelos padronizados para acelerar a prescrição de treinos aos seus alunos."
                : "Crie, encontre e acompanhe suas fichas de treino."}
            </p>
          </div>

          <div className="shrink-0">
            <WorkoutCreationSheet consultancySlug={slug} isTemplatesTab={isTemplatesTab} />
          </div>
        </div>

        {/* =========================================================================
            2. ABAS DE CONTEXTO
            Estilo TrevoOne marfim: Minhas fichas | Modelos | Prescrições
            ========================================================================= */}
        <div className="flex items-center gap-1 p-1 bg-[#EAECE6] border border-[#DEE2DA] rounded-2xl w-full sm:w-fit shadow-2xs">
          <Link
            href={`/consultoria/${slug}/rotinas`}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[38px] flex items-center justify-center cursor-pointer ${
              !isTemplatesTab && !isAssignmentsTab
                ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
                : "text-[#526058] hover:text-[#102E23] hover:bg-black/5"
            }`}
          >
            Minhas fichas
          </Link>
          <Link
            href={`/consultoria/${slug}/rotinas?tab=templates`}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[38px] flex items-center justify-center cursor-pointer ${
              isTemplatesTab
                ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
                : "text-[#526058] hover:text-[#102E23] hover:bg-black/5"
            }`}
          >
            Modelos
          </Link>
          <Link
            href={`/consultoria/${slug}/rotinas?tab=assignments`}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[38px] flex items-center justify-center cursor-pointer ${
              isAssignmentsTab
                ? "bg-white text-[#102E23] font-bold shadow-2xs border border-[#D5DDD6]"
                : "text-[#526058] hover:text-[#102E23] hover:bg-black/5"
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
                3. BUSCA, FILTROS RÁPIDOS E ORDENAÇÃO
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
                4. ESTADOS VAZIOS OU LISTA DE CARDS
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
                 5. LISTA DE FICHAS DE TREINO (CARDS RESPONSIVOS SEM SOBREPOSIÇÃO)
                 ================================================================= */
              <div className="space-y-3">
                {items.map((w) => {
                  const hasDraft = Boolean(w.hasActiveDraft);
                  const isPublished = Boolean(w.publishedVersionNumber != null && !hasDraft);
                  const studentName = w.assignedStudentName;
                  const studentInitials = studentName
                    ? studentName.slice(0, 2).toUpperCase()
                    : null;

                  return (
                    <div
                      key={w.publicId}
                      className="group bg-white rounded-2xl border border-[#E5E8E2] hover:border-[#CCD5CB] p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      {/* Left: Título, objetivo e badges */}
                      <div className="min-w-0 flex-1 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                              className="font-bold text-base sm:text-lg text-[#102E23] group-hover:text-[#176B49] transition-colors block truncate leading-tight"
                            >
                              {w.title}
                            </Link>
                            {w.objective && (
                              <p className="text-xs text-[#526058] truncate mt-0.5 max-w-xl">
                                {w.objective}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Metadados: Status, Aluno, Blocos, Atualização */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {/* Status Badge */}
                          {hasDraft ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#FFF8E6] text-[#8C5D00] border border-[#F0D699]">
                              Rascunho V{w.draftVersionNumber || 1}
                            </span>
                          ) : isPublished ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#EBF7EE] text-[#12583B] border border-[#C3E6CC]">
                              Publicado V{w.publishedVersionNumber}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-[#F0F2ED] text-[#6B7870] border border-[#DEE2D9]">
                              Arquivado
                            </span>
                          )}

                          {/* Student Pill / Template Tag */}
                          {w.isTemplate ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              <LayersIcon className="w-3 h-3" />
                              <span>Modelo padrão</span>
                            </span>
                          ) : studentName ? (
                            w.assignedStudentMembershipPublicId ? (
                              <Link
                                href={`/consultoria/${slug}/progresso/alunos/${w.assignedStudentMembershipPublicId}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#EDF5F0] text-[#102E23] border border-[#D5E4D8] hover:bg-[#E2EDE5] transition-colors"
                              >
                                <span className="w-4 h-4 rounded-full bg-[#176B49] text-white text-[9px] flex items-center justify-center font-bold">
                                  {studentInitials}
                                </span>
                                <span className="truncate max-w-[140px] sm:max-w-[180px]">{studentName}</span>
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#EDF5F0] text-[#102E23] border border-[#D5E4D8]">
                                <span className="w-4 h-4 rounded-full bg-[#176B49] text-white text-[9px] flex items-center justify-center font-bold">
                                  {studentInitials}
                                </span>
                                <span className="truncate max-w-[140px] sm:max-w-[180px]">{studentName}</span>
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-normal text-[#8C9890] bg-[#F5F5F0] border border-[#E5E8E2]">
                              <UserIcon className="w-3 h-3 text-[#A0AAA3]" />
                              <span>Sem aluno atribuído</span>
                            </span>
                          )}

                          {/* Divisões / Blocos */}
                          <span className="text-[#526058] font-medium inline-flex items-center gap-1">
                            <span>·</span>
                            <span>
                              {w.blocksCount} {w.blocksCount === 1 ? "divisão" : "divisões"}
                            </span>
                          </span>

                          {/* Duração Estimada */}
                          {w.estimatedDurationMinutes != null && (
                            <span className="text-[#6B7870] font-normal inline-flex items-center gap-1">
                              <span>·</span>
                              <ClockIcon className="w-3 h-3 text-[#8C9890]" />
                              <span>~{w.estimatedDurationMinutes} min</span>
                            </span>
                          )}

                          {/* Data de Atualização */}
                          <span className="text-[#8C9890] text-[11px]">
                            · Atualizado em {formatDate(w.updatedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Ações Diretas */}
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F0F2ED] shrink-0">
                        {w.isTemplate ? (
                          <Link
                            href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-2xs transition-all cursor-pointer min-h-[38px]"
                          >
                            <span>Usar modelo</span>
                            <span aria-hidden="true">→</span>
                          </Link>
                        ) : hasDraft ? (
                          <Link
                            href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#176B49] hover:bg-[#12583B] text-white shadow-2xs transition-all cursor-pointer min-h-[38px]"
                          >
                            <span>Continuar edição</span>
                            <span aria-hidden="true">→</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-[#F5F5F0] text-[#102E23] border border-[#D5DDD6] transition-all cursor-pointer min-h-[38px]"
                          >
                            <span>Abrir treino</span>
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
      </div>
    </ConsultancyAppShell>
  );
}
