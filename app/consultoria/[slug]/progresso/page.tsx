import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getStudentOwnProgressHistory } from "@/lib/consultancies/progress";
import {
  getStudentPhotoEvaluationsData,
  getPhotoEvaluationComparisonData,
} from "@/lib/consultancies/photo-evaluations";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StudentProgressForm } from "@/components/consultancies/student-progress-form";
import { StudentProgressHistory } from "@/components/consultancies/student-progress-history";
import { StudentPhotoEvaluationHub } from "@/components/consultancies/photos/student-photo-evaluation-hub";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    page?: string | string[];
    tab?: string | string[];
  }>;
}

export default async function StudentProgressPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawPage = resolvedSearchParams?.page;
  const rawTab = Array.isArray(resolvedSearchParams?.tab)
    ? resolvedSearchParams.tab[0]
    : resolvedSearchParams?.tab;
  const activeTab = rawTab === "fotos" ? "fotos" : "medicoes";

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

  // Load measurements or photo evaluations depending on the active tab
  const [history, photoData, comparisonData] = await Promise.all([
    activeTab === "medicoes"
      ? getStudentOwnProgressHistory({
          userId: session.userId,
          consultancySlug: slug,
          page: rawPage,
        })
      : Promise.resolve(null),
    activeTab === "fotos"
      ? getStudentPhotoEvaluationsData({
          userId: session.userId,
          consultancySlug: slug,
        })
      : Promise.resolve(null),
    activeTab === "fotos"
      ? getPhotoEvaluationComparisonData({
          userId: session.userId,
          consultancySlug: slug,
        })
      : Promise.resolve(null),
  ]);

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
          title="Evolução e Avaliações"
          description="Acompanhe o seu histórico de peso, medidas corporais e fotos de avaliação ao longo do tempo."
          backHref={`/consultoria/${slug}`}
          backLabel="Voltar à visão geral"
          actions={activeTab === "medicoes" ? <StudentProgressForm consultancySlug={slug} /> : undefined}
        />

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl w-fit">
          <Link
            href={`/consultoria/${slug}/progresso?tab=medicoes`}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === "medicoes"
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-default)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
            }`}
          >
            Medições Corporais
          </Link>
          <Link
            href={`/consultoria/${slug}/progresso?tab=fotos`}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === "fotos"
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-default)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
            }`}
          >
            Fotos de Avaliação
          </Link>
        </div>

        {/* Tab Content */}
        {activeTab === "medicoes" ? (
          <StudentProgressHistory
            entries={entries}
            pagination={history?.pagination}
            latestEntry={history?.latestEntry}
            basePath={`/consultoria/${slug}/progresso`}
            emptyMessage="Você ainda não possui registros de evolução. Quando fizer sua primeira medição, ela aparecerá aqui."
          />
        ) : (
          <StudentPhotoEvaluationHub
            consultancySlug={slug}
            activeRequest={photoData?.activeRequest || null}
            history={photoData?.history || []}
            comparisonData={comparisonData}
          />
        )}
      </div>
    </ConsultancyAppShell>
  );
}
