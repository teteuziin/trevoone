"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import {
  listStudentWorkoutCards,
  getStudentWorkoutView,
} from "@/lib/training-v2/assignment-repository";
import {
  getActiveOrLatestStudentWorkoutExecution,
  listStudentWorkoutExecutionHistory,
} from "@/lib/training-v2/execution-repository";
import { getStudentAuthoritativeNutrition } from "@/lib/nutrition-v2/assignment-repository";
import {
  listFormTemplates,
  listFormRequests,
} from "@/lib/consultancies/custom-forms";
import { getStudentEvolutionHubData } from "@/lib/consultancies/evolution";

import type {
  StudentWorkoutViewContract,
  WorkoutExecutionSessionDto,
  WorkoutExecutionHistorySessionDto,
} from "@/lib/training-v2/types";
import type {
  CustomFormFieldDefinition,
  CustomFormRequestDto,
} from "@/lib/consultancies/custom-forms";
import type { EvolutionHubDataDto } from "@/types/evolution";

export type DomainResult<T> =
  | { status: "FULFILLED"; data: T }
  | { status: "REJECTED"; error: string };

export type StudentOfflinePrimeResult = {
  ok: boolean;
  error?: string;
  scope?: {
    userPublicId: string;
    consultancyPublicId: string;
    consultancySlug: string;
    consultancyName: string;
    consultancyLogoUrl: string | null;
    role: "STUDENT";
  };
  domains?: {
    workout: DomainResult<{
      active: boolean;
      assignmentPublicId?: string;
      workout?: StudentWorkoutViewContract;
      initialExecution?: WorkoutExecutionSessionDto | null;
      initialHistory?: WorkoutExecutionHistorySessionDto[];
    }>;
    nutrition: DomainResult<{
      active: boolean;
      planPublicId?: string;
      planTitle?: string;
      planSubtitle?: string | null;
      data?: unknown;
    }>;
    forms: DomainResult<{
      active: boolean;
      templates?: Array<{
        publicId: string;
        title: string;
        description: string | null;
        fields: CustomFormFieldDefinition[];
        isOnboardingRequired: boolean;
      }>;
      requests?: CustomFormRequestDto[];
    }>;
    evolution: DomainResult<{
      active: boolean;
      evolution?: EvolutionHubDataDto;
    }>;
  };
};

/**
 * Server Action: getStudentOfflinePrimeDataAction
 *
 * Provides bounded, non-blocking pre-synchronization of offline essential student data.
 * Architecture:
 * - Strictly authorized for active session with role STUDENT in consultancy.
 * - Partial success: uses Promise.allSettled across domains so isolated failures do not abort others.
 * - Data bounding: returns only current active prescriptions / scalar summaries (ZERO massive histories/blobs).
 * - Canonical UUIDs: userPublicId and consultancyPublicId (UUID) guaranteed byte-a-byte.
 */
export async function getStudentOfflinePrimeDataAction(
  consultancySlug: string
): Promise<StudentOfflinePrimeResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { ok: false, error: "UNAUTHENTICATED" };
  }

  const context = await resolveConsultancyContext(session.userId, consultancySlug);
  if (!context || !context.roles.includes("STUDENT")) {
    return { ok: false, error: "UNAUTHORIZED_OR_NOT_STUDENT" };
  }

  const userPublicId = session.userPublicId;
  const consultancyPublicId = context.consultancyPublicId; // Strict UUID

  // 1. WORKOUT DOMAIN (current active prescription)
  const workoutPromise = (async () => {
    const tCtx = await resolveTrainingAccessContext(consultancySlug);
    if (!tCtx || !tCtx.isStudent) {
      return { active: false };
    }

    const cards = await listStudentWorkoutCards(tCtx);
    if (!cards || cards.length === 0) {
      return { active: false };
    }

    const primaryCard = cards[0];
    const [workoutView, initialExecution, executionHistory] = await Promise.all([
      getStudentWorkoutView(tCtx, primaryCard.assignmentPublicId),
      getActiveOrLatestStudentWorkoutExecution(tCtx, primaryCard.assignmentPublicId),
      listStudentWorkoutExecutionHistory(tCtx, primaryCard.assignmentPublicId),
    ]);

    if (!workoutView) {
      return { active: false };
    }

    // Data bounding: at most 3 recent completed sessions for history
    const boundedHistory = (executionHistory || []).slice(0, 3);

    return {
      active: true,
      assignmentPublicId: primaryCard.assignmentPublicId,
      workout: workoutView,
      initialExecution: initialExecution || null,
      initialHistory: boundedHistory,
    };
  })();

  // 2. NUTRITION DOMAIN (authoritative current meal plan)
  const nutritionPromise = (async () => {
    const v2Auth = await getStudentAuthoritativeNutrition(session.userId, consultancySlug);
    if (!v2Auth || !v2Auth.activeAssignment) {
      return { active: false };
    }

    const plan = v2Auth.activeAssignment;
    return {
      active: true,
      planPublicId: plan.version.publicId || "active_plan",
      planTitle: plan.version.title,
      planSubtitle: plan.version.subtitle || null,
      data: plan,
    };
  })();

  // 3. FORMS DOMAIN (assigned form templates and requests)
  const formsPromise = (async () => {
    const [templates, requests] = await Promise.all([
      listFormTemplates(session.userId, consultancySlug),
      listFormRequests(session.userId, consultancySlug),
    ]);

    // Data bounding: template metadata and questions, zero binary file uploads
    const boundedTemplates = (templates || []).map((t) => ({
      publicId: t.publicId,
      title: t.title,
      description: t.description,
      fields: t.fields,
      isOnboardingRequired: t.isOnboardingRequired,
    }));

    return {
      active: true,
      templates: boundedTemplates,
      requests: requests || [],
    };
  })();

  // 4. EVOLUTION DOMAIN (scalar recent metrics and milestones summary, ZERO photos)
  const evolutionPromise = (async () => {
    const hubData = await getStudentEvolutionHubData({
      userId: session.userId,
      consultancySlug,
    });

    if (!hubData) {
      return { active: false };
    }

    return {
      active: true,
      evolution: {
        ...hubData,
        milestones: (hubData.milestones || []).slice(0, 5).map((m) => ({
          ...m,
          photos: null,
          hasPhotos: false,
        })),
        activePendingPhotoRequest: null,
        eligibleComparisonDates: [],
      },
    };
  })();

  // Independent execution with Promise.allSettled
  const [workoutSettled, nutritionSettled, formsSettled, evolutionSettled] =
    await Promise.allSettled([
      workoutPromise,
      nutritionPromise,
      formsPromise,
      evolutionPromise,
    ]);

  return {
    ok: true,
    scope: {
      userPublicId,
      consultancyPublicId,
      consultancySlug,
      consultancyName: context.consultancyName,
      consultancyLogoUrl: context.consultancyLogoUrl,
      role: "STUDENT",
    },
    domains: {
      workout:
        workoutSettled.status === "fulfilled"
          ? { status: "FULFILLED", data: workoutSettled.value }
          : { status: "REJECTED", error: String(workoutSettled.reason) },
      nutrition:
        nutritionSettled.status === "fulfilled"
          ? { status: "FULFILLED", data: nutritionSettled.value }
          : { status: "REJECTED", error: String(nutritionSettled.reason) },
      forms:
        formsSettled.status === "fulfilled"
          ? { status: "FULFILLED", data: formsSettled.value }
          : { status: "REJECTED", error: String(formsSettled.reason) },
      evolution:
        evolutionSettled.status === "fulfilled"
          ? { status: "FULFILLED", data: evolutionSettled.value }
          : { status: "REJECTED", error: String(evolutionSettled.reason) },
    },
  };
}
