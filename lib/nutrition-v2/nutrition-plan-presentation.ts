/**
 * TREVO ONE — Nutrition Plan Pure Presentation Mapper
 *
 * Single source of truth for presentation logic across:
 * - Web Student Cardápio (StudentNutritionV2)
 * - HTML Print View (StudentNutritionV2Print)
 * - Server-Side Vector PDF (@react-pdf/renderer)
 *
 * STRICT RULE: Pure presentation only.
 * NO macro recalculation, NO equivalence tampering, NO business logic modification.
 */

import type { StudentAssignedPlanTreeDto } from "./assignment-repository";

export interface PresentedMealSubstitution {
  id: string;
  foodName: string;
  quantityFormatted: string | null;
  notes: string | null;
}

export interface PresentedMealItem {
  id: string;
  foodName: string;
  quantityFormatted: string | null;
  notes: string | null;
  substitutions: PresentedMealSubstitution[];
}

export interface PresentedMeal {
  id: string;
  title: string;
  timeFormatted: string | null;
  notes: string | null;
  items: PresentedMealItem[];
}

export interface PresentedPlanTotals {
  caloriesKcal: number | null;
  caloriesFormatted: string;
  proteinG: number | null;
  proteinFormatted: string;
  carbohydrateG: number | null;
  carbohydrateFormatted: string;
  fatG: number | null;
  fatFormatted: string;
  hasAnyMacro: boolean;
  isPartial?: boolean;
  status?: "COMPLETE" | "INCOMPLETE" | "EMPTY";
  incompleteItemsCount?: number;
}

export interface PresentedMicronutrientItem {
  code: string;
  name: string;
  valueFormatted: string;
  category: string;
}

export interface PresentedNutritionPlan {
  assignmentPublicId: string;
  title: string;
  subtitle: string | null;
  objective: string | null;
  generalGuidance: string | null;
  notesForStudent: string | null;
  prescriberName: string | null;
  studentName?: string | null;
  consultancyName: string;
  consultancyLogoUrl: string | null;
  periodFormatted: string | null;
  generationDateFormatted: string;
  meals: PresentedMeal[];
  totals: PresentedPlanTotals;
  micronutrients?: PresentedMicronutrientItem[] | null;
  isDraft?: boolean;
}

export interface PresentationOptions {
  studentName?: string | null;
  consultancyName: string;
  consultancyLogoUrl?: string | null;
  prescriberName?: string | null;
}

/**
 * Formats a date string (YYYY-MM-DD) into Brazilian DD/MM/AAAA format.
 */
export function formatDateBr(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const clean = dateStr.split("T")[0];
  const parts = clean.split("-");
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

/**
 * Formats quantity and unit into clean readable string (e.g. "120 g", "2 fatias").
 */
export function formatQuantity(
  qty: number | null | undefined,
  unitLabel?: string | null,
  unitCode?: string | null
): string | null {
  if (qty == null || isNaN(qty)) return null;

  const formattedNum = qty.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const unit = (unitLabel || unitCode || "").trim();
  return unit ? `${formattedNum} ${unit}` : formattedNum;
}

/**
 * Formats macro values safely into string: "XX g" or "—". Never fake 0, NaN, or undefined.
 */
export function formatMacroGram(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "—";
  return `${val.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })} g`;
}

/**
 * Formats calories safely into string: "XXXX kcal" or "—". Never fake 0, NaN, or undefined.
 */
export function formatCaloriesKcal(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return "—";
  return `${Math.round(val).toLocaleString("pt-BR")} kcal`;
}

/**
 * Generates an ASCII-safe filename for PDF downloads without carriage returns,
 * path traversal, or characters that can disrupt HTTP headers.
 */
export function createSafePdfFilename(baseTitle: string, studentName: string): string {
  const sanitize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const safeTitle = sanitize(baseTitle) || "Plano-Alimentar";
  const safeName = sanitize(studentName) || "Aluno";
  return `${safeTitle}-${safeName}.pdf`;
}

/**
 * Pure presentation transformer.
 * Takes the authoritative StudentAssignedPlanTreeDto and structures it for UI, Print, and PDF.
 */
export function presentNutritionPlan(
  assignedPlan: StudentAssignedPlanTreeDto,
  options: PresentationOptions
): PresentedNutritionPlan {
  const { version, meals, totals, notesForStudent, startsOn, endsOn, assignmentPublicId } = assignedPlan;

  // Format period
  const startBr = formatDateBr(startsOn);
  const endBr = formatDateBr(endsOn);
  let periodFormatted: string | null = null;
  if (startBr && endBr) {
    periodFormatted = `${startBr} a ${endBr}`;
  } else if (startBr) {
    periodFormatted = `A partir de ${startBr}`;
  }

  // Format today generation date
  const now = new Date();
  const generationDateFormatted = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1
  ).padStart(2, "0")}/${now.getFullYear()}`;

  // Format totals (strictly preserving source numbers, formatting cleanly, never faking 0)
  const hasAnyMacro =
    totals.caloriesKcal != null ||
    totals.proteinG != null ||
    totals.carbohydrateG != null ||
    totals.fatG != null;

  const presentedTotals: PresentedPlanTotals = {
    caloriesKcal: totals.caloriesKcal,
    caloriesFormatted: formatCaloriesKcal(totals.caloriesKcal),
    proteinG: totals.proteinG,
    proteinFormatted: formatMacroGram(totals.proteinG),
    carbohydrateG: totals.carbohydrateG,
    carbohydrateFormatted: formatMacroGram(totals.carbohydrateG),
    fatG: totals.fatG,
    fatFormatted: formatMacroGram(totals.fatG),
    hasAnyMacro,
    isPartial: Boolean(totals.hasIncompleteData),
    status: totals.status,
    incompleteItemsCount: totals.incompleteItemsCount,
  };

  // Format meals and items (strictly preserving sort_order)
  const presentedMeals: PresentedMeal[] = meals.map((m) => ({
    id: m.publicId,
    title: m.title.trim(),
    timeFormatted: m.scheduledTime ? m.scheduledTime.trim() : null,
    notes: m.notes ? m.notes.trim() : null,
    items: m.items.map((it) => ({
      id: it.publicId,
      foodName: it.foodNameSnapshot.trim(),
      quantityFormatted: formatQuantity(
        it.prescribedQuantity,
        it.prescribedUnitLabel,
        it.prescribedUnitCode
      ),
      notes: it.notes ? it.notes.trim() : null,
      substitutions: it.substitutions.map((sub) => ({
        id: sub.publicId,
        foodName: sub.foodNameSnapshot.trim(),
        quantityFormatted: formatQuantity(
          sub.prescribedQuantity,
          sub.prescribedUnitLabel,
          sub.prescribedUnitCode
        ),
        notes: sub.notes ? sub.notes.trim() : null,
      })),
    })),
  }));

  const presentedMicronutrients: PresentedMicronutrientItem[] = [];
  const microSummary = assignedPlan.totals.micronutrients;
  if (microSummary && microSummary.nutrients) {
    for (const [code, d] of Object.entries(microSummary.nutrients)) {
      if ((d.value && d.value > 0) || d.quantifiedItemCount > 0) {
        presentedMicronutrients.push({
          code,
          name: d.namePtBr,
          valueFormatted: `${Math.round(d.value * 10) / 10} ${d.unit}`,
          category: d.category,
        });
      }
    }
  }

  return {
    assignmentPublicId,
    title: version.title.trim(),
    subtitle: version.subtitle ? version.subtitle.trim() : null,
    objective: version.objective ? version.objective.trim() : null,
    generalGuidance: version.generalGuidance ? version.generalGuidance.trim() : null,
    notesForStudent: notesForStudent ? notesForStudent.trim() : null,
    prescriberName: assignedPlan.prescriberName || options.prescriberName || null,
    studentName: options.studentName ? options.studentName.trim() : null,
    consultancyName: options.consultancyName.trim(),
    consultancyLogoUrl: options.consultancyLogoUrl || null,
    periodFormatted,
    generationDateFormatted,
    meals: presentedMeals,
    totals: presentedTotals,
    micronutrients: presentedMicronutrients.length > 0 ? presentedMicronutrients : null,
  };
}

/**
 * Pure presentation transformer for unassigned or builder plans (PlanVersionTreeDto).
 * Allows nutritionists and consultancy admins to export clean PDFs directly from the builder.
 */
export function presentNutritionPlanFromVersionTree(
  tree: {
    plan: { publicId: string };
    version: {
      title: string;
      subtitle: string | null;
      objective: string | null;
      generalGuidance: string | null;
      notes: string | null;
      status?: string | null;
    };
    meals: Array<{
      publicId: string;
      title: string;
      scheduledTime: string | null;
      notes: string | null;
      items: Array<{
        publicId: string;
        foodNameSnapshot: string;
        prescribedQuantity: number | null;
        prescribedUnitLabel: string | null;
        prescribedUnitCode: string | null;
        notes: string | null;
        substitutions: Array<{
          publicId: string;
          foodNameSnapshot: string;
          prescribedQuantity: number | null;
          prescribedUnitLabel: string | null;
          prescribedUnitCode: string | null;
          notes: string | null;
        }>;
      }>;
    }>;
    dailyTotals: {
      caloriesKcal: number | null;
      proteinG: number | null;
      carbohydrateG: number | null;
      fatG: number | null;
    };
    dailyMicronutrientTotals?: {
      nutrients?: Record<string, { namePtBr: string; unit: string; value: number; category: string; quantifiedItemCount?: number }>;
    } | null;
  },
  options: PresentationOptions
): PresentedNutritionPlan {
  const { version, meals, dailyTotals } = tree;
  const now = new Date();
  const generationDateFormatted = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1
  ).padStart(2, "0")}/${now.getFullYear()}`;

  const hasAnyMacro =
    dailyTotals.caloriesKcal != null ||
    dailyTotals.proteinG != null ||
    dailyTotals.carbohydrateG != null ||
    dailyTotals.fatG != null;

  const presentedTotals: PresentedPlanTotals = {
    caloriesKcal: dailyTotals.caloriesKcal,
    caloriesFormatted: formatCaloriesKcal(dailyTotals.caloriesKcal),
    proteinG: dailyTotals.proteinG,
    proteinFormatted: formatMacroGram(dailyTotals.proteinG),
    carbohydrateG: dailyTotals.carbohydrateG,
    carbohydrateFormatted: formatMacroGram(dailyTotals.carbohydrateG),
    fatG: dailyTotals.fatG,
    fatFormatted: formatMacroGram(dailyTotals.fatG),
    hasAnyMacro,
  };

  const presentedMeals: PresentedMeal[] = meals.map((m) => ({
    id: m.publicId,
    title: m.title.trim(),
    timeFormatted: m.scheduledTime ? m.scheduledTime.trim() : null,
    notes: m.notes ? m.notes.trim() : null,
    items: m.items.map((it) => ({
      id: it.publicId,
      foodName: it.foodNameSnapshot.trim(),
      quantityFormatted: formatQuantity(
        it.prescribedQuantity,
        it.prescribedUnitLabel,
        it.prescribedUnitCode
      ),
      notes: it.notes ? it.notes.trim() : null,
      substitutions: it.substitutions.map((sub) => ({
        id: sub.publicId,
        foodName: sub.foodNameSnapshot.trim(),
        quantityFormatted: formatQuantity(
          sub.prescribedQuantity,
          sub.prescribedUnitLabel,
          sub.prescribedUnitCode
        ),
        notes: sub.notes ? sub.notes.trim() : null,
      })),
    })),
  }));

  const presentedMicronutrients: PresentedMicronutrientItem[] = [];
  const microSummary = tree.dailyMicronutrientTotals;
  if (microSummary && microSummary.nutrients) {
    for (const [code, d] of Object.entries(microSummary.nutrients)) {
      if ((d.value && d.value > 0) || (d.quantifiedItemCount != null && d.quantifiedItemCount > 0)) {
        presentedMicronutrients.push({
          code,
          name: d.namePtBr,
          valueFormatted: `${Math.round(d.value * 10) / 10} ${d.unit}`,
          category: d.category,
        });
      }
    }
  }

  return {
    assignmentPublicId: tree.plan.publicId,
    title: version.title.trim(),
    subtitle: version.subtitle ? version.subtitle.trim() : null,
    objective: version.objective ? version.objective.trim() : null,
    generalGuidance: version.generalGuidance ? version.generalGuidance.trim() : null,
    notesForStudent: version.notes ? version.notes.trim() : null,
    prescriberName: options.prescriberName || null,
    studentName: options.studentName?.trim() || null,
    consultancyName: options.consultancyName.trim(),
    consultancyLogoUrl: options.consultancyLogoUrl || null,
    periodFormatted: null,
    generationDateFormatted,
    meals: presentedMeals,
    totals: presentedTotals,
    micronutrients: presentedMicronutrients.length > 0 ? presentedMicronutrients : null,
    isDraft: version.status === "DRAFT" || version.status == null,
  };
}
