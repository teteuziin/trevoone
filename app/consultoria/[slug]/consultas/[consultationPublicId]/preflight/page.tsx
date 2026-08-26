import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveConsultationJoinAccess } from "@/lib/consultancies/consultations";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { ConsultationDevicePreflight } from "@/components/consultations/consultation-device-preflight";

type PageProps = {
  params: Promise<{
    slug: string;
    consultationPublicId: string;
  }>;
};

export default async function ConsultationPreflightPage({ params }: PageProps) {
  const { slug, consultationPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // Authorize join eligibility on the server
  const access = await resolveConsultationJoinAccess(
    session.userId,
    slug,
    consultationPublicId
  );

  if (!access.allowed) {
    // If not allowed to join, redirect to consultas agenda
    redirect(`/consultoria/${slug}/consultas`);
  }

  const consultation = access.consultation;
  const isStudent = access.participantKind === "STUDENT";
  const counterpartName = isStudent
    ? consultation.professional.fullName
    : consultation.student.fullName;
  const counterpartRole = isStudent
    ? consultation.professionalType === "PERSONAL"
      ? "Personal Trainer"
      : "Nutricionista"
    : "Aluno";

  const timezone = context.consultancyTimezone || "America/Sao_Paulo";

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <ConsultationDevicePreflight
        consultancySlug={slug}
        title={consultation.title}
        counterpartName={counterpartName}
        counterpartRole={counterpartRole}
        scheduledStartFormatted={consultation.scheduledStartFormatted}
        scheduledEndFormatted={consultation.scheduledEndFormatted}
        timezone={timezone}
      />
    </ConsultancyAppShell>
  );
}
