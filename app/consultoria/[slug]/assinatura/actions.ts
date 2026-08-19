"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  submitPlatformReceipt,
  MAX_PLATFORM_RECEIPT_FILE_SIZE_BYTES,
} from "@/lib/platform-admin/billing";

export type SubmitPlatformReceiptActionResult =
  | { success: true; receiptPublicId: string }
  | { success: false; error: string };

export async function submitPlatformReceiptAction(
  slug: string,
  chargePublicId: string,
  formData: FormData
): Promise<SubmitPlatformReceiptActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    return { success: false, error: "Contexto da consultoria não encontrado." };
  }

  if (!context.roles.includes("CONSULTANCY_ADMIN")) {
    return {
      success: false,
      error: "Apenas administradores da consultoria podem enviar comprovantes de assinatura.",
    };
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return { success: false, error: "Selecione o arquivo do comprovante." };
  }

  if (file.size === 0) {
    return { success: false, error: "O arquivo selecionado está vazio." };
  }

  if (file.size > MAX_PLATFORM_RECEIPT_FILE_SIZE_BYTES) {
    return { success: false, error: "O comprovante excede o tamanho máximo de 5 MB." };
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch {
    return { success: false, error: "Não foi possível ler o arquivo enviado." };
  }

  const buffer = Buffer.from(arrayBuffer);

  const result = await submitPlatformReceipt({
    actorUserId: session.userId,
    actorMembershipId: context.membershipId,
    consultancyId: context.consultancyId,
    chargePublicId,
    file: {
      buffer,
      fileName: file.name,
      clientMime: file.type,
    },
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}`);
    revalidatePath(`/consultoria/${slug}/assinatura`);
  }

  return result;
}
