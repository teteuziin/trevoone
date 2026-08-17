import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getProfessionalStudentProgressHistory } from "@/lib/consultancies/progress";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
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
      <div className="w-full space-y-6">
        {/* Navigation Back Link */}
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${slug}/progresso/alunos`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar para lista de alunos
          </Link>
        </div>

        {/* Student Header & Action Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Histórico do Aluno
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {student.fullName}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-mono">
              {student.email}
            </p>
          </div>

          {/* Only PERSONAL is authorized to register progress entries for students */}
          {isPersonal && (
            <div className="shrink-0">
              <StudentProgressForm
                consultancySlug={slug}
                studentPublicId={student.publicId}
              />
            </div>
          )}
        </div>

        {/* History / Timeline with pagination */}
        <StudentProgressHistory
          entries={entries}
          pagination={pagination}
          latestEntry={latestEntry}
          basePath={`/consultoria/${slug}/progresso/alunos/${student.publicId}`}
          emptyMessage={`Nenhuma medição registrada para ${student.fullName} até o momento.`}
        />
      </div>
    </ConsultancyAppShell>
  );
}
