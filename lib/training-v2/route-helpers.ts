/**
 * TREVO ONE — TRAINING V2 ROUTE HELPERS
 * Pure URL builders for training execution, blocks, and assignments.
 * Safe to import in both Client and Server Components (zero server dependencies).
 */

export function buildStudentWorkoutExecutionUrl(
  consultancySlug: string,
  assignmentPublicId: string,
  blockPublicId?: string | null
): string {
  const base = `/consultoria/${consultancySlug}/treinos/${assignmentPublicId}`;
  return blockPublicId ? `${base}?bloco=${blockPublicId}` : base;
}

/**
 * Normaliza texto e extrai os dias da semana prescritos (0 = Domingo ... 6 = Sábado).
 * Seguro para importação em Client e Server Components (zero dependências de servidor).
 */
export function parseScheduledWeekdays(
  title?: string | null,
  instructions?: string | null
): number[] {
  const text = `${title || ""} ${instructions || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos

  const days: number[] = [];

  if (/\b(segunda(?:-feira)?|seg)\b/.test(text)) days.push(1);
  if (/\b(terca(?:-feira)?|terça(?:-feira)?|ter)\b/.test(text)) days.push(2);
  if (/\b(quarta(?:-feira)?|qua)\b/.test(text)) days.push(3);
  if (/\b(quinta(?:-feira)?|qui)\b/.test(text)) days.push(4);
  if (/\b(sexta(?:-feira)?|sex)\b/.test(text)) days.push(5);
  if (/\b(sabado|sab)\b/.test(text)) days.push(6);
  if (/\b(domingo|dom)\b/.test(text)) days.push(0);

  return Array.from(new Set(days)).sort((a, b) => a - b);
}

const WEEKDAY_NAMES_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const WEEKDAY_SHORT_NAMES_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function formatScheduledWeekdaysLabel(days: number[]): string | null {
  if (!days || days.length === 0) return null;
  if (days.length === 1) {
    return WEEKDAY_NAMES_PT[days[0]];
  }
  return days.map((d) => WEEKDAY_SHORT_NAMES_PT[d]).join(", ");
}

