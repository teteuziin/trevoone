import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getProfessionalStudentProgressHistory } from "@/lib/consultancies/progress";
import {
  getProfessionalStudentPhotoEvaluationsData,
  getPhotoEvaluationComparisonData,
} from "@/lib/consultancies/photo-evaluations";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StudentProgressForm } from "@/components/consultancies/student-progress-form";
import { StudentProgressHistory } from "@/components/consultancies/student-progress-history";
import { ProfessionalPhotoEvaluationHub } from "@/components/consultancies/photos/professional-photo-evaluation-hub";

interface PageProps {
  params: Promise<{
    slug: string;
    studentPublicId: string;
  }>;
  searchParams?: Promise<{
    page?: string | string[];
    tab?: string | string[];
  }>;
}

export default async function ProfessionalStudentProgressDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, studentPublicId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawPage = resolvedSearchParams?.page;
  const rawTab = Array.isArray(resolvedSearchParams?.tab)
    ? resolvedSearchParams.tab[0]
    : resolvedSearchParams?.tab;
  const activeTab = rawTab === "fotos" ? "fotos" : "medicoes";

  const session = await getCurrentSession();

  if (!session) {
    redirect(`/login?redirect=/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const isPersonal = context.roles.includes("PERSONAL");
  const isNutritionist = context.roles.includes("NUTRITIONIST");
  const isConsultancyAdmin = context.roles.includes("CONSULTANCY_ADMIN");

  if (!isPersonal && !isNutritionist && !isConsultancyAdmin) {
    redirect(`/consultoria/${slug}`);
  }

  const [history, photoData, comparisonData] = await Promise.all([
    activeTab === "medicoes"
      ? getProfessionalStudentProgressHistory({
          userId: session.userId,
          consultancySlug: slug,
          studentPublicId,
          page: rawPage,
        })
      : Promise.resolve(null),
    activeTab === "fotos"
      ? getProfessionalStudentPhotoEvaluationsData({
          userId: session.userId,
          consultancySlug: slug,
          studentPublicId,
        })
      : Promise.resolve(null),
    activeTab === "fotos"
      ? getPhotoEvaluationComparisonData({
          userId: session.userId,
          consultancySlug: slug,
          studentPublicId,
        })
      : Promise.resolve(null),
  ]);

  // If viewing measurements, history must exist or notFound()
  if (activeTab === "medicoes" && !history) {
    notFound();
  }

  const student = history?.student || photoData?.student;
  if (!student) {
    notFound();
  }

  const entries = history?.entries || [];
  const pagination = history?.pagination;
  const latestEntry = history?.latestEntry || null;

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={slug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
        {/* Page Header */}
        <PageHeader
          eyebrow="Histórico do Aluno"
          title={student.fullName}
          description={student.email}
          backHref={`/consultoria/${slug}/progresso/alunos`}
          backLabel="Voltar para lista de alunos"
          actions={
            isPersonal && activeTab === "medicoes" ? (
              <StudentProgressForm
                consultancySlug={slug}
                studentPublicId={studentPublicId}
              />
            ) : undefined
          }
        />

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl w-fit">
          <Link
            href={`/consultoria/${slug}/progresso/alunos/${studentPublicId}?tab=medicoes`}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === "medicoes"
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-default)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
            }`}
          >
            Medições Corporais
          </Link>
          <Link
            href={`/consultoria/${slug}/progresso/alunos/${studentPublicId}?tab=fotos`}
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
            pagination={pagination}
            latestEntry={latestEntry}
            basePath={`/consultoria/${slug}/progresso/alunos/${studentPublicId}`}
            emptyMessage={`Nenhum registro de medições corporais encontrado para ${student.fullName}.`}
          />
        ) : (
          <ProfessionalPhotoEvaluationHub
            consultancySlug={slug}
            student={student}
            requests={photoData?.requests || []}
            comparisonData={comparisonData}
          />
        )}
      </div>
    </ConsultancyAppShell>
  );
}
