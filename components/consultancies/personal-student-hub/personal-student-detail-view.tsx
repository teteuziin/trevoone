"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import type { PersonalStudentDetail } from "@/lib/consultancies/personal-student-hub";

interface PersonalStudentDetailViewProps {
  consultancySlug: string;
  detail: PersonalStudentDetail;
  studentMonitoring?: StudentEvaluationResult | null;
  effectiveMode?: string;
  userRoles?: string[];
  backHref?: string;
  initialTab?: string;
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

function CheckCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
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
  effectiveMode,
  userRoles = [],
  backHref,
  initialTab,
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

  const validTabs: TabKey[] = [
    "visao-geral",
    "prontuario",
    "treinos",
    "fotos",
    "anamnese",
    "formularios",
    "avaliacoes",
    "nutricao",
    "planos",
    "evolucao",
  ];

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    if (initialTab && validTabs.includes(initialTab as TabKey)) {
      return initialTab as TabKey;
    }
    return "visao-geral";
  });

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

  // Compute actionable attention items
  const attentionItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      actionLabel: string;
      actionHref?: string;
      actionTab?: TabKey;
      actionModal?: RequestModalType;
      type: "workout" | "anamnesis" | "form" | "photos";
    }> = [];

    if (!isEffectiveNutritionist) {
      if (!activeWorkout) {
        items.push({
          id: "no-workout",
          title: "Sem treino ativo prescrito",
          description: "O aluno não possui nenhuma rotina de treino ativa no momento.",
          actionLabel: "Criar treino →",
          actionHref: createWorkoutHref,
          type: "workout",
        });
      }

      if (!overview.hasAnamnesis && anamnesis.length === 0) {
        items.push({
          id: "no-anamnesis",
          title: "Anamnese pendente",
          description: "O aluno ainda não preencheu o formulário de histórico e saúde.",
          actionLabel: "Preencher anamnese →",
          actionTab: "anamnese",
          type: "anamnesis",
        });
      }

      // Pending forms
      const pendingFormsCount = forms.filter(
        (f) => f.status === "PENDING" || f.status === "ASSIGNED" || f.status === "SUBMITTED"
      ).length;
      if (pendingFormsCount > 0) {
        items.push({
          id: "pending-forms",
          title: `${pendingFormsCount} formulário(s) para conferência`,
          description: "Existem formulários com respostas para revisar ou aguardando preenchimento.",
          actionLabel: "Ver formulários →",
          actionTab: "formularios",
          type: "form",
        });
      }

      if (overview.hasPendingPhotos) {
        items.push({
          id: "pending-photos",
          title: "Fotos de evolução aguardando envio",
          description: "O aluno foi solicitado a enviar fotos de acompanhamento.",
          actionLabel: "Ver fotos →",
          actionTab: "fotos",
          type: "photos",
        });
      }
    } else {
      if (!activeNutritionPlan) {
        items.push({
          id: "no-plan",
          title: "Sem plano alimentar ativo",
          description: "O paciente não possui plano alimentar prescrito no momento.",
          actionLabel: "Criar plano →",
          actionHref: createPlanHref,
          type: "workout",
        });
      }

      if (draftNutritionPlan) {
        items.push({
          id: "draft-plan",
          title: "Plano alimentar em rascunho",
          description: `Rascunho disponível: ${draftNutritionPlan.title} (v${draftNutritionPlan.versionNumber}).`,
          actionLabel: "Continuar edição →",
          actionHref: `/consultoria/${consultancySlug}/planos-v2/${draftNutritionPlan.planPublicId}?version=${draftNutritionPlan.versionPublicId}&student=${student.membershipPublicId}`,
          type: "workout",
        });
      }
    }

    return items;
  }, [activeWorkout, overview.hasAnamnesis, overview.hasPendingPhotos, anamnesis.length, forms, isEffectiveNutritionist, activeNutritionPlan, draftNutritionPlan, consultancySlug, student.membershipPublicId, createWorkoutHref, createPlanHref]);

  // Navigation sections list
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
          label: "Prontuário",
          icon: DuotoneAnamnesisIcon,
          badge: "Clínico",
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

  const mobileSections = desktopTabs.map((t) => ({
    id: t.key,
    label: t.label,
    icon: t.icon,
    count: t.count,
    badge: t.badge,
  }));

  const currentSection = desktopTabs.find((t) => t.key === activeTab) || desktopTabs[0];

  return (
    <div className="space-y-5 pb-16">
      {/* =========================================================================
          BREADCRUMB / VOLTAR AOS ALUNOS
          ========================================================================= */}
      <div className="flex items-center justify-between">
        <Link
          href={backHref || `/consultoria/${consultancySlug}/progresso/alunos`}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#5A6660] hover:text-[#102E23] transition-colors min-h-[36px] cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4 text-[#176B49]" />
          <span>{isEffectiveNutritionist ? "Voltar aos pacientes" : "Voltar aos alunos"}</span>
        </Link>
      </div>

      {/* =========================================================================
          CABEÇALHO OPERACIONAL ALUNOS 4.0 (Superfície Branca / Destaque Esmeralda)
          ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs text-[#102E23]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          {/* Avatar + Nome + Badge Ativo + Email */}
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            <UserAvatar
              fullName={student.name}
              userPublicId={student.userPublicId}
              size="lg"
              className="shrink-0 shadow-xs border border-[#E5E8E2]"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#102E23] tracking-tight truncate">
                  {student.name}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                  Ativo
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#5A6660] truncate">
                {student.email}
                {student.phone ? ` • ${student.phone}` : ""}
              </p>
            </div>
          </div>

          {/* Ações do Cabeçalho: CTA Contextual Único + Menu Secundário */}
          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t border-[#E5E8E2] sm:border-0">
            {isEffectiveNutritionist ? (
              activeNutritionPlan ? (
                <Link
                  href={`/consultoria/${consultancySlug}/planos-v2/${activeNutritionPlan.planPublicId}?student=${student.membershipPublicId}`}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#176B49] hover:bg-[#125438] active:bg-[#0E3F2A] transition-colors min-h-[42px] shadow-xs cursor-pointer"
                >
                  <AppleIcon className="w-4 h-4" />
                  <span>Abrir plano</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsChoiceModalOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#176B49] hover:bg-[#125438] active:bg-[#0E3F2A] transition-colors min-h-[42px] shadow-xs cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Criar plano alimentar</span>
                </button>
              )
            ) : activeWorkout ? (
              <Link
                href={`/consultoria/${consultancySlug}/rotinas/${activeWorkout.workoutPublicId}?version=${activeWorkout.versionPublicId}&student=${student.membershipPublicId}`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#176B49] hover:bg-[#125438] active:bg-[#0E3F2A] transition-colors min-h-[42px] shadow-xs cursor-pointer"
              >
                <DumbbellIcon className="w-4 h-4" />
                <span>Abrir treino</span>
              </Link>
            ) : (
              <Link
                href={createWorkoutHref}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#176B49] hover:bg-[#125438] active:bg-[#0E3F2A] transition-colors min-h-[42px] shadow-xs cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Criar treino</span>
              </Link>
            )}

            {/* Menu Dropdown de Ações Secundárias */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSecondaryMenuOpen((prev) => !prev)}
                aria-label="Mais opções do aluno"
                className="inline-flex items-center justify-center p-2.5 rounded-xl text-[#5A6660] hover:text-[#102E23] bg-[#F5F5F0] hover:bg-[#EBEBE5] border border-[#E5E8E2] min-h-[42px] min-w-[42px] transition-colors cursor-pointer"
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
                  <div className="absolute right-0 mt-2 z-50 w-64 p-1.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xl space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setRequestModal({ isOpen: true, type: "PHOTOS" });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors min-h-[40px] text-left cursor-pointer"
                    >
                      <PhotoIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Solicitar fotos de evolução</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setRequestModal({ isOpen: true, type: "ANAMNESIS" });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors min-h-[40px] text-left cursor-pointer"
                    >
                      <ClipboardCheckIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Solicitar anamnese</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setRequestModal({ isOpen: true, type: "FORM" });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors min-h-[40px] text-left cursor-pointer"
                    >
                      <FileTextIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Enviar formulário</span>
                    </button>
                    <Link
                      href={createWorkoutHref}
                      onClick={() => setIsSecondaryMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors min-h-[40px] text-left"
                    >
                      <DumbbellIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Criar nova rotina de treino</span>
                    </Link>
                    {student.email && (
                      <a
                        href={`mailto:${student.email}`}
                        onClick={() => setIsSecondaryMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] transition-colors min-h-[40px] text-left"
                      >
                        <span className="w-4 text-center text-sm text-[#5A6660]">✉</span>
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
          NAVEGAÇÃO ENTRE SEÇÕES (Discreta e Acessível)
          ========================================================================= */}
      {/* Desktop Tabs */}
      <div className="hidden sm:block">
        <div className="p-1 rounded-2xl bg-white border border-[#E5E8E2] shadow-2xs">
          <nav className="flex space-x-1" aria-label="Seções do Aluno">
            {desktopTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              if (tab.key === "prontuario") {
                return (
                  <Link
                    key={tab.key}
                    href={`/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[40px] cursor-pointer text-[#176B49] hover:bg-[#E8F0EA] border border-[#CDEED5]"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-[#E8F0EA] text-[#176B49]">
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
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[40px] cursor-pointer ${
                    isActive
                      ? "bg-[#E8F0EA] text-[#176B49] font-bold shadow-2xs border border-[#CDEED5]"
                      : "text-[#5A6660] hover:text-[#102E23] hover:bg-[#F5F5F0]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-white text-[#176B49] border border-[#CDEED5]"
                          : "bg-[#F5F5F0] text-[#5A6660]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && !isActive && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        tab.badge === "Preenchida"
                          ? "bg-[#E8F0EA] text-[#176B49]"
                          : "bg-amber-500/10 text-amber-700"
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

      {/* Mobile Selector */}
      <div className="sm:hidden relative">
        <button
          type="button"
          onClick={() => setIsMobileSectionMenuOpen((prev) => !prev)}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E5E8E2] shadow-2xs min-h-[44px] cursor-pointer"
          aria-expanded={isMobileSectionMenuOpen}
          aria-label="Alternar seção"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <currentSection.icon className="w-4 h-4 text-[#176B49]" />
            <span className="font-bold text-xs text-[#102E23]">
              {currentSection.label}
            </span>
            {currentSection.count !== undefined && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#E8F0EA] text-[#176B49]">
                {currentSection.count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#5A6660]">
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
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 p-1.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xl space-y-0.5">
              {mobileSections.map((sec) => {
                const SecIcon = sec.icon;
                const isSelected = activeTab === sec.id;

                if (sec.id === "prontuario") {
                  return (
                    <Link
                      key={sec.id}
                      href={`/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#176B49] hover:bg-[#E8F0EA] min-h-[44px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <SecIcon className="w-4 h-4" />
                        <span>{sec.label}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-[#E8F0EA] text-[#176B49]">
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
                        ? "bg-[#E8F0EA] text-[#176B49] font-bold"
                        : "text-[#102E23] hover:bg-[#F5F5F0]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <SecIcon className="w-4 h-4" />
                      <span>{sec.label}</span>
                    </div>
                    {sec.count !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-[#F5F5F0] text-[#5A6660]">
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
          SEÇÃO 1: VISÃO GERAL — TELA OPERACIONAL UNIFICADA (4 BLOCOS)
          ========================================================================= */}
      {activeTab === "visao-geral" && (
        <div className="space-y-5" data-testid="tab-visao-geral">
          {/* BLOCO 1: O QUE PRECISA DE ATENÇÃO? */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircleIcon className={`w-5 h-5 ${attentionItems.length > 0 ? "text-amber-600" : "text-[#176B49]"}`} />
                <h2 className="font-heading text-base font-bold text-[#102E23]">
                  O que precisa de atenção?
                </h2>
              </div>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${attentionItems.length > 0 ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]"}`}>
                {attentionItems.length > 0 ? `${attentionItems.length} pendência(s)` : "Tudo em dia"}
              </span>
            </div>

            {attentionItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#F9FAF8] border border-[#E5E8E2] flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-[#176B49] shrink-0" />
                <p className="text-xs sm:text-sm text-[#5A6660]">
                  Tudo em dia por aqui. Nenhum alerta ou pendência encontrada para este aluno.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#102E23] text-sm">
                        {item.title}
                      </p>
                      <p className="text-[#5A6660]">
                        {item.description}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {item.actionHref ? (
                        <Link
                          href={item.actionHref}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[38px] shadow-xs"
                        >
                          <span>{item.actionLabel}</span>
                        </Link>
                      ) : item.actionTab ? (
                        <button
                          type="button"
                          onClick={() => setActiveTab(item.actionTab!)}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#176B49] bg-[#E8F0EA] hover:bg-[#DBE7DE] border border-[#CDEED5] transition-colors min-h-[38px] cursor-pointer"
                        >
                          <span>{item.actionLabel}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GRID 2 COLUNAS: TREINO DO ALUNO + ACOMPANHAMENTO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* BLOCO 2: TREINO DO ALUNO */}
            <div className="p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <DuotoneTrainingIcon className="w-5 h-5 text-[#176B49]" />
                  <h3 className="font-heading text-base font-bold text-[#102E23]">
                    Treino do Aluno
                  </h3>
                </div>
                {activeWorkout ? (
                  <Badge variant="success" size="sm">Treino Ativo</Badge>
                ) : (
                  <Badge variant="neutral" size="sm">Sem treino ativo</Badge>
                )}
              </div>

              {activeWorkout ? (
                <div className="space-y-3.5">
                  <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-1.5">
                    <p className="font-heading text-base font-bold text-[#102E23]">
                      {activeWorkout.title}
                    </p>
                    {activeWorkout.subtitle && (
                      <p className="text-xs text-[#5A6660]">
                        {activeWorkout.subtitle}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-[#5A6660]">
                      <span className="font-semibold text-[#176B49]">Versão {activeWorkout.versionNumber}</span>
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

                  {/* Sessões Concluídas Recentes (se houver) */}
                  {completedSessions.length > 0 && (
                    <div className="p-3 rounded-xl bg-[#E8F0EA] border border-[#CDEED5] text-xs text-[#176B49] flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        Último treino realizado em {formatDisplayDate(completedSessions[0].completedAt)}
                      </span>
                      <span className="text-[11px] text-[#5A6660]">
                        {completedSessions.length} sessão(ões) registrada(s)
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 pt-1">
                    <Link
                      href={`/consultoria/${consultancySlug}/rotinas/${activeWorkout.workoutPublicId}?version=${activeWorkout.versionPublicId}&student=${student.membershipPublicId}`}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[40px] shadow-xs cursor-pointer"
                    >
                      <span>Abrir treino</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setActiveTab("treinos")}
                      className="text-xs font-semibold text-[#5A6660] hover:text-[#102E23] px-3 py-2 min-h-[40px] cursor-pointer"
                    >
                      Histórico ({workouts.length}) →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-center space-y-3">
                  <p className="text-xs text-[#5A6660]">
                    Nenhuma rotina de treino ativa prescrita para este aluno.
                  </p>
                  <Link
                    href={createWorkoutHref}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[40px] shadow-xs cursor-pointer"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>Criar primeiro treino</span>
                  </Link>
                </div>
              )}
            </div>

            {/* BLOCO 3: ACOMPANHAMENTO (3 CARTÕES) */}
            <div className="p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-base font-bold text-[#102E23]">
                  Acompanhamento
                </h3>
              </div>

              <div className="space-y-2.5">
                {/* 1. Fotos */}
                <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F0EA] flex items-center justify-center shrink-0">
                      <DuotonePhotosIcon className="w-4 h-4 text-[#176B49]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#102E23]">Fotos de Evolução</p>
                      <p className="text-[11px] text-[#5A6660]">
                        {photos.length > 0 ? `${photos.length} avaliação(ões) registrada(s)` : "Nenhuma foto anexada"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("fotos")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#176B49] hover:bg-[#E8F0EA] transition-colors cursor-pointer shrink-0"
                  >
                    <span>{photos.length > 0 ? "Ver fotos →" : "+ Fotos"}</span>
                  </button>
                </div>

                {/* 2. Anamnese */}
                <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F0EA] flex items-center justify-center shrink-0">
                      <DuotoneAnamnesisIcon className="w-4 h-4 text-[#176B49]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#102E23]">Anamnese &amp; Saúde</p>
                      <p className="text-[11px] text-[#5A6660]">
                        {overview.hasAnamnesis ? "Preenchida" : "Aguardando preenchimento"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("anamnese")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#176B49] hover:bg-[#E8F0EA] transition-colors cursor-pointer shrink-0"
                  >
                    <span>{overview.hasAnamnesis ? "Ver anamnese →" : "Criar anamnese"}</span>
                  </button>
                </div>

                {/* 3. Formulários */}
                <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F0EA] flex items-center justify-center shrink-0">
                      <DuotoneFormsIcon className="w-4 h-4 text-[#176B49]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#102E23]">Formulários &amp; Questionários</p>
                      <p className="text-[11px] text-[#5A6660]">
                        {forms.length > 0 ? `${forms.length} formulário(s)` : "Nenhum formulário"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("formularios")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#176B49] hover:bg-[#E8F0EA] transition-colors cursor-pointer shrink-0"
                  >
                    <span>{forms.length > 0 ? "Ver formulários →" : "Enviar formulário"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* BLOCO 4: INFORMAÇÕES DO ALUNO */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-heading text-base font-bold text-[#102E23]">
                Informações do Aluno
              </h3>
              <span className="text-[11px] text-[#5A6660]">
                Membro desde {formatDisplayDate(student.joinedAt)}
              </span>
            </div>

            {/* Pílulas Compactas e Limpas */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Peso</span>
                <p className="text-sm font-bold text-[#102E23]">
                  {overview.weightKg ? `${overview.weightKg} kg` : "—"}
                </p>
                {overview.lastWeightRecordedOn && (
                  <span className="text-[10px] text-[#5A6660] block">
                    em {formatDisplayDate(overview.lastWeightRecordedOn)}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Altura</span>
                <p className="text-sm font-bold text-[#102E23]">
                  {overview.heightCm ? `${overview.heightCm} cm` : "—"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Idade</span>
                <p className="text-sm font-bold text-[#102E23]">
                  {overview.age ? `${overview.age} anos` : (overview.birthDate ? formatDisplayDate(overview.birthDate) : "—")}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Sexo</span>
                <p className="text-sm font-bold text-[#102E23]">
                  {overview.sex ? (overview.sex === "M" || overview.sex === "MALE" ? "Masculino" : overview.sex === "F" || overview.sex === "FEMALE" ? "Feminino" : overview.sex) : "—"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Objetivo</span>
                <p className="text-xs font-bold text-[#102E23] truncate">
                  {overview.objective || overview.nutritionGoal || "Geral"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SEÇÃO 2: TREINOS (Detalhamento Completo)
          ========================================================================= */}
      {activeTab === "treinos" && (
        <div className="space-y-6" data-testid="tab-treinos">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-sm font-bold text-[#102E23]">
                Treinos Atribuídos ao Aluno
              </h2>
              <p className="text-xs text-[#5A6660]">
                Gerencie rotinas ativas, revisões de ficha e histórico de prescrição.
              </p>
            </div>
            <Link
              href={createWorkoutHref}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[40px] shadow-xs cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Novo treino</span>
            </Link>
          </div>

          {workouts.length === 0 ? (
            <div className="p-6 sm:p-8 rounded-2xl border border-[#E5E8E2] bg-white text-center space-y-3.5 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F0EA] border border-[#CDEED5] flex items-center justify-center mx-auto text-[#176B49]">
                <DumbbellIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="font-heading text-sm font-bold text-[#102E23]">
                  Nenhum treino criado para este aluno
                </p>
                <p className="text-xs text-[#5A6660] leading-relaxed">
                  Monte a primeira rotina de treino personalizada com divisões, séries e exercícios.
                </p>
              </div>
              <Link
                href={createWorkoutHref}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[42px] shadow-xs cursor-pointer"
              >
                Criar primeiro treino
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Treino Ativo Atual */}
              {activeWorkout && (
                <div className="p-5 sm:p-6 rounded-2xl bg-white border-2 border-[#176B49]/40 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#E8F0EA] text-[#176B49]">
                        Treino Ativo Atual
                      </span>
                      <span className="text-xs font-medium text-[#5A6660]">
                        Versão {activeWorkout.versionNumber}
                      </span>
                    </div>
                    <span className="text-xs text-[#5A6660]">
                      Início: {formatDisplayDate(activeWorkout.startsOn)}
                      {activeWorkout.endsOn ? ` • Término: ${formatDisplayDate(activeWorkout.endsOn)}` : ""}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-heading text-base sm:text-lg font-bold text-[#102E23]">
                      {activeWorkout.title}
                    </h3>
                    {activeWorkout.subtitle && (
                      <p className="text-xs text-[#5A6660]">
                        {activeWorkout.subtitle}
                      </p>
                    )}
                    {activeWorkout.notesForStudent && (
                      <p className="text-xs text-[#5A6660] italic pt-1">
                        &quot;{activeWorkout.notesForStudent}&quot;
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <Link
                      href={`/consultoria/${consultancySlug}/rotinas/${activeWorkout.workoutPublicId}?version=${activeWorkout.versionPublicId}&student=${student.membershipPublicId}`}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[40px] shadow-xs cursor-pointer"
                    >
                      <span>Abrir treino</span>
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Histórico de Treinos Anteriores */}
              {endedWorkouts.length > 0 && (
                <div className="p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#5A6660]">
                    Histórico de Treinos Anteriores ({endedWorkouts.length})
                  </h3>
                  <div className="divide-y divide-[#E5E8E2]">
                    {endedWorkouts.map((w) => (
                      <div
                        key={w.assignmentPublicId}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[#102E23] truncate">
                              {w.title}
                            </p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F5F0] text-[#5A6660] font-semibold">
                              v{w.versionNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5A6660]">
                            Período: {formatDisplayDate(w.startsOn)} {w.endsOn ? `– ${formatDisplayDate(w.endsOn)}` : ""}
                          </p>
                        </div>

                        <Link
                          href={`/consultoria/${consultancySlug}/rotinas/${w.workoutPublicId}?version=${w.versionPublicId}&student=${student.membershipPublicId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#176B49] hover:underline border border-[#E5E8E2] bg-[#FAF9F6] hover:bg-[#F5F5F0] min-h-[36px] self-start sm:self-auto cursor-pointer"
                        >
                          <span>Abrir treino</span>
                          <ChevronRightIcon className="w-3 h-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sessões Concluídas pelo Aluno */}
              {completedSessions.length > 0 && (
                <div className="p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-[#5A6660]">
                    Sessões Concluídas pelo Aluno ({completedSessions.length})
                  </h3>
                  <div className="divide-y divide-[#E5E8E2]">
                    {completedSessions.map((session) => (
                      <div
                        key={session.publicId}
                        className="py-3 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[#102E23]">
                              {session.workoutTitle}
                            </p>
                            {session.studentCompletionState === "ALL" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                                Fez tudo
                              </span>
                            )}
                            {session.studentCompletionState === "PARTIAL" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Fez parte
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#5A6660]">
                            {new Date(session.completedAt).toLocaleDateString("pt-BR")} às{" "}
                            {new Date(session.completedAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {session.studentFeedbackNotes && (
                            <div className="mt-1.5 p-2 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2] text-xs text-[#5A6660] italic">
                              <span className="font-semibold not-italic text-[10px] uppercase text-[#5A6660] block mb-0.5">
                                Mensagem do aluno:
                              </span>
                              &ldquo;{session.studentFeedbackNotes}&rdquo;
                            </div>
                          )}
                        </div>
                        <Badge variant="success" size="sm" className="shrink-0 self-start sm:self-center">
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
          SEÇÃO 3: FOTOS — MURAL DE EVOLUÇÃO
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
          SEÇÃO 4: ANAMNESE
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
          SEÇÃO 5: FORMULÁRIOS
          ========================================================================= */}
      {activeTab === "formularios" && (
        <StudentFormsHub
          consultancySlug={consultancySlug}
          studentPublicId={student.membershipPublicId}
          studentName={student.name}
          studentEmail={student.email}
          forms={
            (detail.formsList && detail.formsList.length > 0)
              ? detail.formsList
              : (forms && forms.length > 0)
              ? forms.filter(
                  (f) =>
                    !f.title.toLowerCase().includes("anamnes") &&
                    !f.title.toLowerCase().includes("saúde") &&
                    !f.title.toLowerCase().includes("saude") &&
                    !f.title.toLowerCase().includes("histórico") &&
                    !f.title.toLowerCase().includes("historico")
                )
              : (detail.formsList || [])
          }
          availableTemplates={detail.availableTemplates || []}
          publishedForms={detail.publishedForms || []}
          onRequestFormClick={() => setRequestModal({ isOpen: true, type: "FORM" })}
        />
      )}

      {/* =========================================================================
          SEÇÃO 6: AVALIAÇÕES FÍSICAS (Se houver)
          ========================================================================= */}
      {activeTab === "avaliacoes" && measurements.length > 0 && (
        <div className="space-y-4" data-testid="tab-avaliacoes">
          <h2 className="font-heading text-sm font-bold text-[#102E23]">
            Medições &amp; Avaliações Físicas ({measurements.length})
          </h2>
          <div className="space-y-3">
            {measurements.map((m, idx) => (
              <div
                key={`${m.recordedOn}-${idx}`}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#102E23]">
                    Data: {formatDisplayDate(m.recordedOn)}
                  </span>
                  {m.weightKg && (
                    <span className="font-extrabold text-sm text-[#176B49]">
                      {m.weightKg} kg
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-[#5A6660] pt-2 border-t border-[#E5E8E2]">
                  {m.waistCm && <div>Cintura: <span className="font-semibold text-[#102E23]">{m.waistCm}cm</span></div>}
                  {m.abdomenCm && <div>Abdômen: <span className="font-semibold text-[#102E23]">{m.abdomenCm}cm</span></div>}
                  {m.hipCm && <div>Quadril: <span className="font-semibold text-[#102E23]">{m.hipCm}cm</span></div>}
                  {m.armCm && <div>Braço: <span className="font-semibold text-[#102E23]">{m.armCm}cm</span></div>}
                  {m.thighCm && <div>Coxa: <span className="font-semibold text-[#102E23]">{m.thighCm}cm</span></div>}
                </div>
                {m.note && (
                  <p className="text-[11px] text-[#5A6660] italic">{m.note}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          SEÇÃO 7: NUTRIÇÃO
          ========================================================================= */}
      {activeTab === "nutricao" && !isEffectiveNutritionist && nutrition.length > 0 && (
        <div className="space-y-4" data-testid="tab-nutricao">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-bold text-[#102E23]">
              Planos Nutricionais Prescritos ({nutrition.length})
            </h2>
          </div>
          <div className="space-y-3">
            {nutrition.map((plan) => (
              <div
                key={plan.assignmentPublicId}
                className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-[#102E23]">
                      {plan.title}
                    </p>
                    <Badge variant={plan.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                      {plan.status === "ACTIVE" ? "Ativo" : "Encerrado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#5A6660]">
                    Início: {formatDisplayDate(plan.startsOn)} {plan.endsOn ? `– ${formatDisplayDate(plan.endsOn)}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modais */}
      <PersonalRequestModal
        isOpen={requestModal.isOpen}
        onClose={() => setRequestModal((prev) => ({ ...prev, isOpen: false }))}
        type={requestModal.type}
        consultancySlug={consultancySlug}
        studentMembershipPublicId={student.membershipPublicId}
        studentName={student.name}
      />

      <StudentNewWorkoutSheet
        isOpen={isNewWorkoutSheetOpen}
        onClose={() => setIsNewWorkoutSheetOpen(false)}
        consultancySlug={consultancySlug}
        studentMembershipPublicId={student.membershipPublicId}
        studentName={student.name}
      />

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
