/* eslint-disable @next/next/no-img-element */
"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useTransition,
  useCallback,
} from "react";
import Link from "next/link";
import { computeInitials } from "@/lib/auth/user-identity";
import type {
  PersonalStudentSummary,
  PersonalStudentDetail,
  StudentFormAnswer,
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

function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
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

function SendPlaneIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function RefreshIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
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

function ClipboardCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
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

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LayoutGridIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function UsersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

// ============================================================================
// CLEAN STUDENT AVATAR (NO BROKEN IMAGES, NO LEAKY "FOTO" TEXT)
// ============================================================================
function StudentAvatar({
  name,
  userPublicId,
  size = "md",
  hasActiveWorkout,
}: {
  name: string;
  userPublicId?: string;
  size?: "xs" | "sm" | "md" | "lg";
  hasActiveWorkout?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const initials = computeInitials(name);

  const dims =
    size === "xs"
      ? "w-6 h-6 text-[10px]"
      : size === "sm"
      ? "w-8 h-8 text-xs"
      : size === "lg"
      ? "w-12 h-12 text-base"
      : "w-10 h-10 text-sm";

  return (
    <div className="relative shrink-0 select-none">
      <div
        className={`${dims} rounded-xl bg-[#202328] border border-white/10 flex items-center justify-center font-bold text-emerald-400 overflow-hidden shadow-xs`}
      >
        {!imageFailed && userPublicId ? (
          <img
            src={`/api/users/${userPublicId}/avatar`}
            alt=""
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          <span aria-hidden="true" className="font-heading tracking-wide text-emerald-400 font-bold">
            {initials}
          </span>
        )}
      </div>
      {typeof hasActiveWorkout === "boolean" && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#151619] ${
            hasActiveWorkout ? "bg-emerald-400" : "bg-amber-400"
          }`}
          title={hasActiveWorkout ? "Treino ativo" : "Sem treino prescrito"}
        />
      )}
    </div>
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

// ============================================================================
// 100% DETERMINISTIC COMMAND / INTENT NORMALIZER (SEM IA)
// ============================================================================
export type CommandIntent =
  | { type: "OVERVIEW" }
  | { type: "PHOTOS" }
  | { type: "ANAMNESIS_VIEW" }
  | { type: "ANAMNESIS_SEND" }
  | { type: "ANAMNESIS_CREATE" }
  | { type: "FORMS_VIEW" }
  | { type: "FORMS_SEND" }
  | { type: "FORMS_CREATE" }
  | { type: "WORKOUTS" }
  | { type: "CHANGE_STUDENT" }
  | { type: "SELECT_STUDENT"; student: PersonalStudentSummary }
  | { type: "AMBIGUOUS_STUDENT"; candidates: PersonalStudentSummary[] }
  | { type: "HELP" }
  | { type: "UNKNOWN" };

export function normalizeCommandText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

export function detectCommandIntent(
  rawText: string,
  context: {
    selectedStudent: PersonalStudentSummary | null;
    students: PersonalStudentSummary[];
  }
): CommandIntent {
  const norm = normalizeCommandText(rawText);
  if (!norm) return { type: "UNKNOWN" };

  // 1. CHANGE STUDENT
  if (
    norm === "trocar aluno" ||
    norm === "trocar de aluno" ||
    norm === "mudar aluno" ||
    norm === "mudar de aluno" ||
    norm === "outro aluno" ||
    norm === "escolher outro aluno" ||
    norm === "voltar para lista" ||
    norm === "listar alunos" ||
    norm === "selecionar outro aluno" ||
    norm === "trocar" ||
    norm === "mudar"
  ) {
    return { type: "CHANGE_STUDENT" };
  }

  // 2. CHECK IF USER IS TRYING TO SELECT A STUDENT BY NAME
  // (e.g. "Anny", "ver Anny", "Quero ver Anny Santos", or if no student is active yet)
  const candidateStudents = context.students.filter((s) => {
    const sNorm = normalizeCommandText(s.name);
    // Direct match, contains, or starts with
    if (sNorm === norm) return true;
    if (norm.startsWith("ver ") && sNorm.includes(norm.slice(4).trim())) return true;
    if (norm.startsWith("abrir ") && sNorm.includes(norm.slice(6).trim())) return true;
    if (norm.startsWith("quero ver ") && sNorm.includes(norm.slice(10).trim())) return true;
    if (!context.selectedStudent && sNorm.includes(norm)) return true;
    return false;
  });

  if (candidateStudents.length === 1) {
    return { type: "SELECT_STUDENT", student: candidateStudents[0] };
  }
  if (candidateStudents.length > 1 && !context.selectedStudent) {
    return { type: "AMBIGUOUS_STUDENT", candidates: candidateStudents };
  }

  // 3. ANAMNESE COMMANDS (Distinguish VIEW vs SEND vs CREATE strictly)
  const hasAnamnese = norm.includes("anamnese");
  if (hasAnamnese) {
    if (norm.includes("criar") || norm.includes("nova") || norm.includes("fazer") || norm.includes("montar")) {
      return { type: "ANAMNESIS_CREATE" };
    }
    if (norm.includes("enviar") || norm.includes("mandar") || norm.includes("solicitar") || norm.includes("pedir")) {
      return { type: "ANAMNESIS_SEND" };
    }
    return { type: "ANAMNESIS_VIEW" };
  }

  // 4. FORMULARIO COMMANDS (Distinguish VIEW vs SEND vs CREATE strictly)
  const hasForm = norm.includes("formulario") || norm.includes("formularios") || norm.includes("questionario");
  if (hasForm) {
    if (norm.includes("criar") || norm.includes("novo") || norm.includes("fazer") || norm.includes("montar")) {
      return { type: "FORMS_CREATE" };
    }
    if (norm.includes("enviar") || norm.includes("mandar") || norm.includes("solicitar") || norm.includes("pedir")) {
      return { type: "FORMS_SEND" };
    }
    return { type: "FORMS_VIEW" };
  }

  // 5. PHOTOS COMMANDS
  if (
    norm.includes("foto") ||
    norm.includes("fotos") ||
    norm.includes("imagem") ||
    norm.includes("imagens") ||
    norm.includes("galeria") ||
    norm.includes("antes e depois") ||
    norm.includes("comparar")
  ) {
    return { type: "PHOTOS" };
  }

  // 6. OVERVIEW COMMANDS
  if (
    norm.includes("visao geral") ||
    norm.includes("resumo") ||
    norm.includes("dados") ||
    norm.includes("perfil") ||
    norm.includes("cadastro") ||
    norm.includes("objetivos") ||
    norm.includes("informacoes") ||
    norm.includes("info") ||
    norm.includes("medidas") ||
    norm.includes("evolucao") ||
    norm.includes("prontuario")
  ) {
    return { type: "OVERVIEW" };
  }

  // 7. WORKOUTS COMMANDS
  if (
    norm.includes("treino") ||
    norm.includes("treinos") ||
    norm.includes("ficha") ||
    norm.includes("fichas") ||
    norm.includes("exercicios") ||
    norm.includes("rotina") ||
    norm.includes("rotinas") ||
    norm.includes("prescricao")
  ) {
    return { type: "WORKOUTS" };
  }

  // 8. HELP
  if (
    norm === "ajuda" ||
    norm === "comandos" ||
    norm === "opcoes" ||
    norm === "o que voce faz" ||
    norm === "socorro"
  ) {
    return { type: "HELP" };
  }

  return { type: "UNKNOWN" };
}

// ============================================================================
// CHAT MESSAGE DATA MODEL
// ============================================================================
export interface ChatMessage {
  id: string;
  sender: "assistant" | "user";
  timestamp: Date;
  text?: string;
  widget?:
    | { type: "STUDENT_SELECTOR"; collapsed?: boolean }
    | { type: "AMBIGUOUS_STUDENTS"; candidates: PersonalStudentSummary[] }
    | { type: "SECTION_PROMPT"; student: PersonalStudentSummary }
    | { type: "VISAO_GERAL"; student: PersonalStudentSummary }
    | { type: "FOTOS"; student: PersonalStudentSummary }
    | { type: "ANAMNESE"; student: PersonalStudentSummary; initialMode?: "view" | "send" | "create" }
    | { type: "FORMULARIOS"; student: PersonalStudentSummary; initialMode?: "view" | "send" | "create" }
    | { type: "TREINOS"; student: PersonalStudentSummary }
    | { type: "HELP" }
    | { type: "FALLBACK" };
}

// ============================================================================
// MAIN COMPONENT PROPS
// ============================================================================
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
  initialStudentPublicId,
}: GuidedStudentAssistantProps) {
  // Deep-linked Initial Student Resolution
  const initialStudent = useMemo(() => {
    if (!initialStudentPublicId || students.length === 0) return null;
    return students.find((s) => s.membershipPublicId === initialStudentPublicId) || null;
  }, [initialStudentPublicId, students]);

  // State
  const [selectedStudent, setSelectedStudent] = useState<PersonalStudentSummary | null>(() => initialStudent);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const greetingName = professionalName && professionalName.trim() ? professionalName.trim() : null;
    const initialGreeting = greetingName
      ? `Olá, ${greetingName}! Qual aluno você gostaria de ver?`
      : "Olá! Qual aluno você gostaria de ver?";

    if (initialStudent) {
      return [
        {
          id: "msg-initial-greeting",
          sender: "assistant",
          timestamp: new Date(),
          text: initialGreeting,
          widget: { type: "STUDENT_SELECTOR", collapsed: true },
        },
        {
          id: `msg-user-pick-${Date.now()}`,
          sender: "user",
          timestamp: new Date(),
          text: `Quero ver ${initialStudent.name}.`,
        },
        {
          id: `msg-assistant-section-prompt-${Date.now()}`,
          sender: "assistant",
          timestamp: new Date(),
          text: `O que você quer ver de ${initialStudent.name}?`,
          widget: { type: "SECTION_PROMPT", student: initialStudent },
        },
      ];
    }

    return [
      {
        id: "msg-initial-greeting",
        sender: "assistant",
        timestamp: new Date(),
        text: initialGreeting,
        widget: { type: "STUDENT_SELECTOR", collapsed: false },
      },
    ];
  });
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Student Filter & Search within the embedded picker
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerWorkoutFilter, setPickerWorkoutFilter] = useState<"ALL" | "WITH_WORKOUT" | "WITHOUT_WORKOUT">("ALL");
  const [pickerPage, setPickerPage] = useState(1);
  const STUDENTS_PER_PAGE = 5;

  // Student Detail Asynchronously Loaded Cache
  const [detailsCache, setDetailsCache] = useState<Record<string, PersonalStudentDetail>>({});
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const latestRequestIdRef = useRef<number>(0);

  // Photos Lightbox & Comparator State
  const [selectedZoomPhoto, setSelectedZoomPhoto] = useState<{ url: string; pose: string; date: string } | null>(null);
  const [isPhotoComparatorOpen, setIsPhotoComparatorOpen] = useState(false);
  const [compareEvalA, setCompareEvalA] = useState<string>("");
  const [compareEvalB, setCompareEvalB] = useState<string>("");
  const [comparePose, setComparePose] = useState<string>("FRONT");

  // Anamnesis / Forms Send Flow State
  const [availableTemplates, setAvailableTemplates] = useState<AvailableFormTemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isSendingRequest, startTransition] = useTransition();
  const [requestFeedback, setRequestFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Interactive Form Detail Modal
  const [activeFormAnswerDetail, setActiveFormAnswerDetail] = useState<StudentFormAnswer | null>(null);

  // Refs & Smart Scroll
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // User scroll listener: only auto-scroll if near bottom
  const handleScroll = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceToBottom < 160;
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    if (force || isNearBottomRef.current) {
      chatScrollRef.current?.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch Student Detail with race-condition guard
  const fetchStudentDetail = useCallback(
    (membershipPublicId: string) => {
      if (detailsCache[membershipPublicId]) {
        setIsLoadingDetail(false);
        return;
      }
      const currentRequestId = ++latestRequestIdRef.current;
      setIsLoadingDetail(true);

      getPersonalStudentDetailAction(consultancySlug, membershipPublicId)
        .then((res) => {
          if (latestRequestIdRef.current !== currentRequestId) return;
          if (res.success && res.detail) {
            setDetailsCache((prev) => ({ ...prev, [membershipPublicId]: res.detail! }));
          }
          setIsLoadingDetail(false);
        })
        .catch(() => {
          if (latestRequestIdRef.current !== currentRequestId) return;
          setIsLoadingDetail(false);
        });
    },
    [consultancySlug, detailsCache]
  );

  // Handle Student Selection
  const handleSelectStudent = useCallback(
    (student: PersonalStudentSummary) => {
      setSelectedStudent(student);
      fetchStudentDetail(student.membershipPublicId);

      // Collapse the initial student selector so the thread stays compact
      setMessages((prev) => {
        const updated = prev.map((m) => {
          if (m.widget?.type === "STUDENT_SELECTOR") {
            return {
              ...m,
              widget: { type: "STUDENT_SELECTOR" as const, collapsed: true },
            };
          }
          return m;
        });

        return [
          ...updated,
          {
            id: `msg-user-pick-${Date.now()}`,
            sender: "user",
            timestamp: new Date(),
            text: `Quero ver ${student.name}.`,
          },
          {
            id: `msg-assistant-section-prompt-${Date.now()}`,
            sender: "assistant",
            timestamp: new Date(),
            text: `O que você quer ver de ${student.name}?`,
            widget: { type: "SECTION_PROMPT", student },
          },
        ];
      });

      isNearBottomRef.current = true;
      setTimeout(() => scrollToBottom(true), 50);

      // Focus input for next request
      setTimeout(() => textareaRef.current?.focus(), 150);
    },
    [fetchStudentDetail, scrollToBottom]
  );

  // Handle Changing Student (Reset to selection)
  const handleChangeStudent = useCallback(() => {
    setSelectedStudent(null);
    latestRequestIdRef.current++; // cancel pending fetches
    setRequestFeedback(null);

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-user-change-${Date.now()}`,
        sender: "user",
        timestamp: new Date(),
        text: "Trocar de aluno.",
      },
      {
        id: `msg-assistant-new-student-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date(),
        text: "Qual aluno você gostaria de ver agora?",
        widget: { type: "STUDENT_SELECTOR", collapsed: false },
      },
    ]);
  }, []);

  // Prompt Need Student
  const promptNeedStudent = useCallback((userQueryText: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-user-${Date.now()}`,
        sender: "user",
        timestamp: new Date(),
        text: userQueryText,
      },
      {
        id: `msg-assistant-need-student-${Date.now()}`,
        sender: "assistant",
        timestamp: new Date(),
        text: "Primeiro escolha qual aluno você gostaria de ver:",
        widget: { type: "STUDENT_SELECTOR", collapsed: false },
      },
    ]);
  }, []);

  // Fetch initial student details if deep-linked
  useEffect(() => {
    let ignore = false;
    if (initialStudent) {
      const id = initialStudent.membershipPublicId;
      getPersonalStudentDetailAction(consultancySlug, id)
        .then((res) => {
          if (!ignore && res.success && res.detail) {
            setDetailsCache((prev) => ({ ...prev, [id]: res.detail! }));
          }
        })
        .catch(() => {
          // silent fallback
        });
    }
    return () => {
      ignore = true;
    };
  }, [initialStudent, consultancySlug]);

  // Dispatch Intent Execution
  const executeIntent = useCallback(
    (intent: CommandIntent, userQueryText: string) => {
      const timestamp = new Date();

      switch (intent.type) {
        case "CHANGE_STUDENT": {
          handleChangeStudent();
          break;
        }

        case "SELECT_STUDENT": {
          handleSelectStudent(intent.student);
          break;
        }

        case "AMBIGUOUS_STUDENT": {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-user-${Date.now()}`,
              sender: "user",
              timestamp,
              text: userQueryText,
            },
            {
              id: `msg-assistant-ambiguous-${Date.now()}`,
              sender: "assistant",
              timestamp: new Date(),
              text: "Encontrei mais de um aluno com esse nome. Qual deles você gostaria de ver?",
              widget: { type: "AMBIGUOUS_STUDENTS", candidates: intent.candidates },
            },
          ]);
          break;
        }

        case "OVERVIEW": {
          if (!selectedStudent) {
            promptNeedStudent(userQueryText);
            return;
          }
          fetchStudentDetail(selectedStudent.membershipPublicId);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-user-${Date.now()}`,
              sender: "user",
              timestamp,
              text: userQueryText,
            },
            {
              id: `msg-assistant-overview-${Date.now()}`,
              sender: "assistant",
              timestamp: new Date(),
              text: `Aqui estão as informações gerais de ${selectedStudent.name}.`,
              widget: { type: "VISAO_GERAL", student: selectedStudent },
            },
          ]);
          break;
        }

        case "PHOTOS": {
          if (!selectedStudent) {
            promptNeedStudent(userQueryText);
            return;
          }
          fetchStudentDetail(selectedStudent.membershipPublicId);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-user-${Date.now()}`,
              sender: "user",
              timestamp,
              text: userQueryText,
            },
            {
              id: `msg-assistant-photos-${Date.now()}`,
              sender: "assistant",
              timestamp: new Date(),
              text: `Aqui estão os registros fotográficos de ${selectedStudent.name}.`,
              widget: { type: "FOTOS", student: selectedStudent },
            },
          ]);
          break;
        }

        case "ANAMNESIS_VIEW":
        case "ANAMNESIS_SEND":
        case "ANAMNESIS_CREATE": {
          if (!selectedStudent) {
            promptNeedStudent(userQueryText);
            return;
          }
          fetchStudentDetail(selectedStudent.membershipPublicId);
          const initialMode =
            intent.type === "ANAMNESIS_SEND"
              ? "send"
              : intent.type === "ANAMNESIS_CREATE"
              ? "create"
              : "view";

          setMessages((prev) => [
            ...prev,
            {
              id: `msg-user-${Date.now()}`,
              sender: "user",
              timestamp,
              text: userQueryText,
            },
            {
              id: `msg-assistant-anamnese-${Date.now()}`,
              sender: "assistant",
              timestamp: new Date(),
              text:
                initialMode === "send"
                  ? `Preparando envio de anamnese para ${selectedStudent.name}.`
                  : `Aqui estão as informações de anamnese de ${selectedStudent.name}.`,
              widget: { type: "ANAMNESE", student: selectedStudent, initialMode },
            },
          ]);
          break;
        }

        case "FORMS_VIEW":
        case "FORMS_SEND":
        case "FORMS_CREATE": {
          if (!selectedStudent) {
            promptNeedStudent(userQueryText);
            return;
          }
          fetchStudentDetail(selectedStudent.membershipPublicId);
          const initialMode =
            intent.type === "FORMS_SEND"
              ? "send"
              : intent.type === "FORMS_CREATE"
              ? "create"
              : "view";

          setMessages((prev) => [
            ...prev,
            {
              id: `msg-user-${Date.now()}`,
              sender: "user",
              timestamp,
              text: userQueryText,
            },
            {
              id: `msg-assistant-forms-${Date.now()}`,
              sender: "assistant",
              timestamp: new Date(),
              text:
                initialMode === "send"
                  ? `Preparando envio de formulário para ${selectedStudent.name}.`
                  : `Aqui estão os formulários de ${selectedStudent.name}.`,
              widget: { type: "FORMULARIOS", student: selectedStudent, initialMode },
            },
          ]);
          break;
        }

        case "WORKOUTS": {
          if (!selectedStudent) {
            promptNeedStudent(userQueryText);
            return;
          }
          fetchStudentDetail(selectedStudent.membershipPublicId);
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-user-${Date.now()}`,
              sender: "user",
              timestamp,
              text: userQueryText,
            },
            {
              id: `msg-assistant-workouts-${Date.now()}`,
              sender: "assistant",
              timestamp: new Date(),
              text: `Acessando treinos de ${selectedStudent.name}.`,
              widget: { type: "TREINOS", student: selectedStudent },
            },
          ]);
          break;
        }

        case "HELP": {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-user-${Date.now()}`,
              sender: "user",
              timestamp,
              text: userQueryText,
            },
            {
              id: `msg-assistant-help-${Date.now()}`,
              sender: "assistant",
              timestamp: new Date(),
              text: "Posso ajudar com visão geral, fotos, anamnese, formulários ou treinos.",
              widget: { type: "HELP" },
            },
          ]);
          break;
        }

        case "UNKNOWN":
        default: {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-user-${Date.now()}`,
              sender: "user",
              timestamp,
              text: userQueryText,
            },
            {
              id: `msg-assistant-fallback-${Date.now()}`,
              sender: "assistant",
              timestamp: new Date(),
              text: "Posso ajudar com visão geral, fotos, anamnese, formulários ou treinos. Qual você quer abrir?",
              widget: { type: "FALLBACK" },
            },
          ]);
          break;
        }
      }
    },
    [handleChangeStudent, handleSelectStudent, selectedStudent, fetchStudentDetail, promptNeedStudent]
  );

  // Handle Form Submit
  const handleSendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isProcessing) return;

    setIsProcessing(true);
    setInputText("");

    try {
      const intent = detectCommandIntent(trimmed, {
        selectedStudent,
        students,
      });
      executeIntent(intent, trimmed);
      isNearBottomRef.current = true;
      setTimeout(() => scrollToBottom(true), 50);
    } catch {
      // Preserve input text on error
      setInputText(trimmed);
    } finally {
      setIsProcessing(false);
    }
  };

  // Keyboard Submit Handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if ((e.nativeEvent as unknown as { isComposing?: boolean })?.isComposing) {
        return;
      }
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Filtered Students inside embedded picker
  const filteredPickerStudents = useMemo(() => {
    return students.filter((s) => {
      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesEmail = s.email.toLowerCase().includes(q);
        const matchesObjective = s.objective ? s.objective.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesEmail && !matchesObjective) return false;
      }
      if (pickerWorkoutFilter === "WITH_WORKOUT") {
        if (!(s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle)) return false;
      } else if (pickerWorkoutFilter === "WITHOUT_WORKOUT") {
        if (s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle) return false;
      }
      return true;
    });
  }, [students, pickerSearch, pickerWorkoutFilter]);

  // Paginated students
  const totalPickerPages = Math.ceil(filteredPickerStudents.length / STUDENTS_PER_PAGE) || 1;
  const paginatedPickerStudents = useMemo(() => {
    const start = (pickerPage - 1) * STUDENTS_PER_PAGE;
    return filteredPickerStudents.slice(start, start + STUDENTS_PER_PAGE);
  }, [filteredPickerStudents, pickerPage]);

  // Load Form Templates for Send Modal
  const loadFormTemplates = useCallback(async () => {
    if (availableTemplates.length > 0) return;
    try {
      const res = await getAvailableFormTemplatesAction(consultancySlug);
      if (res.success && res.templates) {
        setAvailableTemplates(res.templates);
        if (res.templates.length > 0) {
          setSelectedTemplateId(res.templates[0].publicId);
        }
      }
    } catch {
      // fallback
    }
  }, [availableTemplates.length, consultancySlug]);

  // Actions for Anamnesis / Forms
  const handleSendAnamnesisRequest = (student: PersonalStudentSummary) => {
    startTransition(async () => {
      try {
        const res = await requestStudentAnamnesisAction(consultancySlug, student.membershipPublicId);
        if (res.success) {
          setRequestFeedback({
            type: "success",
            message: `Solicitação de anamnese enviada com sucesso para ${student.name}!`,
          });
          fetchStudentDetail(student.membershipPublicId);
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
  };

  const handleSendCustomFormRequest = (student: PersonalStudentSummary) => {
    if (!selectedTemplateId) return;
    startTransition(async () => {
      try {
        const res = await requestStudentCustomFormAction(
          consultancySlug,
          student.membershipPublicId,
          selectedTemplateId
        );
        if (res.success) {
          setRequestFeedback({
            type: "success",
            message: `Formulário enviado com sucesso para ${student.name}!`,
          });
          fetchStudentDetail(student.membershipPublicId);
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
  };

  const handleSendPhotosRequest = (student: PersonalStudentSummary) => {
    startTransition(async () => {
      try {
        const res = await requestStudentPhotosAction(consultancySlug, student.membershipPublicId);
        if (res.success) {
          setRequestFeedback({
            type: "success",
            message: `Solicitação de fotos enviada com sucesso para ${student.name}!`,
          });
          fetchStudentDetail(student.membershipPublicId);
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
  };

  // Operational Counts
  const withWorkoutCount = useMemo(
    () => students.filter((s) => s.latestAssignmentStatus === "ACTIVE" && !!s.latestWorkoutTitle).length,
    [students]
  );
  const withoutWorkoutCount = useMemo(
    () => students.filter((s) => !s.latestWorkoutTitle || s.latestAssignmentStatus !== "ACTIVE").length,
    [students]
  );

  return (
    <div className="w-full h-full flex flex-col flex-1 min-h-0 bg-[#DDE1E6] dark:bg-[#202226] text-[#17191D] dark:text-[#FFFFFF] overflow-hidden">
      {/* =====================================================================
          FULL-SCREEN CONVERSATIONAL WORKSPACE (Alunos)
          ===================================================================== */}
      <section
        aria-label="Alunos"
        className="w-full h-full flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        {/* COMPACT TOP HEADER */}
        <header className="px-4 sm:px-6 lg:px-8 py-3.5 border-b border-[#C5CBD3] dark:border-[#282A30] bg-[#ECEFF2] dark:bg-[#0B0C0E] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-[#1B1D21] border border-[#C5CBD3] dark:border-white/10 flex items-center justify-center text-[#065F46] dark:text-emerald-400 shrink-0 shadow-xs">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white tracking-tight truncate">
                Alunos
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedStudent && (
              <div className="flex items-center gap-2 bg-white dark:bg-[#1B1D21] border border-[#C5CBD3] dark:border-white/10 rounded-xl px-2.5 py-1 text-xs text-[#17191D] dark:text-white shadow-xs">
                <StudentAvatar name={selectedStudent.name} userPublicId={selectedStudent.userPublicId} size="xs" />
                <span className="font-semibold truncate max-w-[110px] sm:max-w-[160px]">{selectedStudent.name}</span>
                <button
                  type="button"
                  onClick={handleChangeStudent}
                  className="text-[11px] font-bold text-[#065F46] dark:text-emerald-400 hover:underline ml-1 cursor-pointer"
                  title="Trocar aluno ativo"
                >
                  Trocar aluno
                </button>
              </div>
            )}

            <Link
              href={`/consultoria/${consultancySlug}`}
              className="p-2 rounded-xl text-[#4B5563] dark:text-[#9CA3AF] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06] border border-[#C5CBD3] dark:border-white/10 transition-colors cursor-pointer"
              title="Voltar ao painel"
              aria-label="Voltar ao painel"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* SCROLLABLE MESSAGE THREAD */}
        <div
          ref={chatScrollRef}
          onScroll={handleScroll}
          className="w-full flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 scroll-smooth"
        >
          <div className="max-w-3xl lg:max-w-4xl mx-auto w-full space-y-5">
            {messages.map((msg) => {
              const isAssistant = msg.sender === "assistant";

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 w-full animate-in fade-in duration-150 ${
                    isAssistant ? "justify-start" : "justify-end"
                  }`}
                >
                  {isAssistant && (
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#0B0C0E] border border-[#C5CBD3] dark:border-white/10 flex items-center justify-center text-[#065F46] dark:text-emerald-400 shrink-0 mt-0.5 shadow-xs">
                      <SparklesBubbleIcon className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`${
                      isAssistant
                        ? "flex-1 rounded-2xl bg-white dark:bg-[#1B1D21] border border-[#C5CBD3] dark:border-white/10 p-4 sm:p-5 space-y-3.5 text-[#17191D] dark:text-white shadow-xs"
                        : "rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 sm:p-4 text-emerald-950 dark:text-white max-w-[85%] sm:max-w-[75%] shadow-xs ml-auto"
                    }`}
                  >
                    {msg.text && (
                      <p
                        className={`text-xs sm:text-sm leading-relaxed font-sans ${
                          isAssistant
                            ? "text-[#17191D] dark:text-white font-medium"
                            : "text-emerald-950 dark:text-white font-semibold"
                        }`}
                      >
                        {msg.text}
                      </p>
                    )}

                    {/* WIDGET: STUDENT SELECTOR EMBEDDED IN CHAT */}
                    {msg.widget?.type === "STUDENT_SELECTOR" && (
                      <div className="pt-2 border-t border-[#C5CBD3] dark:border-white/10 space-y-3">
                        {msg.widget.collapsed && selectedStudent ? (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-[#0B0C0E] border border-[#C5CBD3] dark:border-white/10 text-xs text-[#17191D] dark:text-white">
                            <div className="flex items-center gap-2 min-w-0">
                              <CheckCircleIcon className="w-4 h-4 text-[#065F46] dark:text-emerald-400 shrink-0" />
                              <span className="text-[#4B5563] dark:text-[#9CA3AF]">Aluno selecionado:</span>
                              <span className="font-bold text-[#17191D] dark:text-white truncate">{selectedStudent.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleChangeStudent}
                              className="text-xs font-bold text-[#065F46] dark:text-emerald-400 hover:underline cursor-pointer shrink-0 ml-2"
                            >
                              Trocar aluno
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Search and Filters inside chat */}
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                                  <SearchIcon className="w-3.5 h-3.5" />
                                </div>
                                <input
                                  type="text"
                                  value={pickerSearch}
                                  onChange={(e) => {
                                    setPickerSearch(e.target.value);
                                    setPickerPage(1);
                                  }}
                                  placeholder="Buscar por nome ou e-mail..."
                                  aria-label="Buscar aluno na lista"
                                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-white/10 bg-[#0B0C0E] text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-[40px]"
                                />
                              </div>

                              <div className="flex items-center gap-1 shrink-0 overflow-x-auto pb-1 sm:pb-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPickerWorkoutFilter("ALL");
                                    setPickerPage(1);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer min-h-[36px] ${
                                    pickerWorkoutFilter === "ALL"
                                      ? "bg-emerald-500 text-zinc-950 font-bold"
                                      : "bg-[#0B0C0E] text-[#CBDDD3] border border-white/10 hover:border-white/20"
                                  }`}
                                >
                                  Todos ({students.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPickerWorkoutFilter("WITH_WORKOUT");
                                    setPickerPage(1);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer min-h-[36px] ${
                                    pickerWorkoutFilter === "WITH_WORKOUT"
                                      ? "bg-emerald-500 text-zinc-950 font-bold"
                                      : "bg-[#0B0C0E] text-[#CBDDD3] border border-white/10 hover:border-white/20"
                                  }`}
                                >
                                  Com treino ({withWorkoutCount})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPickerWorkoutFilter("WITHOUT_WORKOUT");
                                    setPickerPage(1);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer min-h-[36px] ${
                                    pickerWorkoutFilter === "WITHOUT_WORKOUT"
                                      ? "bg-emerald-500 text-zinc-950 font-bold"
                                      : "bg-[#0B0C0E] text-[#CBDDD3] border border-white/10 hover:border-white/20"
                                  }`}
                                >
                                  Sem treino ({withoutWorkoutCount})
                                </button>
                              </div>
                            </div>

                            {/* Compact Student List (5 items per page) */}
                            {filteredPickerStudents.length === 0 ? (
                              <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-center text-xs text-[#9CA3AF]">
                                Nenhum aluno encontrado para &quot;{pickerSearch}&quot;.
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {paginatedPickerStudents.map((st) => {
                                  const hasWorkout =
                                    st.latestAssignmentStatus === "ACTIVE" && !!st.latestWorkoutTitle;

                                  return (
                                    <button
                                      key={st.membershipPublicId}
                                      type="button"
                                      onClick={() => handleSelectStudent(st)}
                                      className="w-full p-2.5 rounded-xl border border-white/10 bg-[#0B0C0E] hover:bg-[#23262C] hover:border-emerald-500/40 transition-all text-left flex items-center justify-between gap-3 min-h-[48px] cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <StudentAvatar
                                          name={st.name}
                                          userPublicId={st.userPublicId}
                                          size="sm"
                                          hasActiveWorkout={hasWorkout}
                                        />
                                        <div className="min-w-0">
                                          <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                                            {st.name}
                                          </div>
                                          <div className="text-[11px] text-[#9CA3AF] truncate">
                                            {st.email}
                                            {hasWorkout ? (
                                              <span className="text-emerald-400 font-medium ml-1.5">
                                                · {st.latestWorkoutTitle}
                                              </span>
                                            ) : (
                                              <span className="text-amber-400 font-medium ml-1.5">
                                                · Sem treino
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <ChevronRightIcon className="w-4 h-4 text-[#9CA3AF] group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                                    </button>
                                  );
                                })}

                                {/* Pagination Controls */}
                                {totalPickerPages > 1 && (
                                  <div className="flex items-center justify-between pt-2 text-[11px] text-[#9CA3AF]">
                                    <span>
                                      Página {pickerPage} de {totalPickerPages} ({filteredPickerStudents.length} alunos)
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={pickerPage <= 1}
                                        onClick={() => setPickerPage((p) => Math.max(1, p - 1))}
                                        className="px-2.5 py-1 rounded-lg bg-[#0B0C0E] border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 cursor-pointer"
                                      >
                                        Anterior
                                      </button>
                                      <button
                                        type="button"
                                        disabled={pickerPage >= totalPickerPages}
                                        onClick={() => setPickerPage((p) => Math.min(totalPickerPages, p + 1))}
                                        className="px-2.5 py-1 rounded-lg bg-[#0B0C0E] border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/10 cursor-pointer"
                                      >
                                        Próxima
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* WIDGET: AMBIGUOUS STUDENTS CANDIDATES */}
                    {msg.widget?.type === "AMBIGUOUS_STUDENTS" && (
                      <div className="pt-2 border-t border-white/10 space-y-1.5">
                        {msg.widget.candidates.map((cand) => (
                          <button
                            key={cand.membershipPublicId}
                            type="button"
                            onClick={() => handleSelectStudent(cand)}
                            className="w-full p-2.5 rounded-xl border border-white/10 bg-[#0B0C0E] hover:bg-[#23262C] hover:border-emerald-500/40 transition-all text-left flex items-center justify-between gap-3 min-h-[44px] cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <StudentAvatar name={cand.name} userPublicId={cand.userPublicId} size="sm" />
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-white block truncate">{cand.name}</span>
                                <span className="text-[11px] text-[#9CA3AF] block truncate">{cand.email}</span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-emerald-400 shrink-0">Selecionar</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* WIDGET: SECTION PROMPT SUGGESTIONS */}
                    {msg.widget?.type === "SECTION_PROMPT" && (
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider block">
                          Atalhos de navegação:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: "Visão Geral", icon: LayoutGridIcon, action: "Visão Geral" },
                            { label: "Fotos", icon: PhotoIcon, action: "Fotos" },
                            { label: "Anamnese", icon: ClipboardCheckIcon, action: "Anamnese" },
                            { label: "Formulários", icon: FileTextIcon, action: "Formulários" },
                            { label: "Treinos", icon: DumbbellIcon, action: "Treinos" },
                          ].map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                  executeIntent(
                                    detectCommandIntent(item.action, {
                                      selectedStudent,
                                      students,
                                    }),
                                    item.action
                                  );
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#0B0C0E] border border-white/10 hover:border-emerald-500/50 hover:bg-[#23262C] transition-all cursor-pointer min-h-[38px]"
                              >
                                <Icon className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* WIDGET: VISAO GERAL ACCORDION (7 DETERMINISTIC BLOCKS) */}
                    {msg.widget && msg.widget.type === "VISAO_GERAL" && (
                      <VisaoGeralWidget
                        student={msg.widget.student}
                        consultancySlug={consultancySlug}
                        detail={detailsCache[msg.widget.student.membershipPublicId]}
                        isLoading={isLoadingDetail}
                      />
                    )}

                    {/* WIDGET: FOTOS GALLERY & COMPARATOR */}
                    {msg.widget && msg.widget.type === "FOTOS" && (
                      <FotosWidget
                        student={msg.widget.student}
                        consultancySlug={consultancySlug}
                        detail={detailsCache[msg.widget.student.membershipPublicId]}
                        isLoading={isLoadingDetail}
                        onZoom={(photo) => setSelectedZoomPhoto(photo)}
                        onOpenComparator={() => {
                          if (msg.widget && msg.widget.type === "FOTOS") {
                            const evals = detailsCache[msg.widget.student.membershipPublicId]?.photos || [];
                            if (evals.length >= 2) {
                              setCompareEvalA(evals[evals.length - 1].requestPublicId);
                              setCompareEvalB(evals[0].requestPublicId);
                            }
                            setIsPhotoComparatorOpen(true);
                          }
                        }}
                        onRequestPhotos={() => {
                          if (msg.widget && msg.widget.type === "FOTOS") {
                            handleSendPhotosRequest(msg.widget.student);
                          }
                        }}
                        isSending={isSendingRequest}
                      />
                    )}

                    {/* WIDGET: ANAMNESE */}
                    {msg.widget && msg.widget.type === "ANAMNESE" && (
                      <AnamneseWidget
                        student={msg.widget.student}
                        consultancySlug={consultancySlug}
                        detail={detailsCache[msg.widget.student.membershipPublicId]}
                        isLoading={isLoadingDetail}
                        initialMode={msg.widget.initialMode}
                        onSendAnamnesis={() => {
                          if (msg.widget && msg.widget.type === "ANAMNESE") {
                            handleSendAnamnesisRequest(msg.widget.student);
                          }
                        }}
                        isSending={isSendingRequest}
                        feedback={requestFeedback}
                      />
                    )}

                    {/* WIDGET: FORMULARIOS */}
                    {msg.widget && msg.widget.type === "FORMULARIOS" && (
                      <FormulariosWidget
                        student={msg.widget.student}
                        consultancySlug={consultancySlug}
                        detail={detailsCache[msg.widget.student.membershipPublicId]}
                        isLoading={isLoadingDetail}
                        initialMode={msg.widget.initialMode}
                        availableTemplates={availableTemplates}
                        selectedTemplateId={selectedTemplateId}
                        onSelectTemplateId={setSelectedTemplateId}
                        onLoadTemplates={loadFormTemplates}
                        onSendForm={() => {
                          if (msg.widget && msg.widget.type === "FORMULARIOS") {
                            handleSendCustomFormRequest(msg.widget.student);
                          }
                        }}
                        onOpenFormDetail={(form) => setActiveFormAnswerDetail(form)}
                        isSending={isSendingRequest}
                        feedback={requestFeedback}
                      />
                    )}

                    {/* WIDGET: TREINOS */}
                    {msg.widget && msg.widget.type === "TREINOS" && (
                      <TreinosWidget
                        student={msg.widget.student}
                        consultancySlug={consultancySlug}
                        detail={detailsCache[msg.widget.student.membershipPublicId]}
                        isLoading={isLoadingDetail}
                      />
                    )}

                    {/* WIDGET: FALLBACK / HELP */}
                    {(msg.widget?.type === "FALLBACK" || msg.widget?.type === "HELP") && (
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider block">
                          Comandos suportados:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            "Visão Geral",
                            "Ver fotos",
                            "Anamnese",
                            "Formulários",
                            "Treinos",
                            "Trocar de aluno",
                          ].map((cmd) => (
                            <button
                              key={cmd}
                              type="button"
                              onClick={() => {
                                executeIntent(
                                  detectCommandIntent(cmd, {
                                    selectedStudent,
                                    students,
                                  }),
                                  cmd
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0B0C0E] border border-white/10 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                            >
                              {cmd}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} className="h-6" />
          </div>
        </div>

        {/* =====================================================================
            PINNED BOTTOM INPUT BAR (TEXTFIELD + SEND BUTTON)
            ===================================================================== */}
        <footer className="px-4 sm:px-6 lg:px-8 py-3 border-t border-[#C5CBD3] dark:border-[#282A30] bg-[#ECEFF2] dark:bg-[#0B0C0E] shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="max-w-3xl lg:max-w-4xl mx-auto flex items-end gap-2.5">
            <div className="relative flex-1 rounded-2xl bg-white dark:bg-[#151619] border border-[#C5CBD3] dark:border-white/10 focus-within:border-emerald-600 dark:focus-within:border-emerald-500 shadow-xs transition-colors px-3 py-2 flex items-center">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  selectedStudent
                    ? "O que você quer consultar?"
                    : "Digite o nome do aluno…"
                }
                aria-label="Mensagem para o assistente"
                className="w-full bg-transparent text-[#17191D] dark:text-white placeholder-[#6B7280] dark:placeholder-zinc-400 text-xs sm:text-sm resize-none focus:outline-none min-h-[32px] max-h-[120px] font-sans leading-normal"
              />
            </div>

            <button
              type="button"
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isProcessing}
              aria-label="Enviar mensagem"
              className="w-11 h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shrink-0 cursor-pointer"
            >
              <SendPlaneIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="hidden sm:block max-w-3xl lg:max-w-4xl mx-auto text-center pt-1.5 text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
            <span>Pressione <strong>Enter</strong> para enviar · <strong>Shift + Enter</strong> para quebra de linha</span>
          </div>
        </footer>
      </section>

      {/* =====================================================================
          MODAL: PHOTO LIGHTBOX ZOOM
          ===================================================================== */}
      {selectedZoomPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedZoomPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#151619] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-[#0B0C0E]">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <span className="text-emerald-400">{selectedZoomPhoto.pose}</span>
                <span className="text-zinc-500">·</span>
                <span>{selectedZoomPhoto.date}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedZoomPhoto(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Fechar ampliação"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/50 overflow-auto">
              <img
                src={selectedZoomPhoto.url}
                alt=""
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: SIDE-BY-SIDE PHOTO COMPARATOR
          ===================================================================== */}
      {isPhotoComparatorOpen && selectedStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-5xl max-h-[95vh] bg-[#151619] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-white">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0B0C0E]">
              <div>
                <h3 className="text-sm font-bold text-white">Comparador de Fotos · Antes e Depois</h3>
                <p className="text-xs text-zinc-400">Comparação lado a lado de {selectedStudent.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPhotoComparatorOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Fechar comparador"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {/* Comparator Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Foto A (Anterior)
                  </label>
                  <select
                    value={compareEvalA}
                    onChange={(e) => setCompareEvalA(e.target.value)}
                    className="w-full bg-[#151619] border border-white/10 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    {(detailsCache[selectedStudent.membershipPublicId]?.photos || []).map((ev) => (
                      <option key={ev.requestPublicId} value={ev.requestPublicId}>
                        {formatDisplayDate(ev.submittedAt)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Foto B (Recente)
                  </label>
                  <select
                    value={compareEvalB}
                    onChange={(e) => setCompareEvalB(e.target.value)}
                    className="w-full bg-[#151619] border border-white/10 rounded-lg p-2 text-white text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    {(detailsCache[selectedStudent.membershipPublicId]?.photos || []).map((ev) => (
                      <option key={ev.requestPublicId} value={ev.requestPublicId}>
                        {formatDisplayDate(ev.submittedAt)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Posição
                  </label>
                  <div className="flex gap-1">
                    {[
                      { id: "FRONT", label: "Frente" },
                      { id: "BACK", label: "Costas" },
                      { id: "SIDE_RIGHT", label: "Lat. D" },
                      { id: "SIDE_LEFT", label: "Lat. E" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setComparePose(p.id)}
                        className={`flex-1 py-2 rounded-lg font-bold text-[11px] transition-colors ${
                          comparePose === p.id
                            ? "bg-emerald-500 text-zinc-950"
                            : "bg-[#151619] text-zinc-300 border border-white/10"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Side-by-Side Images */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-[#0B0C0E] border border-white/10 flex flex-col items-center">
                  <span className="text-xs font-bold text-zinc-300 mb-2">Registro Anterior</span>
                  {compareEvalA ? (
                    <img
                      src={`/api/consultancies/${consultancySlug}/photo-evaluations/${compareEvalA}/images/${comparePose}`}
                      alt=""
                      className="max-h-[50vh] w-auto object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-60 flex items-center justify-center text-xs text-zinc-500">Selecione uma avaliação</div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#0B0C0E] border border-white/10 flex flex-col items-center">
                  <span className="text-xs font-bold text-emerald-400 mb-2">Registro Recente</span>
                  {compareEvalB ? (
                    <img
                      src={`/api/consultancies/${consultancySlug}/photo-evaluations/${compareEvalB}/images/${comparePose}`}
                      alt=""
                      className="max-h-[50vh] w-auto object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-60 flex items-center justify-center text-xs text-zinc-500">Selecione uma avaliação</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: FORM ANSWER Q&A DETAIL
          ===================================================================== */}
      {activeFormAnswerDetail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#151619] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-white">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0B0C0E]">
              <div>
                <h3 className="text-sm font-bold text-white">{activeFormAnswerDetail.title}</h3>
                <p className="text-xs text-zinc-400">
                  Respondido em {formatDisplayDate(activeFormAnswerDetail.submittedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveFormAnswerDetail(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
                aria-label="Fechar respostas do formulário"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {activeFormAnswerDetail.questions.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-1">
                  <div className="text-xs font-semibold text-emerald-400">{item.question}</div>
                  <div className="text-xs text-white whitespace-pre-wrap">{item.answer || "—"}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WIDGET COMPONENTS EMBEDDED INSIDE CHAT RESPONSES
// ============================================================================

// 1. VISAO GERAL WIDGET (7 Expandable Deterministic Blocks)
function VisaoGeralWidget({
  student,
  consultancySlug,
  detail,
  isLoading,
}: {
  student: PersonalStudentSummary;
  consultancySlug: string;
  detail?: PersonalStudentDetail;
  isLoading?: boolean;
}) {
  const [expandedBlock, setExpandedBlock] = useState<string | null>("cadastro");

  if (isLoading && !detail) {
    return (
      <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs text-zinc-400 flex items-center gap-2">
        <RefreshIcon className="w-4 h-4 animate-spin text-emerald-400" />
        <span>Carregando dados de {student.name}...</span>
      </div>
    );
  }

  const toggle = (b: string) => setExpandedBlock((curr) => (curr === b ? null : b));

  return (
    <div className="space-y-2.5 pt-1">
      {/* Block 1: Cadastro e Contato */}
      <div className="rounded-xl border border-white/10 bg-[#0B0C0E] overflow-hidden">
        <button
          type="button"
          onClick={() => toggle("cadastro")}
          className="w-full p-3 text-left font-bold text-xs text-white flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Cadastro e Contato
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              expandedBlock === "cadastro" ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedBlock === "cadastro" && (
          <div className="p-3 border-t border-white/10 text-xs space-y-1.5 text-zinc-300">
            <div><strong>Nome:</strong> {student.name}</div>
            <div><strong>E-mail:</strong> {student.email}</div>
            <div><strong>Telefone:</strong> {detail?.student.phone || "Não informado"}</div>
            <div><strong>Data de Ingresso:</strong> {formatDisplayDate(student.joinedAt)}</div>
            <div><strong>Situação:</strong> {detail?.student.status || "Ativo"}</div>
          </div>
        )}
      </div>

      {/* Block 2: Objetivos Registrados */}
      <div className="rounded-xl border border-white/10 bg-[#0B0C0E] overflow-hidden">
        <button
          type="button"
          onClick={() => toggle("objetivos")}
          className="w-full p-3 text-left font-bold text-xs text-white flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Objetivos Registrados
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              expandedBlock === "objetivos" ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedBlock === "objetivos" && (
          <div className="p-3 border-t border-white/10 text-xs space-y-1.5 text-zinc-300">
            <div>
              <strong>Objetivo Principal:</strong>{" "}
              {detail?.overview.objective || student.objective || "Nenhum objetivo registrado"}
            </div>
          </div>
        )}
      </div>

      {/* Block 3: Acompanhamento e Avaliações */}
      <div className="rounded-xl border border-white/10 bg-[#0B0C0E] overflow-hidden">
        <button
          type="button"
          onClick={() => toggle("avaliacoes")}
          className="w-full p-3 text-left font-bold text-xs text-white flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Acompanhamento e Avaliações
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              expandedBlock === "avaliacoes" ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedBlock === "avaliacoes" && (
          <div className="p-3 border-t border-white/10 text-xs space-y-1.5 text-zinc-300">
            <div>
              <strong>Total de avaliações fotográficas:</strong>{" "}
              {detail?.photos.length || 0}
            </div>
            <div>
              <strong>Última avaliação realizada:</strong>{" "}
              {detail?.photos[0]?.submittedAt
                ? formatDisplayDate(detail.photos[0].submittedAt)
                : "Nenhuma avaliação fotográfica concluída"}
            </div>
          </div>
        )}
      </div>

      {/* Block 4: Medidas e Evolução Registradas */}
      <div className="rounded-xl border border-white/10 bg-[#0B0C0E] overflow-hidden">
        <button
          type="button"
          onClick={() => toggle("medidas")}
          className="w-full p-3 text-left font-bold text-xs text-white flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Medidas e Evolução Registradas
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              expandedBlock === "medidas" ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedBlock === "medidas" && (
          <div className="p-3 border-t border-white/10 text-xs space-y-1.5 text-zinc-300">
            <div><strong>Peso Registrado:</strong> {detail?.overview.weightKg ? `${detail.overview.weightKg} kg` : "Não registrado"}</div>
            <div><strong>Altura:</strong> {detail?.overview.heightCm ? `${detail.overview.heightCm} cm` : "Não registrada"}</div>
            <div><strong>Data do Último Peso:</strong> {formatDisplayDate(detail?.overview.lastWeightRecordedOn)}</div>
          </div>
        )}
      </div>

      {/* Block 5: Situação dos Treinos */}
      <div className="rounded-xl border border-white/10 bg-[#0B0C0E] overflow-hidden">
        <button
          type="button"
          onClick={() => toggle("treinos")}
          className="w-full p-3 text-left font-bold text-xs text-white flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Situação dos Treinos
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              expandedBlock === "treinos" ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedBlock === "treinos" && (
          <div className="p-3 border-t border-white/10 text-xs space-y-1.5 text-zinc-300">
            <div><strong>Treino Ativo:</strong> {student.latestWorkoutTitle || "Sem treino ativo"}</div>
            <div><strong>Status da Prescrição:</strong> {student.latestAssignmentStatus || "Sem ficha"}</div>
            <div><strong>Total de Treinos Concluídos:</strong> {detail?.overview.completedWorkoutsCount || 0}</div>
          </div>
        )}
      </div>

      {/* Block 6: Anamneses e Formulários */}
      <div className="rounded-xl border border-white/10 bg-[#0B0C0E] overflow-hidden">
        <button
          type="button"
          onClick={() => toggle("anamnese")}
          className="w-full p-3 text-left font-bold text-xs text-white flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Anamneses e Formulários
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-zinc-400 transition-transform ${
              expandedBlock === "anamnese" ? "rotate-180" : ""
            }`}
          />
        </button>
        {expandedBlock === "anamnese" && (
          <div className="p-3 border-t border-white/10 text-xs space-y-1.5 text-zinc-300">
            <div>
              <strong>Anamnese:</strong>{" "}
              {detail?.overview.hasAnamnesis
                ? "Anamnese respondida e vinculada"
                : "Nenhuma anamnese respondida"}
            </div>
            <div>
              <strong>Formulários Respondidos:</strong> {detail?.forms.length || 0}
            </div>
          </div>
        )}
      </div>

      {/* Prontuário Link */}
      <div className="pt-2">
        <Link
          href={`/consultoria/${consultancySlug}/planos-v2/prontuario/${student.membershipPublicId}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer"
        >
          <span>Abrir prontuário completo de {student.name}</span>
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// 2. FOTOS WIDGET (Gallery & Comparator)
function FotosWidget({
  student,
  consultancySlug,
  detail,
  isLoading,
  onZoom,
  onOpenComparator,
  onRequestPhotos,
  isSending,
}: {
  student: PersonalStudentSummary;
  consultancySlug: string;
  detail?: PersonalStudentDetail;
  isLoading?: boolean;
  onZoom: (photo: { url: string; pose: string; date: string }) => void;
  onOpenComparator: () => void;
  onRequestPhotos: () => void;
  isSending?: boolean;
}) {
  if (isLoading && !detail) {
    return (
      <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs text-zinc-400 flex items-center gap-2">
        <RefreshIcon className="w-4 h-4 animate-spin text-emerald-400" />
        <span>Carregando registros fotográficos de {student.name}...</span>
      </div>
    );
  }

  const evals = detail?.photos || [];

  if (evals.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-center space-y-3">
        <p className="text-xs text-zinc-400">
          Nenhuma foto cadastrada.
        </p>
        <button
          type="button"
          onClick={onRequestPhotos}
          disabled={isSending}
          className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer disabled:opacity-50"
        >
          {isSending ? "Solicitando..." : "Solicitar envio de fotos"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1">
      {/* Comparator Bar */}
      {evals.length >= 2 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0C0E] border border-white/10">
          <span className="text-xs text-zinc-300">
            {evals.length} avaliações fotográficas registradas
          </span>
          <button
            type="button"
            onClick={onOpenComparator}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer"
          >
            Comparar Antes e Depois
          </button>
        </div>
      )}

      {/* Evaluations Timeline */}
      <div className="space-y-3">
        {evals.map((ev) => {
          const dateStr = formatDisplayDate(ev.submittedAt);

          return (
            <div key={ev.requestPublicId} className="p-3.5 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="text-emerald-400">Fotos de {student.name} · {dateStr}</span>
                <span className="text-zinc-500 text-[11px]">4 fotos</span>
              </div>

              {/* 4 Poses */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { pose: "FRONT", label: "Frontal" },
                  { pose: "BACK", label: "Costas" },
                  { pose: "SIDE_RIGHT", label: "Lateral D" },
                  { pose: "SIDE_LEFT", label: "Lateral E" },
                ].map((p) => {
                  const url = `/api/consultancies/${consultancySlug}/photo-evaluations/${ev.requestPublicId}/images/${p.pose}`;

                  return (
                    <div
                      key={p.pose}
                      onClick={() => onZoom({ url, pose: p.label, date: dateStr })}
                      className="group relative aspect-[3/4] bg-[#151619] rounded-lg border border-white/10 overflow-hidden cursor-pointer hover:border-emerald-500/50 transition-all flex flex-col items-center justify-center"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 inset-x-1 px-1 py-0.5 rounded bg-black/70 text-[10px] font-bold text-white text-center truncate">
                        {p.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 3. ANAMNESE WIDGET
function AnamneseWidget({
  student,
  consultancySlug,
  detail,
  isLoading,
  initialMode = "view",
  onSendAnamnesis,
  isSending,
  feedback,
}: {
  student: PersonalStudentSummary;
  consultancySlug: string;
  detail?: PersonalStudentDetail;
  isLoading?: boolean;
  initialMode?: "view" | "send" | "create";
  onSendAnamnesis: () => void;
  isSending?: boolean;
  feedback?: { type: "success" | "error"; message: string } | null;
}) {
  const [tab, setTab] = useState<"view" | "send" | "create">(initialMode);
  const [confirmedSend, setConfirmedSend] = useState(false);

  if (isLoading && !detail) {
    return (
      <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs text-zinc-400 flex items-center gap-2">
        <RefreshIcon className="w-4 h-4 animate-spin text-emerald-400" />
        <span>Carregando anamnese de {student.name}...</span>
      </div>
    );
  }

  const anamnesis = detail?.anamnesis;

  return (
    <div className="space-y-3 pt-1">
      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs">
        <button
          type="button"
          onClick={() => setTab("view")}
          className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-colors cursor-pointer ${
            tab === "view" ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
          }`}
        >
          Respostas
        </button>
        <button
          type="button"
          onClick={() => setTab("send")}
          className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-colors cursor-pointer ${
            tab === "send" ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
          }`}
        >
          Enviar Anamnese
        </button>
        <button
          type="button"
          onClick={() => setTab("create")}
          className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-colors cursor-pointer ${
            tab === "create" ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
          }`}
        >
          Criar Modelo
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* VIEW RESPONSES */}
      {tab === "view" && (
        <div className="space-y-3">
          {anamnesis && anamnesis.length > 0 ? (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-emerald-400">
                {(() => {
                  const intakeForm = detail?.forms?.find((f) => f.formType === "INTAKE");
                  return intakeForm?.submittedAt
                    ? `Anamnese respondida em ${formatDisplayDate(intakeForm.submittedAt)}.`
                    : "Anamnese respondida.";
                })()}
              </div>
              {anamnesis.map((sec, sIdx) => (
                <div key={sIdx} className="p-3.5 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-2">
                  <div className="text-xs font-bold text-emerald-400">{sec.title}</div>
                  <div className="text-xs text-zinc-300 space-y-1 pt-1">
                    {sec.items.map((it, iIdx) => (
                      <div key={iIdx}>
                        <strong>{it.label}:</strong> {it.value || "—"}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-center space-y-2 text-xs text-zinc-400">
              <p>Este aluno ainda não respondeu à anamnese.</p>
              <button
                type="button"
                onClick={() => setTab("send")}
                className="text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Enviar solicitação de anamnese
              </button>
            </div>
          )}
        </div>
      )}

      {/* SEND ANAMNESIS */}
      {tab === "send" && (
        <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-3 text-xs">
          <div className="font-bold text-white">Confirmar envio de anamnese:</div>
          <div className="p-2.5 rounded-lg bg-[#151619] border border-white/10 space-y-1 text-zinc-300">
            <div><strong>Modelo:</strong> Anamnese Geral Padrão V1 (Trevo One)</div>
            <div><strong>Destinatário:</strong> {student.name} ({student.email})</div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={confirmedSend}
              onChange={(e) => setConfirmedSend(e.target.checked)}
              className="rounded border-white/20 bg-[#151619] text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-zinc-300">Confirmo o envio para este aluno</span>
          </label>

          <button
            type="button"
            onClick={onSendAnamnesis}
            disabled={!confirmedSend || isSending}
            className="w-full py-2.5 rounded-xl font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSending ? "Enviando solicitação..." : "Enviar Solicitação de Anamnese"}
          </button>
        </div>
      )}

      {/* CREATE MODEL */}
      {tab === "create" && (
        <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-center space-y-3 text-xs">
          <p className="text-zinc-300">
            Crie novos modelos personalizados no construtor oficial de formulários da consultoria.
          </p>
          <Link
            href={`/consultoria/${consultancySlug}/formularios`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer"
          >
            <span>Abrir construtor de formulários</span>
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

// 4. FORMULARIOS WIDGET
function FormulariosWidget({
  student,
  consultancySlug,
  detail,
  isLoading,
  initialMode = "view",
  availableTemplates,
  selectedTemplateId,
  onSelectTemplateId,
  onLoadTemplates,
  onSendForm,
  onOpenFormDetail,
  isSending,
  feedback,
}: {
  student: PersonalStudentSummary;
  consultancySlug: string;
  detail?: PersonalStudentDetail;
  isLoading?: boolean;
  initialMode?: "view" | "send" | "create";
  availableTemplates: AvailableFormTemplateOption[];
  selectedTemplateId: string;
  onSelectTemplateId: (id: string) => void;
  onLoadTemplates: () => void;
  onSendForm: () => void;
  onOpenFormDetail: (f: StudentFormAnswer) => void;
  isSending?: boolean;
  feedback?: { type: "success" | "error"; message: string } | null;
}) {
  const [tab, setTab] = useState<"view" | "send" | "create">(initialMode);
  const [confirmedSend, setConfirmedSend] = useState(false);

  useEffect(() => {
    if (tab === "send") {
      onLoadTemplates();
    }
  }, [tab, onLoadTemplates]);

  if (isLoading && !detail) {
    return (
      <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs text-zinc-400 flex items-center gap-2">
        <RefreshIcon className="w-4 h-4 animate-spin text-emerald-400" />
        <span>Carregando formulários de {student.name}...</span>
      </div>
    );
  }

  const forms = detail?.forms || [];

  return (
    <div className="space-y-3 pt-1">
      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs">
        <button
          type="button"
          onClick={() => setTab("view")}
          className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-colors cursor-pointer ${
            tab === "view" ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
          }`}
        >
          Respondidos ({forms.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("send")}
          className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-colors cursor-pointer ${
            tab === "send" ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
          }`}
        >
          Enviar Formulário
        </button>
        <button
          type="button"
          onClick={() => setTab("create")}
          className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-colors cursor-pointer ${
            tab === "create" ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-white"
          }`}
        >
          Novo Modelo
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* VIEW FORMS */}
      {tab === "view" && (
        <div className="space-y-2">
          {forms.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-center space-y-2 text-xs text-zinc-400">
              <p>Este aluno ainda não possui formulários respondidos.</p>
              <button
                type="button"
                onClick={() => setTab("send")}
                className="text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Enviar formulário
              </button>
            </div>
          ) : (
            forms.map((f) => (
              <div
                key={f.publicId}
                className="p-3 rounded-xl bg-[#0B0C0E] border border-white/10 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-white">{f.title}</div>
                  <div className="text-[11px] text-zinc-400">
                    Respondido em {formatDisplayDate(f.submittedAt)} · {f.questions.length} perguntas
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenFormDetail(f)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#151619] border border-white/10 text-emerald-400 hover:text-white font-bold text-xs cursor-pointer"
                >
                  Ver respostas
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* SEND FORM */}
      {tab === "send" && (
        <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-3 text-xs">
          <div className="font-bold text-white">Escolha o formulário que deseja enviar:</div>

          {availableTemplates.length === 0 ? (
            <p className="text-zinc-400">Carregando modelos disponíveis...</p>
          ) : (
            <div className="space-y-1.5">
              {availableTemplates.map((tpl) => (
                <label
                  key={tpl.publicId}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedTemplateId === tpl.publicId
                      ? "bg-emerald-500/10 border-emerald-500/40 text-white"
                      : "bg-[#151619] border-white/10 text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="formTemplate"
                      checked={selectedTemplateId === tpl.publicId}
                      onChange={() => onSelectTemplateId(tpl.publicId)}
                      className="text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="font-semibold text-xs">{tpl.title}</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">{tpl.category || "Geral"}</span>
                </label>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={confirmedSend}
              onChange={(e) => setConfirmedSend(e.target.checked)}
              className="rounded border-white/20 bg-[#151619] text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-zinc-300">Confirmo o envio para este aluno</span>
          </label>

          <button
            type="button"
            onClick={onSendForm}
            disabled={!confirmedSend || isSending || !selectedTemplateId}
            className="w-full py-2.5 rounded-xl font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSending ? "Enviando formulário..." : "Enviar Formulário Selecionado"}
          </button>
        </div>
      )}

      {/* CREATE FORM */}
      {tab === "create" && (
        <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-center space-y-3 text-xs">
          <p className="text-zinc-300">
            Crie novos formulários e questionários customizados na seção oficial.
          </p>
          <Link
            href={`/consultoria/${consultancySlug}/formularios`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer"
          >
            <span>Ir para Gerenciamento de Formulários</span>
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

// 5. TREINOS WIDGET (Single, Multiple or None)
function TreinosWidget({
  student,
  consultancySlug,
  detail,
  isLoading,
}: {
  student: PersonalStudentSummary;
  consultancySlug: string;
  detail?: PersonalStudentDetail;
  isLoading?: boolean;
}) {
  if (isLoading && !detail) {
    return (
      <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 text-xs text-zinc-400 flex items-center gap-2">
        <RefreshIcon className="w-4 h-4 animate-spin text-emerald-400" />
        <span>Carregando treinos de {student.name}...</span>
      </div>
    );
  }

  const workouts = detail?.workouts || [];
  const activeWorkouts = workouts.filter((w) => w.status === "ACTIVE");

  return (
    <div className="space-y-3 pt-1">
      {activeWorkouts.length === 1 ? (
        // Exactly 1 Active Workout -> Direct Official Flow
        <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-white">Treino ativo: {activeWorkouts[0].title}</span>
          </div>
          <div className="p-3 rounded-lg bg-[#151619] border border-white/10 space-y-1">
            <div className="font-bold text-emerald-400 text-sm">{activeWorkouts[0].title}</div>
            <div className="text-[11px] text-zinc-400">
              Prescrito em {formatDisplayDate(activeWorkouts[0].startsOn)}
            </div>
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/treinos/${activeWorkouts[0].assignmentPublicId}`}
            className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer"
          >
            <span>Abrir treino ativo no Training Studio</span>
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : activeWorkouts.length > 1 ? (
        // More than 1 Active Workout -> Short Nominal Choice
        <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-3 text-xs">
          <div className="font-bold text-white">
            {student.name} possui {activeWorkouts.length} treinos ativos. Escolha qual deseja abrir:
          </div>
          <div className="space-y-2">
            {activeWorkouts.map((w) => (
              <Link
                key={w.assignmentPublicId}
                href={`/consultoria/${consultancySlug}/treinos/${w.assignmentPublicId}`}
                className="flex items-center justify-between p-3 rounded-xl bg-[#151619] border border-white/10 hover:border-emerald-500/50 hover:bg-[#202328] transition-all cursor-pointer group"
              >
                <div>
                  <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {w.title}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Desde {formatDisplayDate(w.startsOn)}
                  </div>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        // 0 Active Workouts -> Inform and Provide Official Actions
        <div className="p-4 rounded-xl bg-[#0B0C0E] border border-white/10 space-y-3 text-xs text-center">
          <p className="text-zinc-300">
            Nenhum treino ativo prescrito para este aluno.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-1 justify-center">
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-zinc-950 bg-emerald-500 hover:bg-emerald-400 transition-all cursor-pointer"
            >
              <span>+ Criar treino personalizado</span>
            </Link>
            <Link
              href={`/consultoria/${consultancySlug}/rotinas`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-[#151619] border border-white/10 hover:bg-white/[0.06] transition-all cursor-pointer"
            >
              <span>Aplicar modelo da consultoria</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
