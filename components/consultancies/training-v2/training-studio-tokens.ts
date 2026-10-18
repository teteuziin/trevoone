/**
 * TREVO ONE — TRAINING STUDIO 3.0 SEMANTIC TOKENS
 * Authoritative color, hierarchy, and 3D visual depth mappings for the workout builder.
 *
 * SPECIFICATION (DECISÃO 4):
 * - Isolated Exercise: NEUTRAL / GRAY (discreet 3D relief, solid light / dark graphite)
 * - Bi-Set: BLUE (#3B82F6) — solid saturated blue card background, blue badge, A/B blue badges, 3D relief
 * - Tri-Set: PURPLE (#8B5CF6) — solid saturated purple card background, purple badge, A/B/C purple badges, 3D relief
 * - Circuit / Giant Set: ORANGE/AMBER (#F59E0B) — solid saturated orange card background, orange badge, 3D relief
 * - Super-Set: TEAL (#14B8A6) — solid saturated teal card background, teal badge, 3D relief
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
  // Background for the entire combination card container (Solid in Light Mode & Deep in Dark Mode with 3D depth)
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
    borderClass: "border-blue-300 dark:border-blue-700/60",
    cardBgClass: "bg-blue-100/90 dark:bg-blue-950/70 border border-blue-300 dark:border-blue-700/60 border-t-white/70 dark:border-t-blue-400/25 border-b-blue-400/40 dark:border-b-black/60 shadow-[0_2px_4px_rgba(30,58,138,0.08),0_1px_2px_rgba(30,58,138,0.06)] dark:shadow-[0_4px_8px_rgba(0,0,0,0.4)] active:scale-[0.99] transition-all",
    headerBgClass: "bg-blue-200/70 dark:bg-blue-900/60 border-b border-blue-300 dark:border-blue-700/50",
    memberRowClass: "bg-white/85 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700/40 text-blue-950 dark:text-blue-50 hover:bg-white dark:hover:bg-blue-900/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border-t-white/80 dark:border-t-white/10 border-b-blue-300/40 dark:border-b-black/40",
    footerBgClass: "bg-blue-200/50 dark:bg-blue-950/60 border-t border-blue-300/80 dark:border-blue-700/40 text-blue-950 dark:text-blue-100",
    dividerClass: "divide-blue-200 dark:divide-blue-800/40",
    connectorClass: "text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-950/80 border-blue-300/80 dark:border-blue-700/40",
    chipBgClass: "bg-blue-200/80 dark:bg-blue-900/60 text-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-600/40",
    badgeClass: "bg-blue-600 text-white dark:bg-blue-500/30 dark:border-blue-400/50 dark:text-blue-100 font-black shadow-xs",
    letterAvatarClass: "bg-blue-600 text-white dark:bg-blue-500/30 dark:border-blue-400/50 dark:text-blue-100 font-black shadow-xs",
    selectorActiveClass: "bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/40",
    textClass: "text-blue-700 dark:text-blue-400",
  },
  TRI_SET: {
    key: "TRI_SET",
    label: "Tri-Set",
    colorName: "Roxo",
    hex: "#8B5CF6",
    borderLeftClass: "border-l-4 border-l-purple-500",
    borderClass: "border-purple-300 dark:border-purple-700/60",
    cardBgClass: "bg-purple-100/90 dark:bg-purple-950/70 border border-purple-300 dark:border-purple-700/60 border-t-white/70 dark:border-t-purple-400/25 border-b-purple-400/40 dark:border-b-black/60 shadow-[0_2px_4px_rgba(88,28,135,0.08),0_1px_2px_rgba(88,28,135,0.06)] dark:shadow-[0_4px_8px_rgba(0,0,0,0.4)] active:scale-[0.99] transition-all",
    headerBgClass: "bg-purple-200/70 dark:bg-purple-900/60 border-b border-purple-300 dark:border-purple-700/50",
    memberRowClass: "bg-white/85 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-700/40 text-purple-950 dark:text-purple-50 hover:bg-white dark:hover:bg-purple-900/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border-t-white/80 dark:border-t-white/10 border-b-purple-300/40 dark:border-b-black/40",
    footerBgClass: "bg-purple-200/50 dark:bg-purple-950/60 border-t border-purple-300/80 dark:border-purple-700/40 text-purple-950 dark:text-purple-100",
    dividerClass: "divide-purple-200 dark:divide-purple-800/40",
    connectorClass: "text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/80 border-purple-300/80 dark:border-purple-700/40",
    chipBgClass: "bg-purple-200/80 dark:bg-purple-900/60 text-purple-900 dark:text-purple-100 border border-purple-300 dark:border-purple-600/40",
    badgeClass: "bg-purple-600 text-white dark:bg-purple-500/30 dark:border-purple-400/50 dark:text-purple-100 font-black shadow-xs",
    letterAvatarClass: "bg-purple-600 text-white dark:bg-purple-500/30 dark:border-purple-400/50 dark:text-purple-100 font-black shadow-xs",
    selectorActiveClass: "bg-purple-600 text-white shadow-sm ring-2 ring-purple-500/40",
    textClass: "text-purple-700 dark:text-purple-400",
  },
  CIRCUIT: {
    key: "CIRCUIT",
    label: "Circuito",
    colorName: "Laranja",
    hex: "#F59E0B",
    borderLeftClass: "border-l-4 border-l-amber-500",
    borderClass: "border-amber-300 dark:border-amber-700/60",
    cardBgClass: "bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 border-t-white/70 dark:border-t-amber-400/25 border-b-amber-400/40 dark:border-b-black/60 shadow-[0_2px_4px_rgba(180,83,9,0.08),0_1px_2px_rgba(180,83,9,0.06)] dark:shadow-[0_4px_8px_rgba(0,0,0,0.4)] active:scale-[0.99] transition-all",
    headerBgClass: "bg-amber-200/70 dark:bg-amber-900/60 border-b border-amber-300 dark:border-amber-700/50",
    memberRowClass: "bg-white/85 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/40 text-amber-950 dark:text-amber-50 hover:bg-white dark:hover:bg-amber-900/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border-t-white/80 dark:border-t-white/10 border-b-amber-300/40 dark:border-b-black/40",
    footerBgClass: "bg-amber-200/50 dark:bg-amber-950/60 border-t border-amber-300/80 dark:border-amber-700/40 text-amber-950 dark:text-amber-100",
    dividerClass: "divide-amber-200 dark:divide-amber-800/40",
    connectorClass: "text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 border-amber-300/80 dark:border-amber-700/40",
    chipBgClass: "bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-600/40",
    badgeClass: "bg-amber-600 text-white dark:bg-amber-500/30 dark:border-amber-400/50 dark:text-amber-100 font-black shadow-xs",
    letterAvatarClass: "bg-amber-600 text-white dark:bg-amber-500/30 dark:border-amber-400/50 dark:text-amber-100 font-black shadow-xs",
    selectorActiveClass: "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40",
    textClass: "text-amber-800 dark:text-amber-400",
  },
  GIANT_SET: {
    key: "GIANT_SET",
    label: "Série Gigante",
    colorName: "Laranja",
    hex: "#F59E0B",
    borderLeftClass: "border-l-4 border-l-amber-500",
    borderClass: "border-amber-300 dark:border-amber-700/60",
    cardBgClass: "bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/60 border-t-white/70 dark:border-t-amber-400/25 border-b-amber-400/40 dark:border-b-black/60 shadow-[0_2px_4px_rgba(180,83,9,0.08),0_1px_2px_rgba(180,83,9,0.06)] dark:shadow-[0_4px_8px_rgba(0,0,0,0.4)] active:scale-[0.99] transition-all",
    headerBgClass: "bg-amber-200/70 dark:bg-amber-900/60 border-b border-amber-300 dark:border-amber-700/50",
    memberRowClass: "bg-white/85 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/40 text-amber-950 dark:text-amber-50 hover:bg-white dark:hover:bg-amber-900/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border-t-white/80 dark:border-t-white/10 border-b-amber-300/40 dark:border-b-black/40",
    footerBgClass: "bg-amber-200/50 dark:bg-amber-950/60 border-t border-amber-300/80 dark:border-amber-700/40 text-amber-950 dark:text-amber-100",
    dividerClass: "divide-amber-200 dark:divide-amber-800/40",
    connectorClass: "text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 border-amber-300/80 dark:border-amber-700/40",
    chipBgClass: "bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-600/40",
    badgeClass: "bg-amber-600 text-white dark:bg-amber-500/30 dark:border-amber-400/50 dark:text-amber-100 font-black shadow-xs",
    letterAvatarClass: "bg-amber-600 text-white dark:bg-amber-500/30 dark:border-amber-400/50 dark:text-amber-100 font-black shadow-xs",
    selectorActiveClass: "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40",
    textClass: "text-amber-800 dark:text-amber-400",
  },
  SUPERSET: {
    key: "SUPERSET",
    label: "Super-Série",
    colorName: "Turquesa",
    hex: "#14B8A6",
    borderLeftClass: "border-l-4 border-l-teal-500",
    borderClass: "border-teal-300 dark:border-teal-700/60",
    cardBgClass: "bg-teal-100/90 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-700/60 border-t-white/70 dark:border-t-teal-400/25 border-b-teal-400/40 dark:border-b-black/60 shadow-[0_2px_4px_rgba(15,118,110,0.08),0_1px_2px_rgba(15,118,110,0.06)] dark:shadow-[0_4px_8px_rgba(0,0,0,0.4)] active:scale-[0.99] transition-all",
    headerBgClass: "bg-teal-200/70 dark:bg-teal-900/60 border-b border-teal-300 dark:border-teal-700/50",
    memberRowClass: "bg-white/85 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-700/40 text-teal-950 dark:text-teal-50 hover:bg-white dark:hover:bg-teal-900/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border-t-white/80 dark:border-t-white/10 border-b-teal-300/40 dark:border-b-black/40",
    footerBgClass: "bg-teal-200/50 dark:bg-teal-950/60 border-t border-teal-300/80 dark:border-teal-700/40 text-teal-950 dark:text-teal-100",
    dividerClass: "divide-teal-200 dark:divide-teal-800/40",
    connectorClass: "text-teal-800 dark:text-teal-300 bg-teal-100/80 dark:bg-teal-950/80 border-teal-300/80 dark:border-teal-700/40",
    chipBgClass: "bg-teal-200/80 dark:bg-teal-900/60 text-teal-900 dark:text-teal-100 border border-teal-300 dark:border-teal-600/40",
    badgeClass: "bg-teal-600 text-white dark:bg-teal-500/30 dark:border-teal-400/50 dark:text-teal-100 font-black shadow-xs",
    letterAvatarClass: "bg-teal-600 text-white dark:bg-teal-500/30 dark:border-teal-400/50 dark:text-teal-100 font-black shadow-xs",
    selectorActiveClass: "bg-teal-600 text-white shadow-sm ring-2 ring-teal-500/40",
    textClass: "text-teal-800 dark:text-teal-400",
  },
};

/**
 * Individual exercise 3D tactile theme with neutral tones
 */
export const INDIVIDUAL_EXERCISE_THEME = {
  cardClass: "bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/90 dark:border-zinc-800 border-t-white/80 dark:border-t-white/10 border-b-zinc-300/80 dark:border-b-black/70 shadow-[0_2px_4px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_8px_rgba(0,0,0,0.4)] active:scale-[0.99] transition-all",
  badgeClass: "bg-zinc-200 text-zinc-800 dark:bg-white/10 dark:text-zinc-200 border border-zinc-300 dark:border-white/15 font-black",
  chipBgClass: "bg-zinc-100 dark:bg-white/[0.06] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-white/[0.08]",
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
