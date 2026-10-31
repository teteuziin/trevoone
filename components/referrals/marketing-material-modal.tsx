"use client";

import React, { useState } from "react";
import type {
  MediaFormat,
  EligiblePromotionParticipant,
  PromotionalCampaignLinkRecord,
} from "@/lib/referrals/campaigns";
import { createMarketingMaterialAction } from "@/app/consultoria/[slug]/indicacoes/actions";

interface MarketingMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  participants: EligiblePromotionParticipant[];
  links: PromotionalCampaignLinkRecord[];
  onSuccess: () => void;
}

export function MarketingMaterialModal({
  isOpen,
  onClose,
  consultancySlug,
  participants,
  links,
  onSuccess,
}: MarketingMaterialModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFormat, setMediaFormat] = useState<MediaFormat>("STORY");
  const [fileUrl, setFileUrl] = useState("");
  const [suggestedCaption, setSuggestedCaption] = useState(
    "Garanta agora seu acesso exclusivo com desconto pelo meu link oficial! Vagas limitadas para novos alunos."
  );
  const [isGlobal, setIsGlobal] = useState(true);
  const [targetMemberId, setTargetMemberId] = useState<number>(0);
  const [campaignLinkId, setCampaignLinkId] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Informe o título do material.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createMarketingMaterialAction(consultancySlug, {
        title,
        description: description || null,
        mediaFormat,
        fileUrl: fileUrl || null,
        suggestedCaption: suggestedCaption || null,
        isGlobal,
        targetMemberId: !isGlobal && targetMemberId > 0 ? targetMemberId : null,
        campaignLinkId: campaignLinkId > 0 ? campaignLinkId : null,
      });

      if (!res.success) {
        setError(res.error || "Erro ao salvar material.");
        setIsSubmitting(false);
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Falha ao cadastrar material. Tente novamente.");
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
        aria-labelledby="material-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
              Marketing &amp; Divulgação
            </span>
            <h2 id="material-modal-title" className="text-xl font-bold text-[var(--text-primary)] mt-1">
              Novo Material de Divulgação
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Disponibilize artes oficiais, formatos Story/Feed e legendas prontas para seus parceiros.
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* FORMATO DA ARTE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">Formato do Material</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: "STORY", label: "Story (9:16)", hint: "Vertical" },
                  { id: "FEED", label: "Feed / Post (1:1)", hint: "Quadrado" },
                  { id: "BANNER", label: "Banner", hint: "Horizontal" },
                  { id: "VIDEO", label: "Vídeo", hint: "Reels / TikTok" },
                ] as const
              ).map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setMediaFormat(fmt.id)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer min-h-[44px] ${
                    mediaFormat === fmt.id
                      ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-foreground)] font-bold shadow-xs"
                      : "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="text-xs block">{fmt.label}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)] block mt-0.5">{fmt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TÍTULO E URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">
              Título do Material <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Arte Story Oficial - Cupom 10% OFF"
              maxLength={191}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
              required
            />
          </div>

          {/* DESCRIÇÃO OPCIONAL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">
              Orientações ou Detalhes (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Orientações de divulgação para o participante..."
              maxLength={255}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
              <span>URL da Imagem / Arquivo</span>
              <span className="text-[10px] font-normal text-[var(--text-tertiary)]">Link da imagem ou arquivo</span>
            </label>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://... ou caminho persistente"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
            />
            <p className="text-[10px] text-[var(--text-tertiary)]">
              Dica: você pode colar um link direto de imagem hospedada ou carregar via storage persistente do servidor.
            </p>
          </div>

          {/* LEGENDA SUGERIDA */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
              <span>Legenda Pronta Sugerida</span>
              <span className="text-[10px] font-normal text-[var(--text-tertiary)]">
                O participante poderá copiar com um toque
              </span>
            </label>
            <textarea
              rows={3}
              value={suggestedCaption}
              onChange={(e) => setSuggestedCaption(e.target.value)}
              placeholder="Texto pronto para o participante colar na publicação ou Story..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] resize-none"
            />
          </div>

          {/* DISPONIBILIDADE: TODOS OU INDIVIDUAL */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
            <span className="text-xs font-bold text-[var(--text-primary)] block">Disponibilidade</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-primary)] font-medium">
                <input
                  type="radio"
                  name="materialScope"
                  checked={isGlobal}
                  onChange={() => setIsGlobal(true)}
                  className="accent-[var(--brand)]"
                />
                <span>Disponível para todos os participantes autorizados</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[var(--text-primary)] font-medium">
                <input
                  type="radio"
                  name="materialScope"
                  checked={!isGlobal}
                  onChange={() => setIsGlobal(false)}
                  className="accent-[var(--brand)]"
                />
                <span>Apenas para pessoa selecionada</span>
              </label>
            </div>

            {!isGlobal && (
              <div className="pt-2">
                <select
                  value={targetMemberId}
                  onChange={(e) => setTargetMemberId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[40px]"
                >
                  <option value={0}>Selecione o participante...</option>
                  {participants.map((p) => (
                    <option key={p.memberId} value={p.memberId}>
                      {p.name} ({p.role === "INFLUENCER" ? "Influenciador / VIP" : "Aluno"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* VINCULAÇÃO A LINK ESPECÍFICO (OPCIONAL) */}
          {links.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                Vincular a um Link Específico (Opcional)
              </label>
              <select
                value={campaignLinkId}
                onChange={(e) => setCampaignLinkId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] min-h-[40px]"
              >
                <option value={0}>Geral (não restrito a um único link)</option>
                {links.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} (Código: {l.code} · {l.referrerName})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* FOOTER */}
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
                <span>Cadastrar Material</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
