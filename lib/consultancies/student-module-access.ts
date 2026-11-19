import type { RowDataPacket } from "mysql2/promise";
import { getDbPool } from "@/lib/db/mysql";
import { resolveConsultancyContext, type AccessibleConsultancy } from "./context";
import { getStudentOnboardingStatus } from "./student-onboarding";
import {
  getStudentFinancialAccessState,
  type StudentFinancialBlockingCharge,
} from "./finance";
import {
  type StudentFeatureKey,
  type StudentFeatures,
  type StudentEntitlementMode,
  computeEffectiveEntitlements,
  getDeployCutoffTimestamp,
} from "./student-features";

export * from "./student-features";

export type StudentModuleAccessReason =
  | "ALLOWED"
  | "UNAUTHENTICATED"
  | "INVALID_CONTEXT"
  | "NOT_STUDENT"
  | "ONBOARDING_INCOMPLETE"
  | "FINANCIALLY_RESTRICTED"
  | "MODULE_NOT_INCLUDED"
  | "PLATFORM_SUSPENDED";

export type StudentModuleAccessResult = {
  allowed: boolean;
  reason: StudentModuleAccessReason;
  context?: AccessibleConsultancy;
  confirmedRequirements: number;
  totalRequirements: number;
  isComplete: boolean;
  blockingCharge?: StudentFinancialBlockingCharge;
  entitlementMode?: StudentEntitlementMode;
  effectiveFeatures?: StudentFeatures;
  requestedModule?: StudentFeatureKey;
};

interface SubscriptionFeatureRow extends RowDataPacket {
  id: number;
  plan_id: number | null;
  charge_id: number | null;
  status: string;
  ends_at: Date | null;
  created_at: Date;
  sub_features: unknown;
  plan_features: unknown;
  charge_features: unknown;
  charge_created_at: Date | null;
  is_legacy: number | boolean;
}

/**
 * Determines whether a consultancy has modular granular entitlements explicitly enabled.
 * - Explicitly enabled for Saiya Shape (the pilot consultancy).
 * - All other consultancies preserve their previous behavior (LEGACY_FULL), avoiding
 *   any unintended module lockout for traditional commercial or manual plans.
 * - Never activates granularity automatically merely due to the existence of plans with features_json.
 */
export function isConsultancyGranularEntitlementsEnabled(consultancySlug: string): boolean {
  if (!consultancySlug || typeof consultancySlug !== "string") return false;
  const normalized = consultancySlug.trim().toLowerCase();

  // Ativação granular explicitamente habilitada para a Saiya Shape
  if (normalized === "saiya-shape") {
    return true;
  }

  // Suporte a ativação progressiva opcional via lista explícita de slugs
  const explicitSlugs = (process.env.GRANULAR_ENTITLEMENTS_ENABLED_SLUGS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return explicitSlugs.includes(normalized);
}

export async function resolveStudentModuleAccess(
  userId: number,
  consultancySlug: string,
  requiredModule?: StudentFeatureKey
): Promise<StudentModuleAccessResult> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return {
      allowed: false,
      reason: "UNAUTHENTICATED",
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: false,
      requestedModule: requiredModule,
    };
  }

  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return {
      allowed: false,
      reason: "INVALID_CONTEXT",
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: false,
      requestedModule: requiredModule,
    };
  }

  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    return {
      allowed: false,
      reason: "INVALID_CONTEXT",
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: false,
      requestedModule: requiredModule,
    };
  }

  if (context.platformAccess && !context.platformAccess.isOperationalAllowed) {
    return {
      allowed: false,
      reason: "PLATFORM_SUSPENDED",
      context,
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: false,
      requestedModule: requiredModule,
    };
  }

  const isStudent = context.roles.includes("STUDENT");
  const isInfluencer = context.roles.includes("INFLUENCER");
  const isStaff =
    context.roles.includes("PERSONAL") ||
    context.roles.includes("CONSULTANCY_ADMIN") ||
    context.roles.includes("NUTRITIONIST");

  if (!isStudent && !isInfluencer && !isStaff) {
    return {
      allowed: false,
      reason: "NOT_STUDENT",
      context,
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: false,
      requestedModule: requiredModule,
    };
  }

  // Professional staff accessing student modules have immediate access
  if (isStaff && !isStudent && !isInfluencer) {
    return {
      allowed: true,
      reason: "ALLOWED",
      context,
      confirmedRequirements: 0,
      totalRequirements: 0,
      isComplete: true,
      entitlementMode: "LEGACY_FULL",
      effectiveFeatures: {
        training: true,
        nutrition: true,
        evolution: true,
        consultations: true,
        chat: true,
      },
      requestedModule: requiredModule,
    };
  }

  // If membership has STUDENT role (even if also INFLUENCER), student obligations apply strictly (onboarding & finance)
  if (isStudent) {
    const onboardingStatus = await getStudentOnboardingStatus(userId, consultancySlug);

    if (!onboardingStatus.isComplete) {
      return {
        allowed: false,
        reason: "ONBOARDING_INCOMPLETE",
        context,
        confirmedRequirements: onboardingStatus.confirmedRequirements,
        totalRequirements: onboardingStatus.totalRequirements,
        isComplete: false,
        requestedModule: requiredModule,
      };
    }

    // Financial access enforcement for student (modularly aware of overdue charges per service)
    const financialStatus = await getStudentFinancialAccessState({
      consultancyId: context.consultancyId,
      studentMembershipId: context.membershipId,
      requiredModule,
    });

    if (financialStatus.isRestricted) {
      return {
        allowed: false,
        reason: "FINANCIALLY_RESTRICTED",
        context,
        confirmedRequirements: onboardingStatus.confirmedRequirements,
        totalRequirements: onboardingStatus.totalRequirements,
        isComplete: true,
        blockingCharge: financialStatus.blockingCharge,
        requestedModule: requiredModule,
      };
    }

    // MULTI-TENANT COMPATIBILITY:
    // If this consultancy is NOT explicitly enabled for granular modular features,
    // preserve 100% of the previous behavior: student receives LEGACY_FULL access.
    if (!isConsultancyGranularEntitlementsEnabled(consultancySlug)) {
      return {
        allowed: true,
        reason: "ALLOWED",
        context,
        confirmedRequirements: onboardingStatus.confirmedRequirements,
        totalRequirements: onboardingStatus.totalRequirements,
        isComplete: true,
        entitlementMode: "LEGACY_FULL",
        effectiveFeatures: {
          training: true,
          nutrition: true,
          evolution: true,
          consultations: true,
          chat: true,
        },
        requestedModule: requiredModule,
      };
    }

    // Query active non-expired subscriptions for this student membership in this consultancy
    const cutoffDate = getDeployCutoffTimestamp();
    const cutoffIso = cutoffDate.toISOString().slice(0, 19).replace("T", " ");

    const pool = getDbPool();
    const [subRows] = await pool.execute<SubscriptionFeatureRow[]>(
      `SELECT
         sps.id,
         sps.plan_id,
         sps.charge_id,
         sps.status,
         sps.ends_at,
         sps.created_at,
         sps.features_json AS sub_features,
         cp.features_json AS plan_features,
         sc.features_json AS charge_features,
         sc.created_at AS charge_created_at,
         (
           sps.features_json IS NULL 
           AND (
             sps.created_at < ?
             OR (
               sc.id IS NOT NULL 
               AND sc.features_json IS NULL 
               AND sc.created_at < ?
             )
           )
         ) AS is_legacy
       FROM student_plan_subscriptions sps
       LEFT JOIN consultancy_plans cp ON cp.id = sps.plan_id
       LEFT JOIN student_charges sc ON sc.id = sps.charge_id
       WHERE sps.consultancy_id = ?
         AND sps.student_membership_id = ?
         AND sps.status = 'ACTIVE'
         AND (sps.ends_at IS NULL OR sps.ends_at >= NOW(3))
       ORDER BY sps.id ASC;`,
      [cutoffIso, cutoffIso, context.consultancyId, context.membershipId]
    );

    const { entitlementMode, effectiveFeatures } = computeEffectiveEntitlements(
      subRows.map((r) => ({
        subFeatures: r.sub_features,
        planFeatures: r.plan_features,
        chargeFeatures: r.charge_features,
        planId: r.plan_id,
        chargeId: r.charge_id,
        createdAt: r.created_at,
        chargeCreatedAt: r.charge_created_at,
        isLegacy: Boolean(r.is_legacy),
      }))
    );

    if (requiredModule) {
      const isAllowed =
        entitlementMode === "LEGACY_FULL" || Boolean(effectiveFeatures[requiredModule]);

      if (!isAllowed) {
        return {
          allowed: false,
          reason: "MODULE_NOT_INCLUDED",
          context,
          confirmedRequirements: onboardingStatus.confirmedRequirements,
          totalRequirements: onboardingStatus.totalRequirements,
          isComplete: true,
          entitlementMode,
          effectiveFeatures,
          requestedModule: requiredModule,
        };
      }
    }

    return {
      allowed: true,
      reason: "ALLOWED",
      context,
      confirmedRequirements: onboardingStatus.confirmedRequirements,
      totalRequirements: onboardingStatus.totalRequirements,
      isComplete: true,
      entitlementMode,
      effectiveFeatures,
      requestedModule: requiredModule,
    };
  }

  // INFLUENCER-only: not subject to student onboarding or student financial restriction
  return {
    allowed: true,
    reason: "ALLOWED",
    context,
    confirmedRequirements: 0,
    totalRequirements: 0,
    isComplete: true,
    entitlementMode: "LEGACY_FULL",
    effectiveFeatures: {
      training: true,
      nutrition: true,
      evolution: true,
      consultations: true,
      chat: true,
    },
    requestedModule: requiredModule,
  };
}

export async function isStudentModuleAllowed(
  userId: number,
  consultancySlug: string,
  requiredModule: StudentFeatureKey
): Promise<boolean> {
  const res = await resolveStudentModuleAccess(userId, consultancySlug, requiredModule);
  return res.allowed;
}
