"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
import type {
  WorkoutRootDto,
  WorkoutVersionDto,
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutCombinationType,
  ExerciseItemDto,
} from "@/lib/training-v2/types";
import type { QuickConfigInput } from "@/lib/training-v2/workout-repository";
import {
  searchActiveStudentsAction,
  assignWorkoutVersionAction,
  getStudentActiveWorkoutAssignmentAction,
  searchExercisesForPickerAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import type { StudentSearchResult } from "@/lib/training-v2/assignment-repository";

export type TrainingStudioAssistantProps = {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  workout: WorkoutRootDto;
  version: WorkoutVersionDto;
  categories: WorkoutBlockDto[];
  selectedCategoryPublicId?: string | null;
  // Direct Workout Mutations
  onCreateCategory?: (title?: string) => Promise<string | undefined>;
  onRenameCategory?: (categoryPublicId: string, newTitle: string) => Promise<void>;
  onDeleteCategory?: (categoryPublicId: string) => Promise<void>;
  onAddExerciseToCategory?: (categoryPublicId: string, exercisePublicId: string) => Promise<WorkoutBlockItemDto | undefined>;
  onCreateCombination?: (input: {
    blockPublicId: string;
    subBlockPublicId?: string;
    combinationType: WorkoutCombinationType;
    title?: string;
    restAfterSeconds?: number;
    itemPublicIds: string[];
  }) => Promise<void>;
  onUpdateExerciseQuickConfig?: (itemPublicId: string, config: QuickConfigInput) => Promise<void>;
  onDeleteExercise?: (itemPublicId: string) => Promise<void>;
  // Existing Handlers
  onOpenExercisePicker: (categoryPublicId: string) => void;
  onOpenCreateCustom: (categoryPublicId: string) => void;
  onStartGuidedCombination: (type: WorkoutCombinationType) => void;
  onOpenPublishDialog: () => void;
  onCreateDraft?: () => void;
  onOpenPreview?: () => void;
};

// Web Speech API interface declarations
interface ISpeechRecognitionEvent {
  results?: Array<Array<{ transcript?: string }>>;
}

interface ISpeechRecognitionErrorEvent {
  error?: string;
}

interface ISpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: new () => ISpeechRecognitionInstance;
  webkitSpeechRecognition?: new () => ISpeechRecognitionInstance;
}

// Interactive cards rendered within message thread
type AssistantCard =
  | {
      type: "proposal_division";
      title: string;
      blocks: string[];
      onApply: () => Promise<void>;
    }
  | {
      type: "exercise_ambiguity";
      query: string;
      exercises: ExerciseItemDto[];
      targetCategoryId: string;
    }
  | {
      type: "confirm_delete";
      targetType: "block" | "exercise";
      targetId: string;
      targetName: string;
      onConfirm: () => Promise<void>;
    }
  | {
      type: "confirm_substitution";
      oldItem: WorkoutBlockItemDto;
      newExercise: ExerciseItemDto;
      onConfirm: () => Promise<void>;
    }
  | {
      type: "custom_fallback";
      exerciseName: string;
      targetCategoryId: string;
    }
  | {
      type: "mutation_result";
      title: string;
      savedStatus: "✓ Salvo no servidor";
      items: Array<{
        name: string;
        seriesCount: number;
        reps: string;
        loadKg?: number | null;
        restSeconds: number;
        notes?: string | null;
      }>;
    };

type ChatMessage = {
  id: string;
  sender: "assistant" | "user";
  text: string;
  timestamp: Date;
  statusBadge?: string;
  card?: AssistantCard;
};

function AssistantMessageCard({
  card,
  onAddExercise,
  onOpenCreateCustom,
  onCancelDelete,
  onClose,
}: {
  card: AssistantCard;
  onAddExercise?: (categoryId: string, exercisePublicId: string) => Promise<unknown>;
  onOpenCreateCustom: (categoryId: string) => void;
  onCancelDelete: () => void;
  onClose: () => void;
}) {
  if (card.type === "proposal_division") {
    return (
      <div className="space-y-2.5 p-3 rounded-xl bg-zinc-950/80 border border-emerald-500/30">
        <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider block">
          {card.title}
        </span>
        <div className="space-y-1 text-xs text-zinc-300">
          {card.blocks.map((b, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{b}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={card.onApply}
          className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer min-h-[40px]"
        >
          ✓ Aplicar esta divisão
        </button>
      </div>
    );
  }

  if (card.type === "exercise_ambiguity") {
    return (
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-zinc-400 block">
          Toque no exercício desejado para adicionar:
        </span>
        <div className="grid grid-cols-1 gap-1.5">
          {card.exercises.map((ex) => (
            <button
              key={ex.publicId}
              type="button"
              onClick={async () => {
                if (onAddExercise) {
                  await onAddExercise(card.targetCategoryId, ex.publicId);
                }
              }}
              className="p-2.5 rounded-xl bg-zinc-950 hover:bg-emerald-950/30 border border-zinc-800 hover:border-emerald-500 text-left transition-all flex items-center justify-between gap-2 cursor-pointer min-h-[44px]"
            >
              <div className="min-w-0">
                <div className="font-bold text-xs text-white truncate">{ex.name}</div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {ex.muscleGroupPrimary || "Geral"} {ex.equipment ? `· ${ex.equipment}` : ""}
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 shrink-0">+ Adicionar</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (card.type === "confirm_delete") {
    return (
      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
        <p className="text-xs font-bold text-rose-300">
          Confirmar exclusão de {card.targetName}?
        </p>
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={card.onConfirm}
            className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs min-h-[40px] cursor-pointer"
          >
            Sim, excluir
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-bold text-xs min-h-[40px] cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (card.type === "confirm_substitution") {
    return (
      <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/30 space-y-2">
        <p className="text-xs text-zinc-300">
          Substituir <strong className="text-white">{card.oldItem.exerciseNameSnapshot}</strong> por{" "}
          <strong className="text-emerald-400">{card.newExercise.name}</strong> mantendo a prescrição atual?
        </p>
        <button
          type="button"
          onClick={card.onConfirm}
          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs min-h-[40px] cursor-pointer"
        >
          Confirmar substituição
        </button>
      </div>
    );
  }

  if (card.type === "custom_fallback") {
    return (
      <button
        type="button"
        onClick={() => {
          onClose();
          onOpenCreateCustom(card.targetCategoryId);
        }}
        className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold text-xs border border-zinc-700 min-h-[40px] flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <span>✏️ Criar &quot;{card.exerciseName}&quot; personalizado</span>
      </button>
    );
  }

  if (card.type === "mutation_result") {
    return (
      <div className="space-y-2.5 p-3.5 rounded-2xl bg-zinc-950/70 dark:bg-black/60 border border-emerald-500/30 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider truncate">
            {card.title}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
            {card.savedStatus}
          </span>
        </div>

        <div className="space-y-2">
          {card.items.map((it, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-zinc-900/90 dark:bg-zinc-900 border border-zinc-800/80 space-y-1.5"
            >
              <h5 className="text-xs sm:text-sm font-extrabold text-white line-clamp-1">
                {it.name}
              </h5>
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-zinc-300">
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700">
                  {it.seriesCount} séries
                </span>
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700">
                  {it.reps} reps
                </span>
                {it.loadKg != null && (
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700">
                    {it.loadKg}kg
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-200 border border-zinc-700">
                  {it.restSeconds}s descanso
                </span>
              </div>
              {it.notes && (
                <p className="text-[10px] text-amber-400 font-medium">
                  ⚡ {it.notes}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="pt-1 flex items-center justify-between gap-2 text-xs flex-wrap">
          <span className="text-[10px] text-zinc-400">
            Continue conversando para ajustar ou
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-bold transition-colors cursor-pointer text-xs"
          >
            Ver ficha completa →
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export function TrainingStudioAssistant({
  isOpen,
  onClose,
  consultancySlug,
  workout,
  version,
  categories,
  selectedCategoryPublicId,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
  onAddExerciseToCategory,
  onCreateCombination,
  onUpdateExerciseQuickConfig,
  onDeleteExercise,
  onOpenExercisePicker,
  onOpenCreateCustom,
  onStartGuidedCombination,
  onOpenPublishDialog,
  onCreateDraft,
  onOpenPreview,
}: TrainingStudioAssistantProps) {
  // Target Category Context (Derived state, avoids cascading renders)
  const [selectedTargetIdOverride, setSelectedTargetIdOverride] = useState<string | null>(null);

  const targetCategoryId =
    selectedTargetIdOverride && (selectedTargetIdOverride === "__NEW_BLOCK__" || categories.some((c) => c.publicId === selectedTargetIdOverride))
      ? selectedTargetIdOverride
      : selectedCategoryPublicId && categories.some((c) => c.publicId === selectedCategoryPublicId)
      ? selectedCategoryPublicId
      : categories[0]?.publicId || "__NEW_BLOCK__";

  const [commandInput, setCommandInput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const [speechSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    const win = window as IWindowWithSpeech;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  });

  const isMounted = useIsMounted();

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "initial",
      sender: "assistant",
      text: "O que você quer montar ou ajustar?",
      timestamp: new Date(),
    },
  ]);

  // Student Assignment States (Preserved & Enhanced)
  const [flowState, setFlowState] = useState<
    "idle" | "searching" | "ambiguity" | "draft_warning" | "published_warning" | "confirm_assignment" | "assigning" | "assignment_success" | "assignment_error"
  >("idle");
  const [matchedStudents, setMatchedStudents] = useState<StudentSearchResult[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentSearchResult[]>([]);
  const [assignmentNotice, setAssignmentNotice] = useState<string | null>(null);
  const [assignmentResults, setAssignmentResults] = useState<
    Array<{ studentName: string; ok: boolean; error?: string; membershipPublicId?: string }>
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<ISpeechRecognitionInstance | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = useCallback(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, flowState, scrollToBottom]);

  const handleClose = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Helper to resolve or create the target category
  const getOrResolveTargetCategory = useCallback(async (): Promise<{ id: string; title: string }> => {
    if (targetCategoryId && targetCategoryId !== "__NEW_BLOCK__") {
      const found = categories.find((c) => c.publicId === targetCategoryId);
      if (found) return { id: found.publicId, title: found.title || "Treino" };
    }

    if (onCreateCategory) {
      const nextLetter = String.fromCharCode(65 + categories.length);
      const newTitle = `Treino ${nextLetter}`;
      const createdId = await onCreateCategory(newTitle);
      if (createdId) {
        setSelectedTargetIdOverride(createdId);
        return { id: createdId, title: newTitle };
      }
    }

    const fallback = categories[0];
    return fallback ? { id: fallback.publicId, title: fallback.title || "Treino" } : { id: "", title: "Treino" };
  }, [targetCategoryId, categories, onCreateCategory]);

  // Check student assignment notice
  const checkExistingAssignmentNotice = useCallback(
    async (student: StudentSearchResult) => {
      try {
        const res = await getStudentActiveWorkoutAssignmentAction(
          consultancySlug,
          workout.publicId,
          student.membershipPublicId
        );
        if (res.ok && res.data) {
          setAssignmentNotice(
            `O aluno ${student.name} já possui uma rotina atribuída (V${res.data.versionNumber}). Ao confirmar, a nova versão V${version.versionNumber} será ativada como vigente.`
          );
        } else {
          setAssignmentNotice(null);
        }
      } catch {
        setAssignmentNotice(null);
      }
    },
    [consultancySlug, version.versionNumber, workout.publicId]
  );

  // Student Assignment Flow
  const handleStudentAssignmentFlow = useCallback(
    async (studentNames: string[]) => {
      setErrorMessage(null);
      setFlowState("searching");

      if (version.status === "DRAFT") {
        setFlowState("draft_warning");
        return;
      }

      try {
        const resolvedList: StudentSearchResult[] = [];
        const ambiguousList: StudentSearchResult[] = [];

        for (const name of studentNames) {
          const res = await searchActiveStudentsAction(consultancySlug, name);
          if (res.ok && res.data && res.data.length > 0) {
            if (res.data.length === 1) {
              resolvedList.push(res.data[0]);
            } else {
              ambiguousList.push(...res.data);
            }
          }
        }

        if (resolvedList.length === 0 && ambiguousList.length === 0) {
          setFlowState("idle");
          setErrorMessage(
            `Nenhum aluno encontrado com "${studentNames.join(", ")}" nesta consultoria. Verifique o nome ou busque manualmente.`
          );
          return;
        }

        if (ambiguousList.length > 0) {
          setMatchedStudents(ambiguousList);
          setSelectedStudents(resolvedList);
          setFlowState("ambiguity");
          return;
        }

        setSelectedStudents(resolvedList);
        await checkExistingAssignmentNotice(resolvedList[0]);
        setFlowState("confirm_assignment");
      } catch (err: unknown) {
        setFlowState("idle");
        setErrorMessage(err instanceof Error ? err.message : "Erro ao buscar alunos.");
      }
    },
    [checkExistingAssignmentNotice, consultancySlug, version.status]
  );

  // Natural Language Command Interpreter & Execution Engine
  const handleExecuteCommand = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isExecuting) return;

      // Add user message to conversation
      const userMsgId = `user-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          sender: "user",
          text: trimmed,
          timestamp: new Date(),
        },
      ]);
      setCommandInput("");

      const normalized = trimmed
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      setIsExecuting(true);
      setErrorMessage(null);

      try {
        // 1. Division Creation ("montar divisão ABC", "divisão ABC", "divisão ABCD", "divisão AB")
        if (
          normalized.includes("divisao abc") ||
          normalized.includes("montar abc") ||
          normalized.includes("treino abc") ||
          normalized.includes("divisao abcd") ||
          normalized.includes("divisao ab")
        ) {
          if (version.status !== "DRAFT") {
            setFlowState("published_warning");
            setIsExecuting(false);
            return;
          }

          const isABCD = normalized.includes("abcd");
          const isAB = normalized.includes("ab") && !normalized.includes("abc");

          const blocks = isABCD
            ? [
                "Treino A — Peito e Tríceps",
                "Treino B — Costas e Bíceps",
                "Treino C — Pernas Completas",
                "Treino D — Ombros e Abdômen",
              ]
            : isAB
            ? [
                "Treino A — Superiores (Peito, Costas e Braços)",
                "Treino B — Inferiores (Pernas e Abdômen)",
              ]
            : [
                "Treino A — Peito, Ombros e Tríceps",
                "Treino B — Costas, Trapézio e Bíceps",
                "Treino C — Pernas Completas e Abdômen",
              ];

          setMessages((prev) => [
            ...prev,
            {
              id: `asst-${Date.now()}`,
              sender: "assistant",
              text: `Preparei a proposta da divisão ${isABCD ? "ABCD" : isAB ? "AB" : "ABC"}. Deseja criar estes blocos?`,
              timestamp: new Date(),
              card: {
                type: "proposal_division",
                title: `Divisão ${isABCD ? "ABCD (4 blocos)" : isAB ? "AB (2 blocos)" : "ABC (3 blocos)"}`,
                blocks,
                onApply: async () => {
                  if (!onCreateCategory) return;
                  for (const bTitle of blocks) {
                    await onCreateCategory(bTitle);
                  }
                  setMessages((m) => [
                    ...m,
                    {
                      id: `asst-${Date.now()}`,
                      sender: "assistant",
                      text: `✅ Divisão criada com sucesso! Selecionei o primeiro bloco para prescrever os exercícios.`,
                      timestamp: new Date(),
                    },
                  ]);
                },
              },
            },
          ]);
          setIsExecuting(false);
          return;
        }

        // Rename Block Intent ("renomear bloco para Pernas", "mudar nome do bloco para...")
        if (
          (normalized.includes("renomear bloco") || normalized.includes("mudar nome do bloco")) &&
          onRenameCategory
        ) {
          if (version.status !== "DRAFT") {
            setFlowState("published_warning");
            setIsExecuting(false);
            return;
          }
          const target = await getOrResolveTargetCategory();
          const match = trimmed.match(/(?:renomear bloco|mudar nome do bloco)(?:\s+(?:[A-Za-z0-9_-]+))?\s+para\s+(.+)$/i);
          const newTitle = match ? match[1].trim() : trimmed.replace(/^(?:renomear bloco|mudar nome do bloco)\s*/i, "").trim();
          if (newTitle) {
            await onRenameCategory(target.id, newTitle);
            setMessages((prev) => [
              ...prev,
              {
                id: `asst-${Date.now()}`,
                sender: "assistant",
                text: `🏷️ Bloco renomeado com sucesso para "${newTitle}".`,
                timestamp: new Date(),
              },
            ]);
            setIsExecuting(false);
            return;
          }
        }

        // Preview Intent ("ver previa", "abrir previa", "visualizar ficha")
        if (
          normalized.includes("ver previa") ||
          normalized.includes("abrir previa") ||
          normalized.includes("visualizar ficha") ||
          normalized.includes("mostrar previa")
        ) {
          if (onOpenPreview) {
            handleClose();
            onOpenPreview();
          }
          setIsExecuting(false);
          return;
        }

        // 2. Warmup Intent ("adicionar aquecimento", "aquecimento", "mobilidade")
        if (
          normalized.includes("aquecimento") ||
          normalized.includes("mobilidade") ||
          normalized.includes("adicionar aquecimento")
        ) {
          if (version.status !== "DRAFT") {
            setFlowState("published_warning");
            setIsExecuting(false);
            return;
          }

          const target = await getOrResolveTargetCategory();
          // Search for mobility/warmup in library
          const res = await searchExercisesForPickerAction(consultancySlug, { query: "Mobilidade" });
          if (res.ok && res.data && res.data.length > 0 && onAddExerciseToCategory) {
            const added = await onAddExerciseToCategory(target.id, res.data[0].publicId);
            const seriesCount = added?.sets?.length || 3;
            const reps = added?.sets?.[0]?.targetRepsMax
              ? `${added.sets[0].targetReps}-${added.sets[0].targetRepsMax}`
              : String(added?.sets?.[0]?.targetReps || 10);
            const rest = added?.sets?.[0]?.targetRestSeconds ?? 60;
            const load = added?.sets?.[0]?.targetLoadKg ?? null;

            setMessages((prev) => [
              ...prev,
              {
                id: `asst-${Date.now()}`,
                sender: "assistant",
                text: `Adicionei **${added?.exerciseNameSnapshot || res.data![0].name}** ao bloco **${target.title}**.`,
                timestamp: new Date(),
                card: {
                  type: "mutation_result",
                  title: `Aquecimento em ${target.title}`,
                  savedStatus: "✓ Salvo no servidor",
                  items: [
                    {
                      name: added?.exerciseNameSnapshot || res.data![0].name,
                      seriesCount,
                      reps,
                      loadKg: load,
                      restSeconds: rest,
                      notes: added?.notes || undefined,
                    },
                  ],
                },
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: `asst-${Date.now()}`,
                sender: "assistant",
                text: `Para adicionar exercícios de aquecimento personalizados com vídeos específicos de mobilidade, use o botão de criação personalizada.`,
                timestamp: new Date(),
                card: {
                  type: "custom_fallback",
                  exerciseName: "Aquecimento e Mobilidade",
                  targetCategoryId: target.id,
                },
              },
            ]);
          }
          setIsExecuting(false);
          return;
        }

        // 3. Combination Intent ("combinar em bi-set", "criar bi-set", "tri-set", "circuito")
        if (
          normalized.includes("bi-set") ||
          normalized.includes("biset") ||
          normalized.includes("tri-set") ||
          normalized.includes("triset") ||
          normalized.includes("circuito") ||
          normalized.includes("super-serie")
        ) {
          if (version.status !== "DRAFT") {
            setFlowState("published_warning");
            setIsExecuting(false);
            return;
          }

          const target = await getOrResolveTargetCategory();
          const activeBlock = categories.find((c) => c.publicId === target.id) || categories[0];
          const blockItems = activeBlock?.items || [];

          const combType: WorkoutCombinationType =
            normalized.includes("tri-set") || normalized.includes("triset")
              ? "TRI_SET"
              : normalized.includes("circuito")
              ? "CIRCUIT"
              : "BI_SET";

          const neededCount = combType === "TRI_SET" ? 3 : combType === "CIRCUIT" ? 4 : 2;

          if (blockItems.length >= neededCount && onCreateCombination) {
            // Select the last items of the block
            const targetItems = blockItems.slice(-neededCount);
            await onCreateCombination({
              blockPublicId: target.id,
              combinationType: combType,
              restAfterSeconds: 60,
              itemPublicIds: targetItems.map((i) => i.publicId),
            });
            setMessages((prev) => [
              ...prev,
              {
                id: `asst-${Date.now()}`,
                sender: "assistant",
                text: `Criei o **${combType === "TRI_SET" ? "Tri-set" : combType === "CIRCUIT" ? "Circuito" : "Bi-set"}** com sucesso no bloco **${target.title}**!`,
                timestamp: new Date(),
                card: {
                  type: "mutation_result",
                  title: `${combType === "TRI_SET" ? "Tri-set" : combType === "CIRCUIT" ? "Circuito" : "Bi-set"} agrupado em ${target.title}`,
                  savedStatus: "✓ Salvo no servidor",
                  items: targetItems.map((it) => ({
                    name: it.exerciseNameSnapshot,
                    seriesCount: it.sets?.length || 3,
                    reps: it.sets?.[0]?.targetRepsMax ? `${it.sets[0].targetReps}-${it.sets[0].targetRepsMax}` : String(it.sets?.[0]?.targetReps || 10),
                    loadKg: it.sets?.[0]?.targetLoadKg ?? null,
                    restSeconds: 60,
                    notes: it.notes || undefined,
                  })),
                },
              },
            ]);
          } else {
            handleClose();
            onStartGuidedCombination(combType);
          }
          setIsExecuting(false);
          return;
        }

        // Open Exercise Library Picker Intent ("abrir biblioteca", "buscar na biblioteca", "ver catálogo")
        if (
          normalized.includes("abrir biblioteca") ||
          normalized.includes("buscar na biblioteca") ||
          normalized.includes("ver catalogo") ||
          normalized.includes("abrir catalogo")
        ) {
          const target = await getOrResolveTargetCategory();
          handleClose();
          onOpenExercisePicker(target.id);
          setIsExecuting(false);
          return;
        }

        // 4. Prescription Adjustment Intent ("ajustar descanso para 60s", "4 séries de 10 reps", "carga 20kg")
        const hasPrescriptionIntent =
          normalized.includes("descanso") ||
          normalized.includes("series") ||
          normalized.includes("repeticoes") ||
          normalized.includes("reps") ||
          normalized.includes("carga");

        if (hasPrescriptionIntent && !normalized.includes("substituir") && !normalized.includes("trocar")) {
          if (version.status !== "DRAFT") {
            setFlowState("published_warning");
            setIsExecuting(false);
            return;
          }

          const target = await getOrResolveTargetCategory();
          const activeBlock = categories.find((c) => c.publicId === target.id) || categories[0];
          const blockItems = activeBlock?.items || [];

          if (blockItems.length === 0) {
            setMessages((prev) => [
              ...prev,
              {
                id: `asst-${Date.now()}`,
                sender: "assistant",
                text: `O bloco "${target.title}" ainda não possui exercícios cadastrados para ajustar a prescrição.`,
                timestamp: new Date(),
              },
            ]);
            setIsExecuting(false);
            return;
          }

          // Target last item by default
          const targetItem = blockItems[blockItems.length - 1];

          // Parse parameters
          const restMatch = normalized.match(/(\d+)\s*(?:s|seg|segundos)/i) || normalized.match(/descanso\s*(?:de\s*)?(\d+)/i);
          const seriesMatch = normalized.match(/(\d+)\s*series/i);
          const repsMatch = normalized.match(/(\d+)(?:-(\d+))?\s*(?:reps|repeticoes)/i);
          const loadMatch = normalized.match(/(\d+)\s*(?:kg|quilos)/i);

          const repsMin = repsMatch ? parseInt(repsMatch[1], 10) : targetItem.sets?.[0]?.targetReps ?? 10;
          const repsMax = repsMatch && repsMatch[2] ? parseInt(repsMatch[2], 10) : targetItem.sets?.[0]?.targetRepsMax ?? null;

          const updatedConfig: QuickConfigInput = {
            seriesCount: seriesMatch ? parseInt(seriesMatch[1], 10) : targetItem.sets?.length || 4,
            reps: repsMin,
            targetRepsMax: repsMax,
            restSeconds: restMatch ? parseInt(restMatch[1], 10) : targetItem.sets?.[0]?.targetRestSeconds ?? 60,
            loadKg: loadMatch ? parseFloat(loadMatch[1]) : targetItem.sets?.[0]?.targetLoadKg ?? null,
            notes: targetItem.notes || undefined,
          };

          const repsDisplay = updatedConfig.targetRepsMax
            ? `${updatedConfig.reps}-${updatedConfig.targetRepsMax}`
            : `${updatedConfig.reps}`;

          if (onUpdateExerciseQuickConfig) {
            await onUpdateExerciseQuickConfig(targetItem.publicId, updatedConfig);
            setMessages((prev) => [
              ...prev,
              {
                id: `asst-${Date.now()}`,
                sender: "assistant",
                text: `Atualizei a prescrição de **${targetItem.exerciseNameSnapshot}** no bloco **${target.title}**.`,
                timestamp: new Date(),
                card: {
                  type: "mutation_result",
                  title: `Prescrição em ${target.title}`,
                  savedStatus: "✓ Salvo no servidor",
                  items: [
                    {
                      name: targetItem.exerciseNameSnapshot,
                      seriesCount: updatedConfig.seriesCount,
                      reps: repsDisplay,
                      loadKg: updatedConfig.loadKg,
                      restSeconds: updatedConfig.restSeconds,
                      notes: updatedConfig.notes,
                    },
                  ],
                },
              },
            ]);
          }
          setIsExecuting(false);
          return;
        }

        // 5. Substitution Intent ("substituir [x] por [y]", "trocar [x] por [y]")
        const replaceMatch = normalized.match(/(?:substituir|trocar|mudar)\s+(.+?)\s+por\s+(.+)/i);
        if (replaceMatch) {
          if (version.status !== "DRAFT") {
            setFlowState("published_warning");
            setIsExecuting(false);
            return;
          }

          const oldNameQuery = replaceMatch[1].trim();
          const newNameQuery = replaceMatch[2].trim();

          const target = await getOrResolveTargetCategory();
          const activeBlock = categories.find((c) => c.publicId === target.id) || categories[0];
          const blockItems = activeBlock?.items || [];

          const oldItem = blockItems.find((i) =>
            i.exerciseNameSnapshot.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(oldNameQuery)
          );

          if (!oldItem) {
            setMessages((prev) => [
              ...prev,
              {
                id: `asst-${Date.now()}`,
                sender: "assistant",
                text: `Não encontrei nenhum exercício parecido com "${oldNameQuery}" no bloco "${target.title}". Verifique o nome do exercício.`,
                timestamp: new Date(),
              },
            ]);
            setIsExecuting(false);
            return;
          }

          const resNew = await searchExercisesForPickerAction(consultancySlug, { query: newNameQuery });
          if (resNew.ok && resNew.data && resNew.data.length > 0) {
            const newExercise = resNew.data[0];
            setMessages((prev) => [
              ...prev,
              {
                id: `asst-${Date.now()}`,
                sender: "assistant",
                text: `Deseja substituir "${oldItem.exerciseNameSnapshot}" por "${newExercise.name}" preservando as séries e repetições atuais?`,
                timestamp: new Date(),
                card: {
                  type: "confirm_substitution",
                  oldItem,
                  newExercise,
                  onConfirm: async () => {
                    if (onAddExerciseToCategory && onDeleteExercise) {
                      await onAddExerciseToCategory(target.id, newExercise.publicId);
                      await onDeleteExercise(oldItem.publicId);
                      setMessages((m) => [
                        ...m,
                        {
                          id: `asst-${Date.now()}`,
                          sender: "assistant",
                          text: `🔄 Exercício substituído com sucesso por "${newExercise.name}"!`,
                          timestamp: new Date(),
                        },
                      ]);
                    }
                  },
                },
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id: `asst-${Date.now()}`,
                sender: "assistant",
                text: `Não encontrei "${newNameQuery}" no catálogo. Deseja criar como personalizado?`,
                timestamp: new Date(),
                card: {
                  type: "custom_fallback",
                  exerciseName: newNameQuery,
                  targetCategoryId: target.id,
                },
              },
            ]);
          }
          setIsExecuting(false);
          return;
        }

        // 6. Delete Confirmation Intent ("excluir [x]", "remover [x]", "apagar [x]")
        const deleteMatch = normalized.match(/(?:excluir|remover|apagar|deletar)\s+(.+)/i);
        if (deleteMatch && !normalized.includes("rascunho") && !normalized.includes("ficha")) {
          if (version.status !== "DRAFT") {
            setFlowState("published_warning");
            setIsExecuting(false);
            return;
          }

          const targetQuery = deleteMatch[1].trim();
          const target = await getOrResolveTargetCategory();
          const activeBlock = categories.find((c) => c.publicId === target.id) || categories[0];
          const blockItems = activeBlock?.items || [];

          // Check if matches an exercise
          const itemToDelete = blockItems.find((i) =>
            i.exerciseNameSnapshot.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(targetQuery)
          );

          if (itemToDelete) {
            setMessages((prev) => [
              ...prev,
              {
                id: `asst-${Date.now()}`,
                sender: "assistant",
                text: `⚠️ Confirmação de segurança: deseja realmente excluir o exercício "${itemToDelete.exerciseNameSnapshot}"?`,
                timestamp: new Date(),
                card: {
                  type: "confirm_delete",
                  targetType: "exercise",
                  targetId: itemToDelete.publicId,
                  targetName: itemToDelete.exerciseNameSnapshot,
                  onConfirm: async () => {
                    if (onDeleteExercise) {
                      await onDeleteExercise(itemToDelete.publicId);
                      setMessages((m) => [
                        ...m,
                        {
                          id: `asst-${Date.now()}`,
                          sender: "assistant",
                          text: `🗑️ Exercício "${itemToDelete.exerciseNameSnapshot}" excluído com sucesso.`,
                          timestamp: new Date(),
                        },
                      ]);
                    }
                  },
                },
              },
            ]);
            setIsExecuting(false);
            return;
          }

          // Check if matches a whole category/block
          const catToDelete = categories.find((c) =>
            (c.title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(targetQuery)
          );

          if (catToDelete) {
            setMessages((prev) => [
              ...prev,
              {
                id: `asst-${Date.now()}`,
                sender: "assistant",
                text: `⚠️ ATENÇÃO: Deseja realmente excluir o bloco "${catToDelete.title}" e todos os seus ${catToDelete.items?.length || 0} exercício(s)?`,
                timestamp: new Date(),
                card: {
                  type: "confirm_delete",
                  targetType: "block",
                  targetId: catToDelete.publicId,
                  targetName: catToDelete.title || "Bloco de treino",
                  onConfirm: async () => {
                    if (onDeleteCategory) {
                      await onDeleteCategory(catToDelete.publicId);
                      setMessages((m) => [
                        ...m,
                        {
                          id: `asst-${Date.now()}`,
                          sender: "assistant",
                          text: `🗑️ Bloco "${catToDelete.title}" excluído.`,
                          timestamp: new Date(),
                        },
                      ]);
                    }
                  },
                },
              },
            ]);
            setIsExecuting(false);
            return;
          }
        }

        // 7. Student Assignment Intent ("envie esse treino para...", "atribua ao...")
        const assignMatch =
          normalized.match(/(?:envie|enviar|atribua|atribuir|coloque|passa)\s+(?:esse\s+treino|essa\s+ficha|o\s+treino|a\s+ficha)?\s*(?:para|ao?|no?)\s+(.+)/i) ||
          normalized.match(/(?:envie|enviar|atribua|atribuir)\s+(?:para\s+)?(.+)/i);

        if (assignMatch && assignMatch[1]) {
          const rawTargetNames = assignMatch[1].trim();
          const names = rawTargetNames
            .split(/(?:\s+e\s+|\s*,\s*|\s+e\s+para\s+)/i)
            .map((n) => n.trim())
            .filter(Boolean);

          await handleStudentAssignmentFlow(names);
          setIsExecuting(false);
          return;
        }

        // 8. Publish Intent ("publicar", "publicar ficha")
        if (normalized === "publicar" || normalized === "publicar ficha" || normalized === "publicar treino") {
          handleClose();
          onOpenPublishDialog();
          setIsExecuting(false);
          return;
        }

        // 9. Add Exercise to Category (General Catalog Search & Direct Addition)
        const addClean = trimmed
          .replace(/^(?:adicione|adicionar|coloque|colocar|inclua|incluir|botar|bote|passar)\s+/i, "")
          .replace(/^(?:o\s+|a\s+|os\s+|as\s+)/i, "")
          .trim();

        if (addClean.length >= 2) {
          if (version.status !== "DRAFT") {
            setFlowState("published_warning");
            setIsExecuting(false);
            return;
          }

          const target = await getOrResolveTargetCategory();
          const res = await searchExercisesForPickerAction(consultancySlug, { query: addClean });

          if (res.ok && res.data && res.data.length > 0) {
            const matches = res.data;
            if (matches.length === 1 && onAddExerciseToCategory) {
              const added = await onAddExerciseToCategory(target.id, matches[0].publicId);
              const seriesCount = added?.sets?.length || 4;
              const reps = added?.sets?.[0]?.targetRepsMax
                ? `${added.sets[0].targetReps}-${added.sets[0].targetRepsMax}`
                : String(added?.sets?.[0]?.targetReps || 10);
              const rest = added?.sets?.[0]?.targetRestSeconds ?? 60;
              const load = added?.sets?.[0]?.targetLoadKg ?? null;

              setMessages((prev) => [
                ...prev,
                {
                  id: `asst-${Date.now()}`,
                  sender: "assistant",
                  text: `Adicionei **${added?.exerciseNameSnapshot || matches[0].name}** ao bloco **${target.title}**.`,
                  timestamp: new Date(),
                  card: {
                    type: "mutation_result",
                    title: `Exercício adicionado a ${target.title}`,
                    savedStatus: "✓ Salvo no servidor",
                    items: [
                      {
                        name: added?.exerciseNameSnapshot || matches[0].name,
                        seriesCount,
                        reps,
                        loadKg: load,
                        restSeconds: rest,
                        notes: added?.notes || undefined,
                      },
                    ],
                  },
                },
              ]);
            } else {
              setMessages((prev) => [
                ...prev,
                {
                  id: `asst-${Date.now()}`,
                  sender: "assistant",
                  text: `Encontrei ${matches.length} opções na biblioteca para "${addClean}". Toque para adicionar ao bloco "${target.title}":`,
                  timestamp: new Date(),
                  card: {
                    type: "exercise_ambiguity",
                    query: addClean,
                    exercises: matches.slice(0, 6),
                    targetCategoryId: target.id,
                  },
                },
              ]);
            }
            setIsExecuting(false);
            return;
          }

          // Not found -> provide custom fallback option
          setMessages((prev) => [
            ...prev,
            {
              id: `asst-${Date.now()}`,
              sender: "assistant",
              text: `Não encontrei "${addClean}" na biblioteca oficial. Deseja cadastrar como exercício personalizado com vídeo próprio?`,
              timestamp: new Date(),
              card: {
                type: "custom_fallback",
                exerciseName: addClean,
                targetCategoryId: target.id,
              },
            },
          ]);
          setIsExecuting(false);
          return;
        }

        // Fallback: Default Guidance
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            sender: "assistant",
            text: `Comando não compreendido: "${trimmed}". Você pode pedir: "Adicionar supino reto", "Montar divisão ABC", "Combinar em bi-set", "Ajustar descanso para 60s" ou "Envie para [nome do aluno]".`,
            timestamp: new Date(),
          },
        ]);
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao executar comando.");
      } finally {
        setIsExecuting(false);
      }
    },
    [
      categories,
      consultancySlug,
      getOrResolveTargetCategory,
      handleClose,
      handleStudentAssignmentFlow,
      isExecuting,
      onAddExerciseToCategory,
      onCreateCategory,
      onCreateCombination,
      onDeleteCategory,
      onDeleteExercise,
      onOpenExercisePicker,
      onOpenPreview,
      onOpenPublishDialog,
      onRenameCategory,
      onStartGuidedCombination,
      onUpdateExerciseQuickConfig,
      version.status,
    ]
  );

  // Voice Recognition Handler
  const toggleListening = useCallback(() => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const win = window as IWindowWithSpeech;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechError("Reconhecimento de voz não suportado neste navegador. Digite seu comando.");
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = "pt-BR";
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      rec.onresult = (event: ISpeechRecognitionEvent) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setCommandInput(transcript);
          handleExecuteCommand(transcript);
        }
      };

      rec.onerror = (event: ISpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error === "not-allowed") {
          setSpeechError("Permissão de microfone negada. Verifique as configurações do navegador.");
        } else {
          setSpeechError("Não foi possível reconhecer o áudio. Tente novamente ou digite.");
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListening(false);
      setSpeechError("Erro ao iniciar captura de voz.");
    }
  }, [handleExecuteCommand, isListening]);

  // Confirm and Execute Real Assignment
  async function handleConfirmAssignment() {
    if (selectedStudents.length === 0) return;

    setFlowState("assigning");
    setErrorMessage(null);

    const results: Array<{ studentName: string; ok: boolean; error?: string; membershipPublicId?: string }> = [];

    for (const student of selectedStudents) {
      try {
        const res = await assignWorkoutVersionAction(
          consultancySlug,
          workout.publicId,
          version.publicId,
          student.membershipPublicId
        );
        if (res.ok) {
          results.push({
            studentName: student.name,
            ok: true,
            membershipPublicId: student.membershipPublicId,
          });
        } else {
          results.push({
            studentName: student.name,
            ok: false,
            error: res.error || "Falha na atribuição.",
          });
        }
      } catch (err: unknown) {
        results.push({
          studentName: student.name,
          ok: false,
          error: err instanceof Error ? err.message : "Erro no servidor.",
        });
      }
    }

    setAssignmentResults(results);
    const hasFailures = results.some((r) => !r.ok);
    setFlowState(hasFailures ? "assignment_error" : "assignment_success");
  }

  if (!isOpen || !isMounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-modal-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-end bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      {/* Background click to dismiss on desktop */}
      <div className="absolute inset-0 hidden sm:block" onClick={handleClose} />

      {/* Main Container: Fullscreen on mobile, Wide Docked Panel on Desktop */}
      <div className="relative w-full sm:max-w-xl sm:h-full h-full max-h-[100dvh] bg-[var(--surface)] text-[var(--text-primary)] border-t sm:border-t-0 sm:border-l border-[var(--border-default)] shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Header with Title and Target Block Selector */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-zinc-950 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                ✨
              </div>
              <div className="min-w-0">
                <h3 id="assistant-modal-title" className="text-sm sm:text-base font-black tracking-tight text-[var(--text-primary)] truncate">
                  Assistente de Montagem
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                  Prescreva em linguagem natural ou por voz
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer min-h-[36px]"
                title="Ver ficha completa"
              >
                👁️ Ver ficha
              </button>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fechar assistente"
                className="w-9 h-9 min-h-[44px] min-w-[44px] rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Target Block Switcher Pill */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider shrink-0">
              Destino:
            </span>
            <div className="relative flex-1 min-w-[200px]">
              <select
                value={targetCategoryId}
                onChange={(e) => setSelectedTargetIdOverride(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer min-h-[38px]"
              >
                {categories.map((c, i) => (
                  <option key={c.publicId} value={c.publicId}>
                    {c.title || `Treino ${i + 1}`} ({c.items?.length || 0} exercícios)
                  </option>
                ))}
                <option value="__NEW_BLOCK__">+ Criar novo bloco de treino</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-xs">
                ▼
              </div>
            </div>
          </div>
        </div>

        {/* Content: Conversation History / Interactive Thread */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scroll-smooth">
          {/* Messages Thread */}
          {messages.map((msg) => {
            const isAsst = msg.sender === "assistant";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAsst ? "items-start" : "items-end"} space-y-1`}
              >
                <div
                  className={`max-w-[94%] sm:max-w-[88%] rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isAsst
                      ? "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                      : "bg-emerald-600 text-white font-medium"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>

                  {/* Interactive Cards Attached to Assistant Messages */}
                  {msg.card && (
                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2">
                      <AssistantMessageCard
                        card={msg.card}
                        onAddExercise={async (catId, exId) => {
                          if (onAddExerciseToCategory) {
                            const added = await onAddExerciseToCategory(catId, exId);
                            setMessages((m) => [
                              ...m,
                              {
                                id: `asst-${Date.now()}`,
                                sender: "assistant",
                                text: `✅ Exercício adicionado com sucesso!`,
                                timestamp: new Date(),
                              },
                            ]);
                            return added;
                          }
                        }}
                        onOpenCreateCustom={onOpenCreateCustom}
                        onCancelDelete={() => {
                          setMessages((m) => [
                            ...m,
                            {
                              id: `asst-${Date.now()}`,
                              sender: "assistant",
                              text: `Exclusão cancelada.`,
                              timestamp: new Date(),
                            },
                          ]);
                        }}
                        onClose={handleClose}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Initial Quick Suggestions Grid (Organized in compact grid, hidden when conversation advances) */}
          {messages.length <= 1 && (
            <div className="pt-2 pb-1 space-y-2">
              <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block px-1">
                Sugestões rápidas
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "⚡ Montar divisão ABC", cmd: "Montar divisão ABC" },
                  { label: "➕ Adicionar aquecimento", cmd: "Adicionar aquecimento" },
                  { label: "🔗 Combinar em bi-set", cmd: "Combinar em bi-set" },
                  { label: "⏱️ Ajustar descanso para 60s", cmd: "Ajustar descanso para 60s" },
                  { label: "🎯 4 séries de 10-12 reps", cmd: "4 séries de 10-12 reps" },
                  { label: "🔄 Substituir exercício", cmd: "Substituir exercício" },
                ].map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleExecuteCommand(sug.cmd)}
                    className="p-2.5 rounded-xl text-left text-xs font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-all cursor-pointer min-h-[44px] flex items-center gap-2 active:scale-[0.99]"
                  >
                    <span>{sug.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DRAFT WARNING (Student assignment guard) */}
          {flowState === "draft_warning" && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 space-y-3">
              <h4 className="text-sm font-black text-amber-700 dark:text-amber-200">⚠️ Treino ainda em Rascunho</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Alunos só podem receber versões oficiais devidamente publicadas. Deseja revisar e publicar agora?
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenPublishDialog();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer min-h-[40px]"
                >
                  Publicar Agora
                </button>
                <button
                  type="button"
                  onClick={() => setFlowState("idle")}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer min-h-[40px]"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* PUBLISHED WARNING (Prompt to create draft) */}
          {flowState === "published_warning" && (
            <div className="p-4 rounded-2xl bg-blue-500/15 border border-blue-500/30 space-y-3">
              <h4 className="text-sm font-black text-blue-700 dark:text-blue-200">🔒 Versão Publicada (V{version.versionNumber})</h4>
              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                Esta versão é oficial e somente leitura. Para adicionar novos exercícios ou alterar blocos, crie um novo rascunho de edição.
              </p>
              <div className="flex items-center gap-2 pt-1">
                {onCreateDraft && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onCreateDraft();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer min-h-[40px]"
                  >
                    Criar novo rascunho para editar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFlowState("idle")}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer min-h-[40px]"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* STUDENT AMBIGUITY RESOLUTION */}
          {flowState === "ambiguity" && (
            <div className="space-y-3 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)]">
                Mais de um aluno encontrado. Selecione o destinatário:
              </h4>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {matchedStudents.map((st) => (
                  <button
                    key={st.membershipPublicId}
                    type="button"
                    onClick={() => {
                      setSelectedStudents([st]);
                      checkExistingAssignmentNotice(st);
                      setFlowState("confirm_assignment");
                    }}
                    className="w-full p-2.5 rounded-xl border border-[var(--border-subtle)] hover:border-emerald-500 bg-[var(--surface)] flex items-center justify-between gap-2 text-left transition-all cursor-pointer min-h-[44px]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{st.name}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">{st.email}</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Selecionar →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CONFIRM ASSIGNMENT */}
          {flowState === "confirm_assignment" && (
            <div className="space-y-3 p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Atribuição de Treino
              </span>
              <h4 className="text-sm font-black text-[var(--text-primary)]">
                Enviar ficha {workout.title} (V{version.versionNumber}) para {selectedStudents.map((s) => s.name).join(", ")}?
              </h4>
              {assignmentNotice && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
                  ⚠️ {assignmentNotice}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFlowState("idle")}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer min-h-[40px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md cursor-pointer min-h-[40px]"
                >
                  Confirmar Envio
                </button>
              </div>
            </div>
          )}

          {/* ASSIGNMENT PROGRESS */}
          {flowState === "assigning" && (
            <div className="py-8 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-[var(--text-secondary)]">Atribuindo treino...</p>
            </div>
          )}

          {/* ASSIGNMENT SUCCESS */}
          {flowState === "assignment_success" && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-2">
              <span className="text-2xl block">🎉</span>
              <h4 className="text-sm font-black text-emerald-700 dark:text-emerald-200">Treino atribuído com sucesso!</h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300">
                Ficha enviada para {selectedStudents.map((s) => s.name).join(", ")}.
              </p>
              <button
                type="button"
                onClick={() => setFlowState("idle")}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer min-h-[36px]"
              >
                Concluir
              </button>
            </div>
          )}

          {/* ASSIGNMENT ERROR / PARTIAL FAILURE */}
          {flowState === "assignment_error" && (
            <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 space-y-3">
              <h4 className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-200">
                Resultado do envio:
              </h4>
              <div className="space-y-1.5 text-xs">
                {assignmentResults.map((res, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg flex items-center justify-between ${
                      res.ok ? "bg-emerald-950/40 text-emerald-400" : "bg-rose-950/40 text-rose-400"
                    }`}
                  >
                    <span className="font-bold">{res.studentName}</span>
                    <span>{res.ok ? "✓ Atribuído" : `✕ ${res.error}`}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setFlowState("idle")}
                className="px-4 py-2 rounded-xl bg-[var(--surface-subtle)] text-[var(--text-secondary)] font-bold text-xs cursor-pointer min-h-[36px]"
              >
                Voltar
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Input Bar: Multiline 3-line Textarea (>= 16px font to prevent iOS zoom) with Mic & Send */}
        <div className="p-3 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--surface)] shrink-0 space-y-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {isListening && (
            <div className="flex items-center gap-2 text-xs font-bold text-rose-500 animate-pulse px-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Ouvindo em Português... Diga seu comando agora</span>
            </div>
          )}

          {speechError && (
            <div className="text-xs text-amber-500 font-medium px-1">
              ⚠️ {speechError}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteCommand(commandInput);
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                rows={3}
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleExecuteCommand(commandInput);
                  }
                }}
                placeholder="Escreva ou dite o que deseja fazer (ex: 'Adicionar supino reto', 'Montar divisão ABC', 'Combinar em bi-set', 'Ajustar descanso para 60s')..."
                className="w-full px-3.5 py-2.5 text-base font-semibold rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none min-h-[72px] max-h-36 leading-snug"
              />
            </div>

            {/* Voice Mic Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                aria-label={isListening ? "Parar gravação" : "Falar comando por voz"}
                title={isListening ? "Parar gravação" : "Falar comando por voz"}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 min-h-[44px] min-w-[44px] ${
                  isListening
                    ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30"
                    : "bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-emerald-500 border border-[var(--border-default)]"
                }`}
              >
                {isListening ? (
                  <span className="text-base font-black">⏹</span>
                ) : (
                  <span className="text-lg">🎙️</span>
                )}
              </button>
            )}

            {/* Send Button */}
            <button
              type="submit"
              disabled={!commandInput.trim() || isExecuting}
              aria-label="Enviar comando"
              className="w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold flex items-center justify-center transition-all cursor-pointer shrink-0 min-h-[44px] min-w-[44px]"
            >
              {isExecuting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-base font-black">↑</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
