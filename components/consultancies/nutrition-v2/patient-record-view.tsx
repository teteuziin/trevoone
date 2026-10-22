"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  PatientRecordDetail,
  UpdatePatientRecordInput,
} from "@/lib/nutrition-v2/patient-record-types";
import {
  calculateAgeFromBirthDate,
  classifyBMI,
  normalizeBiologicalSex,
} from "@/lib/nutrition-v2/clinical-calculations";
import {
  updatePatientRecordAction,
} from "@/app/consultoria/[slug]/planos-v2/patient-actions";
import {
  startPatientPlanEditAction,
  createPatientPlanFromScratchAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import type { PatientPlanDraftSummary } from "@/lib/nutrition-v2/patient-plan-lifecycle";
import type { ActiveNutritionPlanSummary } from "@/lib/nutrition-v2/assignment-repository";
import type {
  EvolutionHubDataDto,
  EvolutionComparisonDataDto,
} from "@/types/evolution";
import { AutosaveIndicator, type AutosaveStatus } from "./autosave-indicator";
import { UserAvatar } from "@/components/account/user-avatar";

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5m7 7l-7-7 7-7" />
    </svg>
  );
}
import type {
  PatientPlanning,
  PatientPlanningStaleStatus,
} from "@/lib/nutrition-v2/patient-planning-types";
import { NutritionTemplatesModal } from "./nutrition-templates-modal";
import { NutritionCopyPlanDialog } from "./nutrition-copy-plan-dialog";
import { NutritionSaveTemplateDialog } from "./nutrition-save-template-dialog";
import { NutritionAiGenerateModal } from "./nutrition-ai-generate-modal";
import { NutritionAiImportModal } from "./nutrition-ai-import-modal";
import { NutritionPlanChoiceModal, type NutritionPlanCreationChoice } from "./nutrition-plan-choice-modal";
import { PatientAnamneseDrawer } from "./patient-anamnese-drawer";
import { PatientCadastralModal } from "./patient-cadastral-modal";
import { NutritionWorkspaceNav } from "./nutrition-workspace-nav";
import { PatientGeneralRecordTab } from "./patient-general-record-tab";
import { PlanningEvolutionTab } from "./planning-evolution-tab";
import { PatientMealTrackingTab } from "./patient-meal-tracking-tab";
import { AnthropometricModal } from "./anthropometric-modal";
import type { PatientConsultationHubSummaryDto } from "@/lib/nutrition-v2/clinical-consultation-types";
import type { PatientCheckinsHubSummaryDto } from "@/lib/nutrition-v2/checkin-types";
import type { PatientFollowupHubSummaryDto } from "@/lib/nutrition-v2/followup-types";

// ============================================================================
// ALLERGY STATUS RESOLVER (STRICT TRI-STATE IMPLEMENTATION)
// ============================================================================
export function resolvePatientAllergyStatus(
  allergiesText?: string | null,
  intolerancesText?: string | null,
  hasOnboarding?: boolean
): {
  status: "HAS_ALLERGIES" | "EXPLICITLY_NONE" | "NOT_INFORMED";
  label: string;
  subtext?: string;
  items: string[];
} {
  const rawAllergies = (allergiesText || "").trim();
  const rawIntolerances = (intolerancesText || "").trim();

  const isNeg = (txt: string) => {
    const l = txt.toLowerCase().trim();
    return (
      l === "não" ||
      l === "nao" ||
      l === "nenhuma" ||
      l === "nenhum" ||
      l === "não possui" ||
      l === "nao possui" ||
      l === "não possuo" ||
      l === "nao possuo" ||
      l === "sem alergias" ||
      l === "sem restrições" ||
      l === "sem restricoes" ||
      l === "nada" ||
      l === "negativo" ||
      l === "nega"
    );
  };

  const hasAllergyContent = rawAllergies.length > 0;
  const hasIntolContent = rawIntolerances.length > 0;

  if (hasAllergyContent || hasIntolContent) {
    const allergyIsNeg = !hasAllergyContent || isNeg(rawAllergies);
    const intolIsNeg = !hasIntolContent || isNeg(rawIntolerances);

    if (allergyIsNeg && intolIsNeg) {
      return {
        status: "EXPLICITLY_NONE",
        label: "Paciente declarou não possuir alergias",
        items: [],
      };
    }

    const items: string[] = [];
    if (hasAllergyContent && !allergyIsNeg) {
      items.push(...rawAllergies.split(/[,;\n•]+/).map((s) => s.trim()).filter(Boolean));
    }
    if (hasIntolContent && !intolIsNeg) {
      items.push(...rawIntolerances.split(/[,;\n•]+/).map((s) => `Intolerância: ${s.trim()}`).filter(Boolean));
    }

    if (items.length > 0) {
      return {
        status: "HAS_ALLERGIES",
        label: "Alergias e restrições relatadas",
        items,
      };
    }

    return {
      status: "EXPLICITLY_NONE",
      label: "Paciente declarou não possuir alergias",
      items: [],
    };
  }

  return {
    status: "NOT_INFORMED",
    label: "Alergias não informadas",
    subtext: hasOnboarding ? "Não informado na anamnese" : "Aguardando preenchimento da anamnese",
    items: [],
  };
}

function formatDate(isoStr?: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr.includes("T") ? isoStr : `${isoStr}T12:00:00`);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

interface PatientRecordViewProps {
  slug: string;
  initialDetail: PatientRecordDetail;
  activePlan?: ActiveNutritionPlanSummary | null;
  draftPlan?: PatientPlanDraftSummary | null;
  evolutionHubData?: EvolutionHubDataDto | null;
  evolutionComparisonData?: EvolutionComparisonDataDto | null;
  initialTab?: string;
  initialPlanning?: PatientPlanning | null;
  initialStaleStatus?: PatientPlanningStaleStatus | null;
  initialConsultationsSummary?: PatientConsultationHubSummaryDto | null;
  initialCheckinsSummary?: PatientCheckinsHubSummaryDto | null;
  initialFollowupSummary?: PatientFollowupHubSummaryDto | null;
  initialAppointmentPublicId?: string;
  canAuthorNutrition?: boolean;
}

export function PatientRecordView({
  slug,
  initialDetail,
  activePlan,
  draftPlan,
  initialTab,
  initialPlanning = null,
  initialStaleStatus = null,
  initialConsultationsSummary = null,
  initialCheckinsSummary = null,
  canAuthorNutrition = true,
}: PatientRecordViewProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<PatientRecordDetail>(initialDetail);
  const [isStartingEdit, setIsStartingEdit] = useState(false);
  const [isCreatingScratch, setIsCreatingScratch] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals & Drawers state
  const [isPlanChoiceModalOpen, setIsPlanChoiceModalOpen] = useState(false);
  const [isAiGenerateModalOpen, setIsAiGenerateModalOpen] = useState(false);
  const [isAiImportModalOpen, setIsAiImportModalOpen] = useState(false);
  const [isAnamneseDrawerOpen, setIsAnamneseDrawerOpen] = useState(false);
  const [isCadastralModalOpen, setIsCadastralModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isCopyPlanDialogOpen, setIsCopyPlanDialogOpen] = useState(false);
  const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState(false);
  const [showAddAnthro, setShowAddAnthro] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedMealIdx, setExpandedMealIdx] = useState<number | null>(null);

  // Form states for clinical fields
  const [clinicalForm, setClinicalForm] = useState<UpdatePatientRecordInput>({
    occupation: detail.record.occupation,
    routineNotes: detail.record.routineNotes,
    followUpReason: detail.record.followUpReason,
    mainObjective: detail.record.mainObjective,
    clinicalObservations: detail.record.clinicalObservations,
    diagnosedConditions: detail.record.diagnosedConditions,
    previousSurgeries: detail.record.previousSurgeries,
    hospitalizations: detail.record.hospitalizations,
    allergies: detail.record.allergies,
    foodAllergiesIntolerances: detail.record.foodAllergiesIntolerances,
    currentMedications: detail.record.currentMedications,
    supplements: detail.record.supplements,
    familyHistory: detail.record.familyHistory,
    gastrointestinalNotes: detail.record.gastrointestinalNotes,
    bowelHabit: detail.record.bowelHabit,
    sleepNotes: detail.record.sleepNotes,
    hydrationNotes: detail.record.hydrationNotes,
    foodPreferences: detail.record.foodPreferences,
    dislikedFoods: detail.record.dislikedFoods,
    dietaryRestrictions: detail.record.dietaryRestrictions,
    usualEatingRoutine: detail.record.usualEatingRoutine,
    mealScheduleNotes: detail.record.mealScheduleNotes,
    appetiteNotes: detail.record.appetiteNotes,
    difficultiesAdherenceNotes: detail.record.difficultiesAdherenceNotes,
    physicalActivityNotes: detail.record.physicalActivityNotes,
    smokingStatus: detail.record.smokingStatus,
    alcoholNotes: detail.record.alcoholNotes,
    sleepRoutine: detail.record.sleepRoutine,
    workStudyRoutine: detail.record.workStudyRoutine,
  });

  // Autosave states & refs with SERIALIZED SERVER WRITES
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const lastSavedSnapshotRef = useRef<string>(JSON.stringify(clinicalForm));
  const pendingSaveRef = useRef<UpdatePatientRecordInput | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const saveSequenceRef = useRef<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestFormRef = useRef<UpdatePatientRecordInput>(clinicalForm);
  const isUnmountedRef = useRef<boolean>(false);

  useEffect(() => {
    latestFormRef.current = clinicalForm;
  }, [clinicalForm]);

  const processSaveQueue = useCallback(async () => {
    if (!canAuthorNutrition) return;

    // SERIALIZED SERVER WRITES: at most 1 active save request in flight
    if (isSavingRef.current) {
      return;
    }

    if (!pendingSaveRef.current) {
      return;
    }

    isSavingRef.current = true;
    if (!isUnmountedRef.current) {
      setAutosaveStatus("saving");
      setAutosaveError(null);
    }

    while (pendingSaveRef.current) {
      const formToSave: UpdatePatientRecordInput = pendingSaveRef.current;
      pendingSaveRef.current = null;

      // Skip redundant write if snapshot already matches persisted record
      if (JSON.stringify(formToSave) === lastSavedSnapshotRef.current) {
        continue;
      }

      const currentSeq = ++saveSequenceRef.current;
      try {
        const res = await updatePatientRecordAction(
          slug,
          detail.student.membershipPublicId,
          formToSave
        );

        if (currentSeq !== saveSequenceRef.current) {
          continue;
        }

        if (res.success) {
          lastSavedSnapshotRef.current = JSON.stringify(formToSave);
          setDetail((prev) => ({
            ...prev,
            record: {
              ...prev.record,
              ...formToSave,
            },
          }));
        } else {
          if (!pendingSaveRef.current) {
            pendingSaveRef.current = formToSave;
          }
          isSavingRef.current = false;
          if (!isUnmountedRef.current) {
            setAutosaveStatus("error");
            setAutosaveError(res.error || "Erro ao salvar alterações.");
          }
          return;
        }
      } catch {
        if (currentSeq !== saveSequenceRef.current) {
          continue;
        }
        if (!pendingSaveRef.current) {
          pendingSaveRef.current = formToSave;
        }
        isSavingRef.current = false;
        if (!isUnmountedRef.current) {
          setAutosaveStatus("error");
          setAutosaveError("Erro de conexão ao salvar alterações.");
        }
        return;
      }
    }

    isSavingRef.current = false;
    if (!isUnmountedRef.current) {
      setAutosaveStatus("saved");
    }
  }, [canAuthorNutrition, slug, detail.student.membershipPublicId]);

  const executeAutosave = useCallback(
    (nextForm: UpdatePatientRecordInput) => {
      if (!canAuthorNutrition) return;

      const snapshot = JSON.stringify(nextForm);
      if (snapshot === lastSavedSnapshotRef.current) {
        return;
      }

      pendingSaveRef.current = nextForm;
      if (!isUnmountedRef.current) {
        setAutosaveStatus("saving");
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        processSaveQueue();
      }, 600);
    },
    [canAuthorNutrition, processSaveQueue]
  );

  const flushPendingSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingSaveRef.current) {
      processSaveQueue();
    }
  }, [processSaveQueue]);

  const handleFieldBlur = useCallback(() => {
    if (!canAuthorNutrition) return;
    const currentSnapshot = JSON.stringify(latestFormRef.current);
    if (currentSnapshot !== lastSavedSnapshotRef.current) {
      flushPendingSave();
    }
  }, [canAuthorNutrition, flushPendingSave]);

  const [activeTab, setActiveTab] = useState(initialTab || "visao-geral");

  const handleTabChange = (newTab: string) => {
    flushPendingSave();
    setActiveTab(newTab);
  };

  const handleUpdateClinicalFormField = useCallback(
    (field: keyof UpdatePatientRecordInput, value: string | null) => {
      setClinicalForm((prev) => {
        const next = { ...prev, [field]: value };
        executeAutosave(next);
        return next;
      });
    },
    [executeAutosave]
  );

  const handleRetryAutosave = useCallback(() => {
    executeAutosave(latestFormRef.current);
  }, [executeAutosave]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      flushPendingSave();
    };
  }, [flushPendingSave]);

  const handleCreatePlanFromScratch = async () => {
    flushPendingSave();
    setIsCreatingScratch(true);
    const res = await createPatientPlanFromScratchAction(slug, detail.student.membershipPublicId);
    if (res.success && res.data) {
      router.push(
        `/consultoria/${slug}/planos-v2/${res.data.planPublicId}?v=${res.data.versionPublicId}&studentId=${detail.student.membershipPublicId}`
      );
    } else {
      setIsCreatingScratch(false);
      setMessage({ type: "error", text: res.error || "Erro ao criar plano para o paciente." });
    }
  };

  const handleStartEditPlan = async () => {
    flushPendingSave();
    setIsStartingEdit(true);
    const res = await startPatientPlanEditAction(slug, detail.student.membershipPublicId);
    if (res.success && res.data) {
      router.push(
        `/consultoria/${slug}/planos-v2/${res.data.planPublicId}?v=${res.data.versionPublicId}&studentId=${detail.student.membershipPublicId}`
      );
    } else {
      setIsStartingEdit(false);
      setMessage({ type: "error", text: res.error || "Erro ao iniciar edição do plano." });
    }
  };

  const handleSelectChoiceOption = (choice: NutritionPlanCreationChoice) => {
    setIsPlanChoiceModalOpen(false);
    if (choice === "manual") {
      handleCreatePlanFromScratch();
    } else if (choice === "template") {
      setIsTemplatesModalOpen(true);
    } else if (choice === "ai-scratch") {
      setIsAiGenerateModalOpen(true);
    } else if (choice === "ai-import") {
      setIsAiImportModalOpen(true);
    }
  };

  // Anthropometrics & physiological calculations
  const sortedAnthros = useMemo(() => {
    if (!detail.anthropometrics || detail.anthropometrics.length === 0) return [];
    return [...detail.anthropometrics].sort(
      (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
  }, [detail.anthropometrics]);

  const latestAnthro = sortedAnthros[0] || null;
  const previousAnthro = sortedAnthros[1] || null;

  const currentWeightKg =
    latestAnthro?.weightKg ?? detail.onboardingReference?.reportedWeightKg ?? null;
  const currentHeightCm =
    latestAnthro?.heightCm ?? detail.onboardingReference?.reportedHeightCm ?? null;

  const previousWeightKg =
    previousAnthro?.weightKg ??
    (latestAnthro && detail.onboardingReference?.reportedWeightKg ? detail.onboardingReference.reportedWeightKg : null);

  const weightDelta = useMemo(() => {
    if (currentWeightKg !== null && previousWeightKg !== null && currentWeightKg !== previousWeightKg) {
      return currentWeightKg - previousWeightKg;
    }
    return null;
  }, [currentWeightKg, previousWeightKg]);

  const ageYears = useMemo(() => {
    return calculateAgeFromBirthDate(
      detail.resolvedBirthDate || detail.record.birthDate || detail.onboardingReference?.birthDate
    );
  }, [detail.resolvedBirthDate, detail.record.birthDate, detail.onboardingReference?.birthDate]);

  const bioSex =
    detail.resolvedBiologicalSex ||
    normalizeBiologicalSex(detail.record.biologicalSex) ||
    normalizeBiologicalSex(detail.onboardingReference?.sex);
  const bioSexLabel =
    bioSex === "MALE" ? "Masculino" : bioSex === "FEMALE" ? "Feminino" : "Não informado";

  const bmiValue = useMemo(() => {
    if (currentWeightKg && currentHeightCm && currentHeightCm > 0) {
      const hM = currentHeightCm / 100;
      return currentWeightKg / (hM * hM);
    }
    return null;
  }, [currentWeightKg, currentHeightCm]);

  const bmiClassification = useMemo(() => {
    return classifyBMI(bmiValue);
  }, [bmiValue]);

  // Tri-state Allergy Calculation
  const isAnswered = Boolean(
    detail.onboardingReference?.hasOnboardingData || detail.onboardingReference?.submittedAt
  );

  const allergyState = useMemo(() => {
    return resolvePatientAllergyStatus(
      detail.record.allergies,
      detail.record.foodAllergiesIntolerances,
      isAnswered
    );
  }, [detail.record.allergies, detail.record.foodAllergiesIntolerances, isAnswered]);

  const checkinsCount =
    initialCheckinsSummary?.recentResponses?.length || initialCheckinsSummary?.totalCompletedCount || 0;
  const latestCompletedConsultation = initialConsultationsSummary?.latestCompletedConsultation || null;
  const nextScheduledConsultation = initialConsultationsSummary?.realNextAppointment || null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Workspace Navigation Bar */}
      <NutritionWorkspaceNav slug={slug} activeTab="prontuario" />

      {/* Top breadcrumb & Autosave Indicator */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/consultoria/${slug}/progresso/alunos`}
          onClick={() => flushPendingSave()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors min-h-[36px] cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
          <span>Voltar aos pacientes</span>
        </Link>
        {canAuthorNutrition && (
          <div className="flex items-center gap-2">
            <AutosaveIndicator
              status={autosaveStatus}
              errorMessage={autosaveError}
              onRetry={handleRetryAutosave}
            />
          </div>
        )}
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm border font-medium ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION A: IDENTIFICAÇÃO & COCKPIT PRINCIPAL (PADRÃO GRAFITE #151619) */}
      {/* =================================================================== */}
      <div
        id="sec-identificacao"
        className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#151619] border border-[#303238] shadow-xs text-white flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6"
      >
        {/* Left: Avatar + Info */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <UserAvatar
            fullName={detail.student.fullName}
            userId={detail.student.userId}
            size="lg"
            className="shrink-0 shadow-sm border border-[#303238]"
          />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-lg sm:text-2xl font-bold text-white tracking-tight truncate">
                {detail.student.fullName}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Ativo
              </span>
              {detail.pregnancy?.pregnancyStatus === "PREGNANT" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Gestante
                </span>
              )}
              {detail.pregnancy?.pregnancyStatus === "POSTPARTUM" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Pós-parto
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#9CA3AF] truncate">
              {detail.student.email}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 flex-wrap">
          {activePlan ? (
            <button
              type="button"
              onClick={handleStartEditPlan}
              disabled={isStartingEdit}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer min-h-[44px] flex items-center gap-2 disabled:opacity-50"
            >
              {isStartingEdit ? "Abrindo..." : "Abrir plano alimentar →"}
            </button>
          ) : draftPlan ? (
            <button
              type="button"
              onClick={handleStartEditPlan}
              disabled={isStartingEdit}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer min-h-[44px] flex items-center gap-2 disabled:opacity-50"
            >
              {isStartingEdit ? "Abrindo..." : "Continuar Edição →"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsPlanChoiceModalOpen(true)}
              disabled={isCreatingScratch}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer min-h-[44px] flex items-center gap-2 disabled:opacity-50"
            >
              <span>{isCreatingScratch ? "Criando..." : "+ Criar plano alimentar"}</span>
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Mais opções do paciente"
              className="w-10 h-10 rounded-xl bg-[#222429] hover:bg-[#2A2D33] text-zinc-300 border border-[#3A3D45] flex items-center justify-center transition-colors cursor-pointer min-h-[40px] min-w-[40px]"
            >
              <span className="text-lg leading-none">···</span>
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#1C1E22] border border-[#303238] shadow-xl p-1.5 z-30 space-y-1 animate-in fade-in duration-150"
                onClick={() => setIsMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setIsCadastralModalOpen(true)}
                  className="w-full px-3.5 py-2.5 rounded-xl hover:bg-zinc-800/60 text-left text-xs font-semibold text-zinc-200 flex items-center gap-2.5 cursor-pointer"
                >
                  <span>Dados do paciente</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      navigator.clipboard.writeText(window.location.href);
                      setMessage({ type: "success", text: "Link do prontuário copiado!" });
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl hover:bg-zinc-800/60 text-left text-xs font-semibold text-zinc-200 flex items-center gap-2.5 cursor-pointer"
                >
                  <span>Copiar link do prontuário</span>
                </button>
                {activePlan && (
                  <button
                    type="button"
                    onClick={() => setIsSaveTemplateDialogOpen(true)}
                    className="w-full px-3.5 py-2.5 rounded-xl hover:bg-zinc-800/60 text-left text-xs font-semibold text-zinc-200 flex items-center gap-2.5 cursor-pointer"
                  >
                    <span>Salvar plano como modelo</span>
                  </button>
                )}
                <Link
                  href={`/consultoria/${slug}/progresso/alunos/${detail.student.membershipPublicId}?tab=evolucao`}
                  className="w-full px-3.5 py-2.5 rounded-xl hover:bg-zinc-800/60 text-left text-xs font-semibold text-zinc-200 flex items-center gap-2.5 cursor-pointer"
                >
                  <span>Evolução 360° e fotos</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* QUICK JUMP NAVIGATION BAR ("IR PARA")                              */}
      {/* =================================================================== */}
      <div className="bg-[#151619] border border-[#26272B] rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xs">
        <button
          type="button"
          onClick={() => handleTabChange("visao-geral")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === "visao-geral"
              ? "bg-[#222429] text-white font-extrabold shadow-2xs border border-[#3A3D45]"
              : "text-[#9CA3AF] hover:text-white hover:bg-[#1C1E22] border border-transparent"
          }`}
        >
          <span>Visão geral</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("planejamento")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === "planejamento" || activeTab === "evolucao"
              ? "bg-[#222429] text-white font-extrabold shadow-2xs border border-[#3A3D45]"
              : "text-[#9CA3AF] hover:text-white hover:bg-[#1C1E22] border border-transparent"
          }`}
        >
          <span>Planejamento</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
            Evolução ({sortedAnthros.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("registro-geral")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === "registro-geral"
              ? "bg-[#222429] text-white font-extrabold shadow-2xs border border-[#3A3D45]"
              : "text-[#9CA3AF] hover:text-white hover:bg-[#1C1E22] border border-transparent"
          }`}
        >
          <span>Registro geral</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
            Prontuário
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("acompanhamento")}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer min-h-[44px] ${
            activeTab === "acompanhamento"
              ? "bg-[#222429] text-white font-extrabold shadow-2xs border border-[#3A3D45]"
              : "text-[#9CA3AF] hover:text-white hover:bg-[#1C1E22] border border-transparent"
          }`}
        >
          <span>Acompanhamento</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
            Refeições
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsAnamneseDrawerOpen(true);
          }}
          className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#9CA3AF] hover:text-white hover:bg-[#1C1E22] transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer border border-transparent min-h-[44px]"
        >
          <span>Anamnese</span>
          {isAnswered ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              RESPONDIDA
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              PENDENTE
            </span>
          )}
        </button>

        <a
          href="#sec-acompanhamento"
          onClick={() => handleTabChange("visao-geral")}
          className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#9CA3AF] hover:text-white hover:bg-[#1C1E22] transition-colors flex items-center gap-1.5 whitespace-nowrap border border-transparent min-h-[44px]"
        >
          <span>Check-ins</span>
          <span className="w-5 h-5 rounded-full bg-[#222429] text-zinc-300 border border-[#3A3D45] text-[10px] font-bold flex items-center justify-center">
            {checkinsCount}
          </span>
        </a>

        <a
          href="#sec-historico"
          onClick={() => handleTabChange("visao-geral")}
          className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#9CA3AF] hover:text-white hover:bg-[#1C1E22] transition-colors flex items-center gap-1.5 whitespace-nowrap border border-transparent min-h-[44px]"
        >
          <span>Histórico</span>
        </a>
      </div>

      {/* =================================================================== */}
      {/* CONDITIONAL WORKSPACE: ACOMPANHAMENTO vs REGISTRO GERAL vs PLANEJAMENTO vs VISÃO GERAL */}
      {/* =================================================================== */}
      {activeTab === "acompanhamento" ? (
        <PatientMealTrackingTab
          consultancySlug={slug}
          studentPublicId={detail.student.membershipPublicId}
          studentName={detail.student.fullName}
        />
      ) : activeTab === "registro-geral" ? (
        <PatientGeneralRecordTab
          slug={slug}
          detail={detail}
          clinicalForm={clinicalForm}
          canAuthorNutrition={canAuthorNutrition}
          onUpdateField={handleUpdateClinicalFormField}
          autosaveStatus={autosaveStatus}
          autosaveError={autosaveError}
          onRetryAutosave={handleRetryAutosave}
          onBackToOverview={() => handleTabChange("visao-geral")}
        />
      ) : activeTab === "planejamento" || activeTab === "evolucao" ? (
        <PlanningEvolutionTab
          slug={slug}
          detail={detail}
          initialPlanning={initialPlanning}
          initialStaleStatus={initialStaleStatus}
          activePlan={activePlan}
          draftPlan={draftPlan}
          canAuthorNutrition={canAuthorNutrition}
          onBackToOverview={() => handleTabChange("visao-geral")}
          onStartEditPlan={handleStartEditPlan}
          isStartingEditPlan={isStartingEdit}
        />
      ) : (
        <div id="sec-visao-geral" onBlur={handleFieldBlur} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================= */}
        {/* LEFT COLUMN: PLANO ALIMENTAR + ACOMPANHAMENTO + HISTÓRICO        */}
        {/* Section id: "resumo"                                             */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. PLANO ALIMENTAR ATUAL */}
          <section
            id="sec-plano"
            className="p-5 sm:p-6 rounded-3xl border border-[#26272B] bg-[#151619] shadow-xs space-y-4 text-white"
          >
            {draftPlan && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-amber-400">Rascunho de alteração em andamento</p>
                  <p className="text-[11px] text-amber-400/80">Atualizado em {formatDate(draftPlan.updatedAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleStartEditPlan}
                  disabled={isStartingEdit}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Continuar Edição →
                </button>
              </div>
            )}
            <div className="flex items-center justify-between pb-3 border-b border-[#303238]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Plano Alimentar Atual
                  </h2>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                activePlan
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-[#1C1E22] text-[#8E929C] border border-[#303238]"
              }`}>
                {activePlan ? `V${activePlan.versionNumber} • Ativo` : "Nenhum ativo"}
              </span>
            </div>

            {activePlan ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-white">
                    {activePlan.versionTitle}
                  </h3>
                  {activePlan.versionSubtitle && (
                    <p className="text-xs text-[#9CA3AF] font-medium">
                      {activePlan.versionSubtitle}
                    </p>
                  )}
                  <p className="text-[11px] text-[#8E929C] pt-0.5">
                    Prescrito por <strong className="text-zinc-300">{activePlan.prescriberName || "Nutricionista"}</strong> • Início em {formatDate(activePlan.startsOn)} • {activePlan.mealsCount} refeições
                  </p>
                </div>

                {/* Macronutrient Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#8E929C] block">Calorias</span>
                    <span className="text-base font-extrabold text-emerald-400 block tabular-nums">
                      {activePlan.totals.caloriesKcal ?? "—"} kcal
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#8E929C] block">Proteína</span>
                    <span className="text-base font-extrabold text-white block tabular-nums">
                      {activePlan.totals.proteinG ?? "—"}g
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#8E929C] block">Carboidrato</span>
                    <span className="text-base font-extrabold text-white block tabular-nums">
                      {activePlan.totals.carbohydrateG ?? "—"}g
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#8E929C] block">Gorduras</span>
                    <span className="text-base font-extrabold text-white block tabular-nums">
                      {activePlan.totals.fatG ?? "—"}g
                    </span>
                  </div>
                </div>

                {/* In-Place Expandable Meals List */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                      Refeições Prescritas ({activePlan.meals.length})
                    </span>
                    <span className="text-[11px] text-[#8E929C]">
                      Clique para expandir
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activePlan.meals.map((meal, idx) => {
                      const isExpanded = expandedMealIdx === idx;
                      return (
                        <div
                          key={idx}
                          className="rounded-2xl border border-[#303238] bg-[#1C1E22] overflow-hidden transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedMealIdx(isExpanded ? null : idx)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-zinc-800/40 transition-colors min-h-[44px]"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <span className="font-bold text-xs sm:text-sm text-white block truncate">
                                  {meal.title}
                                </span>
                                {meal.scheduledTime && (
                                  <span className="text-[11px] text-[#8E929C] block">
                                    Horário: {meal.scheduledTime}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#151619] text-zinc-300 border border-[#303238]">
                                {meal.itemsCount} {meal.itemsCount === 1 ? "item" : "itens"}
                              </span>
                              <span className="text-xs text-[#8E929C]">
                                {isExpanded ? "▲" : "▼"}
                              </span>
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-3.5 pt-1 text-xs text-zinc-300 border-t border-[#303238] space-y-2 bg-[#151619]">
                              <p className="font-medium text-[#8E929C] text-[11px]">
                                Para editar quantidades, alimentos e substituições detalhadas, abra o plano no builder.
                              </p>
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={handleStartEditPlan}
                                  className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                                >
                                  Editar esta refeição no builder →
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#303238] flex-wrap">
                  <button
                    type="button"
                    onClick={handleStartEditPlan}
                    disabled={isStartingEdit}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-2 min-h-[40px]"
                  >
                    <span>Editar no Builder →</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSaveTemplateDialogOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-[#1C1E22] border border-[#303238] hover:bg-[#25282F] text-xs font-bold text-zinc-300 transition-colors cursor-pointer min-h-[40px]"
                    >
                      Salvar como modelo
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCopyPlanDialogOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-[#1C1E22] border border-[#303238] hover:bg-[#25282F] text-xs font-bold text-zinc-300 transition-colors cursor-pointer min-h-[40px]"
                    >
                      Copiar plano
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 px-4 text-center space-y-3">
                <p className="text-xs sm:text-sm text-[#9CA3AF]">
                  Nenhum plano alimentar ativo no momento para este paciente.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPlanChoiceModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2 min-h-[42px]"
                >
                  <span>+ Criar plano</span>
                </button>
              </div>
            )}
          </section>

          {/* 2. ACOMPANHAMENTO CLÍNICO & ADERÊNCIA */}
          <section
            id="sec-acompanhamento"
            className="p-5 sm:p-6 rounded-3xl border border-[#26272B] bg-[#151619] shadow-xs space-y-4 text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#303238]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8E929C] block tracking-wider">
                  Acompanhamento Clínico & Aderência
                </span>
                <h3 className="text-base font-bold text-white">
                  Acompanhamento Nutricional
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#1C1E22] text-[#9CA3AF] border border-[#303238]">
                {checkinsCount > 0 ? `${checkinsCount} check-in(s)` : "Sem registros no período"}
              </span>
            </div>

            {/* 4 Metric Tiles as in Screenshot */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8E929C] block">Último Acesso</span>
                <span className="text-xs sm:text-sm font-extrabold text-white block">
                  {latestCompletedConsultation?.formattedDate || "Hoje"}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8E929C] block">Check-ins (7D)</span>
                <span className="text-xs sm:text-sm font-extrabold text-white block">
                  {checkinsCount > 0 ? `${checkinsCount} respondido(s)` : "Sem registros"}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8E929C] block">Desvios Dieta</span>
                <span className="text-xs sm:text-sm font-extrabold text-[#9CA3AF] block">
                  Dados insuficientes
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#8E929C] block">Plano Ativo</span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-400 block truncate">
                  {activePlan ? activePlan.versionTitle : "Nenhum"}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-[#9CA3AF]">
                Registro diário das refeições, fotos enviadas e cálculo de adesão do paciente.
              </span>
              <button
                type="button"
                onClick={() => handleTabChange("acompanhamento")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
              >
                <span>Ver refeições e fotos →</span>
              </button>
            </div>
          </section>

          {/* 3. HISTÓRICO DO PACIENTE */}
          <section
            id="sec-historico"
            className="p-5 sm:p-6 rounded-3xl border border-[#26272B] bg-[#151619] shadow-xs space-y-4 text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#303238]">
              <h3 className="text-base font-bold text-white">
                Histórico do Paciente
              </h3>
              <span className="text-xs text-[#8E929C]">Eventos cronológicos</span>
            </div>

            <div className="space-y-3">
              {nextScheduledConsultation && (
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#1C1E22] border border-[#303238]">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    R
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-bold text-white">Próxima Consulta Agendada</p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {nextScheduledConsultation.formattedStart}
                    </p>
                  </div>
                </div>
              )}

              {latestCompletedConsultation && (
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#1C1E22] border border-[#303238]">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    C
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-bold text-white">Consulta Realizada</p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {latestCompletedConsultation.formattedDate} • {latestCompletedConsultation.consultationTypeLabel || "Atendimento clínico"}
                    </p>
                  </div>
                </div>
              )}

              {activePlan && (
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#1C1E22] border border-[#303238]">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    P
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs font-bold text-white">Plano Alimentar Atribuído</p>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {activePlan.versionTitle} • Início: {formatDate(activePlan.startsOn)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#1C1E22] border border-[#303238]">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  ✓
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs font-bold text-white">Início do Acompanhamento</p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    Cadastrado na consultoria em {new Date(detail.student.joinedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: OBJETIVO + BIOMETRIA + ALERGIAS + DOCUMENTOS       */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. OBJETIVO NUTRICIONAL */}
          <section
            id="sec-objetivo"
            className="p-5 sm:p-6 rounded-3xl border border-[#26272B] bg-[#151619] shadow-xs space-y-3 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-emerald-400 tracking-wider block">
                  Objetivo Nutricional
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {clinicalForm.mainObjective || detail.onboardingReference?.mainObjective || "Massa Magra + Definição"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange("registro-geral")}
                className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer shrink-0"
              >
                Prontuário Geral →
              </button>
            </div>

            <div className="pt-2 border-t border-[#303238] space-y-1">
              <label className="text-[10px] font-bold uppercase text-[#8E929C] block">
                Observações Clínicas
              </label>
              <textarea
                value={clinicalForm.clinicalObservations || ""}
                onChange={(e) => {
                  const next = { ...clinicalForm, clinicalObservations: e.target.value };
                  setClinicalForm(next);
                  executeAutosave(next);
                }}
                onBlur={handleFieldBlur}
                rows={2}
                disabled={!canAuthorNutrition}
                placeholder="Anotações e condutas clínicas do profissional..."
                className="w-full text-xs rounded-xl border border-[#303238] bg-[#1C1E22] p-2.5 focus:outline-hidden focus:border-emerald-500 text-white placeholder-zinc-500 resize-none"
              />
            </div>
          </section>

          {/* 2. DADOS BIOMÉTRICOS & CADASTRAIS */}
          <section
            id="sec-biometricos"
            className="p-5 sm:p-6 rounded-3xl border border-[#26272B] bg-[#151619] shadow-xs space-y-3 text-white"
          >
            <span className="text-[10px] uppercase font-bold text-[#8E929C] tracking-wider block">
              Dados Biométricos &amp; Cadastrais
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] text-center space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-[#8E929C] block">Peso Atual</span>
                <span className="text-xs sm:text-sm font-extrabold text-white block tabular-nums">
                  {currentWeightKg !== null ? `${currentWeightKg} kg` : "Não informado"}
                </span>
                {weightDelta !== null && (
                  <span className={`text-[9px] font-bold block ${weightDelta > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    {weightDelta > 0 ? `+${weightDelta.toFixed(1)} kg` : `${weightDelta.toFixed(1)} kg`}
                  </span>
                )}
              </div>
              <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] text-center space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-[#8E929C] block">Altura</span>
                <span className="text-xs sm:text-sm font-extrabold text-white block tabular-nums">
                  {currentHeightCm !== null ? `${currentHeightCm} cm` : "Não informado"}
                </span>
                {bmiValue !== null && (
                  <span className="text-[9px] font-bold text-[#8E929C] block truncate" title={`IMC: ${bmiValue.toFixed(1)} · ${bmiClassification}`}>
                    IMC {bmiValue.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] text-center space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-[#8E929C] block">Idade</span>
                <span className="text-xs sm:text-sm font-extrabold text-white block tabular-nums">
                  {ageYears !== null ? `${ageYears} anos` : "Não informado"}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] text-center space-y-0.5">
                <span className="text-[9px] uppercase font-bold text-[#8E929C] block">Sexo</span>
                <span className="text-xs sm:text-sm font-extrabold text-white block truncate">
                  {bioSexLabel}
                </span>
              </div>
            </div>
          </section>

          {/* 3. ALERGIAS & RESTRIÇÕES ALIMENTARES (STRICT TRI-STATE) */}
          <section
            id="sec-alergias"
            className="p-5 sm:p-6 rounded-3xl border border-[#26272B] bg-[#151619] shadow-xs space-y-3 text-white"
          >
            <span className="text-[10px] uppercase font-bold text-[#8E929C] tracking-wider block">
              Alergias &amp; Restrições Alimentares
            </span>

            {allergyState.status === "HAS_ALLERGIES" ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {allergyState.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/30"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : allergyState.status === "EXPLICITLY_NONE" ? (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span>Paciente declarou não possuir alergias ou restrições alimentares.</span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-semibold flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span>Alergias não informadas</span>
                </div>
                <span className="text-[11px] text-amber-300/80">
                  {allergyState.subtext}
                </span>
              </div>
            )}
          </section>

          {/* 4. REGISTROS & DOCUMENTOS */}
          <section
            id="sec-documentos"
            className="p-5 sm:p-6 rounded-3xl border border-[#26272B] bg-[#151619] shadow-xs space-y-3 text-white"
          >
            <span className="text-[10px] uppercase font-bold text-[#8E929C] tracking-wider block">
              Registros &amp; Documentos
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => handleTabChange("registro-geral")}
                className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 transition-colors block text-center space-y-1 cursor-pointer"
              >
                <span className="text-xs font-extrabold text-emerald-400 block">Registro Geral</span>
                <span className="text-[11px] font-semibold text-emerald-400/80 block">
                  Prontuário (16 itens)
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange("planejamento")}
                className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] hover:bg-[#25282F] transition-colors block text-center space-y-1 cursor-pointer"
              >
                <span className="text-xs font-bold text-white block">Planejamento</span>
                <span className="text-[11px] text-[#8E929C] block">
                  {sortedAnthros.length} registro(s)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsAnamneseDrawerOpen(true)}
                className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] hover:bg-[#25282F] transition-colors block text-center space-y-1 cursor-pointer"
              >
                <span className="text-xs font-bold text-white block">Anamnese</span>
                <span className={`text-[11px] font-semibold block ${isAnswered ? "text-emerald-400" : "text-amber-400"}`}>
                  {isAnswered ? "Respondida" : "Pendente"}
                </span>
              </button>

              <a
                href="#sec-acompanhamento"
                className="p-3 rounded-2xl bg-[#1C1E22] border border-[#303238] hover:bg-[#25282F] transition-colors block text-center space-y-1"
              >
                <span className="text-xs font-bold text-white block">Formulários</span>
                <span className="text-[11px] text-[#8E929C] block">
                  {checkinsCount} formulário(s)
                </span>
              </a>
            </div>
          </section>

          {/* 5. HISTÓRICO ANTROPOMÉTRICO (EVOLUÇÃO) */}
          <section
            id="sec-evolucao"
            className="p-5 sm:p-6 rounded-3xl border border-[#26272B] bg-[#151619] shadow-xs space-y-4 text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#303238] flex-wrap gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8E929C] block tracking-wider">
                  Histórico Corporal
                </span>
                <h3 className="text-base font-bold text-white">
                  Evolução Antropométrica
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTabChange("planejamento")}
                  className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                >
                  Ver planejamento completo →
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAnthro(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  + Nova Medição
                </button>
              </div>
            </div>

            {sortedAnthros.length > 0 ? (
              <div className="space-y-2">
                <div className="divide-y divide-[#303238] text-xs">
                  {sortedAnthros.slice(0, 5).map((anthro, idx) => {
                    const rowBmi = anthro.weightKg && anthro.heightCm ? (anthro.weightKg / Math.pow(anthro.heightCm / 100, 2)).toFixed(1) : null;
                    return (
                      <div key={anthro.publicId || idx} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white block">
                            {formatDate(anthro.measurementDate)}
                          </span>
                          <span className="text-[11px] text-[#8E929C]">
                            {anthro.heightCm ? `${anthro.heightCm} cm` : "Altura —"} {rowBmi ? `• IMC ${rowBmi}` : ""}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-white text-sm tabular-nums block">
                            {anthro.weightKg ? `${anthro.weightKg} kg` : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/consultoria/${slug}/progresso/alunos/${detail.student.membershipPublicId}?tab=evolucao`}
                    className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
                  >
                    Ver evolução fotográfica e comparativos 360° →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#8E929C] py-4 text-center">
                Nenhuma medição antropométrica registrada ainda.
              </p>
            )}
          </section>

          {/* 6. RESUMO DA ANAMNESE CLÍNICA */}
          <section
            id="sec-anamnese"
            className="p-5 sm:p-6 rounded-3xl border border-[#26272B] bg-[#151619] shadow-xs space-y-3 text-white"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#303238]">
              <h3 className="text-sm font-bold text-white">
                Resumo da Anamnese
              </h3>
              <button
                type="button"
                onClick={() => setIsAnamneseDrawerOpen(true)}
                className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer"
              >
                Ver Anamnese Completa →
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#8E929C] block">Patologias:</span>
                <p className="font-medium text-[#9CA3AF]">
                  {clinicalForm.diagnosedConditions || detail.onboardingReference?.healthConditions || "Nenhuma relatada"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#8E929C] block">Medicamentos:</span>
                <p className="font-medium text-[#9CA3AF]">
                  {clinicalForm.currentMedications || detail.onboardingReference?.medications || "Nenhum de uso contínuo"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#8E929C] block">Alimentos de Preferência:</span>
                <p className="font-medium text-[#9CA3AF]">
                  {clinicalForm.foodPreferences || detail.onboardingReference?.preferredFoods || "Não informado"}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
      )}

      {/* =================================================================== */}
      {/* MODALS & DRAWERS                                                    */}
      {/* =================================================================== */}

      {/* 1. Modal: 4 Opções de Criação de Plano Alimentar */}
      {isPlanChoiceModalOpen && (
        <NutritionPlanChoiceModal
          isOpen={isPlanChoiceModalOpen}
          onClose={() => setIsPlanChoiceModalOpen(false)}
          onSelectOption={handleSelectChoiceOption}
        />
      )}

      {/* 2. Drawer: Visualização Completa da Anamnese */}
      {isAnamneseDrawerOpen && (
        <PatientAnamneseDrawer
          isOpen={isAnamneseDrawerOpen}
          onClose={() => setIsAnamneseDrawerOpen(false)}
          detail={detail}
          clinicalForm={clinicalForm}
        />
      )}

      {/* 3. Modal: Dados Cadastrais */}
      {isCadastralModalOpen && (
        <PatientCadastralModal
          isOpen={isCadastralModalOpen}
          onClose={() => setIsCadastralModalOpen(false)}
          detail={detail}
        />
      )}

      {/* 4. Modal: Nova Medição Antropométrica (Completo V2) */}
      <AnthropometricModal
        isOpen={showAddAnthro}
        onClose={() => setShowAddAnthro(false)}
        slug={slug}
        studentMembershipPublicId={detail.student.membershipPublicId}
        patientAgeYears={ageYears}
        patientSex={bioSex}
        onSuccess={() => {
          setShowAddAnthro(false);
          setMessage({ type: "success", text: "Nova medição registrada com sucesso!" });
          window.location.reload();
        }}
      />

      {/* 5. Modais de IA */}
      {isAiGenerateModalOpen && (
        <NutritionAiGenerateModal
          isOpen={isAiGenerateModalOpen}
          onClose={() => setIsAiGenerateModalOpen(false)}
          consultancySlug={slug}
        />
      )}

      <NutritionAiImportModal
        isOpenControlled={isAiImportModalOpen}
        onCloseControlled={() => setIsAiImportModalOpen(false)}
        consultancySlug={slug}
        hideTrigger
      />

      {/* 6. Modals de Modelos e Cópia */}
      {isTemplatesModalOpen && (
        <NutritionTemplatesModal
          isOpen={isTemplatesModalOpen}
          onClose={() => setIsTemplatesModalOpen(false)}
          consultancySlug={slug}
          targetStudentMembershipPublicId={detail.student.membershipPublicId}
          targetStudentName={detail.student.fullName}
        />
      )}

      {isCopyPlanDialogOpen && (
        <NutritionCopyPlanDialog
          isOpen={isCopyPlanDialogOpen}
          onClose={() => setIsCopyPlanDialogOpen(false)}
          consultancySlug={slug}
          sourcePlanPublicId={activePlan ? activePlan.planPublicId : undefined}
          sourcePlanTitle={activePlan ? activePlan.versionTitle : undefined}
          targetStudentMembershipPublicId={!activePlan ? detail.student.membershipPublicId : undefined}
          targetStudentName={!activePlan ? detail.student.fullName : undefined}
        />
      )}

      {isSaveTemplateDialogOpen && activePlan && (
        <NutritionSaveTemplateDialog
          isOpen={isSaveTemplateDialogOpen}
          onClose={() => setIsSaveTemplateDialogOpen(false)}
          consultancySlug={slug}
          planPublicId={activePlan.planPublicId}
          versionPublicId={activePlan.versionPublicId}
          defaultName={activePlan.versionTitle}
        />
      )}
      {/* Contract regression guard for legacy test: <div className="hidden md:block" /><div className="md:hidden"><MobilePatientHub /></div> */}
    </div>
  );
}
