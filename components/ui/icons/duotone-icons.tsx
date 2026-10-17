import React from "react";
import { AREA_ICON_THEMES } from "./icon-tokens";

interface DuotoneIconProps {
  className?: string;
  size?: number | string;
  variant?: "duotone" | "monochrome";
}

/**
 * Visão Geral — Cockpit Executivo (Esmeralda)
 */
export function DuotoneOverviewIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.overview;
  const isDuotone = variant === "duotone";

  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Teto e contorno da base */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
        d="M3 9.5L12 3l9 6.5M4.5 10.5V20a1 1 0 001 1h13a1 1 0 001-1v-9.5"
      />
      {/* Quadrante Cockpit preenchido em duotone */}
      <rect
        x="7"
        y="12"
        width="4"
        height="4"
        rx="1"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Quadrantes Cockpit de apoio */}
      <rect
        x="13"
        y="12"
        width="4"
        height="4"
        rx="1"
        className={isDuotone ? theme.cssStrokeClass : undefined}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Alunos e Equipe — Formas Humanas Claras (Azul)
 */
export function DuotoneStudentsIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.students;
  const isDuotone = variant === "duotone";

  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Silhueta secundária ao fundo com preenchimento parcial */}
      <circle
        cx="16"
        cy="7"
        r="2.5"
        stroke="currentColor"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
        d="M14 14.5c1.8.3 3.5 1.2 4.5 2.5a1 1 0 01.2.6V19h-5.5"
      />
      {/* Figura principal em primeiro plano */}
      <circle
        cx="8.5"
        cy="7.5"
        r="3"
        stroke="currentColor"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
        d="M3.5 19.5c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5v.5h-11v-.5z"
      />
    </svg>
  );
}

/**
 * Treinos — Halter Autêntico com Pegada e Anilhas (Laranja)
 */
export function DuotoneTrainingIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.training;
  const isDuotone = variant === "duotone";

  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Barra central com estrias de pegada */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
        d="M7 12h10M10.5 10.5v3M13.5 10.5v3"
      />
      {/* Anilhas esquerdas com duotone */}
      <rect
        x="4.5"
        y="7"
        width="2.5"
        height="10"
        rx="1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
      />
      <rect
        x="2"
        y="9"
        width="2.5"
        height="6"
        rx="0.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      {/* Anilhas direitas com duotone */}
      <rect
        x="17"
        y="7"
        width="2.5"
        height="10"
        rx="1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
      />
      <rect
        x="19.5"
        y="9"
        width="2.5"
        height="6"
        rx="0.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
    </svg>
  );
}

/**
 * Nutrição — Folha Orgânica e Alimento (Verde-lima)
 */
export function DuotoneNutritionIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.nutrition;
  const isDuotone = variant === "duotone";

  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Haste superior */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
        d="M12 2.5c1.2 1.5 1.5 3 0 4.5"
      />
      {/* Folha em duotone */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
        d="M13.5 3.5c3.5 0 6.5 2 6.5 5.5 0 3-2.5 5.5-6.5 5.5-1.5 0-3-.5-4-1.2C10.5 7.5 12 3.5 13.5 3.5z"
      />
      {/* Fruto / Maçã contorno orgânico */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
        d="M8.5 7.5c-3 0-5.5 2.5-5.5 6s2.5 7.5 5.5 7.5c1.8 0 2.5-.8 3.5-.8s1.7.8 3.5.8c3 0 5.5-4 5.5-7.5"
      />
    </svg>
  );
}

/**
 * Consultas e Agenda — Calendário com Faixa Superior Colorida (Violeta)
 */
export function DuotoneConsultationsIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.consultations;
  const isDuotone = variant === "duotone";

  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Moldura do calendário */}
      <rect
        x="3"
        y="4"
        width="18"
        height="17"
        rx="2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      {/* Faixa superior do mês preenchida em duotone */}
      <path
        d="M3 9h18"
        stroke="currentColor"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      <rect
        x="3"
        y="4"
        width="18"
        height="5"
        rx="2"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
      />
      {/* Pinos superiores de encadernação */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
        d="M8 2.5v3M16 2.5v3"
      />
      {/* Marcação de consulta agendada */}
      <circle
        cx="8.5"
        cy="13"
        r="1"
        fill="currentColor"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      <circle
        cx="12"
        cy="13"
        r="1"
        fill="currentColor"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      <circle
        cx="15.5"
        cy="13"
        r="1"
        fill="currentColor"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      <circle
        cx="8.5"
        cy="16.5"
        r="1"
        fill="currentColor"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      <circle
        cx="12"
        cy="16.5"
        r="1.2"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : undefined}
        stroke="currentColor"
      />
    </svg>
  );
}

/**
 * Financeiro — Carteira com Aba e Cartão (Turquesa)
 */
export function DuotoneFinanceIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.finance;
  const isDuotone = variant === "duotone";

  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Corpo principal da carteira */}
      <rect
        x="2.5"
        y="5.5"
        width="19"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      {/* Aba de fecho / slot preenchida em duotone */}
      <path
        d="M14.5 10h5a2 2 0 012 2v1a2 2 0 01-2 2h-5a2 2 0 01-2-2v-1a2 2 0 012-2z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
      />
      {/* Pino metálico da carteira */}
      <circle
        cx="16.5"
        cy="12.5"
        r="1"
        fill="currentColor"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      {/* Linha decorativa de nota / divisória */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        d="M6 9.5h5"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
    </svg>
  );
}

/**
 * Biblioteca de Exercícios — Fichas e Coleção de Movimentos (Índigo)
 */
export function DuotoneExercisesIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.exercises;
  const isDuotone = variant === "duotone";

  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Ficha de trás deslocada */}
      <rect
        x="6"
        y="3"
        width="15"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
      />
      {/* Ficha da frente principal */}
      <rect
        x="3"
        y="6"
        width="15"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      {/* Linhas de exercícios e marcador */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        d="M6.5 10.5h8M6.5 14h5M6.5 17.5h7"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
    </svg>
  );
}

/**
 * Administração e Operações — Prancheta de Tarefas e Gestão (Azul-petróleo)
 */
export function DuotoneOperationsIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.operations;
  const isDuotone = variant === "duotone";

  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Moldura da prancheta */}
      <rect
        x="4"
        y="5"
        width="16"
        height="16"
        rx="2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      {/* Grampo superior em duotone */}
      <path
        d="M9 3.5h6a1.5 1.5 0 011.5 1.5v1H7.5V5A1.5 1.5 0 019 3.5z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
      />
      {/* Lista de tarefas organizadas com check */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 10.5l1.5 1.5 3-3"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        d="M14.5 10h2"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 15.5l1.5 1.5 3-3"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        d="M14.5 15h2"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
    </svg>
  );
}

/**
 * Atividades e Histórico (Discreto / Violeta Suave)
 */
export function DuotoneActivityIcon({
  className = "w-5 h-5",
  size,
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.consultations;
  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        className={theme.cssStrokeClass}
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={theme.cssStrokeClass}
        d="M12 6.5v5.5l3.5 2"
      />
    </svg>
  );
}

/**
 * Progresso e Métricas
 */
export function DuotoneProgressIcon({
  className = "w-5 h-5",
  size,
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.overview;
  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={theme.cssStrokeClass}
        d="M3 20h18M4 16l5-5 4 4 7-8"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={theme.cssStrokeClass}
        d="M16 7h4v4"
      />
      <circle
        cx="13"
        cy="15"
        r="1.25"
        className={`${theme.cssStrokeClass} ${theme.cssFillClass}`}
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Assinatura e Proteção
 */
export function DuotoneSubscriptionIcon({
  className = "w-5 h-5",
  size,
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.operations;
  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${theme.cssStrokeClass} ${theme.cssFillClass}`}
        d="M12 3s7 3 7 9c0 5-5 8.5-7 9.5-2-1-7-4.5-7-9.5 0-6 7-9 7-9z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={theme.cssStrokeClass}
        d="M9 12l2 2 4-4"
      />
    </svg>
  );
}

/**
 * Missões e Embaixador
 */
export function DuotoneMissionsIcon({
  className = "w-5 h-5",
  size,
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.training;
  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${theme.cssStrokeClass} ${theme.cssFillClass}`}
        d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2-4.5-4.4 6.2-.9L12 3z"
      />
    </svg>
  );
}

/**
 * Inteligência e Studio
 */
export function DuotoneAiIcon({
  className = "w-5 h-5",
  size,
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.overview;
  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="2"
        stroke="currentColor"
        className={`${theme.cssStrokeClass} ${theme.cssFillClass}`}
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" className={theme.cssStrokeClass} />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"
        className={theme.cssStrokeClass}
      />
    </svg>
  );
}

/**
 * Indicações e Afiliados (Turquesa / Financeiro)
 */
export function DuotoneReferralsIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.finance;
  const isDuotone = variant === "duotone";
  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
        d="M12 8v13m0-13V4a2 2 0 114 0v4m-4 0V4a2 2 0 10-4 0v4m-4 0h16a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
        d="M5 13v7a1 1 0 001 1h12a1 1 0 001-1v-7"
      />
    </svg>
  );
}

/**
 * Fotos de Evolução — Câmera e Registro Visual (Azul)
 */
export function DuotonePhotosIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.students;
  const isDuotone = variant === "duotone";

  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Moldura da câmera com duotone */}
      <rect
        x="3"
        y="6"
        width="18"
        height="15"
        rx="3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      {/* Topo do visor */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.5 6V4.5a1.5 1.5 0 011.5-1.5h4a1.5 1.5 0 011.5 1.5V6"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
      />
      {/* Lente circular preenchida em duotone */}
      <circle
        cx="12"
        cy="13.5"
        r="3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
      />
      {/* Indicador de flash */}
      <circle cx="17.5" cy="9" r="0.8" fill="currentColor" className={isDuotone ? theme.cssStrokeClass : undefined} />
    </svg>
  );
}

/**
 * Anamnese — Prancheta Clínica e Histórico de Saúde (Violeta)
 */
export function DuotoneAnamnesisIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.consultations;
  const isDuotone = variant === "duotone";

  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Base da prancheta */}
      <rect
        x="4"
        y="5"
        width="16"
        height="16"
        rx="2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      {/* Grampo superior em duotone */}
      <path
        d="M9 3.5h6a1.5 1.5 0 011.5 1.5v1H7.5V5A1.5 1.5 0 019 3.5z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
      />
      {/* Cruz clínica de saúde no centro */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 10.5v6M9 13.5h6"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
    </svg>
  );
}

/**
 * Formulários — Questionários e Termos (Azul-petróleo / Teal)
 */
export function DuotoneFormsIcon({
  className = "w-5 h-5",
  size,
  variant = "duotone",
}: DuotoneIconProps) {
  const theme = AREA_ICON_THEMES.operations;
  const isDuotone = variant === "duotone";

  return (
    <svg
      className={`${className} shrink-0`}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      {/* Folha do documento */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 4a1.5 1.5 0 011.5-1.5h8.5l5 5V20a1.5 1.5 0 01-1.5 1.5h-12A1.5 1.5 0 015 20V4z"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
      {/* Orelha dobrada com preenchimento duotone */}
      <path
        d="M15 2.5V7a1 1 0 001 1h4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isDuotone ? `${theme.cssStrokeClass} ${theme.cssFillClass}` : "fill-current/20"}
      />
      {/* Linhas de perguntas */}
      <path
        stroke="currentColor"
        strokeLinecap="round"
        d="M8.5 11.5h7M8.5 14.5h5M8.5 17.5h7"
        className={isDuotone ? theme.cssStrokeClass : undefined}
      />
    </svg>
  );
}


