import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { getPersonalStudentDetail } from "@/lib/consultancies/personal-student-hub";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PersonalStudentDetailView } from "@/components/consultancies/personal-student-hub/personal-student-detail-view";

interface StudentDetailPageProps {
  params: Promise<{
    slug: string;
    studentPublicId: string;
  }>;
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { slug, studentPublicId } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/alunos/${studentPublicId}`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);
  const { effectiveMode } = effectiveState;

  if (effectiveMode === "STUDENT" || effectiveMode === "INFLUENCER") {
    redirect(`/consultoria/${slug}`);
  }

  const isPersonal = context.roles.includes("PERSONAL");
  const isConsultancyAdmin = context.roles.includes("CONSULTANCY_ADMIN");

  if (!isPersonal && !isConsultancyAdmin) {
    redirect(`/consultoria/${slug}`);
  }

  // Authoritative server-side student load with strict tenancy guard
  const detail = await getPersonalStudentDetail({
    consultancyId: context.consultancyId,
    consultancySlug: slug,
    studentPublicId,
  });

  if (!detail) {
    notFound();
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
      consultancyPublicId={context.consultancyPublicId}
      viewModeState={effectiveState}
    >
      <div className="w-full max-w-5xl mx-auto space-y-6">
        <PersonalStudentDetailView
          consultancySlug={slug}
          detail={detail}
        />
      </div>
    </ConsultancyAppShell>
  );
}
