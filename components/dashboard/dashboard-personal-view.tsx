import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZapIcon as Zap } from "@/components/ui/icons";

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
// ICONS — PERSONAL COCKPIT (Clean, high-contrast, linear precision)
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
      description: "Montagem modular em blocos",
      badge: "Criar",
      icon: PlusIcon,
      accent: true,
    },
    {
      href: `/consultoria/${consultancySlug}/rotinas?tab=templates`,
      title: "Modelos Base",
      description: "Estruturas reutilizáveis",
      badge: "Templates",
      icon: TemplatesIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/rotinas?tab=assignments`,
      title: "Prescrições",
      description: "Treinos ativos dos alunos",
      badge: "Alunos",
      icon: ClipboardListIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/exercicios`,
      title: "Biblioteca",
      description: "Catálogo de exercícios e vídeos",
      badge: "Exercícios",
      icon: ExerciseLibraryIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/progresso/alunos`,
      title: "Evolução",
      description: "Cargas, histórico e medições",
      badge: "Métricas",
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
      {/* 1. HERO COCKPIT DE PERFORMANCE */}
      <div className="relative rounded-3xl border border-[var(--border-default)] overflow-hidden shadow-xs depth-surface bg-[var(--surface)]">
        {/* Visual Backdrop Overlay with Real Coach Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/personal/coach-cockpit.jpg"
            alt=""
            aria-hidden="true"
            unoptimized
            fill
            priority
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
            className="object-cover object-center opacity-15 dark:opacity-25 filter grayscale contrast-125"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--surface)] via-[var(--surface)]/95 to-[var(--surface)]/60" />
        </div>

        <div className="relative z-10 p-5 sm:p-7 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--brand)] text-white shadow-2xs">
                Painel do Personal
              </span>
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                Personal Trainer
              </span>
              {totalPlans > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]">
                  {totalPlans} {totalPlans === 1 ? "rotina cadastrada" : "rotinas cadastradas"}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Central de Prescrição & Alunos
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                Controle rotinas em blocos, gerencie modelos modulares, acompanhe a evolução de cargas e realize teleconsultas com seus alunos.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link href={`/consultoria/${consultancySlug}/rotinas/novo`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full font-bold min-h-[44px] shadow-sm flex items-center justify-center gap-2">
                <PlusIcon className="w-4 h-4" />
                <span>Novo Treino</span>
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/rotinas`} className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full font-semibold min-h-[44px]">
                Ver Todos
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL QUICK ACCESS (Snap Rail on mobile: 74vw cards, grid on desktop) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Operação Rápida
          </h2>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium hidden sm:inline">
            Atalhos diretos do treinador
          </span>
        </div>

        {/* Horizontal Rail: overflow-x confined strictly to the rail */}
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`w-[74vw] max-w-[280px] shrink-0 sm:w-auto sm:max-w-none snap-center p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 group depth-interactive ${action.accent
                    ? "bg-[var(--surface-subtle)] border-[var(--brand)]/40 hover:border-[var(--brand)] shadow-2xs"
                    : "bg-[var(--surface)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] shadow-xs"
                  }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${action.accent
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)]"
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                        {action.title}
                      </p>
                    </div>
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

      {/* 3. ROTINAS RECENTES (84vw Snap Cards on Mobile, 2-column on Desktop) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Rotinas & Prescrições Recentes
            </h2>
            {recentPlans && recentPlans.length > 0 && (
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                ({recentPlans.length})
              </span>
            )}
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/rotinas`}
            className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1 min-h-[44px] sm:min-h-0 items-center"
          >
            <span>Gerenciar catálogo</span>
            <span>→</span>
          </Link>
        </div>

        {recentPlans && recentPlans.length > 0 ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-2 sm:overflow-visible">
            {recentPlans.map((plan) => {
              const isPublished = plan.status === "ACTIVE" || plan.currentVersionStatus === "PUBLISHED";
              return (
                <div
                  key={plan.publicId}
                  className="w-[84vw] max-w-[380px] shrink-0 sm:w-auto sm:max-w-none snap-center p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs hover:border-[var(--brand)] transition-all flex flex-col justify-between space-y-4 depth-surface"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant={isPublished ? "success" : "warning"}
                        size="sm"
                      >
                        {isPublished ? "Publicado" : "Rascunho"}
                      </Badge>
                      {plan.difficultyLevel && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {plan.difficultyLevel === "BEGINNER"
                            ? "Iniciante"
                            : plan.difficultyLevel === "ADVANCED"
                              ? "Avançado"
                              : "Intermediário"}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] line-clamp-1">
                        {plan.title}
                      </h3>
                      {plan.subtitle && (
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                          {plan.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
                      {plan.blocksCount != null && plan.blocksCount > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <LayersIcon className="w-3.5 h-3.5 text-[var(--brand)]" />
                          <strong className="text-[var(--text-primary)]">{plan.blocksCount}</strong>{" "}
                          {plan.blocksCount === 1 ? "bloco modular" : "blocos modulares"}
                        </span>
                      ) : (
                        <span>Ficha modular</span>
                      )}
                    </div>

                    <Link
                      href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] shadow-xs transition-all min-h-[44px] depth-interactive cursor-pointer"
                    >
                      Abrir Editor de Treino →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 sm:p-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs depth-surface">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
              <WorkoutIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Nenhum treino cadastrado
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Comece criando uma rotina modular personalizada para os alunos vinculados à sua consultoria.
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

      {/* 4. PERFORMANCE PROTOCOL CARD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Zap className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
              Acompanhamento de Séries e Cargas
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xl">
            As alterações de séries, repetições e cargas que você definir entram em vigor imediatamente no celular do seu aluno.
          </p>
        </div>
        <div className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          Atualização Instantânea
        </div>
      </div>
    </div>
  );
}
