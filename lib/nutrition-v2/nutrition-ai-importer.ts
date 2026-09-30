/**
 * TREVO ONE — NUTRITION AI IMPORTER
 * Multi-tenant AI extraction, universal Food Library V3 matching,
 * preparation awareness, visual claim tracking, and authoritative plan persistence.
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { getAiImportProvider } from "../ai/provider";
import {
  reserveAiQuota,
  markAiQuotaConsumed,
  refundAiQuota,
} from "../ai/quotas";
import type { DocumentInput } from "../ai/openai-client";
import type { RawNutritionImportProposal } from "../ai/schemas";
import { recordConsultancyActivity } from "../consultancies/activity-log";
import { normalizeSearchText } from "./food-search";

export type FoodMatchStatus = "MATCHED" | "AMBIGUOUS" | "NOT_FOUND";

export interface MatchedFoodCandidate {
  foodPublicId: string;
  name: string;
  sourceType: string;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  referenceAmount: number;
  referenceUnitCode: string;
}

export interface ResolvedNutritionFoodItem {
  id: string; // client temporary ID
  originalText: string;
  foodNameCandidate: string;
  matchStatus: FoodMatchStatus;
  foodPublicId: string | null;
  foodNameSnapshot: string;
  quantity: number | null;
  unitCandidate: string | null;
  notes: string | null;
  candidates: MatchedFoodCandidate[];
  authoritativeNutrients: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  } | null;
  sourceDocumentClaim: {
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
}

export interface ResolvedNutritionMeal {
  name: string;
  time: string | null;
  notes: string | null;
  foods: ResolvedNutritionFoodItem[];
}

export interface ResolvedNutritionProposal {
  jobPublicId: string;
  title: string;
  patientNameCandidate: string | null;
  targetPatientMembershipId: number | null;
  targetPatientName: string | null;
  objective: string | null;
  notes: string | null;
  meals: ResolvedNutritionMeal[];
  stats: {
    totalFoods: number;
    matchedCount: number;
    ambiguousCount: number;
    notFoundCount: number;
  };
  totalNutrientsAuthoritative: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  };
  status: "READY" | "NEEDS_REVIEW";
}

const COOKING_PREPARATIONS = [
  "cozido",
  "cozida",
  "grelhado",
  "grelhada",
  "frito",
  "frita",
  "assado",
  "assada",
  "cru",
  "crua",
  "refogado",
  "refogada",
  "vapor",
  "ensopado",
  "ensopada",
];

/**
 * Searches Food Library V3 (Global + Consultancy) for candidate matches,
 * with strict preparation matching and regional Brazilian synonyms.
 */
export async function matchFoodCandidate(
  consultancyId: number | bigint,
  candidateName: string
): Promise<{
  status: FoodMatchStatus;
  matched?: MatchedFoodCandidate;
  candidates: MatchedFoodCandidate[];
}> {
  const normCandidate = normalizeSearchText(candidateName);
  if (!normCandidate) {
    return { status: "NOT_FOUND", candidates: [] };
  }

  // Detect preparation terms in candidate (e.g. "cozida", "crua", "grelhado")
  const requestedPrep = COOKING_PREPARATIONS.find((prep) =>
    new RegExp(`\\b${prep}\\b`, "i").test(normCandidate)
  );

  const db = await getDbConnection();
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
        f.public_id,
        COALESCE(f.display_name_pt_br, f.name) AS display_name,
        f.normalized_name,
        f.source_type,
        f.calories_kcal,
        f.protein_g,
        f.carbohydrate_g,
        f.fat_g,
        f.fiber_g,
        f.reference_amount,
        f.reference_unit_code
       FROM nutrition_v2_foods f
       WHERE f.status = 'ACTIVE'
         AND f.deleted_at IS NULL
         AND (f.scope = 'GLOBAL' OR (f.scope = 'CONSULTANCY' AND f.consultancy_id = ?))`,
      [consultancyId]
    );

    const exactMatches: MatchedFoodCandidate[] = [];
    const prepMatches: MatchedFoodCandidate[] = [];
    const partialMatches: MatchedFoodCandidate[] = [];

    // Common regional aliases mapping
    let aliasedName = normCandidate;
    if (normCandidate.includes("aipim") || normCandidate.includes("macaxeira")) {
      aliasedName = normCandidate.replace(/aipim|macaxeira/g, "mandioca");
    }

    for (const r of rows) {
      const candidateObj: MatchedFoodCandidate = {
        foodPublicId: String(r.public_id),
        name: String(r.display_name),
        sourceType: String(r.source_type),
        caloriesKcal: r.calories_kcal !== null ? Number(r.calories_kcal) : null,
        proteinG: r.protein_g !== null ? Number(r.protein_g) : null,
        carbsG: r.carbohydrate_g !== null ? Number(r.carbohydrate_g) : null,
        fatG: r.fat_g !== null ? Number(r.fat_g) : null,
        fiberG: r.fiber_g !== null ? Number(r.fiber_g) : null,
        referenceAmount: Number(r.reference_amount || 100),
        referenceUnitCode: String(r.reference_unit_code || "G"),
      };

      const normDb = normalizeSearchText(String(r.display_name));

      // Exact match
      if (normDb === normCandidate || normDb === aliasedName) {
        exactMatches.push(candidateObj);
        continue;
      }

      // Check if matches preparation requirement
      const matchesCandidate =
        normDb.includes(normCandidate) ||
        normCandidate.includes(normDb) ||
        normDb.includes(aliasedName) ||
        aliasedName.includes(normDb);

      if (matchesCandidate) {
        if (requestedPrep) {
          const dbHasPrep = new RegExp(`\\b${requestedPrep}\\b`, "i").test(normDb);
          if (dbHasPrep) {
            prepMatches.push(candidateObj);
          } else {
            // Check if opposing preparation (e.g. cru vs cozido)
            const hasOpposingPrep = COOKING_PREPARATIONS.some(
              (p) => p !== requestedPrep && new RegExp(`\\b${p}\\b`, "i").test(normDb)
            );
            if (!hasOpposingPrep) {
              partialMatches.push(candidateObj);
            }
          }
        } else {
          partialMatches.push(candidateObj);
        }
      }
    }

    // 1. Exact matches
    if (exactMatches.length === 1) {
      return {
        status: "MATCHED",
        matched: exactMatches[0],
        candidates: exactMatches,
      };
    }
    if (exactMatches.length > 1) {
      return {
        status: "AMBIGUOUS",
        candidates: exactMatches,
      };
    }

    // 2. Preparation-specific matches
    if (prepMatches.length === 1) {
      return {
        status: "MATCHED",
        matched: prepMatches[0],
        candidates: prepMatches,
      };
    }
    if (prepMatches.length > 1) {
      return {
        status: "AMBIGUOUS",
        candidates: prepMatches.slice(0, 10),
      };
    }

    // 3. Partial matches
    if (partialMatches.length === 1) {
      return {
        status: "MATCHED",
        matched: partialMatches[0],
        candidates: partialMatches,
      };
    }
    if (partialMatches.length > 1) {
      return {
        status: "AMBIGUOUS",
        candidates: partialMatches.slice(0, 10),
      };
    }

    return {
      status: "NOT_FOUND",
      candidates: [],
    };
  } finally {
    db.release();
  }
}

/**
 * Calculates authoritative nutritional totals from real Trevo food records.
 */
export function calculateAuthoritativeItemNutrients(
  food: MatchedFoodCandidate,
  quantity: number | null
) {
  const qty = quantity && quantity > 0 ? quantity : 100;
  const factor = qty / (food.referenceAmount || 100);

  return {
    caloriesKcal: food.caloriesKcal !== null ? Math.round(food.caloriesKcal * factor * 10) / 10 : null,
    proteinG: food.proteinG !== null ? Math.round(food.proteinG * factor * 10) / 10 : null,
    carbsG: food.carbsG !== null ? Math.round(food.carbsG * factor * 10) / 10 : null,
    fatG: food.fatG !== null ? Math.round(food.fatG * factor * 10) / 10 : null,
    fiberG: food.fiberG !== null ? Math.round(food.fiberG * factor * 10) / 10 : null,
  };
}

/**
 * Initiates AI Nutrition import:
 * 1. Quota reservation (atomic server-side)
 * 2. OpenAI provider extraction
 * 3. Quota consumption or refund
 * 4. Food Library matching with preparation sensitivity
 * 5. Strict rejection of AI macros as authority (preserves claim as visual reference only)
 */
export async function processNutritionAiImport(params: {
  consultancyId: number | bigint;
  memberId: number | bigint;
  userId: number | bigint;
  role: string;
  input: DocumentInput;
  targetPatientMembershipId?: number | bigint | null;
  idempotencyKey?: string;
}): Promise<ResolvedNutritionProposal> {
  const {
    consultancyId,
    memberId,
    userId,
    role,
    input,
    targetPatientMembershipId,
    idempotencyKey = crypto.randomUUID(),
  } = params;

  // 1. Compute file hash
  const fileBuffer = input.buffer || Buffer.from(input.text || "", "utf8");
  const sourceHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const importJobPublicId = crypto.randomUUID();

  // Check idempotency if key provided
  const db = await getDbConnection();
  try {
    const [existingJobs] = await db.query<RowDataPacket[]>(
      `SELECT public_id, resolved_proposal_json, status
       FROM ai_import_jobs
       WHERE consultancy_id = ? AND idempotency_key = ? LIMIT 1`,
      [consultancyId, idempotencyKey]
    );

    if (existingJobs.length > 0 && existingJobs[0].resolved_proposal_json) {
      return JSON.parse(String(existingJobs[0].resolved_proposal_json));
    }
  } finally {
    db.release();
  }

  // 2. Atomic Quota Reservation
  const quotaReservation = await reserveAiQuota({
    consultancyId,
    memberId,
    userId,
    role,
    feature: "NUTRITION_IMPORT",
    model: "gpt-4o",
    importJobPublicId,
  });

  if (!quotaReservation.success) {
    throw new Error(quotaReservation.message || "Limite de cota de IA atingido.");
  }

  const usageEventPublicId = quotaReservation.usageEventPublicId!;

  // 3. Create initial import job record
  const sourceType = input.filename.endsWith(".pdf")
    ? "PDF"
    : input.filename.endsWith(".docx")
    ? "DOCX"
    : input.filename.endsWith(".md")
    ? "MARKDOWN"
    : "TEXT";

  const dbJob = await getDbConnection();
  try {
    await dbJob.query(
      `INSERT INTO ai_import_jobs (
        public_id, idempotency_key, consultancy_id, member_id, user_id,
        feature, status, source_filename, source_hash, source_type,
        file_size_bytes, target_student_membership_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSING', ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      [
        importJobPublicId,
        idempotencyKey,
        consultancyId,
        memberId,
        userId,
        input.filename,
        sourceHash,
        sourceType,
        fileBuffer.length,
        targetPatientMembershipId || null,
      ]
    );
  } finally {
    dbJob.release();
  }

  await recordConsultancyActivity({
    consultancyId,
    actorUserId: userId,
    actorMembershipId: memberId,
    actorRole: role,
    action: "AI_NUTRITION_IMPORT_STARTED",
    module: "AI",
    resourceType: "AI_IMPORT_JOB",
    resourcePublicId: importJobPublicId,
    summary: `Iniciou a importação com IA do plano alimentar a partir de ${input.filename}`,
    metadata: {
      filename: input.filename,
      sourceType,
      fileSizeBytes: fileBuffer.length,
    },
  });

  // 4. Invoke OpenAI provider with automatic refund on failure
  let rawProposal: RawNutritionImportProposal;
  let metadata: { inputTokens: number; outputTokens: number; totalTokens: number };

  try {
    const provider = getAiImportProvider();
    const result = await provider.importNutrition(input);
    rawProposal = result.proposal;
    metadata = result.metadata;

    await markAiQuotaConsumed(usageEventPublicId, {
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      totalTokens: metadata.totalTokens,
    });
  } catch (providerErr: unknown) {
    const errorMsg = providerErr instanceof Error ? providerErr.message : String(providerErr);
    await refundAiQuota(usageEventPublicId);

    const dbFail = await getDbConnection();
    try {
      await dbFail.query(
        `UPDATE ai_import_jobs SET status = 'FAILED', error_message = ?, updated_at = NOW(3) WHERE public_id = ?`,
        [(errorMsg || "Falha na chamada da OpenAI").slice(0, 500), importJobPublicId]
      );
    } finally {
      dbFail.release();
    }

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: userId,
      actorMembershipId: memberId,
      actorRole: role,
      action: "AI_NUTRITION_IMPORT_FAILED",
      module: "AI",
      resourceType: "AI_IMPORT_JOB",
      resourcePublicId: importJobPublicId,
      summary: `Falha ao processar o arquivo de nutrição ${input.filename} com IA`,
      metadata: { error: errorMsg },
    });

    throw new Error(`Falha no processamento com IA: ${errorMsg}`);
  }

  // 5. Match Foods against Food Library V3
  let totalFoods = 0;
  let matchedCount = 0;
  let ambiguousCount = 0;
  let notFoundCount = 0;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  let hasUnknownCalories = false;
  let hasUnknownProtein = false;
  let hasUnknownCarbs = false;
  let hasUnknownFat = false;
  let hasUnknownFiber = false;

  const resolvedMeals: ResolvedNutritionMeal[] = [];

  for (const m of rawProposal.meals || []) {
    const resolvedFoods: ResolvedNutritionFoodItem[] = [];

    for (const f of m.foods || []) {
      totalFoods++;
      const matchResult = await matchFoodCandidate(consultancyId, f.foodNameCandidate);

      let foodPublicId: string | null = null;
      let foodNameSnapshot = f.foodNameCandidate;
      let authoritativeNutrients: ResolvedNutritionFoodItem["authoritativeNutrients"] = null;

      if (matchResult.status === "MATCHED" && matchResult.matched) {
        matchedCount++;
        foodPublicId = matchResult.matched.foodPublicId;
        foodNameSnapshot = matchResult.matched.name;

        // Authoritative values strictly from the Trevo Food Library record!
        authoritativeNutrients = calculateAuthoritativeItemNutrients(
          matchResult.matched,
          f.quantity
        );

        if (authoritativeNutrients.caloriesKcal !== null) {
          totalCalories += authoritativeNutrients.caloriesKcal;
        } else {
          hasUnknownCalories = true;
        }
        if (authoritativeNutrients.proteinG !== null) {
          totalProtein += authoritativeNutrients.proteinG;
        } else {
          hasUnknownProtein = true;
        }
        if (authoritativeNutrients.carbsG !== null) {
          totalCarbs += authoritativeNutrients.carbsG;
        } else {
          hasUnknownCarbs = true;
        }
        if (authoritativeNutrients.fatG !== null) {
          totalFat += authoritativeNutrients.fatG;
        } else {
          hasUnknownFat = true;
        }
        if (authoritativeNutrients.fiberG !== null) {
          totalFiber += authoritativeNutrients.fiberG;
        } else {
          hasUnknownFiber = true;
        }
      } else {
        if (matchResult.status === "AMBIGUOUS") {
          ambiguousCount++;
        } else {
          notFoundCount++;
        }
        hasUnknownCalories = true;
        hasUnknownProtein = true;
        hasUnknownCarbs = true;
        hasUnknownFat = true;
        hasUnknownFiber = true;
      }

      resolvedFoods.push({
        id: crypto.randomUUID(),
        originalText: f.originalText,
        foodNameCandidate: f.foodNameCandidate,
        matchStatus: matchResult.status,
        foodPublicId,
        foodNameSnapshot,
        quantity: f.quantity,
        unitCandidate: f.unitCandidate,
        notes: f.notes,
        candidates: matchResult.candidates,
        authoritativeNutrients,
        // Visual comparison claim ONLY — never used as authoritative calculations!
        sourceDocumentClaim: f.sourceDocumentClaim,
      });
    }

    resolvedMeals.push({
      name: m.name || "Refeição",
      time: m.time,
      notes: m.notes,
      foods: resolvedFoods,
    });
  }

  // Resolve target patient if provided
  let targetPatientName: string | null = null;
  const dbPatient = await getDbConnection();
  try {
    if (targetPatientMembershipId) {
      const [pRows] = await dbPatient.query<RowDataPacket[]>(
        `SELECT u.full_name FROM consultancy_members cm
         INNER JOIN users u ON u.id = cm.user_id
         WHERE cm.id = ? AND cm.consultancy_id = ? LIMIT 1`,
        [targetPatientMembershipId, consultancyId]
      );
      if (pRows.length > 0) {
        targetPatientName = String(pRows[0].full_name);
      }
    }
  } finally {
    dbPatient.release();
  }

  const proposalStatus: "READY" | "NEEDS_REVIEW" =
    ambiguousCount > 0 || notFoundCount > 0 ? "NEEDS_REVIEW" : "READY";

  const resolvedProposal: ResolvedNutritionProposal = {
    jobPublicId: importJobPublicId,
    title: rawProposal.title || `Plano Alimentar - ${input.filename}`,
    patientNameCandidate: rawProposal.patientNameCandidate,
    targetPatientMembershipId: targetPatientMembershipId ? Number(targetPatientMembershipId) : null,
    targetPatientName,
    objective: rawProposal.objective,
    notes: rawProposal.notes,
    meals: resolvedMeals,
    stats: {
      totalFoods,
      matchedCount,
      ambiguousCount,
      notFoundCount,
    },
    totalNutrientsAuthoritative: {
      caloriesKcal: hasUnknownCalories ? null : Math.round(totalCalories * 10) / 10,
      proteinG: hasUnknownProtein ? null : Math.round(totalProtein * 10) / 10,
      carbsG: hasUnknownCarbs ? null : Math.round(totalCarbs * 10) / 10,
      fatG: hasUnknownFat ? null : Math.round(totalFat * 10) / 10,
      fiberG: hasUnknownFiber ? null : Math.round(totalFiber * 10) / 10,
    },
    status: proposalStatus,
  };

  // Update import job with proposals
  const dbSave = await getDbConnection();
  try {
    await dbSave.query(
      `UPDATE ai_import_jobs
       SET raw_proposal_json = ?,
           resolved_proposal_json = ?,
           status = ?,
           updated_at = NOW(3)
       WHERE public_id = ?`,
      [
        JSON.stringify(rawProposal),
        JSON.stringify(resolvedProposal),
        proposalStatus,
        importJobPublicId,
      ]
    );
  } finally {
    dbSave.release();
  }

  await recordConsultancyActivity({
    consultancyId,
    actorUserId: userId,
    actorMembershipId: memberId,
    actorRole: role,
    action: "AI_NUTRITION_IMPORT_COMPLETED",
    module: "AI",
    resourceType: "AI_IMPORT_JOB",
    resourcePublicId: importJobPublicId,
    summary: `Concluiu a leitura com IA de ${input.filename}: ${totalFoods} alimentos identificados (${matchedCount} encontrados)`,
    metadata: {
      filename: input.filename,
      totalFoods,
      matchedCount,
      ambiguousCount,
      notFoundCount,
    },
  });

  return resolvedProposal;
}

/**
 * Confirms and persists the resolved Nutrition plan into the authoritative Trevo database.
 */
export async function confirmNutritionAiImport(params: {
  consultancyId: number | bigint;
  memberId: number | bigint;
  userId: number | bigint;
  role: string;
  jobPublicId: string;
  targetPatientMembershipId?: number | bigint | null;
  confirmedTitle?: string;
  confirmedMeals: ResolvedNutritionMeal[];
}): Promise<{
  planPublicId: string;
  versionPublicId: string;
  assignmentPublicId?: string;
}> {
  const {
    consultancyId,
    memberId,
    userId,
    role,
    jobPublicId,
    targetPatientMembershipId,
    confirmedTitle,
    confirmedMeals,
  } = params;

  // Validate no unresolved foods exist
  for (const m of confirmedMeals) {
    for (const f of m.foods) {
      if (f.matchStatus !== "MATCHED" || !f.foodPublicId) {
        throw new Error(
          `O alimento "${f.foodNameCandidate}" na refeição "${m.name}" precisa ser selecionado ou removido antes de confirmar.`
        );
      }
    }
  }

  const db = await getDbConnection();
  try {
    await db.beginTransaction();

    const [jobRows] = await db.query<RowDataPacket[]>(
      `SELECT id, status, created_plan_public_id, source_filename
       FROM ai_import_jobs
       WHERE public_id = ? AND consultancy_id = ? FOR UPDATE`,
      [jobPublicId, consultancyId]
    );

    if (jobRows.length === 0) {
      await db.rollback();
      throw new Error("Job de importação não encontrado nesta consultoria.");
    }

    if (jobRows[0].status === "CONFIRMED" && jobRows[0].created_plan_public_id) {
      await db.rollback();
      return {
        planPublicId: String(jobRows[0].created_plan_public_id),
        versionPublicId: "",
      };
    }

    const title = (confirmedTitle || "Plano Alimentar Importado com IA").trim();
    const planPublicId = crypto.randomUUID();
    const versionPublicId = crypto.randomUUID();

    // 1. Insert plan root
    const [pRes] = await db.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_plans (
        public_id, consultancy_id, created_by_membership_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [planPublicId, consultancyId, memberId]
    );
    const planId = pRes.insertId;

    // 2. Insert draft version (version 1)
    const [vRes] = await db.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_plan_versions (
        public_id, nutrition_plan_id, version_number, status, title,
        created_by_membership_id, created_at, updated_at
      ) VALUES (?, ?, 1, 'DRAFT', ?, ?, NOW(3), NOW(3))`,
      [versionPublicId, planId, title, memberId]
    );
    const versionId = vRes.insertId;

    let foodsCreated = 0;

    // 3. Insert meals and food items
    let mealSort = 0;
    for (const m of confirmedMeals) {
      mealSort++;
      const mealPublicId = crypto.randomUUID();
      const [mRes] = await db.query<ResultSetHeader>(
        `INSERT INTO nutrition_v2_meals (
          public_id, nutrition_plan_version_id, title, scheduled_time, sort_order, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
        [mealPublicId, versionId, m.name, m.time || null, mealSort, m.notes || null]
      );
      const mealId = mRes.insertId;

      let itemSort = 0;
      for (const f of m.foods) {
        itemSort++;
        foodsCreated++;
        const itemPublicId = crypto.randomUUID();

        // Query authoritative food record from Trevo Food Library
        const [foodRows] = await db.query<RowDataPacket[]>(
          `SELECT
            id, public_id, COALESCE(display_name_pt_br, name) AS display_name,
            calories_kcal, protein_g, carbohydrate_g, fat_g, reference_amount, reference_unit_code
           FROM nutrition_v2_foods
           WHERE public_id = ? LIMIT 1`,
          [f.foodPublicId]
        );

        if (foodRows.length === 0) {
          throw new Error(`Alimento com ID ${f.foodPublicId} não encontrado no banco.`);
        }

        const foodDb = foodRows[0];
        const foodId = foodDb.id;
        const displayName = String(foodDb.display_name);
        const qty = f.quantity && f.quantity > 0 ? f.quantity : 100;
        const refAmount = Number(foodDb.reference_amount || 100);
        const factor = qty / refAmount;

        const cal = foodDb.calories_kcal !== null ? Math.round(Number(foodDb.calories_kcal) * factor * 10) / 10 : null;
        const p = foodDb.protein_g !== null ? Math.round(Number(foodDb.protein_g) * factor * 10) / 10 : null;
        const c = foodDb.carbohydrate_g !== null ? Math.round(Number(foodDb.carbohydrate_g) * factor * 10) / 10 : null;
        const fat = foodDb.fat_g !== null ? Math.round(Number(foodDb.fat_g) * factor * 10) / 10 : null;

        await db.query(
          `INSERT INTO nutrition_v2_meal_items (
            public_id, meal_id, food_id, sort_order, food_name_snapshot,
            prescribed_quantity, prescribed_unit_code, prescribed_unit_label,
            calories_kcal_snapshot, protein_g_snapshot, carbohydrate_g_snapshot,
            fat_g_snapshot, micronutrients_snapshot_json, notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NOW(3), NOW(3))`,
          [
            itemPublicId,
            mealId,
            foodId,
            itemSort,
            displayName,
            qty,
            f.unitCandidate || String(foodDb.reference_unit_code || "G"),
            f.unitCandidate || String(foodDb.reference_unit_code || "G"),
            cal,
            p,
            c,
            fat,
            f.notes || null,
          ]
        );
      }
    }

    // 4. Handle target patient candidate / optional context (does NOT publish or assign during import)
    let patientFullName: string | null = null;

    if (targetPatientMembershipId) {
      const [sRows] = await db.query<RowDataPacket[]>(
        `SELECT u.full_name FROM consultancy_members cm
         INNER JOIN users u ON u.id = cm.user_id
         INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role IN ('STUDENT', 'INFLUENCER')
         WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND u.deleted_at IS NULL LIMIT 1`,
        [targetPatientMembershipId, consultancyId]
      );
      if (sRows.length === 0) {
        await db.rollback();
        throw new Error("Aluno/paciente selecionado não é válido ou não pertence a esta consultoria.");
      }
      patientFullName = String(sRows[0].full_name);
    }

    // 5. Update job status to CONFIRMED
    await db.query(
      `UPDATE ai_import_jobs
       SET status = 'CONFIRMED',
           created_plan_public_id = ?,
           updated_at = NOW(3)
       WHERE public_id = ?`,
      [planPublicId, jobPublicId]
    );

    await db.commit();

    // 6. Record audit activity event
    const summary = patientFullName
      ? `importou com IA o plano alimentar "${title}" para ${patientFullName}`
      : `importou com IA o plano alimentar "${title}"`;

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: userId,
      actorMembershipId: memberId,
      actorRole: role,
      action: "AI_NUTRITION_IMPORT_CONFIRMED",
      module: "NUTRITION",
      resourceType: "NUTRITION_PLAN",
      resourcePublicId: planPublicId,
      subjectMembershipId: targetPatientMembershipId || null,
      summary,
      metadata: {
        importJobPublicId: jobPublicId,
        planPublicId,
        planTitle: title,
        mealsCount: confirmedMeals.length,
        foodsCreated,
        targetPatientName: patientFullName,
      },
    });

    return {
      planPublicId,
      versionPublicId,
      assignmentPublicId: undefined,
    };
  } catch (err) {
    await db.rollback();
    throw err;
  } finally {
    db.release();
  }
}
