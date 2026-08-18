import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import {
  resolveConsultancyContext,
  ROLE_LABELS,
} from "@/lib/consultancies/context";
import { getConsultancyAdminOverview } from "@/lib/consultancies/admin";
import { getStudentOnboardingStatus } from "@/lib/consultancies/student-onboarding";
import { getStudentFinancialAccessState } from "@/lib/consultancies/finance";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ConsultancyPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const isStudent = context.roles.includes("STUDENT");
  const isPersonal = context.roles.includes("PERSONAL");
  const isNutritionist = context.roles.includes("NUTRITIONIST");
  const isConsultancyAdmin = context.roles.includes("CONSULTANCY_ADMIN");

  // Dados existentes resolvidos condicionalmente sem novas queries
  const [studentOnboarding, adminOverview, studentFinancialStatus] = await Promise.all([
    isStudent ? getStudentOnboardingStatus(session.userId, slug) : Promise.resolve(null),
    isConsultancyAdmin ? getConsultancyAdminOverview(context.consultancyId) : Promise.resolve(null),
    isStudent
      ? getStudentFinancialAccessState({
          consultancyId: context.consultancyId,
          studentMembershipId: context.membershipId,
        })
      : Promise.resolve(null),
  ]);

  if (isStudent && !isPersonal && !isNutritionist && !isConsultancyAdmin) {
    if (studentFinancialStatus?.isRestricted) {
      redirect(`/consultoria/${slug}/pagamentos/regularizar`);
    }
  }

  const hasIncompleteOnboarding =
    isStudent &&
    studentOnboarding &&
    studentOnboarding.applicable &&
    !studentOnboarding.isComplete;

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="space-y-8">
        {/* Header Principal */}
        <PageHeader
          title="Visão geral"
          description={`Ambiente integrado da consultoria ${context.consultancyName}. Acesse seus recursos e acompanhamentos.`}
          actions={
            <div className="flex flex-wrap gap-1.5">
              {context.roles.map((role) => (
                <Badge key={role} variant="brand" size="sm">
                  {ROLE_LABELS[role] || role}
                </Badge>
              ))}
            </div>
          }
        />

        {/* 1. Bloco Prioritário: Onboarding Pendente para Aluno */}
        {hasIncompleteOnboarding && (
          <div className="p-5 sm:p-6 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" size="sm">
                    Etapa Obrigatória
                  </Badge>
                  <span className="text-xs font-medium text-[var(--warning-foreground)]">
                    {studentOnboarding.confirmedRequirements} de {studentOnboarding.totalRequirements} etapas confirmadas
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Complete seu cadastro inicial
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Conclua os formulários obrigatórios de onboarding para liberar o acesso aos módulos da sua consultoria.
                </p>
              </div>

              <div className="shrink-0 pt-1 sm:pt-0">
                <Link
                  href={`/consultoria/${context.consultancySlug}/onboarding`}
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-[var(--brand-strong)] hover:bg-[var(--brand)] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors focus-visible:outline-[var(--brand)]"
                >
                  Continuar onboarding
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 2. Seção: Seu Acompanhamento (Aluno) */}
        {isStudent && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                Seu acompanhamento
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Acesse suas rotinas prescritas de treino e acompanhamento da consultoria.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Treinos */}
              <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4 hover:border-[var(--border-strong)] transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                      Treinos
                    </h3>
                    <Badge
                      variant={studentOnboarding?.isComplete ? "success" : "neutral"}
                      size="sm"
                    >
                      {studentOnboarding?.isComplete ? "Liberado" : "Pendente"}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {studentOnboarding?.isComplete
                      ? "Acesse suas fichas ativas de treino, vídeos dos exercícios e orientações."
                      : "Conclua o onboarding para liberar sua ficha de treino prescrita."}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <Link
                    href={`/consultoria/${context.consultancySlug}/treinos`}
                    className="inline-flex items-center justify-center w-full py-2 px-3 bg-[var(--surface-hover)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-foreground)] text-[var(--text-primary)] text-xs font-semibold rounded-lg border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
                  >
                    {studentOnboarding?.isComplete ? "Acessar treinos" : "Ver módulo"}
                  </Link>
                </div>
              </div>

              {/* Card Nutrição */}
              <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4 hover:border-[var(--border-strong)] transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                      Nutrição
                    </h3>
                    <Badge
                      variant={studentOnboarding?.isComplete ? "success" : "neutral"}
                      size="sm"
                    >
                      {studentOnboarding?.isComplete ? "Liberado" : "Pendente"}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {studentOnboarding?.isComplete
                      ? "Acesse o espaço de nutrição e acompanhamentos da sua consultoria."
                      : "Conclua o onboarding para liberar o acesso ao módulo de nutrição."}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <Link
                    href={`/consultoria/${context.consultancySlug}/nutricao`}
                    className="inline-flex items-center justify-center w-full py-2 px-3 bg-[var(--surface-hover)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-foreground)] text-[var(--text-primary)] text-xs font-semibold rounded-lg border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
                  >
                    {studentOnboarding?.isComplete ? "Acessar nutrição" : "Ver módulo"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Seção: Área Profissional (Personal / Nutricionista) */}
        {(isPersonal || isNutritionist) && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                Área profissional
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Ferramentas de prescrição e acompanhamento para profissionais da consultoria.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isPersonal && (
                <>
                  {/* Card Planos de Treino */}
                  <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4 hover:border-[var(--border-strong)] transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                          Planos de Treino
                        </h3>
                        <Badge variant="brand" size="sm">
                          Personal
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                        Crie e gerencie prescrições de treino personalizadas para seus alunos vinculados.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)]">
                      <Link
                        href={`/consultoria/${context.consultancySlug}/personal/treinos`}
                        className="inline-flex items-center justify-center w-full py-2 px-3 bg-[var(--brand-strong)] hover:bg-[var(--brand)] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors focus-visible:outline-[var(--brand)]"
                      >
                        Gerenciar planos
                      </Link>
                    </div>
                  </div>

                  {/* Card Biblioteca de Exercícios */}
                  <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4 hover:border-[var(--border-strong)] transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                          Biblioteca de Exercícios
                        </h3>
                        <Badge variant="neutral" size="sm">
                          Catálogo
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                        Consulte o catálogo de exercícios, vídeos de execução e instruções de movimento.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)]">
                      <Link
                        href={`/consultoria/${context.consultancySlug}/personal/exercicios`}
                        className="inline-flex items-center justify-center w-full py-2 px-3 bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text-primary)] text-xs font-semibold rounded-lg border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
                      >
                        Acessar exercícios
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {isNutritionist && !isPersonal && (
                <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-2 col-span-full">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                      Prescrição Nutricional
                    </h3>
                    <Badge variant="brand" size="sm">
                      Nutricionista
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    As ferramentas de prescrição e acompanhamento dietético estão vinculadas ao seu papel profissional nesta consultoria.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Seção: Gestão da Consultoria (Admin) */}
        {isConsultancyAdmin && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                Gestão da consultoria
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                Estrutura de membros e administração de acessos da consultoria.
              </p>
            </div>

            {/* Resumo de métricas reais se disponível */}
            {adminOverview && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-1">
                  <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Total Membros
                  </p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {adminOverview.activeMembers}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-1">
                  <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Alunos
                  </p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {adminOverview.students}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-1">
                  <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Personais
                  </p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {adminOverview.personals}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-1">
                  <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Nutricionistas
                  </p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {adminOverview.nutritionists}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-1 col-span-2 sm:col-span-1">
                  <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Administradores
                  </p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                    {adminOverview.admins}
                  </p>
                </div>
              </div>
            )}

            {/* Ação de Gestão de Membros */}
            <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  Membros e Convites
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  Consulte, convide e gerencie todos os alunos, profissionais e gestores vinculados a esta consultoria.
                </p>
              </div>
              <Link
                href={`/consultoria/${context.consultancySlug}/membros`}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-[var(--brand-strong)] hover:bg-[var(--brand)] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0 focus-visible:outline-[var(--brand)]"
              >
                Gerenciar membros
              </Link>
            </div>
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
