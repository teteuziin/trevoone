import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { listProfessionalStudentsForProgress } from "@/lib/consultancies/progress";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

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
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Evolução dos Alunos"
          description="Selecione um aluno para acompanhar o histórico de medições corporais."
          backHref={`/consultoria/${slug}`}
          backLabel="Voltar à visão geral"
        />

        {/* Students List */}
        {students.length === 0 ? (
          <EmptyState
            title="Nenhum aluno ativo encontrado"
            description="Quando houver alunos vinculados e ativos na consultoria, eles aparecerão aqui."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student) => (
              <Link
                key={student.publicId}
                href={`/consultoria/${slug}/progresso/alunos/${student.publicId}`}
                className="group p-5 rounded-2xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] hover:border-[var(--brand)] shadow-xs transition-all flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
              >
                <div className="space-y-1 min-w-0">
                  <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-foreground)] transition-colors block truncate">
                    {student.fullName}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] block truncate font-mono">
                    {student.email}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-xl bg-[var(--surface-sunken)] group-hover:bg-[var(--brand-surface)] text-[var(--text-tertiary)] group-hover:text-[var(--brand-foreground)] flex items-center justify-center shrink-0 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
