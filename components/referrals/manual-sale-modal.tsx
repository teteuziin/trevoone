"use client";

import React, { useState, useMemo } from "react";
import { DollarSign, AlertCircle, CheckCircle2, X } from "@/components/referrals/referral-icons";
import type {
  EligiblePromotionParticipant,
  PromotionalCampaignLinkRecord,
} from "@/lib/referrals/campaigns";
import { registerManualSaleAction } from "@/app/consultoria/[slug]/indicacoes/actions";

interface ManualSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  participants: EligiblePromotionParticipant[];
  campaignLinks: PromotionalCampaignLinkRecord[];
  onSuccess: () => void;
}

export function ManualSaleModal({
  isOpen,
  onClose,
  consultancySlug,
  participants,
  campaignLinks,
  onSuccess,
}: ManualSaleModalProps) {
  const [referrerMemberId, setReferrerMemberId] = useState<number>(
    participants[0]?.memberId ?? 0
  );
  const [selectedLinkId, setSelectedLinkId] = useState<number>(0);
  const [buyerType, setBuyerType] = useState<"EXTERNAL" | "STUDENT">("EXTERNAL");
  const [buyerName, setBuyerName] = useState("");
  const [buyerStudentMemberId, setBuyerStudentMemberId] = useState<number>(0);
  const [externalReference, setExternalReference] = useState("");
  const [saleAmountStr, setSaleAmountStr] = useState("100.00");
  const [isCustomCommission, setIsCustomCommission] = useState(false);
  const [customCommissionStr, setCustomCommissionStr] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"APPROVED" | "PENDING">("APPROVED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available links for chosen participant
  const participantLinks = useMemo(() => {
    return campaignLinks.filter((l) => l.referrerMemberId === referrerMemberId);
  }, [campaignLinks, referrerMemberId]);

  // Selected link details
  const selectedLink = useMemo(() => {
    return participantLinks.find((l) => l.id === selectedLinkId);
  }, [participantLinks, selectedLinkId]);

  // Calculated preview commission
  const calculatedCommission = useMemo(() => {
    const saleVal = parseFloat(saleAmountStr.replace(",", ".")) || 0;
    if (saleVal <= 0) return 0;

    if (isCustomCommission) {
      return parseFloat(customCommissionStr.replace(",", ".")) || 0;
    }

    if (selectedLink) {
      if (selectedLink.commissionType === "PERCENTAGE" && selectedLink.commissionRateBasisPoints) {
        const rate = selectedLink.commissionRateBasisPoints / 10000;
        return Math.round(saleVal * rate * 100) / 100;
      }
      if (selectedLink.commissionType === "FIXED" && selectedLink.commissionAmountCents) {
        return Number(selectedLink.commissionAmountCents) / 100;
      }
    }

    // Default 10%
    return Math.round(saleVal * 0.1 * 100) / 100;
  }, [saleAmountStr, isCustomCommission, customCommissionStr, selectedLink]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const saleAmount = parseFloat(saleAmountStr.replace(",", "."));
    if (isNaN(saleAmount) || saleAmount <= 0) {
      setError("Informe um valor de venda válido e maior que zero.");
      return;
    }

    if (buyerType === "EXTERNAL" && !buyerName.trim()) {
      setError("Informe o nome do comprador externo.");
      return;
    }

    if (buyerType === "STUDENT" && !buyerStudentMemberId) {
      setError("Selecione o aluno comprador.");
      return;
    }

    let customCommissionAmount: number | null = null;
    if (isCustomCommission) {
      const parsedCustom = parseFloat(customCommissionStr.replace(",", "."));
      if (isNaN(parsedCustom) || parsedCustom < 0) {
        setError("Informe um valor de comissão customizada válido.");
        return;
      }
      customCommissionAmount = parsedCustom;
    }

    setIsSubmitting(true);
    try {
      const res = await registerManualSaleAction(consultancySlug, {
        referrerMemberId,
        campaignLinkId: selectedLinkId > 0 ? selectedLinkId : null,
        buyerStudentMemberId: buyerType === "STUDENT" && buyerStudentMemberId > 0 ? buyerStudentMemberId : null,
        buyerName: buyerType === "EXTERNAL" ? buyerName.trim() : null,
        saleAmount,
        customCommissionAmount,
        notes: notes.trim() || null,
        status,
        externalReference: externalReference.trim() || null,
      });

      if (!res.success) {
        setError(res.error || "Erro ao registrar venda manual.");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Falha ao registrar venda manual. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-sale-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
              Auditoria Financeira &amp; Conversão
            </span>
            <h2 id="manual-sale-modal-title" className="text-xl font-bold text-[var(--text-primary)] mt-1">
              Registrar Venda / Comissão Manual
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Lance conversões confirmadas vindas de checkouts externos (Kiwify, Hotmart, Eduzz ou WhatsApp).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-lg font-bold"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PARTICIPANTE INDICADOR */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">
              Parceiro Indicador (Quem recebe a comissão) <span className="text-rose-500">*</span>
            </label>
            <select
              value={referrerMemberId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setReferrerMemberId(id);
                setSelectedLinkId(0);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
              required
            >
              {participants.map((p) => (
                <option key={p.memberId} value={p.memberId}>
                  {p.name} ({p.role}) {p.hasPix ? "• PIX cadastrado" : "• Sem PIX"}
                </option>
              ))}
            </select>
          </div>

          {/* LINK UTILIZADO */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
              <span>Link de Indicação da Campanha</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">Opcional</span>
            </label>
            <select
              value={selectedLinkId}
              onChange={(e) => setSelectedLinkId(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
            >
              <option value={0}>Regra padrão da consultoria (Sem link específico)</option>
              {participantLinks.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title} (Código: {l.code} • {l.commissionValueFormatted})
                </option>
              ))}
            </select>
          </div>

          {/* TIPO DE COMPRADOR */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">Origem do Comprador</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBuyerType("EXTERNAL")}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer min-h-[44px] ${
                  buyerType === "EXTERNAL"
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-foreground)] font-bold shadow-xs"
                    : "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="text-xs block">Cliente Externo</span>
                <span className="text-[10px] text-[var(--text-tertiary)] block mt-0.5">Kiwify, Hotmart, Eduzz</span>
              </button>
              <button
                type="button"
                onClick={() => setBuyerType("STUDENT")}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer min-h-[44px] ${
                  buyerType === "STUDENT"
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-foreground)] font-bold shadow-xs"
                    : "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="text-xs block">Aluno Cadastrado</span>
                <span className="text-[10px] text-[var(--text-tertiary)] block mt-0.5">Membro da consultoria</span>
              </button>
            </div>
          </div>

          {buyerType === "EXTERNAL" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                Nome do Comprador Externo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Ex: Carlos Eduardo de Oliveira"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
                required
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                Selecione o Aluno <span className="text-rose-500">*</span>
              </label>
              <select
                value={buyerStudentMemberId}
                onChange={(e) => setBuyerStudentMemberId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
                required
              >
                <option value={0}>Selecione um aluno...</option>
                {participants
                  .filter((p) => p.memberId !== referrerMemberId)
                  .map((p) => (
                    <option key={p.memberId} value={p.memberId}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* VALOR DA VENDA E REFERÊNCIA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                Valor Total da Venda (R$) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-tertiary)]">
                  R$
                </span>
                <input
                  type="text"
                  value={saleAmountStr}
                  onChange={(e) => setSaleAmountStr(e.target.value)}
                  placeholder="100.00"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                <span>Código / Ref. do Checkout</span>
                <span className="text-[10px] text-[var(--text-tertiary)]">Evita duplicidade</span>
              </label>
              <input
                type="text"
                value={externalReference}
                onChange={(e) => setExternalReference(e.target.value)}
                placeholder="Ex: KW-981248 ou HP-20419"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
              />
            </div>
          </div>

          {/* RESUMO CALCULADO E COMISSÃO CUSTOMIZADA */}
          <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[var(--brand)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">Comissão Prevista</span>
              </div>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(calculatedCommission)}
              </span>
            </div>

            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={isCustomCommission}
                onChange={(e) => {
                  setIsCustomCommission(e.target.checked);
                  if (e.target.checked && !customCommissionStr) {
                    setCustomCommissionStr(String(calculatedCommission.toFixed(2)));
                  }
                }}
                className="rounded accent-[var(--brand)] w-4 h-4 cursor-pointer"
              />
              <span>Desejo fixar um valor customizado de comissão para esta venda</span>
            </label>

            {isCustomCommission && (
              <div className="pt-2">
                <input
                  type="text"
                  value={customCommissionStr}
                  onChange={(e) => setCustomCommissionStr(e.target.value)}
                  placeholder="Valor em R$ da comissão..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)]"
                />
              </div>
            )}
          </div>

          {/* STATUS INICIAL E OBSERVAÇÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">Status da Comissão</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "APPROVED" | "PENDING")}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
              >
                <option value="APPROVED">Aprovada (Pronta para pagamento via PIX)</option>
                <option value="PENDING">Pendente (Em análise de conciliação)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">Observações / Comprovante</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Pedido Kiwify aprovado no cartão..."
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
              />
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 min-h-[44px] flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar Venda &amp; Comissão</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
