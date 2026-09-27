import React from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { listPersonalStudents } from "@/lib/consultancies/personal-student-hub";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { PersonalStudentList } from "@/components/consultancies/personal-student-hub/personal-student-list";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ProfessionalStudentsProgressListPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getCurrentSession();

  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/progresso/alunos`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);
  const { effectiveMode } = effectiveState;

  if (effectiveMode === "STUDENT" || effectiveMode === "INFLUENCER") {
    redirect(`/consultoria/${slug}/progresso`);
  }

  const isPersonal = effectiveMode === "PERSONAL" && context.roles.includes("PERSONAL");
  const isNutritionist = effectiveMode === "NUTRITIONIST" && context.roles.includes("NUTRITIONIST");
  const isConsultancyAdmin =
    (effectiveMode === "ADMIN" || (effectiveMode as string) === "CONSULTANCY_ADMIN") &&
    context.roles.includes("CONSULTANCY_ADMIN");

  if (!isPersonal && !isNutritionist && !isConsultancyAdmin) {
    redirect(`/consultoria/${slug}`);
  }

  const students = await listPersonalStudents({ consultancyId: context.consultancyId });

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
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-16">
        <PageHeader
          eyebrow="Central de Alunos"
          title="Alunos da Consultoria"
          description="Acompanhe seus alunos, informa��es, avalia��es e crie rotinas de treino."
          backHref={`/consultoria/${slug}`}
          backLabel="Vis�o geral"
        />

        <PersonalStudentList
          consultancySlug={slug}
          students={students}
        />
      </div>
    </ConsultancyAppShell>
  );
}
