import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { getPreQuestionnaireByPublicId } from "@/lib/nutrition-v2/pre-questionnaire-repository";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PatientPreQuestionnaireForm } from "@/components/consultancies/nutrition-v2/patient-pre-questionnaire-form";

interface PageProps {
  params: Promise<{
    slug: string;
    questionnairePublicId: string;
  }>;
}

export default async function StudentPreQuestionnairePage({ params }: PageProps) {
  const { slug, questionnairePublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/nutricao/pre-questionario/${questionnairePublicId}`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    notFound();
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);
  const isStudent = context.roles.includes("STUDENT") || context.roles.includes("INFLUENCER");
  const isProfessional = context.roles.includes("NUTRITIONIST") || context.roles.includes("CONSULTANCY_ADMIN");

  let questionnaire;
  try {
    questionnaire = await getPreQuestionnaireByPublicId(questionnairePublicId, context.consultancyId);
  } catch {
    notFound();
  }

  // Security check: Student can only view their own questionnaire. Professional can view questionnaires in their consultancy.
  if (isStudent && !isProfessional) {
    if (questionnaire.studentMembershipId !== context.membershipId) {
      notFound();
    }
  }

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={slug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={context.consultancyPublicId}
      viewModeState={effectiveState}
      themeVariant="dark-overview"
      showDashboardWallpaper={true}
      maxWidth="default"
    >
      <PatientPreQuestionnaireForm
        slug={slug}
        initialQuestionnaire={questionnaire}
        isStudentViewer={isStudent}
      />
    </ConsultancyAppShell>
  );
}
