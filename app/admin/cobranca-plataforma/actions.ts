"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import {
  updatePlatformBillingSettings,
  createPlatformCharge,
  cancelPlatformCharge,
  reviewPlatformReceipt,
  updateSubscriptionAdminStatus,
  type PixKeyType,
  type SubscriptionAdminStatus,
} from "@/lib/platform-admin/billing";

async function verifyPlatformAdminSession(): Promise<
  { authorized: true; userId: number } | { authorized: false; error: string }
> {
  const session = await getCurrentSession();
  if (!session) {
    return { authorized: false, error: "Não autenticado." };
  }
  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    return { authorized: false, error: "Acesso não autorizado." };
  }
  return { authorized: true, userId: session.userId };
}

export async function updatePlatformBillingSettingsAction(params: {
  pixKeyType: PixKeyType;
  pixKey: string;
  receiverName: string;
  instructions?: string | null;
}) {
  const auth = await verifyPlatformAdminSession();
  if (!auth.authorized) return { success: false, error: auth.error };

  const result = await updatePlatformBillingSettings({
    actorUserId: auth.userId,
    ...params,
  });

  if (result.success) {
    revalidatePath("/admin/cobranca-plataforma");
    revalidatePath("/admin/cobranca-plataforma/configuracoes");
  }

  return result;
}

export async function createPlatformChargeAction(params: {
  consultancyPublicId: string;
  title: string;
  description?: string | null;
  amountCents: number;
  dueOn: string;
  periodStart?: string | null;
  periodEnd?: string | null;
}) {
  const auth = await verifyPlatformAdminSession();
  if (!auth.authorized) return { success: false, error: auth.error };

  const result = await createPlatformCharge({
    actorUserId: auth.userId,
    ...params,
  });

  if (result.success) {
    revalidatePath("/admin/cobranca-plataforma");
    revalidatePath(`/admin/cobranca-plataforma/consultorias/${params.consultancyPublicId}`);
  }

  return result;
}

export async function cancelPlatformChargeAction(params: {
  chargePublicId: string;
  consultancyPublicId?: string;
}) {
  const auth = await verifyPlatformAdminSession();
  if (!auth.authorized) return { success: false, error: auth.error };

  const result = await cancelPlatformCharge({
    actorUserId: auth.userId,
    chargePublicId: params.chargePublicId,
  });

  if (result.success) {
    revalidatePath("/admin/cobranca-plataforma");
    if (params.consultancyPublicId) {
      revalidatePath(`/admin/cobranca-plataforma/consultorias/${params.consultancyPublicId}`);
    }
  }

  return result;
}

export async function reviewPlatformReceiptAction(params: {
  receiptPublicId: string;
  decision: "APPROVED" | "REJECTED";
  rejectionReason?: string;
  consultancyPublicId?: string;
}) {
  const auth = await verifyPlatformAdminSession();
  if (!auth.authorized) return { success: false, error: auth.error };

  const result = await reviewPlatformReceipt({
    actorUserId: auth.userId,
    receiptPublicId: params.receiptPublicId,
    decision: params.decision,
    rejectionReason: params.rejectionReason,
  });

  if (result.success) {
    revalidatePath("/admin/cobranca-plataforma");
    if (params.consultancyPublicId) {
      revalidatePath(`/admin/cobranca-plataforma/consultorias/${params.consultancyPublicId}`);
    }
  }

  return result;
}

export async function updateSubscriptionAdminStatusAction(params: {
  consultancyPublicId: string;
  targetStatus: SubscriptionAdminStatus;
  reason: string;
}) {
  const auth = await verifyPlatformAdminSession();
  if (!auth.authorized) return { success: false, error: auth.error };

  const result = await updateSubscriptionAdminStatus({
    actorUserId: auth.userId,
    ...params,
  });

  if (result.success) {
    revalidatePath("/admin/cobranca-plataforma");
    revalidatePath(`/admin/cobranca-plataforma/consultorias/${params.consultancyPublicId}`);
  }

  return result;
}
