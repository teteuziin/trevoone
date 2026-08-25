import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveStudentModuleAccess } from "@/lib/consultancies/student-module-access";
import { getActiveTrainingPlanForStudent } from "@/lib/consultancies/training";
import { StudentModuleAccessPanel } from "@/components/consultancies/student-module-access-panel";
import { StudentTrainingPlan } from "@/components/consultancies/student-training-plan";
import { TrainingOfflineSync } from "@/components/offline/training-offline-sync";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function StudentTreinosPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const access = await resolveStudentModuleAccess(session.userId, slug);

  if (access.reason === "UNAUTHENTICATED") {
    redirect("/login");
  }

  if (access.reason === "INVALID_CONTEXT" || !access.context) {
    redirect("/selecionar-consultoria");
  }

  if (access.reason === "NOT_STUDENT") {
    redirect(`/consultoria/${access.context.consultancySlug}`);
  }

  if (access.reason === "FINANCIALLY_RESTRICTED") {
    redirect(`/consultoria/${access.context.consultancySlug}/pagamentos/regularizar`);
  }

  // Se onboarding incompleto, exibe painel com pendências
  if (!access.allowed) {
    return (
      <ConsultancyAppShell
        consultancyName={access.context.consultancyName}
        consultancySlug={access.context.consultancySlug}
        consultancyLogoUrl={access.context.consultancyLogoUrl}
        roles={access.context.roles}
        userName={session.fullName}
        userEmail={session.email}
      >
        <div className="w-full max-w-2xl mx-auto space-y-6">
          <StudentModuleAccessPanel
            moduleType="TRAINING"
            consultancySlug={access.context.consultancySlug}
            consultancyName={access.context.consultancyName}
            allowed={access.allowed}
            confirmedRequirements={access.confirmedRequirements}
            totalRequirements={access.totalRequirements}
          />
        </div>
      </ConsultancyAppShell>
    );
  }

  // Se autorizado, busca o plano de treino ACTIVE do aluno nesta consultoria
  const activePlan = await getActiveTrainingPlanForStudent(session.userId, slug);

  return (
    <ConsultancyAppShell
      consultancyName={access.context.consultancyName}
      consultancySlug={access.context.consultancySlug}
      consultancyLogoUrl={access.context.consultancyLogoUrl}
      roles={access.context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* Silent Training Offline Auto-Sync Bridge */}
        <TrainingOfflineSync
          userPublicId={session.userPublicId}
          userName={session.fullName}
          consultancyPublicId={access.context.consultancyPublicId}
          consultancyName={access.context.consultancyName}
          consultancySlug={access.context.consultancySlug}
          consultancyLogoUrl={access.context.consultancyLogoUrl}
          plan={activePlan}
        />

        {/* Back Link */}
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${access.context.consultancySlug}`}
            className="inline-flex items-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Voltar ao painel
          </Link>
        </div>

        {/* Estado vazio (quando não há plano ativo liberado) */}
        {!activePlan ? (
          <div className="space-y-6">
            <PageHeader
              title="Seu Treino"
              description="Acompanhe sua prescrição atual, exercícios e orientações do seu Personal."
            />
            <EmptyState
              title="Seu treino ainda não foi disponibilizado"
              description="Assim que seu Personal Trainer liberar e ativar sua nova ficha de treino, ela aparecerá aqui com todos os exercícios, vídeos e orientações."
            />
          </div>
        ) : (
          <StudentTrainingPlan
            consultancySlug={access.context.consultancySlug}
            consultancyName={access.context.consultancyName}
            consultancyLogoUrl={access.context.consultancyLogoUrl}
            plan={activePlan}
          />
        )}
      </div>
    </ConsultancyAppShell>
  );
}
