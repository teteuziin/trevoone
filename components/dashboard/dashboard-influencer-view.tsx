import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MissionListItemView } from "@/lib/consultancies/missions";
import type { TrainingPlanDto } from "@/lib/consultancies/training";
import type { NutritionPlanDto } from "@/lib/consultancies/nutrition";

interface DashboardInfluencerViewProps {
  consultancySlug: string;
  missions: MissionListItemView[];
  totalMissions?: number;
  activeTrainingPlan?: TrainingPlanDto | null;
  activeNutritionPlan?: NutritionPlanDto | null;
}

const MISSION_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: "Atribuída",
  IN_PROGRESS: "Em andamento",
  SUBMITTED: "Enviada",
  APPROVED: "Aprovada",
  REVISION_REQUESTED: "Revisão solicitada",
  CANCELED: "Cancelada",
};

const MISSION_STATUS_VARIANTS: Record<string, "brand" | "warning" | "success" | "neutral" | "danger"> = {
  ASSIGNED: "brand",
  IN_PROGRESS: "warning",
  SUBMITTED: "brand",
  APPROVED: "success",
  REVISION_REQUESTED: "danger",
  CANCELED: "neutral",
};

const MISSION_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
};

function MissionVolumetricIcon({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="infl-grad-bg" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" stopOpacity="0.22" />
          <stop stopColor="#f59e0b" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="infl-grad-gold" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="infl-grad-brand" x1="20" y1="16" x2="44" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" />
          <stop stopColor="#047857" />
        </linearGradient>
        <linearGradient id="infl-grad-target" x1="18" y1="18" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--surface)" />
          <stop stopColor="var(--surface-subtle)" />
        </linearGradient>
      </defs>

      {/* Ambient glow */}
      <circle cx="32" cy="32" r="28" fill="url(#infl-grad-bg)" />

      {/* Target Base Plate */}
      <circle cx="32" cy="32" r="22" fill="url(#infl-grad-target)" stroke="var(--border-default)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="16" fill="var(--surface)" stroke="var(--brand-soft-border)" strokeWidth="1.2" />

      {/* Inner Target Core */}
      <circle cx="32" cy="32" r="10" fill="url(#infl-grad-brand)" />

      {/* Golden VIP Star Overlay */}
      <path
        d="M32 23 L34.5 29 L41 29.5 L36 34 L37.5 40.5 L32 37 L26.5 40.5 L28 34 L23 29.5 L29.5 29 Z"
        fill="url(#infl-grad-gold)"
      />
    </svg>
  );
}

function TrainingSupportVolumetricIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="infl-t-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" stopOpacity="0.2" />
          <stop stopColor="var(--brand)" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="infl-t-brand" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" />
          <stop stopColor="#059669" />
        </linearGradient>
        <linearGradient id="infl-t-metal" x1="16" y1="20" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#cbd5e1" />
          <stop stopColor="#64748b" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="20" fill="url(#infl-t-bg)" />
      <g transform="rotate(-30 24 24)">
        <rect x="14" y="22" width="20" height="4" rx="2" fill="url(#infl-t-metal)" />
        <rect x="10" y="16" width="4" height="16" rx="2" fill="url(#infl-t-brand)" />
        <rect x="34" y="16" width="4" height="16" rx="2" fill="url(#infl-t-brand)" />
        <rect x="15" y="18" width="2" height="12" rx="1" fill="var(--surface)" fillOpacity="0.7" />
        <rect x="31" y="18" width="2" height="12" rx="1" fill="var(--surface)" fillOpacity="0.7" />
      </g>
    </svg>
  );
}

function NutritionSupportVolumetricIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="infl-n-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" stopOpacity="0.2" />
          <stop stopColor="var(--brand)" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id="infl-n-plate" x1="12" y1="14" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--surface)" />
          <stop stopColor="var(--surface-subtle)" />
        </linearGradient>
        <linearGradient id="infl-n-leaf" x1="18" y1="12" x2="32" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop stopColor="#059669" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="20" fill="url(#infl-n-bg)" />
      <circle cx="24" cy="25" r="14" fill="url(#infl-n-plate)" stroke="var(--border-default)" strokeWidth="1.5" />
      <circle cx="24" cy="25" r="9" fill="var(--surface)" stroke="var(--border-subtle)" strokeWidth="1" />
      <path d="M24 19 C24 16 28 15 29.5 15 C29.5 16.5 28.5 19.5 26 19.5 C25 19.5 24 19.2 24 19 Z" fill="url(#infl-n-leaf)" />
    </svg>
  );
}

function ProgressSupportVolumetricIcon({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="infl-p-bg" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" stopOpacity="0.2" />
          <stop stopColor="var(--brand)" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="infl-p-blue" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="infl-p-brand" x1="20" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" />
          <stop stopColor="#059669" />
        </linearGradient>
      </defs>

      <circle cx="24" cy="24" r="20" fill="url(#infl-p-bg)" />
      <rect x="12" y="28" width="6" height="10" rx="2" fill="url(#infl-p-blue)" fillOpacity="0.7" />
      <rect x="21" y="21" width="6" height="17" rx="2" fill="url(#infl-p-blue)" />
      <rect x="30" y="14" width="6" height="24" rx="2" fill="url(#infl-p-brand)" />
      <path d="M14 26 L23 18 L33 11" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="33" cy="11" r="2.5" fill="var(--surface)" stroke="var(--brand)" strokeWidth="2" />
    </svg>
  );
}

export function DashboardInfluencerView({
  consultancySlug,
  missions,
  totalMissions,
  activeTrainingPlan,
  activeNutritionPlan,
}: DashboardInfluencerViewProps) {
  const lateMission = missions?.find((m) => m.isLate);
  const activeMissions = missions?.filter((m) => m.status !== "APPROVED" && m.status !== "CANCELED") || [];
  const primaryMission = activeMissions[0] || missions?.[0];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. ALERTA P0: MISSÃO ATRASADA (Se isLate for verdadeiro) */}
      {lateMission && (
        <div className="p-4.5 sm:p-5 rounded-3xl border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1" />
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  Prazo Excedido
                </span>
                <Badge variant="danger" size="sm">
                  Atrasada
                </Badge>
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                {lateMission.title}
              </p>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Vencimento: {lateMission.formattedDueAt}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <Link href={`/consultoria/${consultancySlug}/missoes`}>
              <Button variant="danger" size="sm" className="w-full sm:w-auto font-bold min-h-[44px]">
                Submeter missão →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 2. HERO PROTAGONISTA: CENTRAL DE MISSÕES VIP */}
      <div className="relative overflow-hidden p-6 sm:p-7 rounded-3xl border border-[var(--brand-soft-border)] bg-[var(--surface)] shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 p-1 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <MissionVolumetricIcon className="w-12 h-12 sm:w-14 sm:h-14" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-[var(--brand)] uppercase tracking-wider">
                  Painel de Parceria VIP
                </span>
                <Badge variant="brand" size="sm">
                  Influenciador
                </Badge>
                {typeof totalMissions === "number" && totalMissions > 0 && (
                  <Badge variant="neutral" size="sm">
                    {totalMissions} {totalMissions === 1 ? "missão" : "missões"}
                  </Badge>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Suas Missões & Atividades
              </h2>

              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium max-w-xl">
                Cumpra as diretrizes de divulgação, registre evidências e acompanhe suas entregas oficiais na consultoria.
              </p>

              {/* Status Preview */}
              {primaryMission && (
                <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-bold text-[var(--text-secondary)]">Destaque:</span>
                  <span className="font-semibold text-[var(--text-primary)] truncate max-w-xs sm:max-w-sm">
                    {primaryMission.title}
                  </span>
                  <Badge
                    variant={MISSION_STATUS_VARIANTS[primaryMission.status] || "neutral"}
                    size="sm"
                  >
                    {MISSION_STATUS_LABELS[primaryMission.status] || primaryMission.status}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 pt-2 md:pt-0">
            <Link href={`/consultoria/${consultancySlug}/missoes`}>
              <Button variant="primary" size="md" className="w-full sm:w-auto font-bold min-h-[44px] shadow-sm">
                Acessar central de missões →
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. FILA DE MISSÕES ATRIBUÍDAS */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Fila de Missões
            </h3>
            {missions && missions.length > 0 && (
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                ({missions.length})
              </span>
            )}
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/missoes`}
            className="text-xs font-bold text-[var(--brand)] hover:underline"
          >
            Ver todas as missões →
          </Link>
        </div>

        {missions && missions.length > 0 ? (
          <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
            {missions.map((mission) => (
              <Link
                key={mission.publicId}
                href={`/consultoria/${consultancySlug}/missoes`}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[var(--surface-hover)] transition-all duration-150 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                      {mission.title}
                    </span>
                    <Badge
                      variant={MISSION_STATUS_VARIANTS[mission.status] || "neutral"}
                      size="sm"
                    >
                      {MISSION_STATUS_LABELS[mission.status] || mission.status}
                    </Badge>
                    {mission.priority && mission.priority !== "NORMAL" && (
                      <Badge
                        variant={mission.priority === "HIGH" ? "warning" : "neutral"}
                        size="sm"
                      >
                        {MISSION_PRIORITY_LABELS[mission.priority] || mission.priority}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    Prazo de entrega: {mission.formattedDueAt}
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
              <MissionVolumetricIcon className="w-10 h-10" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Nenhuma missão pendente
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Novas diretrizes e metas de divulgação aparecerão aqui assim que atribuídas.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/missoes`}>
              <Button variant="secondary" size="sm" className="font-semibold min-h-[44px]">
                Acessar histórico de missões
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 4. MÓDULOS DE APOIO: SEU ACOMPANHAMENTO VIP */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] px-1">
          Seu Acompanhamento Pessoal
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Treinos */}
          <Link
            href={`/consultoria/${consultancySlug}/treinos`}
            className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex items-center gap-3.5"
          >
            <div className="shrink-0">
              <TrainingSupportVolumetricIcon className="w-10 h-10" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Treinos
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                {activeTrainingPlan ? activeTrainingPlan.title : "Rotinas prescritas"}
              </p>
            </div>
          </Link>

          {/* Nutrição */}
          <Link
            href={`/consultoria/${consultancySlug}/nutricao`}
            className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex items-center gap-3.5"
          >
            <div className="shrink-0">
              <NutritionSupportVolumetricIcon className="w-10 h-10" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Nutrição
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                {activeNutritionPlan ? activeNutritionPlan.title : "Plano alimentar"}
              </p>
            </div>
          </Link>

          {/* Evolução */}
          <Link
            href={`/consultoria/${consultancySlug}/progresso`}
            className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex items-center gap-3.5"
          >
            <div className="shrink-0">
              <ProgressSupportVolumetricIcon className="w-10 h-10" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Evolução
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                Medidas e histórico
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
