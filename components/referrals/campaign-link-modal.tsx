"use client";

import React, { useState, useMemo } from "react";
import { X, Info, CheckSquare, Square, MessageCircle, Link2 } from "@/components/referrals/referral-icons";
import { UserAvatar } from "@/components/account/user-avatar";
import { buildWhatsAppUrl, isWhatsAppUrl } from "@/lib/referrals/url-utils";
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

  const [selectedMemberId, setSelectedMemberId] = useState<number>(
    initialData?.referrerMemberId || defaultParticipantId || (participants[0]?.memberId ?? 0)
  );
  const [title, setTitle] = useState(initialData?.title || "");

  // Destination Type: WHATSAPP vs CUSTOM_URL
  const existingWa = initialData?.destinationUrl ? parseExistingWhatsAppUrl(initialData.destinationUrl) : null;
  const initialIsWa = Boolean(existingWa || (initialData?.destinationUrl && isWhatsAppUrl(initialData.destinationUrl)));

  const [destinationType, setDestinationType] = useState<"WHATSAPP" | "CUSTOM_URL">(
    initialIsWa || !initialData ? "WHATSAPP" : "CUSTOM_URL"
  );
  const [destinationUrl, setDestinationUrl] = useState(initialData?.destinationUrl || "");
  const [whatsAppPhone, setWhatsAppPhone] = useState(existingWa?.phone || "");
  const [customWhatsAppMessage, setCustomWhatsAppMessage] = useState<string | null>(
    existingWa?.message ?? null
  );

  const [description, setDescription] = useState(initialData?.description || "");
  const [customCode, setCustomCode] = useState(initialData?.code || "");
  const [announcedDiscountType, setAnnouncedDiscountType] = useState<AnnouncedDiscountType>(
    initialData?.announcedDiscountType || "PERCENTAGE"
  );
  const [announcedDiscountValue, setAnnouncedDiscountValue] = useState(
    initialData?.announcedDiscountValue || "10"
  );
  const [eligiblePlans, setEligiblePlans] = useState(initialData?.eligiblePlans || "");
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

  const selectedParticipant = participants.find((p) => p.memberId === selectedMemberId);

  // Dynamic default template based on selected participant, code, and discount
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

  // Quick preset helpers
  function handlePresetDiscount(val: string) {
    setAnnouncedDiscountType("PERCENTAGE");
    setAnnouncedDiscountValue(val);
    if (!title || title.startsWith("Meu desconto de ")) {
      setTitle(`Meu desconto de ${val}%`);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Informe o título de divulgação.");
      return;
    }

    let finalDestinationUrl = destinationUrl.trim();
    if (destinationType === "WHATSAPP") {
      const cleanPhone = whatsAppPhone.replace(/\D/g, "");
      if (cleanPhone.length < 10) {
        setError("Informe um número de WhatsApp válido com DDD (mínimo 10 dígitos).");
        return;
      }
      finalDestinationUrl = buildWhatsAppUrl(whatsAppPhone, activeWhatsAppMessage);
    }

    if (!finalDestinationUrl) {
      setError("Informe a URL ou número de destino da campanha.");
      return;
    }

    if (!selectedMemberId) {
      setError("Selecione o participante responsável.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditing && initialData) {
        const res = await updateCampaignLinkAction(consultancySlug, {
          linkId: initialData.id,
          title,
          destinationUrl: finalDestinationUrl,
          description,
          announcedDiscountType,
          announcedDiscountValue,
          eligiblePlans,
          commissionType,
          commissionValue: Number(commissionValue),
          commissionConditions,
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
          referrerMemberId: selectedMemberId,
          title,
          destinationUrl: finalDestinationUrl,
          description,
          code: customCode || null,
          announcedDiscountType,
          announcedDiscountValue,
          eligiblePlans,
          commissionType,
          commissionValue: Number(commissionValue),
          commissionConditions,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-modal-title"
      >
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
              {isEditing ? "Edição de Campanha" : "Nova Campanha de Divulgação"}
            </span>
            <h2 id="campaign-modal-title" className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
              {isEditing ? `Editar Link /r/${initialData?.code}` : "Criar Link Individual de Divulgação"}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5 leading-relaxed">
              Direcione para o WhatsApp ou para checkout externo, definindo cupom do cliente e comissão do parceiro.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. SELEÇÃO DE PARTICIPANTE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <span>Participante Responsável</span>
              <span className="text-rose-500">*</span>
            </label>
            {isEditing ? (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                <UserAvatar
                  fullName={initialData?.referrerName}
                  userPublicId={initialData?.referrerUserPublicId}
                  size="sm"
                />
                <div>
                  <span className="text-xs font-bold text-[var(--text-primary)] block">
                    {initialData?.referrerName}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold">
                    {initialData?.referrerRole === "INFLUENCER" ? "Influenciador / VIP" : "Aluno"}
                  </span>
                </div>
              </div>
            ) : (
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--brand)] transition-colors min-h-[44px]"
                required
              >
                {participants.map((p) => (
                  <option key={p.memberId} value={p.memberId} className="bg-white dark:bg-[#151619] text-slate-900 dark:text-white">
                    {p.name} ({p.role === "INFLUENCER" ? "Influenciador / VIP" : "Aluno"})
                  </option>
                ))}
              </select>
            )}
            {selectedParticipant && !isEditing && (
              <div className="flex items-center gap-2 pt-1 text-[11px] text-[var(--text-tertiary)]">
                <span>Participante selecionado:</span>
                <span className="font-semibold text-[var(--text-primary)]">{selectedParticipant.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-default)]">
                  {selectedParticipant.totalCampaignLinks} link(s) cadastrado(s)
                </span>
              </div>
            )}
          </div>

          {/* 2. TÍTULO E TIPO DE DESTINO (WHATSAPP vs URL EXTERNA) */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Título de Divulgação <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-normal text-[var(--text-tertiary)]">Ex: Meu desconto de 10%</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Treino com Desconto de 10%"
                maxLength={191}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--brand)] transition-colors min-h-[44px]"
                required
              />
            </div>

            {/* SELETOR DE TIPO DE DESTINO */}
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Tipo de Destino do Link <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-[var(--text-tertiary)]">Onde o cliente cairá</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDestinationType("WHATSAPP")}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] flex items-center justify-center gap-2 border ${
                    destinationType === "WHATSAPP"
                      ? "bg-[#25D366]/15 border-[#25D366]/50 text-emerald-700 dark:text-[#25D366] shadow-xs"
                      : "bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand)]"
                  }`}
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>WhatsApp (Atendimento / Fechamento)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDestinationType("CUSTOM_URL")}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[42px] flex items-center justify-center gap-2 border ${
                    destinationType === "CUSTOM_URL"
                      ? "bg-[var(--brand)] border-[var(--brand)] text-white shadow-xs"
                      : "bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--brand)]"
                  }`}
                >
                  <Link2 className="w-4 h-4" />
                  <span>URL Externa / Checkout / Página</span>
                </button>
              </div>

              {destinationType === "WHATSAPP" ? (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-[var(--text-primary)]">
                        Número do WhatsApp de Atendimento (DDD + Número) <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-[var(--text-tertiary)]">DDI 55 prefixado se omitido</span>
                    </div>
                    <input
                      type="text"
                      value={whatsAppPhone}
                      onChange={(e) => setWhatsAppPhone(e.target.value)}
                      placeholder="Ex: (71) 99999-9999 ou 5571999999999"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-mono focus:outline-hidden focus:border-[var(--brand)] min-h-[42px]"
                      required={destinationType === "WHATSAPP"}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-[var(--text-primary)]">
                        Mensagem Automática do Cliente (editável)
                      </label>
                      <button
                        type="button"
                        onClick={handleResetDefaultWhatsAppMessage}
                        className="text-[10px] text-[var(--brand)] hover:underline cursor-pointer"
                      >
                        Restaurar mensagem padrão
                      </button>
                    </div>
                    <textarea
                      value={activeWhatsAppMessage}
                      onChange={(e) => setCustomWhatsAppMessage(e.target.value)}
                      placeholder="Ex: Olá! Vim pela indicação..."
                      rows={3}
                      className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] resize-y min-h-[72px]"
                    />
                  </div>

                  {/* PREVIEW DA URL FINAL */}
                  {computedWhatsAppUrl && (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] flex items-center gap-1">
                        <MessageCircle className="w-3 h-3 text-[#25D366]" />
                        URL Gerada para Redirecionamento:
                      </span>
                      <p className="text-[11px] font-mono text-[var(--text-secondary)] break-all select-all">
                        {computedWhatsAppUrl}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">
                      Endereço Completo (URL de Destino) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-[var(--text-tertiary)]">Checkout, Hotmart ou página</span>
                  </div>
                  <input
                    type="text"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="https://pay.hotmart.com/... ou https://wa.me/55..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[42px]"
                    required={destinationType === "CUSTOM_URL"}
                  />
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Dica: Se colar um link wa.me ou número de telefone diretamente, o sistema também reconhece e valida.
                  </p>
                </div>
              )}
            </div>

            {/* CÓDIGO PERSONALIZADO E OBSERVAÇÕES */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    Código Personalizado (opcional)
                  </label>
                  <span className="text-[10px] text-[var(--text-tertiary)] font-normal whitespace-nowrap">
                    Gerado auto se vazio
                  </span>
                </div>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="Ex: VIPANA10"
                  maxLength={32}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-mono uppercase text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] transition-colors min-h-[44px]"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  Observações internas (opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Parceria exclusiva com influenciadora"
                  maxLength={255}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] transition-colors min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* ALERTA INFORMATIVO */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-amber-500 shrink-0" /> Informação importante sobre direcionamentos:
            </span>
            <p>
              Caso aponte para o <strong>WhatsApp</strong>, a mensagem automática identificará a indicação e o cupom para fechamento direto pela sua equipe. Se for para <strong>checkout externo</strong> (Hotmart, Kiwify, etc.), certifique-se de que o cupom anunciado esteja ativo na plataforma de destino.
            </p>
          </div>

          {/* 3. DESCONTO ANUNCIADO */}
          <div className="space-y-2 p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Desconto Anunciado ao Cliente
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">Configuração da oferta</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handlePresetDiscount("10")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                  announcedDiscountValue === "10" && announcedDiscountType === "PERCENTAGE"
                    ? "bg-[var(--brand)] text-white shadow-xs"
                    : "bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--brand)]"
                }`}
              >
                10% OFF
              </button>
              <button
                type="button"
                onClick={() => handlePresetDiscount("15")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
                  announcedDiscountValue === "15" && announcedDiscountType === "PERCENTAGE"
                    ? "bg-[var(--brand)] text-white shadow-xs"
                    : "bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--brand)]"
                }`}
              >
                15% OFF
              </button>
              <div className="flex-1 flex items-center gap-2 min-w-[160px]">
                <input
                  type="text"
                  value={announcedDiscountValue}
                  onChange={(e) => setAnnouncedDiscountValue(e.target.value)}
                  placeholder="Outro percentual ou valor (ex: 20%)"
                  className="w-full px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--brand)] min-h-[36px]"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)] block mb-1">
                Planos ou ofertas elegíveis (opcional)
              </label>
              <input
                type="text"
                value={eligiblePlans}
                onChange={(e) => setEligiblePlans(e.target.value)}
                placeholder="Ex: Válido para Planos Trimestrais e Semestrais"
                className="w-full px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--brand)] min-h-[36px]"
              />
            </div>
          </div>

          {/* 4. CONDIÇÕES E VALOR DA COMISSÃO DO PARTICIPANTE */}
          <div className="space-y-3 p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Comissão do Participante (Separada do Desconto)
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">Remuneração do parceiro</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Tipo de Comissão</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCommissionType("PERCENTAGE")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all min-h-[40px] ${
                      commissionType === "PERCENTAGE"
                        ? "bg-[var(--brand)] text-white shadow-xs"
                        : "bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-primary)]"
                    }`}
                  >
                    Percentual (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommissionType("FIXED")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all min-h-[40px] ${
                      commissionType === "FIXED"
                        ? "bg-[var(--brand)] text-white shadow-xs"
                        : "bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-primary)]"
                    }`}
                  >
                    Valor Fixo (R$)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  {commissionType === "PERCENTAGE" ? "Taxa da Comissão (%)" : "Valor por Matrícula (R$)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={commissionType === "PERCENTAGE" ? "100" : undefined}
                  step={commissionType === "PERCENTAGE" ? "0.1" : "1"}
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-bold focus:outline-hidden focus:border-[var(--brand)] min-h-[40px]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Base de cálculo e condições da comissão
              </label>
              <input
                type="text"
                value={commissionConditions}
                onChange={(e) => setCommissionConditions(e.target.value)}
                placeholder="Ex: Sobre a primeira mensalidade paga com sucesso"
                className="w-full px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--brand)] min-h-[36px]"
              />
            </div>
          </div>

          {/* 5. DATAS, LIMITES E STATUS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Início (Opcional)</label>
              <input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[40px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Término (Opcional)</label>
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[40px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Limite de Usos (Opcional)</label>
              <input
                type="number"
                min="1"
                placeholder="Sem limite"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[40px]"
              />
            </div>
          </div>

          {/* STATUS */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Status do Link</label>
            <div className="flex items-center gap-2">
              {(
                [
                  { id: "ACTIVE", label: "Ativo (Divulgável)" },
                  { id: "PAUSED", label: "Pausado (Temporário)" },
                  { id: "ENDED", label: "Encerrado" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[40px] flex-1 ${
                    status === s.id
                      ? "bg-[var(--brand)] text-white shadow-xs"
                      : "bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-secondary)]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. VÍNCULO COM MATERIAIS */}
          {materials.length > 0 && (
            <div className="space-y-2 p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Artes e Materiais Vinculados (Opcional)
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {selectedMaterialIds.length} selecionado(s)
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Selecione as artes que ficarão visíveis para este parceiro ao visualizar este link.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto">
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
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                        isChecked
                          ? "bg-[var(--brand-soft)] border-[var(--brand)] text-[var(--text-primary)]"
                          : "bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--brand)]"
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-[var(--brand)] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-semibold block truncate text-[var(--text-primary)]">{mat.title}</span>
                        <span className="text-[10px] text-[var(--text-tertiary)] uppercase">{mat.mediaFormat}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* BOTÕES DE AÇÃO */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-2xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {isSubmitting
                ? "Salvando..."
                : isEditing
                ? "Salvar Alterações"
                : "Criar Link de Divulgação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
