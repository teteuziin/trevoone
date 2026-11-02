"use client";

import React, { useState, useRef } from "react";
import { Upload, X, CheckCircle2, AlertCircle } from "@/components/referrals/referral-icons";
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
  links?: PromotionalCampaignLinkRecord[];
  onSuccess: () => void;
}

export function MarketingMaterialModal({
  isOpen,
  onClose,
  consultancySlug,
  participants,
  onSuccess,
}: MarketingMaterialModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFormat, setMediaFormat] = useState<MediaFormat>("STORY");
  const [uploadMode, setUploadMode] = useState<"FILE" | "URL">("FILE");
  const [fileUrl, setFileUrl] = useState("");
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [suggestedCaption, setSuggestedCaption] = useState(
    "Garanta agora seu acesso exclusivo com desconto pelo meu link oficial! Vagas limitadas para novos alunos."
  );
  const [isGlobal, setIsGlobal] = useState(true);
  const [targetMemberId, setTargetMemberId] = useState<number>(participants[0]?.memberId ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/consultancies/${consultancySlug}/marketing-materials/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Falha ao enviar arquivo.");
        return;
      }

      setFileUrl(data.fileUrl);
      setStorageKey(data.storageKey);
      setFileSizeBytes(data.fileSizeBytes);
      setMimeType(data.mimeType);
      setUploadedFileName(data.originalFileName || file.name);

      if (!title) {
        setTitle(data.originalFileName ? data.originalFileName.replace(/\.[^/.]+$/, "") : "Material de Divulgação");
      }
    } catch {
      setError("Erro de rede ao fazer upload do arquivo.");
    } finally {
      setIsUploadingFile(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Informe o título do material.");
      return;
    }

    if (!isGlobal && (!targetMemberId || targetMemberId <= 0)) {
      setError("Selecione o participante individual exclusivo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createMarketingMaterialAction(consultancySlug, {
        title: title.trim(),
        description: description.trim() || null,
        mediaFormat,
        fileUrl: fileUrl.trim() || null,
        storageKey: storageKey || null,
        fileSizeBytes: fileSizeBytes || null,
        mimeType: mimeType || null,
        suggestedCaption: suggestedCaption.trim() || null,
        isGlobal,
        targetMemberId: !isGlobal && targetMemberId > 0 ? targetMemberId : null,
        campaignLinkId: null,
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
              Disponibilize artes oficiais, fotos, vídeos e legendas prontas para seus parceiros.
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
          {/* ESCOPO: GERAL OU INDIVIDUAL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">Disponibilidade do Material</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsGlobal(true)}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer min-h-[44px] ${
                  isGlobal
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-foreground)] font-bold shadow-xs"
                    : "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="text-xs block">Para Todos os Parceiros</span>
                <span className="text-[10px] text-[var(--text-tertiary)] block mt-0.5">Material de campanha geral</span>
              </button>
              <button
                type="button"
                onClick={() => setIsGlobal(false)}
                className={`p-3 rounded-2xl border text-center transition-all cursor-pointer min-h-[44px] ${
                  !isGlobal
                    ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-foreground)] font-bold shadow-xs"
                    : "border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="text-xs block">Individual / Exclusivo</span>
                <span className="text-[10px] text-[var(--text-tertiary)] block mt-0.5">Exclusivo de um VIP</span>
              </button>
            </div>
          </div>

          {!isGlobal && (
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)]">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                Participante Exclusivo <span className="text-rose-500">*</span>
              </label>
              <select
                value={targetMemberId}
                onChange={(e) => setTargetMemberId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] font-medium focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
                required
              >
                {participants.map((p) => (
                  <option key={p.memberId} value={p.memberId}>
                    {p.name} ({p.role})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                Apenas este participante verá este material em sua galeria com o selo &quot;Exclusivo para você&quot;.
              </p>
            </div>
          )}

          {/* FORMATO DA ARTE */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">Formato do Material</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: "STORY", label: "Story (9:16)", hint: "Vertical" },
                  { id: "FEED", label: "Feed / Post", hint: "Quadrado" },
                  { id: "BANNER", label: "Banner", hint: "Horizontal" },
                  { id: "VIDEO", label: "Vídeo", hint: "Reels / Shorts" },
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

          {/* TÍTULO E DETALHES */}
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

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)]">
              Instruções de Uso (opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Postar nos Stories marcando o link na figurinha..."
              maxLength={255}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
            />
          </div>

          {/* ARQUIVO / UPLOAD */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text-primary)]">Mídia / Arquivo</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUploadMode("FILE")}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    uploadMode === "FILE"
                      ? "bg-[var(--brand)] text-white"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                  }`}
                >
                  Upload de Arquivo
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("URL")}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    uploadMode === "URL"
                      ? "bg-[var(--brand)] text-white"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                  }`}
                >
                  Link Externo
                </button>
              </div>
            </div>

            {uploadMode === "FILE" ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[var(--border-default)] hover:border-[var(--brand)] rounded-2xl p-5 text-center cursor-pointer transition-colors bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)]"
                >
                  {isUploadingFile ? (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-[var(--brand)]">Enviando arquivo...</div>
                      <p className="text-[10px] text-[var(--text-tertiary)]">Aguarde a validação no servidor</p>
                    </div>
                  ) : uploadedFileName ? (
                    <div className="space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                      <div className="text-xs font-bold text-[var(--text-primary)]">{uploadedFileName}</div>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Arquivo carregado e armazenado com sucesso! Clique para substituir.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-6 h-6 text-[var(--text-tertiary)] mx-auto" />
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        Clique para enviar imagem, vídeo ou PDF
                      </div>
                      <p className="text-[10px] text-[var(--text-tertiary)]">
                        JPG, PNG, WEBP, MP4, WEBM ou PDF (máx. 25 MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://... (URL pública de imagem, vídeo ou Drive)"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-mono text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] min-h-[44px]"
                />
              </div>
            )}
          </div>

          {/* LEGENDA SUGERIDA */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
              <span>Legenda Pronta (&quot;Copy&quot;)</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">O parceiro copia com 1 clique</span>
            </label>
            <textarea
              rows={3}
              value={suggestedCaption}
              onChange={(e) => setSuggestedCaption(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] focus:outline-hidden focus:border-[var(--brand)] resize-none"
            />
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isUploadingFile}
              className="px-4 py-2.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingFile}
              className="px-6 py-2.5 rounded-2xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 min-h-[44px] flex items-center gap-2"
            >
              {isSubmitting ? "Salvando..." : "Salvar Material"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
