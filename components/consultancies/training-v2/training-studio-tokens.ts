/**
 * TREVO ONE — TRAINING STUDIO 3.0 SEMANTIC TOKENS
 * Authoritative color, hierarchy, and visual styling mappings for the workout builder.
 *
 * SPECIFICATION:
 * - Isolated Exercise: NEUTRAL / GRAY (standard default, uncrowded)
 * - Bi-Set: BLUE (#3B82F6) — border-l-blue-500, blue badge, A/B blue badges
 * - Tri-Set: PURPLE (#8B5CF6) — border-l-purple-500, purple badge, A/B/C purple badges
 * - Circuit / Giant Set: ORANGE/AMBER (#F59E0B) — border-l-amber-500, orange badge
 * - Super-Set: TEAL (#14B8A6) — border-l-teal-500, teal badge
 * - Actions: Green (Primary Add / Publish), Neutral (Secondary / Utility), Rose (Destructive)
 */

import type { WorkoutCombinationType } from "@/lib/training-v2/types";

export type CombinationVisualTheme = {
  key: WorkoutCombinationType;
  label: string;
  colorName: string;
  hex: string;
  // Distinctive lateral bar (WCAG AA recognizable structure)
  borderLeftClass: string;
  // Border color for subtle grouping lines
  borderClass: string;
  // Background tint for the combination header / card container
  headerBgClass: string;
  // Badge styling: background, border, accessible text contrast
  badgeClass: string;
  // Order letter avatar (A., B., C., D.)
  letterAvatarClass: string;
  // Active pill selector button in floating bar
  selectorActiveClass: string;
  // Accent text color
  textClass: string;
};

export const COMBINATION_THEMES: Record<WorkoutCombinationType, CombinationVisualTheme> = {
  BI_SET: {
    key: "BI_SET",
    label: "Bi-Set",
    colorName: "Azul",
    hex: "#3B82F6",
    borderLeftClass: "border-l-4 border-l-blue-500",
    borderClass: "border-blue-500/20",
    headerBgClass: "bg-blue-500/[0.04]",
    badgeClass: "bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-black",
    letterAvatarClass: "bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 font-black",
    selectorActiveClass: "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/40",
    textClass: "text-blue-600 dark:text-blue-400",
  },
  TRI_SET: {
    key: "TRI_SET",
    label: "Tri-Set",
    colorName: "Roxo",
    hex: "#8B5CF6",
    borderLeftClass: "border-l-4 border-l-purple-500",
    borderClass: "border-purple-500/20",
    headerBgClass: "bg-purple-500/[0.04]",
    badgeClass: "bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 font-black",
    letterAvatarClass: "bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 font-black",
    selectorActiveClass: "bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/40",
    textClass: "text-purple-600 dark:text-purple-400",
  },
  CIRCUIT: {
    key: "CIRCUIT",
    label: "Circuito",
    colorName: "Laranja",
    hex: "#F59E0B",
    borderLeftClass: "border-l-4 border-l-amber-500",
    borderClass: "border-amber-500/20",
    headerBgClass: "bg-amber-500/[0.04]",
    badgeClass: "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black",
    letterAvatarClass: "bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-black",
    selectorActiveClass: "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  GIANT_SET: {
    key: "GIANT_SET",
    label: "Série Gigante",
    colorName: "Laranja",
    hex: "#F59E0B",
    borderLeftClass: "border-l-4 border-l-amber-500",
    borderClass: "border-amber-500/20",
    headerBgClass: "bg-amber-500/[0.04]",
    badgeClass: "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-black",
    letterAvatarClass: "bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-black",
    selectorActiveClass: "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  SUPERSET: {
    key: "SUPERSET",
    label: "Super-Série",
    colorName: "Turquesa",
    hex: "#14B8A6",
    borderLeftClass: "border-l-4 border-l-teal-500",
    borderClass: "border-teal-500/20",
    headerBgClass: "bg-teal-500/[0.04]",
    badgeClass: "bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400 font-black",
    letterAvatarClass: "bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300 font-black",
    selectorActiveClass: "bg-teal-600 text-white shadow-sm ring-2 ring-teal-500/40",
    textClass: "text-teal-600 dark:text-teal-400",
  },
};

/**
 * Resolves the visual theme for a given combination type with safe fallback to BI_SET (blue).
 */
export function getCombinationTheme(combinationType?: string | null): CombinationVisualTheme {
  if (!combinationType) return COMBINATION_THEMES.BI_SET;
  const normalized = combinationType.toUpperCase() as WorkoutCombinationType;
  return COMBINATION_THEMES[normalized] || COMBINATION_THEMES.BI_SET;
}

/**
 * Standard labels for combination types.
 */
export const STUDIO_COMBINATION_TYPE_LABELS: Record<WorkoutCombinationType, string> = {
  BI_SET: "Bi-Set",
  TRI_SET: "Tri-Set",
  SUPERSET: "Super-Série",
  GIANT_SET: "Série Gigante",
  CIRCUIT: "Circuito",
};

/**
 * Action and status color roles.
 */
export const STUDIO_ACTION_STYLES = {
  primaryAdd: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs font-bold",
  primaryPublish: "bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.35)]",
  secondaryCombine: "bg-white/[0.05] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.1] font-bold",
  utilityNeutral: "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] font-medium",
  destructiveRose: "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold",
  statusDraft: "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-black",
  statusPublished: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-black",
  statusSaved: "bg-white/[0.04] text-zinc-300 border border-white/[0.08] font-bold",
  statusSaving: "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold",
  statusError: "bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold",
  specialMethod: "inline-flex items-center gap-1 text-[11px] font-medium text-amber-700/90 dark:text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-md",
};
