import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getStudentOwnProgressHistory } from "@/lib/consultancies/progress";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StudentProgressForm } from "@/components/consultancies/student-progress-form";
import { StudentProgressHistory } from "@/components/consultancies/student-progress-history";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    page?: string | string[];
  }>;
}

export default async function StudentProgressPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawPage = resolvedSearchParams?.page;

  const session = await getCurrentSession();

  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/progresso`);
  }

  const access = await resolveStudentModuleAccess(session.userId, slug);

  if (!access.allowed || !access.context) {
    if (access.reason === "FINANCIALLY_RESTRICTED") {
      redirect(`/consultoria/${slug}/pagamentos/regularizar`);
    }
    if (access.reason === "ONBOARDING_INCOMPLETE") {
      redirect(`/consultoria/${slug}/onboarding`);
    }
    // If not a student, redirect to overview or professional students list
    if (access.reason === "NOT_STUDENT") {
      redirect(`/consultoria/${slug}`);
    }
    redirect(`/consultoria/${slug}`);
  }

  const history = await getStudentOwnProgressHistory({
    userId: session.userId,
    consultancySlug: slug,
    page: rawPage,
  });

  const entries = history?.entries || [];

  return (
    <ConsultancyAppShell
      consultancyName={access.context.consultancyName}
      consultancySlug={slug}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      roles={access.context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Evolução e Medições"
          description="Acompanhe o seu histórico de peso e medidas corporais ao longo do tempo."
          backHref={`/consultoria/${slug}`}
          backLabel="Voltar à visão geral"
          actions={<StudentProgressForm consultancySlug={slug} />}
        />

        {/* History / Timeline with pagination */}
        <StudentProgressHistory
          entries={entries}
          pagination={history?.pagination}
          latestEntry={history?.latestEntry}
          basePath={`/consultoria/${slug}/progresso`}
          emptyMessage="Você ainda não possui registros de evolução. Quando fizer sua primeira medição, ela aparecerá aqui."
        />
      </div>
    </ConsultancyAppShell>
  );
}
