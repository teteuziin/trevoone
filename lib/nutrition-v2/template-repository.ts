/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE G — REUSABLE PLAN TEMPLATES REPOSITORY
 * Blueprint storage, tenancy isolation, atomic creation/application, and fresh nutrient snapshots.
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  type NutritionAccessContext,
  NutritionAuthorizationError,
  assertCanAuthorNutrition,
} from "./access";
import type {
  NutritionV2PlanTemplateDetailDto,
  NutritionV2PlanTemplateListItemDto,
  NutritionV2TemplateMealDto,
  NutritionV2TemplateMealItemDto,
  NutritionV2TemplateItemSubstitutionDto,
} from "./types";
import { calculateItemNutrients } from "./nutrient-calculator";
import { captureMicronutrientsSnapshotForFood } from "./plan-repository";
import {
  nutritionV2CreateTemplateFromPlanSchema,
  nutritionV2RenameTemplateSchema,
  nutritionV2ArchiveTemplateSchema,
  nutritionV2CreatePlanFromTemplateSchema,
} from "./validation";

// ============================================================================
// PURE DOMAIN FUNCTIONS & VALIDATION (TESTABLE WITHOUT DB)
// ============================================================================

export interface CanonicalFoodRecord {
  id: number;
  publicId: string;
  name: string;
  displayNamePtBr?: string | null;
  category?: string | null;
  scope: string;
  consultancyId?: number | null;
  status: string;
  deletedAt?: string | null;
  referenceAmount: number;
  referenceUnitCode: string;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbohydrateG?: number | null;
  fatG?: number | null;
  portions?: Array<{
    id: number;
    publicId: string;
    label: string;
    equivalentReferenceAmount: number;
    status: string;
    deletedAt?: string | null;
  }>;
}

export interface ValidationIssue {
  itemType: "ITEM" | "SUBSTITUTION";
  identifier: string;
  foodName: string;
  reason: string;
}

/**
 * Validates that all foods referenced in template items and substitutions
 * are active, not deleted, accessible to the tenancy, and portions are valid.
 */
export function validateTemplateFoods(
  canonicalFoodsMap: Map<number, CanonicalFoodRecord>,
  items: Array<{
    id?: string | number;
    foodId: number | null;
    foodNameSnapshot: string;
    prescribedUnitCode: string | null;
    prescribedUnitLabel: string | null;
  }>,
  substitutions: Array<{
    id?: string | number;
    foodId: number | null;
    foodNameSnapshot: string;
    prescribedUnitCode: string | null;
    prescribedUnitLabel: string | null;
  }>,
  consultancyId: number
): { valid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  for (const item of items) {
    if (!item.foodId) continue; // Custom text item
    const food = canonicalFoodsMap.get(item.foodId);
    if (!food || food.deletedAt) {
      issues.push({
        itemType: "ITEM",
        identifier: String(item.id || item.foodNameSnapshot),
        foodName: item.foodNameSnapshot,
        reason: "Alimento excluído ou não encontrado no catálogo.",
      });
      continue;
    }
    if (food.status !== "ACTIVE") {
      issues.push({
        itemType: "ITEM",
        identifier: String(item.id || item.foodNameSnapshot),
        foodName: item.foodNameSnapshot,
        reason: "Alimento arquivado ou inativo.",
      });
      continue;
    }
    if (food.scope === "CONSULTANCY" && food.consultancyId !== consultancyId) {
      issues.push({
        itemType: "ITEM",
        identifier: String(item.id || item.foodNameSnapshot),
        foodName: item.foodNameSnapshot,
        reason: "Alimento pertence a outra consultoria.",
      });
      continue;
    }
    if (item.prescribedUnitCode === "PORCAO") {
      const activePortion = food.portions?.find(
        (p) =>
          p.label.trim().toLowerCase() === (item.prescribedUnitLabel || "").trim().toLowerCase() &&
          p.status === "ACTIVE" &&
          !p.deletedAt
      );
      if (!activePortion) {
        issues.push({
          itemType: "ITEM",
          identifier: String(item.id || item.foodNameSnapshot),
          foodName: item.foodNameSnapshot,
          reason: "Porção prescrita não está mais ativa ou disponível para este alimento.",
        });
      }
    }
  }

  for (const sub of substitutions) {
    if (!sub.foodId) continue;
    const food = canonicalFoodsMap.get(sub.foodId);
    if (!food || food.deletedAt) {
      issues.push({
        itemType: "SUBSTITUTION",
        identifier: String(sub.id || sub.foodNameSnapshot),
        foodName: sub.foodNameSnapshot,
        reason: "Alimento substituto excluído ou não encontrado no catálogo.",
      });
      continue;
    }
    if (food.status !== "ACTIVE") {
      issues.push({
        itemType: "SUBSTITUTION",
        identifier: String(sub.id || sub.foodNameSnapshot),
        foodName: sub.foodNameSnapshot,
        reason: "Alimento substituto arquivado ou inativo.",
      });
      continue;
    }
    if (food.scope === "CONSULTANCY" && food.consultancyId !== consultancyId) {
      issues.push({
        itemType: "SUBSTITUTION",
        identifier: String(sub.id || sub.foodNameSnapshot),
        foodName: sub.foodNameSnapshot,
        reason: "Alimento substituto pertence a outra consultoria.",
      });
      continue;
    }
    if (sub.prescribedUnitCode === "PORCAO") {
      const activePortion = food.portions?.find(
        (p) =>
          p.label.trim().toLowerCase() === (sub.prescribedUnitLabel || "").trim().toLowerCase() &&
          p.status === "ACTIVE" &&
          !p.deletedAt
      );
      if (!activePortion) {
        issues.push({
          itemType: "SUBSTITUTION",
          identifier: String(sub.id || sub.foodNameSnapshot),
          foodName: sub.foodNameSnapshot,
          reason: "Porção prescrita da substituição não está mais ativa ou disponível.",
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Extracts a patient-neutral nutritional blueprint from a plan version tree.
 * Strictly guarantees that zero patient data, assignment data, or consultation identity
 * is included.
 */
export function extractNutritionalBlueprintFromPlan(planTree: {
  version: {
    title: string;
    notes?: string | null;
    meals: Array<{
      title: string;
      scheduledTime?: string | null;
      notes?: string | null;
      sortOrder: number;
      items: Array<{
        foodId?: number | null;
        foodNameSnapshot: string;
        categorySnapshot?: string | null;
        prescribedQuantity: number | null;
        prescribedUnitCode: string | null;
        prescribedUnitLabel: string | null;
        notes?: string | null;
        substitutions?: Array<{
          foodId?: number | null;
          foodNameSnapshot: string;
          prescribedQuantity: number | null;
          prescribedUnitCode: string | null;
          prescribedUnitLabel: string | null;
          notes?: string | null;
          sortOrder: number;
        }>;
      }>;
    }>;
  };
  student?: unknown;
  patient?: unknown;
  assignment?: unknown;
}) {
  const blueprintMeals = (planTree.version.meals || []).map((m, mIndex) => ({
    title: m.title,
    scheduledTime: m.scheduledTime || null,
    sortOrder: m.sortOrder ?? mIndex,
    notes: m.notes || null,
    items: (m.items || []).map((item, iIndex) => ({
      foodId: item.foodId ?? null,
      foodNameSnapshot: item.foodNameSnapshot,
      categorySnapshot: item.categorySnapshot || null,
      prescribedQuantity: item.prescribedQuantity != null ? Number(item.prescribedQuantity) : null,
      prescribedUnitCode: item.prescribedUnitCode || null,
      prescribedUnitLabel: item.prescribedUnitLabel || null,
      sortOrder: iIndex,
      notes: item.notes || null,
      substitutions: (item.substitutions || []).map((s, sIndex) => ({
        foodId: s.foodId ?? null,
        foodNameSnapshot: s.foodNameSnapshot,
        prescribedQuantity: s.prescribedQuantity != null ? Number(s.prescribedQuantity) : null,
        prescribedUnitCode: s.prescribedUnitCode || null,
        prescribedUnitLabel: s.prescribedUnitLabel || null,
        sortOrder: s.sortOrder ?? sIndex,
        notes: s.notes || null,
      })),
    })),
  }));

  return {
    defaultTitle: planTree.version.title,
    meals: blueprintMeals,
  };
}

// ============================================================================
// TEMPLATE REPOSITORY DATABASE OPERATIONS
// ============================================================================

export interface CreateTemplateFromPlanInput {
  planPublicId: string;
  versionPublicId?: string;
  name: string;
  description?: string | null;
}

/**
 * Creates a reusable template from an existing plan/version.
 * Atomically copies nutritional structure and explicit substitutions.
 * Excludes all patient and assignment data.
 */
export async function createTemplateFromPlan(
  ctx: NutritionAccessContext,
  input: CreateTemplateFromPlanInput
): Promise<{ templatePublicId: string }> {
  assertCanAuthorNutrition(ctx);

  const parsed = nutritionV2CreateTemplateFromPlanSchema.parse(input);
  const name = parsed.name.trim();
  const description = parsed.description ? parsed.description.trim() : null;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Load source plan and verify consultancy tenancy
    const [plans] = await connection.query<RowDataPacket[]>(
      "SELECT id, public_id, consultancy_id FROM nutrition_v2_plans WHERE public_id = ? AND deleted_at IS NULL",
      [parsed.planPublicId]
    );

    if (plans.length === 0) {
      throw new NutritionAuthorizationError("Plano não encontrado.", "PLAN_NOT_FOUND", 404);
    }

    const plan = plans[0];
    if (Number(plan.consultancy_id) !== ctx.consultancyId) {
      throw new NutritionAuthorizationError("Acesso negado a este plano.", "FORBIDDEN_TENANT_PLAN", 403);
    }

    // 2. Load target version (or latest version)
    let version: RowDataPacket;
    if (parsed.versionPublicId) {
      const [versions] = await connection.query<RowDataPacket[]>(
        "SELECT id, public_id, version_number, status, title FROM nutrition_v2_plan_versions WHERE public_id = ? AND nutrition_plan_id = ? AND deleted_at IS NULL",
        [parsed.versionPublicId, plan.id]
      );
      if (versions.length === 0) {
        throw new NutritionAuthorizationError("Versão do plano não encontrada.", "VERSION_NOT_FOUND", 404);
      }
      version = versions[0];
    } else {
      const [versions] = await connection.query<RowDataPacket[]>(
        "SELECT id, public_id, version_number, status, title FROM nutrition_v2_plan_versions WHERE nutrition_plan_id = ? AND deleted_at IS NULL ORDER BY version_number DESC LIMIT 1",
        [plan.id]
      );
      if (versions.length === 0) {
        throw new NutritionAuthorizationError("Nenhuma versão ativa encontrada para este plano.", "VERSION_NOT_FOUND", 404);
      }
      version = versions[0];
    }

    // 3. Load all meals of the version
    const [meals] = await connection.query<RowDataPacket[]>(
      "SELECT id, public_id, title, scheduled_time, sort_order, notes FROM nutrition_v2_meals WHERE nutrition_plan_version_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC, id ASC",
      [version.id]
    );

    const mealIds = meals.map((m) => m.id);
    let items: RowDataPacket[] = [];
    let substitutions: RowDataPacket[] = [];

    if (mealIds.length > 0) {
      const [itemRows] = await connection.query<RowDataPacket[]>(
        `SELECT id, public_id, meal_id, food_id, sort_order, food_name_snapshot, category_snapshot,
                prescribed_quantity, prescribed_unit_code, prescribed_unit_label, notes
         FROM nutrition_v2_meal_items
         WHERE meal_id IN (?) AND deleted_at IS NULL
         ORDER BY sort_order ASC, id ASC`,
        [mealIds]
      );
      items = itemRows;

      const itemIds = items.map((i) => i.id);
      if (itemIds.length > 0) {
        const [subRows] = await connection.query<RowDataPacket[]>(
          `SELECT id, public_id, meal_item_id, food_id, sort_order, food_name_snapshot,
                  prescribed_quantity, prescribed_unit_code, prescribed_unit_label, notes
           FROM nutrition_v2_item_substitutions
           WHERE meal_item_id IN (?) AND deleted_at IS NULL
           ORDER BY sort_order ASC, id ASC`,
          [itemIds]
        );
        substitutions = subRows;
      }
    }

    // 4. Create template root
    const templatePublicId = crypto.randomUUID();
    const [templateRes] = await connection.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_plan_templates (
        public_id,
        consultancy_id,
        created_by_membership_id,
        name,
        description
      ) VALUES (?, ?, ?, ?, ?)`,
      [templatePublicId, ctx.consultancyId, ctx.membershipId, name, description]
    );
    const templateId = templateRes.insertId;

    // 5. Organize and copy meals, items, substitutions
    const itemsByMealId = new Map<number, RowDataPacket[]>();
    for (const item of items) {
      const mId = Number(item.meal_id);
      if (!itemsByMealId.has(mId)) itemsByMealId.set(mId, []);
      itemsByMealId.get(mId)!.push(item);
    }

    const subsByItemId = new Map<number, RowDataPacket[]>();
    for (const sub of substitutions) {
      const iId = Number(sub.meal_item_id);
      if (!subsByItemId.has(iId)) subsByItemId.set(iId, []);
      subsByItemId.get(iId)!.push(sub);
    }

    for (let mIdx = 0; mIdx < meals.length; mIdx++) {
      const m = meals[mIdx];
      const mealPublicId = crypto.randomUUID();
      const [mealRes] = await connection.query<ResultSetHeader>(
        `INSERT INTO nutrition_v2_template_meals (
          public_id,
          template_id,
          title,
          scheduled_time,
          sort_order,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [mealPublicId, templateId, m.title, m.scheduled_time || null, m.sort_order ?? mIdx, m.notes || null]
      );
      const templateMealId = mealRes.insertId;

      const mealItems = itemsByMealId.get(Number(m.id)) || [];
      for (let iIdx = 0; iIdx < mealItems.length; iIdx++) {
        const item = mealItems[iIdx];
        const itemPublicId = crypto.randomUUID();
        const [itemRes] = await connection.query<ResultSetHeader>(
          `INSERT INTO nutrition_v2_template_items (
            public_id,
            template_meal_id,
            food_id,
            sort_order,
            food_name_snapshot,
            category_snapshot,
            prescribed_quantity,
            prescribed_unit_code,
            prescribed_unit_label,
            notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            itemPublicId,
            templateMealId,
            item.food_id || null,
            item.sort_order ?? iIdx,
            item.food_name_snapshot,
            item.category_snapshot || null,
            item.prescribed_quantity != null ? Number(item.prescribed_quantity) : null,
            item.prescribed_unit_code || null,
            item.prescribed_unit_label || null,
            item.notes || null,
          ]
        );
        const templateItemId = itemRes.insertId;

        const itemSubs = subsByItemId.get(Number(item.id)) || [];
        for (let sIdx = 0; sIdx < itemSubs.length; sIdx++) {
          const sub = itemSubs[sIdx];
          const subPublicId = crypto.randomUUID();
          await connection.query(
            `INSERT INTO nutrition_v2_template_item_substitutions (
              public_id,
              template_meal_item_id,
              food_id,
              sort_order,
              food_name_snapshot,
              prescribed_quantity,
              prescribed_unit_code,
              prescribed_unit_label,
              notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              subPublicId,
              templateItemId,
              sub.food_id || null,
              sub.sort_order ?? sIdx,
              sub.food_name_snapshot,
              sub.prescribed_quantity != null ? Number(sub.prescribed_quantity) : null,
              sub.prescribed_unit_code || null,
              sub.prescribed_unit_label || null,
              sub.notes || null,
            ]
          );
        }
      }
    }

    await connection.commit();
    return { templatePublicId };
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

/**
 * Lists reusable plan templates available to the current consultancy.
 * By default excludes archived templates.
 */
export async function listTemplates(
  ctx: NutritionAccessContext,
  options: { includeArchived?: boolean } = {}
): Promise<NutritionV2PlanTemplateListItemDto[]> {
  assertCanAuthorNutrition(ctx);

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const conditions: string[] = [
      "t.consultancy_id = ?",
      "t.deleted_at IS NULL",
    ];
    const params: unknown[] = [ctx.consultancyId];

    if (!options.includeArchived) {
      conditions.push("t.archived_at IS NULL");
    }

    const query = `
      SELECT
        t.id,
        t.public_id,
        t.consultancy_id,
        t.name,
        t.description,
        t.archived_at,
        t.created_at,
        t.updated_at,
        COUNT(DISTINCT tm.id) AS meal_count,
        COUNT(DISTINCT ti.id) AS item_count
      FROM nutrition_v2_plan_templates t
      LEFT JOIN nutrition_v2_template_meals tm ON tm.template_id = t.id
      LEFT JOIN nutrition_v2_template_items ti ON ti.template_meal_id = tm.id
      WHERE ${conditions.join(" AND ")}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;

    const [rows] = await connection.query<RowDataPacket[]>(query, params);

    return rows.map((r) => ({
      id: String(r.id),
      publicId: String(r.public_id),
      consultancyId: Number(r.consultancy_id),
      name: String(r.name),
      description: r.description ? String(r.description) : null,
      archivedAt: r.archived_at ? new Date(r.archived_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      mealCount: Number(r.meal_count || 0),
      itemCount: Number(r.item_count || 0),
    }));
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Gets template details including meals, items, and substitutions.
 */
export async function getTemplateDetail(
  ctx: NutritionAccessContext,
  templatePublicId: string
): Promise<NutritionV2PlanTemplateDetailDto | null> {
  assertCanAuthorNutrition(ctx);

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const [templates] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM nutrition_v2_plan_templates WHERE public_id = ? AND deleted_at IS NULL",
      [templatePublicId]
    );

    if (templates.length === 0) return null;
    const t = templates[0];

    if (Number(t.consultancy_id) !== ctx.consultancyId) {
      throw new NutritionAuthorizationError("Acesso negado a este modelo.", "FORBIDDEN_TENANT_TEMPLATE", 403);
    }

    const [meals] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM nutrition_v2_template_meals WHERE template_id = ? ORDER BY sort_order ASC, id ASC",
      [t.id]
    );

    const mealIds = meals.map((m) => m.id);
    let items: RowDataPacket[] = [];
    let substitutions: RowDataPacket[] = [];

    if (mealIds.length > 0) {
      const [itemRows] = await connection.query<RowDataPacket[]>(
        `SELECT ti.*, f.public_id AS food_public_id
         FROM nutrition_v2_template_items ti
         LEFT JOIN nutrition_v2_foods f ON f.id = ti.food_id
         WHERE ti.template_meal_id IN (?)
         ORDER BY ti.sort_order ASC, ti.id ASC`,
        [mealIds]
      );
      items = itemRows;

      const itemIds = items.map((i) => i.id);
      if (itemIds.length > 0) {
        const [subRows] = await connection.query<RowDataPacket[]>(
          `SELECT tis.*, f.public_id AS food_public_id
           FROM nutrition_v2_template_item_substitutions tis
           LEFT JOIN nutrition_v2_foods f ON f.id = tis.food_id
           WHERE tis.template_meal_item_id IN (?)
           ORDER BY tis.sort_order ASC, tis.id ASC`,
          [itemIds]
        );
        substitutions = subRows;
      }
    }

    const subsByItemId = new Map<number, NutritionV2TemplateItemSubstitutionDto[]>();
    for (const s of substitutions) {
      const parentId = Number(s.template_meal_item_id);
      if (!subsByItemId.has(parentId)) subsByItemId.set(parentId, []);
      subsByItemId.get(parentId)!.push({
        id: String(s.id),
        publicId: String(s.public_id),
        foodId: s.food_id ? Number(s.food_id) : null,
        foodPublicId: s.food_public_id ? String(s.food_public_id) : null,
        sortOrder: Number(s.sort_order),
        foodNameSnapshot: String(s.food_name_snapshot),
        prescribedQuantity: s.prescribed_quantity != null ? Number(s.prescribed_quantity) : null,
        prescribedUnitCode: s.prescribed_unit_code ? String(s.prescribed_unit_code) : null,
        prescribedUnitLabel: s.prescribed_unit_label ? String(s.prescribed_unit_label) : null,
        notes: s.notes ? String(s.notes) : null,
      });
    }

    const itemsByMealId = new Map<number, NutritionV2TemplateMealItemDto[]>();
    let totalItems = 0;
    for (const item of items) {
      totalItems++;
      const mId = Number(item.template_meal_id);
      if (!itemsByMealId.has(mId)) itemsByMealId.set(mId, []);
      itemsByMealId.get(mId)!.push({
        id: String(item.id),
        publicId: String(item.public_id),
        foodId: item.food_id ? Number(item.food_id) : null,
        foodPublicId: item.food_public_id ? String(item.food_public_id) : null,
        sortOrder: Number(item.sort_order),
        foodNameSnapshot: String(item.food_name_snapshot),
        categorySnapshot: item.category_snapshot ? String(item.category_snapshot) : null,
        prescribedQuantity: item.prescribed_quantity != null ? Number(item.prescribed_quantity) : null,
        prescribedUnitCode: item.prescribed_unit_code ? String(item.prescribed_unit_code) : null,
        prescribedUnitLabel: item.prescribed_unit_label ? String(item.prescribed_unit_label) : null,
        notes: item.notes ? String(item.notes) : null,
        substitutions: subsByItemId.get(Number(item.id)) || [],
      });
    }

    const mealDtos: NutritionV2TemplateMealDto[] = meals.map((m) => ({
      id: String(m.id),
      publicId: String(m.public_id),
      title: String(m.title),
      scheduledTime: m.scheduled_time ? String(m.scheduled_time).slice(0, 5) : null,
      sortOrder: Number(m.sort_order),
      notes: m.notes ? String(m.notes) : null,
      items: itemsByMealId.get(Number(m.id)) || [],
    }));

    return {
      id: String(t.id),
      publicId: String(t.public_id),
      consultancyId: Number(t.consultancy_id),
      createdByMembershipId: Number(t.created_by_membership_id),
      name: String(t.name),
      description: t.description ? String(t.description) : null,
      archivedAt: t.archived_at ? new Date(t.archived_at).toISOString() : null,
      createdAt: new Date(t.created_at).toISOString(),
      updatedAt: new Date(t.updated_at).toISOString(),
      meals: mealDtos,
      mealCount: mealDtos.length,
      itemCount: totalItems,
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Renames a template and updates its optional description.
 */
export async function renameTemplate(
  ctx: NutritionAccessContext,
  input: { templatePublicId: string; name: string; description?: string | null }
): Promise<{ success: boolean }> {
  assertCanAuthorNutrition(ctx);

  const parsed = nutritionV2RenameTemplateSchema.parse(input);
  const name = parsed.name.trim();
  const description = parsed.description ? parsed.description.trim() : null;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const [templates] = await connection.query<RowDataPacket[]>(
      "SELECT id, consultancy_id FROM nutrition_v2_plan_templates WHERE public_id = ? AND deleted_at IS NULL",
      [parsed.templatePublicId]
    );

    if (templates.length === 0) {
      throw new NutritionAuthorizationError("Modelo não encontrado.", "TEMPLATE_NOT_FOUND", 404);
    }

    if (Number(templates[0].consultancy_id) !== ctx.consultancyId) {
      throw new NutritionAuthorizationError("Acesso negado a este modelo.", "FORBIDDEN_TENANT_TEMPLATE", 403);
    }

    await connection.query(
      "UPDATE nutrition_v2_plan_templates SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
      [name, description, templates[0].id]
    );

    return { success: true };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Archives a template so it is excluded from default active picker.
 */
export async function archiveTemplate(
  ctx: NutritionAccessContext,
  templatePublicId: string
): Promise<{ success: boolean }> {
  assertCanAuthorNutrition(ctx);

  const parsed = nutritionV2ArchiveTemplateSchema.parse({ templatePublicId });

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const [templates] = await connection.query<RowDataPacket[]>(
      "SELECT id, consultancy_id FROM nutrition_v2_plan_templates WHERE public_id = ? AND deleted_at IS NULL",
      [parsed.templatePublicId]
    );

    if (templates.length === 0) {
      throw new NutritionAuthorizationError("Modelo não encontrado.", "TEMPLATE_NOT_FOUND", 404);
    }

    if (Number(templates[0].consultancy_id) !== ctx.consultancyId) {
      throw new NutritionAuthorizationError("Acesso negado a este modelo.", "FORBIDDEN_TENANT_TEMPLATE", 403);
    }

    await connection.query(
      "UPDATE nutrition_v2_plan_templates SET archived_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
      [templates[0].id]
    );

    return { success: true };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Unarchives a previously archived template.
 */
export async function unarchiveTemplate(
  ctx: NutritionAccessContext,
  templatePublicId: string
): Promise<{ success: boolean }> {
  assertCanAuthorNutrition(ctx);

  const parsed = nutritionV2ArchiveTemplateSchema.parse({ templatePublicId });

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    const [templates] = await connection.query<RowDataPacket[]>(
      "SELECT id, consultancy_id FROM nutrition_v2_plan_templates WHERE public_id = ? AND deleted_at IS NULL",
      [parsed.templatePublicId]
    );

    if (templates.length === 0) {
      throw new NutritionAuthorizationError("Modelo não encontrado.", "TEMPLATE_NOT_FOUND", 404);
    }

    if (Number(templates[0].consultancy_id) !== ctx.consultancyId) {
      throw new NutritionAuthorizationError("Acesso negado a este modelo.", "FORBIDDEN_TENANT_TEMPLATE", 403);
    }

    await connection.query(
      "UPDATE nutrition_v2_plan_templates SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
      [templates[0].id]
    );

    return { success: true };
  } finally {
    if (connection) connection.release();
  }
}

export interface CreatePlanFromTemplateInput {
  templatePublicId: string;
  title?: string;
}

/**
 * Creates a brand new, completely independent DRAFT plan from a template.
 * Revalidates canonical food data and portions.
 * Derives FRESH macro snapshots and FRESH 23/23 micronutrient envelopes.
 * Rollback atomically on ANY invalid food or DB error.
 */
export async function createPlanFromTemplate(
  ctx: NutritionAccessContext,
  input: CreatePlanFromTemplateInput
): Promise<{ planPublicId: string; versionPublicId: string }> {
  assertCanAuthorNutrition(ctx);

  const parsed = nutritionV2CreatePlanFromTemplateSchema.parse(input);

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Load template and verify tenancy & active status
    const [templates] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM nutrition_v2_plan_templates WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE",
      [parsed.templatePublicId]
    );

    if (templates.length === 0) {
      throw new NutritionAuthorizationError("Modelo não encontrado.", "TEMPLATE_NOT_FOUND", 404);
    }

    const t = templates[0];
    if (Number(t.consultancy_id) !== ctx.consultancyId) {
      throw new NutritionAuthorizationError("Acesso negado a este modelo.", "FORBIDDEN_TENANT_TEMPLATE", 403);
    }

    if (t.archived_at) {
      throw new NutritionAuthorizationError(
        "Modelos arquivados não podem ser utilizados para criar novos planos.",
        "TEMPLATE_ARCHIVED",
        400
      );
    }

    // 2. Load all template meals, items, substitutions
    const [meals] = await connection.query<RowDataPacket[]>(
      "SELECT * FROM nutrition_v2_template_meals WHERE template_id = ? ORDER BY sort_order ASC, id ASC",
      [t.id]
    );

    const mealIds = meals.map((m) => m.id);
    let items: RowDataPacket[] = [];
    let substitutions: RowDataPacket[] = [];

    if (mealIds.length > 0) {
      const [itemRows] = await connection.query<RowDataPacket[]>(
        "SELECT * FROM nutrition_v2_template_items WHERE template_meal_id IN (?) ORDER BY sort_order ASC, id ASC",
        [mealIds]
      );
      items = itemRows;

      const itemIds = items.map((i) => i.id);
      if (itemIds.length > 0) {
        const [subRows] = await connection.query<RowDataPacket[]>(
          "SELECT * FROM nutrition_v2_template_item_substitutions WHERE template_meal_item_id IN (?) ORDER BY sort_order ASC, id ASC",
          [itemIds]
        );
        substitutions = subRows;
      }
    }

    // 3. Collect all referenced food IDs
    const referencedFoodIds = new Set<number>();
    for (const item of items) {
      if (item.food_id) referencedFoodIds.add(Number(item.food_id));
    }
    for (const sub of substitutions) {
      if (sub.food_id) referencedFoodIds.add(Number(sub.food_id));
    }

    // 4. Query current canonical food data & portions
    const canonicalFoodsMap = new Map<number, CanonicalFoodRecord>();
    const foodRowsById = new Map<number, RowDataPacket>();

    if (referencedFoodIds.size > 0) {
      const foodIdList = Array.from(referencedFoodIds);
      const [foodRows] = await connection.query<RowDataPacket[]>(
        "SELECT * FROM nutrition_v2_foods WHERE id IN (?)",
        [foodIdList]
      );

      for (const row of foodRows) {
        foodRowsById.set(Number(row.id), row);
      }

      const [portionRows] = await connection.query<RowDataPacket[]>(
        `SELECT id, public_id, food_id, label, equivalent_reference_amount, status, deleted_at
         FROM nutrition_v2_food_portions
         WHERE food_id IN (?) AND deleted_at IS NULL`,
        [foodIdList]
      );

      const portionsByFoodId = new Map<
        number,
        Array<{
          id: number;
          publicId: string;
          label: string;
          equivalentReferenceAmount: number;
          status: string;
          deletedAt: string | null;
        }>
      >();
      for (const p of portionRows) {
        const fId = Number(p.food_id);
        if (!portionsByFoodId.has(fId)) portionsByFoodId.set(fId, []);
        portionsByFoodId.get(fId)!.push({
          id: Number(p.id),
          publicId: String(p.public_id),
          label: String(p.label),
          equivalentReferenceAmount: Number(p.equivalent_reference_amount),
          status: String(p.status),
          deletedAt: p.deleted_at,
        });
      }

      for (const row of foodRows) {
        const fId = Number(row.id);
        canonicalFoodsMap.set(fId, {
          id: fId,
          publicId: String(row.public_id),
          name: String(row.name),
          displayNamePtBr: row.display_name_pt_br ? String(row.display_name_pt_br) : null,
          category: row.category ? String(row.category) : null,
          scope: String(row.scope),
          consultancyId: row.consultancy_id ? Number(row.consultancy_id) : null,
          status: String(row.status),
          deletedAt: row.deleted_at,
          referenceAmount: Number(row.reference_amount),
          referenceUnitCode: String(row.reference_unit_code),
          caloriesKcal: row.calories_kcal != null ? Number(row.calories_kcal) : null,
          proteinG: row.protein_g != null ? Number(row.protein_g) : null,
          carbohydrateG: row.carbohydrate_g != null ? Number(row.carbohydrate_g) : null,
          fatG: row.fat_g != null ? Number(row.fat_g) : null,
          portions: portionsByFoodId.get(fId) || [],
        });
      }
    }

    // 5. Revalidate every food and portion
    const itemsToCheck = items.map((i) => ({
      id: i.id,
      foodId: i.food_id ? Number(i.food_id) : null,
      foodNameSnapshot: String(i.food_name_snapshot),
      prescribedQuantity: i.prescribed_quantity != null ? Number(i.prescribed_quantity) : null,
      prescribedUnitCode: i.prescribed_unit_code ? String(i.prescribed_unit_code) : null,
      prescribedUnitLabel: i.prescribed_unit_label ? String(i.prescribed_unit_label) : null,
    }));

    const subsToCheck = substitutions.map((s) => ({
      id: s.id,
      foodId: s.food_id ? Number(s.food_id) : null,
      foodNameSnapshot: String(s.food_name_snapshot),
      prescribedQuantity: s.prescribed_quantity != null ? Number(s.prescribed_quantity) : null,
      prescribedUnitCode: s.prescribed_unit_code ? String(s.prescribed_unit_code) : null,
      prescribedUnitLabel: s.prescribed_unit_label ? String(s.prescribed_unit_label) : null,
    }));

    const validation = validateTemplateFoods(canonicalFoodsMap, itemsToCheck, subsToCheck, ctx.consultancyId);

    if (!validation.valid) {
      const summaryMsg =
        `Este modelo possui ${validation.issues.length} alimento(s) que precisam ser revisados antes de ser utilizado: ` +
        validation.issues.map((iss) => `${iss.foodName} (${iss.reason})`).join("; ");
      throw new NutritionAuthorizationError(summaryMsg, "CANNOT_APPLY_TEMPLATE_INVALID_FOODS", 400);
    }

    // 6. ALL VALID -> Create independent new Plan and Version 1 (DRAFT)
    const newPlanPublicId = crypto.randomUUID();
    const newVersionPublicId = crypto.randomUUID();
    const planTitle = (parsed.title && parsed.title.trim()) || String(t.name);

    const [planRes] = await connection.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_plans (
        public_id,
        consultancy_id,
        created_by_membership_id,
        is_template,
        status
      ) VALUES (?, ?, ?, 0, 'ACTIVE')`,
      [newPlanPublicId, ctx.consultancyId, ctx.membershipId]
    );
    const newPlanId = planRes.insertId;

    const [versionRes] = await connection.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_plan_versions (
        public_id,
        nutrition_plan_id,
        version_number,
        status,
        title,
        notes,
        created_by_membership_id
      ) VALUES (?, ?, 1, 'DRAFT', ?, ?, ?)`,
      [
        newVersionPublicId,
        newPlanId,
        planTitle,
        t.description ? String(t.description) : null,
        ctx.membershipId,
      ]
    );
    const newVersionId = versionRes.insertId;

    // 7. Insert meals, items, substitutions with FRESH calculations
    const itemsByMealId = new Map<number, RowDataPacket[]>();
    for (const item of items) {
      const mId = Number(item.template_meal_id);
      if (!itemsByMealId.has(mId)) itemsByMealId.set(mId, []);
      itemsByMealId.get(mId)!.push(item);
    }

    const subsByItemId = new Map<number, RowDataPacket[]>();
    for (const sub of substitutions) {
      const iId = Number(sub.template_meal_item_id);
      if (!subsByItemId.has(iId)) subsByItemId.set(iId, []);
      subsByItemId.get(iId)!.push(sub);
    }

    for (let mIdx = 0; mIdx < meals.length; mIdx++) {
      const m = meals[mIdx];
      const newMealPublicId = crypto.randomUUID();
      const [mealRes] = await connection.query<ResultSetHeader>(
        `INSERT INTO nutrition_v2_meals (
          public_id,
          nutrition_plan_version_id,
          title,
          scheduled_time,
          sort_order,
          notes
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [newMealPublicId, newVersionId, m.title, m.scheduled_time || null, m.sort_order ?? mIdx, m.notes || null]
      );
      const newMealId = mealRes.insertId;

      const mealItems = itemsByMealId.get(Number(m.id)) || [];
      for (let iIdx = 0; iIdx < mealItems.length; iIdx++) {
        const item = mealItems[iIdx];
        const newItemPublicId = crypto.randomUUID();

        let caloriesSnapshot: number | null = null;
        let proteinSnapshot: number | null = null;
        let carbsSnapshot: number | null = null;
        let fatSnapshot: number | null = null;
        let micronutrientsSnapshotJson: string | null = null;

        const foodId = item.food_id ? Number(item.food_id) : null;
        const food = foodId ? canonicalFoodsMap.get(foodId) : null;
        const rawFoodRow = foodId ? foodRowsById.get(foodId) : null;

        if (food) {
          let portionAmount: number | null = null;
          if (item.prescribed_unit_code === "PORCAO" && item.prescribed_unit_label) {
            const matchPortion = food.portions?.find(
              (p) => p.label.trim().toLowerCase() === item.prescribed_unit_label.trim().toLowerCase()
            );
            if (matchPortion) {
              portionAmount = matchPortion.equivalentReferenceAmount;
            }
          }

          const calc = calculateItemNutrients({
            food: {
              referenceAmount: food.referenceAmount,
              referenceUnitCode: food.referenceUnitCode,
              caloriesKcal: food.caloriesKcal,
              proteinG: food.proteinG,
              carbohydrateG: food.carbohydrateG,
              fatG: food.fatG,
            },
            prescribedQuantity: Number(item.prescribed_quantity),
            prescribedUnitCode: String(item.prescribed_unit_code),
            portion: portionAmount ? { label: item.prescribed_unit_label || "", equivalentReferenceAmount: portionAmount } : null,
          });

          if (!calc.isValid) {
            throw new NutritionAuthorizationError(calc.errorMessage || "Erro ao calcular nutrientes do item.", "CANNOT_APPLY_TEMPLATE_INVALID_FOODS", 400);
          }
          caloriesSnapshot = calc.caloriesKcal;
          proteinSnapshot = calc.proteinG;
          carbsSnapshot = calc.carbohydrateG;
          fatSnapshot = calc.fatG;

          // Fresh micronutrient snapshot using approved logic
          const microEnvelope = await captureMicronutrientsSnapshotForFood(
            connection,
            food.id,
            rawFoodRow || null,
            calc.factor
          );
          micronutrientsSnapshotJson = JSON.stringify(microEnvelope);
        }

        const [itemRes] = await connection.query<ResultSetHeader>(
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
            micronutrients_snapshot_json,
            notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newItemPublicId,
            newMealId,
            food ? food.id : null,
            item.sort_order ?? iIdx,
            food ? (food.displayNamePtBr || food.name) : item.food_name_snapshot,
            food ? food.category : (item.category_snapshot || null),
            item.prescribed_quantity != null ? Number(item.prescribed_quantity) : null,
            item.prescribed_unit_code || null,
            item.prescribed_unit_label || null,
            caloriesSnapshot,
            proteinSnapshot,
            carbsSnapshot,
            fatSnapshot,
            micronutrientsSnapshotJson,
            item.notes || null,
          ]
        );
        const newItemId = itemRes.insertId;

        // Substitutions
        const itemSubs = subsByItemId.get(Number(item.id)) || [];
        for (let sIdx = 0; sIdx < itemSubs.length; sIdx++) {
          const sub = itemSubs[sIdx];
          const newSubPublicId = crypto.randomUUID();

          let subCaloriesSnapshot: number | null = null;
          let subProteinSnapshot: number | null = null;
          let subCarbsSnapshot: number | null = null;
          let subFatSnapshot: number | null = null;
          let subMicroJson: string | null = null;

          const subFoodId = sub.food_id ? Number(sub.food_id) : null;
          const subFood = subFoodId ? canonicalFoodsMap.get(subFoodId) : null;
          const rawSubFoodRow = subFoodId ? foodRowsById.get(subFoodId) : null;

          if (subFood) {
            let subPortionAmount: number | null = null;
            if (sub.prescribed_unit_code === "PORCAO" && sub.prescribed_unit_label) {
              const matchPortion = subFood.portions?.find(
                (p) => p.label.trim().toLowerCase() === sub.prescribed_unit_label.trim().toLowerCase()
              );
              if (matchPortion) {
                subPortionAmount = matchPortion.equivalentReferenceAmount;
              }
            }

            const subCalc = calculateItemNutrients({
              food: {
                referenceAmount: subFood.referenceAmount,
                referenceUnitCode: subFood.referenceUnitCode,
                caloriesKcal: subFood.caloriesKcal,
                proteinG: subFood.proteinG,
                carbohydrateG: subFood.carbohydrateG,
                fatG: subFood.fatG,
              },
              prescribedQuantity: Number(sub.prescribed_quantity),
              prescribedUnitCode: String(sub.prescribed_unit_code),
              portion: subPortionAmount ? { label: sub.prescribed_unit_label || "", equivalentReferenceAmount: subPortionAmount } : null,
            });

            if (!subCalc.isValid) {
              throw new NutritionAuthorizationError(subCalc.errorMessage || "Erro ao calcular nutrientes da substitui??o.", "CANNOT_APPLY_TEMPLATE_INVALID_FOODS", 400);
            }
            subCaloriesSnapshot = subCalc.caloriesKcal;
            subProteinSnapshot = subCalc.proteinG;
            subCarbsSnapshot = subCalc.carbohydrateG;
            subFatSnapshot = subCalc.fatG;

            const subMicroEnvelope = await captureMicronutrientsSnapshotForFood(
              connection,
              subFood.id,
              rawSubFoodRow || null,
              subCalc.factor
            );
            subMicroJson = JSON.stringify(subMicroEnvelope);
          }

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
              micronutrients_snapshot_json,
              notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newSubPublicId,
              newItemId,
              subFood ? subFood.id : null,
              sub.sort_order ?? sIdx,
              subFood ? (subFood.displayNamePtBr || subFood.name) : sub.food_name_snapshot,
              sub.prescribed_quantity != null ? Number(sub.prescribed_quantity) : null,
              sub.prescribed_unit_code || null,
              sub.prescribed_unit_label || null,
              subCaloriesSnapshot,
              subProteinSnapshot,
              subCarbsSnapshot,
              subFatSnapshot,
              subMicroJson,
              sub.notes || null,
            ]
          );
        }
      }
    }

    await connection.commit();
    return { planPublicId: newPlanPublicId, versionPublicId: newVersionPublicId };
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
