/**
 * Canonical Consultancy Timezone Foundation
 *
 * Provides standard, server-side IANA timezone validation, local-to-UTC conversion,
 * and formatting helpers for general non-financial consultancy operations.
 */

/**
 * Validates whether the given value is a non-empty string and a valid IANA timezone name.
 * Uses native Intl.DateTimeFormat without external dependencies.
 */
export function isValidIanaTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string") {
    return false;
  }
  const trimmed = tz.trim();
  if (trimmed.length === 0 || trimmed.length > 64) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalizes an IANA timezone string.
 * Throws if the timezone is invalid.
 */
export function normalizeIanaTimezone(tz: string): string {
  if (!isValidIanaTimezone(tz)) {
    throw new Error(`Fuso horário inválido: "${tz}". Deve ser um timezone IANA válido (ex: America/Sao_Paulo).`);
  }
  return tz.trim();
}

/**
 * Returns the current (or given instant's) date formatted as YYYY-MM-DD in the consultancy's canonical timezone.
 */
export function getConsultancyLocalDate(timeZone: string, instant: Date = new Date()): string {
  const normalizedTz = normalizeIanaTimezone(timeZone);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizedTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(instant);
}

/**
 * Formats a date/datetime in the consultancy's canonical timezone for user display (DD/MM/AAAA HH:mm).
 */
export function formatConsultancyDateTime(timeZone: string, instant: Date | string): string {
  const normalizedTz = normalizeIanaTimezone(timeZone);
  const dateObj = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(dateObj.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: normalizedTz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

export type ParseLocalDateTimeResult =
  | { success: true; dateUtc: Date }
  | { success: false; error: string };

/**
 * Safely parses a consultancy-local date (YYYY-MM-DD) and time (HH:mm) into an absolute UTC Date instant.
 *
 * Deterministically handles DST edge cases using native Intl.DateTimeFormat:
 * - Rejects invalid formats and nonexistent calendar dates (e.g. 2026-02-30).
 * - Rejects nonexistent local times caused by DST spring-forward transitions (gap).
 * - Rejects ambiguous local times caused by DST fall-back transitions (overlap) to prevent silent misinterpretation.
 */
export function parseConsultancyLocalDateTime(
  timeZone: string,
  dateStr: string,
  timeStr: string
): ParseLocalDateTimeResult {
  if (!isValidIanaTimezone(timeZone)) {
    return { success: false, error: `Fuso horário inválido: "${timeZone}".` };
  }
  const normalizedTz = timeZone.trim();

  const trimmedDate = (dateStr || "").trim();
  const trimmedTime = (timeStr || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return { success: false, error: "Data inválida. Utilize o formato AAAA-MM-DD." };
  }
  if (!/^\d{2}:\d{2}$/.test(trimmedTime)) {
    return { success: false, error: "Horário inválido. Utilize o formato HH:mm." };
  }

  const [yearStr, monthStr, dayStr] = trimmedDate.split("-");
  const [hourStr, minStr] = trimmedTime.split(":");

  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hour = Number(hourStr);
  const minute = Number(minStr);

  if (
    year < 2000 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { success: false, error: "Data ou horário fora dos limites válidos." };
  }

  // Verify calendar day validity
  const utcTestDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcTestDate.getUTCFullYear() !== year ||
    utcTestDate.getUTCMonth() !== month - 1 ||
    utcTestDate.getUTCDate() !== day
  ) {
    return { success: false, error: "Data do calendário inexistente (ex: dia inválido para o mês)." };
  }

  // 1. Initial guess in UTC
  const guessUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: normalizedTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  function getLocalParts(instantMs: number) {
    const parts = dtf.formatToParts(new Date(instantMs));
    let y = 0,
      m = 0,
      d = 0,
      h = 0,
      min = 0;
    for (const p of parts) {
      if (p.type === "year") y = Number(p.value);
      else if (p.type === "month") m = Number(p.value);
      else if (p.type === "day") d = Number(p.value);
      else if (p.type === "hour") h = Number(p.value);
      else if (p.type === "minute") min = Number(p.value);
    }
    return { y, m, d, h, min };
  }

  const p1 = getLocalParts(guessUtc);
  const p1LocalAsUtc = Date.UTC(p1.y, p1.m - 1, p1.d, p1.h, p1.min, 0, 0);
  const offsetDiff = guessUtc - p1LocalAsUtc;
  const candidateUtc = guessUtc + offsetDiff;

  // 2. Round-trip check (catches nonexistent spring-forward times)
  const p2 = getLocalParts(candidateUtc);
  if (p2.y !== year || p2.m !== month || p2.d !== day || p2.h !== hour || p2.min !== minute) {
    return {
      success: false,
      error: "O horário informado não existe neste fuso horário devido à transição de horário de verão (avanço de relógio).",
    };
  }

  // 3. Ambiguity check (catches fall-back overlap times)
  const testOffsets = [-3600000, 3600000, -1800000, 1800000];
  for (const offset of testOffsets) {
    const altUtc = candidateUtc + offset;
    const altP = getLocalParts(altUtc);
    if (altP.y === year && altP.m === month && altP.d === day && altP.h === hour && altP.min === minute) {
      return {
        success: false,
        error: "O horário informado é ambíguo devido à transição de horário de verão (retorno de relógio). Escolha outro horário.",
      };
    }
  }

  return { success: true, dateUtc: new Date(candidateUtc) };
}
