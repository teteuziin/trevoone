import crypto from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { resolveConsultancyContext } from "./context";

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
};

export type NutritionMealDto = {
  publicId: string;
  title: string;
  scheduledTime: string | null;
  notes: string | null;
  sortOrder: number;
  options: NutritionMealOptionDto[];
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

export type MacroCalculationInput = {
  referenceAmount: number;
  caloriesKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  portionEquivalentAmount?: number | null;
  prescribedQuantity: number;
};

export type CalculatedMacros = {
  totalReferenceAmountUsed: number;
  calculatedCalories: number;
  calculatedProtein: number;
  calculatedCarbohydrate: number;
  calculatedFat: number;
};

/**
 * Calcula macros proporcionais de forma determinística e segura contra NaN, Infinity e valores negativos.
 */
export function calculateItemMacros(input: MacroCalculationInput): CalculatedMacros {
  const refAmount = Number(input.referenceAmount);
  const qty = Number(input.prescribedQuantity);

  if (!Number.isFinite(refAmount) || refAmount <= 0 || !Number.isFinite(qty) || qty <= 0) {
    return {
      totalReferenceAmountUsed: 0,
      calculatedCalories: 0,
      calculatedProtein: 0,
      calculatedCarbohydrate: 0,
      calculatedFat: 0,
    };
  }

  const portionEq = input.portionEquivalentAmount ? Number(input.portionEquivalentAmount) : null;
  const totalRefUsed = portionEq && Number.isFinite(portionEq) && portionEq > 0
    ? qty * portionEq
    : qty;

  const ratio = totalRefUsed / refAmount;

  const round2 = (v: number): number => {
    if (!Number.isFinite(v) || v < 0) return 0;
    return Math.round(v * 100) / 100;
  };

  return {
    totalReferenceAmountUsed: round2(totalRefUsed),
    calculatedCalories: round2(Number(input.caloriesKcal || 0) * ratio),
    calculatedProtein: round2(Number(input.proteinG || 0) * ratio),
    calculatedCarbohydrate: round2(Number(input.carbohydrateG || 0) * ratio),
    calculatedFat: round2(Number(input.fatG || 0) * ratio),
  };
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
       JOIN consultancy_member_roles cmr ON cmr.membership_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.public_id = ?
         AND cmr.role = 'STUDENT'
         AND cm.deleted_at IS NULL
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
        startsOn,
        endsOn
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?);`,
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
      meals: Array.from(mealsMap.values()),
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
      `SELECT id
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

    await connection.commit();
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
  if (!context || !context.roles.includes("STUDENT")) {
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
      meals: Array.from(mealsMap.values()),
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
