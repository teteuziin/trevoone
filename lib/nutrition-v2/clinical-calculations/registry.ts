/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE I — CLINICAL FORMULA REGISTRY
 * Authoritative central registry for versioned clinical & metabolic formulas.
 */

import type { CalculationCode, FormulaDefinition } from "./types";
import { BMI_STANDARD_FORMULA } from "./formulas/bmi";
import { SPEC_REQUIRED_FORMULAS } from "./formulas/stubs";

class FormulaRegistry {
  private readonly formulas = new Map<string, FormulaDefinition>();

  constructor() {
    // Register approved standard formulas
    this.register(BMI_STANDARD_FORMULA);

    // Register spec-required stubs
    for (const stub of SPEC_REQUIRED_FORMULAS) {
      this.register(stub);
    }
  }

  public register(formula: FormulaDefinition): void {
    if (!formula.code || !formula.version) {
      throw new Error("Fórmula deve ter código e versão definidos.");
    }
    if (this.formulas.has(formula.code)) {
      throw new Error(`Fórmula com código '${formula.code}' já está registrada.`);
    }
    this.formulas.set(formula.code, Object.freeze({ ...formula }));
  }

  public get(code: string): FormulaDefinition | null {
    return this.formulas.get(code) || null;
  }

  public listAll(): FormulaDefinition[] {
    return Array.from(this.formulas.values());
  }

  public listByCalculation(calcCode: CalculationCode): FormulaDefinition[] {
    return Array.from(this.formulas.values()).filter(
      (f) => f.calculationCode === calcCode
    );
  }

  public listApproved(): FormulaDefinition[] {
    return Array.from(this.formulas.values()).filter(
      (f) => f.status === "APPROVED"
    );
  }
}

export const clinicalFormulaRegistry = new FormulaRegistry();
