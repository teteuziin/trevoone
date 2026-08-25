import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NutritionPlanListItemDto } from "@/lib/consultancies/nutrition";

interface DashboardNutritionistViewProps {
  consultancySlug: string;
  recentPlans: NutritionPlanListItemDto[];
  totalPlans?: number;
}

function NutritionWorkspaceVolumetricIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nutr-grad-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" stopOpacity="0.22" />
          <stop stopColor="var(--brand)" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="nutr-grad-sheet" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--surface)" />
          <stop stopColor="var(--surface-subtle)" />
        </linearGradient>
        <linearGradient id="nutr-grad-brand" x1="20" y1="16" x2="44" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop stopColor="#047857" />
        </linearGradient>
        <linearGradient id="nutr-grad-leaf" x1="32" y1="28" x2="48" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Base glow circle */}
      <circle cx="32" cy="32" r="28" fill="url(#nutr-grad-bg)" />

      {/* Meal Plan Clipboard / Sheet Base */}
      <rect x="15" y="13" width="34" height="42" rx="6" fill="url(#nutr-grad-sheet)" stroke="var(--border-default)" strokeWidth="1.5" />
      <rect x="18" y="16" width="28" height="36" rx="4" fill="var(--surface)" />

      {/* Top Clipboard Clip */}
      <rect x="25" y="10" width="14" height="6" rx="2" fill="url(#nutr-grad-brand)" />
      <circle cx="32" cy="13" r="1.5" fill="var(--surface)" />

      {/* Meal Plan Lines */}
      <rect x="22" y="22" width="18" height="2.5" rx="1.25" fill="#10b981" fillOpacity="0.85" />
      <rect x="22" y="27" width="12" height="2" rx="1" fill="var(--text-tertiary)" fillOpacity="0.6" />
      <rect x="22" y="32" width="16" height="2" rx="1" fill="var(--text-tertiary)" fillOpacity="0.6" />

      {/* Stylized Nutrition Cloche / Leaf Badge */}
      <g transform="translate(32, 34)">
        <rect x="0" y="4" width="20" height="18" rx="5" fill="var(--surface)" stroke="var(--border-default)" strokeWidth="1.2" />
        {/* Leaf */}
        <path
          d="M6 16 C6 10 13 8 16 8 C16 11 14 17 9 17 C7.5 17 6 16.5 6 16 Z"
          fill="url(#nutr-grad-leaf)"
        />
        <path d="M7 16 C10 14 13 11 15 9" stroke="var(--surface)" strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function FoodLibraryVolumetricIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="food-grad-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" stopOpacity="0.2" />
          <stop stopColor="var(--brand)" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="food-grad-plate" x1="12" y1="14" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--surface)" />
          <stop stopColor="var(--surface-subtle)" />
        </linearGradient>
        <linearGradient id="food-grad-leaf" x1="18" y1="12" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop stopColor="#059669" />
        </linearGradient>
        <linearGradient id="food-grad-accent" x1="16" y1="20" x2="30" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f59e0b" />
          <stop stopColor="#d97706" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="20" fill="url(#food-grad-bg)" />

      {/* Plate Base */}
      <circle cx="24" cy="25" r="14" fill="url(#food-grad-plate)" stroke="var(--border-default)" strokeWidth="1.5" />
      <circle cx="24" cy="25" r="10" fill="var(--surface)" stroke="var(--border-subtle)" strokeWidth="1" />

      {/* Healthy Apple / Food Core */}
      <circle cx="24" cy="26" r="5.5" fill="url(#food-grad-accent)" />
      {/* Leaf */}
      <path d="M24 20.5 C24 17.5 28 16.5 29.5 16.5 C29.5 18 28.5 21 26 21 C25 21 24 20.7 24 20.5 Z" fill="url(#food-grad-leaf)" />
    </svg>
  );
}

function StudentProgressVolumetricIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nutr-prog-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" stopOpacity="0.2" />
          <stop stopColor="var(--brand)" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="nutr-prog-blue" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="nutr-prog-brand" x1="20" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop stopColor="#047857" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="20" fill="url(#nutr-prog-bg)" />
      <rect x="12" y="28" width="6" height="10" rx="2" fill="url(#nutr-prog-blue)" fillOpacity="0.7" />
      <rect x="21" y="21" width="6" height="17" rx="2" fill="url(#nutr-prog-blue)" />
      <rect x="30" y="14" width="6" height="24" rx="2" fill="url(#nutr-prog-brand)" />
      <path d="M14 26 L23 18 L33 11" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="33" cy="11" r="2.5" fill="var(--surface)" stroke="#10b981" strokeWidth="2" />
    </svg>
  );
}

function StudentsGroupVolumetricIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nutr-st-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" stopOpacity="0.2" />
          <stop stopColor="#8b5cf6" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="nutr-st-brand" x1="14" y1="12" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop stopColor="#047857" />
        </linearGradient>
        <linearGradient id="nutr-st-sec" x1="8" y1="14" x2="28" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop stopColor="#6d28d9" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="20" fill="url(#nutr-st-bg)" />
      <circle cx="17" cy="19" r="4.5" fill="url(#nutr-st-sec)" fillOpacity="0.8" />
      <path d="M10 33 C10 28 14 26 17 26 C20 26 24 28 24 33" fill="url(#nutr-st-sec)" fillOpacity="0.6" />
      <circle cx="29" cy="17" r="5.5" fill="url(#nutr-st-brand)" />
      <path d="M20 34 C20 28.5 24.5 25.5 29 25.5 C33.5 25.5 38 28.5 38 34" fill="url(#nutr-st-brand)" />
    </svg>
  );
}

export function DashboardNutritionistView({
  consultancySlug,
  recentPlans,
  totalPlans,
}: DashboardNutritionistViewProps) {
  const activePlansCount = recentPlans?.filter((p) => p.status === "ACTIVE").length || 0;
  const draftPlansCount = recentPlans?.filter((p) => p.status === "DRAFT").length || 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. HERO PROTAGONISTA: WORKSPACE NUTRICIONAL */}
      <div className="relative overflow-hidden p-6 sm:p-7 rounded-3xl border border-[var(--brand-soft-border)] bg-[var(--surface)] shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 p-1 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <NutritionWorkspaceVolumetricIcon className="w-12 h-12 sm:w-14 sm:h-14" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-wider">
                  Espaço Nutricional
                </span>
                {typeof totalPlans === "number" && totalPlans > 0 && (
                  <Badge variant="brand" size="sm">
                    {totalPlans} {totalPlans === 1 ? "plano total" : "planos totais"}
                  </Badge>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Prescrição Alimentar
              </h2>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-xl">
                Elabore cardápios personalizados, estruture refeições e oriente a alimentação dos seus alunos.
              </p>

              {/* Status Chips */}
              {recentPlans && recentPlans.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  {activePlansCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-subtle)] px-2.5 py-1 rounded-full border border-[var(--border-subtle)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                      {activePlansCount} {activePlansCount === 1 ? "ativo" : "ativos"}
                    </span>
                  )}
                  {draftPlansCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--surface-subtle)] px-2.5 py-1 rounded-full border border-[var(--border-subtle)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {draftPlansCount} {draftPlansCount === 1 ? "rascunho" : "rascunhos"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 pt-2 md:pt-0">
            <Link href={`/consultoria/${consultancySlug}/nutricao/planos/novo`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full sm:w-auto font-bold min-h-[44px] shadow-sm">
                + Novo plano alimentar
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/nutricao/planos`} className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full sm:w-auto font-semibold min-h-[44px]">
                Ver todos
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. FILA DE PRESCRIÇÕES / PLANOS RECENTES */}
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
            href={`/consultoria/${consultancySlug}/nutricao/planos`}
            className="text-xs font-bold text-[var(--brand)] hover:underline"
          >
            Gerenciar todos os planos →
          </Link>
        </div>

        {recentPlans && recentPlans.length > 0 ? (
          <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
            {recentPlans.map((plan) => (
              <Link
                key={plan.publicId}
                href={`/consultoria/${consultancySlug}/nutricao/planos`}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[var(--surface-hover)] transition-all duration-150 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                      {plan.studentName || "Aluno"}
                    </span>
                    <Badge
                      variant={plan.status === "ACTIVE" ? "success" : plan.status === "DRAFT" ? "warning" : "neutral"}
                      size="sm"
                    >
                      {plan.status === "ACTIVE" ? "Ativo" : plan.status === "DRAFT" ? "Rascunho" : "Arquivado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                    {plan.title} • {plan.mealsCount || 0} {plan.mealsCount === 1 ? "refeição" : "refeições"}
                  </p>
                </div>

                <div className="shrink-0 text-xs font-bold text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all flex items-center gap-1">
                  <span>Abrir</span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 sm:p-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs">
            <div className="inline-flex p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <NutritionWorkspaceVolumetricIcon className="w-10 h-10" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Nenhum plano alimentar cadastrado
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Inicie a prescrição nutricional elaborando um cardápio para um aluno.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/nutricao/planos/novo`}>
              <Button variant="secondary" size="sm" className="font-semibold min-h-[44px]">
                Criar primeiro plano alimentar
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 3. MÓDULOS DE APOIO / FERRAMENTAS DO NUTRICIONISTA */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
          Ferramentas do Nutricionista
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Tabela TACO & Alimentos */}
          <Link
            href={`/consultoria/${consultancySlug}/nutricao/alimentos`}
            className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex items-center gap-3.5"
          >
            <div className="shrink-0">
              <FoodLibraryVolumetricIcon className="w-10 h-10" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Tabela TACO
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                Catálogo de alimentos
              </p>
            </div>
          </Link>

          {/* Evolução dos Alunos */}
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex items-center gap-3.5"
          >
            <div className="shrink-0">
              <StudentProgressVolumetricIcon className="w-10 h-10" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Evolução
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                Pesos e medições
              </p>
            </div>
          </Link>

          {/* Alunos Vinculados */}
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex items-center gap-3.5"
          >
            <div className="shrink-0">
              <StudentsGroupVolumetricIcon className="w-10 h-10" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Alunos
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                Membros da consultoria
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
