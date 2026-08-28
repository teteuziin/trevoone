import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { getConsultancyAdminOverview } from "@/lib/consultancies/admin";
import { getStudentOnboardingStatus } from "@/lib/consultancies/student-onboarding";
import { getStudentFinancialAccessState } from "@/lib/consultancies/finance";
import {
  getActiveTrainingPlanForStudent,
  listPersonalTrainingPlans,
} from "@/lib/consultancies/training";
import {
  getActiveNutritionPlanForStudent,
  listNutritionPlansForNutritionist,
} from "@/lib/consultancies/nutrition";
import { getStudentOwnProgressHistory } from "@/lib/consultancies/progress";
import { listInfluencerMissions } from "@/lib/consultancies/missions";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { DashboardContext } from "@/components/dashboard/dashboard-context";
import { DashboardStudentView } from "@/components/dashboard/dashboard-student-view";
import { DashboardPersonalView } from "@/components/dashboard/dashboard-personal-view";
import { DashboardNutritionistView } from "@/components/dashboard/dashboard-nutritionist-view";
import { DashboardInfluencerView } from "@/components/dashboard/dashboard-influencer-view";
import { DashboardAdminView } from "@/components/dashboard/dashboard-admin-view";

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

  // Resolve presentation mode state server-side
  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);
  const { effectiveMode } = effectiveState;

  const isStudent = context.roles.includes("STUDENT");
  const isInfluencer = context.roles.includes("INFLUENCER");
  const isPersonal = context.roles.includes("PERSONAL");
  const isNutritionist = context.roles.includes("NUTRITIONIST");
  const isConsultancyAdmin = context.roles.includes("CONSULTANCY_ADMIN");

  // Load real data ONLY when required by the active presentation mode AND authorized by real roles
  const needStudentData = effectiveMode === "STUDENT" && isStudent;
  const needInfluencerData = effectiveMode === "INFLUENCER" && isInfluencer;
  const needPersonalData =
    (effectiveMode === "PERSONAL" && isPersonal) ||
    (effectiveMode === "ADMIN" && isConsultancyAdmin && isPersonal);
  const needNutritionistData =
    (effectiveMode === "NUTRITIONIST" && isNutritionist) ||
    (effectiveMode === "ADMIN" && isConsultancyAdmin && isNutritionist);
  const needAdminData = effectiveMode === "ADMIN" && isConsultancyAdmin;

  const [
    studentOnboarding,
    studentFinancialStatus,
    activeTrainingPlan,
    activeNutritionPlan,
    studentProgress,
    personalPlansResult,
    nutritionPlansResult,
    influencerMissionsResult,
    adminOverview,
  ] = await Promise.all([
    needStudentData ? getStudentOnboardingStatus(session.userId, slug) : Promise.resolve(null),
    needStudentData
      ? getStudentFinancialAccessState({
          consultancyId: context.consultancyId,
          studentMembershipId: context.membershipId,
        })
      : Promise.resolve(null),
    needStudentData || needInfluencerData
      ? getActiveTrainingPlanForStudent(session.userId, slug)
      : Promise.resolve(null),
    needStudentData || needInfluencerData
      ? getActiveNutritionPlanForStudent(session.userId, slug)
      : Promise.resolve(null),
    needStudentData
      ? getStudentOwnProgressHistory({ userId: session.userId, consultancySlug: slug, page: 1 })
      : Promise.resolve(null),
    needPersonalData
      ? listPersonalTrainingPlans({ actorUserId: session.userId, consultancySlug: slug, pageSize: 4 })
      : Promise.resolve(null),
    needNutritionistData
      ? listNutritionPlansForNutritionist({
          actorUserId: session.userId,
          consultancySlug: slug,
          pageSize: 4,
        })
      : Promise.resolve(null),
    needInfluencerData
      ? listInfluencerMissions({
          consultancyId: context.consultancyId,
          membershipId: context.membershipId,
          limit: 4,
        })
      : Promise.resolve(null),
    needAdminData ? getConsultancyAdminOverview(context.consultancyId) : Promise.resolve(null),
  ]);

  if (needStudentData && !isPersonal && !isNutritionist && !isConsultancyAdmin) {
    if (studentFinancialStatus?.isRestricted) {
      redirect(`/consultoria/${slug}/pagamentos/regularizar`);
    }
  }

  const platformAccess = context.platformAccess;
  const isSuspendedOrCanceled = platformAccess && !platformAccess.isOperationalAllowed;

  // Se suspenso/cancelado e usuário não é admin: tela de bloqueio controlada
  if (isSuspendedOrCanceled && !isConsultancyAdmin) {
    return (
      <ConsultancyAppShell
        consultancyName={context.consultancyName}
        consultancySlug={context.consultancySlug}
        consultancyLogoUrl={context.consultancyLogoUrl}
        roles={context.roles}
        userName={session.fullName}
        userEmail={session.email}
        viewModeState={effectiveState}
      >
        <div className="p-8 sm:p-12 max-w-xl mx-auto my-8 bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[var(--warning-soft)] border border-[var(--warning-border)] text-[var(--warning-foreground)] mx-auto flex items-center justify-center text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Consultoria temporariamente indisponível
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            O acesso aos módulos desta consultoria está temporariamente suspenso. Entre em contato com a equipe da consultoria para mais informações.
          </p>
        </div>
      </ConsultancyAppShell>
    );
  }

  const latestProgress = studentProgress?.latestEntry || null;

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      viewModeState={effectiveState}
    >
      <div className="space-y-6 sm:space-y-8">
        {/* Context Header Compacto */}
        <DashboardContext
          userName={session.fullName}
          consultancyName={context.consultancyName}
          roles={context.roles}
        />

        {/* 1. Visão do Aluno (Real ou Preview) */}
        {effectiveMode === "STUDENT" && (
          <DashboardStudentView
            consultancySlug={context.consultancySlug}
            onboarding={studentOnboarding}
            activeTrainingPlan={activeTrainingPlan}
            activeNutritionPlan={activeNutritionPlan}
            latestProgress={latestProgress}
          />
        )}

        {/* 2. Visão do Influenciador / VIP */}
        {effectiveMode === "INFLUENCER" && (
          <DashboardInfluencerView
            consultancySlug={context.consultancySlug}
            missions={influencerMissionsResult?.items || []}
            totalMissions={influencerMissionsResult?.total}
            activeTrainingPlan={activeTrainingPlan}
            activeNutritionPlan={activeNutritionPlan}
          />
        )}

        {/* 3. Visão do Personal Trainer (Real ou Preview) */}
        {effectiveMode === "PERSONAL" && (
          <DashboardPersonalView
            consultancySlug={context.consultancySlug}
            recentPlans={personalPlansResult?.items || []}
            totalPlans={personalPlansResult?.total}
          />
        )}

        {/* 4. Visão do Nutricionista (Real ou Preview) */}
        {effectiveMode === "NUTRITIONIST" && (
          <DashboardNutritionistView
            consultancySlug={context.consultancySlug}
            recentPlans={nutritionPlansResult?.items || []}
            totalPlans={nutritionPlansResult?.total}
          />
        )}

        {/* 5. Visão do Administrador da Consultoria */}
        {effectiveMode === "ADMIN" && (
          <div className="space-y-8">
            <DashboardAdminView
              consultancySlug={context.consultancySlug}
              overview={adminOverview}
              platformAccess={context.platformAccess}
            />

            {isPersonal && (
              <div className="pt-4 border-t border-[var(--border-subtle)] space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Suas Prescrições de Treino (Personal)
                </h3>
                <DashboardPersonalView
                  consultancySlug={context.consultancySlug}
                  recentPlans={personalPlansResult?.items || []}
                  totalPlans={personalPlansResult?.total}
                />
              </div>
            )}

            {isNutritionist && (
              <div className="pt-4 border-t border-[var(--border-subtle)] space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Suas Prescrições Nutricionais (Nutricionista)
                </h3>
                <DashboardNutritionistView
                  consultancySlug={context.consultancySlug}
                  recentPlans={nutritionPlansResult?.items || []}
                  totalPlans={nutritionPlansResult?.total}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
