import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface PersonalWorkoutSummaryItem {
  publicId: string;
  title: string;
  subtitle?: string | null;
  status: string;
  difficultyLevel?: string | null;
  blocksCount?: number;
  currentVersionStatus?: string | null;
}

interface DashboardPersonalViewProps {
  consultancySlug: string;
  recentPlans: PersonalWorkoutSummaryItem[];
  totalPlans?: number;
}

// ============================================================================
// LINEAR ICONS — GLOBAL UI DIRECTION V2 (Monochrome with controlled brand tint)
// ============================================================================

function WorkoutIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14m-7-7h14" />
    </svg>
  );
}

function TemplatesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ClipboardListIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function ExerciseLibraryIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 9h6M9 13h6M9 17h4" />
    </svg>
  );
}

function ProgressIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function ConsultationIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 10l5-3v10l-5-3v-4z" />
      <rect x="2" y="6" width="13" height="12" rx="3" />
    </svg>
  );
}

function LayersIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function DashboardPersonalView({
  consultancySlug,
  recentPlans,
  totalPlans = 0,
}: DashboardPersonalViewProps) {
  const quickActions = [
    {
      href: `/consultoria/${consultancySlug}/rotinas/novo`,
      title: "Novo Treino",
      description: "Criar rotina modular em blocos",
      icon: PlusIcon,
      accent: true,
    },
    {
      href: `/consultoria/${consultancySlug}/rotinas?tab=templates`,
      title: "Modelos",
      description: "Rotinas base reutilizáveis",
      icon: TemplatesIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/rotinas?tab=assignments`,
      title: "Prescrições",
      description: "Treinos atribuídos a alunos",
      icon: ClipboardListIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/exercicios`,
      title: "Biblioteca",
      description: "Catálogo de exercícios e vídeos",
      icon: ExerciseLibraryIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/progresso/alunos`,
      title: "Evolução",
      description: "Histórico e métricas dos alunos",
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
      {/* 1. HERO OPERACIONAL V2 (Superfície limpa, respiro e proporção elegante) */}
      <div className="p-5 sm:p-6 md:p-7 rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs relative overflow-hidden depth-surface">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--brand)] shrink-0 shadow-2xs">
              <WorkoutIcon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                  Módulo de Treinamento
                </span>
                <Badge variant="brand" size="sm">
                  Personal Trainer
                </Badge>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Cockpit de Treinos
              </h2>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-xl leading-relaxed">
                Prescreva rotinas personalizadas, gerencie modelos modulares e acompanhe a evolução dos alunos vinculados.
              </p>

              {totalPlans > 0 && (
                <div className="flex items-center gap-2 pt-1 text-xs font-semibold text-[var(--text-secondary)]">
                  <span>
                    Total cadastrado: <strong className="text-[var(--text-primary)] font-bold">{totalPlans}</strong> {totalPlans === 1 ? "rotina" : "rotinas"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 pt-2 md:pt-0">
            <Link href={`/consultoria/${consultancySlug}/rotinas/novo`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full sm:w-auto font-bold min-h-[44px] shadow-sm flex items-center justify-center gap-2">
                <PlusIcon className="w-4 h-4" />
                <span>Novo Treino</span>
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/rotinas`} className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full sm:w-auto font-semibold min-h-[44px]">
                Ver todos
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. QUICK ACTIONS (Cards em formato canônico V2: [ícone] Título, descrição curta, chevron) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Acesso Rápido
          </h3>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
            Atalhos operacionais
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center justify-between gap-3.5 p-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] shadow-xs hover:shadow-sm transition-all duration-150 min-h-[64px] depth-interactive"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--brand)] shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                      {action.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                      {action.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all">
                  <ChevronRightIcon className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 3. TREINOS RECENTES (Linear Dense List com Statuses Reais e Badges) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Treinos Recentes
            </h3>
            {recentPlans && recentPlans.length > 0 && (
              <span className="text-xs font-semibold text-[var(--text-tertiary)]">
                ({recentPlans.length})
              </span>
            )}
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/rotinas`}
            className="text-xs font-semibold text-[var(--brand)] hover:underline flex items-center gap-1"
          >
            <span>Gerenciar todos</span>
            <span>→</span>
          </Link>
        </div>

        {recentPlans && recentPlans.length > 0 ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden depth-surface">
            {recentPlans.map((plan) => {
              const isPublished = plan.status === "ACTIVE" || plan.currentVersionStatus === "PUBLISHED";
              return (
                <Link
                  key={plan.publicId}
                  href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                  className="p-4 sm:p-4.5 flex items-center justify-between gap-4 hover:bg-[var(--surface-hover)] transition-all duration-150 group depth-interactive"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                        {plan.title}
                      </span>
                      <Badge
                        variant={isPublished ? "success" : "warning"}
                        size="sm"
                      >
                        {isPublished ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium truncate">
                      {plan.subtitle ? (
                        <span>{plan.subtitle}</span>
                      ) : plan.difficultyLevel ? (
                        <span>Nível {plan.difficultyLevel}</span>
                      ) : (
                        <span>Rotina de treino</span>
                      )}

                      {plan.blocksCount != null && plan.blocksCount > 0 && (
                        <>
                          <span className="text-[var(--text-tertiary)]">•</span>
                          <span className="inline-flex items-center gap-1">
                            <LayersIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                            {plan.blocksCount} {plan.blocksCount === 1 ? "bloco" : "blocos"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-xs font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all flex items-center gap-1">
                    <span className="hidden sm:inline">Abrir</span>
                    <span>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-8 sm:p-10 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs depth-surface">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
              <WorkoutIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Nenhum treino cadastrado
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Comece criando uma rotina modular personalizada para os alunos vinculados.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
              <Button variant="secondary" size="sm" className="font-semibold min-h-[44px]">
                Criar primeiro treino
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
