import type { ConsultancyRole } from "./context";

export const VIEW_MODE_COOKIE_NAME = "trevo_consultancy_view_mode";

export type ConsultancyPresentationMode =
  | "ADMIN"
  | "PERSONAL"
  | "NUTRITIONIST"
  | "STUDENT"
  | "INFLUENCER";

export const PRESENTATION_MODE_LABELS: Record<ConsultancyPresentationMode, string> = {
  ADMIN: "Administrador",
  PERSONAL: "Personal Trainer",
  NUTRITIONIST: "Nutricionista",
  STUDENT: "Aluno",
  INFLUENCER: "Influenciador / VIP",
};

export type AllowedViewModeOption = {
  mode: ConsultancyPresentationMode;
  label: string;
  isRealRole: boolean;
};

export type EffectiveViewModeState = {
  defaultMode: ConsultancyPresentationMode;
  requestedMode: ConsultancyPresentationMode | null;
  effectiveMode: ConsultancyPresentationMode;
  realRoles: ConsultancyRole[];
  allowedOptions: AllowedViewModeOption[];
  hasRealRoleForView: boolean;
  isPreview: boolean;
};

/**
 * Resolves the deterministic default presentation mode for a given set of real roles.
 * Exactly preserves pre-ROLEMODE precedence:
 * 1. CONSULTANCY_ADMIN -> ADMIN
 * 2. PERSONAL -> PERSONAL
 * 3. NUTRITIONIST -> NUTRITIONIST
 * 4. INFLUENCER -> INFLUENCER
 * 5. STUDENT -> STUDENT
 */
export function resolveDefaultPresentationMode(
  realRoles: ConsultancyRole[]
): ConsultancyPresentationMode {
  if (realRoles.includes("CONSULTANCY_ADMIN")) return "ADMIN";
  if (realRoles.includes("PERSONAL")) return "PERSONAL";
  if (realRoles.includes("NUTRITIONIST")) return "NUTRITIONIST";
  if (realRoles.includes("INFLUENCER")) return "INFLUENCER";
  if (realRoles.includes("STUDENT")) return "STUDENT";
  return "STUDENT";
}

/**
 * Maps presentation mode to its corresponding database ConsultancyRole.
 */
export function modeToConsultancyRole(
  mode: ConsultancyPresentationMode
): ConsultancyRole {
  switch (mode) {
    case "ADMIN":
      return "CONSULTANCY_ADMIN";
    case "PERSONAL":
      return "PERSONAL";
    case "NUTRITIONIST":
      return "NUTRITIONIST";
    case "INFLUENCER":
      return "INFLUENCER";
    case "STUDENT":
      return "STUDENT";
  }
}

/**
 * Calculates the allowed presentation mode options based on the user's real roles.
 */
export function getAllowedViewModeOptions(
  realRoles: ConsultancyRole[]
): AllowedViewModeOption[] {
  const options: AllowedViewModeOption[] = [];

  const isAdmin = realRoles.includes("CONSULTANCY_ADMIN");
  const isPersonal = realRoles.includes("PERSONAL");
  const isNutritionist = realRoles.includes("NUTRITIONIST");
  const isStudent = realRoles.includes("STUDENT");
  const isInfluencer = realRoles.includes("INFLUENCER");

  // 1. ADMIN options
  if (isAdmin) {
    options.push({
      mode: "ADMIN",
      label: PRESENTATION_MODE_LABELS.ADMIN,
      isRealRole: true,
    });
    options.push({
      mode: "PERSONAL",
      label: PRESENTATION_MODE_LABELS.PERSONAL,
      isRealRole: isPersonal,
    });
    options.push({
      mode: "NUTRITIONIST",
      label: PRESENTATION_MODE_LABELS.NUTRITIONIST,
      isRealRole: isNutritionist,
    });
    options.push({
      mode: "STUDENT",
      label: PRESENTATION_MODE_LABELS.STUDENT,
      isRealRole: isStudent,
    });
    if (isInfluencer) {
      options.push({
        mode: "INFLUENCER",
        label: PRESENTATION_MODE_LABELS.INFLUENCER,
        isRealRole: true,
      });
    }
    return options;
  }

  // 2. PERSONAL options
  if (isPersonal) {
    options.push({
      mode: "PERSONAL",
      label: PRESENTATION_MODE_LABELS.PERSONAL,
      isRealRole: true,
    });
    if (isNutritionist) {
      options.push({
        mode: "NUTRITIONIST",
        label: PRESENTATION_MODE_LABELS.NUTRITIONIST,
        isRealRole: true,
      });
    }
    options.push({
      mode: "STUDENT",
      label: PRESENTATION_MODE_LABELS.STUDENT,
      isRealRole: isStudent,
    });
    return options;
  }

  // 3. NUTRITIONIST options
  if (isNutritionist) {
    options.push({
      mode: "NUTRITIONIST",
      label: PRESENTATION_MODE_LABELS.NUTRITIONIST,
      isRealRole: true,
    });
    options.push({
      mode: "STUDENT",
      label: PRESENTATION_MODE_LABELS.STUDENT,
      isRealRole: isStudent,
    });
    return options;
  }

  // 4. INFLUENCER options
  if (isInfluencer) {
    options.push({
      mode: "INFLUENCER",
      label: PRESENTATION_MODE_LABELS.INFLUENCER,
      isRealRole: true,
    });
    return options;
  }

  // 5. STUDENT options
  if (isStudent) {
    options.push({
      mode: "STUDENT",
      label: PRESENTATION_MODE_LABELS.STUDENT,
      isRealRole: true,
    });
    return options;
  }

  return options;
}

/**
 * Pure calculation of effective presentation mode from raw cookie value.
 */
export function computeEffectiveViewModeFromCookie(
  slug: string,
  realRoles: ConsultancyRole[],
  cookieValue?: string | null
): EffectiveViewModeState {
  const defaultMode = resolveDefaultPresentationMode(realRoles);
  const allowedOptions = getAllowedViewModeOptions(realRoles);
  const allowedModes = new Set(allowedOptions.map((o) => o.mode));

  let requestedMode: ConsultancyPresentationMode | null = null;
  let effectiveMode: ConsultancyPresentationMode = defaultMode;

  if (cookieValue && typeof cookieValue === "string") {
    const parts = cookieValue.split(":");
    if (parts.length === 2) {
      const [cookieSlug, cookieMode] = parts;
      if (cookieSlug === slug) {
        const parsedMode = cookieMode as ConsultancyPresentationMode;
        if (allowedModes.has(parsedMode)) {
          requestedMode = parsedMode;
          effectiveMode = parsedMode;
        }
      }
    }
  }

  const correspondingRole = modeToConsultancyRole(effectiveMode);
  const hasRealRoleForView = realRoles.includes(correspondingRole);
  const isPreview = !hasRealRoleForView;

  return {
    defaultMode,
    requestedMode,
    effectiveMode,
    realRoles,
    allowedOptions,
    hasRealRoleForView,
    isPreview,
  };
}
