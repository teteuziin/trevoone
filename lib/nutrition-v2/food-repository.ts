/**
 * TREVO ONE — NUTRITION V2 FOOD & PORTION REPOSITORY
 * Unified food catalog operations, tenancy isolation, and portion management.
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { calculateItemNutrients, type CanonicalPortionSource } from "./nutrient-calculator";
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

export interface FoodWithPortionsDto extends Omit<NutritionV2FoodDto, "id"> {
  portions: Omit<NutritionV2FoodPortionDto, "id" | "foodId">[];
}

export type CreateFoodInput = {
  name: string;
  category?: string | null;
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


import {
  FoodLibraryQueryError,
  FoodLibraryQueryUnknownError,
  FoodLibraryQueryCountError,
  FoodLibraryQuerySelectError,
  FoodLibraryQueryOrderError,
  FoodLibraryQueryPortionsError,
  FoodLibraryMappingError,
  extractSafeMysqlError,
  mapFoodRow,
  cleanFoodDisplayName,
  buildWhereClause,
  buildCountQuery,
  buildSelectFoodsQuery,
  buildFoodSearchOrderClause,
  type FoodSourceTab,
  type ListFoodsFilter,
  type FoodListItemDto,
  type ListFoodsResult,
  type FoodLibraryQuerySubstage,
  type SafeMysqlErrorInfo,
  safeIsoString,
  safeNullableNumber,
  safeNumber,
  safeString,
  safeNullableString,
  normalizeSearchText,
  SEARCH_STOP_WORDS,
  tokenizeSearchQuery,
  COMMON_FOOD_SYNONYMS,
  expandSearchTokensWithSynonyms,
  APPROVED_BR_SOURCE_KEYS,
  APPROVED_COMMERCIAL_SOURCE_KEYS,
  INTERNATIONAL_DATABASE_SOURCE_KEYS,
  isApprovedBrSourceKey,
  isApprovedCommercialSourceKey,
  OBJECTIVE_INVALID_DATA_SQL_CONDITION,
  type ApprovedBrSourceKey,
  type ApprovedCommercialSourceKey,
} from "./food-query-builder";

export {
  FoodLibraryQueryError,
  FoodLibraryQueryUnknownError,
  FoodLibraryQueryCountError,
  FoodLibraryQuerySelectError,
  FoodLibraryQueryOrderError,
  FoodLibraryQueryPortionsError,
  FoodLibraryMappingError,
  extractSafeMysqlError,
  mapFoodRow,
  buildWhereClause,
  buildCountQuery,
  buildSelectFoodsQuery,
  buildFoodSearchOrderClause,
  type FoodSourceTab,
  type ListFoodsFilter,
  type FoodListItemDto,
  type ListFoodsResult,
  type FoodLibraryQuerySubstage,
  type SafeMysqlErrorInfo,
  safeIsoString,
  safeNullableNumber,
  safeNumber,
  safeString,
  safeNullableString,
  normalizeSearchText,
  SEARCH_STOP_WORDS,
  tokenizeSearchQuery,
  COMMON_FOOD_SYNONYMS,
  expandSearchTokensWithSynonyms,
  APPROVED_BR_SOURCE_KEYS,
  APPROVED_COMMERCIAL_SOURCE_KEYS,
  INTERNATIONAL_DATABASE_SOURCE_KEYS,
  isApprovedBrSourceKey,
  isApprovedCommercialSourceKey,
  OBJECTIVE_INVALID_DATA_SQL_CONDITION,
  type ApprovedBrSourceKey,
  type ApprovedCommercialSourceKey,
};

export { getDataQualityBadgeInfo } from "./food-search";

export async function listUnifiedFoodsForNutritionist(
  ctx: NutritionAccessContext,
  filter: ListFoodsFilter = {}
): Promise<ListFoodsResult> {
  assertCanViewNutrition(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Isolated COUNT stage
    const countQuery = buildCountQuery(filter, ctx.consultancyId);
    let countRows: RowDataPacket[];
    try {
      [countRows] = await connection.query<RowDataPacket[]>(countQuery.sql, countQuery.params);
    } catch (countErr) {
      const mysqlErr = extractSafeMysqlError(countErr);
      console.error(`[Food Library] stage=COUNT mysql_code=${mysqlErr.code || "UNKNOWN"}`);
      throw new FoodLibraryQueryCountError(
        `Falha na contagem de alimentos: ${mysqlErr.code || "Erro"}`,
        countErr
      );
    }
    const total = Number(countRows[0]?.total) || 0;

    // 2. Isolated SELECT stage with sub-stage probes
    const builtQuery = buildSelectFoodsQuery(filter, ctx.consultancyId, { isUnified: true });
    const totalPages = Math.ceil(total / builtQuery.pageSize) || 1;

    let rows: RowDataPacket[];
    try {
      [rows] = await connection.query<RowDataPacket[]>(builtQuery.fullSql, builtQuery.selectParams);
    } catch (queryErr) {
      const mysqlErr = extractSafeMysqlError(queryErr);

      // Probe 1: Subconsulta de porções
      let portionsFailed = false;
      try {
        await connection.query<RowDataPacket[]>(builtQuery.noPortionsSql, builtQuery.selectParams);
        portionsFailed = true;
      } catch {
        // portions was not the only failing element
      }

      if (portionsFailed) {
        console.error(`[Food Library] stage=PORTIONS mysql_code=${mysqlErr.code || "UNKNOWN"}`);
        throw new FoodLibraryQueryPortionsError(
          `Falha na subconsulta de porções: ${mysqlErr.code || "Erro"}`,
          queryErr
        );
      }

      // Probe 2: Cláusula ORDER BY
      let orderFailed = false;
      try {
        await connection.query<RowDataPacket[]>(builtQuery.noOrderSql, builtQuery.noOrderParams);
        orderFailed = true;
      } catch {
        // order was not the only failing element
      }

      if (orderFailed) {
        console.error(`[Food Library] stage=ORDER mysql_code=${mysqlErr.code || "UNKNOWN"}`);
        throw new FoodLibraryQueryOrderError(
          `Falha na ordenação da consulta: ${mysqlErr.code || "Erro"}`,
          queryErr
        );
      }

      // Falha residual é atribuída ao SELECT base (colunas / tabela)
      console.error(`[Food Library] stage=SELECT mysql_code=${mysqlErr.code || "UNKNOWN"}`);
      throw new FoodLibraryQuerySelectError(
        `Falha na seleção de alimentos: ${mysqlErr.code || "Erro"}`,
        queryErr
      );
    }

    // 3. Mapeamento defensivo estrito sem falsos defaults semânticos
    let items: FoodListItemDto[];
    try {
      items = (rows as RowDataPacket[]).map((r) => mapFoodRow(r as Record<string, unknown>));
    } catch (mappingErr) {
      console.error(
        `[Food Library] stage=MAPPING error=${mappingErr instanceof Error ? mappingErr.message : String(mappingErr)}`
      );
      if (mappingErr instanceof FoodLibraryMappingError) {
        throw mappingErr;
      }
      throw new FoodLibraryMappingError(
        `Falha no mapeamento das linhas de alimentos: ${mappingErr instanceof Error ? mappingErr.message : String(mappingErr)}`,
        mappingErr
      );
    }

    return {
      items,
      total,
      page: Math.floor(builtQuery.offset / builtQuery.pageSize) + 1,
      pageSize: builtQuery.pageSize,
      totalPages,
    };
  } finally {
    if (connection) connection.release();
  }
}

export async function listGlobalFoodsForAdmin(
  ctx: NutritionAccessContext,
  filter: ListFoodsFilter = {}
): Promise<ListFoodsResult> {
  assertCanManageGlobal(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. COUNT
    const countQuery = buildCountQuery({ ...filter, scope: "GLOBAL" }, null);
    const [countRows] = await connection.query<RowDataPacket[]>(countQuery.sql, countQuery.params);
    const total = Number(countRows[0]?.total || 0);

    // 2. SELECT
    const builtQuery = buildSelectFoodsQuery({ ...filter, scope: "GLOBAL" }, null, { isUnified: false });
    const totalPages = Math.ceil(total / builtQuery.pageSize) || 1;

    const [rows] = await connection.query<RowDataPacket[]>(builtQuery.fullSql, builtQuery.selectParams);

    const items: FoodListItemDto[] = (rows as RowDataPacket[]).map((r) =>
      mapFoodRow(r as Record<string, unknown>)
    );

    return {
      items,
      total,
      page: Math.floor(builtQuery.offset / builtQuery.pageSize) + 1,
      pageSize: builtQuery.pageSize,
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
      publicId: safeString(f.public_id),
      scope: (f.scope === "CONSULTANCY" ? "CONSULTANCY" : "GLOBAL") as NutritionV2FoodScope,
      consultancyId: f.consultancy_id != null ? String(f.consultancy_id) : null,
      name: safeString(f.name, "Alimento sem nome"),
      displayNamePtBr: cleanFoodDisplayName(safeNullableString(f.display_name_pt_br) || safeString(f.name), safeNullableString(f.source_key)) || safeString(f.name),
      normalizedDisplayNamePtBr: normalizeSearchText(cleanFoodDisplayName(safeNullableString(f.display_name_pt_br) || safeString(f.name), safeNullableString(f.source_key)) || safeString(f.name)),
      normalizedName: safeString(f.normalized_name, ""),
      category: safeNullableString(f.category),
      referenceAmount: safeNumber(f.reference_amount, 100),
      referenceUnitCode: safeString(f.reference_unit_code, "G").toUpperCase(),
      caloriesKcal: safeNullableNumber(f.calories_kcal),
      proteinG: safeNullableNumber(f.protein_g),
      carbohydrateG: safeNullableNumber(f.carbohydrate_g),
      fatG: safeNullableNumber(f.fat_g),
      fiberG: safeNullableNumber(f.fiber_g),
      dataQuality: safeNullableString(f.data_quality) || "UNCLASSIFIED",
      lastVerifiedAt: safeIsoString(f.last_verified_at, null),
      status: (f.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE") as NutritionV2FoodStatus,
      sourceType: safeString(f.source_type, "MANUAL"),
      sourceKey: safeNullableString(f.source_key),
      sourceExternalCode: safeNullableString(f.source_external_code),
      sourceVersion: safeNullableString(f.source_version),
      sourceReference: safeNullableString(f.source_reference),
      sourceImportedAt: safeIsoString(f.source_imported_at, null),
      sourceUid: safeNullableString(f.source_uid),
      createdByUserId: f.created_by_user_id != null ? String(f.created_by_user_id) : null,
      createdByMembershipId: f.created_by_membership_id != null ? String(f.created_by_membership_id) : null,
      createdAt: safeIsoString(f.created_at, new Date(0).toISOString())!,
      updatedAt: safeIsoString(f.updated_at, new Date(0).toISOString())!,
      deletedAt: safeIsoString(f.deleted_at, null),
      portions: (portions as RowDataPacket[]).map((p) => ({
        publicId: safeString(p.public_id),
        label: safeString(p.label, "Porção"),
        equivalentReferenceAmount: safeNumber(p.equivalent_reference_amount, 100),
        sortOrder: safeNumber(p.sort_order, 0),
        status: safeString(p.status, "ACTIVE"),
        createdAt: safeIsoString(p.created_at, new Date(0).toISOString())!,
        updatedAt: safeIsoString(p.updated_at, new Date(0).toISOString())!,
        deletedAt: safeIsoString(p.deleted_at, null),
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

// ============================================================================
// PARTE E — REPOSITÓRIO: QUALQUER ALIMENTO NO TREVO ONE (SEM DEPENDER DO IBGE)
// ============================================================================

export interface RegisterFoodManualInput {
  name: string;
  brand?: string | null;
  category?: string | null;
  referenceAmount: number;
  referenceUnitCode: string;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbohydrateG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
  dataSource: "ROTULO" | "FABRICANTE" | "FONTE_CIENTIFICA" | "OUTRA";
  sourceReference?: string | null;
}

export async function registerFoodManually(
  ctx: NutritionAccessContext,
  input: RegisterFoodManualInput
): Promise<{ publicId: string; name: string; referenceAmount: number; referenceUnitCode: string; caloriesKcal: number | null; proteinG: number | null; carbohydrateG: number | null; fatG: number | null; sodiumMg?: number | null }> {
  assertCanAuthorNutrition(ctx);

  const name = input.name?.trim();
  if (!name) throw new Error("Nome do alimento é obrigatório.");

  const refAmount = Number(input.referenceAmount);
  if (isNaN(refAmount) || refAmount <= 0) throw new Error("Porção de referência inválida.");

  const refUnit = (input.referenceUnitCode || "G").trim().toUpperCase();

  const parseMacro = (val: unknown, fieldName: string): number | null => {
    if (val === null || val === undefined || val === "") return null;
    const num = Number(val);
    if (isNaN(num)) throw new Error(`Valor de ${fieldName} inválido.`);
    if (num < 0) throw new Error(`Valor de ${fieldName} não pode ser negativo.`);
    return Math.round(num * 100) / 100;
  };

  const kcal = parseMacro(input.caloriesKcal, "calorias");
  const p = parseMacro(input.proteinG, "proteína");
  const c = parseMacro(input.carbohydrateG, "carboidrato");
  const g = parseMacro(input.fatG, "gorduras");
  const fiber = parseMacro(input.fiberG, "fibras");
  const sodium = parseMacro(input.sodiumMg, "sódio");

  const publicId = crypto.randomUUID();
  const fullName = input.brand?.trim() ? `${name} (${input.brand.trim()})` : name;
  const normalizedName = normalizeSearchText(fullName);

  let connection;
  try {
    connection = await getDbConnection();
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_foods (
        public_id, scope, consultancy_id, name, display_name_pt_br,
        normalized_name, normalized_display_name_pt_br, category,
        reference_amount, reference_unit_code, calories_kcal, protein_g,
        carbohydrate_g, fat_g, status, source_type,
        source_key, source_reference, source_imported_at,
        source_uid, created_by_user_id, created_by_membership_id, created_at, updated_at
      ) VALUES (?, 'CONSULTANCY', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'PROFESSIONAL_UPLOAD', ?, ?, NOW(3), ?, ?, ?, NOW(3), NOW(3))`,
      [
        publicId,
        ctx.consultancyId,
        fullName,
        fullName,
        normalizedName,
        normalizedName,
        input.category?.trim() || "Alimento Personalizado",
        refAmount,
        refUnit,
        kcal,
        p,
        c,
        g,
        input.dataSource || "MANUAL",
        input.sourceReference?.trim() || null,
        `MANUAL:${publicId}`,
        ctx.userId,
        ctx.membershipId,
      ]
    );

    const foodId = result.insertId;

    if (sodium !== null && foodId) {
      const sodiumStatus = sodium === 0 ? "KNOWN_ZERO" : "KNOWN";
      await connection.query(
        `INSERT INTO nutrition_v2_food_nutrients (
          food_id, nutrient_code, amount_per_reference, unit_code, status, created_at, updated_at
        ) VALUES (?, 'NA', ?, 'MG', ?, NOW(3), NOW(3))`,
        [foodId, sodium, sodiumStatus]
      );
    }

    if (fiber !== null && foodId) {
      const fiberStatus = fiber === 0 ? "KNOWN_ZERO" : "KNOWN";
      await connection.query(
        `INSERT INTO nutrition_v2_food_nutrients (
          food_id, nutrient_code, amount_per_reference, unit_code, status, created_at, updated_at
        ) VALUES (?, 'FIBER', ?, 'G', ?, NOW(3), NOW(3))`,
        [foodId, fiber, fiberStatus]
      );
    }

    return {
      publicId,
      name: fullName,
      referenceAmount: refAmount,
      referenceUnitCode: refUnit,
      caloriesKcal: kcal,
      proteinG: p,
      carbohydrateG: c,
      fatG: g,
      sodiumMg: sodium,
    };
  } finally {
    if (connection) connection.release();
  }
}

export interface RegisterFoodLabelInput {
  name: string;
  brand?: string | null;
  servingAmount: number;
  servingUnitCode: string;
  servingHouseholdMeasure?: string | null;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbohydrateG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
  labelNotes?: string | null;
}

export async function registerFoodFromLabel(
  ctx: NutritionAccessContext,
  input: RegisterFoodLabelInput
): Promise<{ publicId: string; name: string; referenceAmount: number; referenceUnitCode: string; caloriesKcal: number | null; proteinG: number | null; carbohydrateG: number | null; fatG: number | null; sodiumMg?: number | null; portionPublicId?: string | null }> {
  assertCanAuthorNutrition(ctx);

  const name = input.name?.trim();
  if (!name) throw new Error("Nome do produto é obrigatório.");

  const servingAmount = Number(input.servingAmount);
  if (isNaN(servingAmount) || servingAmount <= 0) throw new Error("Tamanho da porção do rótulo inválido.");

  const servingUnit = (input.servingUnitCode || "G").trim().toUpperCase();

  const parseMacro = (val: unknown, fieldName: string): number | null => {
    if (val === null || val === undefined || val === "") return null;
    const num = Number(val);
    if (isNaN(num)) throw new Error(`Valor de ${fieldName} no rótulo inválido.`);
    if (num < 0) throw new Error(`Valor de ${fieldName} no rótulo não pode ser negativo.`);
    return Math.round(num * 100) / 100;
  };

  const kcal = parseMacro(input.caloriesKcal, "calorias");
  const p = parseMacro(input.proteinG, "proteína");
  const c = parseMacro(input.carbohydrateG, "carboidrato");
  const g = parseMacro(input.fatG, "gorduras");
  const fiber = parseMacro(input.fiberG, "fibras");
  const sodium = parseMacro(input.sodiumMg, "sódio");

  const publicId = crypto.randomUUID();
  const fullName = input.brand?.trim() ? `${name} (${input.brand.trim()})` : name;
  const normalizedName = normalizeSearchText(fullName);

  let connection;
  try {
    connection = await getDbConnection();
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_foods (
        public_id, scope, consultancy_id, name, display_name_pt_br,
        normalized_name, normalized_display_name_pt_br, category,
        reference_amount, reference_unit_code, calories_kcal, protein_g,
        carbohydrate_g, fat_g, status, source_type,
        source_key, source_reference, source_imported_at,
        source_uid, created_by_user_id, created_by_membership_id, created_at, updated_at
      ) VALUES (?, 'CONSULTANCY', ?, ?, ?, ?, ?, 'Produto Embalado', ?, ?, ?, ?, ?, ?, 'ACTIVE', 'PROFESSIONAL_UPLOAD', 'PRODUCT_LABEL', ?, NOW(3), ?, ?, ?, NOW(3), NOW(3))`,
      [
        publicId,
        ctx.consultancyId,
        fullName,
        fullName,
        normalizedName,
        normalizedName,
        servingAmount,
        servingUnit,
        kcal,
        p,
        c,
        g,
        input.labelNotes?.trim() || "Transcrito do rótulo nutricional",
        `LABEL:${publicId}`,
        ctx.userId,
        ctx.membershipId,
      ]
    );

    const foodId = result.insertId;
    let portionPublicId: string | null = null;

    if (input.servingHouseholdMeasure?.trim() && foodId) {
      portionPublicId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO nutrition_v2_food_portions (
          public_id, food_id, label, equivalent_reference_amount, sort_order, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, 'ACTIVE', NOW(3), NOW(3))`,
        [portionPublicId, foodId, input.servingHouseholdMeasure.trim(), servingAmount]
      );
    }

    if (sodium !== null && foodId) {
      const sodiumStatus = sodium === 0 ? "KNOWN_ZERO" : "KNOWN";
      await connection.query(
        `INSERT INTO nutrition_v2_food_nutrients (
          food_id, nutrient_code, amount_per_reference, unit_code, status, created_at, updated_at
        ) VALUES (?, 'NA', ?, 'MG', ?, NOW(3), NOW(3))`,
        [foodId, sodium, sodiumStatus]
      );
    }

    if (fiber !== null && foodId) {
      const fiberStatus = fiber === 0 ? "KNOWN_ZERO" : "KNOWN";
      await connection.query(
        `INSERT INTO nutrition_v2_food_nutrients (
          food_id, nutrient_code, amount_per_reference, unit_code, status, created_at, updated_at
        ) VALUES (?, 'FIBER', ?, 'G', ?, NOW(3), NOW(3))`,
        [foodId, fiber, fiberStatus]
      );
    }

    return {
      publicId,
      name: fullName,
      referenceAmount: servingAmount,
      referenceUnitCode: servingUnit,
      caloriesKcal: kcal,
      proteinG: p,
      carbohydrateG: c,
      fatG: g,
      sodiumMg: sodium,
      portionPublicId,
    };
  } finally {
    if (connection) connection.release();
  }
}

export interface RecipeIngredientInput {
  foodPublicId: string;
  quantity: number;
  unitCode: string;
  portionPublicId?: string | null;
}

export interface RegisterRecipeInput {
  name: string;
  servingsYield: number;
  ingredients: RecipeIngredientInput[];
  notes?: string | null;
}

export async function registerRecipeFood(
  ctx: NutritionAccessContext,
  input: RegisterRecipeInput
): Promise<{ publicId: string; name: string; referenceAmount: number; referenceUnitCode: string; caloriesKcal: number | null; proteinG: number | null; carbohydrateG: number | null; fatG: number | null; fiberG: number | null; sodiumMg?: number | null; portionPublicId?: string | null }> {
  assertCanAuthorNutrition(ctx);

  const name = input.name?.trim();
  if (!name) throw new Error("Nome da receita é obrigatório.");

  const servings = Math.max(1, Math.round(Number(input.servingsYield) || 1));
  if (!Array.isArray(input.ingredients) || input.ingredients.length === 0) {
    throw new Error("A receita precisa ter ao menos um ingrediente da biblioteca.");
  }

  let connection;
  try {
    connection = await getDbConnection();

    const totalIngredients = input.ingredients.length;

    let totalKcal = 0;
    let knownKcalCount = 0;

    let totalP = 0;
    let knownPCount = 0;

    let totalC = 0;
    let knownCCount = 0;

    let totalG = 0;
    let knownGCount = 0;

    let totalFiber = 0;
    let knownFiberCount = 0;

    interface MicronutrientTracking {
      sum: number;
      countKnown: number;
      countTrace: number;
      unitCode: string;
    }
    const micronutrientsAccumulator = new Map<string, MicronutrientTracking>();
    const summaryParts: string[] = [];

    for (const ing of input.ingredients) {
      if (!ing.foodPublicId) {
        throw new Error("Identificador do alimento ausente em ingrediente da receita.");
      }
      const qty = Number(ing.quantity);
      if (isNaN(qty) || qty <= 0) {
        throw new Error("Quantidade inválida para ingrediente da receita.");
      }
      const unitCode = (ing.unitCode || "G").trim().toUpperCase();

      // 1. Resolve food in database
      const [fRows] = await connection.query<RowDataPacket[]>(
        `SELECT id, public_id, scope, consultancy_id, name, display_name_pt_br,
                status, reference_amount, reference_unit_code,
                calories_kcal, protein_g, carbohydrate_g, fat_g, deleted_at
         FROM nutrition_v2_foods
         WHERE public_id = ?`,
        [ing.foodPublicId]
      );

      if (!fRows || fRows.length === 0) {
        throw new Error(`Alimento do ingrediente não encontrado: ${ing.foodPublicId}`);
      }

      const food = fRows[0];

      // 2. Validate ACTIVE and not deleted
      if (food.deleted_at != null) {
        throw new Error(`Alimento arquivado ou excluído não pode ser usado em receitas: ${food.name}`);
      }
      if (food.status !== "ACTIVE") {
        throw new Error(`Alimento inativo não pode ser usado em receitas: ${food.name}`);
      }

      // 3. Tenancy isolation check: must be GLOBAL or same consultancy
      const isAllowed = food.scope === "GLOBAL" || (food.scope === "CONSULTANCY" && Number(food.consultancy_id) === Number(ctx.consultancyId));
      if (!isAllowed) {
        throw new NutritionAuthorizationError(`Acesso negado: o alimento '${food.name}' pertence a outra consultoria.`);
      }

      // 4. Resolve portion if provided
      let portionObj: CanonicalPortionSource | null = null;
      let portionLabel = unitCode;
      if (ing.portionPublicId) {
        const [pRows] = await connection.query<RowDataPacket[]>(
          `SELECT id, public_id, food_id, label, equivalent_reference_amount, status, deleted_at
           FROM nutrition_v2_food_portions
           WHERE public_id = ? AND food_id = ?`,
          [ing.portionPublicId, food.id]
        );
        if (!pRows || pRows.length === 0 || pRows[0].deleted_at != null || pRows[0].status !== "ACTIVE") {
          throw new Error(`Porção selecionada para '${food.name}' é inválida ou inativa.`);
        }
        portionObj = {
          publicId: pRows[0].public_id,
          label: pRows[0].label,
          equivalentReferenceAmount: Number(pRows[0].equivalent_reference_amount),
        };
        portionLabel = pRows[0].label;
      }

      // 5. Authoritative calculation from server DB macros
      const calc = calculateItemNutrients({
        food: {
          referenceAmount: Number(food.reference_amount),
          referenceUnitCode: food.reference_unit_code,
          caloriesKcal: food.calories_kcal != null ? Number(food.calories_kcal) : null,
          proteinG: food.protein_g != null ? Number(food.protein_g) : null,
          carbohydrateG: food.carbohydrate_g != null ? Number(food.carbohydrate_g) : null,
          fatG: food.fat_g != null ? Number(food.fat_g) : null,
          fiberG: null,
        },
        prescribedQuantity: qty,
        prescribedUnitCode: unitCode,
        portion: portionObj,
      });

      if (!calc.isValid) {
        throw new Error(calc.errorMessage || `Erro ao calcular nutrientes do ingrediente '${food.name}'.`);
      }

      // 6. Aggregate macros preserving UNKNOWN != ZERO
      if (calc.caloriesKcal != null) {
        totalKcal += calc.caloriesKcal;
        knownKcalCount++;
      }
      if (calc.proteinG != null) {
        totalP += calc.proteinG;
        knownPCount++;
      }
      if (calc.carbohydrateG != null) {
        totalC += calc.carbohydrateG;
        knownCCount++;
      }
      if (calc.fatG != null) {
        totalG += calc.fatG;
        knownGCount++;
      }
      if (calc.fiberG != null) {
        totalFiber += calc.fiberG;
        knownFiberCount++;
      }

      summaryParts.push(`${food.display_name_pt_br || food.name} (${qty} ${portionLabel})`);

      // 7. Scale and aggregate canonical micronutrients (including Sódio NA)
      const [nutRows] = await connection.query<RowDataPacket[]>(
        `SELECT nutrient_code, amount_per_reference, unit_code, status
         FROM nutrition_v2_food_nutrients
         WHERE food_id = ?`,
        [food.id]
      );

      const factor = calc.factor || 0;
      for (const nRow of nutRows) {
        const code = nRow.nutrient_code;
        const current = micronutrientsAccumulator.get(code) || {
          sum: 0,
          countKnown: 0,
          countTrace: 0,
          unitCode: nRow.unit_code,
        };

        if (nRow.status === "KNOWN_ZERO" || (nRow.status === "KNOWN" && Number(nRow.amount_per_reference) === 0)) {
          current.countKnown += 1;
        } else if (nRow.status === "KNOWN") {
          current.sum += (Number(nRow.amount_per_reference) || 0) * factor;
          current.countKnown += 1;
        } else if (nRow.status === "TRACE") {
          current.countTrace += 1;
        }
        // status === 'UNKNOWN' is preserved as not known

        micronutrientsAccumulator.set(code, current);
      }
    }

    const perServingKcal = (totalIngredients > 0 && knownKcalCount === totalIngredients)
      ? Math.round((totalKcal / servings) * 10) / 10
      : null;
    const perServingP = (totalIngredients > 0 && knownPCount === totalIngredients)
      ? Math.round((totalP / servings) * 10) / 10
      : null;
    const perServingC = (totalIngredients > 0 && knownCCount === totalIngredients)
      ? Math.round((totalC / servings) * 10) / 10
      : null;
    const perServingG = (totalIngredients > 0 && knownGCount === totalIngredients)
      ? Math.round((totalG / servings) * 10) / 10
      : null;
    const perServingFiber = (totalIngredients > 0 && knownFiberCount === totalIngredients)
      ? Math.round((totalFiber / servings) * 10) / 10
      : null;

    const publicId = crypto.randomUUID();
    const normalizedName = normalizeSearchText(name);
    const summaryIngredients = summaryParts.join(", ");

    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_foods (
        public_id, scope, consultancy_id, name, display_name_pt_br,
        normalized_name, normalized_display_name_pt_br, category,
        reference_amount, reference_unit_code, calories_kcal, protein_g,
        carbohydrate_g, fat_g, status, source_type,
        source_key, source_reference, source_imported_at,
        source_uid, created_by_user_id, created_by_membership_id, created_at, updated_at
      ) VALUES (?, 'CONSULTANCY', ?, ?, ?, ?, ?, 'Receita Caseira', 1.0, 'PORCAO', ?, ?, ?, ?, 'ACTIVE', 'PROFESSIONAL_UPLOAD', 'RECIPE', ?, NOW(3), ?, ?, ?, NOW(3), NOW(3))`,
      [
        publicId,
        ctx.consultancyId,
        name,
        name,
        normalizedName,
        normalizedName,
        perServingKcal,
        perServingP,
        perServingC,
        perServingG,
        `Rendimento: ${servings} porção(ões). Ingredientes: ${summaryIngredients}`,
        `RECIPE:${publicId}`,
        ctx.userId,
        ctx.membershipId,
      ]
    );

    const foodId = result.insertId;
    let portionPublicId: string | null = null;
    if (foodId) {
      portionPublicId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO nutrition_v2_food_portions (
          public_id, food_id, label, equivalent_reference_amount, sort_order, status, created_at, updated_at
        ) VALUES (?, ?, ?, 1.0, 1, 'ACTIVE', NOW(3), NOW(3))`,
        [portionPublicId, foodId, `1 porção (1/${servings})`]
      );

      // Persist ONLY micronutrients that are fully known across all ingredients
      for (const [nutrientCode, data] of micronutrientsAccumulator.entries()) {
        if (data.countKnown === totalIngredients && totalIngredients > 0) {
          const perServingNutrient = Math.round((data.sum / servings) * 100) / 100;
          const status = (perServingNutrient === 0 && data.sum === 0) ? "KNOWN_ZERO" : "KNOWN";
          await connection.query(
            `INSERT INTO nutrition_v2_food_nutrients (
              food_id, nutrient_code, amount_per_reference, unit_code, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))`,
            [foodId, nutrientCode, perServingNutrient, data.unitCode, status]
          );
        } else if (data.countTrace > 0 && data.countKnown + data.countTrace === totalIngredients && data.sum === 0) {
          // Pure TRACE across all ingredients
          await connection.query(
            `INSERT INTO nutrition_v2_food_nutrients (
              food_id, nutrient_code, amount_per_reference, unit_code, status, created_at, updated_at
            ) VALUES (?, ?, NULL, ?, 'TRACE', NOW(3), NOW(3))`,
            [foodId, nutrientCode, data.unitCode]
          );
        }
        // If unknown in any ingredient: do NOT persist as KNOWN row (absence = UNKNOWN)
      }

      // If fiber was fully known across all ingredients, ensure it's also recorded in nutrition_v2_food_nutrients
      if (perServingFiber != null) {
        const fiberAcc = micronutrientsAccumulator.get("FIBER");
        if (!fiberAcc || fiberAcc.countKnown !== totalIngredients) {
          const status = perServingFiber === 0 ? "KNOWN_ZERO" : "KNOWN";
          await connection.query(
            `INSERT INTO nutrition_v2_food_nutrients (
              food_id, nutrient_code, amount_per_reference, unit_code, status, created_at, updated_at
            ) VALUES (?, 'FIBER', ?, 'G', ?, NOW(3), NOW(3))
            ON DUPLICATE KEY UPDATE amount_per_reference = VALUES(amount_per_reference), status = VALUES(status)`,
            [foodId, perServingFiber, status]
          );
        }
      }
    }

    const sodiumAcc = micronutrientsAccumulator.get("NA");
    const perServingSodium = (sodiumAcc && sodiumAcc.countKnown === totalIngredients && totalIngredients > 0)
      ? Math.round((sodiumAcc.sum / servings) * 100) / 100
      : null;

    return {
      publicId,
      name,
      referenceAmount: 1.0,
      referenceUnitCode: "PORCAO",
      caloriesKcal: perServingKcal,
      proteinG: perServingP,
      carbohydrateG: perServingC,
      fatG: perServingG,
      fiberG: perServingFiber,
      sodiumMg: perServingSodium,
      portionPublicId,
    };
  } finally {
    if (connection) connection.release();
  }
}
