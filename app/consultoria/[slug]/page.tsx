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
import {
  getStudentAuthoritativeNutrition,
  listEligibleStudentsForNutrition,
} from "@/lib/nutrition-v2/assignment-repository";
import { listPlansForConsultancy } from "@/lib/nutrition-v2/plan-repository";
import {
  listUpcomingConsultationsForProfessional,
  CONSULTATION_STATUS_LABELS,
} from "@/lib/consultancies/consultations";
import { getConsultancyLocalDate } from "@/lib/consultancies/timezone";
import { getStudentOwnProgressHistory } from "@/lib/consultancies/progress";
import { getStudentPhotoEvaluationsData } from "@/lib/consultancies/photo-evaluations";
import { listInfluencerMissions } from "@/lib/consultancies/missions";
import { getReferrerDashboardData } from "@/lib/referrals/service";
import { listPersonalStudents } from "@/lib/consultancies/personal-student-hub";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { listUnreadAnnouncementsForUser } from "@/lib/consultancies/announcements";
import { DashboardContext } from "@/components/dashboard/dashboard-context";
import { DashboardStudentView } from "@/components/dashboard/dashboard-student-view";
import { StudentPendingRequestsInbox } from "@/components/consultancies/student/student-pending-requests-inbox";
import { listStudentPendingRequests } from "@/lib/consultancies/student-requests";
import { getTodayCheckin } from "@/lib/checkins/service";
import { getPendingCheckinForStudent } from "@/lib/nutrition-v2/checkin-repository";
import { trackMemberActivity } from "@/lib/monitoring/activity-tracker";
import { DashboardPersonalView } from "@/components/dashboard/dashboard-personal-view";
import { DashboardNutritionistView } from "@/components/dashboard/dashboard-nutritionist-view";
import {
  isPlanActive,
  isPlanDraft,
  getPlanCanonicalStatus,
} from "@/lib/nutrition-v2/plan-classification";
import { DashboardInfluencerView } from "@/components/dashboard/dashboard-influencer-view";
import { DashboardAdminView } from "@/components/dashboard/dashboard-admin-view";
import { DashboardCombinedPersonalAdminView } from "@/components/dashboard/dashboard-combined-personal-admin-view";
import { DashboardCombinedNutritionistAdminView } from "@/components/dashboard/dashboard-combined-nutritionist-admin-view";
import { DashboardCombinedStudentVipView } from "@/components/dashboard/dashboard-combined-student-vip-view";

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

  if (context.membershipId) {
    trackMemberActivity(context.consultancyId, context.membershipId).catch(() => {});
  }

  // Resolve presentation mode state server-side
  const effectiveState = await resolveEffectiveViewMode(slug, context.roles);
  const unreadAnnouncements = await listUnreadAnnouncementsForUser(session.userId, context.consultancyId);
  const { effectiveMode } = effectiveState;

  const roles = Array.isArray(context.roles) ? context.roles : [];
  const isStudent = roles.includes("STUDENT");
  const isInfluencer = roles.includes("INFLUENCER");
  const isPersonal = roles.includes("PERSONAL");
  const isNutritionist = roles.includes("NUTRITIONIST");
  const isConsultancyAdmin = roles.includes("CONSULTANCY_ADMIN");

  // MULTI-ROLE UNIFIED EXPERIENCE: Load real data for all active roles held by the user
  const isMultiRolePersonalAdmin = isPersonal && isConsultancyAdmin && !effectiveState.isPreview;
  const isCombinedPersonalAdmin = isMultiRolePersonalAdmin;
  const isPurePersonal =
    (effectiveMode === "PERSONAL" && !isConsultancyAdmin) ||
    (effectiveState.isPreview && effectiveMode === "PERSONAL");
  const isMultiRoleNutritionistAdmin = isNutritionist && isConsultancyAdmin && !effectiveState.isPreview;
  const isCombinedNutritionistAdmin = isMultiRoleNutritionistAdmin && !isPersonal;
  const isPureNutritionist =
    (effectiveMode === "NUTRITIONIST" && !isConsultancyAdmin) ||
    (effectiveState.isPreview && effectiveMode === "NUTRITIONIST");
  const isMultiRoleStudentInfluencer = isStudent && isInfluencer && !effectiveState.isPreview;

  const needStudentData =
    (effectiveMode === "STUDENT" || isMultiRoleStudentInfluencer) && isStudent;
  const needInfluencerData = (effectiveMode === "INFLUENCER" || isMultiRoleStudentInfluencer) && isInfluencer;
  const needPersonalData =
    (effectiveMode === "PERSONAL" || isMultiRolePersonalAdmin) && isPersonal;
  const needNutritionistData =
    (effectiveMode === "NUTRITIONIST" || isMultiRoleNutritionistAdmin) && isNutritionist;
  const needAdminData = (effectiveMode === "ADMIN" || isMultiRolePersonalAdmin || isMultiRoleNutritionistAdmin) && isConsultancyAdmin;

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
            blockCount: cards[0].blockCount,
            workouts: cards.map((c) => ({
              publicId: c.assignmentPublicId,
              title: c.workoutTitle,
              subtitle: c.subtitle,
              blockCount: c.blockCount,
              estimatedDurationMinutes: c.estimatedDurationMinutes,
              difficultyLevel: c.difficultyLevel,
            })),
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
          const tz = context.consultancyTimezone || "America/Sao_Paulo";
          const todayDateStr = getConsultancyLocalDate(tz, new Date());

          const [res, personalStudents, upcomingConsultations] = await Promise.all([
            listWorkoutsForProfessional(tCtx, { limit: 50 }),
            listPersonalStudents({ consultancyId: context.consultancyId }).catch(() => null),
            context.membershipId
              ? listUpcomingConsultationsForProfessional(context.consultancyId, context.membershipId, 50).catch(() => null)
              : Promise.resolve(null),
          ]);

          const todayConsultations = upcomingConsultations
            ? upcomingConsultations
                .filter((c) => {
                  const itemDateStr = getConsultancyLocalDate(tz, c.scheduledStartAt);
                  return itemDateStr === todayDateStr;
                })
                .map((c) => ({
                  publicId: c.publicId,
                  studentName: c.counterpartName,
                  timeFormatted: new Intl.DateTimeFormat("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: tz,
                  }).format(c.scheduledStartAt),
                  type: c.title || "Consulta por vídeo",
                  status: c.status,
                  scheduledStartAt: c.scheduledStartAt.toISOString(),
                  scheduledEndAt: c.scheduledEndAt.toISOString(),
                  href: `/consultoria/${slug}/consultas`,
                }))
            : [];

          const studentsWithoutWorkout = personalStudents
            ? personalStudents
                .filter((s) => !s.latestWorkoutTitle || s.latestAssignmentStatus !== "ACTIVE")
                .map((s) => ({
                  membershipPublicId: s.membershipPublicId,
                  userPublicId: s.userPublicId,
                  name: s.name,
                  email: s.email,
                  joinedAt: s.joinedAt,
                }))
            : [];

          const prescribedBlocksCount = (res.items || []).reduce(
            (acc, w) => acc + (w.blocksCount || 0),
            0
          );

          return {
            total: res.total,
            totalStudents: personalStudents ? personalStudents.length : null,
            prescribedBlocksCount,
            todayConsultations,
            studentsWithoutWorkout,
            items: res.items.map((w) => ({
              publicId: w.publicId,
              title: w.title,
              subtitle: w.subtitle,
              status: w.status,
              difficultyLevel: w.difficultyLevel,
              blocksCount: w.blocksCount,
              currentVersionStatus: w.currentVersionStatus,
              assignedStudentName: w.assignedStudentName || null,
              activeAssignmentsCount: w.activeAssignmentsCount || 0,
              isTemplate: Boolean(w.isTemplate),
              updatedAt: w.updatedAt ? w.updatedAt.toISOString() : null,
              hasActiveDraft: Boolean(w.hasActiveDraft),
              draftVersionNumber: w.draftVersionNumber ?? null,
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
          const res = await listPlansForConsultancy(nCtx, { pageSize: 50 });
          return {
            total: res.total,
            items: res.items.map((p) => ({
              publicId: p.publicId,
              title: p.currentVersion?.title || "Plano alimentar",
              studentName: p.assignedStudentName || null,
              subtitle: p.currentVersion?.subtitle || null,
              status: p.currentVersion?.status || p.status,
              planLifecycleStatus: p.status,
              currentVersionStatus: p.currentVersion?.status,
              hasDraftRevision: isPlanActive(p) && p.currentVersion?.status === "DRAFT",
              activeAssignmentsCount: p.activeAssignmentsCount,
              versionNumber: p.currentVersion?.versionNumber,
              updatedAt: p.updatedAt,
              mealsCount: p.mealsCount,
            })),
          };
        } catch {
          return null;
        }
      })()
    : Promise.resolve(null);

  // Nutritionist Cockpit Data (consultas de hoje, próxima consulta e alunos para atenção)
  const nutritionistCockpitPromise = needNutritionistData
    ? (async () => {
        try {
          const nCtx = await resolveNutritionAccessContext(slug);
          const tz = context.consultancyTimezone || "America/Sao_Paulo";
          const todayDateStr = getConsultancyLocalDate(tz, new Date());

          // Sem .catch(() => []) mascarador: falha em query crítica rejeita o bloco e vira null ("—")
          const [upcomingConsultations, personalStudentsList, eligibleStudents] = await Promise.all([
            context.membershipId
              ? listUpcomingConsultationsForProfessional(context.consultancyId, context.membershipId, 50)
              : Promise.resolve(null),
            listPersonalStudents({ consultancyId: context.consultancyId }),
            nCtx && nCtx.canAuthorNutrition
              ? listEligibleStudentsForNutrition(nCtx, undefined, 50)
              : Promise.resolve(null),
          ]);

          const todayConsultations = upcomingConsultations
            ? upcomingConsultations
                .filter((c) => {
                  const itemDateStr = getConsultancyLocalDate(tz, c.scheduledStartAt);
                  return itemDateStr === todayDateStr;
                })
                .map((c) => ({
                  publicId: c.publicId,
                  patientName: c.counterpartName,
                  timeFormatted: new Intl.DateTimeFormat("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: tz,
                  }).format(c.scheduledStartAt),
                  status: c.status,
                  statusLabel: CONSULTATION_STATUS_LABELS[c.status] || "Agendada",
                  canJoinNow: c.canJoinNow,
                  href: `/consultoria/${slug}/consultas`,
                }))
            : null;

          // eslint-disable-next-line react-hooks/purity
          const nowMs = Date.now();
          const nextConsultationItem = upcomingConsultations
            ? upcomingConsultations.find((c) => {
                return (
                  (c.status === "IN_PROGRESS" || c.status === "SCHEDULED") &&
                  c.scheduledEndAt.getTime() >= nowMs
                );
              })
            : null;

          const nextConsultation = nextConsultationItem
            ? {
                publicId: nextConsultationItem.publicId,
                patientName: nextConsultationItem.counterpartName,
                timeFormatted: (() => {
                  const itemDateStr = getConsultancyLocalDate(tz, nextConsultationItem.scheduledStartAt);
                  const timeStr = new Intl.DateTimeFormat("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: tz,
                  }).format(nextConsultationItem.scheduledStartAt);
                  if (itemDateStr === todayDateStr) {
                    return `hoje ${timeStr}`;
                  }
                  const dateStr = new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    timeZone: tz,
                  }).format(nextConsultationItem.scheduledStartAt);
                  return `${dateStr} ${timeStr}`;
                })(),
                status: nextConsultationItem.status,
                statusLabel: CONSULTATION_STATUS_LABELS[nextConsultationItem.status] || "Agendada",
                canJoinNow: nextConsultationItem.canJoinNow,
                href: `/consultoria/${slug}/consultas`,
              }
            : null;

          const studentsWithoutPlan = eligibleStudents
            ? eligibleStudents
                .filter((s) => !s.activeAssignment)
                .slice(0, 5)
                .map((s) => ({
                  id: `no-plan-${s.membershipPublicId}`,
                  patientName: s.studentName,
                  reason: "Paciente sem plano alimentar ativo",
                  actionLabel: "Criar plano",
                  actionHref: `/consultoria/${slug}/planos-v2/novo?studentId=${s.membershipPublicId}`,
                  severity: "warning" as const,
                }))
            : null;

          const totalActivePatients = personalStudentsList ? personalStudentsList.length : null;

          return {
            todayConsultations,
            nextConsultation,
            totalActivePatients,
            studentsWithoutPlan,
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
    studentPhotoEvaluations,
    personalPlansResult,
    nutritionPlansResult,
    influencerMissionsResult,
    adminOverview,
    studentPendingRequests,
    todayCheckin,
    pendingNutritionCheckin,
    referrerData,
    nutritionistCockpitResult,
  ] = await Promise.all([
    needStudentData && (effectiveMode === "STUDENT" || isMultiRoleStudentInfluencer) ? getStudentOnboardingStatus(session.userId, slug).catch(() => null) : Promise.resolve(null),
    needStudentData && (effectiveMode === "STUDENT" || isMultiRoleStudentInfluencer)
      ? getStudentFinancialAccessState({
          consultancyId: context.consultancyId,
          studentMembershipId: context.membershipId,
        }).catch(() => null)
      : Promise.resolve(null),
    studentTrainingPromise,
    studentNutritionPromise,
    needStudentData
      ? getStudentOwnProgressHistory({ userId: session.userId, consultancySlug: slug, page: 1 }).catch(() => null)
      : Promise.resolve(null),
    needStudentData && (effectiveMode === "STUDENT" || isMultiRoleStudentInfluencer)
      ? getStudentPhotoEvaluationsData({ userId: session.userId, consultancySlug: slug }).catch(() => null)
      : Promise.resolve(null),
    personalWorkoutsPromise,
    nutritionPlansPromise,
    needInfluencerData && context.membershipId
      ? listInfluencerMissions({
          consultancyId: context.consultancyId,
          membershipId: context.membershipId,
          limit: 4,
        }).catch(() => null)
      : Promise.resolve(null),
    needAdminData ? getConsultancyAdminOverview(context.consultancyId).catch(() => null) : Promise.resolve(null),
    needStudentData && effectiveMode === "STUDENT"
      ? listStudentPendingRequests(context.consultancyId, session.userId, context.consultancySlug).catch(() => [])
      : Promise.resolve([]),
    needStudentData && context.membershipId
      ? getTodayCheckin(context.consultancyId, context.membershipId).catch(() => null)
      : Promise.resolve(null),
    needStudentData && context.membershipId
      ? getPendingCheckinForStudent(context.consultancyId, context.membershipId).catch(() => null)
      : Promise.resolve(null),
    needInfluencerData && context.membershipId
      ? getReferrerDashboardData(context.consultancyId, context.membershipId).catch(() => null)
      : Promise.resolve(null),
    nutritionistCockpitPromise,
  ]);

  // Derived metrics for Nutritionist cockpit
  // Não truncar sobre pageSize: só calcula se todos os planos da consultoria couberam na página (total <= items.length)
  const isPlansFullyLoaded =
    nutritionPlansResult !== null && nutritionPlansResult.total <= nutritionPlansResult.items.length;

  const nutritionistActivePlansCount = isPlansFullyLoaded
    ? (nutritionPlansResult?.items || []).filter(isPlanActive).length
    : null;

  // Em "Rascunhos" só conta plano novo nunca publicado (excluindo ativos e encerrados/arquivados)
  const nutritionistDraftPlansCount = isPlansFullyLoaded
    ? (nutritionPlansResult?.items || []).filter(isPlanDraft).length
    : null;

  const nutritionistDraftPlans = (nutritionPlansResult?.items || []).filter((p) => {
    const lc = p.planLifecycleStatus || p.status;
    if (lc === "ENDED" || lc === "ARCHIVED") return false;
    return (
      isPlanDraft(p) ||
      p.hasDraftRevision ||
      (isPlanActive(p) && p.currentVersionStatus === "DRAFT")
    );
  });
  const nutritionistDraftAttentionItems = nutritionistDraftPlans.slice(0, 5).map((p) => {
    const canonical = getPlanCanonicalStatus(p);
    const reason = isPlanActive(p)
      ? canonical.subLabel || `Nova versão em rascunho (V${p.versionNumber || 2})`
      : `Rascunho não publicado${p.versionNumber ? ` (V${p.versionNumber})` : ""}`;
    return {
      id: `draft-${p.publicId}`,
      patientName: p.studentName || "Plano individual",
      reason,
      actionLabel: "Continuar edição",
      actionHref: `/consultoria/${slug}/planos-v2/${p.publicId}`,
      severity: "warning" as const,
    };
  });
  const nutritionistAttentionItems =
    nutritionistCockpitResult !== null
      ? [
          ...nutritionistDraftAttentionItems,
          ...(nutritionistCockpitResult.studentsWithoutPlan || []),
        ].slice(0, 5)
      : null;
  const nutritionistActivePatientsCount =
    nutritionistCockpitResult?.totalActivePatients ?? null;

  const hasPendingPhotoEvaluation = !!(
    studentPhotoEvaluations?.activeRequest &&
    (studentPhotoEvaluations.activeRequest.status === "PENDING" ||
      studentPhotoEvaluations.activeRequest.status === "CHANGES_REQUESTED")
  );

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
        userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
        consultancyPublicId={context.consultancyPublicId}
        viewModeState={effectiveState}
      unreadAnnouncements={unreadAnnouncements}
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
  const previousProgress =
    studentProgress?.entries && studentProgress.entries.length >= 2
      ? studentProgress.entries[1]
      : null;

  const isDarkOverviewTheme = Boolean(
    isPurePersonal ||
      isCombinedPersonalAdmin ||
      isCombinedNutritionistAdmin ||
      (effectiveMode === "ADMIN" && !isPersonal && !isNutritionist) ||
      (effectiveState.isPreview && (effectiveMode === "PERSONAL" || effectiveMode === "ADMIN" || effectiveMode === "NUTRITIONIST"))
  );

  const isTrainerOrAdminScreen = Boolean(
    isPurePersonal ||
      isCombinedPersonalAdmin ||
      (effectiveMode === "ADMIN" && !isPersonal && !isNutritionist) ||
      (effectiveState.isPreview && (effectiveMode === "PERSONAL" || effectiveMode === "ADMIN"))
  );

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={context.consultancyPublicId}
      viewModeState={effectiveState}
      unreadAnnouncements={unreadAnnouncements}
      themeVariant={isDarkOverviewTheme ? "dark-overview" : "default"}
      showDashboardWallpaper={isTrainerOrAdminScreen}
      maxWidth="full"
    >
      <div className="w-full max-w-[1280px] mx-auto space-y-5 sm:space-y-6">
        {/* Context Header Compacto (oculta para Nutricionista e Personal que possuem cabeçalho unificado próprio) */}
        {!(isPureNutritionist || isCombinedNutritionistAdmin || isPurePersonal || isCombinedPersonalAdmin) && (
          <DashboardContext
            userName={session.fullName}
            consultancyName={context.consultancyName}
            roles={context.roles}
            hideRoleBadges={false}
          />
        )}

        {/* 1. Visão Combinada Personal + Admin (quando possui ambos os papéis e não está em preview manual) */}
        {isCombinedPersonalAdmin && (
          <DashboardCombinedPersonalAdminView
            consultancySlug={context.consultancySlug}
            consultancyName={context.consultancyName}
            userName={session.fullName}
            overview={adminOverview}
            platformAccess={context.platformAccess}
            recentPlans={personalPlansResult?.items || []}
            workouts={personalPlansResult?.items || []}
            totalPlans={personalPlansResult?.total}
            totalWorkouts={personalPlansResult?.total}
            totalStudents={personalPlansResult?.totalStudents ?? adminOverview?.students}
            prescribedBlocksCount={personalPlansResult?.prescribedBlocksCount}
            studentsWithoutWorkout={personalPlansResult?.studentsWithoutWorkout || []}
            todayConsultations={personalPlansResult?.todayConsultations ?? null}
            activeRoleMode={effectiveMode}
          />
        )}

        {/* 2. Visão Combinada Nutricionista + Admin (quando possui ambos os papéis e não está em preview manual) */}
        {isCombinedNutritionistAdmin && (
          <DashboardCombinedNutritionistAdminView
            consultancySlug={context.consultancySlug}
            consultancyName={context.consultancyName}
            userName={session.fullName}
            timezone={context.consultancyTimezone || "America/Sao_Paulo"}
            overview={adminOverview}
            platformAccess={context.platformAccess}
            recentPlans={nutritionPlansResult?.items || []}
            totalPlans={nutritionPlansResult?.total}
            activePlansCount={nutritionistActivePlansCount}
            draftPlansCount={nutritionistDraftPlansCount}
            totalStudents={nutritionistActivePatientsCount}
            todayConsultations={nutritionistCockpitResult?.todayConsultations ?? null}
            nextConsultation={nutritionistCockpitResult?.nextConsultation || null}
            attentionItems={nutritionistAttentionItems}
          />
        )}

        {/* 3. Visão Combinada Aluno + Influenciador/VIP (STUDENT FIRST) */}
        {!effectiveState.isPreview && isStudent && isInfluencer && !isPersonal && !isConsultancyAdmin && !isNutritionist && (
          <>
            <StudentPendingRequestsInbox requests={studentPendingRequests || []} />
            <DashboardCombinedStudentVipView
              consultancySlug={context.consultancySlug}
              consultancyName={context.consultancyName}
              userName={session.fullName}
              onboarding={studentOnboarding}
              activeTrainingPlan={activeTrainingPlan}
              activeNutritionPlan={activeNutritionPlan}
              latestProgress={latestProgress}
              previousProgress={previousProgress}
              pendingPhotoEvaluation={hasPendingPhotoEvaluation}
              todayCheckin={todayCheckin}
              missions={influencerMissionsResult?.items || []}
              totalMissions={influencerMissionsResult?.total || 0}
              referrerData={referrerData}
              pendingNutritionCheckin={pendingNutritionCheckin}
            />
          </>
        )}

        {/* 4. Visão do Influenciador / VIP Puro (ou Preview Manual) */}
        {((!effectiveState.isPreview && isInfluencer && !isStudent && !isPersonal && !isConsultancyAdmin && !isNutritionist) || (effectiveState.isPreview && effectiveMode === "INFLUENCER")) && (
          <DashboardInfluencerView
            consultancySlug={context.consultancySlug}
            userName={session.fullName}
            isStudent={false}
            todayCheckin={todayCheckin}
            missions={influencerMissionsResult?.items || []}
            totalMissions={influencerMissionsResult?.total || 0}
            referrerData={referrerData}
            activeTrainingPlan={activeTrainingPlan}
            activeNutritionPlan={activeNutritionPlan}
          />
        )}

        {/* 4. Visão do Personal Trainer (Puro ou Preview) */}
        {isPurePersonal && (
          <DashboardPersonalView
            consultancySlug={context.consultancySlug}
            consultancyName={context.consultancyName}
            userName={session.fullName}
            recentPlans={personalPlansResult?.items || []}
            workouts={personalPlansResult?.items || []}
            totalPlans={personalPlansResult?.total}
            totalWorkouts={personalPlansResult?.total}
            totalStudents={personalPlansResult?.totalStudents ?? adminOverview?.students}
            prescribedBlocksCount={personalPlansResult?.prescribedBlocksCount}
            studentsWithoutWorkout={personalPlansResult?.studentsWithoutWorkout || []}
            todayConsultations={personalPlansResult?.todayConsultations ?? null}
          />
        )}

        {/* 5. Visão do Nutricionista (Puro ou Preview) */}
        {isPureNutritionist && (
          <DashboardNutritionistView
            consultancySlug={context.consultancySlug}
            userName={session.fullName}
            timezone={context.consultancyTimezone || "America/Sao_Paulo"}
            recentPlans={nutritionPlansResult?.items || []}
            totalPlans={nutritionPlansResult?.total}
            activePlansCount={nutritionistActivePlansCount}
            draftPlansCount={nutritionistDraftPlansCount}
            totalStudents={nutritionistActivePatientsCount}
            todayConsultations={nutritionistCockpitResult?.todayConsultations ?? null}
            nextConsultation={nutritionistCockpitResult?.nextConsultation || null}
            attentionItems={nutritionistAttentionItems}
          />
        )}

        {/* 6. Visão do Administrador da Consultoria (Puro ou Preview) */}
        {((effectiveMode === "ADMIN" && !isPersonal && !isNutritionist) || (effectiveState.isPreview && effectiveMode === "ADMIN")) && (
          <DashboardAdminView
            consultancySlug={context.consultancySlug}
            consultancyName={context.consultancyName}
            consultancyLogoUrl={context.consultancyLogoUrl}
            overview={adminOverview}
            platformAccess={context.platformAccess}
          />
        )}

        {/* 7. Visão do Aluno (Puro ou Preview) */}
        {((effectiveMode === "STUDENT" && !isInfluencer) || (effectiveState.isPreview && effectiveMode === "STUDENT")) && (
          <>
            <StudentPendingRequestsInbox requests={studentPendingRequests || []} />
            <DashboardStudentView
              consultancySlug={context.consultancySlug}
              consultancyName={context.consultancyName}
              userName={session.fullName}
              onboarding={studentOnboarding}
              activeTrainingPlan={activeTrainingPlan}
              activeNutritionPlan={activeNutritionPlan}
              latestProgress={latestProgress}
              previousProgress={previousProgress}
              pendingPhotoEvaluation={hasPendingPhotoEvaluation}
              todayCheckin={todayCheckin}
              pendingNutritionCheckin={pendingNutritionCheckin}
            />
          </>
        )}
      </div>
    </ConsultancyAppShell>
  );
}
