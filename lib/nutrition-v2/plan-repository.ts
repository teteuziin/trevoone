/**
 * TREVO ONE — NUTRITION V2 PLAN REPOSITORY
 * Core repository for Plan Root, Version, Meals, Items, and Substitutions.
 * Enforces draft-only mutations, tenancy isolation, and macro snapshot calculations.
 */

import crypto from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  NutritionAuthorizationError,
  type NutritionAccessContext,
  assertCanAuthorNutrition,
} from "./access";

// ============================================================================
// DTOs & INPUT TYPES
// ============================================================================

export interface PlanListItemDto {
  id: number;
  publicId: string;
  consultancyId: number;
  isTemplate: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  currentVersion: {
    publicId: string;
    versionNumber: number;
    status: string;
    title: string;
    subtitle: string | null;
    updatedAt: string;
  } | null;
}

export interface PlanVersionTreeDto {
  plan: {
    publicId: string;
    consultancyId: number;
    isTemplate: boolean;
    status: string;
  };
  version: {
    publicId: string;
    versionNumber: number;
    status: string;
    title: string;
    subtitle: string | null;
    objective: string | null;
    generalGuidance: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  };
  meals: MealWithItemsDto[];
  dailyTotals: MacroTotals;
}

export interface MealWithItemsDto {
  publicId: string;
  title: string;
  scheduledTime: string | null;
  notes: string | null;
  sortOrder: number;
  items: MealItemWithSubstitutionsDto[];
  mealTotals: MacroTotals;
}

export interface MealItemWithSubstitutionsDto {
  publicId: string;
  foodId: number | null;
  foodPublicId: string | null;
  foodScope: string | null;
  foodNameSnapshot: string;
  categorySnapshot: string | null;
  prescribedQuantity: number | null;
  prescribedUnitCode: string | null;
  prescribedUnitLabel: string | null;
  caloriesKcalSnapshot: number | null;
  proteinGSnapshot: number | null;
  carbohydrateGSnapshot: number | null;
  fatGSnapshot: number | null;
  notes: string | null;
  sortOrder: number;
  substitutions: ItemSubstitutionDto[];
}

export interface ItemSubstitutionDto {
  publicId: string;
  foodId: number | null;
  foodPublicId: string | null;
  foodScope: string | null;
  foodNameSnapshot: string;
  prescribedQuantity: number | null;
  prescribedUnitCode: string | null;
  prescribedUnitLabel: string | null;
  caloriesKcalSnapshot: number | null;
  proteinGSnapshot: number | null;
  carbohydrateGSnapshot: number | null;
  fatGSnapshot: number | null;
  notes: string | null;
  sortOrder: number;
}

export interface MacroTotals {
  caloriesKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  hasIncompleteData: boolean;
}

export type CreatePlanInput = {
  title: string;
  subtitle?: string | null;
  objective?: string | null;
  generalGuidance?: string | null;
  notes?: string | null;
};

export type UpdateVersionMetadataInput = {
  title?: string;
  subtitle?: string | null;
  objective?: string | null;
  generalGuidance?: string | null;
  notes?: string | null;
};

export type AddMealInput = {
  title: string;
  scheduledTime?: string | null;
  notes?: string | null;
};

export type UpdateMealInput = {
  title?: string;
  scheduledTime?: string | null;
  notes?: string | null;
};

export type AddMealItemInput = {
  foodPublicId?: string | null;
  customName?: string | null;
  prescribedQuantity?: number | null;
  prescribedUnitCode?: string | null;
  prescribedUnitLabel?: string | null;
  portionPublicId?: string | null;
  notes?: string | null;
};

export type UpdateMealItemInput = {
  prescribedQuantity?: number | null;
  prescribedUnitCode?: string | null;
  prescribedUnitLabel?: string | null;
  portionPublicId?: string | null;
  notes?: string | null;
};

export type AddSubstitutionInput = {
  foodPublicId?: string | null;
  customName?: string | null;
  prescribedQuantity?: number | null;
  prescribedUnitCode?: string | null;
  prescribedUnitLabel?: string | null;
  portionPublicId?: string | null;
  notes?: string | null;
};

export type UpdateSubstitutionInput = {
  prescribedQuantity?: number | null;
  prescribedUnitCode?: string | null;
  prescribedUnitLabel?: string | null;
  portionPublicId?: string | null;
  notes?: string | null;
};

// ============================================================================
// MACRO CALCULATION & UNIT CONVERSION UTILITIES
// ============================================================================

const MASS_UNITS = new Set(["G", "KG"]);
const VOLUME_UNITS = new Set(["ML", "L"]);

export function calculateMacroFactor(
  refAmount: number,
  refUnit: string,
  prescribedQty: number,
  prescribedUnit: string,
  portionEquivalentAmount?: number | null
): number | null {
  if (refAmount <= 0 || prescribedQty <= 0) return null;

  const rUnit = refUnit.trim().toUpperCase();
  const pUnit = prescribedUnit.trim().toUpperCase();

  // 1. If portion is provided with equivalent reference amount
  if (portionEquivalentAmount != null && portionEquivalentAmount > 0) {
    const totalRefAmount = prescribedQty * portionEquivalentAmount;
    return totalRefAmount / refAmount;
  }

  // 2. Direct mass conversion (G <-> KG)
  if (MASS_UNITS.has(rUnit) && MASS_UNITS.has(pUnit)) {
    let rInG = refAmount;
    if (rUnit === "KG") rInG = refAmount * 1000;

    let pInG = prescribedQty;
    if (pUnit === "KG") pInG = prescribedQty * 1000;

    return pInG / rInG;
  }

  // 3. Direct volume conversion (ML <-> L)
  if (VOLUME_UNITS.has(rUnit) && VOLUME_UNITS.has(pUnit)) {
    let rInMl = refAmount;
    if (rUnit === "L") rInMl = refAmount * 1000;

    let pInMl = prescribedQty;
    if (pUnit === "L") pInMl = prescribedQty * 1000;

    return pInMl / rInMl;
  }

  // 4. Same unit match
  if (rUnit === pUnit) {
    return prescribedQty / refAmount;
  }

  // Incompatible or unknown conversion - no guessing!
  return null;
}

export function roundMacro(val: number | null | undefined): number | null {
  if (val == null || isNaN(Number(val))) return null;
  return Math.round(Number(val) * 100) / 100;
}

// ============================================================================
// INTERNAL GUARD HELPERS
// ============================================================================

interface VerifiedVersionRow {
  versionId: number;
  versionPublicId: string;
  versionNumber: number;
  versionStatus: string;
  planId: number;
  planPublicId: string;
  consultancyId: number;
}

async function getAndAssertDraftVersion(
  conn: PoolConnection,
  versionPublicId: string,
  ctx: NutritionAccessContext,
  forUpdate: boolean = false
): Promise<VerifiedVersionRow> {
  assertCanAuthorNutrition(ctx);

  const lockClause = forUpdate ? " FOR UPDATE" : "";
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT
      v.id AS version_id,
      v.public_id AS version_public_id,
      v.version_number,
      v.status AS version_status,
      p.id AS plan_id,
      p.public_id AS plan_public_id,
      p.consultancy_id
     FROM nutrition_v2_plan_versions v
     INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
     WHERE v.public_id = ? AND v.deleted_at IS NULL AND p.deleted_at IS NULL${lockClause}`,
    [versionPublicId]
  );

  if (rows.length === 0) {
    throw new NutritionAuthorizationError("Plano ou versão não encontrado.", "PLAN_VERSION_NOT_FOUND", 404);
  }

  const row = rows[0];
  if (Number(row.consultancy_id) !== ctx.consultancyId) {
    throw new NutritionAuthorizationError("Acesso negado a este plano da consultoria.", "FORBIDDEN_TENANT_PLAN", 403);
  }

  if (row.version_status !== "DRAFT") {
    throw new NutritionAuthorizationError(
      "Apenas versões em rascunho (DRAFT) podem ser alteradas.",
      "VERSION_NOT_EDITABLE",
      400
    );
  }

  return {
    versionId: Number(row.version_id),
    versionPublicId: String(row.version_public_id),
    versionNumber: Number(row.version_number),
    versionStatus: String(row.version_status),
    planId: Number(row.plan_id),
    planPublicId: String(row.plan_public_id),
    consultancyId: Number(row.consultancy_id),
  };
}

// ============================================================================
// PLAN ROOT + VERSION CREATION
// ============================================================================

export async function createPlanWithDraftVersion(
  ctx: NutritionAccessContext,
  input: CreatePlanInput
): Promise<{ planPublicId: string; versionPublicId: string }> {
  assertCanAuthorNutrition(ctx);

  const title = input.title.trim();
  if (!title) {
    throw new NutritionAuthorizationError("O título do plano é obrigatório.", "VALIDATION_ERROR", 400);
  }

  const planPublicId = crypto.randomUUID();
  const versionPublicId = crypto.randomUUID();
  const subtitle = input.subtitle ? input.subtitle.trim() : null;
  const objective = input.objective ? input.objective.trim() : null;
  const generalGuidance = input.generalGuidance ? input.generalGuidance.trim() : null;
  const notes = input.notes ? input.notes.trim() : null;

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Insert plan root
    const [planRes] = await connection.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_plans (
        public_id,
        consultancy_id,
        created_by_membership_id,
        is_template,
        status
      ) VALUES (?, ?, ?, 0, 'ACTIVE')`,
      [planPublicId, ctx.consultancyId!, ctx.membershipId!]
    );
    const planId = planRes.insertId;

    // 2. Insert version 1 (DRAFT)
    await connection.query(
      `INSERT INTO nutrition_v2_plan_versions (
        public_id,
        nutrition_plan_id,
        version_number,
        status,
        title,
        subtitle,
        objective,
        general_guidance,
        notes,
        created_by_membership_id
      ) VALUES (?, ?, 1, 'DRAFT', ?, ?, ?, ?, ?, ?)`,
      [
        versionPublicId,
        planId,
        title,
        subtitle,
        objective,
        generalGuidance,
        notes,
        ctx.membershipId!,
      ]
    );

    await connection.commit();
    return { planPublicId, versionPublicId };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore rollback error
      }
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// PLAN LIST
// ============================================================================

export async function listPlansForConsultancy(
  ctx: NutritionAccessContext,
  options: { page?: number; pageSize?: number; query?: string } = {}
): Promise<{ items: PlanListItemDto[]; total: number; page: number; pageSize: number; totalPages: number }> {
  assertCanAuthorNutrition(ctx);

  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(options.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  let connection;
  try {
    connection = await getDbConnection();

    const conditions: string[] = [
      "p.consultancy_id = ?",
      "p.is_template = 0",
      "p.deleted_at IS NULL",
    ];
    const params: (string | number)[] = [ctx.consultancyId!];

    if (options.query && options.query.trim()) {
      conditions.push("EXISTS (SELECT 1 FROM nutrition_v2_plan_versions pv WHERE pv.nutrition_plan_id = p.id AND pv.deleted_at IS NULL AND pv.title LIKE ?)");
      params.push(`%${options.query.trim()}%`);
    }

    const whereClause = conditions.join(" AND ");

    const [countRows] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM nutrition_v2_plans p WHERE ${whereClause}`,
      params
    );
    const total = Number(countRows[0].total || 0);
    const totalPages = Math.ceil(total / pageSize) || 1;

    const selectParams = [...params, pageSize, offset];
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
        p.id,
        p.public_id,
        p.consultancy_id,
        p.is_template,
        p.status,
        p.created_at,
        p.updated_at,
        v.public_id AS current_version_public_id,
        v.version_number AS current_version_number,
        v.status AS current_version_status,
        v.title AS current_version_title,
        v.subtitle AS current_version_subtitle,
        v.updated_at AS current_version_updated_at
      FROM nutrition_v2_plans p
      LEFT JOIN nutrition_v2_plan_versions v ON v.id = (
        SELECT pv.id FROM nutrition_v2_plan_versions pv
        WHERE pv.nutrition_plan_id = p.id AND pv.deleted_at IS NULL
        ORDER BY pv.version_number DESC LIMIT 1
      )
      WHERE ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT ? OFFSET ?`,
      selectParams
    );

    const items: PlanListItemDto[] = (rows as RowDataPacket[]).map((r) => ({
      id: Number(r.id),
      publicId: String(r.public_id),
      consultancyId: Number(r.consultancy_id),
      isTemplate: Boolean(r.is_template),
      status: String(r.status),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      currentVersion: r.current_version_publicId || r.current_version_public_id
        ? {
            publicId: String(r.current_version_public_id),
            versionNumber: Number(r.current_version_number),
            status: String(r.current_version_status),
            title: String(r.current_version_title),
            subtitle: r.current_version_subtitle ? String(r.current_version_subtitle) : null,
            updatedAt: new Date(r.current_version_updated_at).toISOString(),
          }
        : null,
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
// CANONICAL PLAN TREE READER
// ============================================================================

export async function getPlanVersionTreeByPlanPublicId(
  ctx: NutritionAccessContext,
  planPublicId: string
): Promise<PlanVersionTreeDto | null> {
  assertCanAuthorNutrition(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Get plan root
    const [plans] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id, consultancy_id, is_template, status
       FROM nutrition_v2_plans
       WHERE public_id = ? AND deleted_at IS NULL`,
      [planPublicId]
    );

    if (plans.length === 0) return null;
    const p = plans[0];

    if (Number(p.consultancy_id) !== ctx.consultancyId) {
      throw new NutritionAuthorizationError("Acesso negado a este plano.", "FORBIDDEN_TENANT_PLAN", 403);
    }

    // 2. Get latest version (DRAFT in P0 D)
    const [versions] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id, version_number, status, title, subtitle, objective, general_guidance, notes, created_at, updated_at
       FROM nutrition_v2_plan_versions
       WHERE nutrition_plan_id = ? AND deleted_at IS NULL
       ORDER BY version_number DESC LIMIT 1`,
      [p.id]
    );

    if (versions.length === 0) return null;
    const v = versions[0];

    // 3. Get all meals
    const [meals] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id, title, scheduled_time, notes, sort_order
       FROM nutrition_v2_meals
       WHERE nutrition_plan_version_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC`,
      [v.id]
    );

    const mealIds = meals.map((m) => m.id);
    let items: RowDataPacket[] = [];
    let substitutions: RowDataPacket[] = [];

    if (mealIds.length > 0) {
      // 4. Get all meal items
      const [itemRows] = await connection.query<RowDataPacket[]>(
        `SELECT
          mi.id,
          mi.public_id,
          mi.meal_id,
          mi.food_id,
          f.public_id AS food_public_id,
          f.scope AS food_scope,
          mi.food_name_snapshot,
          mi.category_snapshot,
          mi.prescribed_quantity,
          mi.prescribed_unit_code,
          mi.prescribed_unit_label,
          mi.calories_kcal_snapshot,
          mi.protein_g_snapshot,
          mi.carbohydrate_g_snapshot,
          mi.fat_g_snapshot,
          mi.notes,
          mi.sort_order
         FROM nutrition_v2_meal_items mi
         LEFT JOIN nutrition_v2_foods f ON f.id = mi.food_id
         WHERE mi.meal_id IN (?) AND mi.deleted_at IS NULL
         ORDER BY mi.sort_order ASC, mi.id ASC`,
        [mealIds]
      );
      items = itemRows;

      const itemIds = items.map((i) => i.id);
      if (itemIds.length > 0) {
        // 5. Get all substitutions
        const [subRows] = await connection.query<RowDataPacket[]>(
          `SELECT
            s.id,
            s.public_id,
            s.meal_item_id,
            s.food_id,
            f.public_id AS food_public_id,
            f.scope AS food_scope,
            s.food_name_snapshot,
            s.prescribed_quantity,
            s.prescribed_unit_code,
            s.prescribed_unit_label,
            s.calories_kcal_snapshot,
            s.protein_g_snapshot,
            s.carbohydrate_g_snapshot,
            s.fat_g_snapshot,
            s.notes,
            s.sort_order
           FROM nutrition_v2_item_substitutions s
           LEFT JOIN nutrition_v2_foods f ON f.id = s.food_id
           WHERE s.meal_item_id IN (?) AND s.deleted_at IS NULL
           ORDER BY s.sort_order ASC, s.id ASC`,
          [itemIds]
        );
        substitutions = subRows;
      }
    }

    // Organize hierarchy and compute totals
    const subsByItemId = new Map<number, ItemSubstitutionDto[]>();
    for (const s of substitutions) {
      const parentId = Number(s.meal_item_id);
      if (!subsByItemId.has(parentId)) subsByItemId.set(parentId, []);
      subsByItemId.get(parentId)!.push({
        publicId: String(s.public_id),
        foodId: s.food_id ? Number(s.food_id) : null,
        foodPublicId: s.food_public_id ? String(s.food_public_id) : null,
        foodScope: s.food_scope ? String(s.food_scope) : null,
        foodNameSnapshot: String(s.food_name_snapshot),
        prescribedQuantity: s.prescribed_quantity != null ? Number(s.prescribed_quantity) : null,
        prescribedUnitCode: s.prescribed_unit_code ? String(s.prescribed_unit_code) : null,
        prescribedUnitLabel: s.prescribed_unit_label ? String(s.prescribed_unit_label) : null,
        caloriesKcalSnapshot: s.calories_kcal_snapshot != null ? Number(s.calories_kcal_snapshot) : null,
        proteinGSnapshot: s.protein_g_snapshot != null ? Number(s.protein_g_snapshot) : null,
        carbohydrateGSnapshot: s.carbohydrate_g_snapshot != null ? Number(s.carbohydrate_g_snapshot) : null,
        fatGSnapshot: s.fat_g_snapshot != null ? Number(s.fat_g_snapshot) : null,
        notes: s.notes ? String(s.notes) : null,
        sortOrder: Number(s.sort_order),
      });
    }

    const itemsByMealId = new Map<number, MealItemWithSubstitutionsDto[]>();
    for (const it of items) {
      const mealId = Number(it.meal_id);
      if (!itemsByMealId.has(mealId)) itemsByMealId.set(mealId, []);
      itemsByMealId.get(mealId)!.push({
        publicId: String(it.public_id),
        foodId: it.food_id ? Number(it.food_id) : null,
        foodPublicId: it.food_public_id ? String(it.food_public_id) : null,
        foodScope: it.food_scope ? String(it.food_scope) : null,
        foodNameSnapshot: String(it.food_name_snapshot),
        categorySnapshot: it.category_snapshot ? String(it.category_snapshot) : null,
        prescribedQuantity: it.prescribed_quantity != null ? Number(it.prescribed_quantity) : null,
        prescribedUnitCode: it.prescribed_unit_code ? String(it.prescribed_unit_code) : null,
        prescribedUnitLabel: it.prescribed_unit_label ? String(it.prescribed_unit_label) : null,
        caloriesKcalSnapshot: it.calories_kcal_snapshot != null ? Number(it.calories_kcal_snapshot) : null,
        proteinGSnapshot: it.protein_g_snapshot != null ? Number(it.protein_g_snapshot) : null,
        carbohydrateGSnapshot: it.carbohydrate_g_snapshot != null ? Number(it.carbohydrate_g_snapshot) : null,
        fatGSnapshot: it.fat_g_snapshot != null ? Number(it.fat_g_snapshot) : null,
        notes: it.notes ? String(it.notes) : null,
        sortOrder: Number(it.sort_order),
        substitutions: subsByItemId.get(Number(it.id)) || [],
      });
    }

    let dailyCalories = 0;
    let dailyProtein = 0;
    let dailyCarbs = 0;
    let dailyFat = 0;
    let dailyHasIncomplete = false;

    const formattedMeals: MealWithItemsDto[] = meals.map((m) => {
      const mealItems = itemsByMealId.get(Number(m.id)) || [];

      let mealCalories = 0;
      let mealProtein = 0;
      let mealCarbs = 0;
      let mealFat = 0;
      let mealHasIncomplete = false;

      // Calculate totals from MAIN items only (substitutions excluded!)
      for (const item of mealItems) {
        if (item.caloriesKcalSnapshot != null) {
          mealCalories += item.caloriesKcalSnapshot;
        } else {
          mealHasIncomplete = true;
        }

        if (item.proteinGSnapshot != null) {
          mealProtein += item.proteinGSnapshot;
        } else {
          mealHasIncomplete = true;
        }

        if (item.carbohydrateGSnapshot != null) {
          mealCarbs += item.carbohydrateGSnapshot;
        } else {
          mealHasIncomplete = true;
        }

        if (item.fatGSnapshot != null) {
          mealFat += item.fatGSnapshot;
        } else {
          mealHasIncomplete = true;
        }
      }

      dailyCalories += mealCalories;
      dailyProtein += mealProtein;
      dailyCarbs += mealCarbs;
      dailyFat += mealFat;
      if (mealHasIncomplete) dailyHasIncomplete = true;

      return {
        publicId: String(m.public_id),
        title: String(m.title),
        scheduledTime: m.scheduled_time ? String(m.scheduled_time).slice(0, 5) : null,
        notes: m.notes ? String(m.notes) : null,
        sortOrder: Number(m.sort_order),
        items: mealItems,
        mealTotals: {
          caloriesKcal: Math.round(mealCalories * 100) / 100,
          proteinG: Math.round(mealProtein * 100) / 100,
          carbohydrateG: Math.round(mealCarbs * 100) / 100,
          fatG: Math.round(mealFat * 100) / 100,
          hasIncompleteData: mealHasIncomplete,
        },
      };
    });

    return {
      plan: {
        publicId: String(p.public_id),
        consultancyId: Number(p.consultancy_id),
        isTemplate: Boolean(p.is_template),
        status: String(p.status),
      },
      version: {
        publicId: String(v.public_id),
        versionNumber: Number(v.version_number),
        status: String(v.status),
        title: String(v.title),
        subtitle: v.subtitle ? String(v.subtitle) : null,
        objective: v.objective ? String(v.objective) : null,
        generalGuidance: v.general_guidance ? String(v.general_guidance) : null,
        notes: v.notes ? String(v.notes) : null,
        createdAt: new Date(v.created_at).toISOString(),
        updatedAt: new Date(v.updated_at).toISOString(),
      },
      meals: formattedMeals,
      dailyTotals: {
        caloriesKcal: Math.round(dailyCalories * 100) / 100,
        proteinG: Math.round(dailyProtein * 100) / 100,
        carbohydrateG: Math.round(dailyCarbs * 100) / 100,
        fatG: Math.round(dailyFat * 100) / 100,
        hasIncompleteData: dailyHasIncomplete,
      },
    };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// VERSION METADATA UPDATE
// ============================================================================

export async function updatePlanVersionMetadata(
  ctx: NutritionAccessContext,
  versionPublicId: string,
  input: UpdateVersionMetadataInput
): Promise<{ success: boolean }> {
  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const version = await getAndAssertDraftVersion(connection, versionPublicId, ctx, true);

    const updates: string[] = [];
    const params: (string | null | number)[] = [];

    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) {
        throw new NutritionAuthorizationError("O título do plano é obrigatório.", "VALIDATION_ERROR", 400);
      }
      updates.push("title = ?");
      params.push(trimmed);
    }

    if (input.subtitle !== undefined) {
      updates.push("subtitle = ?");
      params.push(input.subtitle ? input.subtitle.trim() : null);
    }

    if (input.objective !== undefined) {
      updates.push("objective = ?");
      params.push(input.objective ? input.objective.trim() : null);
    }

    if (input.generalGuidance !== undefined) {
      updates.push("general_guidance = ?");
      params.push(input.generalGuidance ? input.generalGuidance.trim() : null);
    }

    if (input.notes !== undefined) {
      updates.push("notes = ?");
      params.push(input.notes ? input.notes.trim() : null);
    }

    if (updates.length > 0) {
      params.push(version.versionId);
      await connection.query(
        `UPDATE nutrition_v2_plan_versions SET ${updates.join(", ")} WHERE id = ?`,
        params
      );
    }

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// MEAL CRUD & REORDER
// ============================================================================

export async function addMeal(
  ctx: NutritionAccessContext,
  versionPublicId: string,
  input: AddMealInput
): Promise<{ mealPublicId: string }> {
  const title = input.title.trim();
  if (!title) {
    throw new NutritionAuthorizationError("O nome da refeição é obrigatório.", "VALIDATION_ERROR", 400);
  }

  const mealPublicId = crypto.randomUUID();
  const scheduledTime = input.scheduledTime ? input.scheduledTime.trim() : null;
  const notes = input.notes ? input.notes.trim() : null;

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const version = await getAndAssertDraftVersion(connection, versionPublicId, ctx, true);

    // Get max sort_order (0-based)
    const [maxRows] = await connection.query<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_sort
       FROM nutrition_v2_meals
       WHERE nutrition_plan_version_id = ? AND deleted_at IS NULL`,
      [version.versionId]
    );
    const nextSort = Number(maxRows[0].max_sort) + 1;

    await connection.query(
      `INSERT INTO nutrition_v2_meals (
        public_id,
        nutrition_plan_version_id,
        title,
        scheduled_time,
        notes,
        sort_order
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [mealPublicId, version.versionId, title, scheduledTime, notes, nextSort]
    );

    await connection.commit();
    return { mealPublicId };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

export async function updateMeal(
  ctx: NutritionAccessContext,
  mealPublicId: string,
  input: UpdateMealInput
): Promise<{ success: boolean }> {
  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [mealRows] = await connection.query<RowDataPacket[]>(
      `SELECT m.id, m.nutrition_plan_version_id, v.public_id AS version_public_id
       FROM nutrition_v2_meals m
       INNER JOIN nutrition_v2_plan_versions v ON v.id = m.nutrition_plan_version_id
       WHERE m.public_id = ? AND m.deleted_at IS NULL AND v.deleted_at IS NULL FOR UPDATE`,
      [mealPublicId]
    );

    if (mealRows.length === 0) {
      throw new NutritionAuthorizationError("Refeição não encontrada.", "MEAL_NOT_FOUND", 404);
    }

    const meal = mealRows[0];
    await getAndAssertDraftVersion(connection, String(meal.version_public_id), ctx, true);

    const updates: string[] = [];
    const params: (string | null | number)[] = [];

    if (input.title !== undefined) {
      const trimmed = input.title.trim();
      if (!trimmed) {
        throw new NutritionAuthorizationError("O nome da refeição é obrigatório.", "VALIDATION_ERROR", 400);
      }
      updates.push("title = ?");
      params.push(trimmed);
    }

    if (input.scheduledTime !== undefined) {
      updates.push("scheduled_time = ?");
      params.push(input.scheduledTime ? input.scheduledTime.trim() : null);
    }

    if (input.notes !== undefined) {
      updates.push("notes = ?");
      params.push(input.notes ? input.notes.trim() : null);
    }

    if (updates.length > 0) {
      params.push(meal.id);
      await connection.query(
        `UPDATE nutrition_v2_meals SET ${updates.join(", ")} WHERE id = ?`,
        params
      );
    }

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

export async function removeMeal(
  ctx: NutritionAccessContext,
  mealPublicId: string
): Promise<{ success: boolean }> {
  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [mealRows] = await connection.query<RowDataPacket[]>(
      `SELECT m.id, m.nutrition_plan_version_id, v.public_id AS version_public_id
       FROM nutrition_v2_meals m
       INNER JOIN nutrition_v2_plan_versions v ON v.id = m.nutrition_plan_version_id
       WHERE m.public_id = ? AND m.deleted_at IS NULL AND v.deleted_at IS NULL FOR UPDATE`,
      [mealPublicId]
    );

    if (mealRows.length === 0) {
      throw new NutritionAuthorizationError("Refeição não encontrada.", "MEAL_NOT_FOUND", 404);
    }

    const meal = mealRows[0];
    await getAndAssertDraftVersion(connection, String(meal.version_public_id), ctx, true);

    // Soft delete child substitutions, child items, and the meal itself
    await connection.query(
      `UPDATE nutrition_v2_item_substitutions s
       INNER JOIN nutrition_v2_meal_items mi ON mi.id = s.meal_item_id
       SET s.deleted_at = UTC_TIMESTAMP(3)
       WHERE mi.meal_id = ? AND s.deleted_at IS NULL`,
      [meal.id]
    );

    await connection.query(
      `UPDATE nutrition_v2_meal_items
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE meal_id = ? AND deleted_at IS NULL`,
      [meal.id]
    );

    await connection.query(
      `UPDATE nutrition_v2_meals
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [meal.id]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

export async function reorderMeals(
  ctx: NutritionAccessContext,
  versionPublicId: string,
  orderedMealPublicIds: string[]
): Promise<{ success: boolean }> {
  if (orderedMealPublicIds.length === 0) return { success: true };

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const version = await getAndAssertDraftVersion(connection, versionPublicId, ctx, true);

    // Verify all meals belong to this draft version
    const [meals] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id FROM nutrition_v2_meals
       WHERE nutrition_plan_version_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [version.versionId]
    );

    const mealMap = new Map<string, number>();
    for (const m of meals) {
      mealMap.set(String(m.public_id), Number(m.id));
    }

    for (const pubId of orderedMealPublicIds) {
      if (!mealMap.has(pubId)) {
        throw new NutritionAuthorizationError(
          "Refeição inválida ou pertencente a outro plano.",
          "FORBIDDEN_MEAL_REORDER",
          403
        );
      }
    }

    // Apply deterministic 0-based sort order
    for (let i = 0; i < orderedMealPublicIds.length; i++) {
      const mealId = mealMap.get(orderedMealPublicIds[i])!;
      await connection.query(
        `UPDATE nutrition_v2_meals SET sort_order = ? WHERE id = ?`,
        [i, mealId]
      );
    }

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// MEAL ITEM CRUD & REORDER
// ============================================================================

export async function addMealItem(
  ctx: NutritionAccessContext,
  mealPublicId: string,
  input: AddMealItemInput
): Promise<{ itemPublicId: string }> {
  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Verify meal and draft version
    const [mealRows] = await connection.query<RowDataPacket[]>(
      `SELECT m.id, m.nutrition_plan_version_id, v.public_id AS version_public_id
       FROM nutrition_v2_meals m
       INNER JOIN nutrition_v2_plan_versions v ON v.id = m.nutrition_plan_version_id
       WHERE m.public_id = ? AND m.deleted_at IS NULL AND v.deleted_at IS NULL FOR UPDATE`,
      [mealPublicId]
    );

    if (mealRows.length === 0) {
      throw new NutritionAuthorizationError("Refeição não encontrada.", "MEAL_NOT_FOUND", 404);
    }

    const meal = mealRows[0];
    await getAndAssertDraftVersion(connection, String(meal.version_public_id), ctx, true);

    // 2. Resolve Food or Custom Item
    let foodId: number | null = null;
    let foodNameSnapshot: string = "";
    let categorySnapshot: string | null = null;
    const prescribedQuantity: number | null = input.prescribedQuantity != null && input.prescribedQuantity > 0 ? Number(input.prescribedQuantity) : null;
    let prescribedUnitCode: string | null = input.prescribedUnitCode ? input.prescribedUnitCode.trim().toUpperCase() : null;
    let prescribedUnitLabel: string | null = input.prescribedUnitLabel ? input.prescribedUnitLabel.trim() : null;
    let caloriesSnapshot: number | null = null;
    let proteinSnapshot: number | null = null;
    let carbsSnapshot: number | null = null;
    let fatSnapshot: number | null = null;

    if (input.foodPublicId && input.foodPublicId.trim()) {
      // Library food
      const [foods] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM nutrition_v2_foods WHERE public_id = ? AND deleted_at IS NULL`,
        [input.foodPublicId.trim()]
      );

      if (foods.length === 0) {
        throw new NutritionAuthorizationError("Alimento não encontrado.", "FOOD_NOT_FOUND", 404);
      }

      const food = foods[0];

      // Exclude archived foods for new insertion (Section 28, 80)
      if (food.status !== "ACTIVE") {
        throw new NutritionAuthorizationError("Alimentos arquivados não podem ser adicionados.", "ARCHIVED_FOOD", 400);
      }

      // Verify scope tenancy (Section 32, 79)
      if (food.scope === "CONSULTANCY" && Number(food.consultancy_id) !== ctx.consultancyId) {
        throw new NutritionAuthorizationError("Acesso negado a este alimento da consultoria.", "FORBIDDEN_FOOD", 403);
      }

      foodId = Number(food.id);
      foodNameSnapshot = String(food.name);
      categorySnapshot = food.category ? String(food.category) : null;

      // Check portion if provided
      let portionEquivalentAmount: number | null = null;
      if (input.portionPublicId && input.portionPublicId.trim()) {
        const [portions] = await connection.query<RowDataPacket[]>(
          `SELECT * FROM nutrition_v2_food_portions
           WHERE public_id = ? AND food_id = ? AND deleted_at IS NULL`,
          [input.portionPublicId.trim(), foodId]
        );

        if (portions.length === 0) {
          throw new NutritionAuthorizationError("Porção inválida para este alimento.", "INVALID_PORTION", 400);
        }

        const portion = portions[0];
        if (portion.status !== "ACTIVE") {
          throw new NutritionAuthorizationError("Porção arquivada não pode ser selecionada.", "ARCHIVED_PORTION", 400);
        }

        portionEquivalentAmount = Number(portion.equivalent_reference_amount);
        prescribedUnitCode = "PORCAO";
        prescribedUnitLabel = String(portion.label);
      }

      // Derive macro snapshots
      if (prescribedQuantity != null && prescribedQuantity > 0 && prescribedUnitCode) {
        const factor = calculateMacroFactor(
          Number(food.reference_amount),
          String(food.reference_unit_code),
          prescribedQuantity,
          prescribedUnitCode,
          portionEquivalentAmount
        );

        if (factor != null) {
          caloriesSnapshot = food.calories_kcal != null ? roundMacro(Number(food.calories_kcal) * factor) : null;
          proteinSnapshot = food.protein_g != null ? roundMacro(Number(food.protein_g) * factor) : null;
          carbsSnapshot = food.carbohydrate_g != null ? roundMacro(Number(food.carbohydrate_g) * factor) : null;
          fatSnapshot = food.fat_g != null ? roundMacro(Number(food.fat_g) * factor) : null;
        }
      }
    } else {
      // Custom Inline item
      const customName = input.customName ? input.customName.trim() : "";
      if (!customName) {
        throw new NutritionAuthorizationError("O nome do alimento é obrigatório.", "VALIDATION_ERROR", 400);
      }
      foodNameSnapshot = customName;
      // For custom items, macros default to null unless otherwise provided
    }

    // 3. Get next sort order
    const [maxRows] = await connection.query<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_sort
       FROM nutrition_v2_meal_items
       WHERE meal_id = ? AND deleted_at IS NULL`,
      [meal.id]
    );
    const nextSort = Number(maxRows[0].max_sort) + 1;

    const itemPublicId = crypto.randomUUID();
    const notes = input.notes ? input.notes.trim() : null;

    await connection.query(
      `INSERT INTO nutrition_v2_meal_items (
        public_id,
        meal_id,
        food_id,
        sort_order,
        food_name_snapshot,
        category_snapshot,
        prescribed_quantity,
        prescribed_unit_code,
        prescribed_unit_label,
        calories_kcal_snapshot,
        protein_g_snapshot,
        carbohydrate_g_snapshot,
        fat_g_snapshot,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemPublicId,
        meal.id,
        foodId,
        nextSort,
        foodNameSnapshot,
        categorySnapshot,
        prescribedQuantity,
        prescribedUnitCode,
        prescribedUnitLabel,
        caloriesSnapshot,
        proteinSnapshot,
        carbsSnapshot,
        fatSnapshot,
        notes,
      ]
    );

    await connection.commit();
    return { itemPublicId };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

export async function updateMealItem(
  ctx: NutritionAccessContext,
  itemPublicId: string,
  input: UpdateMealItemInput
): Promise<{ success: boolean }> {
  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [itemRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        mi.id,
        mi.meal_id,
        mi.food_id,
        mi.prescribed_quantity,
        mi.prescribed_unit_code,
        mi.prescribed_unit_label,
        m.nutrition_plan_version_id,
        v.public_id AS version_public_id,
        f.reference_amount,
        f.reference_unit_code,
        f.calories_kcal,
        f.protein_g,
        f.carbohydrate_g,
        f.fat_g
       FROM nutrition_v2_meal_items mi
       INNER JOIN nutrition_v2_meals m ON m.id = mi.meal_id
       INNER JOIN nutrition_v2_plan_versions v ON v.id = m.nutrition_plan_version_id
       LEFT JOIN nutrition_v2_foods f ON f.id = mi.food_id
       WHERE mi.public_id = ? AND mi.deleted_at IS NULL AND m.deleted_at IS NULL AND v.deleted_at IS NULL FOR UPDATE`,
      [itemPublicId]
    );

    if (itemRows.length === 0) {
      throw new NutritionAuthorizationError("Item da refeição não encontrado.", "ITEM_NOT_FOUND", 404);
    }

    const item = itemRows[0];
    await getAndAssertDraftVersion(connection, String(item.version_public_id), ctx, true);

    const prescribedQuantity = input.prescribedQuantity !== undefined
      ? (input.prescribedQuantity != null && input.prescribedQuantity > 0 ? Number(input.prescribedQuantity) : null)
      : (item.prescribed_quantity != null ? Number(item.prescribed_quantity) : null);

    let prescribedUnitCode = input.prescribedUnitCode !== undefined
      ? (input.prescribedUnitCode ? input.prescribedUnitCode.trim().toUpperCase() : null)
      : (item.prescribed_unit_code ? String(item.prescribed_unit_code) : null);

    let prescribedUnitLabel = input.prescribedUnitLabel !== undefined
      ? (input.prescribedUnitLabel ? input.prescribedUnitLabel.trim() : null)
      : (item.prescribed_unit_label ? String(item.prescribed_unit_label) : null);

    let caloriesSnapshot = item.calories_kcal_snapshot != null ? Number(item.calories_kcal_snapshot) : null;
    let proteinSnapshot = item.protein_g_snapshot != null ? Number(item.protein_g_snapshot) : null;
    let carbsSnapshot = item.carbohydrate_g_snapshot != null ? Number(item.carbohydrate_g_snapshot) : null;
    let fatSnapshot = item.fat_g_snapshot != null ? Number(item.fat_g_snapshot) : null;

    // Recalculate if library food and quantities/portion changed
    if (item.food_id != null) {
      let portionEquivalentAmount: number | null = null;
      if (input.portionPublicId !== undefined) {
        if (input.portionPublicId && input.portionPublicId.trim()) {
          const [portions] = await connection.query<RowDataPacket[]>(
            `SELECT * FROM nutrition_v2_food_portions
             WHERE public_id = ? AND food_id = ? AND deleted_at IS NULL`,
            [input.portionPublicId.trim(), item.food_id]
          );
          if (portions.length === 0) {
            throw new NutritionAuthorizationError("Porção inválida para este alimento.", "INVALID_PORTION", 400);
          }
          const portion = portions[0];
          portionEquivalentAmount = Number(portion.equivalent_reference_amount);
          prescribedUnitCode = "PORCAO";
          prescribedUnitLabel = String(portion.label);
        } else {
          portionEquivalentAmount = null;
        }
      }

      if (prescribedQuantity != null && prescribedQuantity > 0 && prescribedUnitCode && item.reference_amount != null) {
        const factor = calculateMacroFactor(
          Number(item.reference_amount),
          String(item.reference_unit_code),
          prescribedQuantity,
          prescribedUnitCode,
          portionEquivalentAmount
        );

        if (factor != null) {
          caloriesSnapshot = item.calories_kcal != null ? roundMacro(Number(item.calories_kcal) * factor) : null;
          proteinSnapshot = item.protein_g != null ? roundMacro(Number(item.protein_g) * factor) : null;
          carbsSnapshot = item.carbohydrate_g != null ? roundMacro(Number(item.carbohydrate_g) * factor) : null;
          fatSnapshot = item.fat_g != null ? roundMacro(Number(item.fat_g) * factor) : null;
        } else {
          caloriesSnapshot = null;
          proteinSnapshot = null;
          carbsSnapshot = null;
          fatSnapshot = null;
        }
      }
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    updates.push("prescribed_quantity = ?");
    params.push(prescribedQuantity);

    updates.push("prescribed_unit_code = ?");
    params.push(prescribedUnitCode);

    updates.push("prescribed_unit_label = ?");
    params.push(prescribedUnitLabel);

    updates.push("calories_kcal_snapshot = ?");
    params.push(caloriesSnapshot);

    updates.push("protein_g_snapshot = ?");
    params.push(proteinSnapshot);

    updates.push("carbohydrate_g_snapshot = ?");
    params.push(carbsSnapshot);

    updates.push("fat_g_snapshot = ?");
    params.push(fatSnapshot);

    if (input.notes !== undefined) {
      updates.push("notes = ?");
      params.push(input.notes ? input.notes.trim() : null);
    }

    params.push(item.id);
    await connection.query(
      `UPDATE nutrition_v2_meal_items SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

export async function removeMealItem(
  ctx: NutritionAccessContext,
  itemPublicId: string
): Promise<{ success: boolean }> {
  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [itemRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        mi.id,
        m.nutrition_plan_version_id,
        v.public_id AS version_public_id
       FROM nutrition_v2_meal_items mi
       INNER JOIN nutrition_v2_meals m ON m.id = mi.meal_id
       INNER JOIN nutrition_v2_plan_versions v ON v.id = m.nutrition_plan_version_id
       WHERE mi.public_id = ? AND mi.deleted_at IS NULL AND m.deleted_at IS NULL AND v.deleted_at IS NULL FOR UPDATE`,
      [itemPublicId]
    );

    if (itemRows.length === 0) {
      throw new NutritionAuthorizationError("Item não encontrado.", "ITEM_NOT_FOUND", 404);
    }

    const item = itemRows[0];
    await getAndAssertDraftVersion(connection, String(item.version_public_id), ctx, true);

    // Soft delete child substitutions first, then the item
    await connection.query(
      `UPDATE nutrition_v2_item_substitutions
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE meal_item_id = ? AND deleted_at IS NULL`,
      [item.id]
    );

    await connection.query(
      `UPDATE nutrition_v2_meal_items
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [item.id]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

export async function reorderMealItems(
  ctx: NutritionAccessContext,
  mealPublicId: string,
  orderedItemPublicIds: string[]
): Promise<{ success: boolean }> {
  if (orderedItemPublicIds.length === 0) return { success: true };

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [mealRows] = await connection.query<RowDataPacket[]>(
      `SELECT m.id, m.nutrition_plan_version_id, v.public_id AS version_public_id
       FROM nutrition_v2_meals m
       INNER JOIN nutrition_v2_plan_versions v ON v.id = m.nutrition_plan_version_id
       WHERE m.public_id = ? AND m.deleted_at IS NULL AND v.deleted_at IS NULL FOR UPDATE`,
      [mealPublicId]
    );

    if (mealRows.length === 0) {
      throw new NutritionAuthorizationError("Refeição não encontrada.", "MEAL_NOT_FOUND", 404);
    }

    const meal = mealRows[0];
    await getAndAssertDraftVersion(connection, String(meal.version_public_id), ctx, true);

    const [items] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id FROM nutrition_v2_meal_items
       WHERE meal_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [meal.id]
    );

    const itemMap = new Map<string, number>();
    for (const it of items) {
      itemMap.set(String(it.public_id), Number(it.id));
    }

    for (const pubId of orderedItemPublicIds) {
      if (!itemMap.has(pubId)) {
        throw new NutritionAuthorizationError(
          "Item inválido ou pertencente a outra refeição.",
          "FORBIDDEN_ITEM_REORDER",
          403
        );
      }
    }

    for (let i = 0; i < orderedItemPublicIds.length; i++) {
      const itemId = itemMap.get(orderedItemPublicIds[i])!;
      await connection.query(
        `UPDATE nutrition_v2_meal_items SET sort_order = ? WHERE id = ?`,
        [i, itemId]
      );
    }

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// SUBSTITUTION CRUD & REORDER
// ============================================================================

export async function addSubstitution(
  ctx: NutritionAccessContext,
  itemPublicId: string,
  input: AddSubstitutionInput
): Promise<{ substitutionPublicId: string }> {
  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [itemRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        mi.id,
        m.nutrition_plan_version_id,
        v.public_id AS version_public_id
       FROM nutrition_v2_meal_items mi
       INNER JOIN nutrition_v2_meals m ON m.id = mi.meal_id
       INNER JOIN nutrition_v2_plan_versions v ON v.id = m.nutrition_plan_version_id
       WHERE mi.public_id = ? AND mi.deleted_at IS NULL AND m.deleted_at IS NULL AND v.deleted_at IS NULL FOR UPDATE`,
      [itemPublicId]
    );

    if (itemRows.length === 0) {
      throw new NutritionAuthorizationError("Item principal não encontrado.", "ITEM_NOT_FOUND", 404);
    }

    const item = itemRows[0];
    await getAndAssertDraftVersion(connection, String(item.version_public_id), ctx, true);

    let foodId: number | null = null;
    let foodNameSnapshot: string = "";
    const prescribedQuantity: number | null = input.prescribedQuantity != null && input.prescribedQuantity > 0 ? Number(input.prescribedQuantity) : null;
    let prescribedUnitCode: string | null = input.prescribedUnitCode ? input.prescribedUnitCode.trim().toUpperCase() : null;
    let prescribedUnitLabel: string | null = input.prescribedUnitLabel ? input.prescribedUnitLabel.trim() : null;
    let caloriesSnapshot: number | null = null;
    let proteinSnapshot: number | null = null;
    let carbsSnapshot: number | null = null;
    let fatSnapshot: number | null = null;

    if (input.foodPublicId && input.foodPublicId.trim()) {
      const [foods] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM nutrition_v2_foods WHERE public_id = ? AND deleted_at IS NULL`,
        [input.foodPublicId.trim()]
      );

      if (foods.length === 0) {
        throw new NutritionAuthorizationError("Alimento não encontrado.", "FOOD_NOT_FOUND", 404);
      }

      const food = foods[0];
      if (food.status !== "ACTIVE") {
        throw new NutritionAuthorizationError("Alimentos arquivados não podem ser adicionados.", "ARCHIVED_FOOD", 400);
      }

      if (food.scope === "CONSULTANCY" && Number(food.consultancy_id) !== ctx.consultancyId) {
        throw new NutritionAuthorizationError("Acesso negado a este alimento da consultoria.", "FORBIDDEN_FOOD", 403);
      }

      foodId = Number(food.id);
      foodNameSnapshot = String(food.name);

      let portionEquivalentAmount: number | null = null;
      if (input.portionPublicId && input.portionPublicId.trim()) {
        const [portions] = await connection.query<RowDataPacket[]>(
          `SELECT * FROM nutrition_v2_food_portions
           WHERE public_id = ? AND food_id = ? AND deleted_at IS NULL`,
          [input.portionPublicId.trim(), foodId]
        );

        if (portions.length === 0) {
          throw new NutritionAuthorizationError("Porção inválida para este alimento.", "INVALID_PORTION", 400);
        }

        const portion = portions[0];
        if (portion.status !== "ACTIVE") {
          throw new NutritionAuthorizationError("Porção arquivada não pode ser selecionada.", "ARCHIVED_PORTION", 400);
        }

        portionEquivalentAmount = Number(portion.equivalent_reference_amount);
        prescribedUnitCode = "PORCAO";
        prescribedUnitLabel = String(portion.label);
      }

      if (prescribedQuantity != null && prescribedQuantity > 0 && prescribedUnitCode) {
        const factor = calculateMacroFactor(
          Number(food.reference_amount),
          String(food.reference_unit_code),
          prescribedQuantity,
          prescribedUnitCode,
          portionEquivalentAmount
        );

        if (factor != null) {
          caloriesSnapshot = food.calories_kcal != null ? roundMacro(Number(food.calories_kcal) * factor) : null;
          proteinSnapshot = food.protein_g != null ? roundMacro(Number(food.protein_g) * factor) : null;
          carbsSnapshot = food.carbohydrate_g != null ? roundMacro(Number(food.carbohydrate_g) * factor) : null;
          fatSnapshot = food.fat_g != null ? roundMacro(Number(food.fat_g) * factor) : null;
        }
      }
    } else {
      const customName = input.customName ? input.customName.trim() : "";
      if (!customName) {
        throw new NutritionAuthorizationError("O nome do alimento de substituição é obrigatório.", "VALIDATION_ERROR", 400);
      }
      foodNameSnapshot = customName;
    }

    const [maxRows] = await connection.query<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sort_order), -1) AS max_sort
       FROM nutrition_v2_item_substitutions
       WHERE meal_item_id = ? AND deleted_at IS NULL`,
      [item.id]
    );
    const nextSort = Number(maxRows[0].max_sort) + 1;

    const substitutionPublicId = crypto.randomUUID();
    const notes = input.notes ? input.notes.trim() : null;

    await connection.query(
      `INSERT INTO nutrition_v2_item_substitutions (
        public_id,
        meal_item_id,
        food_id,
        sort_order,
        food_name_snapshot,
        prescribed_quantity,
        prescribed_unit_code,
        prescribed_unit_label,
        calories_kcal_snapshot,
        protein_g_snapshot,
        carbohydrate_g_snapshot,
        fat_g_snapshot,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        substitutionPublicId,
        item.id,
        foodId,
        nextSort,
        foodNameSnapshot,
        prescribedQuantity,
        prescribedUnitCode,
        prescribedUnitLabel,
        caloriesSnapshot,
        proteinSnapshot,
        carbsSnapshot,
        fatSnapshot,
        notes,
      ]
    );

    await connection.commit();
    return { substitutionPublicId };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

export async function updateSubstitution(
  ctx: NutritionAccessContext,
  substitutionPublicId: string,
  input: UpdateSubstitutionInput
): Promise<{ success: boolean }> {
  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [subRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        s.id,
        s.meal_item_id,
        s.food_id,
        s.prescribed_quantity,
        s.prescribed_unit_code,
        s.prescribed_unit_label,
        m.nutrition_plan_version_id,
        v.public_id AS version_public_id,
        f.reference_amount,
        f.reference_unit_code,
        f.calories_kcal,
        f.protein_g,
        f.carbohydrate_g,
        f.fat_g
       FROM nutrition_v2_item_substitutions s
       INNER JOIN nutrition_v2_meal_items mi ON mi.id = s.meal_item_id
       INNER JOIN nutrition_v2_meals m ON m.id = mi.meal_id
       INNER JOIN nutrition_v2_plan_versions v ON v.id = m.nutrition_plan_version_id
       LEFT JOIN nutrition_v2_foods f ON f.id = s.food_id
       WHERE s.public_id = ? AND s.deleted_at IS NULL AND mi.deleted_at IS NULL AND m.deleted_at IS NULL AND v.deleted_at IS NULL FOR UPDATE`,
      [substitutionPublicId]
    );

    if (subRows.length === 0) {
      throw new NutritionAuthorizationError("Substituição não encontrada.", "SUBSTITUTION_NOT_FOUND", 404);
    }

    const sub = subRows[0];
    await getAndAssertDraftVersion(connection, String(sub.version_public_id), ctx, true);

    const prescribedQuantity = input.prescribedQuantity !== undefined
      ? (input.prescribedQuantity != null && input.prescribedQuantity > 0 ? Number(input.prescribedQuantity) : null)
      : (sub.prescribed_quantity != null ? Number(sub.prescribed_quantity) : null);

    let prescribedUnitCode = input.prescribedUnitCode !== undefined
      ? (input.prescribedUnitCode ? input.prescribedUnitCode.trim().toUpperCase() : null)
      : (sub.prescribed_unit_code ? String(sub.prescribed_unit_code) : null);

    let prescribedUnitLabel = input.prescribedUnitLabel !== undefined
      ? (input.prescribedUnitLabel ? input.prescribedUnitLabel.trim() : null)
      : (sub.prescribed_unit_label ? String(sub.prescribed_unit_label) : null);

    let caloriesSnapshot = sub.calories_kcal_snapshot != null ? Number(sub.calories_kcal_snapshot) : null;
    let proteinSnapshot = sub.protein_g_snapshot != null ? Number(sub.protein_g_snapshot) : null;
    let carbsSnapshot = sub.carbohydrate_g_snapshot != null ? Number(sub.carbohydrate_g_snapshot) : null;
    let fatSnapshot = sub.fat_g_snapshot != null ? Number(sub.fat_g_snapshot) : null;

    if (sub.food_id != null) {
      let portionEquivalentAmount: number | null = null;
      if (input.portionPublicId !== undefined) {
        if (input.portionPublicId && input.portionPublicId.trim()) {
          const [portions] = await connection.query<RowDataPacket[]>(
            `SELECT * FROM nutrition_v2_food_portions
             WHERE public_id = ? AND food_id = ? AND deleted_at IS NULL`,
            [input.portionPublicId.trim(), sub.food_id]
          );
          if (portions.length === 0) {
            throw new NutritionAuthorizationError("Porção inválida para este alimento.", "INVALID_PORTION", 400);
          }
          const portion = portions[0];
          portionEquivalentAmount = Number(portion.equivalent_reference_amount);
          prescribedUnitCode = "PORCAO";
          prescribedUnitLabel = String(portion.label);
        } else {
          portionEquivalentAmount = null;
        }
      }

      if (prescribedQuantity != null && prescribedQuantity > 0 && prescribedUnitCode && sub.reference_amount != null) {
        const factor = calculateMacroFactor(
          Number(sub.reference_amount),
          String(sub.reference_unit_code),
          prescribedQuantity,
          prescribedUnitCode,
          portionEquivalentAmount
        );

        if (factor != null) {
          caloriesSnapshot = sub.calories_kcal != null ? roundMacro(Number(sub.calories_kcal) * factor) : null;
          proteinSnapshot = sub.protein_g != null ? roundMacro(Number(sub.protein_g) * factor) : null;
          carbsSnapshot = sub.carbohydrate_g != null ? roundMacro(Number(sub.carbohydrate_g) * factor) : null;
          fatSnapshot = sub.fat_g != null ? roundMacro(Number(sub.fat_g) * factor) : null;
        } else {
          caloriesSnapshot = null;
          proteinSnapshot = null;
          carbsSnapshot = null;
          fatSnapshot = null;
        }
      }
    }

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    updates.push("prescribed_quantity = ?");
    params.push(prescribedQuantity);

    updates.push("prescribed_unit_code = ?");
    params.push(prescribedUnitCode);

    updates.push("prescribed_unit_label = ?");
    params.push(prescribedUnitLabel);

    updates.push("calories_kcal_snapshot = ?");
    params.push(caloriesSnapshot);

    updates.push("protein_g_snapshot = ?");
    params.push(proteinSnapshot);

    updates.push("carbohydrate_g_snapshot = ?");
    params.push(carbsSnapshot);

    updates.push("fat_g_snapshot = ?");
    params.push(fatSnapshot);

    if (input.notes !== undefined) {
      updates.push("notes = ?");
      params.push(input.notes ? input.notes.trim() : null);
    }

    params.push(sub.id);
    await connection.query(
      `UPDATE nutrition_v2_item_substitutions SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

export async function removeSubstitution(
  ctx: NutritionAccessContext,
  substitutionPublicId: string
): Promise<{ success: boolean }> {
  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [subRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        s.id,
        m.nutrition_plan_version_id,
        v.public_id AS version_public_id
       FROM nutrition_v2_item_substitutions s
       INNER JOIN nutrition_v2_meal_items mi ON mi.id = s.meal_item_id
       INNER JOIN nutrition_v2_meals m ON m.id = mi.meal_id
       INNER JOIN nutrition_v2_plan_versions v ON v.id = m.nutrition_plan_version_id
       WHERE s.public_id = ? AND s.deleted_at IS NULL AND mi.deleted_at IS NULL AND m.deleted_at IS NULL AND v.deleted_at IS NULL FOR UPDATE`,
      [substitutionPublicId]
    );

    if (subRows.length === 0) {
      throw new NutritionAuthorizationError("Substituição não encontrada.", "SUBSTITUTION_NOT_FOUND", 404);
    }

    const sub = subRows[0];
    await getAndAssertDraftVersion(connection, String(sub.version_public_id), ctx, true);

    await connection.query(
      `UPDATE nutrition_v2_item_substitutions
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [sub.id]
    );

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

export async function reorderSubstitutions(
  ctx: NutritionAccessContext,
  itemPublicId: string,
  orderedSubstitutionPublicIds: string[]
): Promise<{ success: boolean }> {
  if (orderedSubstitutionPublicIds.length === 0) return { success: true };

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [itemRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        mi.id,
        m.nutrition_plan_version_id,
        v.public_id AS version_public_id
       FROM nutrition_v2_meal_items mi
       INNER JOIN nutrition_v2_meals m ON m.id = mi.meal_id
       INNER JOIN nutrition_v2_plan_versions v ON v.id = m.nutrition_plan_version_id
       WHERE mi.public_id = ? AND mi.deleted_at IS NULL AND m.deleted_at IS NULL AND v.deleted_at IS NULL FOR UPDATE`,
      [itemPublicId]
    );

    if (itemRows.length === 0) {
      throw new NutritionAuthorizationError("Item principal não encontrado.", "ITEM_NOT_FOUND", 404);
    }

    const item = itemRows[0];
    await getAndAssertDraftVersion(connection, String(item.version_public_id), ctx, true);

    const [subs] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id FROM nutrition_v2_item_substitutions
       WHERE meal_item_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [item.id]
    );

    const subMap = new Map<string, number>();
    for (const s of subs) {
      subMap.set(String(s.public_id), Number(s.id));
    }

    for (const pubId of orderedSubstitutionPublicIds) {
      if (!subMap.has(pubId)) {
        throw new NutritionAuthorizationError(
          "Substituição inválida ou pertencente a outro item.",
          "FORBIDDEN_SUBSTITUTION_REORDER",
          403
        );
      }
    }

    for (let i = 0; i < orderedSubstitutionPublicIds.length; i++) {
      const subId = subMap.get(orderedSubstitutionPublicIds[i])!;
      await connection.query(
        `UPDATE nutrition_v2_item_substitutions SET sort_order = ? WHERE id = ?`,
        [i, subId]
      );
    }

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}
