/**
 * TREVO ONE — NUTRITION V2 FOOD & PORTION REPOSITORY
 * Unified food catalog operations, tenancy isolation, and portion management.
 */

import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  NutritionAuthorizationError,
  type NutritionAccessContext,
  assertCanAuthorNutrition,
  assertCanViewNutrition,
  assertCanManageGlobal,
} from "./access";
import type {
  NutritionV2FoodDto,
  NutritionV2FoodPortionDto,
  NutritionV2FoodScope,
  NutritionV2FoodStatus,
} from "./types";

export type ListFoodsFilter = {
  query?: string;
  scope?: "ALL" | "GLOBAL" | "CONSULTANCY";
  status?: "ACTIVE" | "ARCHIVED" | "ALL";
  source?: "ALL" | "TACO" | "USDA" | "CONSULTANCY";
  category?: string;
  page?: number;
  pageSize?: number;
};

export interface FoodListItemDto extends Omit<NutritionV2FoodDto, "id"> {
  portionsCount: number;
}

export interface ListFoodsResult {
  items: FoodListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FoodWithPortionsDto extends Omit<NutritionV2FoodDto, "id"> {
  portions: Omit<NutritionV2FoodPortionDto, "id" | "foodId">[];
}

export type CreateFoodInput = {
  name: string;
  category?: string | null;
  brand?: string | null;
  productLine?: string | null;
  flavorOrVariant?: string | null;
  manufacturer?: string | null;
  referenceAmount?: number;
  referenceUnitCode?: string;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbohydrateG?: number | null;
  fatG?: number | null;
  sourceType?: string;
  sourceKey?: string | null;
  sourceExternalCode?: string | null;
  sourceVersion?: string | null;
  sourceReference?: string | null;
};

export type UpdateFoodInput = Partial<CreateFoodInput>;

export type CreatePortionInput = {
  label: string;
  equivalentReferenceAmount: number;
  sortOrder?: number;
};

export type UpdatePortionInput = Partial<CreatePortionInput>;

export {
  normalizeSearchText,
  SEARCH_STOP_WORDS,
  tokenizeSearchQuery,
  getFirstRelevantToken,
  COMMON_FOOD_SYNONYMS,
  expandSearchTokensWithSynonyms,
  buildFoodSearchOrderClause,
  getDataQualityBadgeInfo,
} from "./food-search";
import {
  normalizeSearchText,
  tokenizeSearchQuery,
  expandSearchTokensWithSynonyms,
  buildFoodSearchOrderClause,
} from "./food-search";

// ============================================================================
// PROFESSIONAL UNIFIED SEARCH (NUTRITIONIST CONTEXT)
// ============================================================================

export async function listUnifiedFoodsForNutritionist(
  ctx: NutritionAccessContext,
  filter: ListFoodsFilter = {}
): Promise<ListFoodsResult> {
  assertCanViewNutrition(ctx);

  const page = Math.max(1, Number(filter.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(filter.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const targetScope = filter.scope || "ALL";
  const targetStatus = filter.status || "ACTIVE";

  const conditions: string[] = ["f.deleted_at IS NULL"];
  const params: (string | number)[] = [];

  // Tenancy isolation filter
  if (targetScope === "GLOBAL") {
    conditions.push("f.scope = 'GLOBAL' AND f.status = 'ACTIVE'");
  } else if (targetScope === "CONSULTANCY") {
    conditions.push("f.scope = 'CONSULTANCY' AND f.consultancy_id = ?");
    params.push(ctx.consultancyId!);
    if (targetStatus === "ACTIVE") {
      conditions.push("f.status = 'ACTIVE'");
    } else if (targetStatus === "ARCHIVED") {
      conditions.push("f.status = 'ARCHIVED'");
    } else {
      conditions.push("f.status IN ('ACTIVE', 'ARCHIVED')");
    }
  } else {
    // ALL: GLOBAL ACTIVE + Current Consultancy
    if (targetStatus === "ACTIVE") {
      conditions.push(
        "((f.scope = 'GLOBAL' AND f.status = 'ACTIVE') OR (f.scope = 'CONSULTANCY' AND f.consultancy_id = ? AND f.status = 'ACTIVE'))"
      );
      params.push(ctx.consultancyId!);
    } else if (targetStatus === "ARCHIVED") {
      // Archived only applies to tenancy custom foods
      conditions.push("f.scope = 'CONSULTANCY' AND f.consultancy_id = ? AND f.status = 'ARCHIVED'");
      params.push(ctx.consultancyId!);
    } else {
      conditions.push(
        "((f.scope = 'GLOBAL' AND f.status = 'ACTIVE') OR (f.scope = 'CONSULTANCY' AND f.consultancy_id = ? AND f.status IN ('ACTIVE', 'ARCHIVED')))"
      );
      params.push(ctx.consultancyId!);
    }
  }

  // Source filter
  if (filter.source && filter.source !== "ALL") {
    if (filter.source === "TACO") {
      conditions.push("f.source_key = 'TACO'");
    } else if (filter.source === "USDA") {
      conditions.push("f.source_key IN ('USDA_FOUNDATION', 'USDA_FNDDS')");
    } else if (filter.source === "CONSULTANCY") {
      conditions.push("f.scope = 'CONSULTANCY'");
    }
  }

  // Text search & tokenization with synonym expansion
  const queryTokens = filter.query ? tokenizeSearchQuery(filter.query) : [];
  if (queryTokens.length > 0) {
    const tokenGroups = expandSearchTokensWithSynonyms(queryTokens);
    for (const group of tokenGroups) {
      const orClauses: string[] = [];
      for (const variant of group) {
        orClauses.push("f.normalized_display_name_pt_br LIKE ? OR f.normalized_name LIKE ?");
        params.push(`%${variant}%`, `%${variant}%`);
      }
      conditions.push(`(${orClauses.join(" OR ")})`);
    }
  }

  // Category filter
  if (filter.category && filter.category.trim()) {
    conditions.push("f.category = ?");
    params.push(filter.category.trim());
  }

  const whereClause = conditions.join(" AND ");

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Count total
    const [countRows] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM nutrition_v2_foods f WHERE ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / pageSize) || 1;

    // 2. Fetch page with portions count and deterministic ranking
    const { orderClause, orderParams } = buildFoodSearchOrderClause(
      filter.query || "",
      queryTokens,
      true
    );
    const selectParams: (string | number)[] = [...params, ...orderParams, pageSize, offset];

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
        f.public_id,
        f.scope,
        f.consultancy_id,
        f.name,
        f.display_name_pt_br,
        f.normalized_display_name_pt_br,
        f.normalized_name,
        f.category,
        f.brand,
        f.product_line,
        f.flavor_or_variant,
        f.manufacturer,
        f.reference_amount,
        f.reference_unit_code,
        f.calories_kcal,
        f.protein_g,
        f.carbohydrate_g,
        f.fat_g,
        f.fiber_g,
        f.data_quality,
        f.status,
        f.source_type,
        f.source_key,
        f.source_external_code,
        f.source_version,
        f.source_reference,
        f.source_imported_at,
        f.last_verified_at,
        f.source_uid,
        f.created_by_user_id,
        f.created_by_membership_id,
        f.created_at,
        f.updated_at,
        f.deleted_at,
        (
          SELECT COUNT(*)
          FROM nutrition_v2_food_portions fp
          WHERE fp.food_id = f.id
            AND fp.deleted_at IS NULL
            AND fp.status = 'ACTIVE'
        ) AS portions_count
      FROM nutrition_v2_foods f
      WHERE ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?`,
      selectParams
    );

    const items: FoodListItemDto[] = (rows as RowDataPacket[]).map((r) => ({
      publicId: r.public_id,
      scope: r.scope as NutritionV2FoodScope,
      consultancyId: r.consultancy_id != null ? String(r.consultancy_id) : null,
      name: r.name,
      displayNamePtBr: r.display_name_pt_br != null ? String(r.display_name_pt_br) : null,
      normalizedDisplayNamePtBr: r.normalized_display_name_pt_br != null ? String(r.normalized_display_name_pt_br) : null,
      normalizedName: r.normalized_name,
      category: r.category,
      brand: r.brand != null ? String(r.brand) : null,
      productLine: r.product_line != null ? String(r.product_line) : null,
      flavorOrVariant: r.flavor_or_variant != null ? String(r.flavor_or_variant) : null,
      manufacturer: r.manufacturer != null ? String(r.manufacturer) : null,
      referenceAmount: Number(r.reference_amount),
      referenceUnitCode: r.reference_unit_code,
      caloriesKcal: r.calories_kcal != null ? Number(r.calories_kcal) : null,
      proteinG: r.protein_g != null ? Number(r.protein_g) : null,
      carbohydrateG: r.carbohydrate_g != null ? Number(r.carbohydrate_g) : null,
      fatG: r.fat_g != null ? Number(r.fat_g) : null,
      fiberG: r.fiber_g != null ? Number(r.fiber_g) : null,
      dataQuality: r.data_quality != null ? String(r.data_quality) : "UNCLASSIFIED",
      status: r.status as NutritionV2FoodStatus,
      sourceType: r.source_type,
      sourceKey: r.source_key,
      sourceExternalCode: r.source_external_code,
      sourceVersion: r.source_version,
      sourceReference: r.source_reference,
      sourceImportedAt: r.source_imported_at ? new Date(r.source_imported_at).toISOString() : null,
      lastVerifiedAt: r.last_verified_at ? new Date(r.last_verified_at).toISOString() : null,
      sourceUid: r.source_uid,
      createdByUserId: r.created_by_user_id != null ? String(r.created_by_user_id) : null,
      createdByMembershipId: r.created_by_membership_id != null ? String(r.created_by_membership_id) : null,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      deletedAt: r.deleted_at ? new Date(r.deleted_at).toISOString() : null,
      portionsCount: Number(r.portions_count || 0),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// GLOBAL FOOD LIBRARY SEARCH (PLATFORM ADMIN CONTEXT)
// ============================================================================

export async function listGlobalFoodsForAdmin(
  ctx: NutritionAccessContext,
  filter: ListFoodsFilter = {}
): Promise<ListFoodsResult> {
  assertCanManageGlobal(ctx);

  const page = Math.max(1, Number(filter.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(filter.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const targetStatus = filter.status || "ALL";

  const conditions: string[] = ["f.deleted_at IS NULL", "f.scope = 'GLOBAL'"];
  const params: (string | number)[] = [];

  if (targetStatus === "ACTIVE") {
    conditions.push("f.status = 'ACTIVE'");
  } else if (targetStatus === "ARCHIVED") {
    conditions.push("f.status = 'ARCHIVED'");
  }

  // Text search & tokenization with synonym expansion
  const queryTokens = filter.query ? tokenizeSearchQuery(filter.query) : [];
  if (queryTokens.length > 0) {
    const tokenGroups = expandSearchTokensWithSynonyms(queryTokens);
    for (const group of tokenGroups) {
      const orClauses: string[] = [];
      for (const variant of group) {
        orClauses.push("f.normalized_display_name_pt_br LIKE ? OR f.normalized_name LIKE ?");
        params.push(`%${variant}%`, `%${variant}%`);
      }
      conditions.push(`(${orClauses.join(" OR ")})`);
    }
  }

  if (filter.category && filter.category.trim()) {
    conditions.push("f.category = ?");
    params.push(filter.category.trim());
  }

  const whereClause = conditions.join(" AND ");

  let connection;
  try {
    connection = await getDbConnection();

    const [countRows] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM nutrition_v2_foods f WHERE ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / pageSize) || 1;

    // Fetch page with deterministic ranking
    const { orderClause, orderParams } = buildFoodSearchOrderClause(
      filter.query || "",
      queryTokens,
      false
    );
    const selectParams: (string | number)[] = [...params, ...orderParams, pageSize, offset];

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
        f.public_id,
        f.scope,
        f.consultancy_id,
        f.name,
        f.display_name_pt_br,
        f.normalized_display_name_pt_br,
        f.normalized_name,
        f.category,
        f.brand,
        f.product_line,
        f.flavor_or_variant,
        f.manufacturer,
        f.reference_amount,
        f.reference_unit_code,
        f.calories_kcal,
        f.protein_g,
        f.carbohydrate_g,
        f.fat_g,
        f.fiber_g,
        f.data_quality,
        f.status,
        f.source_type,
        f.source_key,
        f.source_external_code,
        f.source_version,
        f.source_reference,
        f.source_imported_at,
        f.last_verified_at,
        f.source_uid,
        f.created_by_user_id,
        f.created_by_membership_id,
        f.created_at,
        f.updated_at,
        f.deleted_at,
        (
          SELECT COUNT(*)
          FROM nutrition_v2_food_portions fp
          WHERE fp.food_id = f.id
            AND fp.deleted_at IS NULL
            AND fp.status = 'ACTIVE'
        ) AS portions_count
      FROM nutrition_v2_foods f
      WHERE ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?`,
      selectParams
    );

    const items: FoodListItemDto[] = (rows as RowDataPacket[]).map((r) => ({
      publicId: r.public_id,
      scope: r.scope as NutritionV2FoodScope,
      consultancyId: null,
      name: r.name,
      displayNamePtBr: r.display_name_pt_br != null ? String(r.display_name_pt_br) : null,
      normalizedDisplayNamePtBr: r.normalized_display_name_pt_br != null ? String(r.normalized_display_name_pt_br) : null,
      normalizedName: r.normalized_name,
      category: r.category,
      brand: r.brand != null ? String(r.brand) : null,
      productLine: r.product_line != null ? String(r.product_line) : null,
      flavorOrVariant: r.flavor_or_variant != null ? String(r.flavor_or_variant) : null,
      manufacturer: r.manufacturer != null ? String(r.manufacturer) : null,
      referenceAmount: Number(r.reference_amount),
      referenceUnitCode: r.reference_unit_code,
      caloriesKcal: r.calories_kcal != null ? Number(r.calories_kcal) : null,
      proteinG: r.protein_g != null ? Number(r.protein_g) : null,
      carbohydrateG: r.carbohydrate_g != null ? Number(r.carbohydrate_g) : null,
      fatG: r.fat_g != null ? Number(r.fat_g) : null,
      fiberG: r.fiber_g != null ? Number(r.fiber_g) : null,
      dataQuality: r.data_quality != null ? String(r.data_quality) : "UNCLASSIFIED",
      status: r.status as NutritionV2FoodStatus,
      sourceType: r.source_type,
      sourceKey: r.source_key,
      sourceExternalCode: r.source_external_code,
      sourceVersion: r.source_version,
      sourceReference: r.source_reference,
      sourceImportedAt: r.source_imported_at ? new Date(r.source_imported_at).toISOString() : null,
      lastVerifiedAt: r.last_verified_at ? new Date(r.last_verified_at).toISOString() : null,
      sourceUid: r.source_uid,
      createdByUserId: r.created_by_user_id != null ? String(r.created_by_user_id) : null,
      createdByMembershipId: null,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      deletedAt: r.deleted_at ? new Date(r.deleted_at).toISOString() : null,
      portionsCount: Number(r.portions_count || 0),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// SINGLE FOOD GET & PORTIONS
// ============================================================================

export async function getFoodWithPortions(
  foodPublicId: string,
  ctx: NutritionAccessContext
): Promise<FoodWithPortionsDto | null> {
  let connection;
  try {
    connection = await getDbConnection();

    const [foods] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_foods WHERE public_id = ? AND deleted_at IS NULL`,
      [foodPublicId]
    );

    if (foods.length === 0) return null;
    const f = foods[0];

    // Authorization check
    if (f.scope === "CONSULTANCY") {
      if (!ctx.consultancyId || Number(f.consultancy_id) !== ctx.consultancyId) {
        throw new NutritionAuthorizationError(
          "Acesso negado a este alimento da consultoria.",
          "FORBIDDEN_TENANT_FOOD",
          403
        );
      }
    }

    const [portions] = await connection.query<RowDataPacket[]>(
      `SELECT public_id, label, equivalent_reference_amount, sort_order, status, created_at, updated_at, deleted_at
       FROM nutrition_v2_food_portions
       WHERE food_id = ? AND deleted_at IS NULL AND status = 'ACTIVE'
       ORDER BY sort_order ASC, label ASC`,
      [f.id]
    );

    return {
      publicId: f.public_id,
      scope: f.scope,
      consultancyId: f.consultancy_id != null ? String(f.consultancy_id) : null,
      name: f.name,
      displayNamePtBr: f.display_name_pt_br != null ? String(f.display_name_pt_br) : null,
      normalizedDisplayNamePtBr: f.normalized_display_name_pt_br != null ? String(f.normalized_display_name_pt_br) : null,
      normalizedName: f.normalized_name,
      category: f.category,
      brand: f.brand != null ? String(f.brand) : null,
      productLine: f.product_line != null ? String(f.product_line) : null,
      flavorOrVariant: f.flavor_or_variant != null ? String(f.flavor_or_variant) : null,
      manufacturer: f.manufacturer != null ? String(f.manufacturer) : null,
      referenceAmount: Number(f.reference_amount),
      referenceUnitCode: f.reference_unit_code,
      caloriesKcal: f.calories_kcal != null ? Number(f.calories_kcal) : null,
      proteinG: f.protein_g != null ? Number(f.protein_g) : null,
      carbohydrateG: f.carbohydrate_g != null ? Number(f.carbohydrate_g) : null,
      fatG: f.fat_g != null ? Number(f.fat_g) : null,
      fiberG: f.fiber_g != null ? Number(f.fiber_g) : null,
      dataQuality: f.data_quality != null ? String(f.data_quality) : "UNCLASSIFIED",
      lastVerifiedAt: f.last_verified_at ? new Date(f.last_verified_at).toISOString() : null,
      status: f.status,
      sourceType: f.source_type,
      sourceKey: f.source_key,
      sourceExternalCode: f.source_external_code,
      sourceVersion: f.source_version,
      sourceReference: f.source_reference,
      sourceImportedAt: f.source_imported_at ? new Date(f.source_imported_at).toISOString() : null,
      sourceUid: f.source_uid,
      createdByUserId: f.created_by_user_id != null ? String(f.created_by_user_id) : null,
      createdByMembershipId: f.created_by_membership_id != null ? String(f.created_by_membership_id) : null,
      createdAt: new Date(f.created_at).toISOString(),
      updatedAt: new Date(f.updated_at).toISOString(),
      deletedAt: f.deleted_at ? new Date(f.deleted_at).toISOString() : null,
      portions: portions.map((p) => ({
        publicId: p.public_id,
        label: p.label,
        equivalentReferenceAmount: Number(p.equivalent_reference_amount),
        sortOrder: p.sort_order,
        status: p.status,
        createdAt: new Date(p.created_at).toISOString(),
        updatedAt: new Date(p.updated_at).toISOString(),
        deletedAt: p.deleted_at ? new Date(p.deleted_at).toISOString() : null,
      })),
    };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// CONSULTANCY FOOD CRUD (NUTRITIONIST CONTEXT)
// ============================================================================

export async function createConsultancyFood(
  ctx: NutritionAccessContext,
  input: CreateFoodInput
): Promise<{ publicId: string }> {
  assertCanAuthorNutrition(ctx);

  const publicId = crypto.randomUUID();
  const name = input.name.trim();
  const normalizedName = normalizeSearchText(name);
  const category = input.category ? input.category.trim() : null;
  const referenceAmount = input.referenceAmount != null && input.referenceAmount > 0 ? input.referenceAmount : 100.0;
  const referenceUnitCode = (input.referenceUnitCode || "G").trim().toUpperCase();
  const caloriesKcal = input.caloriesKcal != null ? input.caloriesKcal : null;
  const proteinG = input.proteinG != null ? input.proteinG : null;
  const carbohydrateG = input.carbohydrateG != null ? input.carbohydrateG : null;
  const fatG = input.fatG != null ? input.fatG : null;

  let connection;
  try {
    connection = await getDbConnection();
    await connection.query(
      `INSERT INTO nutrition_v2_foods (
        public_id,
        scope,
        consultancy_id,
        name,
        normalized_name,
        category,
        reference_amount,
        reference_unit_code,
        calories_kcal,
        protein_g,
        carbohydrate_g,
        fat_g,
        status,
        source_type,
        source_key,
        source_external_code,
        source_version,
        source_reference,
        source_imported_at,
        source_uid,
        created_by_user_id,
        created_by_membership_id
      ) VALUES (?, 'CONSULTANCY', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'MANUAL', NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
      [
        publicId,
        ctx.consultancyId!,
        name,
        normalizedName,
        category,
        referenceAmount,
        referenceUnitCode,
        caloriesKcal,
        proteinG,
        carbohydrateG,
        fatG,
        ctx.userId,
        ctx.membershipId!,
      ]
    );

    return { publicId };
  } finally {
    if (connection) connection.release();
  }
}

export async function updateConsultancyFood(
  ctx: NutritionAccessContext,
  foodPublicId: string,
  input: UpdateFoodInput
): Promise<{ success: boolean }> {
  assertCanAuthorNutrition(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // Verify existing food ownership
    const [existing] = await connection.query<RowDataPacket[]>(
      `SELECT id, scope, consultancy_id FROM nutrition_v2_foods WHERE public_id = ? AND deleted_at IS NULL`,
      [foodPublicId]
    );

    if (existing.length === 0) {
      throw new NutritionAuthorizationError("Alimento não encontrado.", "FOOD_NOT_FOUND", 404);
    }

    const food = existing[0];
    if (food.scope !== "CONSULTANCY" || Number(food.consultancy_id) !== ctx.consultancyId) {
      throw new NutritionAuthorizationError(
        "Acesso negado: você só pode editar alimentos da sua própria consultoria.",
        "FORBIDDEN_MUTATION",
        403
      );
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.name !== undefined) {
      const name = input.name.trim();
      updates.push("name = ?");
      params.push(name);
      updates.push("normalized_name = ?");
      params.push(normalizeSearchText(name));
    }

    if (input.category !== undefined) {
      updates.push("category = ?");
      params.push(input.category ? input.category.trim() : null);
    }

    if (input.referenceAmount !== undefined) {
      updates.push("reference_amount = ?");
      params.push(input.referenceAmount);
    }

    if (input.referenceUnitCode !== undefined) {
      updates.push("reference_unit_code = ?");
      params.push(input.referenceUnitCode.trim().toUpperCase());
    }

    if (input.caloriesKcal !== undefined) {
      updates.push("calories_kcal = ?");
      params.push(input.caloriesKcal);
    }

    if (input.proteinG !== undefined) {
      updates.push("protein_g = ?");
      params.push(input.proteinG);
    }

    if (input.carbohydrateG !== undefined) {
      updates.push("carbohydrate_g = ?");
      params.push(input.carbohydrateG);
    }

    if (input.fatG !== undefined) {
      updates.push("fat_g = ?");
      params.push(input.fatG);
    }

    if (updates.length === 0) return { success: true };

    params.push(food.id);
    await connection.query(
      `UPDATE nutrition_v2_foods SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    return { success: true };
  } finally {
    if (connection) connection.release();
  }
}

export async function archiveConsultancyFood(
  ctx: NutritionAccessContext,
  foodPublicId: string
): Promise<{ success: boolean }> {
  assertCanAuthorNutrition(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    const [existing] = await connection.query<RowDataPacket[]>(
      `SELECT id, scope, consultancy_id FROM nutrition_v2_foods WHERE public_id = ? AND deleted_at IS NULL`,
      [foodPublicId]
    );

    if (existing.length === 0) {
      throw new NutritionAuthorizationError("Alimento não encontrado.", "FOOD_NOT_FOUND", 404);
    }

    const food = existing[0];
    if (food.scope !== "CONSULTANCY" || Number(food.consultancy_id) !== ctx.consultancyId) {
      throw new NutritionAuthorizationError(
        "Acesso negado: você só pode arquivar alimentos da sua própria consultoria.",
        "FORBIDDEN_MUTATION",
        403
      );
    }

    await connection.query(
      `UPDATE nutrition_v2_foods SET status = 'ARCHIVED' WHERE id = ?`,
      [food.id]
    );

    return { success: true };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// GLOBAL FOOD CRUD (PLATFORM ADMIN CONTEXT)
// ============================================================================

export async function createGlobalFood(
  ctx: NutritionAccessContext,
  input: CreateFoodInput
): Promise<{ publicId: string }> {
  assertCanManageGlobal(ctx);

  const publicId = crypto.randomUUID();
  const name = input.name.trim();
  const normalizedName = normalizeSearchText(name);
  const category = input.category ? input.category.trim() : null;
  const referenceAmount = input.referenceAmount != null && input.referenceAmount > 0 ? input.referenceAmount : 100.0;
  const referenceUnitCode = (input.referenceUnitCode || "G").trim().toUpperCase();
  const caloriesKcal = input.caloriesKcal != null ? input.caloriesKcal : null;
  const proteinG = input.proteinG != null ? input.proteinG : null;
  const carbohydrateG = input.carbohydrateG != null ? input.carbohydrateG : null;
  const fatG = input.fatG != null ? input.fatG : null;

  let connection;
  try {
    connection = await getDbConnection();
    await connection.query(
      `INSERT INTO nutrition_v2_foods (
        public_id,
        scope,
        consultancy_id,
        name,
        normalized_name,
        category,
        reference_amount,
        reference_unit_code,
        calories_kcal,
        protein_g,
        carbohydrate_g,
        fat_g,
        status,
        source_type,
        source_key,
        source_external_code,
        source_version,
        source_reference,
        source_imported_at,
        source_uid,
        created_by_user_id,
        created_by_membership_id
      ) VALUES (?, 'GLOBAL', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'MANUAL', NULL, NULL, NULL, NULL, NULL, NULL, ?, NULL)`,
      [
        publicId,
        name,
        normalizedName,
        category,
        referenceAmount,
        referenceUnitCode,
        caloriesKcal,
        proteinG,
        carbohydrateG,
        fatG,
        ctx.userId,
      ]
    );

    return { publicId };
  } finally {
    if (connection) connection.release();
  }
}

export async function updateGlobalFood(
  ctx: NutritionAccessContext,
  foodPublicId: string,
  input: UpdateFoodInput
): Promise<{ success: boolean }> {
  assertCanManageGlobal(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    const [existing] = await connection.query<RowDataPacket[]>(
      `SELECT id, scope FROM nutrition_v2_foods WHERE public_id = ? AND deleted_at IS NULL`,
      [foodPublicId]
    );

    if (existing.length === 0) {
      throw new NutritionAuthorizationError("Alimento não encontrado.", "FOOD_NOT_FOUND", 404);
    }

    const food = existing[0];
    if (food.scope !== "GLOBAL") {
      throw new NutritionAuthorizationError(
        "Acesso negado: este painel gerencia apenas alimentos globais.",
        "FORBIDDEN_MUTATION",
        403
      );
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (input.name !== undefined) {
      const name = input.name.trim();
      updates.push("name = ?");
      params.push(name);
      updates.push("normalized_name = ?");
      params.push(normalizeSearchText(name));
    }

    if (input.category !== undefined) {
      updates.push("category = ?");
      params.push(input.category ? input.category.trim() : null);
    }

    if (input.referenceAmount !== undefined) {
      updates.push("reference_amount = ?");
      params.push(input.referenceAmount);
    }

    if (input.referenceUnitCode !== undefined) {
      updates.push("reference_unit_code = ?");
      params.push(input.referenceUnitCode.trim().toUpperCase());
    }

    if (input.caloriesKcal !== undefined) {
      updates.push("calories_kcal = ?");
      params.push(input.caloriesKcal);
    }

    if (input.proteinG !== undefined) {
      updates.push("protein_g = ?");
      params.push(input.proteinG);
    }

    if (input.carbohydrateG !== undefined) {
      updates.push("carbohydrate_g = ?");
      params.push(input.carbohydrateG);
    }

    if (input.fatG !== undefined) {
      updates.push("fat_g = ?");
      params.push(input.fatG);
    }

    if (updates.length === 0) return { success: true };

    params.push(food.id);
    await connection.query(
      `UPDATE nutrition_v2_foods SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    return { success: true };
  } finally {
    if (connection) connection.release();
  }
}

export async function archiveGlobalFood(
  ctx: NutritionAccessContext,
  foodPublicId: string
): Promise<{ success: boolean }> {
  assertCanManageGlobal(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    const [existing] = await connection.query<RowDataPacket[]>(
      `SELECT id, scope FROM nutrition_v2_foods WHERE public_id = ? AND deleted_at IS NULL`,
      [foodPublicId]
    );

    if (existing.length === 0) {
      throw new NutritionAuthorizationError("Alimento não encontrado.", "FOOD_NOT_FOUND", 404);
    }

    const food = existing[0];
    if (food.scope !== "GLOBAL") {
      throw new NutritionAuthorizationError(
        "Acesso negado: este painel gerencia apenas alimentos globais.",
        "FORBIDDEN_MUTATION",
        403
      );
    }

    await connection.query(
      `UPDATE nutrition_v2_foods SET status = 'ARCHIVED' WHERE id = ?`,
      [food.id]
    );

    return { success: true };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// PORTIONS CRUD (TENANT & GLOBAL SCOPE)
// ============================================================================

export async function createFoodPortion(
  ctx: NutritionAccessContext,
  foodPublicId: string,
  input: CreatePortionInput
): Promise<{ publicId: string }> {
  let connection;
  try {
    connection = await getDbConnection();

    const [foods] = await connection.query<RowDataPacket[]>(
      `SELECT id, scope, consultancy_id FROM nutrition_v2_foods WHERE public_id = ? AND deleted_at IS NULL`,
      [foodPublicId]
    );

    if (foods.length === 0) {
      throw new NutritionAuthorizationError("Alimento não encontrado.", "FOOD_NOT_FOUND", 404);
    }

    const food = foods[0];

    // Ownership & authority check
    if (food.scope === "CONSULTANCY") {
      if (!ctx.canAuthorNutrition || !ctx.consultancyId || Number(food.consultancy_id) !== ctx.consultancyId) {
        throw new NutritionAuthorizationError(
          "Acesso negado: apenas Nutricionistas da consultoria podem gerenciar porções deste alimento.",
          "FORBIDDEN_PORTION_CREATION",
          403
        );
      }
    } else if (food.scope === "GLOBAL") {
      if (!ctx.canManageGlobal) {
        throw new NutritionAuthorizationError(
          "Apenas o Administrador da Plataforma pode gerenciar porções de alimentos globais.",
          "FORBIDDEN_GLOBAL_PORTION_CREATION",
          403
        );
      }
    }

    const portionPublicId = crypto.randomUUID();
    const label = input.label.trim();
    const amount = Number(input.equivalentReferenceAmount);
    const sortOrder = Number(input.sortOrder) || 0;

    await connection.query(
      `INSERT INTO nutrition_v2_food_portions (
        public_id,
        food_id,
        label,
        equivalent_reference_amount,
        sort_order,
        status
      ) VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
      [portionPublicId, food.id, label, amount, sortOrder]
    );

    return { publicId: portionPublicId };
  } finally {
    if (connection) connection.release();
  }
}

export async function updateFoodPortion(
  ctx: NutritionAccessContext,
  portionPublicId: string,
  input: UpdatePortionInput
): Promise<{ success: boolean }> {
  let connection;
  try {
    connection = await getDbConnection();

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT fp.id, fp.food_id, f.scope, f.consultancy_id
       FROM nutrition_v2_food_portions fp
       INNER JOIN nutrition_v2_foods f ON f.id = fp.food_id
       WHERE fp.public_id = ? AND fp.deleted_at IS NULL`,
      [portionPublicId]
    );

    if (rows.length === 0) {
      throw new NutritionAuthorizationError("Porção não encontrada.", "PORTION_NOT_FOUND", 404);
    }

    const p = rows[0];

    // Authorization check
    if (p.scope === "CONSULTANCY") {
      if (!ctx.canAuthorNutrition || !ctx.consultancyId || Number(p.consultancy_id) !== ctx.consultancyId) {
        throw new NutritionAuthorizationError(
          "Acesso negado: você não tem permissão para editar esta porção.",
          "FORBIDDEN_PORTION_MUTATION",
          403
        );
      }
    } else if (p.scope === "GLOBAL") {
      if (!ctx.canManageGlobal) {
        throw new NutritionAuthorizationError(
          "Apenas o Administrador da Plataforma pode editar porções de alimentos globais.",
          "FORBIDDEN_GLOBAL_PORTION_MUTATION",
          403
        );
      }
    }

    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (input.label !== undefined) {
      updates.push("label = ?");
      params.push(input.label.trim());
    }

    if (input.equivalentReferenceAmount !== undefined) {
      updates.push("equivalent_reference_amount = ?");
      params.push(Number(input.equivalentReferenceAmount));
    }

    if (input.sortOrder !== undefined) {
      updates.push("sort_order = ?");
      params.push(Number(input.sortOrder));
    }

    if (updates.length === 0) return { success: true };

    params.push(p.id);
    await connection.query(
      `UPDATE nutrition_v2_food_portions SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    return { success: true };
  } finally {
    if (connection) connection.release();
  }
}

export async function archiveFoodPortion(
  ctx: NutritionAccessContext,
  portionPublicId: string
): Promise<{ success: boolean }> {
  let connection;
  try {
    connection = await getDbConnection();

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT fp.id, fp.food_id, f.scope, f.consultancy_id
       FROM nutrition_v2_food_portions fp
       INNER JOIN nutrition_v2_foods f ON f.id = fp.food_id
       WHERE fp.public_id = ? AND fp.deleted_at IS NULL`,
      [portionPublicId]
    );

    if (rows.length === 0) {
      throw new NutritionAuthorizationError("Porção não encontrada.", "PORTION_NOT_FOUND", 404);
    }

    const p = rows[0];

    // Authorization check
    if (p.scope === "CONSULTANCY") {
      if (!ctx.canAuthorNutrition || !ctx.consultancyId || Number(p.consultancy_id) !== ctx.consultancyId) {
        throw new NutritionAuthorizationError(
          "Acesso negado: você não tem permissão para arquivar esta porção.",
          "FORBIDDEN_PORTION_MUTATION",
          403
        );
      }
    } else if (p.scope === "GLOBAL") {
      if (!ctx.canManageGlobal) {
        throw new NutritionAuthorizationError(
          "Apenas o Administrador da Plataforma pode arquivar porções de alimentos globais.",
          "FORBIDDEN_GLOBAL_PORTION_MUTATION",
          403
        );
      }
    }

    await connection.query(
      `UPDATE nutrition_v2_food_portions SET status = 'ARCHIVED' WHERE id = ?`,
      [p.id]
    );

    return { success: true };
  } finally {
    if (connection) connection.release();
  }
}
