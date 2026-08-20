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

export function DashboardInfluencerView({
  consultancySlug,
  missions,
  totalMissions,
  activeTrainingPlan,
  activeNutritionPlan,
}: DashboardInfluencerViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Bloco Prioritário P0: Missões do Influenciador */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Suas Missões Atribuídas
            </h2>
            <Badge variant="brand" size="sm">
              VIP
            </Badge>
            {typeof totalMissions === "number" && totalMissions > 0 && (
              <Badge variant="neutral" size="sm">
                {totalMissions} {totalMissions === 1 ? "missão" : "missões"}
              </Badge>
            )}
          </div>

          <Link
            href={`/consultoria/${consultancySlug}/missoes`}
            className="text-xs font-semibold text-[var(--brand)] hover:underline"
          >
            Ver todas
          </Link>
        </div>

        {missions && missions.length > 0 ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
            {missions.map((mission) => (
              <Link
                key={mission.publicId}
                href={`/consultoria/${consultancySlug}/missoes`}
                className="p-4 flex items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition-colors group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                      {mission.title}
                    </span>
                    <Badge
                      variant={MISSION_STATUS_VARIANTS[mission.status] || "neutral"}
                      size="sm"
                    >
                      {MISSION_STATUS_LABELS[mission.status] || mission.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Prazo: {mission.formattedDueAt}
                  </p>
                </div>

                <div className="shrink-0 text-xs font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--brand)] flex items-center gap-1">
                  <span>Detalhes</span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-2">
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Você não possui missões pendentes no momento.
            </p>
            <Link href={`/consultoria/${consultancySlug}/missoes`}>
              <Button variant="secondary" size="sm">
                Acessar central de missões
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 2. Bloco Secundário: Seu Acompanhamento Pessoal */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
          Seu Acompanhamento
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Treinos */}
          <Link
            href={`/consultoria/${consultancySlug}/treinos`}
            className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Treinos
                </h4>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {activeTrainingPlan ? activeTrainingPlan.title : "Ficha prescrita"}
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1">
              <span>Acessar</span>
              <span>→</span>
            </div>
          </Link>

          {/* Nutrição */}
          <Link
            href={`/consultoria/${consultancySlug}/nutricao`}
            className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Nutrição
                </h4>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {activeNutritionPlan ? activeNutritionPlan.title : "Cardápio prescrito"}
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1">
              <span>Acessar</span>
              <span>→</span>
            </div>
          </Link>

          {/* Evolução */}
          <Link
            href={`/consultoria/${consultancySlug}/progresso`}
            className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] transition-all group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                  Evolução
                </h4>
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  Medidas e histórico
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-[var(--brand)] flex items-center gap-1">
              <span>Acessar</span>
              <span>→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
