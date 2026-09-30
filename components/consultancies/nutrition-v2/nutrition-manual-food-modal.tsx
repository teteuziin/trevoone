"use client";

import React, { useState, useTransition } from "react";
import { registerFoodManuallyAction } from "@/app/consultoria/[slug]/planos-v2/actions";
import type { FoodSelectionResult } from "./nutrition-food-picker";

interface NutritionManualFoodModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  onFoodCreated: (result: FoodSelectionResult) => void;
}

export function NutritionManualFoodModal({
  slug,
  isOpen,
  onClose,
  onFoodCreated,
}: NutritionManualFoodModalProps) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [referenceAmount, setReferenceAmount] = useState("100");
  const [referenceUnitCode, setReferenceUnitCode] = useState("G");
  const [caloriesKcal, setCaloriesKcal] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbohydrateG, setCarbohydrateG] = useState("");
  const [fatG, setFatG] = useState("");
  const [fiberG, setFiberG] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const [dataSource, setDataSource] = useState<"ROTULO" | "FABRICANTE" | "FONTE_CIENTIFICA" | "OUTRA">("ROTULO");
  const [sourceReference, setSourceReference] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg("O nome do alimento é obrigatório.");
      return;
    }

    const refAmt = parseFloat(referenceAmount.replace(",", "."));
    if (isNaN(refAmt) || refAmt <= 0) {
      setErrorMsg("Informe uma porção de referência válida.");
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
      setErrorMsg(err instanceof Error ? err.message : "Valor nutricional inválido.");
      return;
    }

    startTransition(async () => {
      const res = await registerFoodManuallyAction(slug, {
        name: cleanName,
        brand: brand.trim() || null,
        category: category.trim() || null,
        referenceAmount: refAmt,
        referenceUnitCode: referenceUnitCode.toUpperCase(),
        caloriesKcal: kcal,
        proteinG: p,
        carbohydrateG: c,
        fatG: g,
        fiberG: fiber != null && !isNaN(fiber) ? fiber : null,
        sodiumMg: sodium != null && !isNaN(sodium) ? sodium : null,
        dataSource,
        sourceReference: sourceReference.trim() || null,
      });

      if (res.success && res.data) {
        onFoodCreated({
          foodPublicId: res.data.publicId,
          prescribedQuantity: res.data.referenceAmount,
          prescribedUnitCode: res.data.referenceUnitCode,
          prescribedUnitLabel: res.data.referenceUnitCode === "G" ? "Gramas (g)" : res.data.referenceUnitCode === "ML" ? "Mililitros (ml)" : "Unidade(s)",
          notes: sourceReference.trim() || undefined,
        });
        onClose();
      } else {
        setErrorMsg(res.error || "Erro ao cadastrar alimento.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden depth-surface">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Cadastrar Manualmente</h2>
              <p className="text-xs text-[var(--text-secondary)]">Insira os nutrientes reais com origem e rastreabilidade garantidas</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Nome do Alimento *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Iogurte Grego Desnatado"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Marca / Fabricante <span className="font-normal text-[var(--text-tertiary)]">(opcional)</span>
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Nestlé, Danone, Growth..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">Categoria (opcional)</label>
                <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Laticínios, Suplementos..."
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Porção Ref. *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={referenceAmount}
                  onChange={(e) => setReferenceAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm text-center font-bold rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Unidade *
                </label>
                <select
                  value={referenceUnitCode}
                  onChange={(e) => setReferenceUnitCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
                >
                  <option value="G">g (gramas)</option>
                  <option value="ML">ml (mililitros)</option>
                  <option value="UNIDADE">unidade</option>
                  <option value="PORCAO">porção</option>
                </select>
              </div>
            </div>
          </div>

          {/* Macros Grid */}
          <div className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 space-y-3">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
              Composição Nutricional (por porção de referência)
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
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[38px]"
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
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[38px]"
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
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[38px]"
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
                  className="w-full px-3 py-2 text-xs sm:text-sm font-bold text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[38px]"
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
                  className="w-full px-3 py-1.5 text-xs text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[36px]"
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
                  className="w-full px-3 py-1.5 text-xs text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[36px]"
                />
              </div>
            </div>
          </div>

          {/* Provenance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Origem dos Dados *
              </label>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value as "ROTULO" | "FABRICANTE" | "FONTE_CIENTIFICA" | "OUTRA")}
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
              >
                <option value="ROTULO">Rótulo / Embalagem</option>
                <option value="FABRICANTE">Fabricante Oficial</option>
                <option value="FONTE_CIENTIFICA">Fonte Científica / Artigo</option>
                <option value="OUTRA">Outra Fonte Verificada</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Referência / Observação <span className="font-normal text-[var(--text-tertiary)]">(opcional)</span>
              </label>
              <input
                type="text"
                value={sourceReference}
                onChange={(e) => setSourceReference(e.target.value)}
                placeholder="Ex: Laudo do fabricante, link ou lote"
                className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[40px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] min-h-[40px] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-colors shadow-xs min-h-[40px] cursor-pointer"
            >
              {isPending ? "Cadastrando..." : "Confirmar e cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
