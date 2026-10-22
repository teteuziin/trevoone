/**
 * TREVO ONE — NUTRITION V2 PLAN UPDATE POLICY & AUTO-PUBLISH TYPES
 *
 * Rules:
 * 1. Strict distinction:
 *    - Autosave: persists nutritionist work in DRAFT.
 *    - Auto-publish: promotes a valid, complete revision to an assigned patient when enabled.
 * 2. Immutable versions: never edit a published version in place.
 * 3. Scope & Tenancy:
 *    - Individual preference suggests default on new plans.
 *    - Effective policy is recorded per-plan in nutrition_v2_plans.
 *    - All professionals editing the same plan see the same effective policy.
 * 4. First assignment remains explicit: auto-publish never creates unconfirmed first assignments.
 * 5. Publication gate: partial/incomplete nutrition or intermediate typing states are NEVER published.
 * 6. Concurrency: optimistic locks and revision checks prevent silent overwrites.
 */

export type PlanUpdatePolicy = "MANUAL" | "AUTO_PUBLISH";

export interface PlanUpdatePolicyInfo {
  updatePolicy: PlanUpdatePolicy;
  autoPublishPaused: boolean;
  lastAutoPublishedAt: string | null;
  assignedStudentMembershipPublicId?: string | null;
  assignedStudentName?: string | null;
}

export type AutoPublishUiState =
  | "idle"
  | "saving_draft"
  | "draft_saved"
  | "updating_patient"
  | "patient_updated"
  | "auto_update_paused"
  | "auto_update_error";

export interface AutoPublishStatusPresentation {
  state: AutoPublishUiState;
  label: string;
  badgeVariant: "neutral" | "brand" | "success" | "warning" | "error";
  isBusy: boolean;
  canPause: boolean;
  canResume: boolean;
}

export function getAutoPublishStatusPresentation(
  state: AutoPublishUiState,
  policy: PlanUpdatePolicy = "MANUAL",
  isPaused: boolean = false
): AutoPublishStatusPresentation {
  if (policy === "AUTO_PUBLISH" && isPaused && state !== "saving_draft" && state !== "updating_patient") {
    return {
      state: "auto_update_paused",
      label: "Atualização pausada",
      badgeVariant: "warning",
      isBusy: false,
      canPause: false,
      canResume: true,
    };
  }

  switch (state) {
    case "saving_draft":
      return {
        state: "saving_draft",
        label: "Salvando rascunho...",
        badgeVariant: "brand",
        isBusy: true,
        canPause: false,
        canResume: false,
      };
    case "draft_saved":
      return {
        state: "draft_saved",
        label: policy === "AUTO_PUBLISH" ? "Rascunho salvo" : "Salvo",
        badgeVariant: "success",
        isBusy: false,
        canPause: policy === "AUTO_PUBLISH" && !isPaused,
        canResume: policy === "AUTO_PUBLISH" && isPaused,
      };
    case "updating_patient":
      return {
        state: "updating_patient",
        label: "Atualizando plano do paciente...",
        badgeVariant: "brand",
        isBusy: true,
        canPause: false,
        canResume: false,
      };
    case "patient_updated":
      return {
        state: "patient_updated",
        label: "Plano atualizado",
        badgeVariant: "success",
        isBusy: false,
        canPause: policy === "AUTO_PUBLISH" && !isPaused,
        canResume: policy === "AUTO_PUBLISH" && isPaused,
      };
    case "auto_update_paused":
      return {
        state: "auto_update_paused",
        label: "Atualização pausada",
        badgeVariant: "warning",
        isBusy: false,
        canPause: false,
        canResume: true,
      };
    case "auto_update_error":
      return {
        state: "auto_update_error",
        label: "Erro ao atualizar — paciente continua com a versão anterior",
        badgeVariant: "error",
        isBusy: false,
        canPause: false,
        canResume: false,
      };
    case "idle":
    default:
      if (policy === "AUTO_PUBLISH") {
        return {
          state: "idle",
          label: isPaused ? "Atualização pausada" : "Atualização automática ativa",
          badgeVariant: isPaused ? "warning" : "success",
          isBusy: false,
          canPause: !isPaused,
          canResume: isPaused,
        };
      }
      return {
        state: "idle",
        label: "",
        badgeVariant: "neutral",
        isBusy: false,
        canPause: false,
        canResume: false,
      };
  }
}

export function canPlanAutoPublish(params: {
  updatePolicy: PlanUpdatePolicy;
  autoPublishPaused: boolean;
  versionStatus: string;
  hasActivePatientAssignment: boolean;
  hasValidNutritionalData: boolean;
  isDraftMutating: boolean;
}): { canPublish: boolean; reason?: string } {
  if (params.updatePolicy !== "AUTO_PUBLISH") {
    return { canPublish: false, reason: "POLITICA_MANUAL" };
  }

  if (params.autoPublishPaused) {
    return { canPublish: false, reason: "ATUALIZACAO_PAUSADA" };
  }

  if (params.versionStatus !== "DRAFT") {
    return { canPublish: false, reason: "VERSAO_NAO_E_RASCUNHO" };
  }

  if (!params.hasActivePatientAssignment) {
    return { canPublish: false, reason: "SEM_PACIENTE_VINCULADO" };
  }

  if (params.isDraftMutating) {
    return { canPublish: false, reason: "MUTACAO_EM_ANDAMENTO" };
  }

  if (!params.hasValidNutritionalData) {
    return { canPublish: false, reason: "DADOS_NUTRICIONAIS_INCOMPLETOS" };
  }

  return { canPublish: true };
}
