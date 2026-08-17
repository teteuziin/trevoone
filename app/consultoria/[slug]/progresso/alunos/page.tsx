import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { listProfessionalStudentsForProgress } from "@/lib/consultancies/progress";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";

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

  const isPersonal = context.roles.includes("PERSONAL");
  const isNutritionist = context.roles.includes("NUTRITIONIST");

  if (!isPersonal && !isNutritionist) {
    redirect(`/consultoria/${slug}`);
  }

  const students = await listProfessionalStudentsForProgress({
    userId: session.userId,
    consultancySlug: slug,
  });

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
        {/* Header */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Evolução dos Alunos
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
            Selecione um aluno para acompanhar o histórico de medições corporais.
          </p>
        </div>

        {/* Students List */}
        {students.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Nenhum aluno ativo encontrado
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              Quando houver alunos vinculados e ativos na consultoria, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <Link
                key={student.publicId}
                href={`/consultoria/${slug}/progresso/alunos/${student.publicId}`}
                className="group p-5 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] hover:border-emerald-500/50 shadow-xs transition-all flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors block truncate">
                    {student.fullName}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] block truncate font-mono">
                    {student.email}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-xl bg-[var(--background)] group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950 text-[var(--text-tertiary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-center shrink-0 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
