"use client";

import React, { useState, useRef, useTransition } from "react";
import Link from "next/link";
import {
  FOLLOWUP_MEAL_TYPES,
  FOLLOWUP_MEAL_TYPE_LABELS,
  type FollowupMealType,
} from "@/lib/nutrition-v2/followup-types";
import {
  recordStudentFoodPhotoAction,
  recordStudentPatientNoteAction,
} from "@/app/consultoria/[slug]/nutricao/acompanhamento-actions";

interface StudentFollowupModalProps {
  consultancySlug: string;
  pendingCheckinRequestPublicId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StudentFollowupModal({
  consultancySlug,
  pendingCheckinRequestPublicId,
  isOpen,
  onClose,
  onSuccess,
}: StudentFollowupModalProps) {
  const [activeTab, setActiveTab] = useState<"PHOTO" | "NOTE">("PHOTO");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Photo form states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<FollowupMealType | "">("");
  const [photoCaption, setPhotoCaption] = useState("");

  // Note form states
  const [noteText, setNoteText] = useState("");

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setErrorMsg(null);
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("Selecione uma imagem válida (JPG, PNG ou WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("A foto deve ter no máximo 5 MB.");
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  function handleClearFile() {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handlePhotoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Por favor, selecione ou tire uma foto da refeição.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.append("photo", selectedFile);
      if (selectedMealType) {
        formData.append("mealType", selectedMealType);
      }
      if (photoCaption.trim()) {
        formData.append("caption", photoCaption.trim());
      }

      const res = await recordStudentFoodPhotoAction(consultancySlug, formData);
      if (res.success) {
        setSuccessMsg("Foto registrada com sucesso!");
        setTimeout(() => {
          handleClearFile();
          setPhotoCaption("");
          setSelectedMealType("");
          setSuccessMsg(null);
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || "Erro ao registrar foto.");
      }
    });
  }

  async function handleNoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) {
      setErrorMsg("Por favor, escreva sua observação.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await recordStudentPatientNoteAction(consultancySlug, {
        caption: noteText.trim(),
      });
      if (res.success) {
        setSuccessMsg("Observação salva com sucesso!");
        setTimeout(() => {
          setNoteText("");
          setSuccessMsg(null);
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || "Erro ao salvar observação.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
              Registrar Acompanhamento
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Envie fotos ou anotações para sua nutricionista.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-lg font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Pending Check-in Callout Banner */}
        {pendingCheckinRequestPublicId && (
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-lg">📬</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate">
                  Check-in pendente solicitado!
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400">
                  Responda sua avaliação periódica.
                </p>
              </div>
            </div>
            <Link
              href={`/consultoria/${consultancySlug}/nutricao/checkin/${pendingCheckinRequestPublicId}`}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-[var(--text-inverse)] text-xs font-bold shrink-0 min-h-[38px] flex items-center justify-center transition-colors"
            >
              Responder →
            </Link>
          </div>
        )}

        {/* Navigation Selector: Foto vs Observação */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("PHOTO");
              setErrorMsg(null);
            }}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "PHOTO"
                ? "bg-[var(--surface)] text-[var(--brand)] shadow-xs border border-[var(--border-default)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>📷</span>
            <span>Foto da refeição</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("NOTE");
              setErrorMsg(null);
            }}
            className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "NOTE"
                ? "bg-[var(--surface)] text-[var(--brand)] shadow-xs border border-[var(--border-default)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>📝</span>
            <span>Anotação</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
            <span>✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: FOTO DA REFEIÇÃO */}
        {activeTab === "PHOTO" && (
          <form onSubmit={handlePhotoSubmit} className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {!previewUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border-default)] hover:border-[var(--brand)] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[var(--surface-subtle)] space-y-2 flex flex-col items-center justify-center min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center text-2xl">
                  📷
                </div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  Toque para tirar ou escolher foto
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  JPG, PNG ou WEBP até 5 MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border border-[var(--border-default)] max-h-56 bg-black/20 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Pré-visualização"
                    className="max-h-56 w-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white text-xs hover:bg-black/80 cursor-pointer"
                    title="Remover foto"
                  >
                    ✕
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-[var(--brand)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>🔄</span>
                  <span>Trocar foto</span>
                </button>
              </div>
            )}

            {/* Tipo de Refeição (Opcional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)] block">
                Tipo de refeição (opcional):
              </label>
              <select
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value as FollowupMealType | "")}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 min-h-[44px]"
              >
                <option value="">Não especificado</option>
                {FOLLOWUP_MEAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {FOLLOWUP_MEAL_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo Opcional: O que você comeu? */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)] block">
                O que você comeu? (opcional):
              </label>
              <input
                type="text"
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="Ex.: Arroz integral, frango grelhado e salada"
                maxLength={500}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 min-h-[44px]"
              />
            </div>

            {/* Botões de Ação */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] transition-all cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || !selectedFile}
                className="px-5 py-2.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-inverse)] text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs min-h-[44px]"
              >
                {isPending ? "Enviando foto..." : "Enviar foto"}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: ANOTAÇÃO */}
        {activeTab === "NOTE" && (
          <form onSubmit={handleNoteSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)] block">
                Sua anotação ou dúvida:
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ex.: Hoje senti muita fome após o almoço ou tive dificuldade com a hidratação..."
                rows={4}
                maxLength={2000}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 resize-none"
              />
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Essa observação ficará disponível no seu prontuário para a nutricionista.
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] transition-all cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || !noteText.trim()}
                className="px-5 py-2.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-inverse)] text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs min-h-[44px]"
              >
                {isPending ? "Salvando..." : "Salvar anotação"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
