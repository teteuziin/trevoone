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
    >
      <div className="w-full max-w-2xl mx-auto space-y-6 pb-12">
        <Link
          href={
            preselectedStudent
              ? `/consultoria/${slug}/progresso/alunos/${preselectedStudent.student.membershipPublicId}`
              : isTemplate
              ? `/consultoria/${slug}/rotinas?tab=templates`
              : `/consultoria/${slug}/rotinas`
          }
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[36px] depth-interactive"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>
            {preselectedStudent
              ? "Voltar para Central do Aluno"
              : isTemplate
              ? "Voltar para Modelos de Treino"
              : "Voltar para Treinos"}
          </span>
        </Link>

        <div className="p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-6 depth-surface">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                Módulo de Treinamento
              </span>
              <Badge variant={isTemplate ? "neutral" : "brand"} size="sm">
                {isTemplate ? "Modelo Reutilizável" : "Novo Treino do Zero"}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {isTemplate ? "Novo Modelo de Treino" : "Nova Ficha de Treino"}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
              {isTemplate
                ? "Defina o nome e os dados do modelo padrão. Em seguida, você adicionará as categorias e exercícios no criador modular."
                : "Defina o nome e os dados da ficha. Em seguida, você adicionará as categorias e exercícios."}
            </p>
          </div>

          {/* Banner do aluno pré-selecionado */}
          {preselectedStudent && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                  {preselectedStudent.student.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <UserCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Prescrição Direta
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {preselectedStudent.student.name}
                  </p>
                  {preselectedStudent.overview.objective && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">
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

          <form action={handleCreate} className="space-y-4.5">
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

            <div className="space-y-1.5">
              <label htmlFor="title" className="block text-xs font-bold text-[var(--text-primary)]">
                {isTemplate ? "Nome do modelo padrão *" : "Nome da ficha *"}
              </label>
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
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="objective" className="block text-xs font-bold text-[var(--text-primary)]">
                Objetivo principal
              </label>
              <input
                id="objective"
                name="objective"
                type="text"
                defaultValue={preselectedStudent?.overview.objective || ""}
                placeholder="Ex: Hipertrofia, Força, Resistência muscular..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="difficultyLevel" className="block text-xs font-bold text-[var(--text-primary)]">
                  Nível de dificuldade
                </label>
                <select
                  id="difficultyLevel"
                  name="difficultyLevel"
                  defaultValue="INTERMEDIATE"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] transition-all min-h-[44px]"
                >
                  <option value="BEGINNER">Iniciante</option>
                  <option value="INTERMEDIATE">Intermediário</option>
                  <option value="ADVANCED">Avançado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="estimatedDurationMinutes" className="block text-xs font-bold text-[var(--text-primary)]">
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
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="notes" className="block text-xs font-bold text-[var(--text-primary)]">
                Observações gerais / Recomendações
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Orientações pré-treino, recomendações de aquecimento..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all"
              />
            </div>

            <div className="pt-4 border-t border-[var(--border-default)] flex items-center justify-end gap-2.5">
              <Link
                href={
                  preselectedStudent
                    ? `/consultoria/${slug}/progresso/alunos/${preselectedStudent.student.membershipPublicId}`
                    : `/consultoria/${slug}/rotinas`
                }
              >
                <Button variant="secondary" size="md" className="font-semibold min-h-[44px]">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="font-bold min-h-[44px] flex items-center gap-2 shadow-sm"
              >
                <DumbbellIcon className="w-4 h-4" />
                <span>Criar Ficha de Treino</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
