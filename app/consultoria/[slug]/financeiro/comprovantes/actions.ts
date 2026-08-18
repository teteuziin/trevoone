"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  approveStudentPaymentReceipt,
  rejectStudentPaymentReceipt,
} from "@/lib/consultancies/finance";

export type ReviewActionResult = {
  success: boolean;
  error?: string;
};

export async function approvePaymentReceiptAction(params: {
  slug: string;
  receiptPublicId: string;
}): Promise<ReviewActionResult> {
  const { slug, receiptPublicId } = params;

  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return {
      success: false,
      error: "Apenas administradores da consultoria podem aprovar comprovantes.",
    };
  }

  const result = await approveStudentPaymentReceipt({
    consultancyId: context.consultancyId,
    userId: session.userId,
    receiptPublicId,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${slug}/financeiro`);
  revalidatePath(`/consultoria/${slug}/financeiro/comprovantes`);
  revalidatePath(`/consultoria/${slug}/financeiro/comprovantes/${receiptPublicId}`);
  return { success: true };
}

export async function rejectPaymentReceiptAction(params: {
  slug: string;
  receiptPublicId: string;
  rejectionReason: string;
}): Promise<ReviewActionResult> {
  const { slug, receiptPublicId, rejectionReason } = params;

  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return {
      success: false,
      error: "Apenas administradores da consultoria podem rejeitar comprovantes.",
    };
  }

  const result = await rejectStudentPaymentReceipt({
    consultancyId: context.consultancyId,
    userId: session.userId,
    receiptPublicId,
    rejectionReason,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${slug}/financeiro`);
  revalidatePath(`/consultoria/${slug}/financeiro/comprovantes`);
  revalidatePath(`/consultoria/${slug}/financeiro/comprovantes/${receiptPublicId}`);
  return { success: true };
}
