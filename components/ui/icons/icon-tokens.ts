/**
 * TREVO ONE — ICON COLOR TOKENS
 *
 * Cores temáticas por área funcional para iconografia duotone:
 * - Visão geral: esmeralda
 * - Alunos e equipe: azul
 * - Treinos: laranja
 * - Nutrição: verde-lima
 * - Consultas e agenda: violeta
 * - Financeiro: turquesa
 * - Biblioteca de exercícios: índigo
 * - Administração e operações: azul-petróleo
 */

export interface AreaIconTheme {
  name: string;
  strokeLight: string;
  strokeDark: string;
  fillLight: string;
  fillDark: string;
  cssStrokeClass: string;
  cssFillClass: string;
  badgeBgClass: string;
  badgeBorderClass: string;
}

export const AREA_ICON_THEMES = {
  overview: {
    name: "Visão Geral",
    strokeLight: "#059669",
    strokeDark: "#10B981",
    fillLight: "rgba(16, 185, 129, 0.20)",
    fillDark: "rgba(52, 211, 153, 0.25)",
    cssStrokeClass: "text-emerald-600 dark:text-emerald-400",
    cssFillClass: "fill-emerald-600/20 dark:fill-emerald-400/25",
    badgeBgClass: "bg-emerald-500/10 dark:bg-emerald-500/15",
    badgeBorderClass: "border-emerald-500/20 dark:border-emerald-500/30",
  },
  students: {
    name: "Alunos e Equipe",
    strokeLight: "#2563EB",
    strokeDark: "#3B82F6",
    fillLight: "rgba(59, 130, 246, 0.20)",
    fillDark: "rgba(96, 165, 250, 0.25)",
    cssStrokeClass: "text-blue-600 dark:text-blue-400",
    cssFillClass: "fill-blue-600/20 dark:fill-blue-400/25",
    badgeBgClass: "bg-blue-500/10 dark:bg-blue-500/15",
    badgeBorderClass: "border-blue-500/20 dark:border-blue-500/30",
  },
  training: {
    name: "Treinos",
    strokeLight: "#EA580C",
    strokeDark: "#F97316",
    fillLight: "rgba(249, 115, 22, 0.20)",
    fillDark: "rgba(251, 146, 60, 0.25)",
    cssStrokeClass: "text-orange-600 dark:text-orange-400",
    cssFillClass: "fill-orange-600/20 dark:fill-orange-400/25",
    badgeBgClass: "bg-orange-500/10 dark:bg-orange-500/15",
    badgeBorderClass: "border-orange-500/20 dark:border-orange-500/30",
  },
  nutrition: {
    name: "Nutrição",
    strokeLight: "#65A30D",
    strokeDark: "#84CC16",
    fillLight: "rgba(132, 204, 22, 0.20)",
    fillDark: "rgba(163, 230, 53, 0.25)",
    cssStrokeClass: "text-lime-600 dark:text-lime-400",
    cssFillClass: "fill-lime-600/20 dark:fill-lime-400/25",
    badgeBgClass: "bg-lime-500/10 dark:bg-lime-500/15",
    badgeBorderClass: "border-lime-500/20 dark:border-lime-500/30",
  },
  consultations: {
    name: "Consultas e Agenda",
    strokeLight: "#7C3AED",
    strokeDark: "#8B5CF6",
    fillLight: "rgba(139, 92, 246, 0.20)",
    fillDark: "rgba(167, 139, 250, 0.25)",
    cssStrokeClass: "text-violet-600 dark:text-violet-400",
    cssFillClass: "fill-violet-600/20 dark:fill-violet-400/25",
    badgeBgClass: "bg-violet-500/10 dark:bg-violet-500/15",
    badgeBorderClass: "border-violet-500/20 dark:border-violet-500/30",
  },
  finance: {
    name: "Financeiro",
    strokeLight: "#0891B2",
    strokeDark: "#06B6D4",
    fillLight: "rgba(6, 182, 212, 0.20)",
    fillDark: "rgba(34, 211, 238, 0.25)",
    cssStrokeClass: "text-cyan-600 dark:text-cyan-400",
    cssFillClass: "fill-cyan-600/20 dark:fill-cyan-400/25",
    badgeBgClass: "bg-cyan-500/10 dark:bg-cyan-500/15",
    badgeBorderClass: "border-cyan-500/20 dark:border-cyan-500/30",
  },
  exercises: {
    name: "Biblioteca de Exercícios",
    strokeLight: "#4F46E5",
    strokeDark: "#6366F1",
    fillLight: "rgba(99, 102, 241, 0.20)",
    fillDark: "rgba(129, 140, 248, 0.25)",
    cssStrokeClass: "text-indigo-600 dark:text-indigo-400",
    cssFillClass: "fill-indigo-600/20 dark:fill-indigo-400/25",
    badgeBgClass: "bg-indigo-500/10 dark:bg-indigo-500/15",
    badgeBorderClass: "border-indigo-500/20 dark:border-indigo-500/30",
  },
  operations: {
    name: "Administração e Operações",
    strokeLight: "#0D9488",
    strokeDark: "#14B8A6",
    fillLight: "rgba(20, 184, 166, 0.20)",
    fillDark: "rgba(45, 212, 191, 0.25)",
    cssStrokeClass: "text-teal-600 dark:text-teal-400",
    cssFillClass: "fill-teal-600/20 dark:fill-teal-400/25",
    badgeBgClass: "bg-teal-500/10 dark:bg-teal-500/15",
    badgeBorderClass: "border-teal-500/20 dark:border-teal-500/30",
  },
} as const;

export type AreaIconType = keyof typeof AREA_ICON_THEMES;
