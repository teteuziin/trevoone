import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getProfessionalStudentProgressHistory } from "@/lib/consultancies/progress";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StudentProgressForm } from "@/components/consultancies/student-progress-form";
import { StudentProgressHistory } from "@/components/consultancies/student-progress-history";

interface PageProps {
  params: Promise<{
    slug: string;
    studentPublicId: string;
  }>;
  searchParams?: Promise<{
    page?: string | string[];
  }>;
}

export default async function ProfessionalStudentProgressDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, studentPublicId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawPage = resolvedSearchParams?.page;

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

  if (!isPersonal && !isNutritionist) {
    redirect(`/consultoria/${slug}`);
  }

  const history = await getProfessionalStudentProgressHistory({
    userId: session.userId,
    consultancySlug: slug,
    studentPublicId,
    page: rawPage,
  });

  if (!history) {
    notFound();
  }

  const { student, entries, pagination, latestEntry } = history;

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={slug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          eyebrow="Histórico do Aluno"
          title={student.fullName}
          description={student.email}
          backHref={`/consultoria/${slug}/progresso/alunos`}
          backLabel="Voltar para lista de alunos"
          actions={
            isPersonal ? (
              <StudentProgressForm
                consultancySlug={slug}
                studentPublicId={studentPublicId}
              />
            ) : undefined
          }
        />

        {/* History / Timeline */}
        <StudentProgressHistory
          entries={entries}
          pagination={pagination}
          latestEntry={latestEntry}
          basePath={`/consultoria/${slug}/progresso/alunos/${studentPublicId}`}
          emptyMessage={`Nenhum registro de evolução encontrado para ${student.fullName}.`}
        />
      </div>
    </ConsultancyAppShell>
  );
}
