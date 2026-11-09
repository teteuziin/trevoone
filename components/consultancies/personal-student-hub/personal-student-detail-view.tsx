"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/account/user-avatar";
import { DuotoneTrainingIcon } from "@/components/ui/icons/duotone-icons";
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
import { updateStudentPersonalDataAction } from "@/app/consultoria/[slug]/progresso/alunos/[studentPublicId]/actions";
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

type FocusedView = "overview" | "treinos" | "fotos" | "anamnese" | "formularios" | "historico";

// ============================================================================
// ICONS
// ============================================================================
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

function ClockHistoryIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 6 12 12 16 14" />
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

function AlertCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
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
  backHref,
  initialTab,
}: PersonalStudentDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const student = React.useMemo(() => detail.student || {
    membershipPublicId: "",
    userPublicId: "",
    name: "Aluno",
    email: "",
    phone: null,
    joinedAt: null,
    status: "ACTIVE",
  }, [detail.student]);

  const overview = React.useMemo(() => detail.overview || {
    objective: null,
    nutritionGoal: null,
    allergies: null,
    intolerances: null,
    dietaryRestrictions: null,
    birthDate: null,
    age: null,
    sex: null,
    heightCm: null,
    weightKg: null,
    lastWeightRecordedOn: null,
    latestWorkoutTitle: null,
    latestWorkoutDifficulty: null,
    activeWorkoutsCount: 0,
    completedWorkoutsCount: 0,
    hasAnamnesis: false,
    hasPhotos: false,
    hasForms: false,
    latestNutritionTitle: null,
    activeNutritionCount: 0,
    hasPendingPhotos: false,
    hasPendingAnamnesis: false,
    hasPendingAssessment: false,
  }, [detail.overview]);

  const photos = React.useMemo(() => detail.photos || [], [detail.photos]);
  const anamnesis = React.useMemo(() => detail.anamnesis || [], [detail.anamnesis]);
  const forms = React.useMemo(() => detail.forms || [], [detail.forms]);
  const workouts = React.useMemo(() => detail.workouts || [], [detail.workouts]);
  const completedSessions = React.useMemo(() => detail.completedSessions || [], [detail.completedSessions]);

  const hasPendingPhotos = Boolean(
    overview.hasPendingPhotos ||
    photos.some((p) => p.status === "PENDING" || p.status === "REQUESTED")
  );

  // Active focused view: defaults to "overview" (unified 4-block cockpit), or opens specific view when requested
  const [focusedView, setFocusedView] = useState<FocusedView>(() => {
    if (initialTab && ["treinos", "fotos", "anamnese", "formularios", "historico"].includes(initialTab)) {
      return initialTab as FocusedView;
    }
    return "overview";
  });

  // UI state
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);
  const [isEditDataModalOpen, setIsEditDataModalOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Edit form state
  const [editWeight, setEditWeight] = useState(overview.weightKg ? String(overview.weightKg) : "");
  const [editHeight, setEditHeight] = useState(overview.heightCm ? String(overview.heightCm) : "");
  const [editObjective, setEditObjective] = useState(overview.objective || "");
  const [editPhone, setEditPhone] = useState(student.phone || "");
  const [editError, setEditError] = useState<string | null>(null);

  // Sheets and Request Modals
  const [isNewWorkoutSheetOpen, setIsNewWorkoutSheetOpen] = useState(false);
  const [requestModal, setRequestModal] = useState<{ isOpen: boolean; type: RequestModalType }>({
    isOpen: false,
    type: "PHOTOS",
  });

  // Nutrition plan creation modals
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

  const createWorkoutHref = `/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`;

  // Workouts resolution
  const activeWorkout = workouts.find((w) => w.status === "ACTIVE") || null;
  const endedWorkouts = workouts.filter((w) => w.status === "ENDED");

  // Actionable Attention Items (Only real pending tasks)
  const attentionItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      actionLabel: string;
      actionHref?: string;
      actionView?: FocusedView;
      actionModal?: RequestModalType;
    }> = [];

    if (!activeWorkout) {
      items.push({
        id: "no-workout",
        title: "Sem treino ativo prescrito",
        description: "O aluno não possui nenhuma rotina de treino ativa no momento.",
        actionLabel: "Criar treino →",
        actionHref: createWorkoutHref,
      });
    }

    if (!overview.hasAnamnesis && anamnesis.length === 0) {
      items.push({
        id: "no-anamnesis",
        title: "Anamnese pendente",
        description: "O aluno ainda não preencheu o formulário de histórico e saúde.",
        actionLabel: "Iniciar anamnese →",
        actionView: "anamnese",
      });
    }

    const pendingFormsCount = forms.filter(
      (f) => f.status === "PENDING" || f.status === "ASSIGNED" || f.status === "SUBMITTED"
    ).length;
    if (pendingFormsCount > 0) {
      items.push({
        id: "pending-forms",
        title: `${pendingFormsCount} formulário(s) para conferência`,
        description: "Existem formulários com respostas para revisar ou aguardando preenchimento.",
        actionLabel: "Ver formulários →",
        actionView: "formularios",
      });
    }

    if (overview.hasPendingPhotos) {
      items.push({
        id: "pending-photos",
        title: "Fotos de evolução solicitadas",
        description: "O aluno foi solicitado a enviar fotos de acompanhamento.",
        actionLabel: "Ver fotos →",
        actionView: "fotos",
      });
    }

    return items;
  }, [activeWorkout, overview.hasAnamnesis, overview.hasPendingPhotos, anamnesis.length, forms, createWorkoutHref]);

  // Unified Student Timeline Events (for Histórico)
  const timelineEvents = React.useMemo(() => {
    const events: Array<{
      id: string;
      date: string;
      title: string;
      subtitle: string;
      type: "workout" | "photo" | "anamnesis" | "form" | "session";
    }> = [];

    workouts.forEach((w) => {
      events.push({
        id: `workout-${w.assignmentPublicId}`,
        date: w.assignedAt || w.startsOn,
        title: `Treino prescrito: ${w.title}`,
        subtitle: `Versão ${w.versionNumber} • ${w.status === "ACTIVE" ? "Em andamento" : "Encerrado"}`,
        type: "workout",
      });
    });

    completedSessions.forEach((s) => {
      events.push({
        id: `session-${s.publicId}`,
        date: s.completedAt,
        title: `Sessão de treino concluída: ${s.workoutTitle}`,
        subtitle: `${s.completedSetsCount} séries realizadas ${s.studentFeedbackNotes ? `• "${s.studentFeedbackNotes}"` : ""}`,
        type: "session",
      });
    });

    photos.forEach((p) => {
      events.push({
        id: `photo-${p.requestPublicId}`,
        date: p.submittedAt || p.createdAt || p.evaluationDate || "",
        title: `Fotos de evolução registradas (${p.images?.length || 0} poses)`,
        subtitle: p.reviewerNotes || "Avaliação fotográfica arquivada",
        type: "photo",
      });
    });

    forms.forEach((f) => {
      events.push({
        id: `form-${f.publicId}`,
        date: f.submittedAt || f.requestedAt || "",
        title: `Formulário: ${f.title}`,
        subtitle: `Situação: ${f.status === "SUBMITTED" ? "Respondido" : f.status === "PENDING" ? "Aguardando resposta" : f.status}`,
        type: "form",
      });
    });

    return events.sort((a, b) => {
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [workouts, completedSessions, photos, forms]);

  const handleSavePersonalData = () => {
    setEditError(null);
    const weightNum = editWeight.trim() ? parseFloat(editWeight.replace(",", ".")) : null;
    const heightNum = editHeight.trim() ? parseFloat(editHeight.replace(",", ".")) : null;

    startTransition(async () => {
      const res = await updateStudentPersonalDataAction(consultancySlug, student.membershipPublicId, {
        weightKg: weightNum,
        heightCm: heightNum,
        objective: editObjective.trim() || null,
        phone: editPhone.trim() || null,
      });

      if (!res.success) {
        setEditError(res.error || "Não foi possível salvar os dados.");
      } else {
        setIsEditDataModalOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4 pb-16">
      {/* =========================================================================
          BARRA DE VOLTAR (Contexto Limpo)
          ========================================================================= */}
      <div className="flex items-center justify-between">
        {focusedView === "overview" ? (
          <Link
            href={backHref || `/consultoria/${consultancySlug}/progresso/alunos`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#5A6660] hover:text-[#102E23] transition-colors min-h-[36px]"
          >
            <ArrowLeftIcon className="w-4 h-4 text-[#176B49]" />
            <span>Voltar aos alunos</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setFocusedView("overview")}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#176B49] hover:text-[#125438] bg-[#E8F0EA] hover:bg-[#DBE7DE] px-3 py-1.5 rounded-xl border border-[#CDEED5] transition-colors min-h-[36px] cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4 text-[#176B49]" />
            <span>Voltar ao perfil de {student.name}</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          CABEÇALHO COMPACTO DO ALUNO (Sempre Presente)
          Foto + Nome + Status + Contato + UMA Ação Dinâmica + Menu 3 Pontos
          ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              fullName={student.name}
              userPublicId={student.userPublicId}
              size="lg"
              className="shrink-0 border border-[#E5E8E2]"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-[#102E23] truncate">
                  {student.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                  Ativo
                </span>
              </div>
              <p className="text-xs text-[#5A6660] truncate">
                {student.email}
                {student.phone ? ` • ${student.phone}` : ""}
              </p>
            </div>
          </div>

          {/* Menu Dropdown de Ações Secundárias */}
          <div className="relative shrink-0 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsSecondaryMenuOpen((prev) => !prev)}
              aria-label="Mais opções do aluno"
              className="p-2 rounded-xl text-[#5A6660] hover:text-[#102E23] bg-[#F5F5F0] hover:bg-[#EBEBE5] border border-[#E5E8E2] min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors cursor-pointer"
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
                  <div className="absolute right-0 mt-1 z-50 w-56 p-1 rounded-2xl bg-white border border-[#E5E8E2] shadow-xl space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setRequestModal({ isOpen: true, type: "PHOTOS" });
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] text-left cursor-pointer"
                    >
                      <PhotoIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Solicitar fotos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setRequestModal({ isOpen: true, type: "ANAMNESIS" });
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] text-left cursor-pointer"
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
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] text-left cursor-pointer"
                    >
                      <FileTextIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Enviar formulário</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setIsEditDataModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] text-left cursor-pointer"
                    >
                      <EditIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Editar dados do aluno</span>
                    </button>
                    {student.email && (
                      <a
                        href={`mailto:${student.email}`}
                        onClick={() => setIsSecondaryMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#F5F5F0] text-left"
                      >
                        <span className="w-4 text-center text-xs text-[#5A6660]">✉</span>
                        <span>Enviar e-mail</span>
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      {/* =========================================================================
          VISÃO PRINCIPAL: COCKPIT OPERACIONAL EM 4 BLOCOS
          (Sem as 5 abas pesadas no topo)
          ========================================================================= */}
      {focusedView === "overview" && (
        <div className="space-y-4">
          {/* =====================================================================
              1º BLOCO: TREINO ATUAL (Destaque Principal)
              ===================================================================== */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <DuotoneTrainingIcon className="w-5 h-5 text-[#176B49]" />
                <h2 className="font-heading text-base font-bold text-[#102E23]">
                  Treino Atual
                </h2>
              </div>
              {activeWorkout ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                  Ativo
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#F3F4F6] text-[#5A6660]">
                  Sem treino
                </span>
              )}
            </div>

            {activeWorkout ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold text-base text-[#102E23]">
                      {activeWorkout.title}
                    </p>
                    <span className="text-xs font-semibold text-[#176B49]">
                      v{activeWorkout.versionNumber}
                    </span>
                  </div>
                  {activeWorkout.subtitle && (
                    <p className="text-xs text-[#5A6660]">
                      {activeWorkout.subtitle}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[11px] text-[#5A6660] pt-0.5">
                    <span>Início: {formatDisplayDate(activeWorkout.startsOn)}</span>
                    {activeWorkout.endsOn && (
                      <span>• Término: {formatDisplayDate(activeWorkout.endsOn)}</span>
                    )}
                  </div>
                </div>

                {/* Ações e Histórico */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <Link
                    href={`/consultoria/${consultancySlug}/rotinas/${activeWorkout.workoutPublicId}?version=${activeWorkout.versionPublicId}&student=${student.membershipPublicId}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[38px] shadow-xs"
                  >
                    <span>Abrir treino</span>
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </Link>

                  {endedWorkouts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                      className="text-xs font-semibold text-[#5A6660] hover:text-[#102E23] px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {isHistoryExpanded ? "Ocultar treinos anteriores" : `Ver treinos anteriores (${endedWorkouts.length})`}
                    </button>
                  )}
                </div>

                {/* Lista recolhível de treinos anteriores */}
                {isHistoryExpanded && endedWorkouts.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-2 mt-2">
                    <p className="text-xs font-bold text-[#5A6660] uppercase tracking-wider">Histórico de Fichas</p>
                    <div className="divide-y divide-[#E5E8E2]">
                      {endedWorkouts.map((w) => (
                        <div key={w.assignmentPublicId} className="py-2 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-[#102E23]">{w.title} (v{w.versionNumber})</p>
                            <p className="text-[11px] text-[#5A6660]">{formatDisplayDate(w.startsOn)} {w.endsOn ? `– ${formatDisplayDate(w.endsOn)}` : ""}</p>
                          </div>
                          <Link
                            href={`/consultoria/${consultancySlug}/rotinas/${w.workoutPublicId}?version=${w.versionPublicId}&student=${student.membershipPublicId}`}
                            className="text-xs font-bold text-[#176B49] hover:underline"
                          >
                            Abrir →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-center space-y-2.5">
                <p className="text-xs text-[#5A6660]">
                  Este aluno ainda não possui treino ativo.
                </p>
                <Link
                  href={createWorkoutHref}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[38px] shadow-xs"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Criar treino</span>
                </Link>
              </div>
            )}
          </div>

          {/* AVISOS RELEVANTES (Apenas se houver pendência real) */}
          {attentionItems.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertCircleIcon className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Pendências que precisam de atenção ({attentionItems.length})</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-white/90 border border-amber-200/50 flex items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#102E23] truncate">{item.title}</p>
                      <p className="text-[#5A6660] text-[11px] truncate">{item.description}</p>
                    </div>
                    <div className="shrink-0">
                      {item.actionHref ? (
                        <Link
                          href={item.actionHref}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors"
                        >
                          {item.actionLabel}
                        </Link>
                      ) : item.actionView ? (
                        <button
                          type="button"
                          onClick={() => setFocusedView(item.actionView!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[#176B49] bg-[#E8F0EA] hover:bg-[#DBE7DE] transition-colors cursor-pointer"
                        >
                          {item.actionLabel}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =====================================================================
              ACOMPANHAMENTO: 3 LINHAS SIMPLES
              Fotos → • Anamnese → • Formulários →
              ===================================================================== */}
          <div className="bg-white border border-[#E5E8E2] rounded-2xl shadow-xs overflow-hidden">
            <div className="p-3.5 sm:px-4 sm:py-3 border-b border-[#E5E8E2] bg-[#FAF9F6] flex items-center justify-between">
              <h2 className="font-heading text-xs font-bold text-[#5A6660] uppercase tracking-wider">
                Acompanhamento
              </h2>
              <span className="text-[11px] text-[#5A6660]">Toque para acessar</span>
            </div>
            <div className="divide-y divide-[#E5E8E2]">
              {/* 1. Fotos */}
              <button
                type="button"
                onClick={() => setFocusedView("fotos")}
                className="w-full p-4 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] active:bg-[#F5F5F0] transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
                    <PhotoIcon className="w-4 h-4 text-[#176B49]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#102E23]">Fotos</span>
                      {hasPendingPhotos && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                          Envio solicitado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5A6660]">
                      {photos.length > 0
                        ? `${photos.length} ${photos.length === 1 ? "avaliação registrada" : "avaliações registradas"}`
                        : "Nenhuma foto registrada"}
                    </p>
                  </div>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-[#8E9992] group-hover:text-[#176B49] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* 2. Anamnese */}
              <button
                type="button"
                onClick={() => setFocusedView("anamnese")}
                className="w-full p-4 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] active:bg-[#F5F5F0] transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
                    <ClipboardCheckIcon className="w-4 h-4 text-[#176B49]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#102E23]">Anamnese</span>
                      {!overview.hasAnamnesis && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#E8F0EA] text-[#176B49]">
                          Pendente
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5A6660]">
                      {overview.hasAnamnesis ? "Preenchida e atualizada" : "Ainda não possui anamnese"}
                    </p>
                  </div>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-[#8E9992] group-hover:text-[#176B49] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* 3. Formulários */}
              <button
                type="button"
                onClick={() => setFocusedView("formularios")}
                className="w-full p-4 flex items-center justify-between gap-3 hover:bg-[#FAF9F6] active:bg-[#F5F5F0] transition-colors text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
                    <FileTextIcon className="w-4 h-4 text-[#176B49]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#102E23]">Formulários</span>
                      {forms.some((f) => f.rawStatus === "PENDING") && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
                          Aguardando resposta
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5A6660]">
                      {forms.length > 0
                        ? `${forms.filter((f) => f.rawStatus === "SUBMITTED").length} respondido(s) • ${forms.length} total`
                        : "Nenhum formulário enviado"}
                    </p>
                  </div>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-[#8E9992] group-hover:text-[#176B49] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>
          </div>

          {/* =====================================================================
              HISTÓRICO E INFORMAÇÕES DO ALUNO (Acesso Compacto)
              ===================================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Histórico compacto */}
            <button
              type="button"
              onClick={() => setFocusedView("historico")}
              className="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs hover:bg-[#FAF9F6] active:bg-[#F5F5F0] transition-colors text-left cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#F5F5F0] flex items-center justify-center shrink-0">
                  <ClockHistoryIcon className="w-4 h-4 text-[#5A6660]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#102E23]">Histórico de Atividades</p>
                  <p className="text-[11px] text-[#5A6660]">{timelineEvents.length} registro(s) na linha do tempo</p>
                </div>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[#8E9992] group-hover:text-[#176B49] group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            {/* Informações Cadastrais e Biometria */}
            <div className="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#102E23]">Informações do Aluno</span>
                <button
                  type="button"
                  onClick={() => setIsEditDataModalOpen(true)}
                  className="text-[11px] font-bold text-[#176B49] hover:underline cursor-pointer"
                >
                  {overview.weightKg || overview.heightCm || overview.objective ? "Editar" : "Completar dados"}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center pt-0.5">
                <div className="p-1.5 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
                  <span className="text-[9px] uppercase font-bold text-[#5A6660] block">Peso</span>
                  <span className="text-xs font-bold text-[#102E23]">{overview.weightKg ? `${overview.weightKg}kg` : "—"}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
                  <span className="text-[9px] uppercase font-bold text-[#5A6660] block">Altura</span>
                  <span className="text-xs font-bold text-[#102E23]">{overview.heightCm ? `${overview.heightCm}cm` : "—"}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
                  <span className="text-[9px] uppercase font-bold text-[#5A6660] block">Idade</span>
                  <span className="text-xs font-bold text-[#102E23]">{overview.age ? `${overview.age}a` : "—"}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
                  <span className="text-[9px] uppercase font-bold text-[#5A6660] block">Sexo</span>
                  <span className="text-xs font-bold text-[#102E23]">{overview.sex ? overview.sex.charAt(0).toUpperCase() : "—"}</span>
                </div>
              </div>
              {overview.objective && (
                <p className="text-[11px] text-[#5A6660] truncate pt-0.5">
                  <strong className="text-[#102E23]">Objetivo:</strong> {overview.objective}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-VISÕES FOCADAS (Acessadas diretamente com retorno em 1 clique)
          ========================================================================= */}

      {/* FOTOS */}
      {focusedView === "fotos" && (
        <div className="space-y-4">
          <StudentPhotosMural
            consultancySlug={consultancySlug}
            studentPublicId={student.membershipPublicId}
            studentName={student.name}
            photos={photos}
            onRequestPhotosClick={() => setRequestModal({ isOpen: true, type: "PHOTOS" })}
          />
        </div>
      )}

      {/* ANAMNESE */}
      {focusedView === "anamnese" && (
        <div className="space-y-4">
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
        </div>
      )}

      {/* FORMULÁRIOS */}
      {focusedView === "formularios" && (
        <div className="space-y-4">
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
        </div>
      )}

      {/* HISTÓRICO COMPLETO */}
      {focusedView === "historico" && (
        <div className="p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
            <div>
              <h2 className="font-heading text-base font-bold text-[#102E23]">
                Histórico de Atividades do Aluno
              </h2>
              <p className="text-xs text-[#5A6660]">
                Linha do tempo de treinos, fotos, formulários e anamneses
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8F0EA] text-[#176B49]">
              {timelineEvents.length} eventos
            </span>
          </div>

          {timelineEvents.length === 0 ? (
            <p className="text-xs text-[#5A6660] py-6 text-center">
              Nenhum evento registrado ainda para este aluno.
            </p>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E8E2]">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="relative text-xs space-y-0.5">
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#176B49] border-2 border-white" />
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold text-[#102E23]">{evt.title}</p>
                    <span className="text-[10px] text-[#5A6660] shrink-0">{formatDisplayDate(evt.date)}</span>
                  </div>
                  <p className="text-[#5A6660]">{evt.subtitle}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAIS: EDIÇÃO DE DADOS, SOLICITAÇÃO E CRIAÇÃO
          ========================================================================= */}
      {/* Modal de Edição de Dados do Aluno */}
      {isEditDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E8E2] pb-2.5">
              <h3 className="font-heading text-base font-bold text-[#102E23]">
                Editar Dados do Aluno
              </h3>
              <button
                type="button"
                onClick={() => setIsEditDataModalOpen(false)}
                className="text-[#5A6660] hover:text-[#102E23] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <p className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs">{editError}</p>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#102E23] block mb-1">Peso (kg)</label>
                <input
                  type="text"
                  value={editWeight}
                  onChange={(e) => setEditWeight(e.target.value)}
                  placeholder="Ex: 75.5"
                  className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-sm text-[#102E23] focus:outline-none focus:border-[#176B49]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#102E23] block mb-1">Altura (cm)</label>
                <input
                  type="text"
                  value={editHeight}
                  onChange={(e) => setEditHeight(e.target.value)}
                  placeholder="Ex: 178"
                  className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-sm text-[#102E23] focus:outline-none focus:border-[#176B49]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#102E23] block mb-1">Objetivo</label>
                <input
                  type="text"
                  value={editObjective}
                  onChange={(e) => setEditObjective(e.target.value)}
                  placeholder="Ex: Hipertrofia e definição"
                  className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-sm text-[#102E23] focus:outline-none focus:border-[#176B49]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#102E23] block mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-sm text-[#102E23] focus:outline-none focus:border-[#176B49]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E8E2]">
              <button
                type="button"
                onClick={() => setIsEditDataModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#5A6660] hover:bg-[#F5F5F0] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSavePersonalData}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
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
