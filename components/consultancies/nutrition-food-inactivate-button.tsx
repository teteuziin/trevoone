"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  type NutritionFoodActionState,
  inactivateManualNutritionFoodAction,
} from "@/app/consultoria/[slug]/nutricao/alimentos/actions";

interface Props {
  consultancySlug: string;
  foodPublicId: string;
  foodName: string;
}

export function NutritionFoodInactivateButton({
  consultancySlug,
  foodPublicId,
  foodName,
}: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const [state, formAction, isPending] = useActionState<NutritionFoodActionState, FormData>(
    inactivateManualNutritionFoodAction,
    {}
  );

  useEffect(() => {
    if (state.success) {
      router.push(`/consultoria/${consultancySlug}/nutricao/alimentos`);
    }
  }, [state.success, router, consultancySlug]);

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="px-3.5 py-1.5 text-xs font-semibold text-[var(--danger)] hover:text-[var(--danger-foreground)] hover:bg-[var(--danger-soft)] active:bg-[var(--danger-soft-border)] rounded-lg border border-[var(--danger-soft-border)] transition-colors cursor-pointer"
      >
        Inativar alimento
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 space-y-3 max-w-md">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
          Inativar &ldquo;{foodName}&rdquo;?
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          O alimento ficará indisponível para novas seleções e não aparecerá na biblioteca ativa.
        </p>
      </div>

      {state.error && (
        <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="slug" value={consultancySlug} />
        <input type="hidden" name="foodPublicId" value={foodPublicId} />

        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isPending ? "Inativando..." : "Confirmar inativação"}
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => setShowConfirm(false)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border-default)] transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </form>
    </div>
  );
}
