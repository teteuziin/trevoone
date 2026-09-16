import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { ConsultancyAppShell } from "@/components/consultancies/consultancy-app-shell";
import { createWorkoutDraftAction } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function DumbbellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function NewWorkoutPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    redirect("/selecionar-consultoria");
  }

  const isProfessional =
    context.roles.includes("PERSONAL") || context.roles.includes("CONSULTANCY_ADMIN");
  if (!isProfessional) {
    redirect(`/consultoria/${slug}`);
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx || !ctx.canAuthorTraining) {
    redirect(`/consultoria/${slug}`);
  }

  async function handleCreate(formData: FormData) {
    "use server";
    const title = String(formData.get("title") || "").trim();
    const objective = String(formData.get("objective") || "").trim() || undefined;
    const difficultyLevel = String(formData.get("difficultyLevel") || "INTERMEDIATE");
    const estimatedDuration = formData.get("estimatedDurationMinutes");
    const notes = String(formData.get("notes") || "").trim() || undefined;

    const res = await createWorkoutDraftAction(slug, {
      title,
      objective,
      difficultyLevel,
      estimatedDurationMinutes: estimatedDuration ? Number(estimatedDuration) : null,
      notes,
    });

    if (res.ok && res.data) {
      redirect(`/consultoria/${slug}/rotinas/${res.data.workoutPublicId}`);
    }
  }

  return (
    <ConsultancyAppShell
      consultancyName={context.consultancyName}
      consultancySlug={context.consultancySlug}
      consultancyLogoUrl={context.consultancyLogoUrl}
      roles={context.roles}
      userName={session.fullName}
      userEmail={session.email}
    >
      <div className="w-full max-w-2xl mx-auto space-y-6 pb-12">
        <Link
          href={`/consultoria/${slug}/rotinas`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[36px] depth-interactive"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>Voltar para Treinos</span>
        </Link>

        <div className="p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-6 depth-surface">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                Módulo de Treinamento
              </span>
              <Badge variant="brand" size="sm">
                Novo Treino
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Informações Iniciais da Rotina
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
              Defina o nome e os objetivos gerais. Em seguida, você adicionará os blocos e exercícios no Criador.
            </p>
          </div>

          <form action={handleCreate} className="space-y-4.5">
            <div className="space-y-1.5">
              <label htmlFor="title" className="block text-xs font-bold text-[var(--text-primary)]">
                Nome do treino *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="Ex: Treino A — Peito e Tríceps"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="objective" className="block text-xs font-bold text-[var(--text-primary)]">
                Objetivo principal
              </label>
              <input
                id="objective"
                name="objective"
                type="text"
                placeholder="Ex: Hipertrofia, Força, Resistência muscular..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="difficultyLevel" className="block text-xs font-bold text-[var(--text-primary)]">
                  Nível de dificuldade
                </label>
                <select
                  id="difficultyLevel"
                  name="difficultyLevel"
                  defaultValue="INTERMEDIATE"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] transition-all min-h-[44px]"
                >
                  <option value="BEGINNER">Iniciante</option>
                  <option value="INTERMEDIATE">Intermediário</option>
                  <option value="ADVANCED">Avançado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="estimatedDurationMinutes" className="block text-xs font-bold text-[var(--text-primary)]">
                  Duração estimada (min)
                </label>
                <input
                  id="estimatedDurationMinutes"
                  name="estimatedDurationMinutes"
                  type="number"
                  min="5"
                  max="240"
                  defaultValue="50"
                  placeholder="Ex: 50"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="notes" className="block text-xs font-bold text-[var(--text-primary)]">
                Observações gerais / Recomendações
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Orientações pré-treino, recomendações de aquecimento..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text-primary)] placeholder-[var(--text-tertiary)] transition-all"
              />
            </div>

            <div className="pt-4 border-t border-[var(--border-default)] flex items-center justify-end gap-2.5">
              <Link href={`/consultoria/${slug}/rotinas`}>
                <Button variant="secondary" size="md" className="font-semibold min-h-[44px]">
                  Cancelar
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="font-bold min-h-[44px] flex items-center gap-2 shadow-sm"
              >
                <DumbbellIcon className="w-4 h-4" />
                <span>Criar e Abrir no Criador</span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ConsultancyAppShell>
  );
}
