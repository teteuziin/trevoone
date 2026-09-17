import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SaladIcon as Salad } from "@/components/ui/icons";

export interface NutritionistPlanSummaryItem {
  publicId: string;
  title: string;
  studentName?: string | null;
  status: string;
  versionNumber?: number | null;
  mealsCount?: number;
}

interface DashboardNutritionistViewProps {
  consultancySlug: string;
  recentPlans: NutritionistPlanSummaryItem[];
  totalPlans?: number;
}

// ============================================================================
// ICONS — CULINARY EDITORIAL (Clean, botanical, linear precision)
// ============================================================================

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14m-7-7h14" />
    </svg>
  );
}

function MealPlanIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function FoodLibraryIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <circle cx="12" cy="9" r="2.5" />
      <path d="M12 6.5c1-1 2-1 2.5-.5" />
    </svg>
  );
}

function ProgressIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function ConsultationIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M15 10l5-3v10l-5-3v-4z" />
      <rect x="2" y="6" width="13" height="12" rx="3" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function UtensilsIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
      <path d="M15 2v18" />
      <path d="M6 2v18" />
      <path d="M4 6h4" />
    </svg>
  );
}

export function DashboardNutritionistView({
  consultancySlug,
  recentPlans,
  totalPlans = 0,
}: DashboardNutritionistViewProps) {
  const quickActions = [
    {
      href: `/consultoria/${consultancySlug}/planos-v2/novo`,
      title: "Novo Plano",
      description: "Cardápio personalizado",
      badge: "Criar",
      icon: PlusIcon,
      accent: true,
    },
    {
      href: `/consultoria/${consultancySlug}/planos-v2`,
      title: "Planos Alimentares",
      description: "Prescrições e versões",
      badge: "Cardápios",
      icon: MealPlanIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/alimentos-v2`,
      title: "Alimentos",
      description: "Tabela oficial e marcas",
      badge: "Nutrição",
      icon: FoodLibraryIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/progresso/alunos`,
      title: "Pacientes",
      description: "Evolução e pesagens",
      badge: "Clínica",
      icon: ProgressIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/consultas`,
      title: "Consultas",
      description: "Agenda e teleconsultas 1:1",
      badge: "Agenda",
      icon: ConsultationIcon,
    },
  ];

  return (
    <div className="space-y-7 sm:space-y-9 overflow-x-clip">
      {/* 1. HERO EDITORIAL GASTRONÔMICO */}
      <div className="relative rounded-3xl border border-[var(--border-default)] overflow-hidden shadow-xs depth-surface bg-[var(--surface)]">
        {/* Real Food Editorial Imagery Backdrop */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/nutrition/bowl-editorial.jpg"
            alt="Trevo One Editorial Nutrição"
            fill
            priority
            className="object-cover object-center opacity-20 dark:opacity-30 filter saturate-110"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface)] via-[var(--surface)]/95 to-[var(--surface)]/65" />
        </div>

        <div className="relative z-10 p-5 sm:p-7 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                Espaço Nutricional
              </span>
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Nutricionista
              </span>
              {totalPlans > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                  {totalPlans} {totalPlans === 1 ? "plano cadastrado" : "planos cadastrados"}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Prescrição & Gastronomia Clínica
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                Elabore cardápios individualizados, estruture refeições por macronutrientes da tabela TACO e oriente a rotina alimentar dos seus pacientes.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full font-bold min-h-[44px] shadow-sm flex items-center justify-center gap-2">
                <PlusIcon className="w-4 h-4" />
                <span>Novo Plano</span>
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/planos-v2`} className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full font-semibold min-h-[44px]">
                Ver Todos
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. EDITORIAL MEAL & INSPIRATION RAIL (84vw on mobile snap scroll) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Ações Clínicas & Acesso
          </h2>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium hidden sm:inline">
            Gestão da rotina do consultório
          </span>
        </div>

        {/* Horizontal Rail: overflow-x confined strictly to the rail */}
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-5 sm:overflow-visible">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`w-[74vw] max-w-[280px] shrink-0 sm:w-auto sm:max-w-none snap-center p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-3 group depth-interactive ${
                  action.accent
                    ? "bg-[var(--surface-subtle)] border-emerald-500/30 hover:border-emerald-500 shadow-2xs"
                    : "bg-[var(--surface)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${
                      action.accent
                        ? "bg-emerald-600 text-white"
                        : "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="space-y-0.5">
                  <h3 className="font-heading text-sm font-bold text-[var(--text-primary)] group-hover:text-emerald-600 transition-colors truncate">
                    {action.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. VISUAL EDITORIAL PREVIEW CARDS (Breakfast & Main meals showcase) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Breakfast Prep */}
        <div className="relative rounded-3xl border border-[var(--border-default)] overflow-hidden bg-[var(--surface)] p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xs depth-surface group">
          <div className="relative h-36 -mx-5 -mt-5 sm:-mx-6 sm:-mt-6 overflow-hidden">
            <Image
              src="/images/nutrition/breakfast-editorial.jpg"
              alt="Desjejum Editorial"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-black/20" />
            <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md">
              Desjejum & Pré-Treino
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Estruturação Matinal & Densidade Nutricional
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Ovos pochê, sourdough artesanal, iogurte grego e antioxidantes. Padrão estético e biodisponibilidade para prescrições.
            </p>
          </div>

          <Link
            href={`/consultoria/${consultancySlug}/alimentos-v2`}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 min-h-[44px] sm:min-h-0 items-center"
          >
            <span>Consultar alimentos para café da manhã</span>
            <span>→</span>
          </Link>
        </div>

        {/* Card 2: Main Meals */}
        <div className="relative rounded-3xl border border-[var(--border-default)] overflow-hidden bg-[var(--surface)] p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xs depth-surface group">
          <div className="relative h-36 -mx-5 -mt-5 sm:-mx-6 sm:-mt-6 overflow-hidden">
            <Image
              src="/images/nutrition/bowl-editorial.jpg"
              alt="Almoço e Jantar Editorial"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-black/20" />
            <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md">
              Almoço & Jantar
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Macronutrientes Principais & Saciedade
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Fontes nobres de proteína (salmão selvagem, aves, ovos), carboidratos complexos e lipídios monoinsaturados.
            </p>
          </div>

          <Link
            href={`/consultoria/${consultancySlug}/planos-v2/novo`}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 min-h-[44px] sm:min-h-0 items-center"
          >
            <span>Montar cardápio com refeições principais</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* 4. FILA DE PRESCRIÇÕES / PLANOS RECENTES (84vw Snap Cards on Mobile) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Planos Alimentares Recentes
            </h2>
            {recentPlans && recentPlans.length > 0 && (
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                ({recentPlans.length})
              </span>
            )}
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/planos-v2`}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 min-h-[44px] sm:min-h-0 items-center"
          >
            <span>Gerenciar todos</span>
            <span>→</span>
          </Link>
        </div>

        {recentPlans && recentPlans.length > 0 ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-2 sm:overflow-visible">
            {recentPlans.map((plan) => (
              <div
                key={plan.publicId}
                className="w-[84vw] max-w-[380px] shrink-0 sm:w-auto sm:max-w-none snap-center p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs hover:border-emerald-500 transition-all flex flex-col justify-between space-y-4 depth-surface"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        plan.status === "ACTIVE" || plan.status === "PUBLISHED"
                          ? "success"
                          : plan.status === "DRAFT"
                          ? "warning"
                          : "neutral"
                      }
                      size="sm"
                    >
                      {plan.versionNumber ? `V${plan.versionNumber} · ` : ""}
                      {plan.status === "ACTIVE"
                        ? "Ativo"
                        : plan.status === "PUBLISHED"
                        ? "Publicado"
                        : plan.status === "DRAFT"
                        ? "Rascunho"
                        : "Arquivado"}
                    </Badge>

                    {plan.mealsCount != null && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)]">
                        <UtensilsIcon className="w-3 h-3 text-emerald-600" />
                        {plan.mealsCount} {plan.mealsCount === 1 ? "refeição" : "refeições"}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] line-clamp-1">
                      {plan.title || "Plano sem título"}
                    </h3>
                    {plan.studentName && (
                      <p className="text-xs text-[var(--text-secondary)] font-medium line-clamp-1">
                        Paciente: <strong className="text-[var(--text-primary)]">{plan.studentName}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)]">
                  <Link
                    href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-xs transition-all min-h-[44px] depth-interactive cursor-pointer"
                  >
                    Abrir Editor Nutricional →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 sm:p-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs depth-surface">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-emerald-600">
              <MealPlanIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Nenhum plano alimentar cadastrado
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Inicie a prescrição nutricional elaborando um cardápio personalizado para um aluno.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`}>
              <Button variant="secondary" size="sm" className="font-semibold min-h-[44px]">
                Criar primeiro plano alimentar
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 5. NUTRITION BIOAVAILABILITY CARD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Salad className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
              Tabela Nutricional Integrada
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xl">
            Cálculo automático de calorias, proteínas, carboidratos e gorduras ao estruturar qualquer refeição ou opção de substituição.
          </p>
        </div>
        <div className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          Cálculo Automático
        </div>
      </div>
    </div>
  );
}
