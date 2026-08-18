import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getStudentOwnProgressHistory } from "@/lib/consultancies/progress";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
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
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Evolução e Medições
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
              Acompanhe o seu histórico de peso e medidas corporais ao longo do tempo.
            </p>
          </div>

          <div className="shrink-0">
            <StudentProgressForm consultancySlug={slug} />
          </div>
        </div>

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
