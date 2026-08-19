/**
 * Canonical Consultancy Timezone Foundation
 *
 * Provides standard, server-side IANA timezone validation and formatting helpers
 * for general non-financial consultancy operations.
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
