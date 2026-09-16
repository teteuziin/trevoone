import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
// LINEAR ICONS — GLOBAL UI DIRECTION V2 (Monochrome with controlled brand tint)
// ============================================================================

function NutritionIcon({ className = "w-5 h-5" }: { className?: string }) {
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
      <path d="M12 2a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9" />
      <path d="M12 2c3.5 3 4.5 7 4.5 9 0 3-2 5.5-4.5 5.5S7.5 14 7.5 11c0-2 1-6 4.5-9z" />
      <path d="M12 2v18" />
    </svg>
  );
}

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

export function DashboardNutritionistView({
  consultancySlug,
  recentPlans,
  totalPlans = 0,
}: DashboardNutritionistViewProps) {
  const quickActions = [
    {
      href: `/consultoria/${consultancySlug}/planos-v2/novo`,
      title: "Novo Plano",
      description: "Prescrever cardápio personalizado",
      icon: PlusIcon,
      accent: true,
    },
    {
      href: `/consultoria/${consultancySlug}/planos-v2`,
      title: "Planos Alimentares",
      description: "Prescrições, refeições e versões",
      icon: MealPlanIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/alimentos-v2`,
      title: "Banco de Alimentos",
      description: "Tabela TACO e consultoria",
      icon: FoodLibraryIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/progresso/alunos`,
      title: "Pacientes",
      description: "Evolução, pesagens e medidas",
      icon: ProgressIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/consultas`,
      title: "Consultas",
      description: "Agenda e teleconsultas 1:1",
      icon: ConsultationIcon,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. HERO OPERACIONAL V2 (Superfície limpa, respiro e proporção clínica elegante) */}
      <div className="p-5 sm:p-6 md:p-7 rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs relative overflow-hidden depth-surface">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--brand)] shrink-0 shadow-2xs">
              <NutritionIcon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                  Espaço Nutricional
                </span>
                <Badge variant="brand" size="sm">
                  Nutricionista
                </Badge>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Prescrição Alimentar
              </h2>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-xl leading-relaxed">
                Elabore cardápios personalizados, estruture refeições e oriente a alimentação dos seus pacientes.
              </p>

              {totalPlans > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    {totalPlans} {totalPlans === 1 ? "plano cadastrado" : "planos cadastrados"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0">
            <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full sm:w-auto font-bold min-h-[44px] shadow-sm">
                + Novo Plano
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/planos-v2`} className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full sm:w-auto font-semibold min-h-[44px]">
                Ver Todos
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. QUICK ACTIONS COCKPIT (Linear / Stripe grid) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
          Ações Rápidas
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-3 group depth-interactive ${
                  action.accent
                    ? "bg-[var(--surface-subtle)] border-[var(--brand)]/30 hover:border-[var(--brand)] hover:bg-[var(--surface)]"
                    : "bg-[var(--surface)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      action.accent
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] group-hover:text-[var(--brand)]"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <ChevronRightIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors line-clamp-1">
                    {action.title}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. FILA DE PRESCRIÇÕES / PLANOS RECENTES */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Planos Alimentares Recentes
            </h3>
            {recentPlans && recentPlans.length > 0 && (
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                ({recentPlans.length})
              </span>
            )}
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/planos-v2`}
            className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1"
          >
            <span>Gerenciar todos</span>
            <span>→</span>
          </Link>
        </div>

        {recentPlans && recentPlans.length > 0 ? (
          <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
            {recentPlans.map((plan) => (
              <Link
                key={plan.publicId}
                href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                className="p-4 sm:p-4.5 flex items-center justify-between gap-4 hover:bg-[var(--surface-hover)] transition-all duration-150 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                      {plan.title || "Plano sem título"}
                    </span>
                    {plan.studentName && (
                      <span className="text-xs text-[var(--text-secondary)] font-medium truncate">
                        • {plan.studentName}
                      </span>
                    )}
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
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                    {plan.mealsCount || 0} {plan.mealsCount === 1 ? "refeição" : "refeições"}
                  </p>
                </div>

                <div className="shrink-0 text-xs font-bold text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all flex items-center gap-1">
                  <span>Abrir Editor</span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 sm:p-10 rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs">
            <div className="inline-flex p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)]">
              <MealPlanIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Nenhum plano alimentar cadastrado
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Inicie a prescrição nutricional elaborando um cardápio para um aluno.
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
    </div>
  );
}
