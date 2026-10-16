import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { listWorkoutsForProfessional } from "@/lib/training-v2/workout-repository";
import { listAssignmentsForProfessional } from "@/lib/training-v2/assignment-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { WorkoutAssignmentsList } from "@/components/consultancies/training-v2/workout-assignments-list";
import { WorkoutCardActions } from "@/components/consultancies/training-v2/workout-card-actions";
import { WorkoutCreationSheet } from "@/components/consultancies/training-v2/workout-creation-sheet";
import { WorkoutTemplatePickerTrigger } from "@/components/consultancies/training-v2/workout-template-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function DumbbellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
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
    page?: string;
    tab?: string;
  }>;
};

export default async function ConsultancyWorkoutsPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const { q, status = "ALL", page = "1", tab = "routines" } = await searchParams;

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

  const isTemplatesTab = tab === "templates";
  const isAssignmentsTab = tab === "assignments";

  const validStatus =
    status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED" ? status : "ALL";

  const currentPage = Math.max(1, parseInt(page, 10) || 1);

  const assignmentsData = isAssignmentsTab
    ? await listAssignmentsForProfessional(ctx, {
        status: "ALL",
        limit: 50,
      })
    : { items: [], total: 0 };

  const workoutsData = !isAssignmentsTab
    ? await listWorkoutsForProfessional(ctx, {
        query: q,
        status: validStatus,
        isTemplate: isTemplatesTab,
        page: currentPage,
        limit: 18,
      })
    : { items: [], total: 0, limit: 18 };

  const { items, total, limit } = workoutsData;
  const totalPages = Math.ceil(total / limit) || 1;

  const pageTitle = isAssignmentsTab
    ? "Prescrições de Treino"
    : isTemplatesTab
    ? "Modelos de Treino"
    : "Treinos e Rotinas";

  const pageSubtitle = isAssignmentsTab
    ? "Acompanhe os treinos atualmente atribuídos aos alunos vinculados."
    : isTemplatesTab
    ? "Modelos reutilizáveis para padronizar e acelerar a prescrição de novos treinos."
    : "Estruture fichas de treino completas organizadas por categorias e exercícios.";

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
    >
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
        {/* =========================================================================
            1. CABEÇALHO SÓLIDO (SEM DEGRADÊS OU LUZES AMBIENTES)
            ========================================================================= */}
        <div className="rounded-3xl border border-[#1e4738] bg-[#10271F] p-6 sm:p-7 shadow-xs text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18352C] border border-[#234e3e] text-[#80E8B3] text-xs font-bold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full animate-pulse bg-[#80E8B3]" />
                <span>MÓDULO DE TREINAMENTO · PERSONAL TRAINER</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
                {pageTitle}
              </h1>
              <p className="text-xs sm:text-sm text-[#CBDDD3] font-sans leading-relaxed">
                {pageSubtitle}
              </p>
            </div>

            {/* CTAs de Alto Impacto integrados com WorkoutCreationSheet */}
            <div className="shrink-0">
              <WorkoutCreationSheet consultancySlug={slug} isTemplatesTab={isTemplatesTab} />
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. ABAS DE CONTEXTO E NAVEGAÇÃO DE MODO DE VISÃO
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
                3. BARRA DE CONTROLE: BUSCA E FILTROS DE STATUS
                ===================================================================== */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <form method="GET" className="relative flex-1">
                  {isTemplatesTab && <input type="hidden" name="tab" value="templates" />}
                  <input type="hidden" name="status" value={validStatus} />
                  <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    name="q"
                    defaultValue={q || ""}
                    placeholder={isTemplatesTab ? "Buscar por título do modelo..." : "Buscar por título do treino..."}
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-zinc-950/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-all min-h-[40px]"
                  />
                </form>

                {/* Status Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                  {[
                    { id: "ALL", label: "Todos" },
                    { id: "DRAFT", label: "Rascunhos" },
                    { id: "PUBLISHED", label: "Publicados" },
                    { id: "ARCHIVED", label: "Arquivados" },
                  ].map((statusTab) => {
                    const isActive = validStatus === statusTab.id;
                    const url = new URL(`http://localhost/consultoria/${slug}/rotinas`);
                    if (isTemplatesTab) url.searchParams.set("tab", "templates");
                    if (q) url.searchParams.set("q", q);
                    if (statusTab.id !== "ALL") url.searchParams.set("status", statusTab.id);

                    return (
                      <Link
                        key={statusTab.id}
                        href={url.pathname + url.search}
                        className={`px-3.5 py-1.5 rounded-xl text-xs select-none transition-all min-h-[36px] flex items-center justify-center whitespace-nowrap cursor-pointer ${
                          isActive
                            ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                            : "bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-white/[0.06] font-medium"
                        }`}
                      >
                        {statusTab.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* =====================================================================
                4. CATÁLOGO DE FICHAS: SOLID CARDS
                ===================================================================== */}
            {items.length === 0 ? (
              <div className="p-8 sm:p-12 text-center rounded-2xl border border-[#1e4738] bg-[#10271F] text-white shadow-xs space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#18352C] border border-[#234e3e] flex items-center justify-center mx-auto text-[#80E8B3]">
                  <DumbbellIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-white">
                    {q || validStatus !== "ALL"
                      ? isTemplatesTab
                        ? "Nenhum modelo encontrado para os filtros informados."
                        : "Nenhum treino encontrado para os filtros informados."
                      : isTemplatesTab
                      ? "Você ainda não criou nenhum modelo de ficha."
                      : "Você ainda não criou nenhuma ficha."}
                  </h3>
                  <p className="text-xs text-[#CBDDD3] leading-relaxed">
                    {q || validStatus !== "ALL"
                      ? "Tente ajustar sua busca ou limpar os filtros de status."
                      : isTemplatesTab
                      ? "Crie treinos e use a opção 'Salvar como Modelo' para salvar modelos reutilizáveis."
                      : "Comece agora criando sua primeira ficha de treino dividida por categorias e exercícios."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                  {!isTemplatesTab && (
                    <WorkoutTemplatePickerTrigger consultancySlug={slug} />
                  )}
                  <Link
                    href={isTemplatesTab ? `/consultoria/${slug}/rotinas/novo?isTemplate=true` : `/consultoria/${slug}/rotinas/novo`}
                  >
                    <Button variant="primary" size="sm" className="font-bold min-h-[44px] flex items-center gap-1.5 shadow-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950">
                      <PlusIcon className="w-4 h-4" />
                      <span>{isTemplatesTab ? "Criar modelo" : "Criar ficha"}</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((w) => {
                  return (
                    <React.Fragment key={w.publicId}>
                      {/* MOBILE CARD (sm:hidden) */}
                      <div className="sm:hidden p-4 rounded-2xl border border-[#1e4738] bg-[#10271F] text-white shadow-xs space-y-3 relative group">
                        <div className="space-y-1.5 relative z-10">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-bold text-white leading-snug group-hover:text-[#80E8B3] transition-colors">
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
                            <p className="text-xs text-[#CBDDD3] line-clamp-2 leading-relaxed">
                              {w.objective}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#CBDDD3]/80 pt-0.5">
                            {w.isTemplate ? (
                              <span className="font-semibold text-white">
                                Modelo • {w.blocksCount} {w.blocksCount === 1 ? "categoria" : "categorias"}
                              </span>
                            ) : (
                              <>
                                {(w.activeAssignmentsCount ?? 0) === 0 ? (
                                  <span className="font-medium text-amber-300">
                                    Sem aluno atribuído
                                  </span>
                                ) : w.assignedStudentName ? (
                                  <span className="font-semibold text-[#80E8B3]">
                                    Aluno: {w.assignedStudentName}
                                  </span>
                                ) : null}
                                <span>•</span>
                                <span>{w.blocksCount} {w.blocksCount === 1 ? "categoria" : "categorias"}</span>
                              </>
                            )}
                            {w.estimatedDurationMinutes != null && (
                              <>
                                <span>•</span>
                                <span>~{w.estimatedDurationMinutes} min</span>
                              </>
                            )}
                          </div>

                          <p className="text-[11px] text-[#CBDDD3]/60 pt-0.5">
                            Atualizado em {new Date(w.updatedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>

                        {/* Mobile Primary Action (Abrir treino / Usar modelo) & Secondary Actions (min-h-[44px]) */}
                        <div className="pt-2.5 border-t border-[#1e4738] min-h-[44px] relative z-10">
                          <WorkoutCardActions
                            consultancySlug={slug}
                            workoutPublicId={w.publicId}
                            workoutTitle={w.title}
                            isDraft={Boolean(w.hasActiveDraft)}
                            isTemplate={Boolean(w.isTemplate)}
                          />
                        </div>
                      </div>

                      {/* DESKTOP ROW (hidden sm:flex) */}
                      <div className="hidden sm:flex p-4 sm:p-5 rounded-2xl border border-[#1e4738] bg-[#10271F] text-white shadow-xs hover:border-[#80E8B3]/50 transition-all flex-row items-center justify-between gap-4 group relative overflow-hidden">
                        {/* Hover left accent bar */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity w-1.5 absolute left-0 inset-y-0 bg-[#80E8B3] rounded-r-full" />

                        <div className="space-y-1.5 min-w-0 flex-1 relative z-10">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-base font-bold text-white group-hover:text-[#80E8B3] transition-colors truncate">
                              {w.title}
                            </h3>
                            {/* Status Badge */}
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

                          {w.objective && (
                            <p className="text-xs text-[#CBDDD3] truncate">
                              {w.objective}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#CBDDD3]/80">
                            {!w.isTemplate && (
                              <>
                                {(w.activeAssignmentsCount ?? 0) === 0 ? (
                                  <span className="font-medium text-amber-300">
                                    Sem aluno atribuído
                                  </span>
                                ) : w.assignedStudentName ? (
                                  <span className="font-semibold text-[#80E8B3]">
                                    Aluno: {w.assignedStudentName}
                                  </span>
                                ) : null}
                                <span>•</span>
                              </>
                            )}
                            <span>
                              {w.blocksCount} {w.blocksCount === 1 ? "categoria" : "categorias"}
                            </span>
                            {w.estimatedDurationMinutes != null && (
                              <>
                                <span>•</span>
                                <span>~{w.estimatedDurationMinutes} min</span>
                              </>
                            )}
                            <span>•</span>
                            <span>Atualizado em {new Date(w.updatedAt).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>

                        <div className="relative z-10 shrink-0">
                          <WorkoutCardActions
                            consultancySlug={slug}
                            workoutPublicId={w.publicId}
                            workoutTitle={w.title}
                            isDraft={Boolean(w.hasActiveDraft)}
                            isTemplate={Boolean(w.isTemplate)}
                          />
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const url = new URL(`http://localhost/consultoria/${slug}/rotinas`);
                  if (isTemplatesTab) url.searchParams.set("tab", "templates");
                  if (q) url.searchParams.set("q", q);
                  if (validStatus !== "ALL") url.searchParams.set("status", validStatus);
                  url.searchParams.set("page", String(p));

                  const isCurrent = p === currentPage;
                  return (
                    <Link
                      key={p}
                      href={url.pathname + url.search}
                      className={`w-9 h-9 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20"
                          : "bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]"
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
