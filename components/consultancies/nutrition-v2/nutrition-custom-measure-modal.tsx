"use client";

import React, { useState, useRef } from "react";
import {
  createCustomMeasureAction,
  checkMeasureNameSimilarityAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";

export interface FoodPortionOption {
  publicId: string;
  label: string;
  equivalentReferenceAmount: number;
  scope?: "GLOBAL" | "CONSULTANCY" | "PERSONAL";
  notes?: string | null;
}

interface NutritionCustomMeasureModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  foodPublicId: string;
  foodName: string;
  foodReferenceUnit?: string;
  existingPortions?: FoodPortionOption[];
  onMeasureCreated: (newPortion: FoodPortionOption) => void;
}

export function NutritionCustomMeasureModal(props: NutritionCustomMeasureModalProps) {
  if (!props.isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-custom-measure-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <NutritionCustomMeasureForm {...props} />
    </div>
  );
}

function NutritionCustomMeasureForm({
  onClose,
  slug,
  foodPublicId,
  foodName,
  foodReferenceUnit = "G",
  existingPortions = [],
  onMeasureCreated,
}: NutritionCustomMeasureModalProps) {
  const [label, setLabel] = useState("");
  const [weightStr, setWeightStr] = useState("");
  const [notes, setNotes] = useState("");
  const [scope, setScope] = useState<"PERSONAL" | "CONSULTANCY">("PERSONAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [similarMatch, setSimilarMatch] = useState<{
    label: string;
    equivalentReferenceAmount: number;
    scope: string;
  } | null>(null);

  const debounceCheckRef = useRef<NodeJS.Timeout | null>(null);
  const isUnitVolume = foodReferenceUnit.trim().toUpperCase() === "ML" || foodReferenceUnit.trim().toUpperCase() === "L";
  const unitName = isUnitVolume ? "mililitros (ml)" : "gramas (g)";
  const unitShort = isUnitVolume ? "ml" : "g";

  // Check similarity as user types name
  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel);
    setErrorMessage(null);

    if (debounceCheckRef.current) clearTimeout(debounceCheckRef.current);

    const trimmed = newLabel.trim();
    if (trimmed.length < 3) {
      setSimilarMatch(null);
      return;
    }

    // Fast local similarity check against existing portions
    const normInput = trimmed
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .trim();

    const localMatch = existingPortions.find((p) => {
      const normP = p.label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .trim();
      return normInput === normP || (normInput.length >= 4 && (normP.includes(normInput) || normInput.includes(normP)));
    });

    if (localMatch) {
      setSimilarMatch({
        label: localMatch.label,
        equivalentReferenceAmount: localMatch.equivalentReferenceAmount,
        scope: localMatch.scope || "GLOBAL",
      });
      return;
    }

    // Server check debounce
    debounceCheckRef.current = setTimeout(async () => {
      try {
        const res = await checkMeasureNameSimilarityAction(slug, foodPublicId, trimmed);
        if (res.success && res.data?.exists && res.data.similar) {
          setSimilarMatch(res.data.similar);
        } else {
          setSimilarMatch(null);
        }
      } catch {
        setSimilarMatch(null);
      }
    }, 400);
  };

  const handleUseExisting = (matched: { label: string; equivalentReferenceAmount: number }) => {
    const existing = existingPortions.find(
      (p) => p.label.trim().toLowerCase() === matched.label.trim().toLowerCase()
    );
    if (existing) {
      onMeasureCreated(existing);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setErrorMessage("Informe o nome da medida.");
      return;
    }

    const parsedWeight = parseFloat(weightStr.replace(",", "."));
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      setErrorMessage(`Informe um peso válido maior que zero (em ${unitShort}).`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createCustomMeasureAction(slug, foodPublicId, {
        label: trimmedLabel,
        equivalentReferenceAmount: parsedWeight,
        notes: notes.trim() || null,
        scope,
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Não foi possível cadastrar a medida.");
        setIsSubmitting(false);
        return;
      }

      const created: FoodPortionOption = {
        publicId: res.data.publicId,
        label: res.data.label,
        equivalentReferenceAmount: res.data.equivalentReferenceAmount,
        scope: res.data.scope as "PERSONAL" | "CONSULTANCY" | "GLOBAL",
        notes: res.data.notes,
      };

      onMeasureCreated(created);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erro ao cadastrar medida.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface-primary)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-subtle)]">
        <div>
          <h2 id="modal-custom-measure-title" className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            Cadastrar medida caseira
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate max-w-sm sm:max-w-md">
            Alimento: <span className="font-semibold text-[var(--text-primary)]">{foodName}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
          title="Fechar"
          aria-label="Fechar modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Nome da Medida */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[var(--text-primary)]">
            Nome da medida <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            autoFocus
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Ex: Colher de sopa rasa, Fatia média, Pedaço pequeno"
            maxLength={100}
            className="w-full px-3 py-2.5 text-base sm:text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] transition-colors min-h-[44px]"
          />
          <p className="text-[11px] text-[var(--text-muted)]">
            Use nomes específicos como &quot;Colher de sopa rasa&quot; ou &quot;Fatia média&quot;.
          </p>
        </div>

        {/* Similarity Alert */}
        {similarMatch && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="font-bold">Medida semelhante já cadastrada:</span>
                <p className="mt-0.5">
                  &quot;{similarMatch.label}&quot; ({similarMatch.equivalentReferenceAmount} {unitShort})
                  {similarMatch.scope === "PERSONAL" ? " (Pessoal)" : similarMatch.scope === "CONSULTANCY" ? " (Consultoria)" : " (Oficial)"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleUseExisting(similarMatch)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/40 cursor-pointer transition-colors"
              >
                Usar medida existente
              </button>
              <span className="text-[11px] text-[var(--text-muted)]">ou continue para cadastrar outra</span>
            </div>
          </div>
        )}

        {/* Peso de 1 medida */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[var(--text-primary)]">
            Peso de 1 medida em {unitName} <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
              placeholder="Ex: 15 ou 18,5"
              className="w-full px-3 py-2.5 pr-12 text-base sm:text-sm font-semibold rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] transition-colors min-h-[44px]"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
              {unitShort}
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Informe quantos {unitName} correspondem a 1 medida inteira.
          </p>
        </div>

        {/* Live Structure Preview */}
        {label.trim() && weightStr.trim() && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              1 {label.trim()} corresponde a {weightStr.trim()} {unitShort}
            </span>
          </div>
        )}

        {/* Observação Opcional */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[var(--text-primary)]">
            Observação <span className="text-[var(--text-muted)] font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Marca específica, colher medidora do consultório"
            maxLength={255}
            className="w-full px-3 py-2 text-base sm:text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] transition-colors min-h-[44px]"
          />
        </div>

        {/* Escopo de Compartilhamento */}
        <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
          <label className="block text-xs font-bold text-[var(--text-primary)]">
            Visibilidade da medida
          </label>
          <div className="space-y-2">
            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors">
              <input
                type="radio"
                name="scope"
                value="PERSONAL"
                checked={scope === "PERSONAL"}
                onChange={() => setScope("PERSONAL")}
                className="mt-0.5 accent-[var(--brand)]"
              />
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Pessoal (recomendado)
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] block">
                  Visível apenas nas suas próprias prescrições neste alimento.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors">
              <input
                type="radio"
                name="scope"
                value="CONSULTANCY"
                checked={scope === "CONSULTANCY"}
                onChange={() => setScope("CONSULTANCY")}
                className="mt-0.5 accent-[var(--brand)]"
              />
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Compartilhar com a consultoria
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] block">
                  Disponibilizar esta medida para todos os nutricionistas da sua consultoria.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] min-h-[44px] cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !label.trim() || !weightStr.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[var(--brand)] hover:opacity-90 disabled:opacity-50 min-h-[44px] flex items-center gap-2 cursor-pointer transition-all shadow-sm"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Salvando...</span>
              </>
            ) : (
              <span>Salvar medida</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
