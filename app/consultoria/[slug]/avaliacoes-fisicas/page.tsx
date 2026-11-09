import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import {
  getConsultancyPhysicalAssessmentsStats,
  listStudentsPhysicalAssessments,
} from "@/lib/consultancies/physical-assessments";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PhysicalAssessmentsHubView } from "@/components/consultancies/assessments/physical-assessments-hub-view";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PhysicalAssessmentsPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/avaliacoes-fisicas`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);
  const { effectiveMode } = effectiveState;

  // Only PERSONAL or CONSULTANCY_ADMIN have access to manage all students' physical assessments
  const canAccess =
    context.roles.includes("PERSONAL") ||
    context.roles.includes("CONSULTANCY_ADMIN") ||
    effectiveMode === "PERSONAL" ||
    effectiveMode === "ADMIN";

  if (!canAccess) {
    redirect(`/consultoria/${slug}`);
  }

  // Fetch real data in parallel
  const [stats, students] = await Promise.all([
    getConsultancyPhysicalAssessmentsStats(context.consultancyId),
    listStudentsPhysicalAssessments(context.consultancyId),
  ]);

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
      showDashboardWallpaper={true}
      themeVariant={effectiveMode === "PERSONAL" || effectiveMode === "ADMIN" ? "trainer-refined" : "trainer-refined"}
      maxWidth="default"
    >
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <PhysicalAssessmentsHubView
          consultancySlug={slug}
          stats={stats}
          students={students}
        />
      </div>
    </ConsultancyAppShell>
  );
}
