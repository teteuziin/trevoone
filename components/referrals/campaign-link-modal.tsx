"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckSquare,
  Square,
  MessageCircle,
  Link2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from "@/components/referrals/referral-icons";
import { UserAvatar } from "@/components/account/user-avatar";
import { buildWhatsAppUrl, isWhatsAppUrl, validateDestinationUrl } from "@/lib/referrals/url-utils";
import type {
  PromotionalCampaignLinkRecord,
  EligiblePromotionParticipant,
  PromotionalMarketingMaterialRecord,
  CampaignLinkStatus,
  AnnouncedDiscountType,
  CampaignCommissionType,
} from "@/lib/referrals/campaigns";
import {
  createCampaignLinkAction,
  updateCampaignLinkAction,
} from "@/app/consultoria/[slug]/indicacoes/actions";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return React.useSyncExternalStore(emptySubscribe, () => true, () => false);
}

interface CampaignLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  participants: EligiblePromotionParticipant[];
  materials: PromotionalMarketingMaterialRecord[];
  initialData?: PromotionalCampaignLinkRecord | null;
  defaultParticipantId?: number | null;
  onSuccess: () => void;
}

function parseExistingWhatsAppUrl(url: string | null | undefined): { phone: string; message: string } | null {
  if (!url || !isWhatsAppUrl(url)) return null;
  try {
    const full = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(full);
    let phone = "";
    const message = parsed.searchParams.get("text") || "";

    if (parsed.hostname.includes("wa.me")) {
      phone = parsed.pathname.replace(/^\//, "");
    } else if (parsed.searchParams.get("phone")) {
      phone = parsed.searchParams.get("phone") || "";
    }
    return { phone, message };
  } catch {
    return null;
  }
}

export function CampaignLinkModal({
  isOpen,
  onClose,
  consultancySlug,
  participants,
  materials,
  initialData,
  defaultParticipantId,
  onSuccess,
}: CampaignLinkModalProps) {
  const isEditing = Boolean(initialData);

  // Layer 1: Essenciais
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(() => {
    if (initialData?.referrerMemberId) return initialData.referrerMemberId;
    if (defaultParticipantId) return defaultParticipantId;
    return null;
  });

  // Derived effective participant ID (garante sincronização instantânea sem cascading renders)
  const effectiveMemberId = useMemo(() => {
    if (selectedMemberId && participants.some((p) => p.memberId === selectedMemberId)) {
      return selectedMemberId;
    }
    if (defaultParticipantId && participants.some((p) => p.memberId === defaultParticipantId)) {
      return defaultParticipantId;
    }
    return participants[0]?.memberId ?? 0;
  }, [selectedMemberId, defaultParticipantId, participants]);

  const existingWa = initialData?.destinationUrl ? parseExistingWhatsAppUrl(initialData.destinationUrl) : null;
  const initialIsWa = Boolean(existingWa || (initialData?.destinationUrl && isWhatsAppUrl(initialData.destinationUrl)));

  const [destinationType, setDestinationType] = useState<"WHATSAPP" | "CUSTOM_URL">(
    initialIsWa || !initialData ? "WHATSAPP" : "CUSTOM_URL"
  );
  const [whatsAppPhone, setWhatsAppPhone] = useState(existingWa?.phone || "");
  const [destinationUrl, setDestinationUrl] = useState(initialData?.destinationUrl || "");

  const [announcedDiscountType, setAnnouncedDiscountType] = useState<AnnouncedDiscountType>(
    initialData?.announcedDiscountType || "PERCENTAGE"
  );
  const [announcedDiscountValue, setAnnouncedDiscountValue] = useState(
    initialData?.announcedDiscountValue || "10"
  );
  const [isCustomDiscount, setIsCustomDiscount] = useState<boolean>(() => {
    if (!initialData?.announcedDiscountValue) return false;
    return initialData.announcedDiscountValue !== "10" && initialData.announcedDiscountValue !== "15";
  });

  const [commissionType, setCommissionType] = useState<CampaignCommissionType>(
    initialData?.commissionType || "PERCENTAGE"
  );
  const [commissionValue, setCommissionValue] = useState<number>(
    initialData?.commissionRateBasisPoints
      ? initialData.commissionRateBasisPoints / 100
      : initialData?.commissionAmountCents
      ? Number(initialData.commissionAmountCents) / 100
      : 10
  );

  // Layer 2: Opções avançadas (Estritamente fechado por padrão na criação; na edição, abre apenas se houver configurações avançadas)
  const [showAdvanced, setShowAdvanced] = useState<boolean>(() => {
    if (!initialData) return false;
    if (!initialData.id) return false;
    return Boolean(
      (initialData.description && initialData.description.trim()) ||
      (initialData.eligiblePlans && initialData.eligiblePlans.trim()) ||
      (initialData.commissionConditions && initialData.commissionConditions !== "Sobre a primeira contratação confirmada") ||
      initialData.startsAt ||
      initialData.endsAt ||
      initialData.maxUses != null
    );
  });

  const isMounted = useIsMounted();

  // Log diagnóstico seguro de montagem do modal
  useEffect(() => {
    console.log(
      `[CampaignLinkModal] Mounted: isEditing=${Boolean(initialData)}, showAdvanced=${showAdvanced}, participantsCount=${participants.length}, effectiveMemberId=${effectiveMemberId}`
    );
  }, [initialData, showAdvanced, participants.length, effectiveMemberId]);

  // Trava scroll da página de fundo enquanto o modal estiver aberto
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const [title, setTitle] = useState(initialData?.title || "");
  const [customWhatsAppMessage, setCustomWhatsAppMessage] = useState<string | null>(
    existingWa?.message ?? null
  );
  const [customCode, setCustomCode] = useState(initialData?.code || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [eligiblePlans, setEligiblePlans] = useState(initialData?.eligiblePlans || "");
  const [commissionConditions, setCommissionConditions] = useState(
    initialData?.commissionConditions || "Sobre a primeira contratação confirmada"
  );
  const [startsAt, setStartsAt] = useState(
    initialData?.startsAt ? new Date(initialData.startsAt).toISOString().split("T")[0] : ""
  );
  const [endsAt, setEndsAt] = useState(
    initialData?.endsAt ? new Date(initialData.endsAt).toISOString().split("T")[0] : ""
  );
  const [maxUses, setMaxUses] = useState<string>(
    initialData?.maxUses != null ? String(initialData.maxUses) : ""
  );
  const [status, setStatus] = useState<CampaignLinkStatus>(initialData?.status || "ACTIVE");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom in-app field validation (sem tooltips nativos do browser)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selectedParticipant = participants.find((p) => p.memberId === effectiveMemberId);

  // Dynamic automatic title default
  const defaultTitle = useMemo(() => {
    const pName = selectedParticipant?.name || "Divulgação";
    return `Link de ${pName}`;
  }, [selectedParticipant?.name]);

  // Dynamic default WhatsApp template based on selected participant, code, and discount
  const defaultWhatsAppTemplate = useMemo(() => {
    const pName = selectedParticipant?.name || "um parceiro oficial";
    const cCode = customCode || selectedParticipant?.defaultCode || "PROMO";
    const discPart = announcedDiscountValue ? ` com ${announcedDiscountValue}% de desconto` : "";
    return `Olá! Vim pela indicação de ${pName} (cupom ${cCode}) e quero saber mais sobre a consultoria${discPart}!`;
  }, [selectedParticipant?.name, selectedParticipant?.defaultCode, customCode, announcedDiscountValue]);

  const activeWhatsAppMessage = customWhatsAppMessage !== null ? customWhatsAppMessage : defaultWhatsAppTemplate;

  // Compute live WhatsApp URL preview
  const computedWhatsAppUrl = useMemo(() => {
    if (destinationType !== "WHATSAPP" || !whatsAppPhone.trim()) return "";
    return buildWhatsAppUrl(whatsAppPhone, activeWhatsAppMessage);
  }, [destinationType, whatsAppPhone, activeWhatsAppMessage]);

  function handleResetDefaultWhatsAppMessage() {
    setCustomWhatsAppMessage(null);
  }

  function handlePresetDiscount(val: string) {
    setAnnouncedDiscountType("PERCENTAGE");
    setAnnouncedDiscountValue(val);
  }

  // Indicator if advanced options contain customizations
  const hasAdvancedCustomizations = useMemo(() => {
    return Boolean(
      title.trim() ||
      customCode.trim() ||
      customWhatsAppMessage !== null ||
      description.trim() ||
      eligiblePlans.trim() ||
      commissionConditions !== "Sobre a primeira contratação confirmada" ||
      startsAt ||
      endsAt ||
      maxUses ||
      selectedMaterialIds.length > 0 ||
      status !== "ACTIVE"
    );
  }, [
    title,
    customCode,
    customWhatsAppMessage,
    description,
    eligiblePlans,
    commissionConditions,
    startsAt,
    endsAt,
    maxUses,
    selectedMaterialIds,
    status,
  ]);

  if (!isOpen || !isMounted) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Custom controlled validation (substitui tooltip nativo do browser)
    const errors: Record<string, string> = {};

    if (!effectiveMemberId) {
      errors.member = "Selecione o participante responsável.";
    }

    let finalDestinationUrl = destinationUrl.trim();
    if (destinationType === "WHATSAPP") {
      const digits = whatsAppPhone.replace(/\D/g, "");
      if (!digits) {
        errors.phone = "Informe o número do WhatsApp com DDD.";
      } else if (digits.length < 10) {
        errors.phone = "O WhatsApp deve conter DDD e número válido (mínimo 10 dígitos).";
      } else {
        finalDestinationUrl = buildWhatsAppUrl(whatsAppPhone, activeWhatsAppMessage);
      }
    } else {
      if (!destinationUrl.trim()) {
        errors.url = "Informe a URL de destino da campanha.";
      } else {
        const validated = validateDestinationUrl(destinationUrl);
        if (!validated.valid) {
          errors.url = validated.error || "Endereço de URL inválido.";
        }
      }
    }

    if (isNaN(commissionValue) || commissionValue < 0) {
      errors.commission = "Informe um valor de comissão válido.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    // Default title if empty
    const finalTitle = title.trim() || defaultTitle;

    setIsSubmitting(true);

    try {
      if (isEditing && initialData) {
        const res = await updateCampaignLinkAction(consultancySlug, {
          linkId: initialData.id,
          title: finalTitle,
          destinationUrl: finalDestinationUrl,
          description: description.trim() || null,
          announcedDiscountType,
          announcedDiscountValue,
          eligiblePlans: eligiblePlans.trim() || null,
          commissionType,
          commissionValue: Number(commissionValue),
          commissionConditions: commissionConditions.trim() || "Sobre a primeira contratação confirmada",
          startsAt: startsAt || null,
          endsAt: endsAt || null,
          maxUses: maxUses ? parseInt(maxUses, 10) : null,
          status,
          materialIds: selectedMaterialIds,
        });

        if (!res.success) {
          setError(res.error || "Erro ao atualizar link.");
          setIsSubmitting(false);
          return;
        }
      } else {
        const res = await createCampaignLinkAction(consultancySlug, {
          referrerMemberId: effectiveMemberId,
          title: finalTitle,
          destinationUrl: finalDestinationUrl,
          description: description.trim() || null,
          code: customCode.trim() || null,
          announcedDiscountType,
          announcedDiscountValue,
          eligiblePlans: eligiblePlans.trim() || null,
          commissionType,
          commissionValue: Number(commissionValue),
          commissionConditions: commissionConditions.trim() || "Sobre a primeira contratação confirmada",
          startsAt: startsAt || null,
          endsAt: endsAt || null,
          maxUses: maxUses ? parseInt(maxUses, 10) : null,
          status,
          materialIds: selectedMaterialIds,
        });

        if (!res.success) {
          setError(res.error || "Erro ao criar link.");
          setIsSubmitting(false);
          return;
        }
      }

      onSuccess();
      onClose();
    } catch {
      setError("Ocorreu um erro ao salvar o link. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#151619] border-t sm:border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[88dvh] sm:max-h-[90vh] overflow-hidden m-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MOBILE DRAG HANDLE */}
        <div className="w-full pt-3 pb-1 flex justify-center sm:hidden shrink-0 bg-white dark:bg-[#151619]">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* HEADER FIXO */}
        <div className="px-4 py-3 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-start justify-between shrink-0 bg-white dark:bg-[#151619]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              {isEditing ? "Edição de Campanha" : "Nova Campanha de Divulgação"}
            </span>
            <h2 id="campaign-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {isEditing ? `Editar Link /r/${initialData?.code}` : "Criar Link Individual de Divulgação"}
            </h2>
          </div>
          {/* Botão X exibido apenas em desktop/tablet; mobile fecha tocando no overlay */}
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORMULÁRIO COM CORPO ROLÁVEL E FOOTER STICKY */}
        <form noValidate onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* CORPO ROLÁVEL */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* ==================================================================== */}
            {/* CAMADA 1: ESSENCIAIS (ORDEM ESTRITA, SEM RUÍDO VISUAL)               */}
            {/* 1. Participante Responsável                                         */}
            {/* 2. Tipo de Destino + Campo Dinâmico Único                            */}
            {/* 3. Desconto                                                         */}
            {/* 4. Comissão                                                         */}
            {/* ==================================================================== */}

            {/* 1. PARTICIPANTE RESPONSÁVEL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Participante Responsável
              </label>
              {isEditing ? (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <UserAvatar
                    fullName={initialData?.referrerName}
                    userPublicId={initialData?.referrerUserPublicId}
                    size="sm"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {initialData?.referrerName}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-semibold">
                      {initialData?.referrerRole === "INFLUENCER" ? "Influenciador / VIP" : "Aluno"}
                    </span>
                  </div>
                </div>
              ) : (
                <select
                  value={effectiveMemberId || ""}
                  onChange={(e) => {
                    setSelectedMemberId(Number(e.target.value));
                    if (fieldErrors.member) setFieldErrors((prev) => ({ ...prev, member: "" }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden transition-colors min-h-[44px] cursor-pointer ${
                    fieldErrors.member
                      ? "border-red-500 ring-1 ring-red-500/20"
                      : "border-slate-200 dark:border-white/10 focus:border-emerald-500"
                  }`}
                >
                  {participants.length === 0 ? (
                    <option value="" disabled className="bg-white dark:bg-[#151619] text-slate-500">
                      Nenhum participante disponível
                    </option>
                  ) : (
                    participants.map((p) => (
                      <option
                        key={p.memberId}
                        value={p.memberId}
                        className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white"
                      >
                        {p.name} ({p.role === "INFLUENCER" ? "Influenciador / VIP" : "Aluno"})
                      </option>
                    ))
                  )}
                </select>
              )}
              {fieldErrors.member && (
                <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.member}</p>
              )}
            </div>

            {/* 2. TIPO DE DESTINO + CAMPO DINÂMICO ÚNICO */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                Tipo de Destino
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDestinationType("WHATSAPP");
                    setFieldErrors((prev) => ({ ...prev, url: "", phone: "" }));
                  }}
                  className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2 border ${
                    destinationType === "WHATSAPP"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/30"
                      : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366] shrink-0" />
                  <span className="truncate">WhatsApp (Atendimento / Fechamento)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDestinationType("CUSTOM_URL");
                    setFieldErrors((prev) => ({ ...prev, url: "", phone: "" }));
                  }}
                  className={`px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2 border ${
                    destinationType === "CUSTOM_URL"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs ring-1 ring-emerald-500/30"
                      : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Link2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">URL Externa / Checkout / Página</span>
                </button>
              </div>

              {/* CAMPO DINÂMICO ÚNICO (WHATSAPP OU URL) */}
              {destinationType === "WHATSAPP" ? (
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Número do WhatsApp de Atendimento
                  </label>
                  <input
                    type="tel"
                    value={whatsAppPhone}
                    onChange={(e) => {
                      setWhatsAppPhone(e.target.value);
                      if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    placeholder="Ex: (71) 99999-9999"
                    className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden transition-colors min-h-[44px] ${
                      fieldErrors.phone
                        ? "border-red-500 ring-1 ring-red-500/20"
                        : "border-slate-200 dark:border-white/10 focus:border-emerald-500"
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.phone}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    URL de Destino
                  </label>
                  <input
                    type="url"
                    value={destinationUrl}
                    onChange={(e) => {
                      setDestinationUrl(e.target.value);
                      if (fieldErrors.url) setFieldErrors((prev) => ({ ...prev, url: "" }));
                    }}
                    placeholder="https://pay.hotmart.com/... ou https://..."
                    className={`w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-white/5 border text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden transition-colors min-h-[44px] ${
                      fieldErrors.url
                        ? "border-red-500 ring-1 ring-red-500/20"
                        : "border-slate-200 dark:border-white/10 focus:border-emerald-500"
                    }`}
                  />
                  {fieldErrors.url && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.url}</p>
                  )}
                </div>
              )}
            </div>

            {/* 3. DESCONTO ANUNCIADO AO CLIENTE */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                Desconto Anunciado ao Cliente
              </label>

              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handlePresetDiscount("10")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                    !isCustomDiscount && announcedDiscountValue === "10" && announcedDiscountType === "PERCENTAGE"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 hover:border-emerald-500"
                  }`}
                >
                  10% OFF
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetDiscount("15")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                    !isCustomDiscount && announcedDiscountValue === "15" && announcedDiscountType === "PERCENTAGE"
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 hover:border-emerald-500"
                  }`}
                >
                  15% OFF
                </button>
                <div className="relative flex-1 min-w-[110px]">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={isCustomDiscount ? announcedDiscountValue : ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setIsCustomDiscount(true);
                      setAnnouncedDiscountType("PERCENTAGE");
                      setAnnouncedDiscountValue(val);
                    }}
                    placeholder="Outro"
                    className="w-full pl-3 pr-7 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:border-emerald-500 min-h-[40px]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-zinc-500 pointer-events-none select-none">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* 4. COMISSÃO DO PARTICIPANTE (DADO FINANCEIRO CRÍTICO - SEMPRE VISÍVEL) */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                Comissão do Participante
              </label>

              <div className="flex items-center gap-2">
                {/* TOGGLE TIPO DE COMISSÃO */}
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCommissionType("PERCENTAGE")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all min-h-[34px] ${
                      commissionType === "PERCENTAGE"
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommissionType("FIXED")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all min-h-[34px] ${
                      commissionType === "FIXED"
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    R$
                  </button>
                </div>

                {/* CAMPO DE VALOR COM ADORNO INTEGRADO DENTRO DO INPUT */}
                <div className="relative flex-1">
                  {commissionType === "FIXED" && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 dark:text-zinc-400 pointer-events-none select-none">
                      R$
                    </span>
                  )}
                  <input
                    type="number"
                    min="0"
                    max={commissionType === "PERCENTAGE" ? "100" : undefined}
                    step={commissionType === "PERCENTAGE" ? "0.5" : "1"}
                    value={commissionValue === 0 ? "" : commissionValue}
                    onChange={(e) => {
                      setCommissionValue(parseFloat(e.target.value) || 0);
                      if (fieldErrors.commission) setFieldErrors((prev) => ({ ...prev, commission: "" }));
                    }}
                    placeholder={commissionType === "PERCENTAGE" ? "10" : "50,00"}
                    className={`w-full py-2 rounded-xl bg-white dark:bg-white/5 border text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden min-h-[42px] transition-colors ${
                      commissionType === "FIXED" ? "pl-9 pr-3.5" : "pl-3.5 pr-8"
                    } ${
                      fieldErrors.commission
                        ? "border-red-500 ring-1 ring-red-500/20"
                        : "border-slate-200 dark:border-white/10 focus:border-emerald-500"
                    }`}
                  />
                  {commissionType === "PERCENTAGE" && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 dark:text-zinc-400 pointer-events-none select-none">
                      %
                    </span>
                  )}
                </div>
              </div>
              {fieldErrors.commission && (
                <p className="text-xs text-red-500 mt-1 font-medium">{fieldErrors.commission}</p>
              )}
            </div>

            {/* ==================================================================== */}
            {/* CAMADA 2: OPÇÕES AVANÇADAS (COLLAPSIBLE FECHADO POR PADRÃO)           */}
            {/* ==================================================================== */}
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-800 dark:text-zinc-200 hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors cursor-pointer min-h-[44px]"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Opções avançadas</span>
                  {hasAdvancedCustomizations && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400 font-normal">
                  <span>{showAdvanced ? "Ocultar" : "Mostrar"}</span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showAdvanced && (
                <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-white/10 space-y-4 animate-in fade-in duration-150">
                  {/* 1. TÍTULO DE DIVULGAÇÃO (DEFAULT AUTOMÁTICO SE VAZIO) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Título de Divulgação (opcional)
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={defaultTitle}
                      maxLength={191}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[40px]"
                    />
                  </div>

                  {/* 2. MENSAGEM AUTOMÁTICA DO WHATSAPP (SE DESTINO FOR WHATSAPP) */}
                  {destinationType === "WHATSAPP" && (
                    <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Mensagem Automática do Cliente
                        </label>
                        <button
                          type="button"
                          onClick={handleResetDefaultWhatsAppMessage}
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          Restaurar mensagem padrão
                        </button>
                      </div>
                      <textarea
                        value={activeWhatsAppMessage}
                        onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                        placeholder="Ex: Olá! Vim pela indicação..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 resize-y min-h-[68px]"
                      />

                      {/* PREVIEW DA URL FINAL */}
                      {computedWhatsAppUrl && (
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-[#25D366]" />
                            URL Gerada para Redirecionamento:
                          </span>
                          <p className="text-[11px] font-mono text-slate-700 dark:text-zinc-300 break-all select-all">
                            {computedWhatsAppUrl}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. CÓDIGO PERSONALIZADO (CUPOM / SLUG) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Código Personalizado (opcional)
                    </label>
                    <input
                      type="text"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                      placeholder="Ex: VIPANA10 (gerado automaticamente se vazio)"
                      maxLength={32}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono uppercase text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[40px]"
                    />
                  </div>

                  {/* 4. OBSERVAÇÕES INTERNAS */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Observações internas (opcional)
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Parceria exclusiva com influenciadora"
                      maxLength={255}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[40px]"
                    />
                  </div>

                  {/* 5. PLANOS OU OFERTAS ELEGÍVEIS */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Planos ou ofertas elegíveis (opcional)
                    </label>
                    <input
                      type="text"
                      value={eligiblePlans}
                      onChange={(e) => setEligiblePlans(e.target.value)}
                      placeholder="Ex: Válido para Planos Trimestrais e Semestrais"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[40px]"
                    />
                  </div>

                  {/* 6. CONDIÇÃO DA COMISSÃO */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Condição da comissão
                    </label>
                    <input
                      type="text"
                      value={commissionConditions}
                      onChange={(e) => setCommissionConditions(e.target.value)}
                      placeholder="Ex: Sobre a primeira mensalidade paga"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 transition-colors min-h-[40px]"
                    />
                  </div>

                  {/* 7. DATAS E LIMITES */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Início</label>
                      <input
                        type="date"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white min-h-[38px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Término</label>
                      <input
                        type="date"
                        value={endsAt}
                        onChange={(e) => setEndsAt(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white min-h-[38px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Limite de Usos</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Ilimitado"
                        value={maxUses}
                        onChange={(e) => setMaxUses(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white min-h-[38px]"
                      />
                    </div>
                  </div>

                  {/* 8. STATUS DO LINK */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">Status do Link</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: "ACTIVE", label: "Ativo" },
                          { id: "PAUSED", label: "Pausado" },
                          { id: "ENDED", label: "Encerrado" },
                        ] as const
                      ).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStatus(s.id)}
                          className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                            status === s.id
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 9. VÍNCULO COM MATERIAIS */}
                  {materials.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Artes e Materiais Vinculados
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                          {selectedMaterialIds.length} selecionado(s)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {materials.map((mat) => {
                          const isChecked = selectedMaterialIds.includes(mat.id);
                          return (
                            <button
                              key={mat.id}
                              type="button"
                              onClick={() => {
                                setSelectedMaterialIds((prev) =>
                                  isChecked ? prev.filter((id) => id !== mat.id) : [...prev, mat.id]
                                );
                              }}
                              className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                                isChecked
                                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300"
                                  : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:border-emerald-500"
                              }`}
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />
                              )}
                              <div className="truncate">
                                <span className="font-semibold block truncate text-slate-900 dark:text-white">{mat.title}</span>
                                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase">{mat.mediaFormat}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RODAPÉ STICKY COM BOTÃO DE AÇÃO (SEMPRE VISÍVEL) */}
          <div className="sticky bottom-0 shrink-0 bg-white/95 dark:bg-[#151619]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] flex items-center justify-end gap-2.5 z-10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 min-h-[44px] flex items-center justify-center gap-2"
            >
              {isSubmitting
                ? "Salvando..."
                : isEditing
                ? "Salvar Alterações"
                : "Criar Link"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
