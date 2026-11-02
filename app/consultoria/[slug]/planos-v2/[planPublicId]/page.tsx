import { notFound, redirect } from "next/navigation";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { getPlanVersionTreeByPlanPublicId } from "@/lib/nutrition-v2/plan-repository";
import { listPlanAssignments } from "@/lib/nutrition-v2/assignment-repository";
import { getPatientPlanningByStudent } from "@/lib/nutrition-v2/patient-planning-repository";
import { getNutritionBuilderPreferences } from "@/lib/nutrition-v2/builder-preferences-repository";
import { NutritionPlanBuilder } from "@/components/consultancies/nutrition-v2/nutrition-plan-builder";
import { getDbConnection } from "@/lib/db/mysql";
import type { RowDataPacket } from "mysql2/promise";

interface PlanBuilderPageProps {
  params: Promise<{ slug: string; planPublicId: string }>;
  searchParams: Promise<{
    v?: string;
    studentId?: string;
    studentPublicId?: string;
    returnTo?: string;
    origin?: string;
    originName?: string;
  }>;
}

export default async function PlanBuilderPage({ params, searchParams }: PlanBuilderPageProps) {
  const { slug, planPublicId } = await params;

  if (planPublicId === "alimentos") {
    redirect(`/consultoria/${slug}/alimentos-v2`);
  }

  const { v: versionPublicId, studentId, studentPublicId, returnTo, origin, originName } = await searchParams;

  const ctx = await resolveNutritionAccessContext(slug);
  if (!ctx) {
    redirect(`/login?returnUrl=/consultoria/${slug}/planos-v2/${planPublicId}`);
  }

  if (!ctx.canAuthorNutrition) {
    notFound();
  }

  const tree = await getPlanVersionTreeByPlanPublicId(ctx, planPublicId, versionPublicId);
  if (!tree) {
    notFound();
  }

  const assignments = await listPlanAssignments(ctx, planPublicId);

  // Resolve patient context if opened from patient hub or if this draft belongs to a patient
  let patientContext: {
    studentMembershipPublicId: string;
    studentPublicId: string;
    studentName: string;
    returnToUrl: string;
    weightKg?: number | null;
  } | null = null;

  let planningTarget: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatsG: number | null;
  } | null = null;

  const targetStudentId = studentId || studentPublicId;
  const conn = await getDbConnection();
  try {
    if (targetStudentId) {
      const [studentRows] = await conn.query<RowDataPacket[]>(
        `SELECT cm.id, cm.public_id, u.public_id AS user_public_id, u.full_name
         FROM consultancy_members cm
         INNER JOIN users u ON u.id = cm.user_id
         WHERE (cm.public_id = ? OR u.public_id = ?)
           AND cm.consultancy_id = ?
           AND cm.status = 'ACTIVE'
         LIMIT 1`,
        [targetStudentId, targetStudentId, ctx.consultancyId!]
      );
      if (studentRows && studentRows.length > 0) {
        const sr = studentRows[0];
        const planning = await getPatientPlanningByStudent(ctx.consultancyId!, Number(sr.id), conn);
        let studentWeightKg = planning?.snapshotWeightKg ? Number(planning.snapshotWeightKg) : null;
        if (!studentWeightKg || studentWeightKg <= 0) {
          try {
            const [wRows] = await conn.query<RowDataPacket[]>(
              `SELECT pa.weight_kg FROM nutrition_v2_patient_anthropometrics pa
               INNER JOIN nutrition_v2_patient_records pr ON pr.id = pa.patient_record_id
               WHERE pr.student_membership_id = ? AND pa.deleted_at IS NULL AND pa.weight_kg > 0
               ORDER BY pa.measured_at DESC LIMIT 1`,
              [Number(sr.id)]
            );
            if (wRows && wRows.length > 0 && wRows[0].weight_kg) {
              studentWeightKg = Number(wRows[0].weight_kg);
            }
          } catch {
            // Non-blocking fallback
          }
        }

        patientContext = {
          studentMembershipPublicId: String(sr.public_id),
          studentPublicId: String(sr.user_public_id),
          studentName: String(sr.full_name),
          returnToUrl: returnTo || `/consultoria/${slug}/planos-v2/prontuario/${sr.user_public_id}?tab=plano`,
          weightKg: studentWeightKg && studentWeightKg > 0 ? studentWeightKg : null,
        };

        if (planning) {
          planningTarget = {
            caloriesKcal: planning.targetCaloriesKcal,
            proteinG: planning.targetProteinG,
            carbsG: planning.targetCarbsG,
            fatsG: planning.targetFatsG,
          };
        }
      }
    } else {
      // Check if this draft is linked to a student via DRAFT assignment
      const [draftAssignRows] = await conn.query<RowDataPacket[]>(
        `SELECT cm.id AS membership_id, cm.public_id, u.public_id AS user_public_id, u.full_name
         FROM nutrition_v2_assignments a
         INNER JOIN consultancy_members cm ON cm.id = a.student_membership_id
         INNER JOIN users u ON u.id = cm.user_id
         WHERE a.nutrition_plan_version_id = (
           SELECT id FROM nutrition_v2_plan_versions WHERE public_id = ? AND deleted_at IS NULL LIMIT 1
         )
         AND a.consultancy_id = ?
         AND a.status = 'DRAFT'
         AND a.deleted_at IS NULL
         LIMIT 1`,
        [tree.version.publicId, ctx.consultancyId!]
      );
      if (draftAssignRows && draftAssignRows.length > 0) {
        const dar = draftAssignRows[0];
        const planning = await getPatientPlanningByStudent(ctx.consultancyId!, Number(dar.membership_id), conn);
        let studentWeightKg = planning?.snapshotWeightKg ? Number(planning.snapshotWeightKg) : null;
        if (!studentWeightKg || studentWeightKg <= 0) {
          try {
            const [wRows] = await conn.query<RowDataPacket[]>(
              `SELECT pa.weight_kg FROM nutrition_v2_patient_anthropometrics pa
               INNER JOIN nutrition_v2_patient_records pr ON pr.id = pa.patient_record_id
               WHERE pr.student_membership_id = ? AND pa.deleted_at IS NULL AND pa.weight_kg > 0
               ORDER BY pa.measured_at DESC LIMIT 1`,
              [Number(dar.membership_id)]
            );
            if (wRows && wRows.length > 0 && wRows[0].weight_kg) {
              studentWeightKg = Number(wRows[0].weight_kg);
            }
          } catch {
            // Non-blocking fallback
          }
        }

        patientContext = {
          studentMembershipPublicId: String(dar.public_id),
          studentPublicId: String(dar.user_public_id),
          studentName: String(dar.full_name),
          returnToUrl: `/consultoria/${slug}/planos-v2/prontuario/${dar.user_public_id}?tab=plano`,
          weightKg: studentWeightKg && studentWeightKg > 0 ? studentWeightKg : null,
        };

        if (planning) {
          planningTarget = {
            caloriesKcal: planning.targetCaloriesKcal,
            proteinG: planning.targetProteinG,
            carbsG: planning.targetCarbsG,
            fatsG: planning.targetFatsG,
          };
        }
      }
    }
  } finally {
    conn.release();
  }

  const initialPreferences = await getNutritionBuilderPreferences(ctx);

  return (
    <main className="relative min-h-svh w-full max-w-full min-w-0 flex-1 flex flex-col bg-[var(--background)] text-[var(--text-primary)]">
      {/* Official Trevo One Wallpaper: Responsive Dark/Light Signature */}
      <div
        data-trevo-dashboard-wallpaper="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
        aria-hidden="true"
      >
        <div className="trevo-dashboard-wallpaper w-full h-full" />
      </div>

      <div className="relative z-10 w-full flex-1 flex flex-col">
        <NutritionPlanBuilder
          slug={slug}
          initialTree={tree}
          initialAssignments={assignments}
          patientContext={patientContext || undefined}
          origin={origin}
          originName={originName}
          planningTarget={planningTarget || undefined}
          initialPreferences={initialPreferences}
        />
      </div>
    </main>
  );
}
