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

function PersonalWorkspaceVolumetricIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pers-grad-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" stopOpacity="0.22" />
          <stop stopColor="var(--brand)" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="pers-grad-sheet" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--surface)" />
          <stop stopColor="var(--surface-subtle)" />
        </linearGradient>
        <linearGradient id="pers-grad-brand" x1="20" y1="16" x2="44" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" />
          <stop stopColor="#059669" />
        </linearGradient>
        <linearGradient id="pers-grad-metal" x1="26" y1="20" x2="38" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#94a3b8" />
          <stop stopColor="#64748b" />
        </linearGradient>
      </defs>

      {/* Base glow circle */}
      <circle cx="32" cy="32" r="28" fill="url(#pers-grad-bg)" />

      {/* Prescription Clipboard / Sheet Base */}
      <rect x="15" y="13" width="34" height="42" rx="6" fill="url(#pers-grad-sheet)" stroke="var(--border-default)" strokeWidth="1.5" />
      <rect x="18" y="16" width="28" height="36" rx="4" fill="var(--surface)" />

      {/* Top Clipboard Clip */}
      <rect x="25" y="10" width="14" height="6" rx="2" fill="url(#pers-grad-brand)" />
      <circle cx="32" cy="13" r="1.5" fill="var(--surface)" />

      {/* Training Sheet Lines */}
      <rect x="22" y="22" width="20" height="2.5" rx="1.25" fill="var(--brand)" fillOpacity="0.85" />
      <rect x="22" y="27" width="14" height="2" rx="1" fill="var(--text-tertiary)" fillOpacity="0.6" />
      <rect x="22" y="32" width="18" height="2" rx="1" fill="var(--text-tertiary)" fillOpacity="0.6" />

      {/* Stylized Mini Dumbbell Badge on Bottom Right */}
      <g transform="translate(32, 34)">
        <rect x="0" y="4" width="20" height="18" rx="5" fill="var(--surface)" stroke="var(--border-default)" strokeWidth="1.2" />
        {/* Dumbbell bar */}
        <rect x="4" y="12" width="12" height="2" rx="1" fill="url(#pers-grad-metal)" />
        {/* Left weight plate */}
        <rect x="4" y="8" width="3" height="10" rx="1.5" fill="url(#pers-grad-brand)" />
        {/* Right weight plate */}
        <rect x="13" y="8" width="3" height="10" rx="1.5" fill="url(#pers-grad-brand)" />
      </g>
    </svg>
  );
}

function ExerciseLibraryVolumetricIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ex-grad-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" stopOpacity="0.2" />
          <stop stopColor="var(--brand)" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="ex-grad-brand" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" />
          <stop stopColor="#059669" />
        </linearGradient>
        <linearGradient id="ex-grad-metal" x1="16" y1="20" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#cbd5e1" />
          <stop stopColor="#64748b" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="20" fill="url(#ex-grad-bg)" />
      <g transform="rotate(-30 24 24)">
        {/* Dumbbell Bar */}
        <rect x="14" y="22" width="20" height="4" rx="2" fill="url(#ex-grad-metal)" />
        {/* Outer plates */}
        <rect x="10" y="16" width="4" height="16" rx="2" fill="url(#ex-grad-brand)" />
        <rect x="34" y="16" width="4" height="16" rx="2" fill="url(#ex-grad-brand)" />
        {/* Inner plates */}
        <rect x="15" y="18" width="2" height="12" rx="1" fill="var(--surface)" fillOpacity="0.7" />
        <rect x="31" y="18" width="2" height="12" rx="1" fill="var(--surface)" fillOpacity="0.7" />
      </g>
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
        <linearGradient id="prog-grad-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" stopOpacity="0.2" />
          <stop stopColor="var(--brand)" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="prog-grad-blue" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="prog-grad-brand" x1="20" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" />
          <stop stopColor="#059669" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="20" fill="url(#prog-grad-bg)" />
      {/* Bars */}
      <rect x="12" y="28" width="6" height="10" rx="2" fill="url(#prog-grad-blue)" fillOpacity="0.7" />
      <rect x="21" y="21" width="6" height="17" rx="2" fill="url(#prog-grad-blue)" />
      <rect x="30" y="14" width="6" height="24" rx="2" fill="url(#prog-grad-brand)" />
      {/* Trending line */}
      <path d="M14 26 L23 18 L33 11" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="33" cy="11" r="2.5" fill="var(--surface)" stroke="var(--brand)" strokeWidth="2" />
    </svg>
  );
}

function StudentsGroupVolumetricIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="#8b5cf6" fillOpacity="0.08" />
      <circle cx="20" cy="18" r="5" stroke="#8b5cf6" strokeWidth="2.5" />
      <path
        d="M11 32C11 27.5817 15.0294 24 20 24C24.9706 24 29 27.5817 29 32"
        stroke="#8b5cf6"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="31" cy="19" r="3.5" stroke="#a78bfa" strokeWidth="2" />
      <path
        d="M31 26C33.7614 26 36 28.2386 36 31"
        stroke="#a78bfa"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DashboardPersonalView({
  consultancySlug,
  recentPlans,
  totalPlans = 0,
}: DashboardPersonalViewProps) {
  const activePlansCount = recentPlans.filter((p) => p.status === "ACTIVE" || p.currentVersionStatus === "PUBLISHED").length;
  const draftPlansCount = recentPlans.filter((p) => p.status === "DRAFT" || p.currentVersionStatus === "DRAFT").length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. HERO OPERACIONAL DO PERSONAL */}
      <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="shrink-0 p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <PersonalWorkspaceVolumetricIcon className="w-12 h-12" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-wider">
                  Módulo de Treinamento
                </span>
                <Badge variant="brand" size="sm">
                  Personal Trainer
                </Badge>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Gestão de Treinos
              </h2>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-xl">
                Crie prescrições sob medida, organize rotinas e acompanhe a execução dos seus alunos vinculados.
              </p>

              {totalPlans > 0 && (
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <span>
                    Total: <strong className="text-[var(--text-primary)] font-bold">{totalPlans}</strong> {totalPlans === 1 ? "treino" : "treinos"}
                  </span>
                  {activePlansCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {activePlansCount} {activePlansCount === 1 ? "publicado" : "publicados"}
                    </span>
                  )}
                  {draftPlansCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {draftPlansCount} {draftPlansCount === 1 ? "rascunho" : "rascunhos"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 pt-2 md:pt-0">
            <Link href={`/consultoria/${consultancySlug}/rotinas/novo`} className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="w-full sm:w-auto font-bold min-h-[44px] shadow-sm">
                + Novo Treino
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

      {/* 2. FILA DE PRESCRIÇÕES / TREINOS RECENTES */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Treinos Recentes
            </h3>
            {recentPlans && recentPlans.length > 0 && (
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                ({recentPlans.length})
              </span>
            )}
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/rotinas`}
            className="text-xs font-bold text-[var(--brand)] hover:underline"
          >
            Gerenciar todos os treinos →
          </Link>
        </div>

        {recentPlans && recentPlans.length > 0 ? (
          <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
            {recentPlans.map((plan) => (
              <Link
                key={plan.publicId}
                href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[var(--surface-hover)] transition-all duration-150 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                      {plan.title}
                    </span>
                    <Badge
                      variant={plan.status === "ACTIVE" || plan.currentVersionStatus === "PUBLISHED" ? "success" : "warning"}
                      size="sm"
                    >
                      {plan.status === "ACTIVE" || plan.currentVersionStatus === "PUBLISHED" ? "Publicado" : "Rascunho"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                    {plan.subtitle || (plan.difficultyLevel ? `Nível ${plan.difficultyLevel}` : "Rotina de treino")}
                    {plan.blocksCount != null ? ` • ${plan.blocksCount} ${plan.blocksCount === 1 ? "bloco" : "blocos"}` : ""}
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
              <PersonalWorkspaceVolumetricIcon className="w-10 h-10" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Nenhum treino cadastrado
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Comece criando uma rotina personalizada para os alunos vinculados.
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

      {/* 3. MÓDULOS DE APOIO / QUICK ACTIONS PROFISSIONAIS */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
          Ferramentas do Personal
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Biblioteca de Exercícios */}
          <Link
            href={`/consultoria/${consultancySlug}/exercicios`}
            className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex items-center gap-3.5"
          >
            <div className="shrink-0">
              <ExerciseLibraryVolumetricIcon className="w-10 h-10" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Biblioteca de Exercícios
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                Catálogo de movimentos
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
                Medições dos alunos
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
