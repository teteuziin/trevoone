import React from "react";
import Link from "next/link";
import { redirect, RedirectType } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { getPersonalStudentDetail } from "@/lib/consultancies/personal-student-hub";
import { createWorkout, addBlockToDraft } from "@/lib/training-v2/workout-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { Badge } from "@/components/ui/badge";
import { NewWorkoutManualForm } from "@/components/consultancies/training-v2/new-workout-manual-form";

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

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    student?: string;
    studentId?: string;
    studentName?: string;
    isTemplate?: string;
    manual?: string;
    from?: string;
  }>;
}

export default async function NewWorkoutPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const {
    student: studentMembershipPublicIdRaw,
    studentId,
    studentName,
    isTemplate: isTemplateQuery,
    manual,
    from,
  } = await searchParams;

  const studentMembershipPublicId = studentMembershipPublicIdRaw || studentId;
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

  // =========================================================================
  // TREVO ONE 4.0 — PRINCÍPIO ABSOLUTO: ABRIR E COMEÇAR (AUTO-INICIALIZAÇÃO)
  // Cria o rascunho imediatamente e redireciona direto para o Editor 4.0
  // eliminando formulários intermediários desnecessários.
  // =========================================================================
  if (manual !== "true") {
    let draftTitle = "Nova Ficha de Treino";
    if (preselectedStudent?.student?.name) {
      draftTitle = `Treino - ${preselectedStudent.student.name}`;
    } else if (studentName && studentName.trim()) {
      draftTitle = `Treino - ${studentName.trim()}`;
    } else if (isTemplate) {
      draftTitle = "Novo Modelo de Treino";
    }

    try {
      const { workout, version } = await createWorkout(ctx, {
        title: draftTitle,
        isTemplate,
        difficultyLevel: "INTERMEDIATE",
      });

      // Cria a primeira divisão padrão "Treino A"
      await addBlockToDraft(ctx, version.publicId, {
        blockType: "SINGLE",
        title: "Treino A",
      });

      const targetStudentId =
        preselectedStudent?.student?.membershipPublicId || studentMembershipPublicId;

      const queryParams = new URLSearchParams();
      if (targetStudentId) queryParams.set("student", targetStudentId);
      if (isTemplate) queryParams.set("isTemplate", "true");
      if (from) queryParams.set("from", from);
      const queryStr = queryParams.toString();
      const redirectUrl = `/consultoria/${slug}/rotinas/${workout.publicId}${queryStr ? `?${queryStr}` : ""}`;

      redirect(redirectUrl, RedirectType.replace);
    } catch (err) {
      // Se redirect() foi chamado, ele lança uma exceção do Next.js (NEXT_REDIRECT) que precisa ser relançada
      if (err && typeof err === "object" && "digest" in err) {
        throw err;
      }
      console.error("[NewWorkoutPage] Erro na auto-inicialização do editor:", err);
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
      themeVariant="trainer-refined"
      showDashboardWallpaper={true}
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

        {preselectedStudent && (
          <input
            type="hidden"
            name="targetStudent"
            value={preselectedStudent.student.membershipPublicId}
          />
        )}

        {/* Formulário Novo com Detalhes do Treino Expansíveis e Ação Começar Montagem */}
        <NewWorkoutManualForm
          consultancySlug={slug}
          isTemplate={isTemplate}
          targetStudentMembershipPublicId={preselectedStudent?.student.membershipPublicId || studentMembershipPublicId}
          targetStudentName={preselectedStudent?.student.name || studentName}
          targetStudentObjective={preselectedStudent?.overview.objective}
          cancelHref={cancelHref}
        />
      </div>
    </ConsultancyAppShell>
  );
}
