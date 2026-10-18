import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { getPersonalStudentDetail } from "@/lib/consultancies/personal-student-hub";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { Badge } from "@/components/ui/badge";

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
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

import { NewWorkoutManualForm } from "@/components/consultancies/training-v2/new-workout-manual-form";

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

  const cancelHref = preselectedStudent
    ? `/consultoria/${slug}/progresso/alunos/${preselectedStudent.student.membershipPublicId}`
    : isTemplate
    ? `/consultoria/${slug}/rotinas?tab=templates`
    : `/consultoria/${slug}/rotinas`;

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      viewModeState={effectiveState}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      maxWidth="full"
    >
      <div className="w-full max-w-[720px] 2xl:max-w-[760px] space-y-6 sm:space-y-7 pb-12 animate-in fade-in duration-150">
        {/* Navigation Breadcrumb / Back Action */}
        <div>
          <Link
            href={cancelHref}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors min-h-[44px] py-1 font-sans group cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
            <span>Voltar</span>
          </Link>
        </div>

        {/* Header limpo: Título Nova ficha */}
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight font-sans">
            {isTemplate ? "Novo modelo" : "Nova ficha"}
          </h1>
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

        {/* Formulário Novo com Detalhes do Treino Expansíveis e Ação Começar Montagem */}
        <NewWorkoutManualForm
          consultancySlug={slug}
          isTemplate={isTemplate}
          targetStudentMembershipPublicId={preselectedStudent?.student.membershipPublicId || studentMembershipPublicId}
          targetStudentName={preselectedStudent?.student.name}
          targetStudentObjective={preselectedStudent?.overview.objective}
          cancelHref={cancelHref}
        />
      </div>
    </ConsultancyAppShell>
  );
}
