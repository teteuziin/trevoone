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
      displayNamePtBr: safeNullableString(f.display_name_pt_br) || safeString(f.name),
      normalizedDisplayNamePtBr: safeNullableString(f.normalized_display_name_pt_br),
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
