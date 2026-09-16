"use client";

import React, { use, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPlanAction } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NovoPlanoPageProps {
  params: Promise<{ slug: string }>;
}

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
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
    <div className="w-full min-h-[calc(100vh-4rem)] bg-[var(--background)] px-4 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        {/* Back navigation */}
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${slug}/planos-v2`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[36px] depth-interactive"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Voltar para Planos Alimentares</span>
          </Link>
        </div>

        {/* Form Card */}
        <div className="p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-6 depth-surface">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                Nutrição Clínica
              </span>
              <Badge variant="brand" size="sm">
                Novo Cardápio
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Criar Novo Plano Alimentar
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
              Preencha os dados básicos da prescrição. Na próxima etapa você poderá montar as refeições, porções e substituições.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                Título do Plano *
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="Ex: Dieta para Hipertrofia - Fase 1, Protocolo Low Carb..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                Subtítulo (opcional)
              </label>
              <input
                type="text"
                name="subtitle"
                placeholder="Ex: Ajuste calórico progressivo..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                Objetivo Nutricional (opcional)
              </label>
              <input
                type="text"
                name="objective"
                placeholder="Ex: Emagrecimento, Ganho de Massa, Manutenção..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                Orientações Gerais ao Paciente (opcional)
              </label>
              <textarea
                name="generalGuidance"
                rows={4}
                placeholder="Ex: Beber 35ml de água por kg de peso. Respeitar os intervalos entre as refeições..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                Observações Internas (opcional)
              </label>
              <input
                type="text"
                name="notes"
                placeholder="Notas confidenciais para a equipe da consultoria..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
              <Link href={`/consultoria/${slug}/planos-v2`}>
                <Button variant="secondary" size="md" className="font-semibold min-h-[44px]">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isPending}
                className="font-bold min-h-[44px] shadow-sm"
              >
                {isPending ? "Criando Plano..." : "Criar e Montar Refeições"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
