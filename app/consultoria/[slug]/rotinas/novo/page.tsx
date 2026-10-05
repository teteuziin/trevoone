import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { createWorkoutDraftAction } from "@/app/consultoria/[slug]/rotinas/actions";
import { getPersonalStudentDetail } from "@/lib/consultancies/personal-student-hub";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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

function UserCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    student?: string;
    isTemplate?: string;
  }>;
}

export default async function NewWorkoutPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { student: studentMembershipPublicId, isTemplate: isTemplateQuery } = await searchParams;
  const isTemplate = isTemplateQuery === "true";

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

  // If a student publicId is provided, safely fetch the student's detail to confirm tenancy and pre-fill context
  let preselectedStudent = null;
  if (studentMembershipPublicId && studentMembershipPublicId.trim()) {
    try {
      preselectedStudent = await getPersonalStudentDetail({
        consultancyId: context.consultancyId,
        consultancySlug: slug,
        studentMembershipPublicId: studentMembershipPublicId.trim(),
      });
    } catch {
      preselectedStudent = null;
    }
  }

  async function handleCreate(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || "").trim();
    const objective = String(formData.get("objective") || "").trim() || undefined;
    const difficultyLevel = String(formData.get("difficultyLevel") || "INTERMEDIATE");
    const estimatedDuration = formData.get("estimatedDurationMinutes");
    const notes = String(formData.get("notes") || "").trim() || undefined;
    const isTemplateVal = formData.get("isTemplate") === "true";
    const targetStudentMembershipPublicId = String(formData.get("targetStudentMembershipPublicId") || "").trim() || studentMembershipPublicId;

    const res = await createWorkoutDraftAction(slug, {
      title,
      objective,
      difficultyLevel,
      estimatedDurationMinutes: estimatedDuration ? Number(estimatedDuration) : null,
      notes,
      isTemplate: isTemplateVal,
    });

    if (res.ok && res.data) {
      const redirectUrl = targetStudentMembershipPublicId
        ? `/consultoria/${slug}/rotinas/${res.data.workoutPublicId}?student=${encodeURIComponent(targetStudentMembershipPublicId)}`
        : `/consultoria/${slug}/rotinas/${res.data.workoutPublicId}`;
      redirect(redirectUrl);
    }
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
      maxWidth="full"
    >
      <div className="w-full max-w-[940px] 2xl:max-w-[980px] space-y-6 sm:space-y-8 pb-12 animate-in fade-in duration-150">
        {/* Navigation Breadcrumb / Back Action */}
        <div>
          <Link
            href={
              preselectedStudent
                ? `/consultoria/${slug}/progresso/alunos/${preselectedStudent.student.membershipPublicId}`
                : isTemplate
                ? `/consultoria/${slug}/rotinas?tab=templates`
                : `/consultoria/${slug}/rotinas`
            }
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px] py-1 font-sans group cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
            <span>
              {preselectedStudent
                ? "Voltar para Central do Aluno"
                : isTemplate
                ? "Voltar para Modelos de Treino"
                : "Voltar para Treinos"}
            </span>
          </Link>
        </div>

        {/* Header limpo sem redundâncias */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight font-sans">
            {isTemplate ? "Novo modelo de treino" : "Nova ficha de treino"}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans">
            {isTemplate
              ? "Defina as informações básicas do modelo. Você adicionará as categorias e exercícios na próxima etapa."
              : "Defina as informações básicas. Você adicionará os exercícios na próxima etapa."}
          </p>
        </div>

        {/* Banner do aluno pré-selecionado (se aplicável) */}
        {preselectedStudent && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0 font-sans">
                {preselectedStudent.student.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <UserCheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-sans">
                    Prescrição Direta
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate font-sans">
                  {preselectedStudent.student.name}
                </p>
                {preselectedStudent.overview.objective && (
                  <p className="text-[11px] text-[var(--text-secondary)] truncate font-sans">
                    Objetivo: {preselectedStudent.overview.objective}
                  </p>
                )}
              </div>
            </div>
            <Badge variant="success" size="sm">
              Aluno Vinculado
            </Badge>
          </div>
        )}

        {/* Formulário integrado à página (sem card envolvente, fundo da página) */}
        <form
          action={handleCreate}
          className="space-y-8"
        >
            {preselectedStudent && (
              <input
                type="hidden"
                name="targetStudentMembershipPublicId"
                value={preselectedStudent.student.membershipPublicId}
              />
            )}
            {isTemplate && (
              <input
                type="hidden"
                name="isTemplate"
                value="true"
              />
            )}

            {/* 1. CAMPO PRINCIPAL: Nome da Ficha */}
            <div className="space-y-2 pb-8 border-b border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <label htmlFor="title" className="block text-sm font-bold text-[var(--text-primary)] font-sans">
                  {isTemplate ? "Nome do modelo padrão" : "Nome da ficha"}
                  <span className="text-[var(--brand)] ml-1">*</span>
                </label>
                <span className="text-[11px] text-[var(--text-tertiary)] font-medium font-sans">
                  Obrigatório
                </span>
              </div>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder={
                  isTemplate
                    ? "Ex: Hipertrofia Intermediária — ABC"
                    : preselectedStudent
                    ? `Ex: Treino A — Peito e Tríceps (${preselectedStudent.student.name.split(" ")[0]})`
                    : "Ex: Treino A — Peito e Tríceps"
                }
                className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-[var(--border-default)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[46px] shadow-2xs font-sans"
              />
            </div>

            {/* 2. AGRUPAMENTO: Informações do Treino */}
            <div className="space-y-5 pb-8 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-sans">
                  Informações do Treino
                </h2>
              </div>

              {/* Objetivo principal */}
              <div className="space-y-1.5">
                <label htmlFor="objective" className="block text-xs sm:text-sm font-semibold text-[var(--text-primary)] font-sans">
                  Objetivo principal
                </label>
                <input
                  id="objective"
                  name="objective"
                  type="text"
                  defaultValue={preselectedStudent?.overview.objective || ""}
                  placeholder="Ex: Hipertrofia, Força, Resistência muscular..."
                  className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px] font-sans"
                />
              </div>

              {/* Dificuldade + Duração (Desktop lado a lado: 58%/42%, Mobile empilhado) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-7 space-y-1.5">
                  <label htmlFor="difficultyLevel" className="block text-xs sm:text-sm font-semibold text-[var(--text-primary)] font-sans">
                    Nível de dificuldade
                  </label>
                  <select
                    id="difficultyLevel"
                    name="difficultyLevel"
                    defaultValue="INTERMEDIATE"
                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] text-[var(--text-primary)] transition-all min-h-[44px] font-sans"
                  >
                    <option value="BEGINNER">Iniciante</option>
                    <option value="INTERMEDIATE">Intermediário</option>
                    <option value="ADVANCED">Avançado</option>
                  </select>
                </div>

                <div className="sm:col-span-5 space-y-1.5">
                  <label htmlFor="estimatedDurationMinutes" className="block text-xs sm:text-sm font-semibold text-[var(--text-primary)] font-sans">
                    Duração estimada (min)
                  </label>
                  <input
                    id="estimatedDurationMinutes"
                    name="estimatedDurationMinutes"
                    type="number"
                    min="5"
                    max="240"
                    defaultValue="50"
                    placeholder="Ex: 50"
                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px] font-sans"
                  />
                </div>
              </div>
            </div>

            {/* 3. OBSERVAÇÕES: Secundário */}
            <div className="space-y-2 pb-8 border-b border-[var(--border-subtle)]">
              <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-[var(--text-secondary)] font-sans">
                Observações gerais / Recomendações <span className="text-[11px] text-[var(--text-tertiary)] font-normal">(opcional)</span>
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Orientações pré-treino, recomendações de aquecimento..."
                className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all font-sans resize-y"
              />
            </div>

            {/* 4. ACTIONS: Alinhadas no fluxo natural, sem barra ou footer de modal */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-3">
              <Link
                href={
                  preselectedStudent
                    ? `/consultoria/${slug}/progresso/alunos/${preselectedStudent.student.membershipPublicId}`
                    : isTemplate
                    ? `/consultoria/${slug}/rotinas?tab=templates`
                    : `/consultoria/${slug}/rotinas`
                }
                className="w-full sm:w-auto"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  className="w-full sm:w-auto font-semibold min-h-[44px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-sans"
                >
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full sm:w-auto font-bold min-h-[44px] flex items-center justify-center gap-2 shadow-xs hover:brightness-105 active:scale-[0.98] transition-all font-sans"
              >
                <DumbbellIcon className="w-4 h-4" />
                <span>{isTemplate ? "Criar Modelo de Treino" : "Criar Ficha de Treino"}</span>
              </Button>
            </div>
          </form>
        </div>
      </ConsultancyAppShell>
    );
  }
