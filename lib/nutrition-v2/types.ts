/**
 * TREVO ONE — NUTRITION V2 DOMAIN TYPES
 * Authoritative type definitions for unified food library, portions, plans,
 * immutable versions, meals, meal items, substitutions, and student assignments.
 */

// ============================================================================
// ENUMS & LITERAL CONSTANTS
// ============================================================================

export type NutritionV2FoodScope = "GLOBAL" | "CONSULTANCY";
export const ALL_NUTRITION_V2_FOOD_SCOPES: readonly NutritionV2FoodScope[] = [
  "GLOBAL",
  "CONSULTANCY",
] as const;

export type NutritionV2FoodStatus = "ACTIVE" | "ARCHIVED";
export const ALL_NUTRITION_V2_FOOD_STATUSES: readonly NutritionV2FoodStatus[] = [
  "ACTIVE",
  "ARCHIVED",
] as const;

export type NutritionV2PlanStatus = "ACTIVE" | "ARCHIVED";
export const ALL_NUTRITION_V2_PLAN_STATUSES: readonly NutritionV2PlanStatus[] = [
  "ACTIVE",
  "ARCHIVED",
] as const;

export type NutritionV2PlanVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export const ALL_NUTRITION_V2_PLAN_VERSION_STATUSES: readonly NutritionV2PlanVersionStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
] as const;

export type NutritionV2AssignmentStatus = "ACTIVE" | "ENDED";
export const ALL_NUTRITION_V2_ASSIGNMENT_STATUSES: readonly NutritionV2AssignmentStatus[] = [
  "ACTIVE",
  "ENDED",
] as const;

export type NutritionV2UnitCode =
  | "G"
  | "KG"
  | "ML"
  | "L"
  | "UNIDADE"
  | "FATIA"
  | "COLHER_SOPA"
  | "COLHER_CHA"
  | "XICARA"
  | "SCOOP"
  | "PORCAO";

export const ALL_NUTRITION_V2_UNIT_CODES: readonly NutritionV2UnitCode[] = [
  "G",
  "KG",
  "ML",
  "L",
  "UNIDADE",
  "FATIA",
  "COLHER_SOPA",
  "COLHER_CHA",
  "XICARA",
  "SCOOP",
  "PORCAO",
] as const;

// ============================================================================
// DOMAIN DTOS
// ============================================================================

export interface NutritionV2FoodDto {
  id: string;
  publicId: string;
  scope: NutritionV2FoodScope;
  consultancyId: string | null;
  name: string;
  normalizedName: string;
  category: string | null;
  referenceAmount: number;
  referenceUnitCode: string;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
  status: NutritionV2FoodStatus;
  sourceType: string;
  sourceKey: string | null;
  sourceExternalCode: string | null;
  sourceVersion: string | null;
  sourceReference: string | null;
  sourceImportedAt: string | null;
  sourceUid: string | null;
  createdByUserId: string | null;
  createdByMembershipId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NutritionV2FoodPortionDto {
  id: string;
  publicId: string;
  foodId: string;
  label: string;
  equivalentReferenceAmount: number;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NutritionV2PlanDto {
  id: string;
  publicId: string;
  consultancyId: string;
  createdByMembershipId: string;
  isTemplate: boolean;
  status: NutritionV2PlanStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NutritionV2PlanVersionDto {
  id: string;
  publicId: string;
  nutritionPlanId: string;
  versionNumber: number;
  status: NutritionV2PlanVersionStatus;
  title: string;
  subtitle: string | null;
  objective: string | null;
  generalGuidance: string | null;
  notes: string | null;
  publishedAt: string | null;
  createdByMembershipId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NutritionV2MealDto {
  id: string;
  publicId: string;
  nutritionPlanVersionId: string;
  title: string;
  scheduledTime: string | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NutritionV2MealItemDto {
  id: string;
  publicId: string;
  mealId: string;
  foodId: string | null;
  sortOrder: number;
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
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NutritionV2ItemSubstitutionDto {
  id: string;
  publicId: string;
  mealItemId: string;
  foodId: string | null;
  sortOrder: number;
  foodNameSnapshot: string;
  prescribedQuantity: number | null;
  prescribedUnitCode: string | null;
  prescribedUnitLabel: string | null;
  caloriesKcalSnapshot: number | null;
  proteinGSnapshot: number | null;
  carbohydrateGSnapshot: number | null;
  fatGSnapshot: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NutritionV2AssignmentDto {
  id: string;
  publicId: string;
  consultancyId: string;
  studentMembershipId: string;
  nutritionPlanVersionId: string;
  assignedByMembershipId: string;
  startsOn: string;
  endsOn: string | null;
  status: NutritionV2AssignmentStatus;
  notesForStudent: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

// ============================================================================
// VERSION TREE DTO (NESTED STRUCTURE FOR BUILDER / PUBLISHING / RENDERING)
// ============================================================================

export interface NutritionV2ItemSubstitutionTreeDto {
  publicId?: string;
  foodId?: string | null;
  foodPublicId?: string | null;
  sortOrder: number;
  foodNameSnapshot: string;
  prescribedQuantity: number | null;
  prescribedUnitCode: string | null;
  prescribedUnitLabel: string | null;
  caloriesKcalSnapshot: number | null;
  proteinGSnapshot: number | null;
  carbohydrateGSnapshot: number | null;
  fatGSnapshot: number | null;
  notes: string | null;
}

export interface NutritionV2MealItemTreeDto {
  publicId?: string;
  foodId?: string | null;
  foodPublicId?: string | null;
  sortOrder: number;
  foodNameSnapshot: string;
  categorySnapshot?: string | null;
  prescribedQuantity: number | null;
  prescribedUnitCode: string | null;
  prescribedUnitLabel: string | null;
  caloriesKcalSnapshot: number | null;
  proteinGSnapshot: number | null;
  carbohydrateGSnapshot: number | null;
  fatGSnapshot: number | null;
  notes: string | null;
  substitutions: NutritionV2ItemSubstitutionTreeDto[];
}

export interface NutritionV2MealTreeDto {
  publicId?: string;
  title: string;
  scheduledTime: string | null;
  notes: string | null;
  sortOrder: number;
  items: NutritionV2MealItemTreeDto[];
}

export interface NutritionV2PlanVersionTreeDto {
  publicId?: string;
  nutritionPlanId?: string;
  versionNumber: number;
  status: NutritionV2PlanVersionStatus;
  title: string;
  subtitle: string | null;
  objective: string | null;
  generalGuidance: string | null;
  notes: string | null;
  publishedAt?: string | null;
  createdByMembershipId?: string;
  meals: NutritionV2MealTreeDto[];
}

export interface NutritionV2PlanWithVersionTreeDto {
  plan: NutritionV2PlanDto;
  version: NutritionV2PlanVersionTreeDto;
}

// ============================================================================
// MACRO TOTALS CONTRACT (P0 PRIMARY TOTALS FOUNDATION)
// ============================================================================

export interface NutritionV2MacroSummary {
  caloriesKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
}
