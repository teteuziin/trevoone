/**
 * TREVO ONE — NUTRITION PLAN CLASSIFICATION
 * Pure domain functions for plan lifecycle status, draft revisions,
 * canonical badge labels, and consultation formatting.
 * Free of "use client" directives to allow safe Server Component imports.
 */

export interface PlanClassificationInput {
  planLifecycleStatus?: string | null;
  status?: string | null;
  currentVersionStatus?: string | null;
  activeAssignmentsCount?: number | null;
  hasDraftRevision?: boolean | null;
  versionNumber?: number | null;
}

export function isPlanActive(plan: PlanClassificationInput): boolean {
  const lifecycle = plan.planLifecycleStatus || plan.status;
  if (lifecycle === "ENDED" || lifecycle === "ARCHIVED") {
    return false;
  }
  return (
    lifecycle === "ACTIVE" ||
    (typeof plan.activeAssignmentsCount === "number" && plan.activeAssignmentsCount > 0)
  );
}

export function isPlanDraft(plan: PlanClassificationInput): boolean {
  if (isPlanActive(plan)) return false;
  const lifecycle = plan.planLifecycleStatus || plan.status;
  if (lifecycle === "ENDED" || lifecycle === "ARCHIVED") return false;
  return plan.currentVersionStatus === "DRAFT" || lifecycle === "DRAFT";
}

export function getPlanCanonicalStatus(plan: PlanClassificationInput): {
  label: string;
  subLabel?: string;
  isDraft: boolean;
} {
  const lifecycle = plan.planLifecycleStatus || plan.status;
  if (lifecycle === "ARCHIVED") {
    return { label: "Arquivado", isDraft: false };
  }
  if (lifecycle === "ENDED") {
    return { label: "Encerrado", isDraft: false };
  }
  if (isPlanActive(plan)) {
    if (
      plan.hasDraftRevision ||
      (plan.currentVersionStatus === "DRAFT" && plan.versionNumber && plan.versionNumber > 1)
    ) {
      return {
        label: "Ativo",
        subLabel: `Nova versão em rascunho (V${plan.versionNumber || 2})`,
        isDraft: false,
      };
    }
    return { label: "Ativo", isDraft: false };
  }
  if (isPlanDraft(plan)) {
    return { label: "Rascunho", isDraft: true };
  }
  return { label: "—", isDraft: false };
}

export function hasPlanDraftOrRevision(plan: PlanClassificationInput): boolean {
  const lifecycle = plan.planLifecycleStatus || plan.status;
  if (lifecycle === "ENDED" || lifecycle === "ARCHIVED") return false;
  return (
    isPlanDraft(plan) ||
    Boolean(plan.hasDraftRevision) ||
    (isPlanActive(plan) && plan.currentVersionStatus === "DRAFT")
  );
}

