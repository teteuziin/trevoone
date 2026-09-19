import React from "react";
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
  const isConsultancyAdmin = context.roles.includes("CONSULTANCY_ADMIN");

  if (!isPersonal && !isNutritionist && !isConsultancyAdmin) {
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
      <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
        {/* Page Header */}
        <PageHeader
          eyebrow="Acompanhamento"
          title="Evolução dos Alunos"
          description="Selecione um aluno para acompanhar o histórico de medições corporais e avaliações físicas."
          backHref={`/consultoria/${slug}`}
          backLabel="Visão geral"
        />

        {/* Students List */}
        {students.length === 0 ? (
          <EmptyState
            title="Nenhum aluno ativo encontrado"
            description="Quando houver alunos vinculados e ativos na consultoria, eles aparecerão aqui."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {students.map((student) => {
              const initial = student.fullName?.charAt(0).toUpperCase() || "A";
              return (
                <Link
                  key={student.publicId}
                  href={`/consultoria/${slug}/progresso/alunos/${student.publicId}`}
                  className="group p-4 sm:p-4.5 rounded-2xl sm:rounded-3xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] hover:border-[var(--border-strong)] shadow-xs hover:shadow-sm transition-all flex items-center justify-between gap-3.5 focus-visible:outline-2 focus-visible:outline-[var(--brand)] depth-surface depth-interactive min-h-[56px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] font-bold text-xs shrink-0 shadow-2xs group-hover:border-[var(--brand)] transition-colors">
                      {initial}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors block truncate">
                        {student.fullName}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] block truncate font-mono">
                        {student.email}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-xs font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all flex items-center gap-1">
                    <span className="hidden sm:inline">Histórico</span>
                    <span>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
