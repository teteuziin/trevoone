"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/account/user-avatar";
import {
  DuotoneOverviewIcon,
  DuotoneTrainingIcon,
  DuotonePhotosIcon,
  DuotoneAnamnesisIcon,
  DuotoneFormsIcon,
  DuotoneNutritionIcon,
} from "@/components/ui/icons/duotone-icons";
import {
  NutritionPlanChoiceModal,
  type NutritionPlanCreationChoice,
} from "../nutrition-v2/nutrition-plan-choice-modal";
import { NutritionAiGenerateModal } from "../nutrition-v2/nutrition-ai-generate-modal";
import { NutritionAiImportModal } from "../nutrition-v2/nutrition-ai-import-modal";
import { NutritionTemplatePickerModal } from "../nutrition-v2/nutrition-template-picker-modal";
import { PersonalRequestModal, type RequestModalType } from "./personal-request-modal";
import { StudentNewWorkoutSheet } from "./student-new-workout-sheet";
import { StudentPhotosMural } from "./student-photos-mural";
import { StudentAnamnesisHub } from "./student-anamnesis-hub";
import { StudentFormsHub } from "./student-forms-hub";
import type { StudentEvaluationResult } from "@/lib/monitoring/evaluator";
import type {
  PersonalStudentDetail,
} from "@/lib/consultancies/personal-student-hub";

interface PersonalStudentDetailViewProps {
  consultancySlug: string;
  detail: PersonalStudentDetail;
  studentMonitoring?: StudentEvaluationResult | null;
  effectiveMode?: string;
  userRoles?: string[];
  backHref?: string;
}

type TabKey =
  | "visao-geral"
  | "prontuario"
  | "treinos"
  | "fotos"
  | "anamnese"
  | "formularios"
  | "avaliacoes"
  | "nutricao"
  | "planos"
  | "evolucao";

// ============================================================================
// ICONS
// ============================================================================
function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function DumbbellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

function PhotoIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function FileTextIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ClipboardCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function ScaleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  );
}

function AppleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v2m0 0a4.5 4.5 0 014.5 4.5c0 3-2 6-4.5 8.5C9.5 17 7.5 14 7.5 11a4.5 4.5 0 014.5-4.5zm0-2c1.5-1 3-.5 3-.5" />
    </svg>
  );
}

function MoreDotsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function formatDisplayDate(dateVal: unknown): string {
  if (!dateVal) return "—";
  const str = String(dateVal).trim();
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return str;
  const d = String(parsed.getUTCDate()).padStart(2, "0");
  const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const y = parsed.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

export function PersonalStudentDetailView({
  consultancySlug,
  detail,
  studentMonitoring,
  effectiveMode,
  userRoles = [],
  backHref,
}: PersonalStudentDetailViewProps) {
  const router = useRouter();
  const {
    student,
    overview,
    photos,
    anamnesis,
    forms,
    workouts,
    completedSessions,
    measurements,
    nutrition = [],
  } = detail;

  const [activeTab, setActiveTab] = useState<TabKey>("visao-geral");
  const [isMobileSectionMenuOpen, setIsMobileSectionMenuOpen] = useState(false);
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);

  const [isNewWorkoutSheetOpen, setIsNewWorkoutSheetOpen] = useState(false);
  const [requestModal, setRequestModal] = useState<{ isOpen: boolean; type: RequestModalType }>({
    isOpen: false,
    type: "PHOTOS",
  });

  // Nutrition plan creation choice modal states
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isGenerateAiOpen, setIsGenerateAiOpen] = useState(false);
  const [isImportAiOpen, setIsImportAiOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  const handleSelectPlanChoice = (choice: NutritionPlanCreationChoice) => {
    setIsChoiceModalOpen(false);
    const studentPubId = student.membershipPublicId;
    if (choice === "manual") {
      router.push(`/consultoria/${consultancySlug}/planos-v2/novo?student=${studentPubId}&studentId=${studentPubId}`);
    } else if (choice === "ai-scratch") {
      setIsGenerateAiOpen(true);
    } else if (choice === "ai-import") {
      setIsImportAiOpen(true);
    } else if (choice === "template") {
      setIsTemplatePickerOpen(true);
    }
  };

  const isNutritionist = effectiveMode === "NUTRITIONIST" || (userRoles.includes("NUTRITIONIST") && effectiveMode !== "PERSONAL");
  const isPersonal = effectiveMode === "PERSONAL" || (userRoles.includes("PERSONAL") && effectiveMode !== "NUTRITIONIST");
  const isEffectiveNutritionist = effectiveMode === "NUTRITIONIST" || (isNutritionist && !isPersonal);

  const createPlanHref = `/consultoria/${consultancySlug}/planos-v2/novo?student=${student.membershipPublicId}&studentId=${student.membershipPublicId}`;
  const createWorkoutHref = `/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`;

  // Real active workout vs ended workouts
  const activeWorkout = workouts.find((w) => w.status === "ACTIVE") || null;
  const endedWorkouts = workouts.filter((w) => w.status === "ENDED");
  const activeNutritionPlan = nutrition.find((n) => n.status === "ACTIVE") || null;
  const draftNutritionPlan = detail.draftNutritionPlan || null;

  // Navigation sections list (Ordered per specification)
  const desktopTabs: Array<{
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    badge?: string;
  }> = isEffectiveNutritionist
    ? [
        { key: "visao-geral", label: "Visão geral", icon: DuotoneOverviewIcon },
        {
          key: "prontuario",
          label: "Registro Geral (Prontuário)",
          icon: DuotoneAnamnesisIcon,
          badge: "Etapa 9",
        },
        { key: "planos", label: "Planos alimentares", icon: DuotoneNutritionIcon, count: nutrition.length },
        { key: "evolucao", label: "Evolução", icon: DuotonePhotosIcon, count: photos.length + measurements.length },
        {
          key: "anamnese",
          label: "Anamnese",
          icon: DuotoneAnamnesisIcon,
          badge: overview.hasAnamnesis ? "Preenchida" : "Pendente",
        },
        { key: "formularios", label: "Formulários", icon: DuotoneFormsIcon, count: forms.length },
      ]
    : [
        { key: "visao-geral", label: "Visão Geral", icon: DuotoneOverviewIcon },
        { key: "treinos", label: "Treinos", icon: DuotoneTrainingIcon, count: workouts.length },
        { key: "fotos", label: "Fotos", icon: DuotonePhotosIcon, count: photos.length },
        {
          key: "anamnese",
          label: "Anamnese",
          icon: DuotoneAnamnesisIcon,
          badge: overview.hasAnamnesis ? "Preenchida" : "Pendente",
        },
        { key: "formularios", label: "Formulários", icon: DuotoneFormsIcon, count: forms.length },
      ];

  if (!isEffectiveNutritionist) {
    if (measurements.length > 0) {
      desktopTabs.push({ key: "avaliacoes", label: "Avaliações", icon: ScaleIcon, count: measurements.length });
    }
    if (nutrition.length > 0) {
      desktopTabs.push({ key: "nutricao", label: "Nutrição", icon: AppleIcon, count: nutrition.length });
    }
  }

  // Mobile sections list matching desktop
  const mobileSections = desktopTabs.map((t) => ({
    id: t.key,
    label: t.label,
    icon: t.icon,
    count: t.count,
    badge: t.badge,
  }));

  const currentSection =
    desktopTabs.find((t) => t.key === activeTab) || desktopTabs[0];

  return (
    <div className="space-y-5 sm:space-y-6 pb-16">
      {/* =========================================================================
          BREADCRUMB / VOLTAR AOS PACIENTES OU ALUNOS
          ========================================================================= */}
      <div className="flex items-center justify-between">
        <Link
          href={backHref || `/consultoria/${consultancySlug}/progresso/alunos`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors min-h-[36px] cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span>{isEffectiveNutritionist ? "Voltar aos pacientes" : "Voltar aos alunos"}</span>
        </Link>
      </div>

      {/* =========================================================================
          CABEÇALHO EXECUTIVO DO PERFIL (Padrão Preto/Grafite #151619)
          ========================================================================= */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#151619] border border-[#303238] shadow-xs text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          {/* Aluno: Avatar + Nome + Badge Ativo + Email */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <UserAvatar
              fullName={student.name}
              userPublicId={student.userPublicId}
              size="lg"
              className="shrink-0 shadow-sm border border-[#303238]"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-lg sm:text-2xl font-bold text-white tracking-tight truncate">
                  {student.name}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Ativo
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#9CA3AF] truncate">
                {student.email}
                {student.phone ? ` • ${student.phone}` : ""}
              </p>
            </div>
          </div>

          {/* Ações do Cabeçalho: CTA Contextual Único + Menu Secundário */}
          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t border-[#303238] sm:border-0">
            {isEffectiveNutritionist && (
              <Link
                href={`/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-emerald-400 bg-[#222429] hover:bg-[#2A2D33] border border-emerald-500/30 transition-colors min-h-[44px] shadow-xs cursor-pointer"
              >
                <DuotoneAnamnesisIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Prontuário &amp; Registro Geral</span>
                <span className="sm:hidden">Prontuário</span>
              </Link>
            )}
            {activeTab === "planos" || (activeTab === "nutricao" || (effectiveMode === "NUTRITIONIST" && !activeWorkout) || (isNutritionist && !isPersonal)) ? (
              activeNutritionPlan ? (
                <Link
                  href={`/consultoria/${consultancySlug}/planos-v2/${activeNutritionPlan.planPublicId}?student=${student.membershipPublicId}`}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors min-h-[44px] shadow-sm cursor-pointer"
                >
                  <AppleIcon className="w-4 h-4" />
                  <span>Abrir plano</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsChoiceModalOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors min-h-[44px] shadow-sm cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Criar plano alimentar</span>
                </button>
              )
            ) : activeWorkout ? (
              <Link
                href={`/consultoria/${consultancySlug}/rotinas/${activeWorkout.workoutPublicId}?version=${activeWorkout.versionPublicId}&student=${student.membershipPublicId}`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors min-h-[44px] shadow-sm cursor-pointer"
              >
                <DumbbellIcon className="w-4 h-4" />
                <span>Abrir treino</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsNewWorkoutSheetOpen(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors min-h-[44px] shadow-sm cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Criar treino</span>
              </button>
            )}

            {/* Menu Dropdown de Ações Secundárias */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSecondaryMenuOpen((prev) => !prev)}
                aria-label="Mais opções do aluno"
                className="inline-flex items-center justify-center p-2.5 rounded-xl text-[#9CA3AF] hover:text-white bg-[#222429] hover:bg-[#2A2D33] border border-[#3A3D45] min-h-[44px] min-w-[44px] transition-colors cursor-pointer"
              >
                <MoreDotsIcon className="w-5 h-5" />
              </button>

              {isSecondaryMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSecondaryMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 z-50 w-64 p-1.5 rounded-2xl bg-[#1C1E22] border border-[#303238] shadow-xl space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setRequestModal({ isOpen: true, type: "PHOTOS" });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#E5E7EB] hover:bg-[#2A2D33] transition-colors min-h-[40px] text-left cursor-pointer"
                    >
                      <PhotoIcon className="w-4 h-4 text-blue-400" />
                      <span>Solicitar fotos de evolução</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setRequestModal({ isOpen: true, type: "ANAMNESIS" });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#E5E7EB] hover:bg-[#2A2D33] transition-colors min-h-[40px] text-left cursor-pointer"
                    >
                      <ClipboardCheckIcon className="w-4 h-4 text-violet-400" />
                      <span>Solicitar anamnese</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setRequestModal({ isOpen: true, type: "FORM" });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#E5E7EB] hover:bg-[#2A2D33] transition-colors min-h-[40px] text-left cursor-pointer"
                    >
                      <FileTextIcon className="w-4 h-4 text-teal-400" />
                      <span>Solicitar questionário / formulário</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        router.push(`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#E5E7EB] hover:bg-[#2A2D33] transition-colors min-h-[40px] text-left cursor-pointer"
                    >
                      <ScaleIcon className="w-4 h-4 text-amber-400" />
                      <span>Abrir Cockpit de Evolução 360°</span>
                    </button>
                    <Link
                      href={createWorkoutHref}
                      onClick={() => setIsSecondaryMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#E5E7EB] hover:bg-[#2A2D33] transition-colors min-h-[40px] text-left"
                    >
                      <DumbbellIcon className="w-4 h-4 text-emerald-400" />
                      <span>{isEffectiveNutritionist ? "Atribuir rotina de treino" : "Criar nova rotina de treino"}</span>
                    </Link>
                    <Link
                      href={createPlanHref}
                      onClick={() => setIsSecondaryMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#E5E7EB] hover:bg-[#2A2D33] transition-colors min-h-[40px] text-left"
                    >
                      <AppleIcon className="w-4 h-4 text-emerald-400" />
                      <span>Novo plano alimentar</span>
                    </Link>
                    {student.email && (
                      <a
                        href={`mailto:${student.email}`}
                        onClick={() => setIsSecondaryMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#E5E7EB] hover:bg-[#2A2D33] transition-colors min-h-[40px] text-left"
                      >
                        <span className="w-4 text-center text-sm text-[#9CA3AF]">✉</span>
                        <span>Enviar e-mail para o aluno</span>
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          NAVEGAÇÃO ENTRE AS SEÇÕES (Superfície Sólida + Ícones Duotone)
          ========================================================================= */}
      {/* Desktop Bar */}
      <div className="hidden sm:block">
        <div className="p-1 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-2xs">
          <nav className="flex space-x-1" aria-label="Seções do Aluno">
            {desktopTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              if (tab.key === "prontuario") {
                return (
                  <Link
                    key={tab.key}
                    href={`/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] cursor-pointer text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/25"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Abrir →
                    </span>
                  </Link>
                );
              }

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] cursor-pointer ${
                    isActive
                      ? "bg-[#F3F4F6] dark:bg-[#222429] text-[#111827] dark:text-white font-extrabold shadow-2xs border border-[#E5E7EB] dark:border-[#3A3D45]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#F9FAFB] dark:hover:bg-[#1C1E22]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-white dark:bg-[#151619] text-[var(--brand)] border border-[var(--border-subtle)]"
                          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && !isActive && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        tab.badge === "Preenchida"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Compact Section Selector */}
      <div className="sm:hidden relative">
        <button
          type="button"
          onClick={() => setIsMobileSectionMenuOpen((prev) => !prev)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-2xs min-h-[44px] cursor-pointer"
          aria-expanded={isMobileSectionMenuOpen}
          aria-label="Alternar seção"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <currentSection.icon className="w-4 h-4" />
            <span className="font-bold text-xs text-[var(--text-primary)]">
              {currentSection.label}
            </span>
            {currentSection.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[var(--brand)]/10 text-[var(--brand)]">
                {currentSection.count}
              </span>
            )}
            {currentSection.badge && (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                  currentSection.badge === "Preenchida"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {currentSection.badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
            <span>Mudar</span>
            <ChevronDownIcon
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isMobileSectionMenuOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {isMobileSectionMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsMobileSectionMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 p-1.5 rounded-2xl bg-white dark:bg-[#1C1E22] border border-[#E5E7EB] dark:border-[#303238] shadow-xl space-y-0.5">
              {mobileSections.map((sec) => {
                const SecIcon = sec.icon;
                const isSelected = activeTab === sec.id;

                if (sec.id === "prontuario") {
                  return (
                    <Link
                      key={sec.id}
                      href={`/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 min-h-[44px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <SecIcon className="w-4 h-4" />
                        <span>{sec.label}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        Abrir →
                      </span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(sec.id as TabKey);
                      setIsMobileSectionMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors min-h-[44px] cursor-pointer ${
                      isSelected
                        ? "bg-[var(--brand)]/10 text-[var(--brand)] font-bold"
                        : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <SecIcon className="w-4 h-4" />
                      <span>{sec.label}</span>
                    </div>
                    {sec.count !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                        {sec.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* =========================================================================
          SEÇÃO 1: VISÃO GERAL (2 Colunas Desktop, 1 Coluna Mobile)
          ========================================================================= */}
      {activeTab === "visao-geral" && (
        <div className="space-y-5" data-testid="tab-visao-geral">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {isEffectiveNutritionist ? (
              <>
                {/* Coluna 1: Plano Alimentar Atual + Acompanhamento Nutricional */}
                <div className="space-y-5">
                  {/* Plano Alimentar Atual */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AppleIcon className="w-5 h-5 text-emerald-500" />
                        <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                          Plano Alimentar Atual
                        </h3>
                      </div>
                      {activeNutritionPlan ? (
                        <Badge variant="success" size="sm">Ativo</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Nenhum ativo</Badge>
                      )}
                    </div>

                    {activeNutritionPlan ? (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                          <p className="font-heading text-sm font-bold text-[var(--text-primary)] truncate">
                            {activeNutritionPlan.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[var(--text-tertiary)]">
                            <span>Versão {activeNutritionPlan.versionNumber}</span>
                            <span>•</span>
                            <span>Início: {formatDisplayDate(activeNutritionPlan.startsOn)}</span>
                            {activeNutritionPlan.endsOn && (
                              <>
                                <span>•</span>
                                <span>Término: {formatDisplayDate(activeNutritionPlan.endsOn)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {draftNutritionPlan && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              Nova versão em rascunho (v{draftNutritionPlan.versionNumber})
                            </span>
                            <Link
                              href={`/consultoria/${consultancySlug}/planos-v2/${draftNutritionPlan.planPublicId}?version=${draftNutritionPlan.versionPublicId}&student=${student.membershipPublicId}`}
                              className="font-bold underline shrink-0 hover:text-amber-600 dark:hover:text-amber-300"
                            >
                              Continuar edição →
                            </Link>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/consultoria/${consultancySlug}/planos-v2/${activeNutritionPlan.planPublicId}?student=${student.membershipPublicId}`}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors min-h-[40px] cursor-pointer"
                          >
                            <span>Abrir plano</span>
                            <ChevronRightIcon className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setActiveTab("planos")}
                            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 min-h-[40px] cursor-pointer"
                          >
                            Ver histórico →
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-[var(--text-secondary)]">
                          Nenhum plano alimentar ativo no momento para este paciente.
                        </p>
                        {draftNutritionPlan && (
                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center justify-between gap-2">
                            <span className="font-medium truncate">
                              Rascunho disponível: {draftNutritionPlan.title} (v{draftNutritionPlan.versionNumber})
                            </span>
                            <Link
                              href={`/consultoria/${consultancySlug}/planos-v2/${draftNutritionPlan.planPublicId}?version=${draftNutritionPlan.versionPublicId}&student=${student.membershipPublicId}`}
                              className="font-bold underline shrink-0 hover:text-amber-600 dark:hover:text-amber-300"
                            >
                              Continuar edição →
                            </Link>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsChoiceModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors min-h-[40px] cursor-pointer"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          <span>Criar plano</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Acompanhamento Nutricional */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                          Acompanhamento Clínico &amp; Aderência
                        </span>
                        <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                          Acompanhamento Nutricional
                        </h3>
                      </div>
                      {studentMonitoring && (studentMonitoring.metrics.recentCheckinsCount ?? 0) > 0 ? (
                        <Badge
                          variant={
                            studentMonitoring.state === "CRITICAL"
                              ? "danger"
                              : studentMonitoring.state === "ATTENTION"
                              ? "warning"
                              : "success"
                          }
                          size="sm"
                        >
                          {studentMonitoring.state === "CRITICAL"
                            ? "Crítico"
                            : studentMonitoring.state === "ATTENTION"
                            ? "Atenção"
                            : "Em Dia"}
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Sem registros no período</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                          Último Acesso
                        </span>
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {studentMonitoring?.metrics.lastActiveAt
                            ? new Date(studentMonitoring.metrics.lastActiveAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                              })
                            : "Sem registro"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                          Check-ins (7d)
                        </span>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {(studentMonitoring?.metrics.recentCheckinsCount ?? 0) > 0
                            ? `${studentMonitoring?.metrics.recentCheckinsCount} registrado(s)`
                            : "Sem registros"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                          Desvios Dieta
                        </span>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {(studentMonitoring?.metrics.recentCheckinsCount ?? 0) > 0
                            ? (studentMonitoring && studentMonitoring.metrics.offPlanDietCount > 0
                                ? `${studentMonitoring.metrics.offPlanDietCount} fora do plano`
                                : "Sem desvios")
                            : "Dados insuficientes"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                          Plano Ativo
                        </span>
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {activeNutritionPlan ? `v${activeNutritionPlan.versionNumber}` : "Nenhum"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Objetivo Nutricional + Dados Pessoais + Alergias + Registros */}
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
                          Objetivo Nutricional
                        </span>
                        <p className="font-heading text-base font-bold text-[var(--text-primary)]">
                          {overview.nutritionGoal || overview.objective || "Não informado"}
                        </p>
                        {!overview.nutritionGoal && !overview.objective && (
                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            O paciente ainda não informou sua meta na anamnese nutricional.
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors shrink-0 cursor-pointer"
                      >
                        <span>Prontuário Geral →</span>
                      </Link>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                        Dados Biométricos &amp; Cadastrais
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Peso Atual</span>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {overview.weightKg ? `${overview.weightKg} kg` : "Não informado"}
                          </p>
                          {overview.lastWeightRecordedOn && (
                            <span className="text-[10px] text-[var(--text-tertiary)] block">
                              em {formatDisplayDate(overview.lastWeightRecordedOn)}
                            </span>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Altura</span>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {overview.heightCm ? `${overview.heightCm} cm` : "Não informado"}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Idade</span>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {overview.age ? `${overview.age} anos` : (overview.birthDate ? formatDisplayDate(overview.birthDate) : "Não informado")}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Sexo</span>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {overview.sex ? (overview.sex === "M" || overview.sex === "MALE" ? "Masculino" : overview.sex === "F" || overview.sex === "FEMALE" ? "Feminino" : overview.sex) : "Não informado"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Alergias e Restrições Alimentares com Destaque */}
                    <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 block">
                        Alergias &amp; Restrições Alimentares
                      </span>
                      {overview.allergies || overview.intolerances || overview.dietaryRestrictions ? (
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2 text-xs">
                          {overview.allergies && (
                            <div>
                              <span className="font-bold text-rose-700 dark:text-rose-300">Alergias: </span>
                              <span className="text-rose-900 dark:text-rose-200">{overview.allergies}</span>
                            </div>
                          )}
                          {overview.intolerances && (
                            <div>
                              <span className="font-bold text-amber-700 dark:text-amber-300">Intolerâncias: </span>
                              <span className="text-amber-900 dark:text-amber-200">{overview.intolerances}</span>
                            </div>
                          )}
                          {overview.dietaryRestrictions && (
                            <div>
                              <span className="font-bold text-zinc-700 dark:text-zinc-300">Restrições Clínicas: </span>
                              <span className="text-zinc-900 dark:text-zinc-200">{overview.dietaryRestrictions}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                          Nenhuma alergia ou restrição alimentar relatada na anamnese.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Registros Clínicos & Documentos */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                      Registros &amp; Documentos
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab("evolucao")}
                        className="p-3 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-bold text-[var(--text-primary)] block">Evolução</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">{photos.length + measurements.length} registro(s)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("anamnese")}
                        className="p-3 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-bold text-[var(--text-primary)] block">Anamnese</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">{overview.hasAnamnesis ? "Preenchida" : "Pendente"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("formularios")}
                        className="p-3 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-bold text-[var(--text-primary)] block">Formulários</span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">{forms.length} formulário(s)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Coluna 1: Radar do Aluno + Treino Atual */}
                <div className="space-y-5">
                  {/* Radar do Aluno / Acompanhamento */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                          Acompanhamento &amp; Aderência
                        </span>
                        <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                          Radar do Aluno
                        </h3>
                      </div>
                      {studentMonitoring ? (
                        <Badge
                          variant={
                            studentMonitoring.state === "CRITICAL"
                              ? "danger"
                              : studentMonitoring.state === "ATTENTION"
                              ? "warning"
                              : studentMonitoring.state === "INSUFFICIENT_DATA"
                              ? "neutral"
                              : "success"
                          }
                          size="sm"
                        >
                          {studentMonitoring.state === "CRITICAL"
                            ? "Crítico"
                            : studentMonitoring.state === "ATTENTION"
                            ? "Requer Atenção"
                            : studentMonitoring.state === "INSUFFICIENT_DATA"
                            ? "Sem Dados Suficientes"
                            : "Em Dia"}
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Monitoramento Normal</Badge>
                      )}
                    </div>

                    {/* 4 Indicadores Objetivos em Linha Compacta */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                          Último Uso
                        </span>
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {studentMonitoring?.metrics.lastActiveAt
                            ? new Date(studentMonitoring.metrics.lastActiveAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                              })
                            : "Sem registro"}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                          Treinos (7d)
                        </span>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {studentMonitoring?.metrics.completedWorkoutsLast7d ?? 0} concluído(s)
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                          Check-ins (7d)
                        </span>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {studentMonitoring?.metrics.recentCheckinsCount ?? 0} registrado(s)
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase block">
                          Nutrição (7d)
                        </span>
                        <p className="text-xs font-bold text-[var(--text-primary)]">
                          {studentMonitoring && studentMonitoring.metrics.offPlanDietCount > 0
                            ? `${studentMonitoring.metrics.offPlanDietCount} fora do plano`
                            : "Sem desvios"}
                        </p>
                      </div>
                    </div>

                    {/* Alertas em aberto (se houver) */}
                    {studentMonitoring &&
                      studentMonitoring.alerts.filter((a) => a.status === "OPEN").length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                          {studentMonitoring.alerts
                            .filter((a) => a.status === "OPEN")
                            .map((alert) => (
                              <div
                                key={alert.id}
                                className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center gap-2 text-xs"
                              >
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                    alert.severity === "CRITICAL"
                                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  }`}
                                >
                                  {alert.severity === "CRITICAL" ? "Crítico" : "Atenção"}
                                </span>
                                <span className="text-[var(--text-primary)] font-medium truncate">
                                  {alert.statement}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                  </div>

                  {/* Treino Atual */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <DuotoneTrainingIcon className="w-5 h-5" />
                        <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                          Treino Atual
                        </h3>
                      </div>
                      {activeWorkout ? (
                        <Badge variant="success" size="sm">Em andamento</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Nenhum ativo</Badge>
                      )}
                    </div>

                    {activeWorkout ? (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                          <p className="font-heading text-sm font-bold text-[var(--text-primary)] truncate">
                            {activeWorkout.title}
                          </p>
                          {activeWorkout.subtitle && (
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {activeWorkout.subtitle}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[var(--text-tertiary)]">
                            <span>Versão {activeWorkout.versionNumber}</span>
                            <span>•</span>
                            <span>Início: {formatDisplayDate(activeWorkout.startsOn)}</span>
                            {activeWorkout.endsOn && (
                              <>
                                <span>•</span>
                                <span>Término: {formatDisplayDate(activeWorkout.endsOn)}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/consultoria/${consultancySlug}/rotinas/${activeWorkout.workoutPublicId}?version=${activeWorkout.versionPublicId}&student=${student.membershipPublicId}`}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors min-h-[40px] cursor-pointer"
                          >
                            <span>Abrir treino</span>
                            <ChevronRightIcon className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setActiveTab("treinos")}
                            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 min-h-[40px] cursor-pointer"
                          >
                            Ver todos os treinos →
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-[var(--text-secondary)]">
                          Nenhuma rotina de treino ativa no momento para este aluno.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsNewWorkoutSheetOpen(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors min-h-[40px] cursor-pointer"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          <span>Criar treino</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna 2: Objetivo e Dados Pessoais + Registros */}
                <div className="space-y-5">
                  {/* Objetivo e Dados Pessoais */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] block">
                        Objetivo Principal
                      </span>
                      <p className="font-heading text-base font-bold text-[var(--text-primary)]">
                        {overview.objective || "Não informado"}
                      </p>
                      {!overview.objective && (
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          O aluno ainda não informou sua meta na anamnese ou cadastro.
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                        Dados Biométricos &amp; Cadastrais
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Peso Atual</span>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {overview.weightKg ? `${overview.weightKg} kg` : "Não informado"}
                          </p>
                          {overview.lastWeightRecordedOn && (
                            <span className="text-[10px] text-[var(--text-tertiary)] block">
                              em {formatDisplayDate(overview.lastWeightRecordedOn)}
                            </span>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Altura</span>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {overview.heightCm ? `${overview.heightCm} cm` : "Não informado"}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Idade</span>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {overview.age ? `${overview.age} anos` : "Não informado"}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Sexo</span>
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {overview.sex || "Não informado"}
                          </p>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--text-tertiary)] pt-1">
                        Membro desde: {formatDisplayDate(student.joinedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Registros */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-3.5">
                    <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                      Registros &amp; Documentos
                    </h3>
                    <div className="divide-y divide-[var(--border-subtle)]">
                      <div className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <DuotonePhotosIcon className="w-4 h-4 shrink-0" />
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">Fotos de Evolução</p>
                            <p className="text-[11px] text-[var(--text-tertiary)]">
                              {photos.length > 0 ? `${photos.length} avaliação(ões) registrada(s)` : "Nenhuma foto anexada"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("fotos")}
                          className="text-xs font-bold text-[var(--brand)] hover:underline shrink-0 min-h-[36px] flex items-center cursor-pointer"
                        >
                          Ver fotos →
                        </button>
                      </div>

                      <div className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <DuotoneAnamnesisIcon className="w-4 h-4 shrink-0" />
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">Anamnese &amp; Saúde</p>
                            <p className="text-[11px] text-[var(--text-tertiary)]">
                              {overview.hasAnamnesis ? `${anamnesis.length} seção(ões) preenchida(s)` : "Aguardando preenchimento"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("anamnese")}
                          className="text-xs font-bold text-[var(--brand)] hover:underline shrink-0 min-h-[36px] flex items-center cursor-pointer"
                        >
                          Ver anamnese →
                        </button>
                      </div>

                      <div className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <DuotoneFormsIcon className="w-4 h-4 shrink-0" />
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">Formulários &amp; Questionários</p>
                            <p className="text-[11px] text-[var(--text-tertiary)]">
                              {forms.length > 0 ? `${forms.length} formulário(s) respondido(s)` : "Nenhum formulário respondido"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab("formularios")}
                          className="text-xs font-bold text-[var(--brand)] hover:underline shrink-0 min-h-[36px] flex items-center cursor-pointer"
                        >
                          Ver formulários →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SEÇÃO 2: TREINOS (Destaque Moderado Ativo + Histórico Discreto)
          ========================================================================= */}
      {activeTab === "treinos" && (
        <div className="space-y-6" data-testid="tab-treinos">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Treinos Atribuídos ao Aluno
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Gerencie rotinas ativas, revisões de ficha e histórico de prescrição.
              </p>
            </div>
            {/* Botão de novo treino na seção Treinos (discreto, não duplica bloco verde gigante) */}
            <button
              type="button"
              onClick={() => setIsNewWorkoutSheetOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--brand)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-colors min-h-[40px] cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Novo treino</span>
            </button>
          </div>

          {workouts.length === 0 ? (
            <div className="p-6 sm:p-8 rounded-2xl border border-[var(--border-default)] bg-white dark:bg-[#151619] text-center space-y-3.5 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
                <DumbbellIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                  Nenhum treino criado para este aluno
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Monte a primeira rotina de treino personalizada com divisões, séries e exercícios.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewWorkoutSheetOpen(true)}
                className="font-bold min-h-[44px] cursor-pointer"
              >
                Criar primeiro treino
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Treino Ativo Atual (Destaque Moderado) */}
              {activeWorkout && (
                <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#151619] border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        Treino Ativo Atual
                      </span>
                      <span className="text-xs font-medium text-[var(--text-tertiary)]">
                        Versão {activeWorkout.versionNumber}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Início: {formatDisplayDate(activeWorkout.startsOn)}
                      {activeWorkout.endsOn ? ` • Término: ${formatDisplayDate(activeWorkout.endsOn)}` : ""}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-heading text-base sm:text-lg font-bold text-[var(--text-primary)]">
                      {activeWorkout.title}
                    </h3>
                    {activeWorkout.subtitle && (
                      <p className="text-xs text-[var(--text-secondary)]">
                        {activeWorkout.subtitle}
                      </p>
                    )}
                    {activeWorkout.notesForStudent && (
                      <p className="text-xs text-[var(--text-tertiary)] italic pt-1">
                        &quot;{activeWorkout.notesForStudent}&quot;
                      </p>
                    )}
                  </div>

                  {/* Ação com largura natural no desktop, não bloco verde de 100% */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <Link
                      href={`/consultoria/${consultancySlug}/rotinas/${activeWorkout.workoutPublicId}?version=${activeWorkout.versionPublicId}&student=${student.membershipPublicId}`}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-colors min-h-[40px] cursor-pointer"
                    >
                      <span>Abrir treino</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Histórico de Treinos Anteriores (Lista Discreta) */}
              {endedWorkouts.length > 0 && (
                <div className="p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Histórico de Treinos Anteriores ({endedWorkouts.length})
                  </h3>
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {endedWorkouts.map((w) => (
                      <div
                        key={w.assignmentPublicId}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[var(--text-primary)] truncate">
                              {w.title}
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-semibold">
                              v{w.versionNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            Período: {formatDisplayDate(w.startsOn)} {w.endsOn ? `– ${formatDisplayDate(w.endsOn)}` : ""}
                          </p>
                        </div>

                        <Link
                          href={`/consultoria/${consultancySlug}/rotinas/${w.workoutPublicId}?version=${w.versionPublicId}&student=${student.membershipPublicId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--brand)] hover:underline border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] min-h-[36px] self-start sm:self-auto cursor-pointer"
                        >
                          <span>Abrir treino</span>
                          <ChevronRightIcon className="w-3 h-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico Recente de Execução (Sessões Concluídas) */}
              {completedSessions.length > 0 && (
                <div className="p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Sessões de Treino Concluídas pelo Aluno ({completedSessions.length})
                  </h3>
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {completedSessions.map((session) => (
                      <div
                        key={session.publicId}
                        className="py-2.5 flex items-center justify-between text-xs gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[var(--text-primary)] truncate">
                            {session.workoutTitle}
                          </p>
                          <p className="text-[11px] text-[var(--text-tertiary)]">
                            {new Date(session.completedAt).toLocaleDateString("pt-BR")} às{" "}
                            {new Date(session.completedAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Badge variant="success" size="sm" className="shrink-0">
                          {session.completedSetsCount} séries concluídas
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SEÇÃO 3: FOTOS — MURAL DE EVOLUÇÃO (Com Adicionar, Comparar e Lightbox)
          ========================================================================= */}
      {activeTab === "fotos" && (
        <StudentPhotosMural
          consultancySlug={consultancySlug}
          studentPublicId={student.membershipPublicId}
          studentName={student.name}
          photos={photos}
          onRequestPhotosClick={() => setRequestModal({ isOpen: true, type: "PHOTOS" })}
        />
      )}

      {/* =========================================================================
          SEÇÃO 4: ANAMNESE — CRIAR E CONSULTAR SEM SAIR DO PERFIL
          ========================================================================= */}
      {activeTab === "anamnese" && (
        <StudentAnamnesisHub
          consultancySlug={consultancySlug}
          studentPublicId={student.membershipPublicId}
          studentName={student.name}
          anamnesisHistory={
            detail.anamnesisList ||
            forms.filter(
              (f) =>
                f.title.toLowerCase().includes("anamnes") ||
                f.title.toLowerCase().includes("saúde") ||
                f.title.toLowerCase().includes("saude") ||
                f.title.toLowerCase().includes("histórico") ||
                f.title.toLowerCase().includes("historico")
            )
          }
          structuredAnamnesis={anamnesis}
          availableTemplates={detail.availableTemplates || []}
          onRequestAnamnesisClick={() => setRequestModal({ isOpen: true, type: "ANAMNESIS" })}
        />
      )}

      {/* =========================================================================
          SEÇÃO 5: FORMULÁRIOS — FILTROS, CRIAÇÃO E CONSULTA LOCAL
          ========================================================================= */}
      {activeTab === "formularios" && (
        <StudentFormsHub
          consultancySlug={consultancySlug}
          studentPublicId={student.membershipPublicId}
          studentName={student.name}
          forms={
            detail.formsList ||
            forms.filter(
              (f) =>
                !f.title.toLowerCase().includes("anamnes") &&
                !f.title.toLowerCase().includes("saúde") &&
                !f.title.toLowerCase().includes("saude") &&
                !f.title.toLowerCase().includes("histórico") &&
                !f.title.toLowerCase().includes("historico")
            )
          }
          availableTemplates={detail.availableTemplates || []}
          onRequestFormClick={() => setRequestModal({ isOpen: true, type: "FORM" })}
        />
      )}

      {/* =========================================================================
          SEÇÃO 6: AVALIAÇÕES (Medições Físicas se houver)
          ========================================================================= */}
      {activeTab === "avaliacoes" && measurements.length > 0 && (
        <div className="space-y-4" data-testid="tab-avaliacoes">
          <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
            Medições &amp; Avaliações Físicas ({measurements.length})
          </h2>
          <div className="space-y-3">
            {measurements.map((m, idx) => (
              <div
                key={`${m.recordedOn}-${idx}`}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[var(--text-primary)]">
                    Data: {formatDisplayDate(m.recordedOn)}
                  </span>
                  {m.weightKg && (
                    <span className="font-extrabold text-sm text-[var(--brand)]">
                      {m.weightKg} kg
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
                  {m.waistCm && <div>Cintura: <span className="font-semibold text-[var(--text-primary)]">{m.waistCm}cm</span></div>}
                  {m.abdomenCm && <div>Abdômen: <span className="font-semibold text-[var(--text-primary)]">{m.abdomenCm}cm</span></div>}
                  {m.hipCm && <div>Quadril: <span className="font-semibold text-[var(--text-primary)]">{m.hipCm}cm</span></div>}
                  {m.armCm && <div>Braço: <span className="font-semibold text-[var(--text-primary)]">{m.armCm}cm</span></div>}
                  {m.thighCm && <div>Coxa: <span className="font-semibold text-[var(--text-primary)]">{m.thighCm}cm</span></div>}
                </div>
                {m.note && (
                  <p className="text-[11px] text-[var(--text-tertiary)] italic">{m.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          SEÇÃO: PLANOS ALIMENTARES (Prescrição Nutricional)
          ========================================================================= */}
      {(activeTab === "planos" || (activeTab === "nutricao" && isEffectiveNutritionist)) && (
        <div className="space-y-6" data-testid="tab-planos">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Planos Alimentares do Paciente
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Gerencie planos ativos, histórico de versões e prescrição nutricional.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsChoiceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors min-h-[40px] cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Novo plano</span>
            </button>
          </div>

          {nutrition.length === 0 ? (
            <div className="p-6 sm:p-8 rounded-2xl border border-[var(--border-default)] bg-white dark:bg-[#151619] text-center space-y-3.5 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
                <AppleIcon className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                  Nenhum plano alimentar criado para este paciente
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Crie o primeiro plano alimentar personalizado com refeições, metas calóricas e alimentos.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsChoiceModalOpen(true)}
                className="font-bold min-h-[44px] cursor-pointer"
              >
                Criar primeiro plano
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {nutrition.map((plan) => (
                <div
                  key={plan.assignmentPublicId}
                  className={`p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#151619] border ${
                    plan.status === "ACTIVE"
                      ? "border-emerald-500/40 shadow-xs"
                      : "border-[#E5E7EB] dark:border-[#26272B]"
                  } space-y-3`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={plan.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                        {plan.status === "ACTIVE" ? "Plano Ativo" : "Encerrado"}
                      </Badge>
                      <span className="text-xs font-medium text-[var(--text-tertiary)]">
                        Versão {plan.versionNumber}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Início: {formatDisplayDate(plan.startsOn)}
                      {plan.endsOn ? ` • Término: ${formatDisplayDate(plan.endsOn)}` : ""}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-heading text-base font-bold text-[var(--text-primary)]">
                      {plan.title}
                    </h3>
                    {plan.notesForStudent && (
                      <p className="text-xs text-[var(--text-secondary)] italic">
                        &quot;{plan.notesForStudent}&quot;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Link
                      href={`/consultoria/${consultancySlug}/planos-v2/${plan.planPublicId}?student=${student.membershipPublicId}`}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors min-h-[40px] cursor-pointer"
                    >
                      <span>Abrir plano</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SEÇÃO: EVOLUÇÃO (Fotos + Medições Corporais para Nutricionista)
          ========================================================================= */}
      {activeTab === "evolucao" && (
        <div className="space-y-6" data-testid="tab-evolucao">
          <StudentPhotosMural
            consultancySlug={consultancySlug}
            studentPublicId={student.membershipPublicId}
            studentName={student.name}
            photos={photos}
            onRequestPhotosClick={() => setRequestModal({ isOpen: true, type: "PHOTOS" })}
          />

          {measurements.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
              <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Histórico de Medições Corporais ({measurements.length})
              </h2>
              <div className="space-y-3">
                {measurements.map((m, idx) => (
                  <div
                    key={`${m.recordedOn}-${idx}`}
                    className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[var(--text-primary)]">
                        Data: {formatDisplayDate(m.recordedOn)}
                      </span>
                      {m.weightKg && (
                        <span className="font-extrabold text-sm text-[var(--brand)]">
                          {m.weightKg} kg
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
                      {m.waistCm && <div>Cintura: <span className="font-semibold text-[var(--text-primary)]">{m.waistCm}cm</span></div>}
                      {m.abdomenCm && <div>Abdômen: <span className="font-semibold text-[var(--text-primary)]">{m.abdomenCm}cm</span></div>}
                      {m.hipCm && <div>Quadril: <span className="font-semibold text-[var(--text-primary)]">{m.hipCm}cm</span></div>}
                      {m.armCm && <div>Braço: <span className="font-semibold text-[var(--text-primary)]">{m.armCm}cm</span></div>}
                      {m.thighCm && <div>Coxa: <span className="font-semibold text-[var(--text-primary)]">{m.thighCm}cm</span></div>}
                    </div>
                    {m.note && (
                      <p className="text-[11px] text-[var(--text-tertiary)] italic">{m.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SEÇÃO 7: NUTRIÇÃO (Para Personal Trainer quando houver planos)
          ========================================================================= */}
      {activeTab === "nutricao" && !isEffectiveNutritionist && nutrition.length > 0 && (
        <div className="space-y-4" data-testid="tab-nutricao">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold text-[var(--text-primary)]">
              Planos Nutricionais Prescritos ({nutrition.length})
            </h2>
          </div>
          <div className="space-y-3">
            {nutrition.map((plan) => (
              <div
                key={plan.assignmentPublicId}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#26272B] shadow-xs flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-[var(--text-primary)]">
                      {plan.title}
                    </p>
                    <Badge variant={plan.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                      {plan.status === "ACTIVE" ? "Ativo" : "Encerrado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Início: {formatDisplayDate(plan.startsOn)} {plan.endsOn ? `– ${formatDisplayDate(plan.endsOn)}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para Solicitar Fotos, Anamnese ou Formulário */}
      <PersonalRequestModal
        isOpen={requestModal.isOpen}
        onClose={() => setRequestModal((prev) => ({ ...prev, isOpen: false }))}
        type={requestModal.type}
        consultancySlug={consultancySlug}
        studentMembershipPublicId={student.membershipPublicId}
        studentName={student.name}
      />

      {/* Sheet para Criar Treino */}
      <StudentNewWorkoutSheet
        isOpen={isNewWorkoutSheetOpen}
        onClose={() => setIsNewWorkoutSheetOpen(false)}
        consultancySlug={consultancySlug}
        studentMembershipPublicId={student.membershipPublicId}
        studentName={student.name}
      />

      {/* Modais de Criação de Plano Nutricional */}
      <NutritionPlanChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelectOption={handleSelectPlanChoice}
      />

      <NutritionAiGenerateModal
        isOpen={isGenerateAiOpen}
        onClose={() => setIsGenerateAiOpen(false)}
        consultancySlug={consultancySlug}
      />

      <NutritionAiImportModal
        isOpenControlled={isImportAiOpen}
        onCloseControlled={() => setIsImportAiOpen(false)}
        consultancySlug={consultancySlug}
        hideTrigger={true}
      />

      <NutritionTemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        consultancySlug={consultancySlug}
      />
    </div>
  );
}
