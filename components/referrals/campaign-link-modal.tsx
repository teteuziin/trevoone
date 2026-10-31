"use client";

import React, { useState } from "react";
import { UserAvatar } from "@/components/account/user-avatar";
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
  const [destinationUrl, setDestinationUrl] = useState(initialData?.destinationUrl || "");
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



  if (!isOpen) return null;

  const selectedParticipant = participants.find((p) => p.memberId === selectedMemberId);

  // Quick preset helpers
  function handlePresetDiscount(val: string) {
    setAnnouncedDiscountType("PERCENTAGE");
    setAnnouncedDiscountValue(val);
    if (!title || title.startsWith("Meu desconto de ")) {
      setTitle(`Meu desconto de ${val}%`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Informe o título de divulgação.");
      return;
    }
    if (!destinationUrl.trim()) {
      setError("Cole a URL de destino da campanha.");
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
          destinationUrl,
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
          destinationUrl,
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
      setError("Ocorreu uma falha inesperada. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="w-full max-w-2xl bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
              {isEditing ? "Edição de Campanha" : "Cadastro Manual de Link"}
            </span>
            <h2 id="campaign-modal-title" className="text-xl font-bold text-[var(--text-primary)] mt-1">
              {isEditing ? `Editar: ${initialData?.title}` : "Novo Link de Divulgação"}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              O administrador controla manualmente o participante, o destino e as condições deste link.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-lg font-bold"
            aria-label="Fechar"
          >
            ✕
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
                  <option key={p.memberId} value={p.memberId}>
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

          {/* 2. TÍTULO E URL DE DESTINO (REGRA CENTRAL: COLADA MANUALMENTE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>Título de Divulgação <span className="text-rose-500">*</span></span>
                <span className="text-[10px] font-normal text-[var(--text-tertiary)]">Ex: Meu desconto de 10%</span>
              </label>
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

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>URL de Destino (Colada pelo Administrador) <span className="text-rose-500">*</span></span>
                <span className="text-[10px] font-normal text-[var(--text-tertiary)]">Checkout, WhatsApp ou página</span>
              </label>
              <input
                type="text"
                value={destinationUrl}
                onChange={(e) => setDestinationUrl(e.target.value)}
                placeholder="https://pay.hotmart.com/... ou https://wa.me/55... ou /consultoria/..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] transition-colors min-h-[44px]"
                required
              />
              <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed pt-0.5">
                O link de divulgação do Trevo One registrará o clique e encaminhará exatamente para este endereço.
              </p>
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>Código Personalizado (opcional)</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">Gerado auto se vazio</span>
              </label>
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

          {/* ALERTA: CHECKOUT EXTERNO & WHATSAPP */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <span>ℹ️</span> Informação importante sobre descontos externos:
            </span>
            <p>
              Caso a URL aponte para um <strong>checkout externo</strong> (Hotmart, Kiwify, Eduzz, etc.), o cupom/desconto deve estar previamente criado e aplicado naquele serviço. O Trevo One preserva o endereço colado e não altera preços externos sem integração específica. Se for <strong>WhatsApp</strong>, certifique-se de que a mensagem identifique a indicação para conferência manual da equipe.
            </p>
          </div>

          {/* 3. DESCONTO ANUNCIADO (CONFIGURAÇÃO INDEPENDENTE DA COMISSÃO) */}
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
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-[var(--text-primary)]">Status da Campanha</label>
            <div className="grid grid-cols-4 gap-2">
              {(["ACTIVE", "PAUSED", "DRAFT", "ENDED"] as CampaignLinkStatus[]).map((st) => {
                const labels: Record<CampaignLinkStatus, string> = {
                  ACTIVE: "Ativo",
                  PAUSED: "Pausado",
                  DRAFT: "Rascunho",
                  ENDED: "Encerrado",
                };
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold cursor-pointer transition-all min-h-[38px] ${
                      status === st
                        ? "bg-[var(--brand)] text-white shadow-xs"
                        : "bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {labels[st]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MATERIAIS RELACIONADOS (OPCIONAL) */}
          {materials.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>Materiais Relacionados a esta Campanha (Opcional)</span>
                <span className="text-[10px] font-normal text-[var(--text-tertiary)]">
                  {selectedMaterialIds.length} selecionado(s)
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                {materials.map((m) => {
                  const isChecked = selectedMaterialIds.includes(m.id);
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => {
                        if (isChecked) {
                          setSelectedMaterialIds(selectedMaterialIds.filter((id) => id !== m.id));
                        } else {
                          setSelectedMaterialIds([...selectedMaterialIds, m.id]);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                        isChecked
                          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-foreground)]"
                          : "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <span className="text-xs">{isChecked ? "☑" : "☐"}</span>
                      <div className="truncate">
                        <span className="text-xs font-semibold block truncate">{m.title}</span>
                        <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-mono">
                          {m.mediaFormat}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-[var(--brand)] hover:brightness-110 active:scale-98 text-white text-xs font-bold transition-all cursor-pointer shadow-xs min-h-[44px] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{isEditing ? "Salvar Alterações" : "Cadastrar Link"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
