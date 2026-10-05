"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EvolutionTimeline } from "./evolution-timeline";
import { EvolutionComparator } from "./evolution-comparator";
import { EvolutionCharts } from "./evolution-charts";
import { StudentProgressForm } from "@/components/consultancies/student-progress-form";
import { MobileEvolutionCockpit } from "./mobile-evolution-cockpit";
import { StudentPhotoEvaluationHub } from "@/components/consultancies/photos/student-photo-evaluation-hub";
import { ProfessionalPhotoEvaluationHub } from "@/components/consultancies/photos/professional-photo-evaluation-hub";
import {
  loadPhotoEvaluationTabDataAction,
  type PhotoEvaluationTabDataResult,
} from "@/app/consultoria/[slug]/progresso/fotos-actions";
import {
  type EvolutionHubDataDto,
  type EvolutionComparisonDataDto,
  formatIsoDateToBr,
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
  userPublicId?: string;
  consultancyPublicId?: string;
  role?: string;
}

export function Evolution360Hub({
  consultancySlug,
  hubData,
  initialComparisonData,
  isStudent = false,
  isPersonal = false,
  isNutritionist = false,
  isAdmin = false,
  studentPublicId,
  rawPhotoData,
  userPublicId: initialUserPublicId,
  consultancyPublicId: initialConsultancyPublicId,
  role: initialRole,
}: Evolution360HubProps) {
  const [activeTab, setActiveTab] = useState<"timeline" | "comparar" | "graficos" | "fotos">("timeline");

  const [activeContext, setActiveContext] = useState<{
    userPublicId: string;
    consultancyPublicId: string;
    role: string;
  } | null>(() => {
    if (initialUserPublicId) {
      return {
        userPublicId: initialUserPublicId,
        consultancyPublicId: initialConsultancyPublicId || "",
        role: initialRole || "STUDENT",
      };
    }
    return null;
  });

  React.useEffect(() => {
    if (!activeContext) {
      import("@/lib/offline/offline-context").then(({ getValidOfflineActiveContext }) => {
        getValidOfflineActiveContext().then((ctx) => {
          if (ctx) {
            setActiveContext({
              userPublicId: ctx.userPublicId,
              consultancyPublicId: ctx.consultancyPublicId,
              role: ctx.role,
            });
          }
        }).catch(() => {});
      }).catch(() => {});
    }
  }, [activeContext]);

  const scopedUserPublicId = initialUserPublicId || activeContext?.userPublicId || "";
  const scopedConsultancyPublicId = initialConsultancyPublicId || activeContext?.consultancyPublicId || "";
  const scopedRole = initialRole || activeContext?.role || "STUDENT";

  // Auto-cache scalar Evolution 360 metrics when rendered by student (offline storage)
  React.useEffect(() => {
    if (
      !isStudent ||
      typeof window === "undefined" ||
      !scopedUserPublicId ||
      scopedUserPublicId === "student" ||
      !scopedConsultancyPublicId ||
      scopedConsultancyPublicId === "consultancy"
    ) {
      return;
    }
    import("@/lib/offline/offline-evolution").then(({ saveEvolutionSnapshot }) => {
      saveEvolutionSnapshot({
        userPublicId: scopedUserPublicId,
        consultancyPublicId: scopedConsultancyPublicId,
        role: scopedRole,
        hubData,
        comparisonData: initialComparisonData,
      }).catch(() => {});
    }).catch(() => {});
  }, [isStudent, hubData, initialComparisonData, scopedUserPublicId, scopedConsultancyPublicId, scopedRole]);

  const [fetchedPhotoData, setFetchedPhotoData] = useState<PhotoEvaluationTabDataResult["data"] | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const photoData = rawPhotoData || fetchedPhotoData;

  const loadPhotos = React.useCallback(async () => {
    if (photoData || isLoadingPhotos) return;
    setIsLoadingPhotos(true);
    setPhotoError(null);
    try {
      const res = await loadPhotoEvaluationTabDataAction({
        consultancySlug,
        studentPublicId,
      });
      if (res.success && res.data) {
        setFetchedPhotoData(res.data);
      } else {
        setPhotoError(res.error || "Não foi possível carregar as fotos.");
      }
    } catch {
      setPhotoError("Erro de comunicação ao carregar fotos.");
    } finally {
      setIsLoadingPhotos(false);
    }
  }, [photoData, isLoadingPhotos, consultancySlug, studentPublicId]);

  const handleSelectTab = (tab: "timeline" | "comparar" | "graficos" | "fotos") => {
    setActiveTab(tab);
    if (tab === "fotos" && !photoData && !isLoadingPhotos) {
      loadPhotos();
    }
  };

  const { summary, milestones, student, activePendingPhotoRequest, chartSeries } = hubData;

  // Handle clicking "Comparar" on a specific milestone card
  const handleSelectMilestoneForComparison = () => {
    handleSelectTab("comparar");
  };

  const hasMultipleMilestones = milestones.length > 1;

  return (
    <>
      {/* MOBILE NATIVE EVOLUTION COCKPIT (sm:hidden) */}
      <div className="sm:hidden">
        <MobileEvolutionCockpit
          consultancySlug={consultancySlug}
          hubData={hubData}
          initialComparisonData={initialComparisonData}
          isStudent={isStudent}
          isPersonal={isPersonal}
          isNutritionist={isNutritionist}
          isAdmin={isAdmin}
          studentPublicId={studentPublicId}
          onOpenPhotosTab={() => handleSelectTab("fotos")}
        />
      </div>

      {/* DESKTOP 360° EVOLUTION SURFACE (hidden sm:block) */}
      <div className="hidden sm:block space-y-6">
        {/* Top 360° Evolution Summary Banner */}
      <div className="p-5 sm:p-6 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4 border-specular-t depth-surface">
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

            {/* Nutritionist & Admin: quick jump to clinical record */}
            {(isNutritionist || isAdmin) && studentPublicId && (
              <Link
                href={`/consultoria/${consultancySlug}/planos-v2/prontuario/${studentPublicId}`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[var(--brand)] bg-[var(--brand-soft)] hover:bg-[var(--brand-soft)]/80 border border-[var(--brand-soft-border)] transition-colors min-h-[40px] cursor-pointer"
                title="Abrir prontuário clínico desta paciente"
              >
                <span>Ver Prontuário</span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>

        {/* 4 Summary Stat Cards (Rule 6: NULL handling, no fake zero) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
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

          <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
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

          <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
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

          <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
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

        {/* Active Nutrition Plan Context Card */}
        {hubData.activeNutritionPlan && (
          <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--brand)]/30 space-y-3 depth-surface">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v2m0 0a4.5 4.5 0 014.5 4.5c0 3-2 6-4.5 8.5C9.5 17 7.5 14 7.5 11a4.5 4.5 0 014.5-4.5zm0-2c1.5-1 3-.5 3-.5" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-[var(--brand)]">
                      Plano Alimentar Vigente
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Ativo (V{hubData.activeNutritionPlan.versionNumber})
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                    {hubData.activeNutritionPlan.versionTitle}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/consultoria/${consultancySlug}/planos-v2/${hubData.activeNutritionPlan.planPublicId}?v=${hubData.activeNutritionPlan.versionPublicId}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--brand)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors min-h-[36px] cursor-pointer"
                >
                  <span>Ver Plano Completo</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Calorias</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm tabular-nums">
                  {hubData.activeNutritionPlan.totals.caloriesKcal ? `${hubData.activeNutritionPlan.totals.caloriesKcal} kcal` : "—"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Proteínas</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm tabular-nums">
                  {hubData.activeNutritionPlan.totals.proteinG ? `${hubData.activeNutritionPlan.totals.proteinG}g` : "—"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Carboidratos</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm tabular-nums">
                  {hubData.activeNutritionPlan.totals.carbohydrateG ? `${hubData.activeNutritionPlan.totals.carbohydrateG}g` : "—"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border-subtle)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Gorduras</span>
                <span className="font-extrabold text-[var(--text-primary)] text-sm tabular-nums">
                  {hubData.activeNutritionPlan.totals.fatG ? `${hubData.activeNutritionPlan.totals.fatG}g` : "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1 flex-wrap gap-2">
              <div>
                {hubData.activeNutritionPlan.prescriberName && (
                  <span>Prescrito por <strong>{hubData.activeNutritionPlan.prescriberName}</strong> • </span>
                )}
                <span>Início: {formatIsoDateToBr(hubData.activeNutritionPlan.startsOn)}</span>
              </div>
              <div>
                <span>{hubData.activeNutritionPlan.mealsCount} refeições cadastradas</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Pending Action Banner */}
      {activePendingPhotoRequest && (
        <div className="p-4 sm:p-5 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            onClick={() => handleSelectTab("fotos")}
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
          onClick={() => handleSelectTab("timeline")}
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
          onClick={() => handleSelectTab("comparar")}
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
          onClick={() => handleSelectTab("graficos")}
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
          onClick={() => handleSelectTab("fotos")}
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
            onClose={() => handleSelectTab("timeline")}
          />
        ) : (
          <div className="p-8 text-center space-y-3 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl">
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
        isLoadingPhotos ? (
          <div
            className="p-8 sm:p-12 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-6 animate-pulse"
            aria-busy="true"
            aria-label="Carregando fotos corporais"
          >
            <div className="space-y-2">
              <div className="h-5 w-48 bg-[var(--surface-subtle)] rounded-lg" />
              <div className="h-3.5 w-72 bg-[var(--surface-subtle)] rounded-md" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[var(--border-subtle)]">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="aspect-3/4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center"
                >
                  <div className="h-4 w-16 bg-[var(--border-default)] rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ) : photoError ? (
          <div className="p-8 text-center space-y-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs">
            <p className="text-sm font-medium text-[var(--text-secondary)]">{photoError}</p>
            <Button type="button" size="sm" onClick={loadPhotos} variant="outline">
              Tentar novamente
            </Button>
          </div>
        ) : isStudent ? (
          <StudentPhotoEvaluationHub
            consultancySlug={consultancySlug}
            activeRequest={photoData?.activeRequest || null}
            history={photoData?.history || []}
            comparisonData={photoData?.comparisonData || null}
          />
        ) : (
          <ProfessionalPhotoEvaluationHub
            consultancySlug={consultancySlug}
            student={student}
            requests={photoData?.requests || []}
            comparisonData={photoData?.comparisonData || null}
          />
        )
      )}
      </div>
    </>
  );
}
