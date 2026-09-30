"use client";

import React, { useState, useTransition } from "react";
import { registerFoodFromLabelAction } from "@/app/consultoria/[slug]/planos-v2/actions";
import type { FoodSelectionResult } from "./nutrition-food-picker";

interface NutritionLabelReaderModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  onFoodCreated: (result: FoodSelectionResult) => void;
}

export function NutritionLabelReaderModal({
  slug,
  isOpen,
  onClose,
  onFoodCreated,
}: NutritionLabelReaderModalProps) {
  const [step, setStep] = useState<"INPUT" | "REVIEW">("INPUT");
  const [inputText, setInputText] = useState("");
  const [imageFileName, setImageFileName] = useState<string | null>(null);

  // Extracted & editable review fields
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [servingAmount, setServingAmount] = useState("100");
  const [servingUnitCode, setServingUnitCode] = useState("G");
  const [servingHouseholdMeasure, setServingHouseholdMeasure] = useState("");
  const [caloriesKcal, setCaloriesKcal] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbohydrateG, setCarbohydrateG] = useState("");
  const [fatG, setFatG] = useState("");
  const [fiberG, setFiberG] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const [labelNotes, setLabelNotes] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  // Client parser for Brazilian nutrition label patterns
  function handleExtractFromText(raw: string) {
    setErrorMsg(null);
    const text = raw.toLowerCase();

    // Try extracting product name (first non-empty line or keyword)
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let extractedName = "";
    if (lines.length > 0 && !lines[0].toLowerCase().includes("informa") && !lines[0].toLowerCase().includes("tabela")) {
      extractedName = lines[0];
    }

    // Serving size: "porção de 30 g (2 colheres)", "porção: 200 ml (1 copo)"
    let extractedAmount = "100";
    let extractedUnit = "G";
    let extractedMeasure = "";

    const portionMatch = text.match(/por[cç][aã]o(?:\s*de)?\s*[:\-]?\s*(\d+[.,]?\d*)\s*(g|ml|kg|l)?(?:\s*\(([^)]+)\))?/i);
    if (portionMatch) {
      if (portionMatch[1]) extractedAmount = portionMatch[1].replace(",", ".");
      if (portionMatch[2]) {
        const u = portionMatch[2].toLowerCase();
        extractedUnit = u === "ml" || u === "l" ? "ML" : "G";
      }
      if (portionMatch[3]) extractedMeasure = portionMatch[3].trim();
    }

    // Energy: "valor energético", "calorias", "energia", "kcal"
    let extractedKcal = "";
    const kcalMatch = text.match(/(?:valor\s*energ[eé]tico|energia|calorias)\s*[:\-]?\s*(\d+[.,]?\d*)\s*(?:kcal)?/i);
    if (kcalMatch && kcalMatch[1]) {
      extractedKcal = kcalMatch[1].replace(",", ".");
    }

    // Protein: "proteínas", "proteina"
    let extractedP = "";
    const pMatch = text.match(/(?:prote[ií]nas?)\s*[:\-]?\s*(\d+[.,]?\d*)\s*g?/i);
    if (pMatch && pMatch[1]) extractedP = pMatch[1].replace(",", ".");

    // Carbohydrates: "carboidratos", "carboidrato"
    let extractedC = "";
    const cMatch = text.match(/(?:carboidratos?)\s*[:\-]?\s*(\d+[.,]?\d*)\s*g?/i);
    if (cMatch && cMatch[1]) extractedC = cMatch[1].replace(",", ".");

    // Fat: "gorduras totais", "gorduras", "lipidios"
    let extractedG = "";
    const gMatch = text.match(/(?:gorduras\s*totais|lip[ií]dios|gorduras)\s*[:\-]?\s*(\d+[.,]?\d*)\s*g?/i);
    if (gMatch && gMatch[1]) extractedG = gMatch[1].replace(",", ".");

    // Fiber: "fibra alimentar", "fibras"
    let extractedFiber = "";
    const fiberMatch = text.match(/(?:fibra\s*alimentar|fibras?)\s*[:\-]?\s*(\d+[.,]?\d*)\s*g?/i);
    if (fiberMatch && fiberMatch[1]) extractedFiber = fiberMatch[1].replace(",", ".");

    // Sodium: "sódio", "sodio"
    let extractedSodium = "";
    const sodiumMatch = text.match(/(?:s[oó]dio)\s*[:\-]?\s*(\d+[.,]?\d*)\s*(?:mg)?/i);
    if (sodiumMatch && sodiumMatch[1]) extractedSodium = sodiumMatch[1].replace(",", ".");

    setName(extractedName || name || "Produto do Rótulo");
    setServingAmount(extractedAmount);
    setServingUnitCode(extractedUnit);
    setServingHouseholdMeasure(extractedMeasure);
    if (extractedKcal) setCaloriesKcal(extractedKcal);
    if (extractedP) setProteinG(extractedP);
    if (extractedC) setCarbohydrateG(extractedC);
    if (extractedG) setFatG(extractedG);
    if (extractedFiber) setFiberG(extractedFiber);
    if (extractedSodium) setSodiumMg(extractedSodium);

    setStep("REVIEW");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    setName(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));

    // Read file as text if text/pdf or inspect name
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        handleExtractFromText(content);
      } else {
        // Image uploaded: proceed to review screen where professional transcribes / adjusts
        setStep("REVIEW");
      }
    };
    if (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      // For images/PDFs: proceed to Review state so professional validates
      setStep("REVIEW");
    }
  }

  function handleSaveReview(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg("O nome do produto é obrigatório.");
      return;
    }

    const sAmt = parseFloat(servingAmount.replace(",", "."));
    if (isNaN(sAmt) || sAmt <= 0) {
      setErrorMsg("Informe o tamanho da porção do rótulo.");
      return;
    }

    const parseOptionalMacro = (str: string, label: string): number | null => {
      if (!str.trim()) return null;
      const num = parseFloat(str.replace(",", "."));
      if (isNaN(num) || num < 0) {
        throw new Error(`O campo ${label} deve ser um valor numérico não-negativo ou ser deixado em branco.`);
      }
      return Math.round(num * 100) / 100;
    };

    let kcal: number | null = null;
    let p: number | null = null;
    let c: number | null = null;
    let g: number | null = null;
    let fiber: number | null = null;
    let sodium: number | null = null;
    try {
      kcal = parseOptionalMacro(caloriesKcal, "Calorias");
      p = parseOptionalMacro(proteinG, "Proteína");
      c = parseOptionalMacro(carbohydrateG, "Carboidratos");
      g = parseOptionalMacro(fatG, "Gorduras");
      fiber = parseOptionalMacro(fiberG, "Fibras");
      sodium = parseOptionalMacro(sodiumMg, "Sódio");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Valor nutricional do rótulo inválido.");
      return;
    }

    startTransition(async () => {
      const res = await registerFoodFromLabelAction(slug, {
        name: cleanName,
        brand: brand.trim() || null,
        servingAmount: sAmt,
        servingUnitCode: servingUnitCode.toUpperCase(),
        servingHouseholdMeasure: servingHouseholdMeasure.trim() || null,
        caloriesKcal: kcal,
        proteinG: p,
        carbohydrateG: c,
        fatG: g,
        fiberG: fiber != null && !isNaN(fiber) ? fiber : null,
        sodiumMg: sodium != null && !isNaN(sodium) ? sodium : null,
        labelNotes: labelNotes.trim() || null,
      });

      if (res.success && res.data) {
        onFoodCreated({
          foodPublicId: res.data.publicId,
          prescribedQuantity: res.data.referenceAmount,
          prescribedUnitCode: res.data.portionPublicId ? "PORCAO" : res.data.referenceUnitCode,
          prescribedUnitLabel: servingHouseholdMeasure.trim() || (res.data.referenceUnitCode === "G" ? "Gramas (g)" : "Mililitros (ml)"),
          portionPublicId: res.data.portionPublicId || null,
          notes: brand.trim() ? `Marca: ${brand.trim()}` : undefined,
        });
        onClose();
      } else {
        setErrorMsg(res.error || "Erro ao salvar alimento pelo rótulo.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden depth-surface">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {step === "INPUT" ? "Cadastrar pelo Rótulo" : "Revisar Alimento do Rótulo"}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {step === "INPUT"
                  ? "Anexe a foto da embalagem para referência e preencha os dados nutricionais do rótulo"
                  : "Confirme os dados transcritos antes de cadastrar no plano"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Input / Upload */}
        {step === "INPUT" && (
          <div className="p-5 space-y-4 overflow-y-auto">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Foto ou documento da embalagem (referência)
              </label>
              <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-[var(--border-default)] hover:border-blue-500 bg-[var(--surface-subtle)]/40 hover:bg-blue-500/5 cursor-pointer transition-colors text-center space-y-2">
                <svg className="w-8 h-8 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-xs">
                  <span className="font-bold text-blue-600 dark:text-blue-400">Clique para selecionar foto/PDF</span> ou arraste o arquivo aqui
                </div>
                <span className="text-[10px] text-[var(--text-tertiary)]">JPG, PNG, WebP ou PDF</span>
                {imageFileName && <span className="text-xs font-bold text-blue-600 block mt-1">Arquivo: {imageFileName}</span>}
                <input
                  type="file"
                  accept="image/*,application/pdf,text/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--border-subtle)]" />
              <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase">ou preencha manualmente os campos</span>
              <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Texto da tabela nutricional (opcional para preenchimento rápido)
              </label>
              <textarea
                rows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Exemplo:&#10;Iogurte Morango - Porção de 170g (1 pote)&#10;Valor energético: 140 kcal&#10;Carboidratos: 22g | Proteínas: 6g | Gorduras totais: 3g"
                className="w-full p-3 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (inputText.trim()) {
                    handleExtractFromText(inputText);
                  } else {
                    setStep("REVIEW");
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                Continuar para Revisão →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Confirm */}
        {step === "REVIEW" && (
          <form onSubmit={handleSaveReview} className="flex-1 overflow-y-auto p-5 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
              <strong>Atenção profissional:</strong> Os dados nutricionais foram transcritos do rótulo. Confira os valores abaixo antes de confirmar o cadastro.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Observações do Rótulo (opcional)
                </label>
                <input
                  type="text"
                  value={labelNotes}
                  onChange={(e) => setLabelNotes(e.target.value)}
                  placeholder="Ex: Transcrito da embalagem lote 102"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-3"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Pão de Forma Integral 12 Grãos"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Marca do Produto <span className="font-normal text-[var(--text-tertiary)]">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Ex: Wickbold, Bauducco, Danone..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[40px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Porção no Rótulo *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={servingAmount}
                    onChange={(e) => setServingAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm text-center font-bold rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Unidade *
                  </label>
                  <select
                    value={servingUnitCode}
                    onChange={(e) => setServingUnitCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[40px]"
                  >
                    <option value="G">g (gramas)</option>
                    <option value="ML">ml (mililitros)</option>
                    <option value="UNIDADE">unidade</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Medida Caseira <span className="font-normal text-[var(--text-tertiary)]">(ex: 2 fatias, 1 colher)</span>
                </label>
                <input
                  type="text"
                  value={servingHouseholdMeasure}
                  onChange={(e) => setServingHouseholdMeasure(e.target.value)}
                  placeholder="Ex: 2 fatias, 1 copo, 3 biscoitos"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[40px]"
                />
              </div>
            </div>

            {/* Nutrients Grid */}
            <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 space-y-3">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                Nutrientes por Porção do Rótulo
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    Calorias (kcal) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={caloriesKcal}
                    onChange={(e) => setCaloriesKcal(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    Proteína (g) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={proteinG}
                    onChange={(e) => setProteinG(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    Carboidratos (g) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={carbohydrateG}
                    onChange={(e) => setCarbohydrateG(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[38px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                    Gorduras (g) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={fatG}
                    onChange={(e) => setFatG(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[38px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] mb-1">
                    Fibras (g) <span className="font-normal">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={fiberG}
                    onChange={(e) => setFiberG(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-1.5 text-xs text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[36px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] mb-1">
                    Sódio (mg) <span className="font-normal">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sodiumMg}
                    onChange={(e) => setSodiumMg(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-1.5 text-xs text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[36px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setStep("INPUT")}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                ← Voltar
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors shadow-xs min-h-[40px] cursor-pointer"
              >
                {isPending ? "Cadastrando..." : "Confirmar e cadastrar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
