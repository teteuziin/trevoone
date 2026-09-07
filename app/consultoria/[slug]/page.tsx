import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { getConsultancyAdminOverview } from "@/lib/consultancies/admin";
import { getStudentOnboardingStatus } from "@/lib/consultancies/student-onboarding";
import { getStudentFinancialAccessState } from "@/lib/consultancies/finance";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { listStudentWorkoutCards } from "@/lib/training-v2/assignment-repository";
import { listWorkoutsForProfessional } from "@/lib/training-v2/workout-repository";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { getStudentAuthoritativeNutrition } from "@/lib/nutrition-v2/assignment-repository";
import { listPlansForConsultancy } from "@/lib/nutrition-v2/plan-repository";
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

  // Student Training V2 summary query
  const studentTrainingPromise = needStudentData
    ? (async () => {
        try {
          const tCtx = await resolveTrainingAccessContext(slug);
          if (!tCtx?.isStudent) return null;
          const cards = await listStudentWorkoutCards(tCtx);
          if (cards.length === 0) return null;
          return {
            title: cards[0].workoutTitle,
            subtitle: cards[0].subtitle,
            workoutCount: cards.length,
          };
        } catch {
          return null;
        }
      })()
    : Promise.resolve(null);

  // Student Nutrition V2 summary query
  const studentNutritionPromise = needStudentData
    ? (async () => {
        try {
          const v2Auth = await getStudentAuthoritativeNutrition(session.userId, slug);
          if (!v2Auth.activeAssignment) return null;
          return {
            title: v2Auth.activeAssignment.version.title || v2Auth.activeAssignment.plan.title,
            subtitle: v2Auth.activeAssignment.version.subtitle,
            mealsCount: v2Auth.activeAssignment.meals.length,
            firstMealTime: v2Auth.activeAssignment.meals[0]?.scheduledTime || null,
            meals: v2Auth.activeAssignment.meals.map((m) => ({
              publicId: m.publicId,
              title: m.title,
              scheduledTime: m.scheduledTime,
              itemsCount: m.items.length,
            })),
          };
        } catch {
          return null;
        }
      })()
    : Promise.resolve(null);

  // Personal Workouts V2 query
  const personalWorkoutsPromise = needPersonalData
    ? (async () => {
        try {
          const tCtx = await resolveTrainingAccessContext(slug);
          if (!tCtx || !tCtx.canAuthorTraining) return null;
          const res = await listWorkoutsForProfessional(tCtx, { limit: 4 });
          return {
            total: res.total,
            items: res.items.map((w) => ({
              publicId: w.publicId,
              title: w.title,
              subtitle: w.subtitle,
              status: w.status,
              difficultyLevel: w.difficultyLevel,
              blocksCount: w.blocksCount,
              currentVersionStatus: w.currentVersionStatus,
            })),
          };
        } catch {
          return null;
        }
      })()
    : Promise.resolve(null);

  // Nutrition Plans V2 query
  const nutritionPlansPromise = needNutritionistData
    ? (async () => {
        try {
          const nCtx = await resolveNutritionAccessContext(slug);
          if (!nCtx || !nCtx.canAuthorNutrition) return null;
          const res = await listPlansForConsultancy(nCtx, { pageSize: 4 });
          return {
            total: res.total,
            items: res.items.map((p) => ({
              publicId: p.publicId,
              title: p.currentVersion?.title || "Plano Alimentar",
              studentName: null,
              status: p.status,
              versionNumber: p.currentVersion?.versionNumber,
            })),
          };
        } catch {
          return null;
        }
      })()
    : Promise.resolve(null);

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
    studentTrainingPromise,
    studentNutritionPromise,
    needStudentData
      ? getStudentOwnProgressHistory({ userId: session.userId, consultancySlug: slug, page: 1 })
      : Promise.resolve(null),
    personalWorkoutsPromise,
    nutritionPlansPromise,
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
