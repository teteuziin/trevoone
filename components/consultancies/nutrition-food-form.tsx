"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  type NutritionFoodActionState,
  createManualNutritionFoodAction,
  updateManualNutritionFoodAction,
} from "@/app/consultoria/[slug]/nutricao/alimentos/actions";
import type { NutritionFoodDto } from "@/lib/consultancies/nutrition";

type Props = {
  consultancySlug: string;
  initialData?: NutritionFoodDto | null;
  mode: "create" | "edit";
};

const ALLOWED_UNITS = ["G", "ML", "UNIT"] as const;

const UNIT_LABELS: Record<string, string> = {
  G: "Gramas (g)",
  ML: "Mililitros (ml)",
  UNIT: "Unidade (un)",
};

export function NutritionFoodForm({ consultancySlug, initialData, mode }: Props) {
  const router = useRouter();

  const actionFn = mode === "create" ? createManualNutritionFoodAction : updateManualNutritionFoodAction;
  const [state, formAction, isPending] = useActionState<NutritionFoodActionState, FormData>(
    actionFn,
    {}
  );

  useEffect(() => {
    if (state.success && state.foodPublicId) {
      router.push(`/consultoria/${consultancySlug}/nutricao/alimentos/${state.foodPublicId}`);
    }
  }, [state.success, state.foodPublicId, router, consultancySlug]);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      <input type="hidden" name="slug" value={consultancySlug} />
      {mode === "edit" && initialData && (
        <input type="hidden" name="foodPublicId" value={initialData.publicId} />
      )}

      {state.error && !state.fieldErrors && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {state.error}
        </div>
      )}

      {/* Identificação Básica */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Identificação do alimento</h2>

        <div className="space-y-1.5">
          <label htmlFor="food-name" className="block text-sm font-medium text-[var(--text-primary)]">
            Nome do alimento <span className="text-red-500">*</span>
          </label>
          <input
            id="food-name"
            name="name"
            type="text"
            required
            defaultValue={initialData?.name || ""}
            placeholder="Ex: Peito de frango grelhado, Tapioca de goma..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-[var(--surface)] transition-colors"
          />
          {state.fieldErrors?.name && (
            <p className="text-xs text-red-600 dark:text-red-400">{state.fieldErrors.name}</p>
          )}
        </div>
      </div>

      {/* Referência e Medida */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Base de referência</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Informe a quantidade e unidade padrão sobre as quais os macronutrientes abaixo foram medidos.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="food-ref-amount" className="block text-sm font-medium text-[var(--text-primary)]">
              Quantidade de referência <span className="text-red-500">*</span>
            </label>
            <input
              id="food-ref-amount"
              name="referenceAmount"
              type="text"
              inputMode="decimal"
              required
              defaultValue={initialData ? String(initialData.referenceAmount) : "100"}
              placeholder="Ex: 100"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-[var(--surface)] transition-colors"
            />
            {state.fieldErrors?.referenceAmount && (
              <p className="text-xs text-red-600 dark:text-red-400">{state.fieldErrors.referenceAmount}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="food-ref-unit" className="block text-sm font-medium text-[var(--text-primary)]">
              Unidade de medida <span className="text-red-500">*</span>
            </label>
            <select
              id="food-ref-unit"
              name="referenceUnit"
              required
              defaultValue={initialData?.referenceUnit || "G"}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] text-[var(--text-primary)] bg-[var(--surface)] transition-colors"
            >
              {ALLOWED_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {UNIT_LABELS[unit] || unit}
                </option>
              ))}
            </select>
            {state.fieldErrors?.referenceUnit && (
              <p className="text-xs text-red-600 dark:text-red-400">{state.fieldErrors.referenceUnit}</p>
            )}
          </div>
        </div>
      </div>

      {/* Macronutrientes */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Informações nutricionais</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Valores correspondentes exatamente à porção de referência configurada acima.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="food-calories" className="block text-sm font-medium text-[var(--text-primary)]">
              Calorias (kcal) <span className="text-red-500">*</span>
            </label>
            <input
              id="food-calories"
              name="caloriesKcal"
              type="text"
              inputMode="decimal"
              required
              defaultValue={initialData !== undefined && initialData !== null ? String(initialData.caloriesKcal) : ""}
              placeholder="Ex: 159"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-[var(--surface)] transition-colors"
            />
            {state.fieldErrors?.caloriesKcal && (
              <p className="text-xs text-red-600 dark:text-red-400">{state.fieldErrors.caloriesKcal}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="food-protein" className="block text-sm font-medium text-[var(--text-primary)]">
              Proteínas (g) <span className="text-red-500">*</span>
            </label>
            <input
              id="food-protein"
              name="proteinG"
              type="text"
              inputMode="decimal"
              required
              defaultValue={initialData !== undefined && initialData !== null ? String(initialData.proteinG) : ""}
              placeholder="Ex: 32.0"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-[var(--surface)] transition-colors"
            />
            {state.fieldErrors?.proteinG && (
              <p className="text-xs text-red-600 dark:text-red-400">{state.fieldErrors.proteinG}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="food-carb" className="block text-sm font-medium text-[var(--text-primary)]">
              Carboidratos (g) <span className="text-red-500">*</span>
            </label>
            <input
              id="food-carb"
              name="carbohydrateG"
              type="text"
              inputMode="decimal"
              required
              defaultValue={initialData !== undefined && initialData !== null ? String(initialData.carbohydrateG) : ""}
              placeholder="Ex: 0.0"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-[var(--surface)] transition-colors"
            />
            {state.fieldErrors?.carbohydrateG && (
              <p className="text-xs text-red-600 dark:text-red-400">{state.fieldErrors.carbohydrateG}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="food-fat" className="block text-sm font-medium text-[var(--text-primary)]">
              Gorduras totais (g) <span className="text-red-500">*</span>
            </label>
            <input
              id="food-fat"
              name="fatG"
              type="text"
              inputMode="decimal"
              required
              defaultValue={initialData !== undefined && initialData !== null ? String(initialData.fatG) : ""}
              placeholder="Ex: 2.5"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] focus-visible:outline-2 focus-visible:outline-[var(--brand)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-[var(--surface)] transition-colors"
            />
            {state.fieldErrors?.fatG && (
              <p className="text-xs text-red-600 dark:text-red-400">{state.fieldErrors.fatG}</p>
            )}
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
        <Link
          href={
            mode === "edit" && initialData
              ? `/consultoria/${consultancySlug}/nutricao/alimentos/${initialData.publicId}`
              : `/consultoria/${consultancySlug}/nutricao/alimentos`
          }
          className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-hover)] border border-[var(--border-default)] rounded-xl transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {isPending
            ? mode === "create"
              ? "Cadastrando..."
              : "Salvando..."
            : mode === "create"
            ? "Cadastrar alimento"
            : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
