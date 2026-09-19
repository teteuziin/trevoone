"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { EvolutionTimeline } from "./evolution-timeline";
import { EvolutionComparator } from "./evolution-comparator";
import { EvolutionCharts } from "./evolution-charts";
import { StudentProgressForm } from "@/components/consultancies/student-progress-form";
import { StudentPhotoEvaluationHub } from "@/components/consultancies/photos/student-photo-evaluation-hub";
import { ProfessionalPhotoEvaluationHub } from "@/components/consultancies/photos/professional-photo-evaluation-hub";
import type {
  EvolutionHubDataDto,
  EvolutionComparisonDataDto,
} from "@/types/evolution";
import type {
  PhotoEvaluationRequestDto,
  PhotoEvaluationComparisonDto,
} from "@/types/photo-evaluations";

interface Evolution360HubProps {
  consultancySlug: string;
  hubData: EvolutionHubDataDto;
  initialComparisonData: EvolutionComparisonDataDto | null;
  // Professional vs Student context
  isStudent?: boolean;
  isPersonal?: boolean;
  isNutritionist?: boolean;
  isAdmin?: boolean;
  studentPublicId?: string;
  // Photo Hub data for dedicated photo operations (upload/consent/review)
  rawPhotoData?: {
    activeRequest?: PhotoEvaluationRequestDto | null;
    history?: PhotoEvaluationRequestDto[];
    requests?: PhotoEvaluationRequestDto[];
    comparisonData?: PhotoEvaluationComparisonDto | null;
  } | null;
}

export function Evolution360Hub({
  consultancySlug,
  hubData,
  initialComparisonData,
  isStudent = false,
  isPersonal = false,
  studentPublicId,
  rawPhotoData,
}: Evolution360HubProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "comparar" | "graficos" | "fotos">("timeline");

  const { summary, milestones, student, activePendingPhotoRequest, chartSeries } = hubData;

  // Handle clicking "Comparar" on a specific milestone card
  const handleSelectMilestoneForComparison = () => {
    setActiveTab("comparar");
  };

  const hasMultipleMilestones = milestones.length > 1;

  return (
    <div className="space-y-6">
      {/* Top 360° Evolution Summary Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4 border-specular-t depth-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-foreground)] bg-[var(--brand-soft)] px-2 py-0.5 rounded-md border border-[var(--brand-soft-border)]">
                Evolução 360° Unificada
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mt-1">
              Linha do Tempo de {student.fullName}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Acompanhamento integrado de peso, circunferências corporais e fotos padronizadas.
            </p>
          </div>

          {/* Action Triggers */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Student self-record */}
            {isStudent && (
              <StudentProgressForm consultancySlug={consultancySlug} />
            )}

            {/* Personal trainer records for student */}
            {isPersonal && studentPublicId && (
              <StudentProgressForm
                consultancySlug={consultancySlug}
                studentPublicId={studentPublicId}
              />
            )}
          </div>
        </div>

        {/* 4 Summary Stat Cards (Rule 6: NULL handling, no fake zero) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase block">
              Ponto de Partida
            </span>
            <div className="space-y-0.5">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums block">
                {summary.initialWeightKg !== null
                  ? `${summary.initialWeightKg.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} kg`
                  : "—"}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] block">
                {summary.firstRecordedDate || "Sem data"}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase block">
              Ponto Atual
            </span>
            <div className="space-y-0.5">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums block">
                {summary.currentWeightKg !== null
                  ? `${summary.currentWeightKg.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} kg`
                  : "—"}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] block">
                {summary.latestRecordedDate || "Sem data"}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase block">
              Variação Total
            </span>
            <div className="space-y-0.5">
              {summary.totalWeightDelta ? (
                <div className="space-y-0.5">
                  <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums block">
                    {summary.totalWeightDelta.diffFormatted}
                  </span>
                  {summary.totalWeightDelta.diffPercentageFormatted && (
                    <span className="text-[11px] text-[var(--text-secondary)] font-mono block">
                      ({summary.totalWeightDelta.diffPercentageFormatted})
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-base sm:text-lg font-bold text-[var(--text-tertiary)] block">
                  —
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase block">
              Marcos no Tempo
            </span>
            <div className="space-y-0.5">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums block">
                {summary.totalMilestonesCount}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] block">
                {summary.totalApprovedPhotoEvaluationsCount} avaliações fotográficas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Pending Action Banner */}
      {activePendingPhotoRequest && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand-foreground)]">
                Avaliação Fotográfica: {activePendingPhotoRequest.statusLabel}
              </span>
            </div>
            <p className="text-xs text-[var(--text-primary)]">
              {isStudent && activePendingPhotoRequest.status === "PENDING" && (
                "Você possui uma solicitação de fotos aberta para envio. Complete as 4 poses para que seu treinador possa avaliar."
              )}
              {isStudent && activePendingPhotoRequest.status === "CHANGES_REQUESTED" && (
                "Seu avaliador solicitou correções em algumas poses. Verifique as orientações e reenvie as fotos indicadas."
              )}
              {isStudent && activePendingPhotoRequest.status === "SUBMITTED" && (
                "Suas 4 fotos foram enviadas com sucesso e estão aguardando a análise do seu treinador/nutricionista."
              )}
              {!isStudent && activePendingPhotoRequest.status === "SUBMITTED" && (
                `${student.fullName} enviou as 4 fotos corporais para avaliação. Clique para revisar e aprovar.`
              )}
              {!isStudent && (activePendingPhotoRequest.status === "PENDING" || activePendingPhotoRequest.status === "CHANGES_REQUESTED") && (
                `Aguardando o envio das fotos pelo aluno (${activePendingPhotoRequest.completedPosesCount} de 4 fotos carregadas).`
              )}
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setActiveTab("fotos")}
            className="self-start sm:self-auto shrink-0 text-xs font-semibold"
          >
            {isStudent
              ? activePendingPhotoRequest.status === "SUBMITTED"
                ? "Ver envio"
                : "Enviar fotos agora"
              : activePendingPhotoRequest.status === "SUBMITTED"
              ? "Revisar fotos"
              : "Ver solicitação"}
          </Button>
        </div>
      )}

      {/* 360° Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded-xl w-fit flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "timeline"
              ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-default)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
          }`}
        >
          Linha do Tempo 360° ({milestones.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("comparar")}
          className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "comparar"
              ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-default)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
          }`}
        >
          Comparar Datas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("graficos")}
          className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "graficos"
              ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-default)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
          }`}
        >
          Gráficos de Tendência
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fotos")}
          className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "fotos"
              ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-default)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
          }`}
        >
          Fotos & Solicitações
        </button>
      </div>

      {/* Tab Content Display */}
      {activeTab === "timeline" && (
        <EvolutionTimeline
          milestones={milestones}
          onSelectForComparison={hasMultipleMilestones ? handleSelectMilestoneForComparison : undefined}
          emptyMessage={`Nenhum registro de evolução encontrado para ${student.fullName}. Registre uma medição ou solicite fotos para iniciar a linha do tempo.`}
        />
      )}

      {activeTab === "comparar" && (
        initialComparisonData ? (
          <EvolutionComparator
            initialComparisonData={initialComparisonData}
            allMilestones={milestones}
            onClose={() => setActiveTab("timeline")}
          />
        ) : (
          <div className="p-8 text-center space-y-3 bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl">
            <h4 className="text-base font-bold text-[var(--text-primary)]">
              Comparação indisponível no momento
            </h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              São necessárias pelo menos duas avaliações registradas em datas diferentes para realizar o comparativo entre marcos.
            </p>
          </div>
        )
      )}

      {activeTab === "graficos" && (
        <EvolutionCharts
          weightSeries={chartSeries.weightSeries}
          waistSeries={chartSeries.waistSeries}
          abdomenSeries={chartSeries.abdomenSeries}
        />
      )}

      {activeTab === "fotos" && (
        isStudent ? (
          <StudentPhotoEvaluationHub
            consultancySlug={consultancySlug}
            activeRequest={rawPhotoData?.activeRequest || null}
            history={rawPhotoData?.history || []}
            comparisonData={rawPhotoData?.comparisonData || null}
          />
        ) : (
          <ProfessionalPhotoEvaluationHub
            consultancySlug={consultancySlug}
            student={student}
            requests={rawPhotoData?.requests || []}
            comparisonData={rawPhotoData?.comparisonData || null}
          />
        )
      )}
    </div>
  );
}
