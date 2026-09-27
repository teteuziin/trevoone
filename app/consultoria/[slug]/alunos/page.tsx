import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { listPersonalStudents } from "@/lib/consultancies/personal-student-hub";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { PersonalStudentList } from "@/components/consultancies/personal-student-hub/personal-student-list";

interface AlunosPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function AlunosListPage({ params }: AlunosPageProps) {
  const { slug } = await params;
  const session = await getCurrentSession();

  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/alunos`);
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

  const students = await listPersonalStudents({
    consultancyId: context.consultancyId,
  });

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
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
        <PageHeader
          eyebrow="Treinamento & Prescrição"
          title="Central de Alunos"
          description="Acompanhe seus alunos, histórico de saúde, fotos, avaliações e monte rotinas personalizadas."
          backHref={`/consultoria/${slug}`}
          backLabel="Visão geral"
        />

        <PersonalStudentList
          consultancySlug={slug}
          students={students}
        />
      </div>
    </ConsultancyAppShell>
  );
}
