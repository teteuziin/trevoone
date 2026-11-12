"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { verifyAndReconcileChargePayment } from "@/lib/infinitepay/service";

export interface ReconcileResult {
  success: boolean;
  isPaid: boolean;
  status: string;
  message: string;
}

export async function reconcilePaymentAction(
  slug: string,
  chargePublicId: string,
  transactionNsu?: string,
  slugParam?: string
): Promise<ReconcileResult> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      isPaid: false,
      status: "UNAUTHENTICATED",
      message: "Sessão expirada. Faça login novamente.",
    };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    return {
      success: false,
      isPaid: false,
      status: "INVALID_CONTEXT",
      message: "Consultoria não encontrada.",
    };
  }

  const res = await verifyAndReconcileChargePayment({
    consultancySlug: slug,
    chargePublicId,
    transactionNsu,
    slug: slugParam,
  });

  if (res.isPaid) {
    revalidatePath(`/consultoria/${slug}`);
    revalidatePath(`/consultoria/${slug}/pagamentos`);
    revalidatePath(`/consultoria/${slug}/pagamentos/retorno`);
    revalidatePath(`/consultoria/${slug}/financeiro`);
  }

  return res;
}
