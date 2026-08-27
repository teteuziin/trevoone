import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveConsultationJoinAccess } from "@/lib/consultancies/consultations";
import { ConsultationVideoRoom } from "@/components/consultations/consultation-video-room";

type PageProps = {
  params: Promise<{
    slug: string;
    consultationPublicId: string;
  }>;
};

export default async function ConsultationRoomPage({ params }: PageProps) {
  const { slug, consultationPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  // Authorize join eligibility strictly on the server before mounting WebRTC client
  const access = await resolveConsultationJoinAccess(
    session.userId,
    slug,
    consultationPublicId
  );

  if (!access.allowed || !access.participantKind) {
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
    <main className="fixed inset-0 z-50 bg-zinc-950 text-white overflow-hidden select-none">
      <ConsultationVideoRoom
        consultancySlug={slug}
        consultationPublicId={consultationPublicId}
        title={consultation.title}
        counterpartName={counterpartName}
        counterpartRole={counterpartRole}
        participantRole={access.participantKind}
        scheduledStartFormatted={consultation.scheduledStartFormatted}
        scheduledEndFormatted={consultation.scheduledEndFormatted}
        timezone={timezone}
        consultancyName={context.consultancyName}
        consultancyLogoUrl={context.consultancyLogoUrl}
      />
    </main>
  );
}
