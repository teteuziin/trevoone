/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE J — CLINICAL CALCULATIONS DOMAIN, REGISTRY & ENGINE
 *
 * Safe, versioned, traceable, transparent clinical calculation architecture.
 * Strict decision-support principles:
 * - Deterministic WHO Standard BMI with clinical classification helper
 * - Versioned BMR equations: Mifflin-St Jeor (1990) and Harris-Benedict Revised (1984)
 * - Traceable TDEE with explicit activity factor selection
 * - Strict input provenance (Anthropometrics > Onboarding reference > Manual override)
 * - Manual calculation simulation overrides do NOT mutate patient records or measurement history
 * - Unknown inputs remain unknown (never coerced to zero)
 * - Rejects NaN, Infinity, negative, and zero values where anatomically invalid
 */

export * from "./types";
export * from "./validation";
export * from "./formulas/bmi";
export * from "./formulas/bmr";
export * from "./formulas/stubs";
export * from "./registry";
export * from "./engine";
