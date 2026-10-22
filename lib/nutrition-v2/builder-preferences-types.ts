/**
 * TREVO ONE — NUTRITION V2 BUILDER PREFERENCES TYPES & HELPERS
 * Pure types, defaults, and preset resolvers safe for Client Components.
 */

import type { PlanUpdatePolicy } from "./auto-publish-types";

export interface NutritionBuilderPreferences {
  showStudentPreview: boolean;
  showVersionHistory: boolean;
  showTemplateActions: boolean;
  showMealMicronutrients: boolean;
  defaultUpdatePolicy?: PlanUpdatePolicy;
}

export type NutritionBuilderPreset = "COMPLETO" | "SIMPLIFICADO" | "PERSONALIZADO";

export const DEFAULT_NUTRITION_BUILDER_PREFERENCES: Readonly<NutritionBuilderPreferences> = Object.freeze({
  showStudentPreview: true,
  showVersionHistory: true,
  showTemplateActions: true,
  showMealMicronutrients: true,
  defaultUpdatePolicy: "MANUAL",
});

export function getPresetFromPreferences(prefs: NutritionBuilderPreferences): NutritionBuilderPreset {
  if (
    prefs.showStudentPreview &&
    prefs.showVersionHistory &&
    prefs.showTemplateActions &&
    prefs.showMealMicronutrients
  ) {
    return "COMPLETO";
  }
  if (
    !prefs.showStudentPreview &&
    !prefs.showVersionHistory &&
    !prefs.showTemplateActions &&
    !prefs.showMealMicronutrients
  ) {
    return "SIMPLIFICADO";
  }
  return "PERSONALIZADO";
}
