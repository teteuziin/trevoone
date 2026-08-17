"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createStudentOwnProgressEntry,
  createProfessionalProgressEntry,
  type CreateProgressEntryInput,
} from "@/lib/consultancies/progress";

export interface ProgressActionResult {
  success: boolean;
  error?: string;
}

function extractProgressInputFromFormData(formData: FormData): CreateProgressEntryInput {
  const recordedOn = String(formData.get("recordedOn") || "").trim();
  const weightKg = formData.get("weightKg");
  const waistCm = formData.get("waistCm");
  const abdomenCm = formData.get("abdomenCm");
  const hipCm = formData.get("hipCm");
  const armCm = formData.get("armCm");
  const thighCm = formData.get("thighCm");
  const note = formData.get("note");

  return {
    recordedOn,
    weightKg: weightKg !== null ? String(weightKg) : null,
    waistCm: waistCm !== null ? String(waistCm) : null,
    abdomenCm: abdomenCm !== null ? String(abdomenCm) : null,
    hipCm: hipCm !== null ? String(hipCm) : null,
    armCm: armCm !== null ? String(armCm) : null,
    thighCm: thighCm !== null ? String(thighCm) : null,
    note: note !== null ? String(note) : null,
  };
}

/**
 * Server Action for Student to record own progress entry.
 */
export async function recordStudentOwnProgressAction(
  slug: string,
  formData: FormData
): Promise<ProgressActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const input = extractProgressInputFromFormData(formData);

    await createStudentOwnProgressEntry({
      userId: session.userId,
      consultancySlug: slug,
      input,
    });

    revalidatePath(`/consultoria/${slug}/progresso`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro inesperado ao registrar evolução.",
    };
  }
}

/**
 * Server Action for Personal Trainer to record progress entry for a student.
 */
export async function recordProfessionalProgressAction(
  slug: string,
  studentPublicId: string,
  formData: FormData
): Promise<ProgressActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    if (!studentPublicId || typeof studentPublicId !== "string" || !studentPublicId.trim()) {
      return { success: false, error: "Identificador do aluno inválido." };
    }

    const input = extractProgressInputFromFormData(formData);

    await createProfessionalProgressEntry({
      userId: session.userId,
      consultancySlug: slug,
      studentPublicId: studentPublicId.trim(),
      input,
    });

    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId.trim()}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro inesperado ao registrar evolução do aluno.",
    };
  }
}
