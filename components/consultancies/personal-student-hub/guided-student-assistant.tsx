/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/account/user-avatar";
import type {
  PersonalStudentSummary,
  PersonalStudentDetail,
  StudentFormAnswer,
  StudentWorkoutItem,
} from "@/lib/consultancies/personal-student-hub";
import {
  getPersonalStudentDetailAction,
  requestStudentPhotosAction,
  requestStudentAnamnesisAction,
  requestStudentCustomFormAction,
  getAvailableFormTemplatesAction,
} from "@/app/consultoria/[slug]/progresso/student-request-actions";
import type { AvailableFormTemplateOption } from "@/lib/consultancies/student-requests";

// ============================================================================
// ICONS
// ============================================================================
function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
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

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function LayoutGridIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function PhotoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function ClipboardCheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function FileTextIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function DumbbellIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
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

function CheckCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SparklesBubbleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-1.074-.823l.42-2.31C3.606 16.297 3 14.254 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

// Format date helper
function formatDisplayDate(dateVal: unknown): string {
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

export type AssistantStep = "SELECT_STUDENT" | "SELECT_SECTION" | "SECTION_DETAIL";
export type SectionKey = "visao-geral" | "fotos" | "anamnese" | "formularios" | "treinos";

export interface GuidedStudentAssistantProps {
  consultancySlug: string;
  professionalName?: string;
  students: PersonalStudentSummary[];
  effectiveMode?: string;
  userRoles?: string[];
  initialStudentPublicId?: string;
}

export function GuidedStudentAssistant({
  consultancySlug,
  professionalName,
  students,
  effectiveMode,
  userRoles = [],
  initialStudentPublicId,
}: GuidedStudentAssistantProps) {
  // Assistant State
  const [step, setStep] = useState<AssistantStep>("SELECT_STUDENT");
  const [slideDirection, setSlideDirection] = useState<"forward" | "backward">("forward");
  const [selectedStudent, setSelectedStudent] = useState<PersonalStudentSummary | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("visao-geral");

  // Filter & Search State
  const [search, setSearch] = useState("");
  const [workoutFilter, setWorkoutFilter] = useState<"ALL" | "WITH_WORKOUT" | "WITHOUT_WORKOUT">("ALL");

  // Student Detail Asynchronously Loaded
  const [detailsCache, setDetailsCache] = useState<Record<string, PersonalStudentDetail>>({});
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const latestRequestIdRef = useRef<number>(0);

  // Sub-section states
  const [anamnesisSubTab, setAnamnesisSubTab] = useState<"respostas" | "historico" | "enviar" | "criar">("respostas");
  const [formsSubTab, setFormsSubTab] = useState<"respondidos" | "pendentes" | "enviar" | "criar">("respondidos");
  const [selectedFormDetail, setSelectedFormDetail] = useState<StudentFormAnswer | null>(null);

  // Action State (Anamnesis & Form sends)
  const [availableTemplates, setAvailableTemplates] = useState<AvailableFormTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isSendingRequest, startTransition] = useTransition();
  const [requestFeedback, setRequestFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Photos State
  const [selectedZoomPhoto, setSelectedZoomPhoto] = useState<{ url: string; pose: string; date: string } | null>(null);
  const [isPhotoComparatorOpen, setIsPhotoComparatorOpen] = useState(false);
  const [compareEvalA, setCompareEvalA] = useState<string>("");
  const [compareEvalB, setCompareEvalB] = useState<string>("");
  const [comparePose, setComparePose] = useState<string>("FRONT");

  // Roles determination
  const isAdmin = effectiveMode === "ADMIN" || effectiveMode === "CONSULTANCY_ADMIN" || userRoles.includes("CONSULTANCY_ADMIN");

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesEmail = s.email.toLowerCase().includes(q);
        const matchesObjective = s.objective ? s.objective.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesEmail && !matchesObjective) return false;
      }
      if (workoutFilter === "WITH_WORKOUT") {
        if (!(s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle)) return false;
      } else if (workoutFilter === "WITHOUT_WORKOUT") {
        if (s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle) return false;
      }
      return true;
    });
  }, [students, search, workoutFilter]);

  // Operational Counters
  const withWorkoutCount = useMemo(
    () => students.filter((s) => s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle).length,
    [students]
  );
  const withoutWorkoutCount = useMemo(
    () => students.filter((s) => !s.latestWorkoutTitle || s.latestAssignmentStatus !== "ACTIVE").length,
    [students]
  );

  // Deep-link auto-selection if initialStudentPublicId is present
  useEffect(() => {
    if (initialStudentPublicId && students.length > 0 && !selectedStudent) {
      const match = students.find((s) => s.membershipPublicId === initialStudentPublicId);
      if (match) {
        handleSelectStudent(match);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStudentPublicId, students]);

  // Fetch Student Detail with race-condition prevention
  function fetchStudentDetail(membershipPublicId: string) {
    if (detailsCache[membershipPublicId]) {
      setIsLoadingDetail(false);
      setDetailError(null);
      return;
    }

    const currentRequestId = ++latestRequestIdRef.current;
    setIsLoadingDetail(true);
    setDetailError(null);

    getPersonalStudentDetailAction(consultancySlug, membershipPublicId)
      .then((res) => {
        // Discard stale responses if student changed while request was in-flight
        if (latestRequestIdRef.current !== currentRequestId) {
          return;
        }
        if (res.success && res.detail) {
          setDetailsCache((prev) => ({ ...prev, [membershipPublicId]: res.detail! }));
          setIsLoadingDetail(false);
        } else {
          setDetailError(res.error || "Não foi possível carregar os dados completos do aluno.");
          setIsLoadingDetail(false);
        }
      })
      .catch((err) => {
        if (latestRequestIdRef.current !== currentRequestId) return;
        setDetailError(err instanceof Error ? err.message : "Erro ao carregar detalhes.");
        setIsLoadingDetail(false);
      });
  }

  // Load available custom form templates
  function loadFormTemplates() {
    if (availableTemplates.length > 0) return;
    getAvailableFormTemplatesAction(consultancySlug).then((res) => {
      if (res.success && res.templates) {
        setAvailableTemplates(res.templates);
        if (res.templates.length > 0 && !selectedTemplateId) {
          setSelectedTemplateId(res.templates[0].publicId);
        }
      }
    });
  }

  // Navigation handlers
  function handleSelectStudent(student: PersonalStudentSummary) {
    setSelectedStudent(student);
    setSlideDirection("forward");
    setStep("SELECT_SECTION");
    setRequestFeedback(null);
    fetchStudentDetail(student.membershipPublicId);
  }

  function handleBackToStudents() {
    setSlideDirection("backward");
    setStep("SELECT_STUDENT");
    setRequestFeedback(null);
  }

  function handleSelectSection(section: SectionKey) {
    setActiveSection(section);
    setSlideDirection("forward");
    setStep("SECTION_DETAIL");
    setRequestFeedback(null);
    if (section === "formularios") {
      loadFormTemplates();
    }
  }

  function handleBackToSections() {
    setSlideDirection("backward");
    setStep("SELECT_SECTION");
    setRequestFeedback(null);
  }

  // Current active detail object
  const currentDetail: PersonalStudentDetail | null = selectedStudent
    ? detailsCache[selectedStudent.membershipPublicId] || null
    : null;

  // Active workout resolution
  const activeWorkout: StudentWorkoutItem | null = currentDetail
    ? currentDetail.workouts.find((w) => w.status === "ACTIVE") || null
    : null;

  // Send Actions
  function handleSendAnamnesisRequest() {
    if (!selectedStudent) return;
    startTransition(async () => {
      try {
        const res = await requestStudentAnamnesisAction(consultancySlug, selectedStudent.membershipPublicId);
        if (res.success) {
          setRequestFeedback({
            type: "success",
            message: `Solicitação de anamnese enviada com sucesso para ${selectedStudent.name}!`,
          });
          // Re-fetch student detail to show updated request
          fetchStudentDetail(selectedStudent.membershipPublicId);
        } else {
          setRequestFeedback({
            type: "error",
            message: res.error || "Erro ao solicitar anamnese.",
          });
        }
      } catch (err) {
        setRequestFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Erro na solicitação.",
        });
      }
    });
  }

  function handleSendCustomFormRequest() {
    if (!selectedStudent || !selectedTemplateId) return;
    startTransition(async () => {
      try {
        const res = await requestStudentCustomFormAction(
          consultancySlug,
          selectedStudent.membershipPublicId,
          selectedTemplateId
        );
        if (res.success) {
          setRequestFeedback({
            type: "success",
            message: `Formulário enviado com sucesso para ${selectedStudent.name}!`,
          });
          fetchStudentDetail(selectedStudent.membershipPublicId);
        } else {
          setRequestFeedback({
            type: "error",
            message: res.error || "Erro ao solicitar formulário.",
          });
        }
      } catch (err) {
        setRequestFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Erro na solicitação.",
        });
      }
    });
  }

  function handleSendPhotosRequest() {
    if (!selectedStudent) return;
    startTransition(async () => {
      try {
        const res = await requestStudentPhotosAction(consultancySlug, selectedStudent.membershipPublicId);
        if (res.success) {
          setRequestFeedback({
            type: "success",
            message: `Solicitação de fotos enviada com sucesso para ${selectedStudent.name}!`,
          });
          fetchStudentDetail(selectedStudent.membershipPublicId);
        } else {
          setRequestFeedback({
            type: "error",
            message: res.error || "Erro ao solicitar fotos.",
          });
        }
      } catch (err) {
        setRequestFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Erro na solicitação.",
        });
      }
    });
  }

  // Animation class helper
  const slideAnimationClass =
    slideDirection === "forward"
      ? "animate-in fade-in slide-in-from-right-4 duration-200 motion-reduce:animate-none"
      : "animate-in fade-in slide-in-from-left-4 duration-200 motion-reduce:animate-none";

  return (
    <div className="w-full space-y-6">
      {/* =====================================================================
          STEP 1: ESCOLHER O ALUNO
          ===================================================================== */}
      {step === "SELECT_STUDENT" && (
        <div className={`space-y-5 ${slideAnimationClass}`}>
          {/* Conversational Greeting Card - Solid Black/Graphite Card */}
          <div className="p-5 sm:p-7 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] shadow-md text-white space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#0B0C0E] border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                <SparklesBubbleIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Assistente Guiado · Trevo One
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white font-sans tracking-tight">
                  {professionalName && professionalName.trim()
                    ? `Olá, ${professionalName.trim()}! Qual aluno você gostaria de ver?`
                    : "Olá! Qual aluno você gostaria de ver?"}
                </h1>
                <p className="text-xs sm:text-sm text-[#CBDDD3] font-sans leading-relaxed">
                  Selecione um aluno para navegar diretamente pela Visão Geral, Fotos, Anamnese, Formulários ou Treinos.
                </p>
              </div>
            </div>

            {/* Quick KPIs / Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setWorkoutFilter("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[38px] ${
                  workoutFilter === "ALL"
                    ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                    : "bg-[#0B0C0E] text-[#CBDDD3] hover:text-white border border-white/10"
                }`}
              >
                Todos ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setWorkoutFilter("WITH_WORKOUT")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[38px] ${
                  workoutFilter === "WITH_WORKOUT"
                    ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                    : "bg-[#0B0C0E] text-[#CBDDD3] hover:text-white border border-white/10"
                }`}
              >
                Com treino ({withWorkoutCount})
              </button>
              <button
                type="button"
                onClick={() => setWorkoutFilter("WITHOUT_WORKOUT")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[38px] ${
                  workoutFilter === "WITHOUT_WORKOUT"
                    ? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
                    : "bg-[#0B0C0E] text-[#CBDDD3] hover:text-white border border-white/10"
                }`}
              >
                Sem treino ({withoutWorkoutCount})
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 sm:p-4 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] shadow-xs flex items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <SearchIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, e-mail ou objetivo..."
                aria-label="Buscar aluno"
                className="w-full pl-10 pr-16 py-2.5 text-xs sm:text-sm rounded-lg border border-white/10 bg-[#0B0C0E] text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="shrink-0 text-xs font-semibold text-[#CBDDD3] hidden sm:block">
              {filteredStudents.length} {filteredStudents.length === 1 ? "aluno disponível" : "alunos disponíveis"}
            </div>
          </div>

          {/* Empty / Error States */}
          {students.length === 0 ? (
            <div className="p-10 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-center space-y-3 shadow-sm text-white">
              <div className="w-12 h-12 rounded-xl bg-[#0B0C0E] border border-white/10 flex items-center justify-center mx-auto text-emerald-400">
                <SparklesBubbleIcon className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white font-sans">Nenhum aluno cadastrado</h2>
              <p className="text-xs text-[#CBDDD3] max-w-md mx-auto">
                Assim que novos alunos forem vinculados à consultoria, eles aparecerão aqui para atendimento guiado.
              </p>
              {isAdmin && (
                <Link
                  href={`/consultoria/${consultancySlug}/membros`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 min-h-[44px] cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>+ Convidar primeiro aluno</span>
                </Link>
              )}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-center space-y-3 shadow-sm text-white">
              <h2 className="text-base font-bold text-white font-sans">Nenhum resultado para a busca</h2>
              <p className="text-xs text-[#CBDDD3]">
                {search
                  ? `Nenhum aluno corresponde ao termo "${search}".`
                  : "Nenhum aluno atende aos filtros selecionados."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setWorkoutFilter("ALL");
                }}
                className="text-xs font-bold text-emerald-400 hover:underline cursor-pointer min-h-[44px]"
              >
                Limpar busca e restaurar lista
              </button>
            </div>
          ) : (
            /* Student Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="guided-student-list">
              {filteredStudents.map((student) => {
                const hasActiveWorkout =
                  student.latestAssignmentStatus === "ACTIVE" && !!student.latestWorkoutTitle;

                return (
                  <div
                    key={student.membershipPublicId}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectStudent(student)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectStudent(student);
                      }
                    }}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] hover:border-emerald-500/50 hover:bg-[#1B1D21] transition-all cursor-pointer group flex items-center justify-between gap-3 min-h-[76px] text-white shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-500"
                    data-testid="guided-student-card"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <UserAvatar
                          fullName={student.name}
                          userPublicId={student.userPublicId}
                          size="md"
                          className="shrink-0 ring-1 ring-white/10 group-hover:scale-105 transition-transform"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#151619] ${
                            hasActiveWorkout ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                          title={hasActiveWorkout ? "Treino ativo" : "Sem treino prescrito"}
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="font-heading text-sm font-bold text-white group-hover:text-emerald-400 transition-colors block truncate">
                          {student.name}
                        </span>
                        <p className="text-xs text-[#CBDDD3] truncate">{student.email}</p>
                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                          {hasActiveWorkout ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 truncate max-w-[200px]">
                              <DumbbellIcon className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate">Treino ativo: {student.latestWorkoutTitle}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-amber-300">Sem treino prescrito</span>
                          )}
                          {student.objective && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0B0C0E] text-[#CBDDD3] border border-white/10 truncate max-w-[120px]">
                              {student.objective}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all p-1">
                      <ChevronRightIcon className="w-5 h-5" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          STEP 2: ESCOLHER O QUE VER
          ===================================================================== */}
      {step === "SELECT_SECTION" && selectedStudent && (
        <div className={`space-y-5 ${slideAnimationClass}`}>
          {/* Top Bar Navigation & Selected Student Header */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] shadow-md text-white space-y-3">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBackToStudents}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#CBDDD3] hover:text-white transition-colors cursor-pointer min-h-[44px] px-2 rounded-lg hover:bg-white/5"
              >
                <ArrowLeftIcon className="w-4 h-4 text-emerald-400" />
                <span>Trocar aluno</span>
              </button>

              <div className="flex items-center gap-2">
                <Link
                  href={`/consultoria/${consultancySlug}/progresso/alunos/${selectedStudent.membershipPublicId}`}
                  className="text-xs font-semibold text-emerald-400 hover:underline min-h-[44px] flex items-center px-2 cursor-pointer"
                >
                  Ver perfil completo →
                </Link>
              </div>
            </div>

            {/* Student Identity Banner */}
            <div className="flex items-center gap-3.5 pt-2 border-t border-white/10">
              <UserAvatar
                fullName={selectedStudent.name}
                userPublicId={selectedStudent.userPublicId}
                size="md"
                className="shrink-0 ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-white font-sans truncate">
                  {selectedStudent.name}
                </h2>
                <p className="text-xs text-[#CBDDD3] truncate">{selectedStudent.email}</p>
              </div>
            </div>
          </div>

          {/* Conversational Message Bubble */}
          <div className="p-4 sm:p-5 rounded-xl border border-emerald-500/30 bg-[#0B0C0E] shadow-sm text-white flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <SparklesBubbleIcon className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                Escolha a Seção
              </span>
              <p className="text-sm sm:text-base font-bold text-white font-sans">
                O que você gostaria de ver de {selectedStudent.name}?
              </p>
            </div>
          </div>

          {/* 5 Primary Option Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. Visão Geral */}
            <button
              type="button"
              onClick={() => handleSelectSection("visao-geral")}
              className="p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] hover:border-emerald-500/50 hover:bg-[#1B1D21] transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[140px] text-white shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#0B0C0E] border border-white/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <LayoutGridIcon className="w-5 h-5" />
                </div>
                <ChevronRightIcon className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="pt-3">
                <h3 className="font-heading font-bold text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors">
                  Visão Geral
                </h3>
                <p className="text-xs text-[#CBDDD3] mt-1 leading-relaxed line-clamp-2">
                  Cadastro, objetivos registrados, medidas e situação geral.
                </p>
              </div>
            </button>

            {/* 2. Fotos */}
            <button
              type="button"
              onClick={() => handleSelectSection("fotos")}
              className="p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] hover:border-emerald-500/50 hover:bg-[#1B1D21] transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[140px] text-white shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#0B0C0E] border border-white/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PhotoIcon className="w-5 h-5" />
                </div>
                {currentDetail && currentDetail.photos.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {currentDetail.photos.length} avaliações
                  </span>
                )}
                <ChevronRightIcon className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="pt-3">
                <h3 className="font-heading font-bold text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors">
                  Fotos
                </h3>
                <p className="text-xs text-[#CBDDD3] mt-1 leading-relaxed line-clamp-2">
                  Histórico fotográfico organizado por data, poses e comparador lado a lado.
                </p>
              </div>
            </button>

            {/* 3. Anamnese */}
            <button
              type="button"
              onClick={() => handleSelectSection("anamnese")}
              className="p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] hover:border-emerald-500/50 hover:bg-[#1B1D21] transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[140px] text-white shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#0B0C0E] border border-white/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ClipboardCheckIcon className="w-5 h-5" />
                </div>
                {currentDetail && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      currentDetail.anamnesis.length > 0
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-white/5 text-zinc-400 border-white/10"
                    }`}
                  >
                    {currentDetail.anamnesis.length > 0 ? "Respondida" : "Pendente"}
                  </span>
                )}
                <ChevronRightIcon className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="pt-3">
                <h3 className="font-heading font-bold text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors">
                  Anamnese
                </h3>
                <p className="text-xs text-[#CBDDD3] mt-1 leading-relaxed line-clamp-2">
                  Respostas de saúde, histórico médico, hábitos e envio de questionário.
                </p>
              </div>
            </button>

            {/* 4. Formulários */}
            <button
              type="button"
              onClick={() => handleSelectSection("formularios")}
              className="p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] hover:border-emerald-500/50 hover:bg-[#1B1D21] transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[140px] text-white shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#0B0C0E] border border-white/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileTextIcon className="w-5 h-5" />
                </div>
                {currentDetail && currentDetail.forms.length > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {currentDetail.forms.length} formulários
                  </span>
                )}
                <ChevronRightIcon className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="pt-3">
                <h3 className="font-heading font-bold text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors">
                  Formulários
                </h3>
                <p className="text-xs text-[#CBDDD3] mt-1 leading-relaxed line-clamp-2">
                  Questionários respondidos, pendências e envio de modelos da consultoria.
                </p>
              </div>
            </button>

            {/* 5. Treinos */}
            <button
              type="button"
              onClick={() => handleSelectSection("treinos")}
              className="p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] hover:border-emerald-500/50 hover:bg-[#1B1D21] transition-all text-left flex flex-col justify-between group cursor-pointer min-h-[140px] text-white shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-500"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#0B0C0E] border border-white/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DumbbellIcon className="w-5 h-5" />
                </div>
                {selectedStudent.latestAssignmentStatus === "ACTIVE" && selectedStudent.latestWorkoutTitle && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 truncate max-w-[120px]">
                    {selectedStudent.latestWorkoutTitle}
                  </span>
                )}
                <ChevronRightIcon className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="pt-3">
                <h3 className="font-heading font-bold text-sm sm:text-base text-white group-hover:text-emerald-400 transition-colors">
                  Treinos
                </h3>
                <p className="text-xs text-[#CBDDD3] mt-1 leading-relaxed line-clamp-2">
                  Rotinas ativas, fichas de treino e criação personalizada.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 3: DETALHES DA SEÇÃO SELECIONADA
          ===================================================================== */}
      {step === "SECTION_DETAIL" && selectedStudent && (
        <div className={`space-y-5 ${slideAnimationClass}`}>
          {/* Header Navigation Bar */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] shadow-md text-white space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBackToSections}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#CBDDD3] hover:text-white transition-colors cursor-pointer min-h-[44px] px-2 rounded-lg hover:bg-white/5"
                >
                  <ArrowLeftIcon className="w-4 h-4 text-emerald-400" />
                  <span>Opções do aluno</span>
                </button>
                <span className="text-zinc-600">·</span>
                <button
                  type="button"
                  onClick={handleBackToStudents}
                  className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer min-h-[44px] px-1"
                >
                  Trocar aluno
                </button>
              </div>

              {/* Student identity pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B0C0E] border border-white/10">
                <UserAvatar
                  fullName={selectedStudent.name}
                  userPublicId={selectedStudent.userPublicId}
                  size="sm"
                  className="shrink-0"
                />
                <span className="text-xs font-bold text-white truncate max-w-[150px]">
                  {selectedStudent.name}
                </span>
              </div>
            </div>

            {/* Quick Section Switching Chips */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-white/10 overflow-x-auto no-scrollbar">
              {(
                [
                  { key: "visao-geral", label: "Visão Geral", icon: LayoutGridIcon },
                  { key: "fotos", label: "Fotos", icon: PhotoIcon },
                  { key: "anamnese", label: "Anamnese", icon: ClipboardCheckIcon },
                  { key: "formularios", label: "Formulários", icon: FileTextIcon },
                  { key: "treinos", label: "Treinos", icon: DumbbellIcon },
                ] as const
              ).map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeSection === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveSection(tab.key);
                      setRequestFeedback(null);
                      if (tab.key === "formularios") loadFormTemplates();
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[36px] whitespace-nowrap ${
                      isActive
                        ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                        : "bg-[#0B0C0E] text-[#CBDDD3] hover:text-white border border-white/10"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Message Banner (Success / Error from Actions) */}
          {requestFeedback && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold animate-in fade-in ${
                requestFeedback.type === "success"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/15 border-red-500/30 text-red-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {requestFeedback.type === "success" && <CheckCircleIcon className="w-4 h-4 shrink-0" />}
                <span>{requestFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setRequestFeedback(null)}
                className="text-xs hover:underline cursor-pointer min-h-[32px] px-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Loading / Error States for Details */}
          {isLoadingDetail && !currentDetail ? (
            <div className="p-12 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-center space-y-3 text-white">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-[#CBDDD3]">Carregando dados de {selectedStudent.name}...</p>
            </div>
          ) : detailError && !currentDetail ? (
            <div className="p-8 rounded-2xl border border-red-500/30 bg-[#151619] text-center space-y-3 text-white">
              <p className="text-sm font-bold text-red-400">{detailError}</p>
              <button
                type="button"
                onClick={() => fetchStudentDetail(selectedStudent.membershipPublicId)}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 cursor-pointer min-h-[44px]"
              >
                Tentar novamente
              </button>
            </div>
          ) : currentDetail ? (
            <>
              {/* =================================================================
                  3A. VISÃO GERAL
                  ================================================================= */}
              {activeSection === "visao-geral" && (
                <div className="space-y-4">
                  {/* Conversational heading */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-[#0B0C0E] text-white flex items-center gap-3">
                    <SparklesBubbleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                    <p className="text-sm font-bold text-white font-sans">
                      Veja as informações de {currentDetail.student.name}.
                    </p>
                  </div>

                  {/* Structured Informative Blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Bloco 1: Cadastro e Contato */}
                    <div className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-2.5">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        1. Cadastro e Contato
                      </h4>
                      <div className="space-y-1 text-xs">
                        <p className="text-white font-semibold">{currentDetail.student.name}</p>
                        <p className="text-[#CBDDD3]">{currentDetail.student.email}</p>
                        <p className="text-zinc-400 text-[11px]">
                          Membro ativo desde: {formatDisplayDate(currentDetail.student.joinedAt)}
                        </p>
                      </div>
                      <div className="pt-2 flex items-center gap-2">
                        {currentDetail.student.email && (
                          <a
                            href={`mailto:${currentDetail.student.email}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0B0C0E] border border-white/10 text-xs font-semibold text-white hover:text-emerald-400 transition-colors min-h-[36px]"
                          >
                            <span>✉ Enviar e-mail</span>
                          </a>
                        )}
                        <Link
                          href={`/consultoria/${consultancySlug}/progresso/alunos/${currentDetail.student.membershipPublicId}`}
                          className="text-xs text-emerald-400 hover:underline font-semibold min-h-[36px] flex items-center px-1"
                        >
                          Ver perfil completo →
                        </Link>
                      </div>
                    </div>

                    {/* Bloco 2: Objetivos Registrados */}
                    <div className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-2.5">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        2. Objetivos Registrados
                      </h4>
                      <p className="text-xs sm:text-sm text-white font-medium">
                        {currentDetail.overview.objective
                          ? `Objetivo registrado: "${currentDetail.overview.objective}".`
                          : "Nenhum objetivo específico registrado ainda no cadastro deste aluno."}
                      </p>
                      {currentDetail.overview.age && (
                        <p className="text-xs text-[#CBDDD3]">
                          Idade informada: {currentDetail.overview.age} anos
                          {currentDetail.overview.sex ? ` · Sexo: ${currentDetail.overview.sex}` : ""}
                        </p>
                      )}
                    </div>

                    {/* Bloco 3: Medidas e Bioimpedância */}
                    <div className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-2.5">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        3. Medidas e Evolução Registradas
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-[#0B0C0E] border border-white/10">
                          <span className="text-[10px] text-zinc-400 block">Peso mais recente</span>
                          <span className="text-sm font-bold text-white">
                            {currentDetail.overview.weightKg != null
                              ? `${currentDetail.overview.weightKg} kg`
                              : "Não registrado"}
                          </span>
                          {currentDetail.overview.lastWeightRecordedOn && (
                            <span className="text-[10px] text-zinc-500 block">
                              Em {formatDisplayDate(currentDetail.overview.lastWeightRecordedOn)}
                            </span>
                          )}
                        </div>
                        <div className="p-2.5 rounded-lg bg-[#0B0C0E] border border-white/10">
                          <span className="text-[10px] text-zinc-400 block">Altura</span>
                          <span className="text-sm font-bold text-white">
                            {currentDetail.overview.heightCm != null
                              ? `${currentDetail.overview.heightCm} cm`
                              : "Não registrada"}
                          </span>
                        </div>
                      </div>
                      {currentDetail.measurements.length > 0 && (
                        <p className="text-[11px] text-[#CBDDD3]">
                          Total de {currentDetail.measurements.length} registro(s) de medidas no histórico.
                        </p>
                      )}
                    </div>

                    {/* Bloco 4: Situação dos Treinos */}
                    <div className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-2.5">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        4. Situação dos Treinos
                      </h4>
                      <div className="text-xs space-y-1">
                        {activeWorkout ? (
                          <div className="p-2.5 rounded-lg bg-[#0B0C0E] border border-emerald-500/30 space-y-1">
                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                              Treino Ativo
                            </span>
                            <p className="text-sm font-bold text-white">{activeWorkout.title}</p>
                            <p className="text-zinc-400 text-[11px]">
                              Nível {activeWorkout.difficultyLevel} · Versão v{activeWorkout.versionNumber}
                            </p>
                          </div>
                        ) : (
                          <p className="text-amber-300 font-medium">
                            Este aluno não possui um treino ativo no momento.
                          </p>
                        )}
                        <p className="text-[11px] text-zinc-400 pt-1">
                          Total de {currentDetail.workouts.length} treino(s) prescrito(s) e{" "}
                          {currentDetail.completedSessions.length} sessão(ões) concluída(s).
                        </p>
                      </div>
                      <div className="pt-1 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectSection("treinos")}
                          className="text-xs font-semibold text-emerald-400 hover:underline min-h-[36px] flex items-center cursor-pointer"
                        >
                          Ver ficha de treinos →
                        </button>
                      </div>
                    </div>

                    {/* Bloco 5: Anamneses e Formulários */}
                    <div className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-2.5">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        5. Anamneses e Formulários
                      </h4>
                      <div className="text-xs space-y-1 text-[#CBDDD3]">
                        <p>
                          {currentDetail.anamnesis.length > 0
                            ? `Anamnese respondida (${currentDetail.anamnesis.length} seções registradas).`
                            : "Este aluno ainda não possui uma anamnese respondida."}
                        </p>
                        <p>
                          {currentDetail.forms.length > 0
                            ? `${currentDetail.forms.length} formulário(s) personalizado(s) disponível(is).`
                            : "Nenhum formulário personalizado enviado ou respondido."}
                        </p>
                      </div>
                      <div className="pt-1 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectSection("anamnese")}
                          className="text-xs text-emerald-400 hover:underline font-semibold min-h-[36px] flex items-center cursor-pointer"
                        >
                          Abrir Anamnese →
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSection("formularios")}
                          className="text-xs text-emerald-400 hover:underline font-semibold min-h-[36px] flex items-center cursor-pointer"
                        >
                          Abrir Formulários →
                        </button>
                      </div>
                    </div>

                    {/* Bloco 6: Avaliações e Fotos */}
                    <div className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-2.5">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        6. Histórico Fotográfico
                      </h4>
                      <p className="text-xs text-[#CBDDD3]">
                        {currentDetail.photos.length > 0
                          ? `Total de ${currentDetail.photos.length} avaliação(ões) fotográfica(s) registrada(s).`
                          : "Nenhum registro fotográfico enviado por este aluno ainda."}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSelectSection("fotos")}
                        className="text-xs text-emerald-400 hover:underline font-semibold min-h-[36px] flex items-center cursor-pointer"
                      >
                        Ver galeria de fotos →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================================
                  3B. FOTOS
                  ================================================================= */}
              {activeSection === "fotos" && (
                <div className="space-y-4">
                  {/* Conversational heading & Action Toolbar */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-[#0B0C0E] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <SparklesBubbleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                      <p className="text-sm font-bold text-white font-sans">
                        Aqui estão os registros fotográficos de {currentDetail.student.name}.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentDetail.photos.length >= 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsPhotoComparatorOpen(!isPhotoComparatorOpen);
                            if (!compareEvalA && currentDetail.photos.length >= 2) {
                              setCompareEvalA(currentDetail.photos[currentDetail.photos.length - 1].requestPublicId);
                              setCompareEvalB(currentDetail.photos[0].requestPublicId);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer min-h-[38px] ${
                            isPhotoComparatorOpen
                              ? "bg-emerald-500 text-zinc-950 font-bold"
                              : "bg-[#151619] text-[#CBDDD3] hover:text-white border border-white/10"
                          }`}
                        >
                          {isPhotoComparatorOpen ? "✕ Fechar comparador" : "⇄ Comparar antes e depois"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleSendPhotosRequest}
                        disabled={isSendingRequest}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all cursor-pointer min-h-[38px] disabled:opacity-50"
                      >
                        + Solicitar novas fotos
                      </button>
                    </div>
                  </div>

                  {/* Comparador Lado a Lado (quando ativo) */}
                  {isPhotoComparatorOpen && currentDetail.photos.length >= 2 && (
                    <div className="p-5 rounded-2xl border border-emerald-500/40 bg-[#151619] text-white space-y-4 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                        <h4 className="text-sm font-bold text-white font-sans">
                          Comparação Lado a Lado de Poses
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-400">Pose:</span>
                          {(
                            [
                              { id: "FRONT", label: "Frente" },
                              { id: "BACK", label: "Costas" },
                              { id: "RIGHT", label: "Lateral D." },
                              { id: "LEFT", label: "Lateral E." },
                            ] as const
                          ).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setComparePose(p.id)}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                                comparePose === p.id
                                  ? "bg-emerald-500 text-zinc-950 font-bold"
                                  : "bg-[#0B0C0E] text-zinc-300 hover:text-white border border-white/10"
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Selectors for Date A and Date B */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-400">Período Anterior (Data A):</label>
                          <select
                            value={compareEvalA}
                            onChange={(e) => setCompareEvalA(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#0B0C0E] border border-white/10 text-white text-xs min-h-[44px]"
                          >
                            {currentDetail.photos.map((p) => (
                              <option key={`a-${p.requestPublicId}`} value={p.requestPublicId}>
                                {formatDisplayDate(p.submittedAt)} ({p.status})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-400">Período Recente (Data B):</label>
                          <select
                            value={compareEvalB}
                            onChange={(e) => setCompareEvalB(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[#0B0C0E] border border-white/10 text-white text-xs min-h-[44px]"
                          >
                            {currentDetail.photos.map((p) => (
                              <option key={`b-${p.requestPublicId}`} value={p.requestPublicId}>
                                {formatDisplayDate(p.submittedAt)} ({p.status})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Side by Side Image Display */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {/* Image A */}
                        {(() => {
                          const evalA = currentDetail.photos.find((p) => p.requestPublicId === compareEvalA);
                          const imgA = evalA?.images.find((i) => i.pose === comparePose);
                          return (
                            <div className="p-3 rounded-xl bg-[#0B0C0E] border border-white/10 text-center space-y-2">
                              <span className="text-xs font-bold text-zinc-300 block">
                                Antes: {formatDisplayDate(evalA?.submittedAt)}
                              </span>
                              <div className="w-full aspect-[3/4] bg-black/60 rounded-lg overflow-hidden flex items-center justify-center border border-white/5">
                                {imgA ? (
                                  <img
                                    src={imgA.imageUrl}
                                    alt={`Foto anterior de ${selectedStudent.name}`}
                                    className="w-full h-full object-contain cursor-pointer"
                                    onClick={() =>
                                      setSelectedZoomPhoto({
                                        url: imgA.imageUrl,
                                        pose: comparePose,
                                        date: formatDisplayDate(evalA?.submittedAt),
                                      })
                                    }
                                  />
                                ) : (
                                  <span className="text-xs text-zinc-500 italic">Foto não enviada nesta pose</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Image B */}
                        {(() => {
                          const evalB = currentDetail.photos.find((p) => p.requestPublicId === compareEvalB);
                          const imgB = evalB?.images.find((i) => i.pose === comparePose);
                          return (
                            <div className="p-3 rounded-xl bg-[#0B0C0E] border border-white/10 text-center space-y-2">
                              <span className="text-xs font-bold text-emerald-400 block">
                                Atual: {formatDisplayDate(evalB?.submittedAt)}
                              </span>
                              <div className="w-full aspect-[3/4] bg-black/60 rounded-lg overflow-hidden flex items-center justify-center border border-white/5">
                                {imgB ? (
                                  <img
                                    src={imgB.imageUrl}
                                    alt={`Foto recente de ${selectedStudent.name}`}
                                    className="w-full h-full object-contain cursor-pointer"
                                    onClick={() =>
                                      setSelectedZoomPhoto({
                                        url: imgB.imageUrl,
                                        pose: comparePose,
                                        date: formatDisplayDate(evalB?.submittedAt),
                                      })
                                    }
                                  />
                                ) : (
                                  <span className="text-xs text-zinc-500 italic">Foto não enviada nesta pose</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Empty state if no photos */}
                  {currentDetail.photos.length === 0 ? (
                    <div className="p-10 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-center space-y-3 text-white">
                      <div className="w-12 h-12 rounded-xl bg-[#0B0C0E] border border-white/10 flex items-center justify-center mx-auto text-emerald-400">
                        <PhotoIcon className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-bold text-white font-sans">
                        Nenhum registro fotográfico enviado
                      </h4>
                      <p className="text-xs text-[#CBDDD3] max-w-md mx-auto">
                        Este aluno ainda não enviou fotos de evolução. Você pode solicitar um conjunto padronizado de fotos agora mesmo.
                      </p>
                      <button
                        type="button"
                        onClick={handleSendPhotosRequest}
                        disabled={isSendingRequest}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 min-h-[44px] cursor-pointer disabled:opacity-50"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <span>+ Solicitar fotos de evolução</span>
                      </button>
                    </div>
                  ) : (
                    /* Timeline of evaluations */
                    <div className="space-y-4">
                      {currentDetail.photos.map((photoEval, idx) => {
                        const poseMap: Record<string, string> = {
                          FRONT: "Frontal",
                          BACK: "Costas",
                          RIGHT: "Lateral Direita",
                          LEFT: "Lateral Esquerda",
                        };

                        return (
                          <div
                            key={photoEval.requestPublicId || idx}
                            className="p-5 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-3 shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2.5 flex-wrap">
                              <div>
                                <span className="text-sm font-bold text-white font-sans">
                                  Avaliação de {formatDisplayDate(photoEval.submittedAt)}
                                </span>
                                {photoEval.reviewerNotes && (
                                  <p className="text-xs text-zinc-400 mt-0.5">{photoEval.reviewerNotes}</p>
                                )}
                              </div>
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-white/[0.06] text-[#CBDDD3] border border-white/10">
                                {photoEval.status === "REVIEWED" ? "Aprovada" : photoEval.status}
                              </span>
                            </div>

                            {/* Photos Grid: 4 poses */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                              {["FRONT", "BACK", "RIGHT", "LEFT"].map((poseKey) => {
                                const img = photoEval.images.find((i) => i.pose === poseKey);
                                return (
                                  <div
                                    key={poseKey}
                                    className="p-2 rounded-xl bg-[#0B0C0E] border border-white/10 text-center space-y-1.5"
                                  >
                                    <span className="text-[11px] font-semibold text-zinc-300 block truncate">
                                      {poseMap[poseKey]}
                                    </span>
                                    <div className="w-full aspect-[3/4] bg-black/60 rounded-lg overflow-hidden flex items-center justify-center border border-white/5 relative group">
                                      {img ? (
                                        <>
                                          <img
                                            src={img.imageUrl}
                                            alt={`${poseMap[poseKey]} - ${selectedStudent.name}`}
                                            className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-105"
                                            onClick={() =>
                                              setSelectedZoomPhoto({
                                                url: img.imageUrl,
                                                pose: poseMap[poseKey],
                                                date: formatDisplayDate(photoEval.submittedAt),
                                              })
                                            }
                                          />
                                          <div
                                            onClick={() =>
                                              setSelectedZoomPhoto({
                                                url: img.imageUrl,
                                                pose: poseMap[poseKey],
                                                date: formatDisplayDate(photoEval.submittedAt),
                                              })
                                            }
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-xs font-bold text-white"
                                          >
                                            Ampliar 🔍
                                          </div>
                                        </>
                                      ) : (
                                        <span className="text-[11px] text-zinc-600 italic">Não enviada</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Zoom Modal (Lightbox) */}
                  {selectedZoomPhoto && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in"
                      onClick={() => setSelectedZoomPhoto(null)}
                    >
                      <div
                        className="relative max-w-3xl max-h-[90vh] bg-[#151619] border border-zinc-700 rounded-2xl p-4 text-white space-y-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                          <div>
                            <h4 className="text-sm font-bold text-white">
                              {selectedZoomPhoto.pose} · {selectedZoomPhoto.date}
                            </h4>
                            <p className="text-xs text-zinc-400">{selectedStudent.name}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedZoomPhoto(null)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                          >
                            <XIcon className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="max-h-[75vh] overflow-hidden flex items-center justify-center bg-black/80 rounded-xl">
                          <img
                            src={selectedZoomPhoto.url}
                            alt="Visualização ampliada da foto"
                            className="max-h-[72vh] w-auto object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================================
                  3C. ANAMNESE
                  ================================================================= */}
              {activeSection === "anamnese" && (
                <div className="space-y-4">
                  {/* Conversational heading */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-[#0B0C0E] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <SparklesBubbleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                      <p className="text-sm font-bold text-white font-sans">
                        Anamnese e histórico de saúde de {currentDetail.student.name}.
                      </p>
                    </div>
                  </div>

                  {/* Sub-tab navigation */}
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setAnamnesisSubTab("respostas")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[38px] ${
                        anamnesisSubTab === "respostas"
                          ? "bg-emerald-500 text-zinc-950 font-bold"
                          : "bg-[#0B0C0E] text-[#CBDDD3] hover:text-white border border-white/10"
                      }`}
                    >
                      Ver respostas do aluno
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnamnesisSubTab("historico")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[38px] ${
                        anamnesisSubTab === "historico"
                          ? "bg-emerald-500 text-zinc-950 font-bold"
                          : "bg-[#0B0C0E] text-[#CBDDD3] hover:text-white border border-white/10"
                      }`}
                    >
                      Consultar histórico
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnamnesisSubTab("enviar")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[38px] ${
                        anamnesisSubTab === "enviar"
                          ? "bg-emerald-500 text-zinc-950 font-bold"
                          : "bg-[#0B0C0E] text-[#CBDDD3] hover:text-white border border-white/10"
                      }`}
                    >
                      Enviar anamnese ao aluno
                    </button>
                    <Link
                      href={`/consultoria/${consultancySlug}/formularios`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[38px] bg-[#0B0C0E] text-[#CBDDD3] hover:text-white border border-white/10 inline-flex items-center gap-1"
                    >
                      <span>Gerenciar modelos</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-500" />
                    </Link>
                  </div>

                  {/* Sub-tab 1: Respostas */}
                  {anamnesisSubTab === "respostas" && (
                    <div className="space-y-3">
                      {currentDetail.anamnesis.length === 0 ? (
                        <div className="p-8 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-center space-y-3 text-white">
                          <p className="text-sm font-semibold text-white">
                            Este aluno ainda não possui uma anamnese respondida.
                          </p>
                          <p className="text-xs text-[#CBDDD3]">
                            Você pode enviar uma solicitação para que o aluno preencha a anamnese padrão da consultoria.
                          </p>
                          <button
                            type="button"
                            onClick={() => setAnamnesisSubTab("enviar")}
                            className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 cursor-pointer min-h-[44px]"
                          >
                            Enviar solicitação agora →
                          </button>
                        </div>
                      ) : (
                        currentDetail.anamnesis.map((section, sIdx) => (
                          <div
                            key={section.title || sIdx}
                            className="p-5 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-3 shadow-xs"
                          >
                            <h4 className="text-sm font-bold text-emerald-400 font-sans border-b border-white/10 pb-2">
                              {section.title}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {section.items.map((item, iIdx) => (
                                <div key={item.label || iIdx} className="space-y-0.5">
                                  <span className="text-[11px] font-semibold text-zinc-400 block">
                                    {item.label}
                                  </span>
                                  <p className="text-xs text-white font-medium bg-[#0B0C0E] p-2.5 rounded-lg border border-white/10">
                                    {item.value || "—"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Sub-tab 2: Histórico */}
                  {anamnesisSubTab === "historico" && (
                    <div className="p-5 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-3 shadow-xs">
                      <h4 className="text-sm font-bold text-white font-sans">
                        Histórico de Anamnese
                      </h4>
                      <div className="space-y-2 text-xs">
                        {currentDetail.anamnesis.length > 0 ? (
                          <div className="p-3 rounded-xl bg-[#0B0C0E] border border-white/10 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-bold text-white">Anamnese Completa de Saúde</p>
                              <p className="text-[11px] text-zinc-400">
                                {currentDetail.anamnesis.length} seções registradas
                              </p>
                            </div>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Respondida
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-400 italic">Nenhum envio registrado no histórico.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sub-tab 3: Enviar anamnese ao aluno */}
                  {anamnesisSubTab === "enviar" && (
                    <div className="p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-4 shadow-md max-w-2xl">
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white font-sans">
                          Enviar Anamnese para o Aluno
                        </h4>
                        <p className="text-xs text-[#CBDDD3]">
                          Confirme os dados antes de formalizar o envio. O aluno receberá uma notificação na plataforma.
                        </p>
                      </div>

                      <div className="space-y-3 p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Modelo Selecionado:</span>
                          <span className="font-bold text-white">Anamnese de Saúde e Rotina Padrão</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Aluno Destinatário:</span>
                          <span className="font-bold text-emerald-400">{selectedStudent.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">E-mail:</span>
                          <span className="text-white">{selectedStudent.email}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-400">Consultoria:</span>
                          <span className="text-white">{consultancySlug}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleSendAnamnesisRequest}
                          disabled={isSendingRequest}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all cursor-pointer min-h-[44px] disabled:opacity-50"
                        >
                          {isSendingRequest ? "Enviando solicitação..." : "Confirmar e Enviar Solicitação"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* =================================================================
                  3D. FORMULÁRIOS
                  ================================================================= */}
              {activeSection === "formularios" && (
                <div className="space-y-4">
                  {/* Conversational heading */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-[#0B0C0E] text-white flex items-center gap-3">
                    <SparklesBubbleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                    <p className="text-sm font-bold text-white font-sans">
                      Formulários e questionários de {currentDetail.student.name}.
                    </p>
                  </div>

                  {/* Sub-tab navigation */}
                  <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => {
                        setFormsSubTab("respondidos");
                        setSelectedFormDetail(null);
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[38px] ${
                        formsSubTab === "respondidos"
                          ? "bg-emerald-500 text-zinc-950 font-bold"
                          : "bg-[#0B0C0E] text-[#CBDDD3] hover:text-white border border-white/10"
                      }`}
                    >
                      Formulários respondidos ({currentDetail.forms.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormsSubTab("enviar");
                        setSelectedFormDetail(null);
                        loadFormTemplates();
                      }}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[38px] ${
                        formsSubTab === "enviar"
                          ? "bg-emerald-500 text-zinc-950 font-bold"
                          : "bg-[#0B0C0E] text-[#CBDDD3] hover:text-white border border-white/10"
                      }`}
                    >
                      Enviar novo formulário
                    </button>
                    <Link
                      href={`/consultoria/${consultancySlug}/formularios`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer min-h-[38px] bg-[#0B0C0E] text-[#CBDDD3] hover:text-white border border-white/10 inline-flex items-center gap-1"
                    >
                      <span>Criar modelo</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-500" />
                    </Link>
                  </div>

                  {/* Sub-tab 1: Respondidos */}
                  {formsSubTab === "respondidos" && (
                    <div className="space-y-3">
                      {selectedFormDetail ? (
                        /* Expanded Form Questions/Answers view */
                        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-4 shadow-md">
                          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                            <div>
                              <h4 className="text-base font-bold text-white font-sans">
                                {selectedFormDetail.title}
                              </h4>
                              <p className="text-xs text-zinc-400">
                                Respondido em: {formatDisplayDate(selectedFormDetail.submittedAt)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedFormDetail(null)}
                              className="text-xs text-emerald-400 hover:underline font-semibold cursor-pointer min-h-[38px] px-2"
                            >
                              ← Voltar à lista de formulários
                            </button>
                          </div>

                          <div className="space-y-3 pt-1">
                            {selectedFormDetail.questions.length === 0 ? (
                              <p className="text-xs text-zinc-400 italic">Nenhuma resposta registrada neste formulário.</p>
                            ) : (
                              selectedFormDetail.questions.map((q, idx) => (
                                <div
                                  key={idx}
                                  className="p-3.5 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-1 text-xs"
                                >
                                  <span className="font-semibold text-zinc-300 block">{q.question}</span>
                                  <p className="text-white font-medium">{q.answer || "—"}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ) : currentDetail.forms.length === 0 ? (
                        <div className="p-8 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-center space-y-3 text-white">
                          <p className="text-sm font-semibold text-white">
                            Nenhum formulário respondido por este aluno ainda.
                          </p>
                          <p className="text-xs text-[#CBDDD3]">
                            Você pode selecionar um modelo de formulário da consultoria para enviar ao aluno.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setFormsSubTab("enviar");
                              loadFormTemplates();
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 cursor-pointer min-h-[44px]"
                          >
                            Enviar um formulário agora →
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentDetail.forms.map((form) => (
                            <div
                              key={form.id || form.publicId}
                              role="button"
                              tabIndex={0}
                              onClick={() => setSelectedFormDetail(form)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedFormDetail(form);
                                }
                              }}
                              className="p-4 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] hover:border-emerald-500/50 hover:bg-[#1B1D21] transition-all cursor-pointer flex items-center justify-between gap-3 text-white shadow-xs"
                            >
                              <div className="space-y-1 min-w-0 flex-1">
                                <h5 className="font-heading font-bold text-sm text-white truncate">{form.title}</h5>
                                <p className="text-[11px] text-[#CBDDD3]">
                                  {form.submittedAt ? `Respondido em ${formatDisplayDate(form.submittedAt)}` : "Enviado"}
                                </p>
                              </div>
                              <span className="text-xs font-semibold text-emerald-400 group-hover:underline shrink-0">
                                Ver respostas →
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tab 2: Enviar Novo Formulário */}
                  {formsSubTab === "enviar" && (
                    <div className="p-5 sm:p-6 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-4 shadow-md max-w-2xl">
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white font-sans">
                          Selecionar e Enviar Formulário
                        </h4>
                        <p className="text-xs text-[#CBDDD3]">
                          Escolha um modelo ativo da consultoria para enviar ao aluno.
                        </p>
                      </div>

                      {availableTemplates.length === 0 ? (
                        <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-center space-y-2 text-xs text-zinc-400">
                          <p>Nenhum modelo personalizado cadastrado nesta consultoria.</p>
                          <Link
                            href={`/consultoria/${consultancySlug}/formularios`}
                            className="text-emerald-400 hover:underline font-bold inline-block pt-1"
                          >
                            + Criar primeiro modelo de formulário
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-300 block">
                              Modelo de Formulário:
                            </label>
                            <select
                              value={selectedTemplateId}
                              onChange={(e) => setSelectedTemplateId(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0C0E] border border-white/10 text-white text-xs focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                            >
                              {availableTemplates.map((tpl) => (
                                <option key={tpl.publicId} value={tpl.publicId}>
                                  {tpl.title} ({tpl.fieldsCount} perguntas)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">Aluno Destinatário:</span>
                              <span className="font-bold text-emerald-400">{selectedStudent.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-zinc-400">E-mail:</span>
                              <span className="text-white">{selectedStudent.email}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSendCustomFormRequest}
                            disabled={isSendingRequest || !selectedTemplateId}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all cursor-pointer min-h-[44px] disabled:opacity-50"
                          >
                            {isSendingRequest ? "Enviando formulário..." : "Confirmar Envio do Formulário"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* =================================================================
                  3E. TREINOS
                  ================================================================= */}
              {activeSection === "treinos" && (
                <div className="space-y-4">
                  {/* Conversational heading */}
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-[#0B0C0E] text-white flex items-center gap-3">
                    <SparklesBubbleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                    <p className="text-sm font-bold text-white font-sans">
                      Treinos e prescrições de {currentDetail.student.name}.
                    </p>
                  </div>

                  {(() => {
                    const activeWorkouts = currentDetail.workouts.filter((w) => w.status === "ACTIVE");

                    // CASE 1: EXACTLY 1 ACTIVE WORKOUT
                    if (activeWorkouts.length === 1) {
                      const workout = activeWorkouts[0];
                      return (
                        <div className="space-y-4">
                          <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/40 bg-[#151619] text-white space-y-4 shadow-md">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div>
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-md border border-emerald-500/30 inline-block">
                                  Treino Ativo Atual
                                </span>
                                <h4 className="text-lg sm:text-xl font-bold text-white font-sans mt-1">
                                  {workout.title}
                                </h4>
                                {workout.subtitle && (
                                  <p className="text-xs text-[#CBDDD3] mt-0.5">{workout.subtitle}</p>
                                )}
                              </div>
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#0B0C0E] border border-white/10 text-zinc-300">
                                Nível: {workout.difficultyLevel} · v{workout.versionNumber}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                              <div className="p-3 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-0.5">
                                <span className="text-[10px] text-zinc-400 block">Início da Prescrição</span>
                                <span className="font-bold text-white">
                                  {formatDisplayDate(workout.startsOn)}
                                </span>
                              </div>
                              <div className="p-3 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-0.5">
                                <span className="text-[10px] text-zinc-400 block">Sessões Concluídas</span>
                                <span className="font-bold text-white">
                                  {currentDetail.completedSessions.length} sessões realizadas
                                </span>
                              </div>
                            </div>

                            {workout.notesForStudent && (
                              <div className="p-3 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs text-[#CBDDD3]">
                                <span className="font-bold text-white block mb-0.5">Orientações ao aluno:</span>
                                {workout.notesForStudent}
                              </div>
                            )}

                            {/* Direct Action Buttons */}
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                              <Link
                                href={`/consultoria/${consultancySlug}/rotinas/${workout.workoutPublicId}`}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all cursor-pointer min-h-[44px] shadow-sm"
                              >
                                <span>Abrir no Training Studio →</span>
                              </Link>
                              <Link
                                href={`/consultoria/${consultancySlug}/progresso/alunos/${currentDetail.student.membershipPublicId}?tab=treinos`}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs bg-[#0B0C0E] hover:bg-[#1B1D21] border border-white/10 text-white transition-all cursor-pointer min-h-[44px]"
                              >
                                <span>Ver ficha completa</span>
                              </Link>
                            </div>
                          </div>

                          {/* Historical workouts list if any other exists */}
                          {currentDetail.workouts.length > 1 && (
                            <div className="p-4 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-2">
                              <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                Histórico de outros treinos ({currentDetail.workouts.length - 1})
                              </h5>
                              <div className="space-y-1.5 pt-1">
                                {currentDetail.workouts
                                  .filter((w) => w.assignmentPublicId !== workout.assignmentPublicId)
                                  .map((oldW) => (
                                    <div
                                      key={oldW.assignmentPublicId}
                                      className="p-2.5 rounded-lg bg-[#0B0C0E] border border-white/10 flex items-center justify-between gap-3 text-xs"
                                    >
                                      <div>
                                        <span className="font-bold text-white">{oldW.title}</span>
                                        <span className="text-[11px] text-zinc-500 block">
                                          Prescrito em {formatDisplayDate(oldW.startsOn)}
                                        </span>
                                      </div>
                                      <Link
                                        href={`/consultoria/${consultancySlug}/rotinas/${oldW.workoutPublicId}`}
                                        className="text-xs text-emerald-400 hover:underline font-semibold"
                                      >
                                        Abrir ficha →
                                      </Link>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }

                    // CASE 2: MORE THAN 1 ACTIVE WORKOUT
                    if (activeWorkouts.length > 1) {
                      return (
                        <div className="space-y-3">
                          <p className="text-xs sm:text-sm text-[#CBDDD3]">
                            Este aluno possui {activeWorkouts.length} treinos ativos válidos. Escolha qual deseja abrir:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {activeWorkouts.map((workout) => (
                              <div
                                key={workout.assignmentPublicId}
                                className="p-5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-white space-y-3 shadow-xs flex flex-col justify-between"
                              >
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                    Nível {workout.difficultyLevel} · v{workout.versionNumber}
                                  </span>
                                  <h4 className="font-heading font-bold text-base text-white">{workout.title}</h4>
                                  <p className="text-xs text-zinc-400">
                                    Início em {formatDisplayDate(workout.startsOn)}
                                  </p>
                                </div>
                                <div className="pt-2 flex items-center gap-2">
                                  <Link
                                    href={`/consultoria/${consultancySlug}/rotinas/${workout.workoutPublicId}`}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition-all cursor-pointer min-h-[40px]"
                                  >
                                    <span>Abrir no Studio →</span>
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // CASE 3: NO ACTIVE WORKOUT
                    return (
                      <div className="p-8 sm:p-10 rounded-2xl border border-zinc-200 dark:border-[#303238] bg-[#151619] text-center space-y-4 text-white shadow-sm">
                        <div className="w-12 h-12 rounded-xl bg-[#0B0C0E] border border-white/10 flex items-center justify-center mx-auto text-amber-400">
                          <DumbbellIcon className="w-6 h-6" />
                        </div>
                        <div className="space-y-1 max-w-md mx-auto">
                          <h4 className="text-base font-bold text-white font-sans">
                            Nenhum treino ativo no momento
                          </h4>
                          <p className="text-xs text-[#CBDDD3] leading-relaxed">
                            Este aluno não possui uma rotina de treino ativa vinculada. Você pode montar uma nova ficha personalizada ou atribuir uma rotina existente.
                          </p>
                        </div>
                        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                          <Link
                            href={`/consultoria/${consultancySlug}/rotinas/novo?student=${currentDetail.student.membershipPublicId}`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 min-h-[44px] cursor-pointer shadow-sm"
                          >
                            <PlusIcon className="w-4 h-4" />
                            <span>+ Criar treino personalizado</span>
                          </Link>
                          <Link
                            href={`/consultoria/${consultancySlug}/rotinas`}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#0B0C0E] hover:bg-[#1B1D21] border border-white/10 min-h-[44px] cursor-pointer"
                          >
                            <span>Ver modelos da consultoria</span>
                          </Link>
                        </div>

                        {/* Previous workouts if any */}
                        {currentDetail.workouts.length > 0 && (
                          <div className="pt-4 border-t border-white/10 text-left max-w-md mx-auto">
                            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                              Histórico de treinos anteriores ({currentDetail.workouts.length})
                            </span>
                            <div className="space-y-1">
                              {currentDetail.workouts.map((w) => (
                                <div
                                  key={w.assignmentPublicId}
                                  className="p-2 rounded-lg bg-[#0B0C0E] flex items-center justify-between text-xs"
                                >
                                  <span className="text-white font-medium">{w.title}</span>
                                  <Link
                                    href={`/consultoria/${consultancySlug}/rotinas/${w.workoutPublicId}`}
                                    className="text-emerald-400 hover:underline"
                                  >
                                    Ver ficha →
                                  </Link>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
