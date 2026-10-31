"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createPromotionalCampaignLink,
  updatePromotionalCampaignLink,
  toggleParticipantPromotionStatus,
  createMarketingMaterial,
  archiveMarketingMaterial,
  type CampaignLinkStatus,
  type AnnouncedDiscountType,
  type CampaignCommissionType,
  type MediaFormat,
} from "@/lib/referrals/campaigns";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  saveMemberPayoutProfile,
  approveCommission,
  cancelCommission,
  markCommissionPaid,
  getRevealedPayoutProfileForAdmin,
  updateConsultancyReferralSettings,
  getOrCreateReferralCode,
  PixKeyType,
  CommissionType,
} from "@/lib/referrals/service";

export async function savePixProfileAction(
  slug: string,
  pixKeyType: PixKeyType,
  pixKey: string,
  receiverName?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) return { success: false, error: "Consultoria não encontrada." };

  const result = await saveMemberPayoutProfile(
    context.consultancyId,
    context.membershipId,
    pixKeyType,
    pixKey,
    receiverName
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/indicacoes`);
  }

  return result;
}

export async function approveCommissionAction(
  slug: string,
  commissionId: number,
  baseAmountCents?: number
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores podem aprovar comissões." };
  }

  const result = await approveCommission(
    context.consultancyId,
    commissionId,
    context.membershipId,
    session.userId,
    baseAmountCents !== undefined && baseAmountCents !== null ? BigInt(baseAmountCents) : undefined
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/indicacoes`);
    revalidatePath(`/consultoria/${slug}/operacoes`);
  }

  return result;
}

export async function cancelCommissionAction(
  slug: string,
  commissionId: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores podem cancelar comissões." };
  }

  const result = await cancelCommission(
    context.consultancyId,
    commissionId,
    context.membershipId,
    session.userId,
    reason
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/indicacoes`);
    revalidatePath(`/consultoria/${slug}/operacoes`);
  }

  return result;
}

export async function markCommissionPaidAction(
  slug: string,
  commissionId: number,
  paymentNote?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores podem liquidar pagamentos." };
  }

  const result = await markCommissionPaid(
    context.consultancyId,
    commissionId,
    context.membershipId,
    session.userId,
    paymentNote
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/indicacoes`);
    revalidatePath(`/consultoria/${slug}/operacoes`);
  }

  return result;
}

export async function revealPixKeyAction(
  slug: string,
  targetMemberId: number
): Promise<{ success: boolean; pixKey?: string; pixKeyType?: PixKeyType; receiverName?: string | null; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Acesso restrito ao administrador da consultoria." };
  }

  return getRevealedPayoutProfileForAdmin(
    context.consultancyId,
    targetMemberId,
    context.membershipId,
    session.userId
  );
}

export async function updateReferralSettingsAction(
  slug: string,
  isEnabled: boolean,
  commissionType: CommissionType,
  commissionValue: number
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores podem configurar o programa." };
  }

  const result = await updateConsultancyReferralSettings(
    context.consultancyId,
    isEnabled,
    commissionType,
    commissionValue,
    context.membershipId,
    session.userId
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/indicacoes`);
    revalidatePath(`/consultoria/${slug}/operacoes`);
  }

  return result;
}

export async function getOrCreateMyReferralCodeAction(
  slug: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) return { success: false, error: "Consultoria não encontrada." };

  return getOrCreateReferralCode(context.consultancyId, context.membershipId);
}

export async function createCampaignLinkAction(
  slug: string,
  input: {
    referrerMemberId: number;
    title: string;
    destinationUrl: string;
    description?: string | null;
    code?: string | null;
    announcedDiscountType?: AnnouncedDiscountType;
    announcedDiscountValue?: string | null;
    eligiblePlans?: string | null;
    commissionType: CampaignCommissionType;
    commissionValue: number;
    commissionConditions?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    maxUses?: number | null;
    status?: CampaignLinkStatus;
    materialIds?: number[];
  }
): Promise<{ success: boolean; linkId?: number; code?: string; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores podem cadastrar links de divulgação." };
  }

  const result = await createPromotionalCampaignLink(
    {
      ...input,
      consultancyId: context.consultancyId,
    },
    context.membershipId,
    session.userId
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/indicacoes`);
  }

  return result;
}

export async function updateCampaignLinkAction(
  slug: string,
  input: {
    linkId: number;
    title: string;
    destinationUrl: string;
    description?: string | null;
    announcedDiscountType?: AnnouncedDiscountType;
    announcedDiscountValue?: string | null;
    eligiblePlans?: string | null;
    commissionType: CampaignCommissionType;
    commissionValue: number;
    commissionConditions?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    maxUses?: number | null;
    status: CampaignLinkStatus;
    materialIds?: number[];
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores podem atualizar links de divulgação." };
  }

  const result = await updatePromotionalCampaignLink(
    {
      ...input,
      consultancyId: context.consultancyId,
    },
    context.membershipId,
    session.userId
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/indicacoes`);
  }

  return result;
}

export async function toggleParticipantPromotionAction(
  slug: string,
  targetMemberId: number,
  isEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores podem gerenciar a participação." };
  }

  const result = await toggleParticipantPromotionStatus(
    context.consultancyId,
    targetMemberId,
    isEnabled,
    context.membershipId,
    session.userId
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/indicacoes`);
  }

  return result;
}

export async function createMarketingMaterialAction(
  slug: string,
  input: {
    title: string;
    description?: string | null;
    mediaFormat: MediaFormat;
    fileUrl?: string | null;
    storageKey?: string | null;
    fileSizeBytes?: number | null;
    mimeType?: string | null;
    suggestedCaption?: string | null;
    isGlobal?: boolean;
    targetMemberId?: number | null;
    campaignLinkId?: number | null;
  }
): Promise<{ success: boolean; materialId?: number; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores podem cadastrar materiais de divulgação." };
  }

  const result = await createMarketingMaterial(
    {
      ...input,
      consultancyId: context.consultancyId,
    },
    context.membershipId,
    session.userId
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/indicacoes`);
  }

  return result;
}

export async function archiveMarketingMaterialAction(
  slug: string,
  materialId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores podem arquivar materiais de divulgação." };
  }

  const result = await archiveMarketingMaterial(
    context.consultancyId,
    materialId,
    context.membershipId,
    session.userId
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/indicacoes`);
  }

  return result;
}
