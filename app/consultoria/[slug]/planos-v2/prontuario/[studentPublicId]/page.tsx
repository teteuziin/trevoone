import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import { getPatientRecordDetailAction } from "../../patient-actions";
import { getPatientPlanningAction } from "../../planning-actions";
import { getPatientPlanState } from "@/lib/nutrition-v2/patient-plan-lifecycle";
import {
  getStudentEvolutionHubData,
  getEvolutionComparisonBetweenDates,
} from "@/lib/consultancies/evolution";
import { PatientRecordView } from "@/components/consultancies/nutrition-v2/patient-record-view";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";

interface PatientRecordPageProps {
  params: Promise<{ slug: string; studentPublicId: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

export default async function PatientRecordPage({ params, searchParams }: PatientRecordPageProps) {
  const { slug, studentPublicId } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const initialTab = sp?.tab;

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/login?returnUrl=/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  const ctx = await resolveNutritionAccessContext(slug);
  if (!ctx || !ctx.canViewNutrition) {
    notFound();
  }

  const effectiveState = await resolveEffectiveViewMode(slug, context?.roles || ctx.roles);
  const effectiveRole = effectiveState.effectiveMode;

  const res = await getPatientRecordDetailAction(slug, studentPublicId);
  if (!res.success || !res.detail || res.detail.record.consultancyId !== ctx.consultancyId) {
    notFound();
  }

  const [patientPlanState, evolutionHubData, planningRes] = await Promise.all([
    getPatientPlanState(ctx, res.detail.student.membershipPublicId).catch(() => null),
    getStudentEvolutionHubData({
      userId: session.userId,
      consultancySlug: slug,
      studentPublicId,
      effectiveRole: effectiveRole || "NUTRITIONIST",
    }).catch(() => null),
    getPatientPlanningAction(slug, studentPublicId).catch(() => null),
  ]);

  const activePlan = patientPlanState?.activePlan || null;
  const draftPlan = patientPlanState?.draftPlan || null;

  let evolutionComparisonData = null;
  if (evolutionHubData) {
    evolutionComparisonData = await getEvolutionComparisonBetweenDates({
      userId: session.userId,
      consultancySlug: slug,
      studentPublicId,
      hubData: evolutionHubData,
      effectiveRole: effectiveRole || "NUTRITIONIST",
    }).catch(() => null);
  }

  return (
    <ConsultancyAppShell
      consultancyName={context?.consultancyName || ctx.consultancySlug || slug}
      consultancySlug={context?.consultancySlug || ctx.consultancySlug || slug}
      consultancyLogoUrl={context?.consultancyLogoUrl}
      roles={context?.roles || ctx.roles}
      userName={session.fullName}
      userEmail={session.email}
      userPublicId={session.userPublicId}
      hasProfilePhoto={session.hasProfilePhoto}
      profilePhotoUpdatedAt={session.profilePhotoUpdatedAt}
      consultancyPublicId={context?.consultancyPublicId}
      viewModeState={effectiveState}
    >
      <PatientRecordView
        initialDetail={res.detail}
        slug={slug}
        activePlan={activePlan}
        draftPlan={draftPlan}
        evolutionHubData={evolutionHubData}
        evolutionComparisonData={evolutionComparisonData}
        initialTab={initialTab}
        initialPlanning={planningRes?.data?.planning || null}
        initialStaleStatus={planningRes?.data?.staleStatus || null}
        canAuthorNutrition={ctx.canAuthorNutrition}
      />
    </ConsultancyAppShell>
  );
}

