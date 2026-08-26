import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import {
  listUpcomingConsultationsForStudent,
  listConsultationHistoryForStudent,
  listUpcomingConsultationsForProfessional,
  listConsultationHistoryForProfessional,
  listActiveStudentsForConsultationScheduling,
  resolveConsultationJoinAccess,
  type ConsultationProfessionalType,
} from "@/lib/consultancies/consultations";
import { StudentConsultationsView } from "@/components/consultancies/student-consultations-view";
import { ProfessionalConsultationsView } from "@/components/consultancies/professional-consultations-view";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ConsultasPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const roles = context.roles;
  const isStudent = roles.includes("STUDENT");
  const isPersonal = roles.includes("PERSONAL");
  const isNutritionist = roles.includes("NUTRITIONIST");
  const isInfluencerOnly = roles.includes("INFLUENCER") && !isStudent && !isPersonal && !isNutritionist;

  // INFLUENCER-only and Admin-only without operational consultation roles are not authorized for standard agenda UI
  if (isInfluencerOnly) {
    redirect(`/consultoria/${slug}`);
  }

  const timezone = context.consultancyTimezone || "America/Sao_Paulo";

  // STUDENT VIEW (includes STUDENT + INFLUENCER)
  if (isStudent) {
    const upcoming = await listUpcomingConsultationsForStudent(
      context.consultancyId,
      context.membershipId,
      20
    );
    const history = await listConsultationHistoryForStudent(
      context.consultancyId,
      context.membershipId,
      20
    );

    const nextConsultation = upcoming[0] || null;
    const joinAccess = nextConsultation
      ? await resolveConsultationJoinAccess(session.userId, slug, nextConsultation.publicId)
      : null;

    const otherUpcoming = upcoming.slice(1);

    return (
      <ConsultancyAppShell
        consultancyName={context.consultancyName}
        consultancySlug={context.consultancySlug}
        consultancyLogoUrl={context.consultancyLogoUrl}
        roles={context.roles}
        userName={session.fullName}
        userEmail={session.email}
      >
        <StudentConsultationsView
          consultancySlug={slug}
          consultancyName={context.consultancyName}
          timezone={timezone}
          nextConsultation={nextConsultation}
          joinAccess={joinAccess}
          upcomingConsultations={otherUpcoming}
          historyConsultations={history}
        />
      </ConsultancyAppShell>
    );
  }

  // PROFESSIONAL VIEW (PERSONAL or NUTRITIONIST)
  if (isPersonal || isNutritionist) {
    const professionalType: ConsultationProfessionalType = isPersonal ? "PERSONAL" : "NUTRITIONIST";

    const upcoming = await listUpcomingConsultationsForProfessional(
      context.consultancyId,
      context.membershipId,
      20
    );
    const history = await listConsultationHistoryForProfessional(
      context.consultancyId,
      context.membershipId,
      20
    );
    const activeStudents = await listActiveStudentsForConsultationScheduling(
      context.consultancyId
    );

    const nextConsultation = upcoming[0] || null;
    const joinAccessForNext = nextConsultation
      ? await resolveConsultationJoinAccess(session.userId, slug, nextConsultation.publicId)
      : null;

    return (
      <ConsultancyAppShell
        consultancyName={context.consultancyName}
        consultancySlug={context.consultancySlug}
        consultancyLogoUrl={context.consultancyLogoUrl}
        roles={context.roles}
        userName={session.fullName}
        userEmail={session.email}
      >
        <ProfessionalConsultationsView
          consultancySlug={slug}
          consultancyName={context.consultancyName}
          timezone={timezone}
          professionalType={professionalType}
          activeStudents={activeStudents}
          upcomingConsultations={upcoming}
          historyConsultations={history}
          joinAccessForNext={joinAccessForNext}
        />
      </ConsultancyAppShell>
    );
  }

  // Fallback for admins or unauthorized roles
  redirect(`/consultoria/${slug}`);
}
