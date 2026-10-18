/**
 * TREVO ONE — TRAINING STUDIO 3.0 SEMANTIC TOKENS
 * Authoritative color, hierarchy, and visual styling mappings for the workout builder.
 *
 * SPECIFICATION:
 * - Isolated Exercise: NEUTRAL / GRAY (standard default, uncrowded)
 * - Bi-Set: BLUE (#3B82F6) — solid blue card background, blue badge, A/B blue badges
 * - Tri-Set: PURPLE (#8B5CF6) — solid purple card background, purple badge, A/B/C purple badges
 * - Circuit / Giant Set: ORANGE/AMBER (#F59E0B) — solid orange card background, orange badge
 * - Super-Set: TEAL (#14B8A6) — solid teal card background, teal badge
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
  // Background for the entire combination card container (Solid in Light Mode & Deep in Dark Mode)
  cardBgClass: string;
  // Background tint for the combination header
  headerBgClass: string;
  // Background for member rows inside combination
  memberRowClass: string;
  // Background for footer area
  footerBgClass: string;
  // Divider styling between members
  dividerClass: string;
  // Transition connector between exercises
  connectorClass: string;
  // Prescription chips inside combination
  chipBgClass: string;
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
    borderClass: "border-blue-200 dark:border-blue-500/30",
    cardBgClass: "bg-blue-50/95 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/30",
    headerBgClass: "bg-blue-100/70 dark:bg-blue-900/40 border-b border-blue-200 dark:border-blue-500/30",
    memberRowClass: "bg-blue-100/70 dark:bg-blue-900/35 border border-blue-200/90 dark:border-blue-700/50 text-blue-950 dark:text-blue-50 hover:bg-blue-100/90 dark:hover:bg-blue-900/50",
    footerBgClass: "bg-blue-100/50 dark:bg-blue-950/50 border-t border-blue-200/80 dark:border-blue-500/20 text-blue-950 dark:text-blue-100",
    dividerClass: "divide-blue-200/80 dark:divide-blue-500/20",
    connectorClass: "text-blue-700 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-500/20",
    chipBgClass: "bg-blue-100/80 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-500/30",
    badgeClass: "bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/40 text-blue-800 dark:text-blue-200 font-black",
    letterAvatarClass: "bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/40 text-blue-800 dark:text-blue-200 font-black",
    selectorActiveClass: "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/40",
    textClass: "text-blue-700 dark:text-blue-400",
  },
  TRI_SET: {
    key: "TRI_SET",
    label: "Tri-Set",
    colorName: "Roxo",
    hex: "#8B5CF6",
    borderLeftClass: "border-l-4 border-l-purple-500",
    borderClass: "border-purple-200 dark:border-purple-500/30",
    cardBgClass: "bg-purple-50/95 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-500/30",
    headerBgClass: "bg-purple-100/70 dark:bg-purple-900/40 border-b border-purple-200 dark:border-purple-500/30",
    memberRowClass: "bg-purple-100/70 dark:bg-purple-900/35 border border-purple-200/90 dark:border-purple-700/50 text-purple-950 dark:text-purple-50 hover:bg-purple-100/90 dark:hover:bg-purple-900/50",
    footerBgClass: "bg-purple-100/50 dark:bg-purple-950/50 border-t border-purple-200/80 dark:border-purple-500/20 text-purple-950 dark:text-purple-100",
    dividerClass: "divide-purple-200/80 dark:divide-purple-500/20",
    connectorClass: "text-purple-700 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-950/60 border-purple-200/80 dark:border-purple-500/20",
    chipBgClass: "bg-purple-100/80 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-500/30",
    badgeClass: "bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/40 text-purple-800 dark:text-purple-200 font-black",
    letterAvatarClass: "bg-purple-100 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/40 text-purple-800 dark:text-purple-200 font-black",
    selectorActiveClass: "bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/40",
    textClass: "text-purple-700 dark:text-purple-400",
  },
  CIRCUIT: {
    key: "CIRCUIT",
    label: "Circuito",
    colorName: "Laranja",
    hex: "#F59E0B",
    borderLeftClass: "border-l-4 border-l-amber-500",
    borderClass: "border-amber-200 dark:border-amber-500/30",
    cardBgClass: "bg-amber-50/95 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30",
    headerBgClass: "bg-amber-100/70 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-500/30",
    memberRowClass: "bg-amber-100/70 dark:bg-amber-900/35 border border-amber-200/90 dark:border-amber-700/50 text-amber-950 dark:text-amber-50 hover:bg-amber-100/90 dark:hover:bg-amber-900/50",
    footerBgClass: "bg-amber-100/50 dark:bg-amber-950/50 border-t border-amber-200/80 dark:border-amber-500/20 text-amber-950 dark:text-amber-100",
    dividerClass: "divide-amber-200/80 dark:divide-amber-500/20",
    connectorClass: "text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-500/20",
    chipBgClass: "bg-amber-100/80 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-500/30",
    badgeClass: "bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 font-black",
    letterAvatarClass: "bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 font-black",
    selectorActiveClass: "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40",
    textClass: "text-amber-800 dark:text-amber-400",
  },
  GIANT_SET: {
    key: "GIANT_SET",
    label: "Série Gigante",
    colorName: "Laranja",
    hex: "#F59E0B",
    borderLeftClass: "border-l-4 border-l-amber-500",
    borderClass: "border-amber-200 dark:border-amber-500/30",
    cardBgClass: "bg-amber-50/95 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30",
    headerBgClass: "bg-amber-100/70 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-500/30",
    memberRowClass: "bg-amber-100/70 dark:bg-amber-900/35 border border-amber-200/90 dark:border-amber-700/50 text-amber-950 dark:text-amber-50 hover:bg-amber-100/90 dark:hover:bg-amber-900/50",
    footerBgClass: "bg-amber-100/50 dark:bg-amber-950/50 border-t border-amber-200/80 dark:border-amber-500/20 text-amber-950 dark:text-amber-100",
    dividerClass: "divide-amber-200/80 dark:divide-amber-500/20",
    connectorClass: "text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-500/20",
    chipBgClass: "bg-amber-100/80 dark:bg-amber-900/50 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-500/30",
    badgeClass: "bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 font-black",
    letterAvatarClass: "bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 font-black",
    selectorActiveClass: "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40",
    textClass: "text-amber-800 dark:text-amber-400",
  },
  SUPERSET: {
    key: "SUPERSET",
    label: "Super-Série",
    colorName: "Turquesa",
    hex: "#14B8A6",
    borderLeftClass: "border-l-4 border-l-teal-500",
    borderClass: "border-teal-200 dark:border-teal-500/30",
    cardBgClass: "bg-teal-50/95 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-500/30",
    headerBgClass: "bg-teal-100/70 dark:bg-teal-900/40 border-b border-teal-200 dark:border-teal-500/30",
    memberRowClass: "bg-teal-100/70 dark:bg-teal-900/35 border border-teal-200/90 dark:border-teal-700/50 text-teal-950 dark:text-teal-50 hover:bg-teal-100/90 dark:hover:bg-teal-900/50",
    footerBgClass: "bg-teal-100/50 dark:bg-teal-950/50 border-t border-teal-200/80 dark:border-teal-500/20 text-teal-950 dark:text-teal-100",
    dividerClass: "divide-teal-200/80 dark:divide-teal-500/20",
    connectorClass: "text-teal-800 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-950/60 border-teal-200/80 dark:border-teal-500/20",
    chipBgClass: "bg-teal-100/80 dark:bg-teal-900/50 text-teal-900 dark:text-teal-100 border border-teal-200 dark:border-teal-500/30",
    badgeClass: "bg-teal-100 dark:bg-teal-500/20 border border-teal-300 dark:border-teal-500/40 text-teal-800 dark:text-teal-200 font-black",
    letterAvatarClass: "bg-teal-100 dark:bg-teal-500/20 border border-teal-300 dark:border-teal-500/40 text-teal-800 dark:text-teal-200 font-black",
    selectorActiveClass: "bg-teal-600 text-white shadow-sm ring-2 ring-teal-500/40",
    textClass: "text-teal-800 dark:text-teal-400",
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
  primaryPublish: "bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm",
  secondaryCombine: "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200 dark:bg-white/[0.05] dark:hover:bg-white/[0.08] dark:text-zinc-200 dark:border-white/[0.1] font-bold",
  utilityNeutral: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] font-medium",
  destructiveRose: "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-bold",
  statusDraft: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-black",
  statusPublished: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-black",
  statusSaved: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-white/[0.04] dark:text-zinc-300 dark:border-white/[0.08] font-bold",
  statusSaving: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold",
  statusError: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold",
  specialMethod: "inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 dark:text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-md",
};
