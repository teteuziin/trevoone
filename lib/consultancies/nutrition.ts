import crypto from "node:crypto";
import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { resolveConsultancyContext } from "./context";
import {
  createNotificationInTransaction,
  deliverNotificationAfterCommit,
} from "@/services/notification-service";
import {
  calculateItemMacros,
  type MacroCalculationInput,
  type CalculatedMacros,
} from "./nutrition-calc";
import {
  calculateChoiceGroupTotals,
  calculateSectionTotals,
  calculateMealOptionTotals,
  calculateMealTotals,
  calculatePlanTotals,
  formatMacroValue,
  formatMacroRange,
  type NutritionMacroValues,
  type NutritionMacroRange,
} from "./nutrition-totals";

export {
  calculateItemMacros,
  calculateChoiceGroupTotals,
  calculateSectionTotals,
  calculateMealOptionTotals,
  calculateMealTotals,
  calculatePlanTotals,
  formatMacroValue,
  formatMacroRange,
  type MacroCalculationInput,
  type CalculatedMacros,
  type NutritionMacroValues,
  type NutritionMacroRange,
};

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type NutritionFoodStatus = "ACTIVE" | "INACTIVE";
export type NutritionFoodSourceType = "MANUAL" | "EXTERNAL";
export type NutritionPlanStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type NutritionReferenceUnit = "G" | "ML" | "UNIT";

export const ALLOWED_REFERENCE_UNITS: readonly NutritionReferenceUnit[] = [
  "G",
  "ML",
  "UNIT",
];

export type ValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export type NutritionPlanReadinessResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export type NutritionFoodPortionDto = {
  publicId: string;
  label: string;
  equivalentReferenceAmount: number;
  status: NutritionFoodStatus;
  sortOrder: number;
};

export type NutritionFoodDto = {
  publicId: string;
  name: string;
  category: string | null;
  referenceAmount: number;
  referenceUnit: string;
  caloriesKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  status: NutritionFoodStatus;
  sourceType: NutritionFoodSourceType;
  sourceKey: string | null;
  sourceLabel: string | null;
  sourceExternalCode: string | null;
  sourceVersion: string | null;
  sourceReference: string | null;
  sourceImportedAt: Date | null;
  portions: NutritionFoodPortionDto[];
};

export type NutritionMealItemDto = {
  publicId: string;
  foodPublicId: string | null;
  foodPortionPublicId: string | null;
  sortOrder: number;
  foodNameSnapshot: string;
  categorySnapshot: string | null;
  referenceAmountSnapshot: number | null;
  referenceUnitSnapshot: string | null;
  caloriesReferenceSnapshot: number | null;
  proteinReferenceSnapshot: number | null;
  carbohydrateReferenceSnapshot: number | null;
  fatReferenceSnapshot: number | null;
  portionLabelSnapshot: string | null;
  equivalentReferenceAmountSnapshot: number | null;
  prescribedQuantity: number;
  prescribedUnitLabel: string;
  calculatedCalories: number | null;
  calculatedProtein: number | null;
  calculatedCarbohydrate: number | null;
  calculatedFat: number | null;
  notes: string | null;
};

export type NutritionMealChoiceGroupDto = {
  publicId: string;
  title: string | null;
  selectionMin: number;
  selectionMax: number;
  sortOrder: number;
  items: NutritionMealItemDto[];
};

export type NutritionMealSectionDto = {
  publicId: string;
  categoryKey: string | null;
  title: string;
  sortOrder: number;
  choiceGroups: NutritionMealChoiceGroupDto[];
};

export type NutritionMealOptionDto = {
  publicId: string;
  title: string | null;
  description: string | null;
  sortOrder: number;
  sections: NutritionMealSectionDto[];
  totals?: NutritionMacroRange | null;
};

export type NutritionMealDto = {
  publicId: string;
  title: string;
  scheduledTime: string | null;
  notes: string | null;
  sortOrder: number;
  options: NutritionMealOptionDto[];
  totals?: NutritionMacroRange | null;
};

export type NutritionPlanDto = {
  publicId: string;
  consultancyPublicId: string;
  title: string;
  subtitle: string | null;
  generalGuidance: string | null;
  status: NutritionPlanStatus | string;
  startsOn: string | null;
  endsOn: string | null;
  activatedAt: Date | null;
  archivedAt: Date | null;
  meals: NutritionMealDto[];
  totals?: NutritionMacroRange | null;
};

export type NutritionistPlanEditorDto = NutritionPlanDto & {
  studentName: string;
  studentEmail: string;
  studentMembershipPublicId: string;
};

// ============================================================================
// TEXT NORMALIZATION & PURE CALCULATION HELPERS
// ============================================================================

/**
 * Normaliza strings de texto para busca determinística:
 * remove acentos/diacríticos, normaliza espaços em branco e passa para minúsculas.
 */
export function normalizeSearchText(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Valida e converte entrada de valor decimal com rigor estrito de precisão (até 2 casas decimais).
 * Suporta vírgula ou ponto como separador e rejeita valores negativos, NaN, Infinity ou precisão excedente.
 */
export function parseAndValidateDecimal(
  rawValue: unknown,
  fieldName: string,
  options: { min?: number; max?: number; allowZero?: boolean } = {}
): { valid: true; value: number } | { valid: false; error: string } {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return { valid: false, error: `O campo ${fieldName} é obrigatório.` };
  }

  const str = String(rawValue).trim();
  if (!str) {
    return { valid: false, error: `O campo ${fieldName} é obrigatório.` };
  }

  // Permite vírgula ou ponto
  const normalizedStr = str.replace(",", ".");

  // Regex para número decimal com até 2 casas decimais, sem notação científica
  if (!/^\d+(\.\d{1,2})?$/.test(normalizedStr)) {
    return {
      valid: false,
      error: `O campo ${fieldName} deve ser um número válido com no máximo 2 casas decimais.`,
    };
  }

  const num = Number(normalizedStr);
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return { valid: false, error: `O campo ${fieldName} é inválido.` };
  }

  const min = options.min !== undefined ? options.min : options.allowZero === false ? 0.01 : 0;
  if (num < min) {
    return {
      valid: false,
      error:
        options.allowZero === false
          ? `O campo ${fieldName} deve ser maior que zero.`
          : `O campo ${fieldName} não pode ser negativo.`,
    };
  }

  const max = options.max !== undefined ? options.max : 99999999.99;
  if (num > max) {
    return { valid: false, error: `O campo ${fieldName} excede o valor máximo permitido.` };
  }

  return { valid: true, value: num };
}

// ============================================================================
// FOOD LIBRARY SERVICE (NUTRITIONIST ONLY)
// ============================================================================

export type SearchFoodsParams = {
  actorUserId: number;
  consultancySlug: string;
  query: string;
  limit?: number;
};

/**
 * Busca alimentos da biblioteca para o Nutricionista (autocomplete backend foundation).
 * Hard maximum de 20 itens, tenant-scoped, busca por prefixo e aliases sem N+1.
 */
export async function searchFoodsForNutritionist({
  actorUserId,
  consultancySlug,
  query,
  limit = 20,
}: SearchFoodsParams): Promise<NutritionFoodDto[]> {
  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !consultancySlug.trim()
  ) {
    return [];
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return [];
  }

  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  const clampedLimit = Math.min(Math.max(1, Number(limit) || 20), 20);

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const searchPattern = `${normalizedQuery}%`;

    const [foodRows] = await connection.execute<RowDataPacket[]>(
      `SELECT DISTINCT
        f.id,
        f.public_id,
        f.name,
        f.category,
        f.reference_amount,
        f.reference_unit,
        f.calories_kcal,
        f.protein_g,
        f.carbohydrate_g,
        f.fat_g,
        f.status,
        f.source_type,
        f.source_key,
        f.source_label,
        f.source_external_code,
        f.source_version,
        f.source_reference,
        f.source_imported_at
       FROM nutrition_foods f
       LEFT JOIN nutrition_food_aliases a ON a.food_id = f.id
       WHERE f.consultancy_id = ?
         AND f.status = 'ACTIVE'
         AND f.deleted_at IS NULL
         AND (f.normalized_name LIKE ? OR a.normalized_alias LIKE ?)
       ORDER BY
         CASE WHEN f.normalized_name LIKE ? THEN 0 ELSE 1 END,
         f.normalized_name ASC
       LIMIT ?;`,
      [context.consultancyId, searchPattern, searchPattern, searchPattern, clampedLimit]
    );

    if (!Array.isArray(foodRows) || foodRows.length === 0) {
      return [];
    }

    const foodIds = foodRows.map((r) => Number(r.id));

    // Carregar porções dos alimentos encontrados em batch (sem N+1)
    const placeholders = foodIds.map(() => "?").join(",");
    const [portionRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        p.id,
        p.public_id,
        p.food_id,
        p.label,
        p.equivalent_reference_amount,
        p.status,
        p.sort_order
       FROM nutrition_food_portions p
       WHERE p.food_id IN (${placeholders})
         AND p.status = 'ACTIVE'
         AND p.deleted_at IS NULL
       ORDER BY p.sort_order ASC;`,
      foodIds
    );

    const portionsByFoodId = new Map<number, NutritionFoodPortionDto[]>();
    for (const p of portionRows) {
      const fId = Number(p.food_id);
      if (!portionsByFoodId.has(fId)) {
        portionsByFoodId.set(fId, []);
      }
      portionsByFoodId.get(fId)!.push({
        publicId: String(p.public_id),
        label: String(p.label),
        equivalentReferenceAmount: Number(p.equivalent_reference_amount),
        status: p.status as NutritionFoodStatus,
        sortOrder: Number(p.sort_order),
      });
    }

    return foodRows.map((r) => ({
      publicId: String(r.public_id),
      name: String(r.name),
      category: r.category ? String(r.category) : null,
      referenceAmount: Number(r.reference_amount),
      referenceUnit: String(r.reference_unit),
      caloriesKcal: Number(r.calories_kcal),
      proteinG: Number(r.protein_g),
      carbohydrateG: Number(r.carbohydrate_g),
      fatG: Number(r.fat_g),
      status: r.status as NutritionFoodStatus,
      sourceType: (r.source_type || "MANUAL") as NutritionFoodSourceType,
      sourceKey: r.source_key ? String(r.source_key) : null,
      sourceLabel: r.source_label ? String(r.source_label) : null,
      sourceExternalCode: r.source_external_code ? String(r.source_external_code) : null,
      sourceVersion: r.source_version ? String(r.source_version) : null,
      sourceReference: r.source_reference ? String(r.source_reference) : null,
      sourceImportedAt: r.source_imported_at ? new Date(r.source_imported_at) : null,
      portions: portionsByFoodId.get(Number(r.id)) || [],
    }));
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type ListNutritionFoodsParams = {
  actorUserId: number;
  consultancySlug: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type NutritionFoodListItemDto = {
  publicId: string;
  name: string;
  category: string | null;
  referenceAmount: number;
  referenceUnit: string;
  caloriesKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  status: NutritionFoodStatus;
  sourceType: NutritionFoodSourceType;
  sourceKey: string | null;
  sourceLabel: string | null;
  sourceExternalCode: string | null;
  sourceVersion: string | null;
};

export type ListNutritionFoodsResult = {
  items: NutritionFoodListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/**
 * Lista alimentos paginados da biblioteca da consultoria para o Nutricionista.
 * Suporta busca por prefixo e aliases com paginação server-side determinística.
 */
export async function listNutritionFoodsForNutritionist({
  actorUserId,
  consultancySlug,
  search = "",
  page = 1,
  pageSize = 24,
}: ListNutritionFoodsParams): Promise<ListNutritionFoodsResult> {
  const defaultResult: ListNutritionFoodsResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 24,
    totalPages: 1,
  };

  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !consultancySlug.trim()
  ) {
    return defaultResult;
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return defaultResult;
  }

  const normalizedQuery = normalizeSearchText(search);
  const isSearchActive = normalizedQuery.length >= 2;

  const validPageSize =
    typeof pageSize === "number" && Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100
      ? pageSize
      : 24;
  const parsedPage = Number(page);
  const initialPage = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    let countSql = `
      SELECT COUNT(DISTINCT f.id) AS total
      FROM nutrition_foods f
      LEFT JOIN nutrition_food_aliases a ON a.food_id = f.id
      WHERE f.consultancy_id = ?
        AND f.status = 'ACTIVE'
        AND f.deleted_at IS NULL
    `;
    const countParams: (string | number)[] = [context.consultancyId];

    if (isSearchActive) {
      const searchPattern = `${normalizedQuery}%`;
      countSql += ` AND (f.normalized_name LIKE ? OR a.normalized_alias LIKE ?)`;
      countParams.push(searchPattern, searchPattern);
    }

    const [countRows] = await connection.execute<RowDataPacket[]>(countSql, countParams);
    const total = Number(countRows[0]?.total || 0);

    if (total === 0) {
      return {
        items: [],
        total: 0,
        page: 1,
        pageSize: validPageSize,
        totalPages: 1,
      };
    }

    const totalPages = Math.max(1, Math.ceil(total / validPageSize));
    const validPage = Math.min(initialPage, totalPages);
    const offset = (validPage - 1) * validPageSize;

    let selectSql = `
      SELECT DISTINCT
        f.public_id,
        f.name,
        f.category,
        f.reference_amount,
        f.reference_unit,
        f.calories_kcal,
        f.protein_g,
        f.carbohydrate_g,
        f.fat_g,
        f.status,
        f.source_type,
        f.source_key,
        f.source_label,
        f.source_external_code,
        f.source_version,
        f.normalized_name
      FROM nutrition_foods f
      LEFT JOIN nutrition_food_aliases a ON a.food_id = f.id
      WHERE f.consultancy_id = ?
        AND f.status = 'ACTIVE'
        AND f.deleted_at IS NULL
    `;
    const selectParams: (string | number)[] = [context.consultancyId];

    if (isSearchActive) {
      const searchPattern = `${normalizedQuery}%`;
      selectSql += ` AND (f.normalized_name LIKE ? OR a.normalized_alias LIKE ?)`;
      selectParams.push(searchPattern, searchPattern);
    }

    selectSql += `
      ORDER BY f.normalized_name ASC, f.public_id ASC
      LIMIT ? OFFSET ?;
    `;
    selectParams.push(validPageSize, offset);

    const [foodRows] = await connection.execute<RowDataPacket[]>(selectSql, selectParams);

    const items: NutritionFoodListItemDto[] = (foodRows || []).map((r) => ({
      publicId: String(r.public_id),
      name: String(r.name),
      category: r.category ? String(r.category) : null,
      referenceAmount: Number(r.reference_amount),
      referenceUnit: String(r.reference_unit),
      caloriesKcal: Number(r.calories_kcal),
      proteinG: Number(r.protein_g),
      carbohydrateG: Number(r.carbohydrate_g),
      fatG: Number(r.fat_g),
      status: r.status as NutritionFoodStatus,
      sourceType: (r.source_type || "MANUAL") as NutritionFoodSourceType,
      sourceKey: r.source_key ? String(r.source_key) : null,
      sourceLabel: r.source_label ? String(r.source_label) : null,
      sourceExternalCode: r.source_external_code ? String(r.source_external_code) : null,
      sourceVersion: r.source_version ? String(r.source_version) : null,
    }));

    return {
      items,
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export const getNutritionFoodForNutritionist = getFoodDetailsForNutritionist;


export type GetFoodDetailsParams = {
  actorUserId: number;
  consultancySlug: string;
  foodPublicId: string;
};

/**
 * Obtém detalhes completos de um alimento da biblioteca da consultoria.
 */
export async function getFoodDetailsForNutritionist({
  actorUserId,
  consultancySlug,
  foodPublicId,
}: GetFoodDetailsParams): Promise<NutritionFoodDto | null> {
  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !foodPublicId ||
    typeof foodPublicId !== "string"
  ) {
    return null;
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return null;
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const [foodRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        f.id,
        f.public_id,
        f.name,
        f.category,
        f.reference_amount,
        f.reference_unit,
        f.calories_kcal,
        f.protein_g,
        f.carbohydrate_g,
        f.fat_g,
        f.status,
        f.source_type,
        f.source_key,
        f.source_label,
        f.source_external_code,
        f.source_version,
        f.source_reference,
        f.source_imported_at
       FROM nutrition_foods f
       WHERE f.consultancy_id = ?
         AND f.public_id = ?
         AND f.deleted_at IS NULL
       LIMIT 1;`,
      [context.consultancyId, foodPublicId]
    );

    if (!Array.isArray(foodRows) || foodRows.length === 0) {
      return null;
    }

    const foodRow = foodRows[0];
    const foodId = Number(foodRow.id);

    const [portionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        p.public_id,
        p.label,
        p.equivalent_reference_amount,
        p.status,
        p.sort_order
       FROM nutrition_food_portions p
       WHERE p.food_id = ?
         AND p.deleted_at IS NULL
       ORDER BY p.sort_order ASC;`,
      [foodId]
    );

    const portions: NutritionFoodPortionDto[] = (portionRows || []).map((p) => ({
      publicId: String(p.public_id),
      label: String(p.label),
      equivalentReferenceAmount: Number(p.equivalent_reference_amount),
      status: p.status as NutritionFoodStatus,
      sortOrder: Number(p.sort_order),
    }));

    return {
      publicId: String(foodRow.public_id),
      name: String(foodRow.name),
      category: foodRow.category ? String(foodRow.category) : null,
      referenceAmount: Number(foodRow.reference_amount),
      referenceUnit: String(foodRow.reference_unit),
      caloriesKcal: Number(foodRow.calories_kcal),
      proteinG: Number(foodRow.protein_g),
      carbohydrateG: Number(foodRow.carbohydrate_g),
      fatG: Number(foodRow.fat_g),
      status: foodRow.status as NutritionFoodStatus,
      sourceType: (foodRow.source_type || "MANUAL") as NutritionFoodSourceType,
      sourceKey: foodRow.source_key ? String(foodRow.source_key) : null,
      sourceLabel: foodRow.source_label ? String(foodRow.source_label) : null,
      sourceExternalCode: foodRow.source_external_code ? String(foodRow.source_external_code) : null,
      sourceVersion: foodRow.source_version ? String(foodRow.source_version) : null,
      sourceReference: foodRow.source_reference ? String(foodRow.source_reference) : null,
      sourceImportedAt: foodRow.source_imported_at ? new Date(foodRow.source_imported_at) : null,
      portions,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// MANUAL FOOD MANAGEMENT (NUTRITIONIST ONLY)
// ============================================================================

export type CreateManualNutritionFoodParams = {
  actorUserId: number;
  consultancySlug: string;
  name: string;
  referenceAmount: number | string;
  referenceUnit: string;
  caloriesKcal: number | string;
  proteinG: number | string;
  carbohydrateG: number | string;
  fatG: number | string;
};

export type CreateManualNutritionFoodResult =
  | { success: true; foodPublicId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export type UpdateManualNutritionFoodParams = {
  actorUserId: number;
  consultancySlug: string;
  foodPublicId: string;
  name: string;
  referenceAmount: number | string;
  referenceUnit: string;
  caloriesKcal: number | string;
  proteinG: number | string;
  carbohydrateG: number | string;
  fatG: number | string;
};

export type UpdateManualNutritionFoodResult =
  | { success: true; updated: boolean; foodPublicId: string; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export type InactivateManualNutritionFoodParams = {
  actorUserId: number;
  consultancySlug: string;
  foodPublicId: string;
};

export type InactivateManualNutritionFoodResult =
  | { success: true; inactivated: boolean; message?: string }
  | { success: false; error: string };

/**
 * Cadastra um novo alimento MANUAL na biblioteca da consultoria (NUTRITIONIST obrigatório).
 */
export async function createManualNutritionFood(
  params: CreateManualNutritionFoodParams
): Promise<CreateManualNutritionFoodResult> {
  const { actorUserId, consultancySlug } = params;

  if (!actorUserId || typeof actorUserId !== "number" || actorUserId <= 0) {
    return { success: false, error: "Usuário não autenticado." };
  }
  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { success: false, error: "Consultoria inválida." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Permissão insuficiente para cadastrar alimentos." };
  }

  const fieldErrors: Record<string, string> = {};

  const name = String(params.name || "").trim().normalize("NFC");
  if (!name) {
    fieldErrors.name = "O nome do alimento é obrigatório.";
  } else if (name.length > 255) {
    fieldErrors.name = "O nome deve ter no máximo 255 caracteres.";
  }

  const refUnit = String(params.referenceUnit || "").trim().toUpperCase();
  if (!ALLOWED_REFERENCE_UNITS.includes(refUnit as NutritionReferenceUnit)) {
    fieldErrors.referenceUnit = "Unidade de referência inválida. Permitidas: G, ML ou UNIT.";
  }

  const refAmountVal = parseAndValidateDecimal(params.referenceAmount, "Quantidade de referência", { allowZero: false });
  if (!refAmountVal.valid) {
    fieldErrors.referenceAmount = refAmountVal.error;
  }

  const calVal = parseAndValidateDecimal(params.caloriesKcal, "Calorias", { allowZero: true });
  if (!calVal.valid) {
    fieldErrors.caloriesKcal = calVal.error;
  }

  const protVal = parseAndValidateDecimal(params.proteinG, "Proteínas", { allowZero: true });
  if (!protVal.valid) {
    fieldErrors.proteinG = protVal.error;
  }

  const carbVal = parseAndValidateDecimal(params.carbohydrateG, "Carboidratos", { allowZero: true });
  if (!carbVal.valid) {
    fieldErrors.carbohydrateG = carbVal.error;
  }

  const fatVal = parseAndValidateDecimal(params.fatG, "Gorduras", { allowZero: true });
  if (
    !refAmountVal.valid ||
    !calVal.valid ||
    !protVal.valid ||
    !carbVal.valid ||
    !fatVal.valid ||
    Object.keys(fieldErrors).length > 0
  ) {
    return { success: false, error: "Verifique os dados informados.", fieldErrors };
  }

  const normalizedName = normalizeSearchText(name);
  const foodPublicId = crypto.randomUUID();

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO nutrition_foods (
        public_id,
        consultancy_id,
        name,
        normalized_name,
        category,
        reference_amount,
        reference_unit,
        calories_kcal,
        protein_g,
        carbohydrate_g,
        fat_g,
        status,
        source_type,
        source_key,
        source_label,
        source_external_code,
        source_version,
        source_reference,
        source_imported_at,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'MANUAL', NULL, NULL, NULL, NULL, NULL, NULL, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
      );`,
      [
        foodPublicId,
        context.consultancyId,
        name,
        normalizedName,
        refAmountVal.value,
        refUnit,
        calVal.value,
        protVal.value,
        carbVal.value,
        fatVal.value,
        actorUserId,
      ]
    );

    const auditPublicId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, 'NUTRITION_MANUAL_FOOD_CREATED', 'NUTRITION_FOOD', ?, NULL, UTC_TIMESTAMP(3));`,
      [auditPublicId, actorUserId, context.consultancyId, foodPublicId]
    );

    await connection.commit();
    return { success: true, foodPublicId };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao cadastrar alimento.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Atualiza um alimento MANUAL existente na consultoria (NUTRITIONIST obrigatório).
 * Alimentos de fontes externas (como TACO) são rejeitados pelo servidor.
 */
export async function updateManualNutritionFood(
  params: UpdateManualNutritionFoodParams
): Promise<UpdateManualNutritionFoodResult> {
  const { actorUserId, consultancySlug, foodPublicId } = params;

  if (!actorUserId || typeof actorUserId !== "number" || actorUserId <= 0) {
    return { success: false, error: "Usuário não autenticado." };
  }
  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { success: false, error: "Consultoria inválida." };
  }
  if (!foodPublicId || typeof foodPublicId !== "string" || !foodPublicId.trim()) {
    return { success: false, error: "Identificador do alimento inválido." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Permissão insuficiente para editar alimentos." };
  }

  const fieldErrors: Record<string, string> = {};

  const name = String(params.name || "").trim().normalize("NFC");
  if (!name) {
    fieldErrors.name = "O nome do alimento é obrigatório.";
  } else if (name.length > 255) {
    fieldErrors.name = "O nome deve ter no máximo 255 caracteres.";
  }

  const refUnit = String(params.referenceUnit || "").trim().toUpperCase();
  if (!ALLOWED_REFERENCE_UNITS.includes(refUnit as NutritionReferenceUnit)) {
    fieldErrors.referenceUnit = "Unidade de referência inválida. Permitidas: G, ML ou UNIT.";
  }

  const refAmountVal = parseAndValidateDecimal(params.referenceAmount, "Quantidade de referência", { allowZero: false });
  if (!refAmountVal.valid) {
    fieldErrors.referenceAmount = refAmountVal.error;
  }

  const calVal = parseAndValidateDecimal(params.caloriesKcal, "Calorias", { allowZero: true });
  if (!calVal.valid) {
    fieldErrors.caloriesKcal = calVal.error;
  }

  const protVal = parseAndValidateDecimal(params.proteinG, "Proteínas", { allowZero: true });
  if (!protVal.valid) {
    fieldErrors.proteinG = protVal.error;
  }

  const carbVal = parseAndValidateDecimal(params.carbohydrateG, "Carboidratos", { allowZero: true });
  if (!carbVal.valid) {
    fieldErrors.carbohydrateG = carbVal.error;
  }

  const fatVal = parseAndValidateDecimal(params.fatG, "Gorduras", { allowZero: true });
  if (!fatVal.valid) {
    fieldErrors.fatG = fatVal.error;
  }

  if (
    !refAmountVal.valid ||
    !calVal.valid ||
    !protVal.valid ||
    !carbVal.valid ||
    !fatVal.valid ||
    Object.keys(fieldErrors).length > 0
  ) {
    return { success: false, error: "Verifique os dados informados.", fieldErrors };
  }

  const normalizedName = normalizeSearchText(name);

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [foodRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        id,
        name,
        normalized_name,
        category,
        reference_amount,
        reference_unit,
        calories_kcal,
        protein_g,
        carbohydrate_g,
        fat_g,
        status,
        source_type
       FROM nutrition_foods
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [foodPublicId.trim(), context.consultancyId]
    );

    if (!Array.isArray(foodRows) || foodRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Alimento não encontrado nesta consultoria." };
    }

    const current = foodRows[0];
    if (current.source_type !== "MANUAL") {
      await connection.rollback();
      return { success: false, error: "Alimentos de fontes externas não podem ser alterados." };
    }

    if (current.status !== "ACTIVE") {
      await connection.rollback();
      return { success: false, error: "Apenas alimentos ativos podem ser editados." };
    }

    const isIdentical =
      String(current.name) === name &&
      Number(current.reference_amount) === refAmountVal.value &&
      String(current.reference_unit) === refUnit &&
      Number(current.calories_kcal) === calVal.value &&
      Number(current.protein_g) === protVal.value &&
      Number(current.carbohydrate_g) === carbVal.value &&
      Number(current.fat_g) === fatVal.value;

    if (isIdentical) {
      await connection.rollback();
      return { success: true, updated: false, foodPublicId, message: "Nenhuma alteração necessária." };
    }

    const foodId = Number(current.id);
    await connection.execute(
      `UPDATE nutrition_foods
       SET name = ?,
           normalized_name = ?,
           reference_amount = ?,
           reference_unit = ?,
           calories_kcal = ?,
           protein_g = ?,
           carbohydrate_g = ?,
           fat_g = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ?;`,
      [
        name,
        normalizedName,
        refAmountVal.value,
        refUnit,
        calVal.value,
        protVal.value,
        carbVal.value,
        fatVal.value,
        foodId,
        context.consultancyId,
      ]
    );

    const auditPublicId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, 'NUTRITION_MANUAL_FOOD_UPDATED', 'NUTRITION_FOOD', ?, NULL, UTC_TIMESTAMP(3));`,
      [auditPublicId, actorUserId, context.consultancyId, foodPublicId]
    );

    await connection.commit();
    return { success: true, updated: true, foodPublicId, message: "Alimento atualizado com sucesso!" };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao atualizar alimento.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Inativa um alimento MANUAL na consultoria (NUTRITIONIST obrigatório).
 * Alimentos de fontes externas (como TACO) são rejeitados pelo servidor.
 */
export async function inactivateManualNutritionFood(
  params: InactivateManualNutritionFoodParams
): Promise<InactivateManualNutritionFoodResult> {
  const { actorUserId, consultancySlug, foodPublicId } = params;

  if (!actorUserId || typeof actorUserId !== "number" || actorUserId <= 0) {
    return { success: false, error: "Usuário não autenticado." };
  }
  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { success: false, error: "Consultoria inválida." };
  }
  if (!foodPublicId || typeof foodPublicId !== "string" || !foodPublicId.trim()) {
    return { success: false, error: "Identificador do alimento inválido." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Permissão insuficiente para inativar alimentos." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [foodRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status, source_type
       FROM nutrition_foods
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [foodPublicId.trim(), context.consultancyId]
    );

    if (!Array.isArray(foodRows) || foodRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Alimento não encontrado nesta consultoria." };
    }

    const current = foodRows[0];
    if (current.source_type !== "MANUAL") {
      await connection.rollback();
      return { success: false, error: "Alimentos de fontes externas não podem ser inativados." };
    }

    if (current.status === "INACTIVE") {
      await connection.rollback();
      return { success: true, inactivated: false, message: "Alimento já se encontra inativo." };
    }

    const foodId = Number(current.id);
    await connection.execute(
      `UPDATE nutrition_foods
       SET status = 'INACTIVE',
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ?;`,
      [foodId, context.consultancyId]
    );

    const auditPublicId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, 'NUTRITION_MANUAL_FOOD_INACTIVATED', 'NUTRITION_FOOD', ?, NULL, UTC_TIMESTAMP(3));`,
      [auditPublicId, actorUserId, context.consultancyId, foodPublicId]
    );

    await connection.commit();
    return { success: true, inactivated: true, message: "Alimento inativado com sucesso!" };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao inativar alimento.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// NUTRITION PLAN LISTING & STUDENT SELECTION (NUTRITIONIST ONLY)
// ============================================================================

export type ListNutritionPlansParams = {
  actorUserId: number;
  consultancySlug: string;
  statusFilter?: NutritionPlanStatus | "ALL";
  page?: number;
  pageSize?: number;
};

export type NutritionPlanListItemDto = {
  publicId: string;
  title: string;
  subtitle: string | null;
  status: NutritionPlanStatus;
  startsOn: string | null;
  endsOn: string | null;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date | null;
  archivedAt: Date | null;
  studentName: string;
  studentEmail: string;
  studentMembershipPublicId: string;
  mealsCount: number;
};

export type ListNutritionPlansResult = {
  items: NutritionPlanListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listNutritionPlansForNutritionist({
  actorUserId,
  consultancySlug,
  statusFilter = "ALL",
  page = 1,
  pageSize = 20,
}: ListNutritionPlansParams): Promise<ListNutritionPlansResult> {
  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string"
  ) {
    return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
  }

  const validPage = Number.isInteger(page) && page >= 1 ? page : 1;
  const validPageSize = Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100 ? pageSize : 20;
  const offset = (validPage - 1) * validPageSize;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const whereConditions: string[] = ["np.consultancy_id = ?", "np.deleted_at IS NULL"];
    const queryParams: (number | string)[] = [context.consultancyId];

    if (statusFilter && statusFilter !== "ALL") {
      whereConditions.push("np.status = ?");
      queryParams.push(statusFilter);
    }

    const whereClause = whereConditions.join(" AND ");

    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM nutrition_plans np
       WHERE ${whereClause};`,
      queryParams
    );

    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / validPageSize));

    if (total === 0) {
      return { items: [], total: 0, page: validPage, pageSize: validPageSize, totalPages: 1 };
    }

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        np.id,
        np.public_id,
        np.title,
        np.subtitle,
        np.status,
        DATE_FORMAT(np.starts_on, '%Y-%m-%d') AS starts_on,
        DATE_FORMAT(np.ends_on, '%Y-%m-%d') AS ends_on,
        np.created_at,
        np.updated_at,
        np.activated_at,
        np.archived_at,
        u.full_name AS student_name,
        u.email AS student_email,
        cm.public_id AS student_membership_public_id,
        (SELECT COUNT(*) FROM nutrition_meals nm WHERE nm.nutrition_plan_id = np.id AND nm.deleted_at IS NULL) AS meals_count
       FROM nutrition_plans np
       JOIN consultancy_members cm ON cm.id = np.student_membership_id
       JOIN users u ON u.id = cm.user_id
       WHERE ${whereClause}
       ORDER BY np.updated_at DESC, np.id DESC
       LIMIT ? OFFSET ?;`,
      [...queryParams, String(validPageSize), String(offset)]
    );

    const items: NutritionPlanListItemDto[] = (rows || []).map((r) => ({
      publicId: String(r.public_id),
      title: String(r.title),
      subtitle: r.subtitle ? String(r.subtitle) : null,
      status: r.status as NutritionPlanStatus,
      startsOn: r.starts_on ? String(r.starts_on) : null,
      endsOn: r.ends_on ? String(r.ends_on) : null,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
      activatedAt: r.activated_at ? new Date(r.activated_at) : null,
      archivedAt: r.archived_at ? new Date(r.archived_at) : null,
      studentName: String(r.student_name),
      studentEmail: String(r.student_email),
      studentMembershipPublicId: String(r.student_membership_public_id),
      mealsCount: Number(r.meals_count || 0),
    }));

    return { items, total, page: validPage, pageSize: validPageSize, totalPages };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type NutritionStudentOptionDto = {
  membershipPublicId: string;
  fullName: string;
  email: string;
};

export async function listActiveStudentsForNutritionist({
  actorUserId,
  consultancySlug,
}: {
  actorUserId: number;
  consultancySlug: string;
}): Promise<NutritionStudentOptionDto[]> {
  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string"
  ) {
    return [];
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return [];
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cm.public_id AS membership_public_id,
        u.full_name,
        u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       ORDER BY u.full_name ASC;`,
      [context.consultancyId]
    );

    return (rows || []).map((r) => ({
      membershipPublicId: String(r.membership_public_id),
      fullName: String(r.full_name),
      email: String(r.email),
    }));
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// NUTRITION PLAN CREATION & HIERARCHY RETRIEVAL
// ============================================================================

export type CreateDraftNutritionPlanParams = {
  actorUserId: number;
  consultancySlug: string;
  studentMembershipPublicId: string;
  title: string;
  subtitle?: string | null;
  generalGuidance?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
};

export type CreateDraftNutritionPlanResult =
  | { success: true; planPublicId: string }
  | { success: false; error: string };

/**
 * Cria um plano alimentar bare DRAFT para um aluno na consultoria.
 */
export async function createDraftNutritionPlan({
  actorUserId,
  consultancySlug,
  studentMembershipPublicId,
  title,
  subtitle = null,
  generalGuidance = null,
  startsOn = null,
  endsOn = null,
}: CreateDraftNutritionPlanParams): Promise<CreateDraftNutritionPlanResult> {
  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !studentMembershipPublicId ||
    typeof studentMembershipPublicId !== "string"
  ) {
    return { success: false, error: "Parâmetros inválidos." };
  }

  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (!cleanTitle) {
    return { success: false, error: "O título do plano é obrigatório." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado para prescrição nutricional." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    // 1. Validar que o aluno pertence à mesma consultoria e possui role STUDENT
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cm.id,
        cm.public_id,
        cm.status
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.public_id = ?
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
         AND cm.status = 'ACTIVE'
       LIMIT 1;`,
      [context.consultancyId, studentMembershipPublicId]
    );

    if (!Array.isArray(studentRows) || studentRows.length === 0) {
      return { success: false, error: "Aluno não encontrado nesta consultoria." };
    }

    const studentMembershipId = Number(studentRows[0].id);
    const planPublicId = crypto.randomUUID();

    await connection.execute(
      `INSERT INTO nutrition_plans (
        public_id,
        consultancy_id,
        student_membership_id,
        nutritionist_membership_id,
        title,
        subtitle,
        general_guidance,
        status,
        starts_on,
        ends_on,
        created_at,
        updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));`,
      [
        planPublicId,
        context.consultancyId,
        studentMembershipId,
        context.membershipId,
        cleanTitle,
        subtitle ? subtitle.trim() : null,
        generalGuidance ? generalGuidance.trim() : null,
        startsOn ? startsOn.trim() : null,
        endsOn ? endsOn.trim() : null,
      ]
    );

    return { success: true, planPublicId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar plano.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type UpdateNutritionPlanDraftDetailsParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  title: string;
  subtitle?: string | null;
  generalGuidance?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
};

export async function updateNutritionPlanDraftDetails({
  actorUserId,
  consultancySlug,
  planPublicId,
  title,
  subtitle = null,
  generalGuidance = null,
  startsOn = null,
  endsOn = null,
}: UpdateNutritionPlanDraftDetailsParams): Promise<{ success: boolean; error?: string }> {
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (!cleanTitle) {
    return { success: false, error: "O título do plano é obrigatório." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    await connection.execute(
      `UPDATE nutrition_plans
       SET title = ?,
           subtitle = ?,
           general_guidance = ?,
           starts_on = ?,
           ends_on = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?;`,
      [
        cleanTitle,
        subtitle ? subtitle.trim() : null,
        generalGuidance ? generalGuidance.trim() : null,
        startsOn ? startsOn.trim() : null,
        endsOn ? endsOn.trim() : null,
        planId,
      ]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao atualizar dados do plano.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// MEAL MUTATION SERVICES (DRAFT ONLY)
// ============================================================================

export type CreateNutritionMealParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  title: string;
  scheduledTime?: string | null;
  notes?: string | null;
};

export async function createNutritionMeal({
  actorUserId,
  consultancySlug,
  planPublicId,
  title,
  scheduledTime = null,
  notes = null,
}: CreateNutritionMealParams): Promise<{ success: boolean; mealPublicId?: string; error?: string }> {
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (!cleanTitle) {
    return { success: false, error: "O nome da refeição é obrigatório." };
  }
  if (cleanTitle.length > 255) {
    return { success: false, error: "O nome da refeição deve ter no máximo 255 caracteres." };
  }

  const cleanTime = scheduledTime ? scheduledTime.trim() : null;
  if (cleanTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(cleanTime)) {
    return { success: false, error: "Horário da refeição inválido (formato esperado: HH:MM)." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [orderRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM nutrition_meals
       WHERE nutrition_plan_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planId]
    );

    const nextOrder = Number(orderRows[0]?.next_order || 0);
    const mealPublicId = crypto.randomUUID();

    await connection.execute(
      `INSERT INTO nutrition_meals (
        public_id,
        nutrition_plan_id,
        title,
        scheduled_time,
        notes,
        sort_order,
        created_at,
        updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));`,
      [
        mealPublicId,
        planId,
        cleanTitle,
        cleanTime || null,
        notes ? notes.trim() : null,
        nextOrder,
      ]
    );

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, mealPublicId };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao adicionar refeição.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type UpdateNutritionMealParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  mealPublicId: string;
  title: string;
  scheduledTime?: string | null;
  notes?: string | null;
};

export async function updateNutritionMeal({
  actorUserId,
  consultancySlug,
  planPublicId,
  mealPublicId,
  title,
  scheduledTime = null,
  notes = null,
}: UpdateNutritionMealParams): Promise<{ success: boolean; error?: string }> {
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (!cleanTitle) {
    return { success: false, error: "O nome da refeição é obrigatório." };
  }
  if (cleanTitle.length > 255) {
    return { success: false, error: "O nome da refeição deve ter no máximo 255 caracteres." };
  }

  const cleanTime = scheduledTime ? scheduledTime.trim() : null;
  if (cleanTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(cleanTime)) {
    return { success: false, error: "Horário da refeição inválido (formato esperado: HH:MM)." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [mealRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM nutrition_meals
       WHERE public_id = ?
         AND nutrition_plan_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [mealPublicId, planId]
    );

    if (!Array.isArray(mealRows) || mealRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Refeição não encontrada neste plano." };
    }

    const mealId = Number(mealRows[0].id);

    await connection.execute(
      `UPDATE nutrition_meals
       SET title = ?,
           scheduled_time = ?,
           notes = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?;`,
      [cleanTitle, cleanTime || null, notes ? notes.trim() : null, mealId]
    );

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao atualizar refeição.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type MoveNutritionMealParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  mealPublicId: string;
  direction: "UP" | "DOWN";
};

export async function moveNutritionMeal({
  actorUserId,
  consultancySlug,
  planPublicId,
  mealPublicId,
  direction,
}: MoveNutritionMealParams): Promise<{ success: boolean; error?: string }> {
  if (direction !== "UP" && direction !== "DOWN") {
    return { success: false, error: "Direção de movimentação inválida." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [mealRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, sort_order
       FROM nutrition_meals
       WHERE nutrition_plan_id = ?
         AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC
       FOR UPDATE;`,
      [planId]
    );

    const meals = (mealRows || []) as { id: number; public_id: string; sort_order: number }[];
    const targetIdx = meals.findIndex((m) => m.public_id === mealPublicId);

    if (targetIdx === -1) {
      await connection.rollback();
      return { success: false, error: "Refeição não encontrada neste plano." };
    }

    const neighborIdx = direction === "UP" ? targetIdx - 1 : targetIdx + 1;
    if (neighborIdx < 0 || neighborIdx >= meals.length) {
      // Já está no limite, no-op seguro
      await connection.commit();
      return { success: true };
    }

    // Trocar de posição na lista
    const temp = meals[targetIdx];
    meals[targetIdx] = meals[neighborIdx];
    meals[neighborIdx] = temp;

    for (let i = 0; i < meals.length; i++) {
      await connection.execute(
        `UPDATE nutrition_meals SET sort_order = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
        [i, meals[i].id]
      );
    }

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao mover refeição.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type RemoveNutritionMealParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  mealPublicId: string;
};

export async function removeNutritionMeal({
  actorUserId,
  consultancySlug,
  planPublicId,
  mealPublicId,
}: RemoveNutritionMealParams): Promise<{ success: boolean; error?: string }> {
  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [mealRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM nutrition_meals
       WHERE public_id = ?
         AND nutrition_plan_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [mealPublicId, planId]
    );

    if (!Array.isArray(mealRows) || mealRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Refeição não encontrada neste plano." };
    }

    const mealId = Number(mealRows[0].id);

    // Exclusão explícita bottom-up de descendentes para manter integridade referencial
    await connection.execute(
      `UPDATE nutrition_meal_items nmi
       JOIN nutrition_meal_choice_groups nmcg ON nmcg.id = nmi.choice_group_id
       JOIN nutrition_meal_sections nms ON nms.id = nmcg.section_id
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       SET nmi.deleted_at = CURRENT_TIMESTAMP(3)
       WHERE nmo.meal_id = ? AND nmi.deleted_at IS NULL;`,
      [mealId]
    );

    await connection.execute(
      `UPDATE nutrition_meal_choice_groups nmcg
       JOIN nutrition_meal_sections nms ON nms.id = nmcg.section_id
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       SET nmcg.deleted_at = CURRENT_TIMESTAMP(3)
       WHERE nmo.meal_id = ? AND nmcg.deleted_at IS NULL;`,
      [mealId]
    );

    await connection.execute(
      `UPDATE nutrition_meal_sections nms
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       SET nms.deleted_at = CURRENT_TIMESTAMP(3)
       WHERE nmo.meal_id = ? AND nms.deleted_at IS NULL;`,
      [mealId]
    );

    await connection.execute(
      `UPDATE nutrition_meal_options
       SET deleted_at = CURRENT_TIMESTAMP(3)
       WHERE meal_id = ? AND deleted_at IS NULL;`,
      [mealId]
    );

    await connection.execute(
      `UPDATE nutrition_meals
       SET deleted_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?;`,
      [mealId]
    );

    // Recompactar posições das refeições restantes
    const [remainingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM nutrition_meals
       WHERE nutrition_plan_id = ?
         AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC;`,
      [planId]
    );

    for (let i = 0; i < remainingRows.length; i++) {
      await connection.execute(
        `UPDATE nutrition_meals SET sort_order = ? WHERE id = ?;`,
        [i, Number(remainingRows[i].id)]
      );
    }

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao remover refeição.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// MEAL OPTION MUTATION SERVICES (DRAFT ONLY)
// ============================================================================

export type CreateNutritionMealOptionParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  mealPublicId: string;
  title?: string | null;
  description?: string | null;
};

export async function createNutritionMealOption({
  actorUserId,
  consultancySlug,
  planPublicId,
  mealPublicId,
  title = null,
  description = null,
}: CreateNutritionMealOptionParams): Promise<{ success: boolean; optionPublicId?: string; error?: string }> {
  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [mealRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM nutrition_meals
       WHERE public_id = ?
         AND nutrition_plan_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [mealPublicId, planId]
    );

    if (!Array.isArray(mealRows) || mealRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Refeição não encontrada neste plano." };
    }

    const mealId = Number(mealRows[0].id);

    const [orderRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM nutrition_meal_options
       WHERE meal_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [mealId]
    );

    const nextOrder = Number(orderRows[0]?.next_order || 0);
    const optionPublicId = crypto.randomUUID();

    await connection.execute(
      `INSERT INTO nutrition_meal_options (
        public_id,
        meal_id,
        title,
        description,
        sort_order,
        created_at,
        updated_at
       ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));`,
      [
        optionPublicId,
        mealId,
        title ? title.trim() : null,
        description ? description.trim() : null,
        nextOrder,
      ]
    );

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, optionPublicId };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao adicionar opção.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type MoveNutritionMealOptionParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  optionPublicId: string;
  direction: "UP" | "DOWN";
};

export async function moveNutritionMealOption({
  actorUserId,
  consultancySlug,
  planPublicId,
  optionPublicId,
  direction,
}: MoveNutritionMealOptionParams): Promise<{ success: boolean; error?: string }> {
  if (direction !== "UP" && direction !== "DOWN") {
    return { success: false, error: "Direção de movimentação inválida." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [optionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT nmo.id, nmo.meal_id
       FROM nutrition_meal_options nmo
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nmo.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nmo.deleted_at IS NULL
       FOR UPDATE;`,
      [optionPublicId, planId]
    );

    if (!Array.isArray(optionRows) || optionRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Opção não encontrada neste plano." };
    }

    const mealId = Number(optionRows[0].meal_id);

    const [siblingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, sort_order
       FROM nutrition_meal_options
       WHERE meal_id = ?
         AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC
       FOR UPDATE;`,
      [mealId]
    );

    const options = (siblingRows || []) as { id: number; public_id: string; sort_order: number }[];
    const targetIdx = options.findIndex((o) => o.public_id === optionPublicId);

    if (targetIdx === -1) {
      await connection.rollback();
      return { success: false, error: "Opção não encontrada." };
    }

    const neighborIdx = direction === "UP" ? targetIdx - 1 : targetIdx + 1;
    if (neighborIdx < 0 || neighborIdx >= options.length) {
      // Já está no limite
      await connection.commit();
      return { success: true };
    }

    const temp = options[targetIdx];
    options[targetIdx] = options[neighborIdx];
    options[neighborIdx] = temp;

    for (let i = 0; i < options.length; i++) {
      await connection.execute(
        `UPDATE nutrition_meal_options SET sort_order = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
        [i, options[i].id]
      );
    }

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao mover opção.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type RemoveNutritionMealOptionParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  optionPublicId: string;
};

export async function removeNutritionMealOption({
  actorUserId,
  consultancySlug,
  planPublicId,
  optionPublicId,
}: RemoveNutritionMealOptionParams): Promise<{ success: boolean; error?: string }> {
  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [optionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT nmo.id, nmo.meal_id
       FROM nutrition_meal_options nmo
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nmo.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nmo.deleted_at IS NULL
       FOR UPDATE;`,
      [optionPublicId, planId]
    );

    if (!Array.isArray(optionRows) || optionRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Opção não encontrada neste plano." };
    }

    const optionId = Number(optionRows[0].id);
    const mealId = Number(optionRows[0].meal_id);

    // Exclusão explícita bottom-up de descendentes
    await connection.execute(
      `UPDATE nutrition_meal_items nmi
       JOIN nutrition_meal_choice_groups nmcg ON nmcg.id = nmi.choice_group_id
       JOIN nutrition_meal_sections nms ON nms.id = nmcg.section_id
       SET nmi.deleted_at = CURRENT_TIMESTAMP(3)
       WHERE nms.option_id = ? AND nmi.deleted_at IS NULL;`,
      [optionId]
    );

    await connection.execute(
      `UPDATE nutrition_meal_choice_groups nmcg
       JOIN nutrition_meal_sections nms ON nms.id = nmcg.section_id
       SET nmcg.deleted_at = CURRENT_TIMESTAMP(3)
       WHERE nms.option_id = ? AND nmcg.deleted_at IS NULL;`,
      [optionId]
    );

    await connection.execute(
      `UPDATE nutrition_meal_sections
       SET deleted_at = CURRENT_TIMESTAMP(3)
       WHERE option_id = ? AND deleted_at IS NULL;`,
      [optionId]
    );

    await connection.execute(
      `UPDATE nutrition_meal_options
       SET deleted_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?;`,
      [optionId]
    );

    // Recompactar posições das opções restantes
    const [remainingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM nutrition_meal_options
       WHERE meal_id = ?
         AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC;`,
      [mealId]
    );

    for (let i = 0; i < remainingRows.length; i++) {
      await connection.execute(
        `UPDATE nutrition_meal_options SET sort_order = ? WHERE id = ?;`,
        [i, Number(remainingRows[i].id)]
      );
    }

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao remover opção.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// MEAL SECTION MUTATION SERVICES (DRAFT ONLY)
// ============================================================================

export type CreateNutritionMealSectionParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  optionPublicId: string;
  title: string;
  categoryKey?: string | null;
};

export async function createNutritionMealSection({
  actorUserId,
  consultancySlug,
  planPublicId,
  optionPublicId,
  title,
  categoryKey = null,
}: CreateNutritionMealSectionParams): Promise<{ success: boolean; sectionPublicId?: string; error?: string }> {
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (!cleanTitle) {
    return { success: false, error: "O título da seção é obrigatório." };
  }
  if (cleanTitle.length > 255) {
    return { success: false, error: "O título da seção deve ter no máximo 255 caracteres." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [optionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT nmo.id
       FROM nutrition_meal_options nmo
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nmo.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nmo.deleted_at IS NULL
       FOR UPDATE;`,
      [optionPublicId, planId]
    );

    if (!Array.isArray(optionRows) || optionRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Opção não encontrada neste plano." };
    }

    const optionId = Number(optionRows[0].id);

    const [orderRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM nutrition_meal_sections
       WHERE option_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [optionId]
    );

    const nextOrder = Number(orderRows[0]?.next_order || 0);
    const sectionPublicId = crypto.randomUUID();

    await connection.execute(
      `INSERT INTO nutrition_meal_sections (
        public_id,
        option_id,
        category_key,
        title,
        sort_order,
        created_at,
        updated_at
       ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));`,
      [
        sectionPublicId,
        optionId,
        categoryKey ? categoryKey.trim() : null,
        cleanTitle,
        nextOrder,
      ]
    );

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, sectionPublicId };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao adicionar seção.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type UpdateNutritionMealSectionParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  sectionPublicId: string;
  title: string;
  categoryKey?: string | null;
};

export async function updateNutritionMealSection({
  actorUserId,
  consultancySlug,
  planPublicId,
  sectionPublicId,
  title,
  categoryKey = null,
}: UpdateNutritionMealSectionParams): Promise<{ success: boolean; error?: string }> {
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (!cleanTitle) {
    return { success: false, error: "O título da seção é obrigatório." };
  }
  if (cleanTitle.length > 255) {
    return { success: false, error: "O título da seção deve ter no máximo 255 caracteres." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [sectionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT nms.id
       FROM nutrition_meal_sections nms
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nms.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nms.deleted_at IS NULL
       FOR UPDATE;`,
      [sectionPublicId, planId]
    );

    if (!Array.isArray(sectionRows) || sectionRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Seção não encontrada neste plano." };
    }

    const sectionId = Number(sectionRows[0].id);

    await connection.execute(
      `UPDATE nutrition_meal_sections
       SET title = ?,
           category_key = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?;`,
      [cleanTitle, categoryKey ? categoryKey.trim() : null, sectionId]
    );

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao atualizar seção.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type MoveNutritionMealSectionParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  sectionPublicId: string;
  direction: "UP" | "DOWN";
};

export async function moveNutritionMealSection({
  actorUserId,
  consultancySlug,
  planPublicId,
  sectionPublicId,
  direction,
}: MoveNutritionMealSectionParams): Promise<{ success: boolean; error?: string }> {
  if (direction !== "UP" && direction !== "DOWN") {
    return { success: false, error: "Direção de movimentação inválida." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [sectionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT nms.id, nms.option_id
       FROM nutrition_meal_sections nms
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nms.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nms.deleted_at IS NULL
       FOR UPDATE;`,
      [sectionPublicId, planId]
    );

    if (!Array.isArray(sectionRows) || sectionRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Seção não encontrada neste plano." };
    }

    const optionId = Number(sectionRows[0].option_id);

    const [siblingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, sort_order
       FROM nutrition_meal_sections
       WHERE option_id = ?
         AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC
       FOR UPDATE;`,
      [optionId]
    );

    const sections = (siblingRows || []) as { id: number; public_id: string; sort_order: number }[];
    const targetIdx = sections.findIndex((s) => s.public_id === sectionPublicId);

    if (targetIdx === -1) {
      await connection.rollback();
      return { success: false, error: "Seção não encontrada." };
    }

    const neighborIdx = direction === "UP" ? targetIdx - 1 : targetIdx + 1;
    if (neighborIdx < 0 || neighborIdx >= sections.length) {
      // Já está no limite
      await connection.commit();
      return { success: true };
    }

    const temp = sections[targetIdx];
    sections[targetIdx] = sections[neighborIdx];
    sections[neighborIdx] = temp;

    for (let i = 0; i < sections.length; i++) {
      await connection.execute(
        `UPDATE nutrition_meal_sections SET sort_order = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
        [i, sections[i].id]
      );
    }

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao mover seção.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type RemoveNutritionMealSectionParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  sectionPublicId: string;
};

export async function removeNutritionMealSection({
  actorUserId,
  consultancySlug,
  planPublicId,
  sectionPublicId,
}: RemoveNutritionMealSectionParams): Promise<{ success: boolean; error?: string }> {
  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [sectionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT nms.id, nms.option_id
       FROM nutrition_meal_sections nms
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nms.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nms.deleted_at IS NULL
       FOR UPDATE;`,
      [sectionPublicId, planId]
    );

    if (!Array.isArray(sectionRows) || sectionRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Seção não encontrada neste plano." };
    }

    const sectionId = Number(sectionRows[0].id);
    const optionId = Number(sectionRows[0].option_id);

    // Exclusão explícita bottom-up de descendentes
    await connection.execute(
      `UPDATE nutrition_meal_items nmi
       JOIN nutrition_meal_choice_groups nmcg ON nmcg.id = nmi.choice_group_id
       SET nmi.deleted_at = CURRENT_TIMESTAMP(3)
       WHERE nmcg.section_id = ? AND nmi.deleted_at IS NULL;`,
      [sectionId]
    );

    await connection.execute(
      `UPDATE nutrition_meal_choice_groups
       SET deleted_at = CURRENT_TIMESTAMP(3)
       WHERE section_id = ? AND deleted_at IS NULL;`,
      [sectionId]
    );

    await connection.execute(
      `UPDATE nutrition_meal_sections
       SET deleted_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?;`,
      [sectionId]
    );

    // Recompactar posições das seções restantes
    const [remainingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM nutrition_meal_sections
       WHERE option_id = ?
         AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC;`,
      [optionId]
    );

    for (let i = 0; i < remainingRows.length; i++) {
      await connection.execute(
        `UPDATE nutrition_meal_sections SET sort_order = ? WHERE id = ?;`,
        [i, Number(remainingRows[i].id)]
      );
    }

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao remover seção.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// CHOICE GROUP & FOOD ITEM MUTATION SERVICES (DRAFT ONLY)
// ============================================================================

export type CreateNutritionMealChoiceGroupWithFirstItemParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  sectionPublicId: string;
  foodPublicId: string;
  prescribedQuantity: number | string;
  notes?: string | null;
};

export async function createNutritionMealChoiceGroupWithFirstItem({
  actorUserId,
  consultancySlug,
  planPublicId,
  sectionPublicId,
  foodPublicId,
  prescribedQuantity,
  notes = null,
}: CreateNutritionMealChoiceGroupWithFirstItemParams): Promise<{
  success: boolean;
  groupPublicId?: string;
  itemPublicId?: string;
  error?: string;
}> {
  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !planPublicId ||
    typeof planPublicId !== "string" ||
    !sectionPublicId ||
    typeof sectionPublicId !== "string" ||
    !foodPublicId ||
    typeof foodPublicId !== "string"
  ) {
    return { success: false, error: "Parâmetros inválidos." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  const qtyVal = parseAndValidateDecimal(prescribedQuantity, "Quantidade", {
    min: 0.01,
    max: 999999.99,
    allowZero: false,
  });
  if (!qtyVal.valid) {
    return { success: false, error: qtyVal.error };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Validar e travar o plano (somente DRAFT)
    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    // 2. Validar cadeia hierárquica da seção até o plano
    const [sectionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT nms.id AS section_id
       FROM nutrition_meal_sections nms
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nms.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nms.deleted_at IS NULL
       FOR UPDATE;`,
      [sectionPublicId, planId]
    );

    if (!Array.isArray(sectionRows) || sectionRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Seção não encontrada neste plano." };
    }

    const sectionId = Number(sectionRows[0].section_id);

    // 3. Recarregar o alimento ativo da biblioteca na mesma consultoria
    const [foodRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        id,
        public_id,
        name,
        category,
        reference_amount,
        reference_unit,
        calories_kcal,
        protein_g,
        carbohydrate_g,
        fat_g,
        status
       FROM nutrition_foods
       WHERE public_id = ?
         AND consultancy_id = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       LIMIT 1;`,
      [foodPublicId, context.consultancyId]
    );

    if (!Array.isArray(foodRows) || foodRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Alimento não encontrado ou inativo na biblioteca." };
    }

    const food = foodRows[0];
    const foodId = Number(food.id);

    // 4. Derivar a ordenação do novo Choice Group na seção
    const [groupOrderRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM nutrition_meal_choice_groups
       WHERE section_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [sectionId]
    );

    const nextGroupOrder = Number(groupOrderRows[0]?.next_order || 0);
    const groupPublicId = crypto.randomUUID();

    // 5. Inserir o Choice Group
    const [groupInsert] = await connection.execute<ResultSetHeader>(
      `INSERT INTO nutrition_meal_choice_groups (
        public_id,
        section_id,
        title,
        selection_min,
        selection_max,
        sort_order,
        created_at,
        updated_at
       ) VALUES (?, ?, NULL, 1, 1, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));`,
      [groupPublicId, sectionId, nextGroupOrder]
    );

    const choiceGroupId = groupInsert.insertId;

    // 6. Calcular macros determinísticos baseados no snapshot do alimento
    const refAmount = Number(food.reference_amount);
    const calKcal = Number(food.calories_kcal);
    const protG = Number(food.protein_g);
    const carbG = Number(food.carbohydrate_g);
    const fatG = Number(food.fat_g);

    const macros = calculateItemMacros({
      referenceAmount: refAmount,
      caloriesKcal: calKcal,
      proteinG: protG,
      carbohydrateG: carbG,
      fatG: fatG,
      prescribedQuantity: qtyVal.value,
    });

    const itemPublicId = crypto.randomUUID();

    // 7. Inserir o primeiro Food Item no grupo (unidade atômica)
    await connection.execute(
      `INSERT INTO nutrition_meal_items (
        public_id,
        choice_group_id,
        food_id,
        food_portion_id,
        sort_order,
        food_name_snapshot,
        category_snapshot,
        reference_amount_snapshot,
        reference_unit_snapshot,
        calories_reference_snapshot,
        protein_reference_snapshot,
        carbohydrate_reference_snapshot,
        fat_reference_snapshot,
        portion_label_snapshot,
        equivalent_reference_amount_snapshot,
        prescribed_quantity,
        prescribed_unit_label,
        calculated_calories,
        calculated_protein,
        calculated_carbohydrate,
        calculated_fat,
        notes,
        created_at,
        updated_at
       ) VALUES (?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));`,
      [
        itemPublicId,
        choiceGroupId,
        foodId,
        String(food.name),
        food.category ? String(food.category) : null,
        refAmount,
        String(food.reference_unit),
        calKcal,
        protG,
        carbG,
        fatG,
        qtyVal.value,
        String(food.reference_unit), // Unidade derivada do snapshot de referência
        macros.calculatedCalories,
        macros.calculatedProtein,
        macros.calculatedCarbohydrate,
        macros.calculatedFat,
        notes ? String(notes).trim() : null,
      ]
    );

    // 8. Atualizar timestamp do plano
    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, groupPublicId, itemPublicId };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao adicionar item à refeição.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type AddNutritionMealItemAlternativeParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  choiceGroupPublicId: string;
  foodPublicId: string;
  prescribedQuantity: number | string;
  notes?: string | null;
};

export async function addNutritionMealItemAlternative({
  actorUserId,
  consultancySlug,
  planPublicId,
  choiceGroupPublicId,
  foodPublicId,
  prescribedQuantity,
  notes = null,
}: AddNutritionMealItemAlternativeParams): Promise<{
  success: boolean;
  itemPublicId?: string;
  error?: string;
}> {
  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !planPublicId ||
    typeof planPublicId !== "string" ||
    !choiceGroupPublicId ||
    typeof choiceGroupPublicId !== "string" ||
    !foodPublicId ||
    typeof foodPublicId !== "string"
  ) {
    return { success: false, error: "Parâmetros inválidos." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  const qtyVal = parseAndValidateDecimal(prescribedQuantity, "Quantidade", {
    min: 0.01,
    max: 999999.99,
    allowZero: false,
  });
  if (!qtyVal.valid) {
    return { success: false, error: qtyVal.error };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Validar e travar o plano (somente DRAFT)
    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    // 2. Validar cadeia hierárquica do grupo até o plano
    const [groupRows] = await connection.execute<RowDataPacket[]>(
      `SELECT nmcg.id AS choice_group_id
       FROM nutrition_meal_choice_groups nmcg
       JOIN nutrition_meal_sections nms ON nms.id = nmcg.section_id
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nmcg.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nmcg.deleted_at IS NULL
       FOR UPDATE;`,
      [choiceGroupPublicId, planId]
    );

    if (!Array.isArray(groupRows) || groupRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Grupo de alimentos não encontrado neste plano." };
    }

    const choiceGroupId = Number(groupRows[0].choice_group_id);

    // 3. Recarregar o alimento ativo da biblioteca
    const [foodRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        id,
        public_id,
        name,
        category,
        reference_amount,
        reference_unit,
        calories_kcal,
        protein_g,
        carbohydrate_g,
        fat_g,
        status
       FROM nutrition_foods
       WHERE public_id = ?
         AND consultancy_id = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       LIMIT 1;`,
      [foodPublicId, context.consultancyId]
    );

    if (!Array.isArray(foodRows) || foodRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Alimento não encontrado ou inativo na biblioteca." };
    }

    const food = foodRows[0];
    const foodId = Number(food.id);

    // 4. Derivar a posição do novo item dentro do grupo
    const [itemOrderRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order
       FROM nutrition_meal_items
       WHERE choice_group_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [choiceGroupId]
    );

    const nextItemOrder = Number(itemOrderRows[0]?.next_order || 0);

    // 5. Calcular macros
    const refAmount = Number(food.reference_amount);
    const calKcal = Number(food.calories_kcal);
    const protG = Number(food.protein_g);
    const carbG = Number(food.carbohydrate_g);
    const fatG = Number(food.fat_g);

    const macros = calculateItemMacros({
      referenceAmount: refAmount,
      caloriesKcal: calKcal,
      proteinG: protG,
      carbohydrateG: carbG,
      fatG: fatG,
      prescribedQuantity: qtyVal.value,
    });

    const itemPublicId = crypto.randomUUID();

    // 6. Inserir a alternativa no grupo
    await connection.execute(
      `INSERT INTO nutrition_meal_items (
        public_id,
        choice_group_id,
        food_id,
        food_portion_id,
        sort_order,
        food_name_snapshot,
        category_snapshot,
        reference_amount_snapshot,
        reference_unit_snapshot,
        calories_reference_snapshot,
        protein_reference_snapshot,
        carbohydrate_reference_snapshot,
        fat_reference_snapshot,
        portion_label_snapshot,
        equivalent_reference_amount_snapshot,
        prescribed_quantity,
        prescribed_unit_label,
        calculated_calories,
        calculated_protein,
        calculated_carbohydrate,
        calculated_fat,
        notes,
        created_at,
        updated_at
       ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));`,
      [
        itemPublicId,
        choiceGroupId,
        foodId,
        nextItemOrder,
        String(food.name),
        food.category ? String(food.category) : null,
        refAmount,
        String(food.reference_unit),
        calKcal,
        protG,
        carbG,
        fatG,
        qtyVal.value,
        String(food.reference_unit),
        macros.calculatedCalories,
        macros.calculatedProtein,
        macros.calculatedCarbohydrate,
        macros.calculatedFat,
        notes ? String(notes).trim() : null,
      ]
    );

    // 7. Atualizar timestamp do plano
    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true, itemPublicId };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao adicionar alternativa ao alimento.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type UpdateNutritionMealItemQuantityParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  itemPublicId: string;
  prescribedQuantity: number | string;
};

export async function updateNutritionMealItemQuantity({
  actorUserId,
  consultancySlug,
  planPublicId,
  itemPublicId,
  prescribedQuantity,
}: UpdateNutritionMealItemQuantityParams): Promise<{ success: boolean; error?: string }> {
  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !planPublicId ||
    typeof planPublicId !== "string" ||
    !itemPublicId ||
    typeof itemPublicId !== "string"
  ) {
    return { success: false, error: "Parâmetros inválidos." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  const qtyVal = parseAndValidateDecimal(prescribedQuantity, "Quantidade", {
    min: 0.01,
    max: 999999.99,
    allowZero: false,
  });
  if (!qtyVal.valid) {
    return { success: false, error: qtyVal.error };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Validar e travar o plano (somente DRAFT)
    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    // 2. Travar o item e recuperar seus snapshots nutricionais salvos
    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        nmi.id,
        nmi.prescribed_quantity,
        nmi.reference_amount_snapshot,
        nmi.calories_reference_snapshot,
        nmi.protein_reference_snapshot,
        nmi.carbohydrate_reference_snapshot,
        nmi.fat_reference_snapshot,
        nmi.equivalent_reference_amount_snapshot
       FROM nutrition_meal_items nmi
       JOIN nutrition_meal_choice_groups nmcg ON nmcg.id = nmi.choice_group_id
       JOIN nutrition_meal_sections nms ON nms.id = nmcg.section_id
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nmi.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nmi.deleted_at IS NULL
       FOR UPDATE;`,
      [itemPublicId, planId]
    );

    if (!Array.isArray(itemRows) || itemRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Item de alimento não encontrado neste plano." };
    }

    const item = itemRows[0];
    const itemId = Number(item.id);
    const currentQty = Number(item.prescribed_quantity);

    if (currentQty === qtyVal.value) {
      await connection.commit();
      return { success: true };
    }

    // 3. Recalcular macros usando ESTRITAMENTE os snapshots salvos no item
    const macros = calculateItemMacros({
      referenceAmount: Number(item.reference_amount_snapshot) || 100,
      caloriesKcal: Number(item.calories_reference_snapshot) || 0,
      proteinG: Number(item.protein_reference_snapshot) || 0,
      carbohydrateG: Number(item.carbohydrate_reference_snapshot) || 0,
      fatG: Number(item.fat_reference_snapshot) || 0,
      portionEquivalentAmount: item.equivalent_reference_amount_snapshot ? Number(item.equivalent_reference_amount_snapshot) : null,
      prescribedQuantity: qtyVal.value,
    });

    // 4. Atualizar item
    await connection.execute(
      `UPDATE nutrition_meal_items
       SET prescribed_quantity = ?,
           calculated_calories = ?,
           calculated_protein = ?,
           calculated_carbohydrate = ?,
           calculated_fat = ?,
           updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?;`,
      [
        qtyVal.value,
        macros.calculatedCalories,
        macros.calculatedProtein,
        macros.calculatedCarbohydrate,
        macros.calculatedFat,
        itemId,
      ]
    );

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao atualizar quantidade do alimento.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type MoveNutritionMealChoiceGroupParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  choiceGroupPublicId: string;
  direction: "UP" | "DOWN";
};

export async function moveNutritionMealChoiceGroup({
  actorUserId,
  consultancySlug,
  planPublicId,
  choiceGroupPublicId,
  direction,
}: MoveNutritionMealChoiceGroupParams): Promise<{ success: boolean; error?: string }> {
  if (direction !== "UP" && direction !== "DOWN") {
    return { success: false, error: "Direção de movimentação inválida." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [groupRows] = await connection.execute<RowDataPacket[]>(
      `SELECT nmcg.id, nmcg.section_id
       FROM nutrition_meal_choice_groups nmcg
       JOIN nutrition_meal_sections nms ON nms.id = nmcg.section_id
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nmcg.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nmcg.deleted_at IS NULL
       FOR UPDATE;`,
      [choiceGroupPublicId, planId]
    );

    if (!Array.isArray(groupRows) || groupRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Grupo de alimentos não encontrado neste plano." };
    }

    const sectionId = Number(groupRows[0].section_id);

    const [siblingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, sort_order
       FROM nutrition_meal_choice_groups
       WHERE section_id = ?
         AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC
       FOR UPDATE;`,
      [sectionId]
    );

    const groups = (siblingRows || []) as { id: number; public_id: string; sort_order: number }[];
    const targetIdx = groups.findIndex((g) => g.public_id === choiceGroupPublicId);

    if (targetIdx === -1) {
      await connection.rollback();
      return { success: false, error: "Grupo não encontrado." };
    }

    const neighborIdx = direction === "UP" ? targetIdx - 1 : targetIdx + 1;
    if (neighborIdx < 0 || neighborIdx >= groups.length) {
      await connection.commit();
      return { success: true };
    }

    const temp = groups[targetIdx];
    groups[targetIdx] = groups[neighborIdx];
    groups[neighborIdx] = temp;

    for (let i = 0; i < groups.length; i++) {
      await connection.execute(
        `UPDATE nutrition_meal_choice_groups SET sort_order = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
        [i, groups[i].id]
      );
    }

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao mover grupo de alimentos.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type MoveNutritionMealItemParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  itemPublicId: string;
  direction: "UP" | "DOWN";
};

export async function moveNutritionMealItem({
  actorUserId,
  consultancySlug,
  planPublicId,
  itemPublicId,
  direction,
}: MoveNutritionMealItemParams): Promise<{ success: boolean; error?: string }> {
  if (direction !== "UP" && direction !== "DOWN") {
    return { success: false, error: "Direção de movimentação inválida." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT nmi.id, nmi.choice_group_id
       FROM nutrition_meal_items nmi
       JOIN nutrition_meal_choice_groups nmcg ON nmcg.id = nmi.choice_group_id
       JOIN nutrition_meal_sections nms ON nms.id = nmcg.section_id
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nmi.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nmi.deleted_at IS NULL
       FOR UPDATE;`,
      [itemPublicId, planId]
    );

    if (!Array.isArray(itemRows) || itemRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Item de alimento não encontrado neste plano." };
    }

    const choiceGroupId = Number(itemRows[0].choice_group_id);

    const [siblingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, sort_order
       FROM nutrition_meal_items
       WHERE choice_group_id = ?
         AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC
       FOR UPDATE;`,
      [choiceGroupId]
    );

    const items = (siblingRows || []) as { id: number; public_id: string; sort_order: number }[];
    const targetIdx = items.findIndex((i) => i.public_id === itemPublicId);

    if (targetIdx === -1) {
      await connection.rollback();
      return { success: false, error: "Item não encontrado." };
    }

    const neighborIdx = direction === "UP" ? targetIdx - 1 : targetIdx + 1;
    if (neighborIdx < 0 || neighborIdx >= items.length) {
      await connection.commit();
      return { success: true };
    }

    const temp = items[targetIdx];
    items[targetIdx] = items[neighborIdx];
    items[neighborIdx] = temp;

    for (let i = 0; i < items.length; i++) {
      await connection.execute(
        `UPDATE nutrition_meal_items SET sort_order = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
        [i, items[i].id]
      );
    }

    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao mover alimento.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type RemoveNutritionMealItemParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
  itemPublicId: string;
};

export async function removeNutritionMealItem({
  actorUserId,
  consultancySlug,
  planPublicId,
  itemPublicId,
}: RemoveNutritionMealItemParams): Promise<{ success: boolean; error?: string }> {
  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Validar e travar o plano (somente DRAFT)
    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM nutrition_plans
       WHERE public_id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [planPublicId, context.consultancyId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    if (planRows[0].status !== "DRAFT") {
      await connection.rollback();
      return { success: false, error: "Apenas planos em rascunho (DRAFT) podem ser alterados." };
    }

    const planId = Number(planRows[0].id);

    // 2. Travar o item e a cadeia completa
    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        nmi.id,
        nmi.choice_group_id,
        nmcg.section_id
       FROM nutrition_meal_items nmi
       JOIN nutrition_meal_choice_groups nmcg ON nmcg.id = nmi.choice_group_id
       JOIN nutrition_meal_sections nms ON nms.id = nmcg.section_id
       JOIN nutrition_meal_options nmo ON nmo.id = nms.option_id
       JOIN nutrition_meals nm ON nm.id = nmo.meal_id
       WHERE nmi.public_id = ?
         AND nm.nutrition_plan_id = ?
         AND nmi.deleted_at IS NULL
       FOR UPDATE;`,
      [itemPublicId, planId]
    );

    if (!Array.isArray(itemRows) || itemRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Item de alimento não encontrado neste plano." };
    }

    const itemId = Number(itemRows[0].id);
    const choiceGroupId = Number(itemRows[0].choice_group_id);
    const sectionId = Number(itemRows[0].section_id);

    // 3. Excluir o item
    await connection.execute(
      `UPDATE nutrition_meal_items
       SET deleted_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?;`,
      [itemId]
    );

    // 4. Verificar se restam outros itens no grupo
    const [remainingItems] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM nutrition_meal_items
       WHERE choice_group_id = ?
         AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC
       FOR UPDATE;`,
      [choiceGroupId]
    );

    if (Array.isArray(remainingItems) && remainingItems.length > 0) {
      // Recompactar posições dos itens restantes no grupo
      for (let i = 0; i < remainingItems.length; i++) {
        await connection.execute(
          `UPDATE nutrition_meal_items SET sort_order = ? WHERE id = ?;`,
          [i, Number(remainingItems[i].id)]
        );
      }
    } else {
      // Nenhum item restou: excluir o Choice Group vazio (invariante de grupos sem itens vazios)
      await connection.execute(
        `UPDATE nutrition_meal_choice_groups
         SET deleted_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?;`,
        [choiceGroupId]
      );

      // Recompactar posições dos Choice Groups restantes na seção
      const [remainingGroups] = await connection.execute<RowDataPacket[]>(
        `SELECT id
         FROM nutrition_meal_choice_groups
         WHERE section_id = ?
           AND deleted_at IS NULL
         ORDER BY sort_order ASC, id ASC
         FOR UPDATE;`,
        [sectionId]
      );

      for (let i = 0; i < remainingGroups.length; i++) {
        await connection.execute(
          `UPDATE nutrition_meal_choice_groups SET sort_order = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
          [i, Number(remainingGroups[i].id)]
        );
      }
    }

    // 5. Atualizar timestamp do plano
    await connection.execute(
      `UPDATE nutrition_plans SET updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?;`,
      [planId]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao remover alimento.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type GetPlanForNutritionistParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
};

/**
 * Obtém a hierarquia completa de um plano nutricional para o Nutricionista.
 */
export async function getNutritionPlanForNutritionist({
  actorUserId,
  consultancySlug,
  planPublicId,
}: GetPlanForNutritionistParams): Promise<NutritionistPlanEditorDto | null> {
  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !planPublicId ||
    typeof planPublicId !== "string"
  ) {
    return null;
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return null;
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    // 1. Buscar cabeçalho do plano
    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        np.id,
        np.public_id,
        np.title,
        np.subtitle,
        np.general_guidance,
        np.status,
        DATE_FORMAT(np.starts_on, '%Y-%m-%d') AS starts_on,
        DATE_FORMAT(np.ends_on, '%Y-%m-%d') AS ends_on,
        np.activated_at,
        np.archived_at,
        u.full_name AS student_name,
        u.email AS student_email,
        cm.public_id AS student_membership_public_id
       FROM nutrition_plans np
       JOIN consultancy_members cm ON cm.id = np.student_membership_id
       JOIN users u ON u.id = cm.user_id
       WHERE np.consultancy_id = ?
         AND np.public_id = ?
         AND np.deleted_at IS NULL
       LIMIT 1;`,
      [context.consultancyId, planPublicId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      return null;
    }

    const pRow = planRows[0];
    const planId = Number(pRow.id);

    // 2. Buscar toda a hierarquia do plano em uma query única e determinística
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        nm.id AS meal_id,
        nm.public_id AS meal_public_id,
        nm.title AS meal_title,
        TIME_FORMAT(nm.scheduled_time, '%H:%i') AS meal_scheduled_time,
        nm.notes AS meal_notes,
        nm.sort_order AS meal_sort_order,

        nmo.id AS option_id,
        nmo.public_id AS option_public_id,
        nmo.title AS option_title,
        nmo.description AS option_description,
        nmo.sort_order AS option_sort_order,

        nms.id AS section_id,
        nms.public_id AS section_public_id,
        nms.category_key AS section_category_key,
        nms.title AS section_title,
        nms.sort_order AS section_sort_order,

        nmcg.id AS choice_group_id,
        nmcg.public_id AS choice_group_public_id,
        nmcg.title AS choice_group_title,
        nmcg.selection_min AS choice_group_selection_min,
        nmcg.selection_max AS choice_group_selection_max,
        nmcg.sort_order AS choice_group_sort_order,

        nmi.id AS item_id,
        nmi.public_id AS item_public_id,
        nf.public_id AS catalog_food_public_id,
        nfp.public_id AS catalog_portion_public_id,
        nmi.sort_order AS item_sort_order,
        nmi.food_name_snapshot,
        nmi.category_snapshot,
        nmi.reference_amount_snapshot,
        nmi.reference_unit_snapshot,
        nmi.calories_reference_snapshot,
        nmi.protein_reference_snapshot,
        nmi.carbohydrate_reference_snapshot,
        nmi.fat_reference_snapshot,
        nmi.portion_label_snapshot,
        nmi.equivalent_reference_amount_snapshot,
        nmi.prescribed_quantity,
        nmi.prescribed_unit_label,
        nmi.calculated_calories,
        nmi.calculated_protein,
        nmi.calculated_carbohydrate,
        nmi.calculated_fat,
        nmi.notes AS item_notes
       FROM nutrition_meals nm
       LEFT JOIN nutrition_meal_options nmo ON nmo.meal_id = nm.id AND nmo.deleted_at IS NULL
       LEFT JOIN nutrition_meal_sections nms ON nms.option_id = nmo.id AND nms.deleted_at IS NULL
       LEFT JOIN nutrition_meal_choice_groups nmcg ON nmcg.section_id = nms.id AND nmcg.deleted_at IS NULL
       LEFT JOIN nutrition_meal_items nmi ON nmi.choice_group_id = nmcg.id AND nmi.deleted_at IS NULL
       LEFT JOIN nutrition_foods nf ON nf.id = nmi.food_id
       LEFT JOIN nutrition_food_portions nfp ON nfp.id = nmi.food_portion_id
       WHERE nm.nutrition_plan_id = ?
         AND nm.deleted_at IS NULL
       ORDER BY
         nm.sort_order ASC, nm.id ASC,
         nmo.sort_order ASC, nmo.id ASC,
         nms.sort_order ASC, nms.id ASC,
         nmcg.sort_order ASC, nmcg.id ASC,
         nmi.sort_order ASC, nmi.id ASC;`,
      [planId]
    );

    const mealsMap = new Map<number, NutritionMealDto>();
    const optionsMap = new Map<number, NutritionMealOptionDto>();
    const sectionsMap = new Map<number, NutritionMealSectionDto>();
    const choiceGroupsMap = new Map<number, NutritionMealChoiceGroupDto>();

    for (const r of rows) {
      const mealId = Number(r.meal_id);
      if (!mealsMap.has(mealId)) {
        mealsMap.set(mealId, {
          publicId: String(r.meal_public_id),
          title: String(r.meal_title),
          scheduledTime: r.meal_scheduled_time ? String(r.meal_scheduled_time) : null,
          notes: r.meal_notes ? String(r.meal_notes) : null,
          sortOrder: Number(r.meal_sort_order),
          options: [],
        });
      }

      if (r.option_id) {
        const optionId = Number(r.option_id);
        if (!optionsMap.has(optionId)) {
          const opt: NutritionMealOptionDto = {
            publicId: String(r.option_public_id),
            title: r.option_title ? String(r.option_title) : null,
            description: r.option_description ? String(r.option_description) : null,
            sortOrder: Number(r.option_sort_order),
            sections: [],
          };
          optionsMap.set(optionId, opt);
          mealsMap.get(mealId)!.options.push(opt);
        }

        if (r.section_id) {
          const sectionId = Number(r.section_id);
          if (!sectionsMap.has(sectionId)) {
            const sec: NutritionMealSectionDto = {
              publicId: String(r.section_public_id),
              categoryKey: r.section_category_key ? String(r.section_category_key) : null,
              title: String(r.section_title),
              sortOrder: Number(r.section_sort_order),
              choiceGroups: [],
            };
            sectionsMap.set(sectionId, sec);
            optionsMap.get(optionId)!.sections.push(sec);
          }

          if (r.choice_group_id) {
            const cgId = Number(r.choice_group_id);
            if (!choiceGroupsMap.has(cgId)) {
              const cg: NutritionMealChoiceGroupDto = {
                publicId: String(r.choice_group_public_id),
                title: r.choice_group_title ? String(r.choice_group_title) : null,
                selectionMin: Number(r.choice_group_selection_min),
                selectionMax: Number(r.choice_group_selection_max),
                sortOrder: Number(r.choice_group_sort_order),
                items: [],
              };
              choiceGroupsMap.set(cgId, cg);
              sectionsMap.get(sectionId)!.choiceGroups.push(cg);
            }

            if (r.item_id) {
              choiceGroupsMap.get(cgId)!.items.push({
                publicId: String(r.item_public_id),
                foodPublicId: r.catalog_food_public_id ? String(r.catalog_food_public_id) : null,
                foodPortionPublicId: r.catalog_portion_public_id ? String(r.catalog_portion_public_id) : null,
                sortOrder: Number(r.item_sort_order),
                foodNameSnapshot: String(r.food_name_snapshot),
                categorySnapshot: r.category_snapshot ? String(r.category_snapshot) : null,
                referenceAmountSnapshot: r.reference_amount_snapshot !== null ? Number(r.reference_amount_snapshot) : null,
                referenceUnitSnapshot: r.reference_unit_snapshot ? String(r.reference_unit_snapshot) : null,
                caloriesReferenceSnapshot: r.calories_reference_snapshot !== null ? Number(r.calories_reference_snapshot) : null,
                proteinReferenceSnapshot: r.protein_reference_snapshot !== null ? Number(r.protein_reference_snapshot) : null,
                carbohydrateReferenceSnapshot: r.carbohydrate_reference_snapshot !== null ? Number(r.carbohydrate_reference_snapshot) : null,
                fatReferenceSnapshot: r.fat_reference_snapshot !== null ? Number(r.fat_reference_snapshot) : null,
                portionLabelSnapshot: r.portion_label_snapshot ? String(r.portion_label_snapshot) : null,
                equivalentReferenceAmountSnapshot: r.equivalent_reference_amount_snapshot !== null ? Number(r.equivalent_reference_amount_snapshot) : null,
                prescribedQuantity: Number(r.prescribed_quantity),
                prescribedUnitLabel: String(r.prescribed_unit_label),
                calculatedCalories: r.calculated_calories !== null ? Number(r.calculated_calories) : null,
                calculatedProtein: r.calculated_protein !== null ? Number(r.calculated_protein) : null,
                calculatedCarbohydrate: r.calculated_carbohydrate !== null ? Number(r.calculated_carbohydrate) : null,
                calculatedFat: r.calculated_fat !== null ? Number(r.calculated_fat) : null,
                notes: r.item_notes ? String(r.item_notes) : null,
              });
            }
          }
        }
      }
    }

    const mealsList = Array.from(mealsMap.values()).map((meal) => {
      const optionsWithTotals = meal.options.map((opt) => ({
        ...opt,
        totals: calculateMealOptionTotals(opt),
      }));
      const mealWithTotals = {
        ...meal,
        options: optionsWithTotals,
      };
      return {
        ...mealWithTotals,
        totals: calculateMealTotals(mealWithTotals),
      };
    });

    const planTotals = calculatePlanTotals({ meals: mealsList });

    return {
      publicId: String(pRow.public_id),
      consultancyPublicId: context.consultancySlug,
      title: String(pRow.title),
      subtitle: pRow.subtitle ? String(pRow.subtitle) : null,
      generalGuidance: pRow.general_guidance ? String(pRow.general_guidance) : null,
      status: pRow.status as NutritionPlanStatus,
      startsOn: pRow.starts_on ? String(pRow.starts_on) : null,
      endsOn: pRow.ends_on ? String(pRow.ends_on) : null,
      activatedAt: pRow.activated_at ? new Date(pRow.activated_at) : null,
      archivedAt: pRow.archived_at ? new Date(pRow.archived_at) : null,
      meals: mealsList,
      totals: planTotals,
      studentName: String(pRow.student_name),
      studentEmail: String(pRow.student_email),
      studentMembershipPublicId: String(pRow.student_membership_public_id),
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// READINESS VALIDATION
// ============================================================================

/**
 * Validador estático e puro de prontidão (readiness) para ativação do plano nutricional.
 */
export function validateNutritionPlanReadiness(
  plan: NutritionPlanDto
): NutritionPlanReadinessResult {
  const issues: ValidationIssue[] = [];

  if (!plan.title || !plan.title.trim()) {
    issues.push({
      code: "PLAN_TITLE_REQUIRED",
      path: "title",
      message: "O título do plano é obrigatório.",
    });
  }

  if (plan.startsOn && plan.endsOn) {
    if (new Date(plan.startsOn) > new Date(plan.endsOn)) {
      issues.push({
        code: "INVALID_DATE_RANGE",
        path: "date_range",
        message: "A data de início não pode ser posterior à data final.",
      });
    }
  }

  if (!Array.isArray(plan.meals) || plan.meals.length === 0) {
    issues.push({
      code: "EMPTY_PLAN_NO_MEALS",
      path: "meals",
      message: "O plano deve conter pelo menos uma refeição.",
    });
    return { valid: false, issues };
  }

  plan.meals.forEach((meal, mealIdx) => {
    const mealPath = `meals[${mealIdx}]`;
    if (!meal.title || !meal.title.trim()) {
      issues.push({
        code: "MEAL_TITLE_REQUIRED",
        path: `${mealPath}.title`,
        message: `A refeição ${mealIdx + 1} precisa de um título.`,
      });
    }

    if (!Array.isArray(meal.options) || meal.options.length === 0) {
      issues.push({
        code: "MEAL_NO_OPTIONS",
        path: `${mealPath}.options`,
        message: `A refeição "${meal.title || mealIdx + 1}" deve conter pelo menos uma opção.`,
      });
      return;
    }

    meal.options.forEach((opt, optIdx) => {
      const optPath = `${mealPath}.options[${optIdx}]`;
      if (!Array.isArray(opt.sections) || opt.sections.length === 0) {
        issues.push({
          code: "OPTION_NO_SECTIONS",
          path: `${optPath}.sections`,
          message: `A opção ${optIdx + 1} da refeição "${meal.title}" deve conter pelo menos uma seção.`,
        });
        return;
      }

      opt.sections.forEach((sec, secIdx) => {
        const secPath = `${optPath}.sections[${secIdx}]`;
        if (!sec.title || !sec.title.trim()) {
          issues.push({
            code: "SECTION_TITLE_REQUIRED",
            path: `${secPath}.title`,
            message: `A seção ${secIdx + 1} da opção ${optIdx + 1} precisa de um título.`,
          });
        }

        if (!Array.isArray(sec.choiceGroups) || sec.choiceGroups.length === 0) {
          issues.push({
            code: "SECTION_NO_CHOICE_GROUPS",
            path: `${secPath}.choiceGroups`,
            message: `A seção "${sec.title || secIdx + 1}" deve conter pelo menos um grupo de escolha.`,
          });
          return;
        }

        sec.choiceGroups.forEach((cg, cgIdx) => {
          const cgPath = `${secPath}.choiceGroups[${cgIdx}]`;
          if (!Array.isArray(cg.items) || cg.items.length === 0) {
            issues.push({
              code: "CHOICE_GROUP_NO_ITEMS",
              path: `${cgPath}.items`,
              message: `O grupo de escolha ${cgIdx + 1} da seção "${sec.title}" deve conter pelo menos um item.`,
            });
            return;
          }

          cg.items.forEach((item, itemIdx) => {
            const itemPath = `${cgPath}.items[${itemIdx}]`;
            if (!item.foodNameSnapshot || !item.foodNameSnapshot.trim()) {
              issues.push({
                code: "ITEM_NAME_REQUIRED",
                path: `${itemPath}.foodNameSnapshot`,
                message: `O item ${itemIdx + 1} no grupo ${cgIdx + 1} precisa do nome do alimento.`,
              });
            }

            if (!Number.isFinite(item.prescribedQuantity) || item.prescribedQuantity <= 0) {
              issues.push({
                code: "ITEM_INVALID_QUANTITY",
                path: `${itemPath}.prescribedQuantity`,
                message: `O item "${item.foodNameSnapshot || itemIdx + 1}" deve ter quantidade prescrita maior que zero.`,
              });
            }

            if (!item.prescribedUnitLabel || !item.prescribedUnitLabel.trim()) {
              issues.push({
                code: "ITEM_UNIT_REQUIRED",
                path: `${itemPath}.prescribedUnitLabel`,
                message: `O item "${item.foodNameSnapshot || itemIdx + 1}" deve ter uma unidade/medida prescrita.`,
              });
            }

            // Se for item da biblioteca, validar snapshots nutricionais
            if (item.foodPublicId !== null) {
              if (
                item.referenceAmountSnapshot === null ||
                item.referenceAmountSnapshot <= 0 ||
                item.caloriesReferenceSnapshot === null ||
                item.proteinReferenceSnapshot === null ||
                item.carbohydrateReferenceSnapshot === null ||
                item.fatReferenceSnapshot === null
              ) {
                issues.push({
                  code: "LIBRARY_ITEM_INCOMPLETE_SNAPSHOT",
                  path: `${itemPath}.snapshots`,
                  message: `O item de biblioteca "${item.foodNameSnapshot}" possui snapshots nutricionais incompletos.`,
                });
              }
            }
          });
        });
      });
    });
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

// ============================================================================
// PLAN ACTIVATION TRANSACTION
// ============================================================================

export type ActivateNutritionPlanParams = {
  actorUserId: number;
  consultancySlug: string;
  planPublicId: string;
};

export type ActivateNutritionPlanResult =
  | { success: true; alreadyActive?: boolean }
  | { success: false; error: string; issues?: ValidationIssue[] };

/**
 * Ativa um plano nutricional em transação segura com bloqueio pessimista (FOR UPDATE),
 * arquivando qualquer ACTIVE anterior do mesmo aluno nesta consultoria.
 */
export async function activateNutritionPlan({
  actorUserId,
  consultancySlug,
  planPublicId,
}: ActivateNutritionPlanParams): Promise<ActivateNutritionPlanResult> {
  if (
    !actorUserId ||
    typeof actorUserId !== "number" ||
    actorUserId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !planPublicId ||
    typeof planPublicId !== "string"
  ) {
    return { success: false, error: "Parâmetros inválidos." };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context || !context.roles.includes("NUTRITIONIST")) {
    return { success: false, error: "Acesso não autorizado para ativação de planos nutricionais." };
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock e validação do plano alvo
    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        np.id,
        np.public_id,
        np.consultancy_id,
        np.student_membership_id,
        np.nutritionist_membership_id,
        np.status
       FROM nutrition_plans np
       WHERE np.consultancy_id = ?
         AND np.public_id = ?
         AND np.deleted_at IS NULL
       FOR UPDATE;`,
      [context.consultancyId, planPublicId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Plano nutricional não encontrado." };
    }

    const planRow = planRows[0];
    const planId = Number(planRow.id);
    const studentMembershipId = Number(planRow.student_membership_id);

    // 2. Lock comum de serialização por Student no tenant (bloqueia a membership do aluno)
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, user_id
       FROM consultancy_members
       WHERE id = ?
         AND consultancy_id = ?
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [studentMembershipId, context.consultancyId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Membro do aluno não encontrado para serialização." };
    }

    // Se já estiver ACTIVE: idempotência segura
    if (planRow.status === "ACTIVE") {
      await connection.commit();
      return { success: true, alreadyActive: true };
    }

    // Se estiver ARCHIVED: não pode ser reativado diretamente
    if (planRow.status === "ARCHIVED") {
      await connection.rollback();
      return { success: false, error: "Planos arquivados não podem ser ativados diretamente." };
    }

    // 2. Carregar e validar readiness
    const planHierarchy = await getNutritionPlanForNutritionist({
      actorUserId,
      consultancySlug,
      planPublicId,
    });

    if (!planHierarchy) {
      await connection.rollback();
      return { success: false, error: "Falha ao carregar estrutura do plano para validação." };
    }

    const readiness = validateNutritionPlanReadiness(planHierarchy);
    if (!readiness.valid) {
      await connection.rollback();
      return {
        success: false,
        error: "O plano nutricional não atende aos requisitos mínimos para ativação.",
        issues: readiness.issues,
      };
    }

    // 3. Arquivar plano ACTIVE anterior do mesmo aluno neste tenant
    await connection.execute(
      `UPDATE nutrition_plans
       SET status = 'ARCHIVED',
           archived_at = CURRENT_TIMESTAMP(3)
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND status = 'ACTIVE'
         AND id != ?;`,
      [context.consultancyId, studentMembershipId, planId]
    );

    // 4. Ativar plano alvo
    await connection.execute(
      `UPDATE nutrition_plans
       SET status = 'ACTIVE',
           activated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?;`,
      [planId]
    );

    // 5. Registrar evento de auditoria
    const auditPublicId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json
       ) VALUES (?, ?, ?, 'NUTRITION_PLAN_ACTIVATED', 'NUTRITION_PLAN', ?, NULL);`,
      [auditPublicId, actorUserId, context.consultancyId, planPublicId]
    );

    const studentUserId = Number(memberRows[0].user_id);

    // 6. Persist canonical domain notification
    const notification = await createNotificationInTransaction(connection, {
      userId: studentUserId,
      consultancyId: context.consultancyId,
      priority: "NORMAL",
      eventType: "NUTRITION_PLAN_ACTIVATED",
      title: "Novo plano alimentar",
      body: "Seu novo plano alimentar está disponível no Trevo.",
      deepLink: `/consultoria/${consultancySlug}/nutricao`,
      dedupeKey: `nutrition:activated:${planPublicId}`,
      sourceType: "NUTRITION_PLAN",
      sourcePublicId: planPublicId,
    });

    await connection.commit();

    // Best-effort external delivery after commit
    try {
      await deliverNotificationAfterCommit(notification.id);
    } catch {
      // Push failure must never affect business transaction success
    }

    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const message = err instanceof Error ? err.message : "Erro ao ativar plano nutricional.";
    return { success: false, error: message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// STUDENT OWN ACTIVE READ
// ============================================================================

/**
 * Busca o plano nutricional ativo para o aluno (read-only, own ACTIVE, snapshot-based).
 * Nunca faz lookup live com a biblioteca de alimentos para renderizar dados históricos.
 */
export async function getActiveNutritionPlanForStudent(
  userId: number,
  consultancySlug: string
): Promise<NutritionPlanDto | null> {
  if (
    !userId ||
    typeof userId !== "number" ||
    userId <= 0 ||
    !consultancySlug ||
    typeof consultancySlug !== "string" ||
    !consultancySlug.trim()
  ) {
    return null;
  }

  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context || (!context.roles.includes("STUDENT") && !context.roles.includes("INFLUENCER"))) {
    return null;
  }

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    // 1. Buscar o plano ativo do aluno neste tenant
    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        np.id,
        np.public_id,
        np.title,
        np.subtitle,
        np.general_guidance,
        np.status,
        DATE_FORMAT(np.starts_on, '%Y-%m-%d') AS starts_on,
        DATE_FORMAT(np.ends_on, '%Y-%m-%d') AS ends_on,
        np.activated_at,
        np.archived_at
       FROM nutrition_plans np
       WHERE np.consultancy_id = ?
         AND np.student_membership_id = ?
         AND np.status = 'ACTIVE'
         AND np.deleted_at IS NULL
       ORDER BY np.activated_at DESC, np.id DESC
       LIMIT 1;`,
      [context.consultancyId, context.membershipId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      return null;
    }

    const pRow = planRows[0];
    const planId = Number(pRow.id);

    // 2. Buscar hierarquia com snapshots dos itens em batch sem N+1
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        nm.id AS meal_id,
        nm.public_id AS meal_public_id,
        nm.title AS meal_title,
        TIME_FORMAT(nm.scheduled_time, '%H:%i') AS meal_scheduled_time,
        nm.notes AS meal_notes,
        nm.sort_order AS meal_sort_order,

        nmo.id AS option_id,
        nmo.public_id AS option_public_id,
        nmo.title AS option_title,
        nmo.description AS option_description,
        nmo.sort_order AS option_sort_order,

        nms.id AS section_id,
        nms.public_id AS section_public_id,
        nms.category_key AS section_category_key,
        nms.title AS section_title,
        nms.sort_order AS section_sort_order,

        nmcg.id AS choice_group_id,
        nmcg.public_id AS choice_group_public_id,
        nmcg.title AS choice_group_title,
        nmcg.selection_min AS choice_group_selection_min,
        nmcg.selection_max AS choice_group_selection_max,
        nmcg.sort_order AS choice_group_sort_order,

        nmi.id AS item_id,
        nmi.public_id AS item_public_id,
        nmi.sort_order AS item_sort_order,
        nmi.food_name_snapshot,
        nmi.category_snapshot,
        nmi.reference_amount_snapshot,
        nmi.reference_unit_snapshot,
        nmi.calories_reference_snapshot,
        nmi.protein_reference_snapshot,
        nmi.carbohydrate_reference_snapshot,
        nmi.fat_reference_snapshot,
        nmi.portion_label_snapshot,
        nmi.equivalent_reference_amount_snapshot,
        nmi.prescribed_quantity,
        nmi.prescribed_unit_label,
        nmi.calculated_calories,
        nmi.calculated_protein,
        nmi.calculated_carbohydrate,
        nmi.calculated_fat,
        nmi.notes AS item_notes
       FROM nutrition_meals nm
       LEFT JOIN nutrition_meal_options nmo ON nmo.meal_id = nm.id AND nmo.deleted_at IS NULL
       LEFT JOIN nutrition_meal_sections nms ON nms.option_id = nmo.id AND nms.deleted_at IS NULL
       LEFT JOIN nutrition_meal_choice_groups nmcg ON nmcg.section_id = nms.id AND nmcg.deleted_at IS NULL
       LEFT JOIN nutrition_meal_items nmi ON nmi.choice_group_id = nmcg.id AND nmi.deleted_at IS NULL
       WHERE nm.nutrition_plan_id = ?
         AND nm.deleted_at IS NULL
       ORDER BY
         nm.sort_order ASC, nm.id ASC,
         nmo.sort_order ASC, nmo.id ASC,
         nms.sort_order ASC, nms.id ASC,
         nmcg.sort_order ASC, nmcg.id ASC,
         nmi.sort_order ASC, nmi.id ASC;`,
      [planId]
    );

    const mealsMap = new Map<number, NutritionMealDto>();
    const optionsMap = new Map<number, NutritionMealOptionDto>();
    const sectionsMap = new Map<number, NutritionMealSectionDto>();
    const choiceGroupsMap = new Map<number, NutritionMealChoiceGroupDto>();

    for (const r of rows) {
      const mealId = Number(r.meal_id);
      if (!mealsMap.has(mealId)) {
        mealsMap.set(mealId, {
          publicId: String(r.meal_public_id),
          title: String(r.meal_title),
          scheduledTime: r.meal_scheduled_time ? String(r.meal_scheduled_time) : null,
          notes: r.meal_notes ? String(r.meal_notes) : null,
          sortOrder: Number(r.meal_sort_order),
          options: [],
        });
      }

      if (r.option_id) {
        const optionId = Number(r.option_id);
        if (!optionsMap.has(optionId)) {
          const opt: NutritionMealOptionDto = {
            publicId: String(r.option_public_id),
            title: r.option_title ? String(r.option_title) : null,
            description: r.option_description ? String(r.option_description) : null,
            sortOrder: Number(r.option_sort_order),
            sections: [],
          };
          optionsMap.set(optionId, opt);
          mealsMap.get(mealId)!.options.push(opt);
        }

        if (r.section_id) {
          const sectionId = Number(r.section_id);
          if (!sectionsMap.has(sectionId)) {
            const sec: NutritionMealSectionDto = {
              publicId: String(r.section_public_id),
              categoryKey: r.section_category_key ? String(r.section_category_key) : null,
              title: String(r.section_title),
              sortOrder: Number(r.section_sort_order),
              choiceGroups: [],
            };
            sectionsMap.set(sectionId, sec);
            optionsMap.get(optionId)!.sections.push(sec);
          }

          if (r.choice_group_id) {
            const cgId = Number(r.choice_group_id);
            if (!choiceGroupsMap.has(cgId)) {
              const cg: NutritionMealChoiceGroupDto = {
                publicId: String(r.choice_group_public_id),
                title: r.choice_group_title ? String(r.choice_group_title) : null,
                selectionMin: Number(r.choice_group_selection_min),
                selectionMax: Number(r.choice_group_selection_max),
                sortOrder: Number(r.choice_group_sort_order),
                items: [],
              };
              choiceGroupsMap.set(cgId, cg);
              sectionsMap.get(sectionId)!.choiceGroups.push(cg);
            }

            if (r.item_id) {
              choiceGroupsMap.get(cgId)!.items.push({
                publicId: String(r.item_public_id),
                foodPublicId: null,
                foodPortionPublicId: null,
                sortOrder: Number(r.item_sort_order),
                foodNameSnapshot: String(r.food_name_snapshot),
                categorySnapshot: r.category_snapshot ? String(r.category_snapshot) : null,
                referenceAmountSnapshot: r.reference_amount_snapshot !== null ? Number(r.reference_amount_snapshot) : null,
                referenceUnitSnapshot: r.reference_unit_snapshot ? String(r.reference_unit_snapshot) : null,
                caloriesReferenceSnapshot: r.calories_reference_snapshot !== null ? Number(r.calories_reference_snapshot) : null,
                proteinReferenceSnapshot: r.protein_reference_snapshot !== null ? Number(r.protein_reference_snapshot) : null,
                carbohydrateReferenceSnapshot: r.carbohydrate_reference_snapshot !== null ? Number(r.carbohydrate_reference_snapshot) : null,
                fatReferenceSnapshot: r.fat_reference_snapshot !== null ? Number(r.fat_reference_snapshot) : null,
                portionLabelSnapshot: r.portion_label_snapshot ? String(r.portion_label_snapshot) : null,
                equivalentReferenceAmountSnapshot: r.equivalent_reference_amount_snapshot !== null ? Number(r.equivalent_reference_amount_snapshot) : null,
                prescribedQuantity: Number(r.prescribed_quantity),
                prescribedUnitLabel: String(r.prescribed_unit_label),
                calculatedCalories: r.calculated_calories !== null ? Number(r.calculated_calories) : null,
                calculatedProtein: r.calculated_protein !== null ? Number(r.calculated_protein) : null,
                calculatedCarbohydrate: r.calculated_carbohydrate !== null ? Number(r.calculated_carbohydrate) : null,
                calculatedFat: r.calculated_fat !== null ? Number(r.calculated_fat) : null,
                notes: r.item_notes ? String(r.item_notes) : null,
              });
            }
          }
        }
      }
    }

    const mealsList = Array.from(mealsMap.values()).map((meal) => {
      const optionsWithTotals = meal.options.map((opt) => ({
        ...opt,
        totals: calculateMealOptionTotals(opt),
      }));
      const mealWithTotals = {
        ...meal,
        options: optionsWithTotals,
      };
      return {
        ...mealWithTotals,
        totals: calculateMealTotals(mealWithTotals),
      };
    });

    const planTotals = calculatePlanTotals({ meals: mealsList });

    return {
      publicId: String(pRow.public_id),
      consultancyPublicId: context.consultancySlug,
      title: String(pRow.title),
      subtitle: pRow.subtitle ? String(pRow.subtitle) : null,
      generalGuidance: pRow.general_guidance ? String(pRow.general_guidance) : null,
      status: pRow.status as NutritionPlanStatus,
      startsOn: pRow.starts_on ? String(pRow.starts_on) : null,
      endsOn: pRow.ends_on ? String(pRow.ends_on) : null,
      activatedAt: pRow.activated_at ? new Date(pRow.activated_at) : null,
      archivedAt: pRow.archived_at ? new Date(pRow.archived_at) : null,
      meals: mealsList,
      totals: planTotals,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
