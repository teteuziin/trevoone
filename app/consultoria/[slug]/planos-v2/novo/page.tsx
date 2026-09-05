"use client";

import { use, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPlanAction } from "../actions";

interface NovoPlanoPageProps {
  params: Promise<{ slug: string }>;
}

export default function NovoPlanoPage({ params }: NovoPlanoPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createPlanAction(slug, formData);
      if (res.success && res.data) {
        router.push(`/consultoria/${slug}/planos-v2/${res.data.planPublicId}`);
      } else {
        setError(res.error || "Erro ao criar plano alimentar.");
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <Link
          href={`/consultoria/${slug}/planos-v2`}
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Voltar para Planos</span>
        </Link>
      </div>

      <div className="bg-[var(--surface-primary)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Criar Novo Plano Alimentar
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Preencha os dados básicos. Em seguida você poderá montar as refeições, porções e substituições.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Título do Plano: *
            </label>
            <input
              type="text"
              name="title"
              required
              placeholder="Ex: Dieta para Hipertrofia - Fase 1, Protocolo Low Carb..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Subtítulo (opcional):
            </label>
            <input
              type="text"
              name="subtitle"
              placeholder="Ex: Ajuste calórico progressivo..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Objetivo Nutricional (opcional):
            </label>
            <input
              type="text"
              name="objective"
              placeholder="Ex: Emagrecimento, Ganho de Massa, Manutenção..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Orientações Gerais ao Paciente (opcional):
            </label>
            <textarea
              name="generalGuidance"
              rows={4}
              placeholder="Ex: Beber 35ml de água por kg de peso. Respeitar os intervalos entre refeições..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Observações Internas (opcional):
            </label>
            <input
              type="text"
              name="notes"
              placeholder="Notas para a equipe da consultoria..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Link
              href={`/consultoria/${slug}/planos-v2`}
              className="px-4 py-2.5 text-xs font-medium rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-[var(--brand-primary)] text-white hover:opacity-90 shadow-sm transition-opacity"
            >
              {isPending ? "Criando Plano..." : "Criar e Montar Refeições"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
