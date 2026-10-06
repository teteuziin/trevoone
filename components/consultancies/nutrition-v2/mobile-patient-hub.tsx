"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/account/user-avatar";
import type {
  PatientRecordDetail,
  UpdatePatientRecordInput,
  UpdatePregnancyInput,
  PregnancyStatus,
} from "@/lib/nutrition-v2/patient-record-types";
import { deriveTrimester } from "@/lib/nutrition-v2/patient-record-validation";
import type { ActiveNutritionPlanSummary } from "@/lib/nutrition-v2/assignment-repository";
import type { PatientPlanDraftSummary } from "@/lib/nutrition-v2/patient-plan-lifecycle";
import {
  startPatientPlanEditAction,
  discardPatientPlanDraftAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import type {
  EvolutionHubDataDto,
  EvolutionComparisonDataDto,
} from "@/types/evolution";
import type { ClinicalCalculationResult } from "@/lib/nutrition-v2/clinical-calculations";
import { MobileEvolutionCockpit } from "@/components/consultancies/evolution/mobile-evolution-cockpit";

export type MobilePatientTab = "resumo" | "prontuario" | "plano" | "evolucao";
export type ClinicalSubTab =
  | "clinico"
  | "alimentar"
  | "estilo_vida"
  | "antropometria"
  | "gestacao"
  | "calculos";

export interface MobilePatientHubProps {
  slug: string;
  detail: PatientRecordDetail;
  activePlan?: ActiveNutritionPlanSummary | null;
  draftPlan?: PatientPlanDraftSummary | null;
  evolutionHubData?: EvolutionHubDataDto | null;
  evolutionComparisonData?: EvolutionComparisonDataDto | null;
  clinicalForm: UpdatePatientRecordInput;
  setClinicalForm: React.Dispatch<React.SetStateAction<UpdatePatientRecordInput>>;
  pregnancyForm: UpdatePregnancyInput;
  setPregnancyForm: React.Dispatch<React.SetStateAction<UpdatePregnancyInput>>;
  onSaveClinical: () => void;
  onSavePregnancy: () => void;
  onAddAnthropometry: () => void;
  onDeleteAnthropometry: (publicId: string) => void;
  onCopyFromOnboarding: () => void;
  isPending: boolean;
  message?: { type: "success" | "error"; text: string } | null;
  calcWeightOverride: string;
  setCalcWeightOverride: (val: string) => void;
  calcHeightOverride: string;
  setCalcHeightOverride: (val: string) => void;
  bmiResult: ClinicalCalculationResult<number>;
  initialMobileTab?: string;
}

export function MobilePatientHub({
  slug,
  detail,
  activePlan,
  draftPlan,
  evolutionHubData,
  evolutionComparisonData,
  clinicalForm,
  setClinicalForm,
  pregnancyForm,
  setPregnancyForm,
  onSaveClinical,
  onSavePregnancy,
  onAddAnthropometry,
  onDeleteAnthropometry,
  onCopyFromOnboarding,
  isPending,
  message,
  calcWeightOverride,
  setCalcWeightOverride,
  calcHeightOverride,
  setCalcHeightOverride,
  bmiResult,
  initialMobileTab,
}: MobilePatientHubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MobilePatientTab>(() => {
    if (initialMobileTab === "evolucao") return "evolucao";
    if (initialMobileTab === "plano") return "plano";
    if (initialMobileTab === "prontuario") return "prontuario";
    return "resumo";
  });

  const [clinicalSubTab, setClinicalSubTab] = useState<ClinicalSubTab>("clinico");
  const [isStartingEdit, setIsStartingEdit] = useState(false);
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false);
  const [draftActionError, setDraftActionError] = useState<string | null>(null);

  const handleStartEditPlan = async () => {
    setIsStartingEdit(true);
    setDraftActionError(null);
    const res = await startPatientPlanEditAction(slug, detail.student.membershipPublicId);
    if (res.success && res.data) {
      router.push(
        `/consultoria/${slug}/planos-v2/${res.data.planPublicId}?v=${res.data.versionPublicId}&studentId=${detail.student.membershipPublicId}`
      );
    } else {
      setIsStartingEdit(false);
      setDraftActionError(res.error || "Erro ao iniciar edição do plano.");
    }
  };

  const handleDiscardDraft = async () => {
    const ok = window.confirm(
      "Deseja realmente descartar as alterações deste rascunho? Esta ação não pode ser desfeita."
    );
    if (!ok) return;

    setIsDiscardingDraft(true);
    setDraftActionError(null);
    const res = await discardPatientPlanDraftAction(slug, detail.student.membershipPublicId);
    if (res.success) {
      router.refresh();
    } else {
      setIsDiscardingDraft(false);
      setDraftActionError(res.error || "Erro ao descartar alterações.");
    }
  };

  const latestAnthro = detail.anthropometrics.length > 0 ? detail.anthropometrics[0] : null;
  const trimesterLabel = deriveTrimester(pregnancyForm.gestationalWeeks ?? null);

  const LEVEL_1_TABS: Array<{ id: MobilePatientTab; label: string }> = [
    { id: "resumo", label: "Resumo" },
    { id: "prontuario", label: "Prontuário" },
    { id: "plano", label: "Plano" },
    { id: "evolucao", label: "Evolução" },
  ];

  const CLINICAL_SUB_TABS: Array<{ id: ClinicalSubTab; label: string }> = [
    { id: "clinico", label: "Histórico Clínico" },
    { id: "alimentar", label: "Histórico Alimentar" },
    { id: "estilo_vida", label: "Estilo de Vida" },
    { id: "antropometria", label: `Antropometria (${detail.anthropometrics.length})` },
    {
      id: "gestacao",
      label:
        pregnancyForm.pregnancyStatus === "PREGNANT"
          ? "Gestação (Ativa)"
          : pregnancyForm.pregnancyStatus === "POSTPARTUM"
          ? "Pós-parto"
          : "Gestação",
    },
    { id: "calculos", label: "Cálculos Clínicos" },
  ];

  return (
    <div className="space-y-4" data-testid="mobile-patient-hub">
      {/* =========================================================================
          1. HEADER DA PACIENTE (Comum a todas as abas)
          ========================================================================= */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3 depth-surface">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/consultoria/${slug}/progresso/alunos`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--brand)] hover:underline min-h-[44px] cursor-pointer"
          >
            <span aria-hidden="true">←</span>
            <span>Voltar aos Pacientes</span>
          </Link>
          <Badge variant="brand" size="sm" className="font-semibold text-[10px]">
            Paciente Ativo
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <UserAvatar
            fullName={detail.student.fullName}
            size="md"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-extrabold text-[var(--text-primary)] truncate">
              {detail.student.fullName}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {detail.student.email}
            </p>
          </div>
        </div>

        {/* Status gestacional se ativo */}
        {(pregnancyForm.pregnancyStatus === "PREGNANT" || pregnancyForm.pregnancyStatus === "POSTPARTUM") && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-subtle)] flex-wrap">
            {pregnancyForm.pregnancyStatus === "PREGNANT" && (
              <Badge variant="brand" size="sm" className="text-[10px] font-semibold">
                Gestante • {trimesterLabel}
              </Badge>
            )}
            {pregnancyForm.pregnancyStatus === "POSTPARTUM" && (
              <Badge variant="warning" size="sm" className="text-[10px] font-semibold">
                Pós-parto
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          2. LEVEL 1 TABS: [ Resumo ] [ Prontuário ] [ Plano ] [ Evolução ]
          Scrollável, touch targets >= 44px
          ========================================================================= */}
      <div
        role="tablist"
        aria-label="Navegação do Paciente"
        className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] overflow-x-auto no-scrollbar"
      >
        {LEVEL_1_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-h-[44px] px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center ${
                isActive
                  ? "bg-[var(--surface)] text-[var(--brand)] shadow-xs border border-[var(--border-default)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications banner */}
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* =========================================================================
          3. TAB 1: [ RESUMO ]
          Visão compacta sem dashboard gigante de cards
          ========================================================================= */}
      {activeTab === "resumo" && (
        <div className="space-y-3.5" data-testid="mobile-tab-resumo">
          {/* Card Resumo do Paciente */}
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3 shadow-2xs depth-surface">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] block">
              Resumo Clínico
            </span>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                  Objetivo
                </span>
                <span className="font-semibold text-[var(--text-primary)] block truncate">
                  {detail.record.mainObjective || detail.onboardingReference?.mainObjective || "—"}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                  Último Peso
                </span>
                <span className="font-bold text-[var(--text-primary)] block tabular-nums">
                  {latestAnthro?.weightKg !== null && latestAnthro?.weightKg !== undefined
                    ? `${latestAnthro.weightKg} kg`
                    : detail.onboardingReference?.reportedWeightKg
                    ? `${detail.onboardingReference.reportedWeightKg} kg`
                    : "—"}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
                Status Anamnese
              </span>
              <span className="font-bold text-[var(--text-primary)]">
                {detail.onboardingReference?.hasOnboardingData
                  ? "Anamnese Vinculada"
                  : detail.record.occupation || detail.record.clinicalObservations
                  ? "Prontuário Preenchido"
                  : "Pendente"}
              </span>
            </div>
          </div>

            {/* Card Plano Alimentar Vigente */}
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--brand)]/30 space-y-3 shadow-2xs depth-surface">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
              <div className="min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand)] block">
                  Plano Alimentar Vigente
                </span>
                <h2 className="text-sm font-bold text-[var(--text-primary)] truncate mt-0.5">
                  {activePlan ? activePlan.versionTitle : "Nenhum plano alimentar ativo"}
                </h2>
              </div>
              {activePlan ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                    V{activePlan.versionNumber}
                  </span>
                  <Badge variant="success" size="sm" className="text-[10px] font-semibold">
                    Ativo
                  </Badge>
                </div>
              ) : (
                <Badge variant="neutral" size="sm" className="shrink-0 text-[10px]">
                  Sem plano
                </Badge>
              )}
            </div>

            {/* Aviso discreto de rascunho em andamento no Resumo */}
            {draftPlan && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    Alteração em andamento
                  </span>
                  <Badge variant="warning" size="sm" className="text-[9px] font-semibold">
                    Rascunho
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Existe uma alteração sendo preparada para esta paciente.
                </p>
                <Link
                  href={`/consultoria/${slug}/planos-v2/${draftPlan.planPublicId}?v=${draftPlan.versionPublicId}&studentId=${detail.student.membershipPublicId}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs text-[var(--text-inverse)] bg-amber-600 hover:bg-amber-700 min-h-[38px] cursor-pointer"
                >
                  <span>Continuar edição</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}

            {activePlan ? (
              <>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">Kcal</span>
                    <span className="font-extrabold text-xs text-[var(--text-primary)] tabular-nums block truncate">
                      {activePlan.totals.caloriesKcal !== null && activePlan.totals.caloriesKcal !== undefined
                        ? `${activePlan.totals.caloriesKcal}`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">Proteína</span>
                    <span className="font-extrabold text-xs text-[var(--text-primary)] tabular-nums block truncate">
                      {activePlan.totals.proteinG !== null && activePlan.totals.proteinG !== undefined
                        ? `${activePlan.totals.proteinG}g`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">Carbo</span>
                    <span className="font-extrabold text-xs text-[var(--text-primary)] tabular-nums block truncate">
                      {activePlan.totals.carbohydrateG !== null && activePlan.totals.carbohydrateG !== undefined
                        ? `${activePlan.totals.carbohydrateG}g`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">Gordura</span>
                    <span className="font-extrabold text-xs text-[var(--text-primary)] tabular-nums block truncate">
                      {activePlan.totals.fatG !== null && activePlan.totals.fatG !== undefined
                        ? `${activePlan.totals.fatG}g`
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="primary"
                    size="md"
                    disabled={isStartingEdit}
                    onClick={handleStartEditPlan}
                    className="w-full font-bold text-xs min-h-[44px] shadow-xs cursor-pointer depth-interactive"
                  >
                    {isStartingEdit ? "Abrindo..." : "Editar plano"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("plano")}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-secondary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[40px] cursor-pointer"
                  >
                    <span>Abrir plano</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </>
            ) : (
              <Link
                href={`/consultoria/${slug}/planos-v2/novo?studentId=${detail.student.membershipPublicId}`}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] shadow-xs cursor-pointer depth-interactive"
              >
                <span>Prescrever plano</span>
              </Link>
            )}
          </div>

          {/* Ações Rápidas */}
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] space-y-2.5 shadow-2xs depth-surface">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)] block">
              Ações Rápidas
            </span>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("prontuario")}
                className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[44px] cursor-pointer transition-colors"
              >
                <span>Abrir prontuário clínico</span>
                <span aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("plano")}
                className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[44px] cursor-pointer transition-colors"
              >
                <span>{activePlan ? "Ver detalhes do plano" : "Prescrever plano"}</span>
                <span aria-hidden="true">→</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("evolucao")}
                className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[44px] cursor-pointer transition-colors"
              >
                <span>Ver evolução física</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. TAB 2: [ PRONTUÁRIO ]
          Nível 2: Seções Clínicas com reaproveitamento integral das seções existentes
          ========================================================================= */}
      {activeTab === "prontuario" && (
        <div className="space-y-4" data-testid="mobile-tab-prontuario">
          {/* Sub-tabs Nível 2 com scroll suave e affordance mobile-native */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-tertiary)]">
                Seções do Prontuário
              </span>
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] flex items-center gap-1">
                <span>Deslize para ver mais</span>
                <span aria-hidden="true">→</span>
              </span>
            </div>

            <div className="relative">
              <div
                role="tablist"
                aria-label="Seções do Prontuário"
                className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-4 px-4 snap-x"
              >
                {CLINICAL_SUB_TABS.map((sub) => {
                  const isSubActive = clinicalSubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      role="tab"
                      aria-selected={isSubActive}
                      onClick={() => setClinicalSubTab(sub.id)}
                      className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs whitespace-nowrap shrink-0 snap-start cursor-pointer transition-all flex items-center justify-center ${
                        isSubActive
                          ? "bg-[var(--brand)] text-[var(--text-inverse)] font-bold shadow-xs border border-transparent"
                          : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] font-semibold shadow-2xs"
                      }`}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Botão de sincronização com Onboarding (se disponível) */}
          {detail.onboardingReference.hasOnboardingData && (
            <button
              type="button"
              onClick={onCopyFromOnboarding}
              className="w-full py-2.5 px-3 rounded-xl border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] text-[var(--brand)] font-bold text-xs min-h-[44px] cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Importar dados do Onboarding</span>
            </button>
          )}

          {/* Sub-seção 1: Histórico Clínico */}
          {clinicalSubTab === "clinico" && (
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3.5 shadow-2xs depth-surface">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] pb-2">
                Condições de Saúde e Histórico
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Patologias / Condições Diagnosticadas
                  </label>
                  <textarea
                    value={clinicalForm.diagnosedConditions || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, diagnosedConditions: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 focus:ring-1 focus:ring-[var(--brand)]"
                    placeholder="Ex: Diabetes Tipo 2, Hipertensão, Hipotireoidismo..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Cirurgias Prévias
                  </label>
                  <textarea
                    value={clinicalForm.previousSurgeries || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, previousSurgeries: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 focus:ring-1 focus:ring-[var(--brand)]"
                    placeholder="Ex: Apendicectomia (2018), Cesárea (2021)..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Internações / Hospitalizações
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.hospitalizations || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, hospitalizations: e.target.value })}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Histórico de internações relevantes"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Medicamentos em Uso
                  </label>
                  <textarea
                    value={clinicalForm.currentMedications || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, currentMedications: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1"
                    placeholder="Ex: Levotiroxina 50mcg (jejum)..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Suplementos em Uso
                  </label>
                  <textarea
                    value={clinicalForm.supplements || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, supplements: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1"
                    placeholder="Ex: Whey protein, Creatina 5g, Vitamina D..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Alergias Gerais
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.allergies || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, allergies: e.target.value })}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Ex: Penicilina, Poeira, Látex..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Alergias e Intolerâncias Alimentares
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.foodAllergiesIntolerances || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, foodAllergiesIntolerances: e.target.value })}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Ex: Lactose, Glúten, Frutos do mar..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Histórico Familiar
                  </label>
                  <textarea
                    value={clinicalForm.familyHistory || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, familyHistory: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1"
                    placeholder="Ex: Mãe com diabetes, Pai com hipertensão..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Observações Clínicas Gerais
                  </label>
                  <textarea
                    value={clinicalForm.clinicalObservations || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, clinicalObservations: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1"
                    placeholder="Anotações gerais do atendimento..."
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={onSaveClinical}
                disabled={isPending}
                className="w-full font-bold text-xs min-h-[44px] shadow-sm mt-2 cursor-pointer"
              >
                {isPending ? "Salvando..." : "Salvar Prontuário"}
              </Button>
            </div>
          )}

          {/* Sub-seção 2: Histórico Alimentar */}
          {clinicalSubTab === "alimentar" && (
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3.5 shadow-2xs depth-surface">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] pb-2">
                Hábitos e Preferências Alimentares
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Alimentos Preferidos
                  </label>
                  <textarea
                    value={clinicalForm.foodPreferences || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, foodPreferences: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1"
                    placeholder="Alimentos que mais gosta de consumir..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Aversões Alimentares
                  </label>
                  <textarea
                    value={clinicalForm.dislikedFoods || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, dislikedFoods: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1"
                    placeholder="Alimentos que não consome ou rejeita..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Restrições Alimentares
                  </label>
                  <textarea
                    value={clinicalForm.dietaryRestrictions || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, dietaryRestrictions: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1"
                    placeholder="Vegetariano, vegano, kosher, etc."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Rotina Alimentar Habitual
                  </label>
                  <textarea
                    value={clinicalForm.usualEatingRoutine || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, usualEatingRoutine: e.target.value })}
                    rows={3}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1"
                    placeholder="Descreva a rotina de um dia típico..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Horários de Refeições
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.mealScheduleNotes || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, mealScheduleNotes: e.target.value })}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Café: 07h, Almoço: 12h30, Jantar: 20h..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Apetite e Fome
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.appetiteNotes || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, appetiteNotes: e.target.value })}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Normal, aumentado à noite, beliscos..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Dificuldades de Adesão
                  </label>
                  <textarea
                    value={clinicalForm.difficultiesAdherenceNotes || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, difficultiesAdherenceNotes: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1"
                    placeholder="Falta de tempo para cozinhar, viagens frequentes..."
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={onSaveClinical}
                disabled={isPending}
                className="w-full font-bold text-xs min-h-[44px] shadow-sm mt-2 cursor-pointer"
              >
                {isPending ? "Salvando..." : "Salvar Prontuário"}
              </Button>
            </div>
          )}

          {/* Sub-seção 3: Estilo de Vida */}
          {clinicalSubTab === "estilo_vida" && (
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3.5 shadow-2xs depth-surface">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] pb-2">
                Estilo de Vida e Hábitos Diários
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Atividade Física
                  </label>
                  <textarea
                    value={clinicalForm.physicalActivityNotes || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, physicalActivityNotes: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1"
                    placeholder="Tipo, frequência e intensidade de exercícios..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Consumo de Álcool
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.alcoholNotes || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, alcoholNotes: e.target.value })}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Não consome / Socialmente aos finais de semana..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Tabagismo
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.smokingStatus || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, smokingStatus: e.target.value })}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Não fumante / Ex-fumante / Fumante..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Sono e Descanso
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.sleepNotes || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, sleepNotes: e.target.value })}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Média de 7h/noite, sono reparador..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Hidratação
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.hydrationNotes || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, hydrationNotes: e.target.value })}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Aprox. 2L de água por dia..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Hábito Intestinal
                  </label>
                  <input
                    type="text"
                    value={clinicalForm.bowelHabit || ""}
                    onChange={(e) => setClinicalForm({ ...clinicalForm, bowelHabit: e.target.value })}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Diário (Bristol tipo 3-4)..."
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={onSaveClinical}
                disabled={isPending}
                className="w-full font-bold text-xs min-h-[44px] shadow-sm mt-2 cursor-pointer"
              >
                {isPending ? "Salvando..." : "Salvar Prontuário"}
              </Button>
            </div>
          )}

          {/* Sub-seção 4: Antropometria */}
          {clinicalSubTab === "antropometria" && (
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3.5 shadow-2xs depth-surface">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
                  Histórico de Medições
                </h3>
                <button
                  type="button"
                  onClick={onAddAnthropometry}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] flex items-center cursor-pointer"
                >
                  + Nova Medição
                </button>
              </div>

              {detail.anthropometrics.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
                  Nenhuma medição antropométrica registrada até o momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {detail.anthropometrics.map((m) => (
                    <div
                      key={m.publicId}
                      className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--text-primary)]">
                          {new Date(m.measurementDate).toLocaleDateString("pt-BR")}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteAnthropometry(m.publicId)}
                          disabled={isPending}
                          className="text-[11px] text-destructive hover:underline cursor-pointer min-h-[32px] px-2 flex items-center"
                        >
                          Excluir
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>Peso: <strong className="text-[var(--text-primary)]">{m.weightKg ? `${m.weightKg} kg` : "—"}</strong></div>
                        <div>Altura: <strong className="text-[var(--text-primary)]">{m.heightCm ? `${m.heightCm} cm` : "—"}</strong></div>
                        <div>Cintura: <strong className="text-[var(--text-primary)]">{m.waistCm ? `${m.waistCm} cm` : "—"}</strong></div>
                        <div>Quadril: <strong className="text-[var(--text-primary)]">{m.hipCm ? `${m.hipCm} cm` : "—"}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-seção 5: Gestação */}
          {clinicalSubTab === "gestacao" && (
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3.5 shadow-2xs depth-surface">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] pb-2">
                Acompanhamento Gestacional e Pós-parto
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Situação Atual
                  </label>
                  <select
                    value={pregnancyForm.pregnancyStatus || "NOT_PREGNANT"}
                    onChange={(e) => setPregnancyForm({ ...pregnancyForm, pregnancyStatus: e.target.value as PregnancyStatus })}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                  >
                    <option value="NOT_PREGNANT">Não gestante</option>
                    <option value="PREGNANT">Gestante</option>
                    <option value="POSTPARTUM">Pós-parto / Lactante</option>
                  </select>
                </div>

                {pregnancyForm.pregnancyStatus === "PREGNANT" && (
                  <>
                    <div>
                      <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                        Idade Gestacional (Semanas)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="45"
                        value={pregnancyForm.gestationalWeeks ?? ""}
                        onChange={(e) => setPregnancyForm({ ...pregnancyForm, gestationalWeeks: e.target.value ? parseInt(e.target.value, 10) : null })}
                        className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                        placeholder="Ex: 24"
                      />
                    </div>
                    {trimesterLabel && (
                      <div className="p-2.5 rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-xs text-[var(--brand)] font-bold">
                        Trimestre calculado: {trimesterLabel}
                      </div>
                    )}
                  </>
                )}

                {pregnancyForm.pregnancyStatus === "POSTPARTUM" && (
                  <div>
                    <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                      Data do Parto
                    </label>
                    <input
                      type="date"
                      value={pregnancyForm.deliveryDate || ""}
                      onChange={(e) => setPregnancyForm({ ...pregnancyForm, deliveryDate: e.target.value || null })}
                      className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] text-[var(--text-secondary)] font-medium block">
                    Observações Clínicas
                  </label>
                  <textarea
                    value={pregnancyForm.pregnancyNotes || ""}
                    onChange={(e) => setPregnancyForm({ ...pregnancyForm, pregnancyNotes: e.target.value })}
                    rows={2}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1"
                    placeholder="Orientações e observações gestacionais..."
                  />
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={onSavePregnancy}
                disabled={isPending}
                className="w-full font-bold text-xs min-h-[44px] shadow-sm mt-2 cursor-pointer"
              >
                {isPending ? "Salvando..." : "Salvar Dados Gestacionais"}
              </Button>
            </div>
          )}

          {/* Sub-seção 6: Cálculos Clínicos */}
          {clinicalSubTab === "calculos" && (
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3.5 shadow-2xs depth-surface">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[var(--text-tertiary)] border-b border-[var(--border-subtle)] pb-2">
                Cálculos Clínicos (Simulação)
              </h3>

              <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Índice de Massa Corporal (IMC)
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-extrabold text-[var(--text-primary)] tabular-nums">
                    {bmiResult.status === "SUCCESS" ? bmiResult.formattedResult : "—"}
                  </span>
                  {bmiResult.status === "SUCCESS" && (
                    <Badge variant="brand" size="sm" className="font-semibold text-[10px]">
                      IMC Calculado
                    </Badge>
                  )}
                </div>
                {Object.values(bmiResult.inputs).some((i) => i.isOverride) && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                    * Simulação com valores manuais
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                    Peso de Teste (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcWeightOverride}
                    onChange={(e) => setCalcWeightOverride(e.target.value)}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Ex: 65.5"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                    Altura de Teste (cm)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={calcHeightOverride}
                    onChange={(e) => setCalcHeightOverride(e.target.value)}
                    className="w-full text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-2.5 mt-1 min-h-[44px]"
                    placeholder="Ex: 165"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          5. TAB 3: [ PLANO ]
          Plano Atual / Criar Plano / Status e Macros
          ========================================================================= */}
      {activeTab === "plano" && (
        <div className="space-y-4" data-testid="mobile-tab-plano">
          {draftActionError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-xs font-semibold text-destructive">
              {draftActionError}
            </div>
          )}

          {/* Estado C: Alteração em andamento (Rascunho) */}
          {draftPlan && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    Alteração em andamento
                  </span>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] truncate mt-0.5">
                    {draftPlan.title || draftPlan.planTitle || activePlan?.versionTitle || "Rascunho de atualização"}
                  </h3>
                </div>
                <Badge variant="warning" size="sm" className="font-semibold text-[10px] shrink-0">
                  Rascunho
                </Badge>
              </div>

              <p className="text-xs text-[var(--text-secondary)]">
                Você possui alterações em andamento para esta paciente que ainda não foram publicadas.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/consultoria/${slug}/planos-v2/${draftPlan.planPublicId}?v=${draftPlan.versionPublicId}&studentId=${detail.student.membershipPublicId}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] cursor-pointer shadow-xs depth-interactive"
                >
                  <span>Continuar edição</span>
                  <span aria-hidden="true">→</span>
                </Link>
                <Button
                  variant="secondary"
                  size="md"
                  disabled={isDiscardingDraft}
                  onClick={handleDiscardDraft}
                  className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20 min-h-[44px] cursor-pointer"
                >
                  {isDiscardingDraft ? "Descartando..." : "Descartar alterações"}
                </Button>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3 shadow-2xs depth-surface">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand)] block">
              Plano Atual
            </span>

            {activePlan ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                      {activePlan.versionTitle}
                    </h2>
                    {activePlan.versionSubtitle && (
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                        {activePlan.versionSubtitle}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                      V{activePlan.versionNumber}
                    </span>
                    <Badge variant="success" size="sm" className="text-[10px] font-semibold">
                      Ativo
                    </Badge>
                  </div>
                </div>

                {/* Macro breakdown */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">Kcal</span>
                    <span className="font-extrabold text-xs text-[var(--text-primary)] tabular-nums block truncate">
                      {activePlan.totals.caloriesKcal !== null && activePlan.totals.caloriesKcal !== undefined
                        ? `${activePlan.totals.caloriesKcal}`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">Proteína</span>
                    <span className="font-extrabold text-xs text-[var(--text-primary)] tabular-nums block truncate">
                      {activePlan.totals.proteinG !== null && activePlan.totals.proteinG !== undefined
                        ? `${activePlan.totals.proteinG}g`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">Carbo</span>
                    <span className="font-extrabold text-xs text-[var(--text-primary)] tabular-nums block truncate">
                      {activePlan.totals.carbohydrateG !== null && activePlan.totals.carbohydrateG !== undefined
                        ? `${activePlan.totals.carbohydrateG}g`
                        : "—"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">Gordura</span>
                    <span className="font-extrabold text-xs text-[var(--text-primary)] tabular-nums block truncate">
                      {activePlan.totals.fatG !== null && activePlan.totals.fatG !== undefined
                        ? `${activePlan.totals.fatG}g`
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-[var(--text-secondary)] space-y-0.5 pt-1">
                  {activePlan.prescriberName && (
                    <p>Prescrito por: <strong className="text-[var(--text-primary)]">{activePlan.prescriberName}</strong></p>
                  )}
                  {activePlan.startsOn && (
                    <p>Início: <strong className="text-[var(--text-primary)]">{new Date(activePlan.startsOn + "T12:00:00").toLocaleDateString("pt-BR")}</strong></p>
                  )}
                  {activePlan.mealsCount !== undefined && (
                    <p>Refeições: <strong className="text-[var(--text-primary)]">{activePlan.mealsCount} cadastradas</strong></p>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  {/* Se NÃO tiver draft, CTA principal é Editar Plano */}
                  {!draftPlan && (
                    <Button
                      variant="primary"
                      size="md"
                      disabled={isStartingEdit}
                      onClick={handleStartEditPlan}
                      className="w-full font-bold text-xs min-h-[44px] shadow-xs cursor-pointer depth-interactive"
                    >
                      {isStartingEdit ? "Abrindo..." : "Editar plano"}
                    </Button>
                  )}

                  <Link
                    href={`/consultoria/${slug}/planos-v2/${activePlan.planPublicId}?v=${activePlan.versionPublicId}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-secondary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[40px] cursor-pointer"
                  >
                    <span>Abrir no Builder</span>
                    <span aria-hidden="true">→</span>
                  </Link>

                  <Link
                    href={`/consultoria/${slug}/planos-v2/novo?studentId=${detail.student.membershipPublicId}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] min-h-[44px] cursor-pointer transition-colors"
                  >
                    <span>+ Prescrever Novo Plano</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-6 px-3 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)] mx-auto flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v2m0 0a4.5 4.5 0 014.5 4.5c0 3-2 6-4.5 8.5C9.5 17 7.5 14 7.5 11a4.5 4.5 0 014.5-4.5zm0-2c1.5-1 3-.5 3-.5" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Nenhum plano alimentar ativo
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                    Esta paciente ainda não possui um plano alimentar ativo prescrito na consultoria.
                  </p>
                </div>
                <Link
                  href={`/consultoria/${slug}/planos-v2/novo?studentId=${detail.student.membershipPublicId}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] shadow-xs cursor-pointer"
                >
                  <span>Prescrever plano</span>
                  <span className="sr-only">+ Criar plano alimentar</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          6. TAB 4: [ EVOLUÇÃO ]
          MobileEvolutionCockpit 100% PRESERVADO
          ========================================================================= */}
      {activeTab === "evolucao" && (
        <div className="space-y-4" data-testid="mobile-tab-evolucao">
          {evolutionHubData ? (
            <MobileEvolutionCockpit
              consultancySlug={slug}
              hubData={evolutionHubData}
              initialComparisonData={evolutionComparisonData || null}
              isStudent={false}
              isPersonal={false}
              isNutritionist={true}
              isAdmin={false}
              studentPublicId={detail.student.membershipPublicId}
            />
          ) : (
            <div className="p-8 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-center space-y-2">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Carregando evolução...
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Aguarde um momento enquanto os dados de evolução da paciente são sincronizados.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
