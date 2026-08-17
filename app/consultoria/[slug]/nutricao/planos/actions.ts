"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createDraftNutritionPlan,
  updateNutritionPlanDraftDetails,
  createNutritionMeal,
  updateNutritionMeal,
  moveNutritionMeal,
  removeNutritionMeal,
  createNutritionMealOption,
  moveNutritionMealOption,
  removeNutritionMealOption,
  createNutritionMealSection,
  updateNutritionMealSection,
  moveNutritionMealSection,
  removeNutritionMealSection,
} from "@/lib/consultancies/nutrition";

export type ActionResult<T = unknown> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

// ============================================================================
// PLAN ACTIONS
// ============================================================================

export async function createNutritionPlanAction(
  slug: string,
  formData: FormData
): Promise<ActionResult<{ planPublicId: string }>> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const studentMembershipPublicId = formData.get("studentMembershipPublicId");
  const title = formData.get("title");
  const subtitle = formData.get("subtitle");
  const generalGuidance = formData.get("generalGuidance");
  const startsOn = formData.get("startsOn");
  const endsOn = formData.get("endsOn");

  if (typeof studentMembershipPublicId !== "string" || !studentMembershipPublicId.trim()) {
    return { success: false, error: "Selecione um aluno para o plano alimentar." };
  }

  if (typeof title !== "string" || !title.trim()) {
    return { success: false, error: "O título do plano alimentar é obrigatório." };
  }

  const result = await createDraftNutritionPlan({
    actorUserId: session.userId,
    consultancySlug: slug,
    studentMembershipPublicId: studentMembershipPublicId.trim(),
    title: title.trim(),
    subtitle: typeof subtitle === "string" && subtitle.trim() ? subtitle.trim() : null,
    generalGuidance: typeof generalGuidance === "string" && generalGuidance.trim() ? generalGuidance.trim() : null,
    startsOn: typeof startsOn === "string" && startsOn.trim() ? startsOn.trim() : null,
    endsOn: typeof endsOn === "string" && endsOn.trim() ? endsOn.trim() : null,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos`);
  return { success: true, data: { planPublicId: result.planPublicId }, message: "Plano alimentar criado com sucesso!" };
}

export async function updateNutritionPlanDetailsAction(
  slug: string,
  planPublicId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const title = formData.get("title");
  const subtitle = formData.get("subtitle");
  const generalGuidance = formData.get("generalGuidance");
  const startsOn = formData.get("startsOn");
  const endsOn = formData.get("endsOn");

  if (typeof title !== "string" || !title.trim()) {
    return { success: false, error: "O título do plano alimentar é obrigatório." };
  }

  const result = await updateNutritionPlanDraftDetails({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    title: title.trim(),
    subtitle: typeof subtitle === "string" && subtitle.trim() ? subtitle.trim() : null,
    generalGuidance: typeof generalGuidance === "string" && generalGuidance.trim() ? generalGuidance.trim() : null,
    startsOn: typeof startsOn === "string" && startsOn.trim() ? startsOn.trim() : null,
    endsOn: typeof endsOn === "string" && endsOn.trim() ? endsOn.trim() : null,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Erro ao atualizar dados do plano." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  revalidatePath(`/consultoria/${slug}/nutricao/planos`);
  return { success: true, message: "Dados do plano atualizados com sucesso!" };
}

// ============================================================================
// MEAL ACTIONS
// ============================================================================

export async function createNutritionMealAction(
  slug: string,
  planPublicId: string,
  formData: FormData
): Promise<ActionResult<{ mealPublicId: string }>> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const title = formData.get("title");
  const scheduledTime = formData.get("scheduledTime");
  const notes = formData.get("notes");

  if (typeof title !== "string" || !title.trim()) {
    return { success: false, error: "O nome da refeição é obrigatório." };
  }

  const result = await createNutritionMeal({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    title: title.trim(),
    scheduledTime: typeof scheduledTime === "string" && scheduledTime.trim() ? scheduledTime.trim() : null,
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
  });

  if (!result.success || !result.mealPublicId) {
    return { success: false, error: result.error || "Erro ao adicionar refeição." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  return { success: true, data: { mealPublicId: result.mealPublicId }, message: "Refeição adicionada com sucesso!" };
}

export async function updateNutritionMealAction(
  slug: string,
  planPublicId: string,
  mealPublicId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const title = formData.get("title");
  const scheduledTime = formData.get("scheduledTime");
  const notes = formData.get("notes");

  if (typeof title !== "string" || !title.trim()) {
    return { success: false, error: "O nome da refeição é obrigatório." };
  }

  const result = await updateNutritionMeal({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    mealPublicId,
    title: title.trim(),
    scheduledTime: typeof scheduledTime === "string" && scheduledTime.trim() ? scheduledTime.trim() : null,
    notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Erro ao atualizar refeição." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  return { success: true, message: "Refeição atualizada com sucesso!" };
}

export async function moveNutritionMealAction(
  slug: string,
  planPublicId: string,
  mealPublicId: string,
  direction: "UP" | "DOWN"
): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  if (direction !== "UP" && direction !== "DOWN") {
    return { success: false, error: "Direção de movimento inválida." };
  }

  const result = await moveNutritionMeal({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    mealPublicId,
    direction,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Erro ao mover refeição." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  return { success: true };
}

export async function removeNutritionMealAction(
  slug: string,
  planPublicId: string,
  mealPublicId: string
): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await removeNutritionMeal({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    mealPublicId,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Erro ao remover refeição." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  return { success: true, message: "Refeição removida com sucesso!" };
}

// ============================================================================
// MEAL OPTION ACTIONS
// ============================================================================

export async function createNutritionMealOptionAction(
  slug: string,
  planPublicId: string,
  mealPublicId: string,
  title?: string | null
): Promise<ActionResult<{ optionPublicId: string }>> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await createNutritionMealOption({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    mealPublicId,
    title: title ? title.trim() : null,
  });

  if (!result.success || !result.optionPublicId) {
    return { success: false, error: result.error || "Erro ao adicionar opção." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  return { success: true, data: { optionPublicId: result.optionPublicId }, message: "Opção adicionada com sucesso!" };
}

export async function moveNutritionMealOptionAction(
  slug: string,
  planPublicId: string,
  optionPublicId: string,
  direction: "UP" | "DOWN"
): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  if (direction !== "UP" && direction !== "DOWN") {
    return { success: false, error: "Direção de movimento inválida." };
  }

  const result = await moveNutritionMealOption({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    optionPublicId,
    direction,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Erro ao mover opção." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  return { success: true };
}

export async function removeNutritionMealOptionAction(
  slug: string,
  planPublicId: string,
  optionPublicId: string
): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await removeNutritionMealOption({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    optionPublicId,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Erro ao remover opção." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  return { success: true, message: "Opção removida com sucesso!" };
}

// ============================================================================
// MEAL SECTION ACTIONS
// ============================================================================

export async function createNutritionMealSectionAction(
  slug: string,
  planPublicId: string,
  optionPublicId: string,
  title: string
): Promise<ActionResult<{ sectionPublicId: string }>> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  if (!title || !title.trim()) {
    return { success: false, error: "O título da seção é obrigatório." };
  }

  const result = await createNutritionMealSection({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    optionPublicId,
    title: title.trim(),
  });

  if (!result.success || !result.sectionPublicId) {
    return { success: false, error: result.error || "Erro ao adicionar seção." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  return { success: true, data: { sectionPublicId: result.sectionPublicId }, message: "Seção adicionada com sucesso!" };
}

export async function updateNutritionMealSectionAction(
  slug: string,
  planPublicId: string,
  sectionPublicId: string,
  title: string
): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  if (!title || !title.trim()) {
    return { success: false, error: "O título da seção é obrigatório." };
  }

  const result = await updateNutritionMealSection({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    sectionPublicId,
    title: title.trim(),
  });

  if (!result.success) {
    return { success: false, error: result.error || "Erro ao atualizar seção." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  return { success: true, message: "Seção atualizada com sucesso!" };
}

export async function moveNutritionMealSectionAction(
  slug: string,
  planPublicId: string,
  sectionPublicId: string,
  direction: "UP" | "DOWN"
): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  if (direction !== "UP" && direction !== "DOWN") {
    return { success: false, error: "Direção de movimento inválida." };
  }

  const result = await moveNutritionMealSection({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    sectionPublicId,
    direction,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Erro ao mover seção." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  return { success: true };
}

export async function removeNutritionMealSectionAction(
  slug: string,
  planPublicId: string,
  sectionPublicId: string
): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await removeNutritionMealSection({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    sectionPublicId,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Erro ao remover seção." };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/planos/${planPublicId}`);
  return { success: true, message: "Seção removida com sucesso!" };
}
