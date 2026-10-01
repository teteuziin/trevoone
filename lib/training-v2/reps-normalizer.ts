/**
 * TREVO ONE — REPETITION RANGE & EXACT REPETITION NORMALIZER
 * Handles deterministic parsing, validation, and presentation of exact repetitions,
 * repetition ranges (e.g. "8-12", "8 a 12", "8 até 12", "10"), durations (e.g. "30s"),
 * and failure/maximum intensity indicators (e.g. "até a falha").
 */

export interface ParsedReps {
  repsMin: number | null;
  repsMax: number | null;
  durationSeconds?: number | null;
  intensityIndicator?: string | null;
  formatted: string;
}

/**
 * Normalizes user input or raw strings into structured min and max repetitions,
 * duration, or failure intensity.
 * Rules:
 * - Exact reps: "10" -> min: 10, max: null, formatted: "10 reps"
 * - Range: "8-12", "8 - 12", "8 – 12", "8 a 12", "8 até 12" -> min: 8, max: 12, formatted: "8–12 reps"
 * - Duration: "30s", "45 seg", "60 segundos" -> durationSeconds: 30, formatted: "30s"
 * - Intensity: "até a falha", "falha", "máximo" -> intensityIndicator: "Até a falha", formatted: "Até a falha"
 * - Validation: min >= 1, max >= min, max <= 300
 * - Blocks: "12-8", "0-12", "-5", invalid text, null, NaN
 */
export function parseRepsInput(input: string | number | null | undefined): ParsedReps | null {
  if (input === null || input === undefined) return null;

  if (typeof input === "number") {
    if (!Number.isInteger(input) || input < 1 || input > 300) return null;
    return { repsMin: input, repsMax: null, formatted: `${input} reps` };
  }

  const str = input.trim();
  if (!str) return null;

  // 1. Failure / Maximum Intensity: "até a falha", "ate a falha", "falha", "máximo", "maximo"
  if (/^(?:at[eé]\s*a\s*falha|falha)$/i.test(str)) {
    return {
      repsMin: null,
      repsMax: null,
      intensityIndicator: "Até a falha",
      formatted: "Até a falha",
    };
  }

  if (/^(?:m[aá]x(?:imo)?(?:\s*de\s*repeti[cç][oõ]es)?|max\s*reps?)$/i.test(str)) {
    return {
      repsMin: null,
      repsMax: null,
      intensityIndicator: "Máximo de repetições",
      formatted: "Máx reps",
    };
  }

  // 2. Duration in Minutes or Seconds: "2 min", "2m", "1 minuto", "1.5 min", "1,5 min", "30s", "45 seg", "60 segundos"
  const minutesMatch = str.match(/^(\d+(?:[.,]\d+)?)\s*(?:m|min|minutos?)$/i);
  if (minutesMatch) {
    const mins = parseFloat(minutesMatch[1].replace(",", "."));
    if (mins > 0 && mins <= 180) {
      const sec = Math.round(mins * 60);
      return {
        repsMin: null,
        repsMax: null,
        durationSeconds: sec,
        formatted: formatDurationToMinutes(sec),
      };
    }
  }

  const durationMatch = str.match(/^(\d+)\s*(?:s|seg|segundos?)$/i);
  if (durationMatch) {
    const sec = parseInt(durationMatch[1], 10);
    if (sec > 0 && sec <= 10800) {
      return {
        repsMin: null,
        repsMax: null,
        durationSeconds: sec,
        formatted: formatDurationToMinutes(sec),
      };
    }
  }

  // 3. Single exact integer: "10", "10 reps", "10 repetições"
  const singleMatch = str.match(/^(\d+)(?:\s*(?:reps?|repetiç(?:ão|ões)))?$/i);
  if (singleMatch) {
    const val = parseInt(singleMatch[1], 10);
    if (val < 1 || val > 300) return null;
    return { repsMin: val, repsMax: null, formatted: `${val} reps` };
  }

  // 4. Range pattern: "8-12", "8 - 12", "8 – 12", "8 a 12", "8 até 12", "8 ate 12"
  const rangeMatch = str.match(/^(\d+)\s*(?:-|–|—|a|at[eé])\s*(\d+)(?:\s*(?:reps?|repetiç(?:ão|ões)))?$/i);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    if (min < 1 || max < min || max > 300) return null;
    if (min === max) {
      return { repsMin: min, repsMax: null, formatted: `${min} reps` };
    }
    return { repsMin: min, repsMax: max, formatted: `${min}–${max} reps` };
  }

  return null;
}

/**
 * Deterministic formatting for UI and PDF representations.
 * Never outputs confusing formats like "8 - 12 - 0".
 */
export function formatRepetitionRange(
  repsMin: number | null | undefined,
  repsMax: number | null | undefined,
  fallback = "—"
): string {
  if (repsMin == null || repsMin <= 0) return fallback;
  if (repsMax != null && repsMax > repsMin) {
    return `${repsMin}–${repsMax} reps`;
  }
  return `${repsMin} reps`;
}

/**
 * Formats duration in seconds into a friendly user representation in minutes.
 * Examples:
 * - 120 -> "2 min"
 * - 60  -> "1 min"
 * - 90  -> "1,5 min"
 * - 30  -> "0,5 min"
 */
export function formatDurationToMinutes(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "";
  const minutes = seconds / 60;
  if (Number.isInteger(minutes)) {
    return `${minutes} min`;
  }
  const rounded = Math.round(minutes * 10) / 10;
  return `${rounded.toString().replace(".", ",")} min`;
}

/**
 * Natural duration representation in Portuguese for Student Runtime, Builder, and PDF.
 * If prescribed in minutes (or exact multiple of 60s when specified), returns e.g. "1 minuto", "2 minutos", "10 minutos".
 * If prescribed in seconds, returns e.g. "30 segundos", "45 segundos".
 * Never shows confusing fractional minutes like "0,8 min" or "120 sec".
 */
export function formatDurationNatural(
  seconds: number | null | undefined,
  unit?: "SECONDS" | "MINUTES" | string | null
): string {
  if (seconds == null || seconds <= 0) return "";
  if (unit === "MINUTES" || (unit !== "SECONDS" && seconds >= 60 && seconds % 60 === 0)) {
    const mins = Math.round(seconds / 60);
    return `${mins} ${mins === 1 ? "minuto" : "minutos"}`;
  }
  return `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
}
