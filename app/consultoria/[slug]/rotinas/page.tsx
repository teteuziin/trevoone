import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { listWorkoutsForProfessional } from "@/lib/training-v2/workout-repository";
import { listAssignmentsForProfessional } from "@/lib/training-v2/assignment-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { WorkoutTemplatePickerTrigger } from "@/components/consultancies/training-v2/workout-template-picker";
import { WorkoutAssignmentsList } from "@/components/consultancies/training-v2/workout-assignments-list";
import { TrainingAiImportModal } from "@/components/consultancies/training-v2/training-ai-import-modal";
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
        {/* Header Cockpit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                Módulo de Treinamento
              </span>
              <Badge variant="brand" size="sm">
                Personal Trainer
              </Badge>
            </div>
            <h1 className="font-heading text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-2xl leading-relaxed">
              {pageSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {!isTemplatesTab && !isAssignmentsTab && (
              <>
                <TrainingAiImportModal consultancySlug={slug} />
                <WorkoutTemplatePickerTrigger consultancySlug={slug} />
              </>
            )}
            {!isAssignmentsTab && (
              <Link href={`/consultoria/${slug}/rotinas/novo`} className="w-full sm:w-auto">
                <Button variant="primary" size="md" className="w-full sm:w-auto font-bold min-h-[44px] shadow-sm flex items-center justify-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  <span>Nova ficha</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* View Mode Navigation Tabs: Treinos vs Modelos vs Prescrições */}
        <div className="flex items-center gap-1 p-1 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-2xl w-full sm:w-fit shadow-inner">
          <Link
            href={`/consultoria/${slug}/rotinas`}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[40px] flex items-center justify-center depth-interactive ${
              !isTemplatesTab && !isAssignmentsTab
                ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent"
            }`}
          >
            Treinos
          </Link>
          <Link
            href={`/consultoria/${slug}/rotinas?tab=templates`}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[40px] flex items-center justify-center depth-interactive ${
              isTemplatesTab
                ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent"
            }`}
          >
            Modelos
          </Link>
          <Link
            href={`/consultoria/${slug}/rotinas?tab=assignments`}
            className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-xl select-none transition-all min-h-[40px] flex items-center justify-center depth-interactive ${
              isAssignmentsTab
                ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs font-bold"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-transparent"
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
            {/* Filter Bar */}
            <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-3 depth-surface">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search Input */}
                <form method="GET" className="relative flex-1">
                  {isTemplatesTab && <input type="hidden" name="tab" value="templates" />}
                  <input type="hidden" name="status" value={validStatus} />
                  <SearchIcon className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="q"
                    defaultValue={q || ""}
                    placeholder={isTemplatesTab ? "Buscar por título do modelo..." : "Buscar por título do treino..."}
                    className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[40px]"
                  />
                </form>

                {/* Status Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
                        className={`px-3 py-1.5 rounded-xl text-xs select-none transition-all min-h-[36px] flex items-center justify-center whitespace-nowrap depth-interactive ${
                          isActive
                            ? "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-xs font-bold"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] border border-transparent font-medium"
                        }`}
                      >
                        {statusTab.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Workouts Grid */}
            {items.length === 0 ? (
              <div className="p-8 sm:p-12 text-center rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs depth-surface space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
                  <DumbbellIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {q || validStatus !== "ALL"
                      ? isTemplatesTab
                        ? "Nenhum modelo encontrado para os filtros informados."
                        : "Nenhum treino encontrado para os filtros informados."
                      : isTemplatesTab
                      ? "Você ainda não criou nenhum modelo de ficha."
                      : "Você ainda não criou nenhuma ficha."}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
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
                  <Link href={`/consultoria/${slug}/rotinas/novo`}>
                    <Button variant="primary" size="sm" className="font-bold min-h-[44px] flex items-center gap-1.5 shadow-sm">
                      <PlusIcon className="w-4 h-4" />
                      <span>Criar ficha</span>
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {items.map((w) => {
                  return (
                    <div
                      key={w.publicId}
                      className="p-3.5 sm:p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-2xs hover:border-[var(--border-strong)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
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
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            {w.objective}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-[var(--text-tertiary)]">
                          {!w.isTemplate && (
                            <>
                              {(w.activeAssignmentsCount ?? 0) === 0 ? (
                                <span className="font-medium text-amber-600 dark:text-amber-400">
                                  Sem aluno atribuído
                                </span>
                              ) : w.assignedStudentName ? (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
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

                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)] justify-end">
                        <Link
                          href={`/consultoria/${slug}/rotinas/${w.publicId}`}
                          className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-all min-h-[34px] cursor-pointer"
                        >
                          Abrir →
                        </Link>
                      </div>
                    </div>
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

                  return (
                    <Link
                      key={p}
                      href={url.pathname + url.search}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold select-none transition-all depth-interactive ${
                        currentPage === p
                          ? "bg-[var(--brand)] text-[var(--brand-foreground)] font-bold shadow-xs"
                          : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
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
