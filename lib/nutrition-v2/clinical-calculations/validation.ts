/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE I — CLINICAL CALCULATIONS VALIDATION & PROVENANCE
 * Safe numeric assertions, bounds checking, and provenance tagging.
 */

import type { CalculationInputValue, InputSource } from "./types";

export class CalculationValidationError extends Error {
  public readonly code: string;
  public readonly statusCode = 400;

  constructor(message: string, code = "INVALID_CALCULATION_INPUT") {
    super(message);
    this.name = "CalculationValidationError";
    this.code = code;
  }
}

/**
 * Validates a positive, finite numeric value within anatomical bounds.
 * Rejects NaN, Infinity, negative values, and zero.
 */
export function validateNumericInput(
  raw: unknown,
  fieldName: string,
  min: number,
  max: number,
  unit = ""
): number {
  if (raw === null || raw === undefined || raw === "") {
    throw new CalculationValidationError(
      `O campo '${fieldName}' é obrigatório para este cálculo.`,
      "MISSING_INPUT"
    );
  }

  const num = typeof raw === "number" ? raw : Number(raw);

  if (Number.isNaN(num)) {
    throw new CalculationValidationError(
      `O valor de '${fieldName}' é inválido (não numérico/NaN).`,
      "NAN_VALUE"
    );
  }

  if (!Number.isFinite(num)) {
    throw new CalculationValidationError(
      `O valor de '${fieldName}' deve ser finito (não infinito).`,
      "INFINITY_VALUE"
    );
  }

  if (num <= 0) {
    throw new CalculationValidationError(
      `O valor de '${fieldName}' deve ser estritamente positivo (maior que zero).`,
      "NON_POSITIVE_VALUE"
    );
  }

  if (num < min || num > max) {
    throw new CalculationValidationError(
      `O valor de '${fieldName}' (${num}${unit ? " " + unit : ""}) está fora dos limites aceitáveis (${min} a ${max}${unit ? " " + unit : ""}).`,
      "OUT_OF_BOUNDS"
    );
  }

  return num;
}

/**
 * Creates an input value object preserving provenance.
 */
export function createInputValue<T = number | string>(
  value: T,
  unit: string,
  source: InputSource,
  sourcePublicId: string | null = null,
  sourceLabel?: string,
  isOverride = false
): CalculationInputValue<T> {
  return {
    value,
    unit,
    source,
    sourcePublicId,
    sourceLabel,
    isOverride,
  };
}
