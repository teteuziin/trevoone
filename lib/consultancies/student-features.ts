/**
 * TREVO ONE — STUDENT FEATURES & ENTITLEMENTS ENGINE
 *
 * Types and pure functions for modular feature entitlements:
 * - training, nutrition, evolution, consultations, chat
 * - JSON snapshot parsing
 * - Logical OR (union) combination for multi-contract access
 * - Separation between LEGACY_FULL and GRANULAR entitlement modes
 */

export type StudentFeatureKey =
  | "training"
  | "nutrition"
  | "evolution"
  | "consultations"
  | "chat";

export interface StudentFeatures {
  training: boolean;
  nutrition: boolean;
  evolution: boolean;
  consultations: boolean;
  chat: boolean;
}

export type StudentEntitlementMode = "LEGACY_FULL" | "GRANULAR";

/**
 * Safely parses and normalizes a features JSON snapshot.
 */
export function parseFeaturesJson(raw: unknown): Partial<StudentFeatures> | null {
  if (!raw) return null;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  const result: Partial<StudentFeatures> = {};
  if (typeof obj.training === "boolean") result.training = obj.training;
  if (typeof obj.nutrition === "boolean") result.nutrition = obj.nutrition;
  if (typeof obj.evolution === "boolean") result.evolution = obj.evolution;
  if (typeof obj.consultations === "boolean") result.consultations = obj.consultations;
  if (typeof obj.chat === "boolean") result.chat = obj.chat;
  return Object.keys(result).length > 0 ? result : null;
}

export function getDeployCutoffTimestamp(): Date {
  const envVal = process.env.DEPLOY_CUTOFF_TIMESTAMP || process.env.MIGRATION_077_CUTOFF;
  if (envVal) {
    const parsed = new Date(envVal);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  // Data de corte padrão: início do ciclo de publicação modular
  return new Date("2026-11-17T00:00:00.000Z");
}

export const MIGRATION_077_CUTOFF = getDeployCutoffTimestamp();

export interface SubscriptionEntitlementInput {
  subFeatures: unknown;
  planFeatures: unknown;
  planId?: number | null;
  chargeId?: number | null;
  createdAt?: Date | string | null;
  chargeCreatedAt?: Date | string | null;
  chargeFeatures?: unknown;
  isLegacy?: boolean;
}

/**
 * Centralized pure function to compute effective student entitlements:
 * - When all active subscriptions define granular features -> GRANULAR mode with logical OR union.
 * - When genuine legacy subscriptions exist (created prior to migration 077, OR generated from charges issued prior to cutoff) -> LEGACY_FULL mode.
 * - New subscriptions (commercial or custom) lacking features NEVER fall back to LEGACY_FULL.
 * - Multi-subscription contracts combine non-conflicting rights.
 */
export function computeEffectiveEntitlements(
  subscriptions: Array<SubscriptionEntitlementInput>
): {
  entitlementMode: StudentEntitlementMode;
  effectiveFeatures: StudentFeatures;
} {
  // If no subscriptions exist, fallback to LEGACY_FULL to avoid breaking existing users without plans
  if (subscriptions.length === 0) {
    return {
      entitlementMode: "LEGACY_FULL",
      effectiveFeatures: {
        training: true,
        nutrition: true,
        evolution: true,
        consultations: true,
        chat: true,
      },
    };
  }

  let hasAnyLegacy = false;
  const resolvedSubs: Array<Partial<StudentFeatures> | null> = [];

  for (const sub of subscriptions) {
    // 1. Check if this is a genuine legacy contract (created prior to cutoff with no subscription snapshot)
    if (sub.isLegacy === true) {
      hasAnyLegacy = true;
      resolvedSubs.push(null);
      continue;
    }

    // 2. Subscription snapshot takes precedence over plan definition for modular contracts
    const parsed = parseFeaturesJson(sub.subFeatures) ?? parseFeaturesJson(sub.planFeatures);
    if (parsed !== null) {
      resolvedSubs.push(parsed);
    } else {
      // Missing features: check legacy fallback by date if isLegacy was undefined
      let isLegacyByDate = false;
      if (sub.isLegacy === undefined) {
        const originDateRaw = sub.chargeCreatedAt ?? sub.createdAt;
        if (originDateRaw !== undefined && originDateRaw !== null) {
          const originTime = new Date(originDateRaw).getTime();
          if (!Number.isNaN(originTime) && originTime < MIGRATION_077_CUTOFF.getTime()) {
            isLegacyByDate = true;
          }
        }
      }

      if (isLegacyByDate) {
        hasAnyLegacy = true;
      }
      resolvedSubs.push(null);
    }
  }

  // If any active contract is legacy (unmapped rights), preserve full access
  // without revoking rights or applying arbitrary fallbacks.
  if (hasAnyLegacy) {
    return {
      entitlementMode: "LEGACY_FULL",
      effectiveFeatures: {
        training: true,
        nutrition: true,
        evolution: true,
        consultations: true,
        chat: true,
      },
    };
  }

  // Purely GRANULAR: All active subscriptions have explicit features.
  // Logical OR (Union) of all granted permissions:
  const effectiveFeatures: StudentFeatures = {
    training: false,
    nutrition: false,
    evolution: false,
    consultations: false,
    chat: false,
  };

  for (const s of resolvedSubs) {
    if (!s) continue;
    if (s.training) effectiveFeatures.training = true;
    if (s.nutrition) effectiveFeatures.nutrition = true;
    if (s.evolution) effectiveFeatures.evolution = true;
    if (s.consultations) effectiveFeatures.consultations = true;
    if (s.chat) effectiveFeatures.chat = true;
  }

  return {
    entitlementMode: "GRANULAR",
    effectiveFeatures,
  };
}
