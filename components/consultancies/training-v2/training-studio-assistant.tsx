"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  WorkoutRootDto,
  WorkoutVersionDto,
  WorkoutBlockDto,
  WorkoutCombinationType,
} from "@/lib/training-v2/types";
import {
  searchActiveStudentsAction,
  assignWorkoutVersionAction,
  getStudentActiveWorkoutAssignmentAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import type { StudentSearchResult } from "@/lib/training-v2/assignment-repository";

type TrainingStudioAssistantProps = {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  workout: WorkoutRootDto;
  version: WorkoutVersionDto;
  categories: WorkoutBlockDto[];
  selectedCategoryPublicId?: string | null;
  onOpenExercisePicker: (categoryPublicId: string) => void;
  onOpenCreateCustom: (categoryPublicId: string) => void;
  onStartGuidedCombination: (type: WorkoutCombinationType) => void;
  onOpenPublishDialog: () => void;
  onCreateDraft?: () => void;
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

export function TrainingStudioAssistant({
  isOpen,
  onClose,
  consultancySlug,
  workout,
  version,
  categories,
  selectedCategoryPublicId,
  onOpenExercisePicker,
  onOpenCreateCustom,
  onStartGuidedCombination,
  onOpenPublishDialog,
  onCreateDraft,
}: TrainingStudioAssistantProps) {
  const [commandInput, setCommandInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    const win = window as IWindowWithSpeech;
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  });

  // Assistant Flow States: "idle" | "searching" | "ambiguity" | "draft_warning" | "published_warning" | "confirm_assignment" | "assigning" | "assignment_success" | "assignment_error"
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

  const effectiveCategoryId = selectedCategoryPublicId || categories[0]?.publicId || "";

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

  // Clean up speech recognition on component unmount
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

  // Check if student already has active assignment notice
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
            `O aluno ${student.name} já possui uma rotina atribuída (V${res.data.versionNumber}). Ao confirmar, a nova versão V${version.versionNumber} será ativada como a vigente.`
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

  // Student Assignment Flow Orchestrator
  const handleStudentAssignmentFlow = useCallback(
    async (studentNames: string[]) => {
      setErrorMessage(null);
      setFlowState("searching");

      // DRAFT Check Guard (Rule 15 - Step 5): NEVER assign draft as published!
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
              // Multiple matches for name -> homonym ambiguity resolution needed
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

        // Exact student(s) found! Check existing assignment for notice
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

  // Natural Language Command Interpreter
  const handleExecuteCommand = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const normalized = trimmed
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      // 1. Assignment Intent: "envie esse treino para...", "atribua essa ficha ao...", "enviar para..."
      const assignMatch =
        normalized.match(/(?:envie|enviar|atribua|atribuir|coloque|passa)\s+(?:esse\s+treino|essa\s+ficha|o\s+treino|a\s+ficha)?\s*(?:para|ao?|no?)\s+(.+)/i) ||
        normalized.match(/(?:envie|enviar|atribua|atribuir)\s+(?:para\s+)?(.+)/i);

      if (assignMatch && assignMatch[1]) {
        const rawTargetNames = assignMatch[1].trim();
        // Check if multiple names separated by " e ", ", ", " e para "
        const names = rawTargetNames
          .split(/(?:\s+e\s+|\s*,\s*|\s+e\s+para\s+)/i)
          .map((n) => n.trim())
          .filter(Boolean);

        await handleStudentAssignmentFlow(names);
        return;
      }

      // Check if command is an assembly/edit action
      const isAssemblyAction =
        normalized.includes("bi-set") ||
        normalized.includes("biset") ||
        normalized.includes("tri-set") ||
        normalized.includes("triset") ||
        normalized.includes("circuito") ||
        normalized.includes("personalizado") ||
        normalized.includes("criar exercicio") ||
        normalized.includes("novo exercicio") ||
        normalized.startsWith("adicione") ||
        normalized.startsWith("adicionar") ||
        normalized.startsWith("buscar") ||
        normalized.includes("exercicio");

      // Published workouts cannot be modified directly (Section 4 Rule)
      if (isAssemblyAction && version.status !== "DRAFT") {
        setFlowState("published_warning");
        return;
      }

      // 2. Combination: Bi-Set Intent
      if (normalized.includes("bi-set") || normalized.includes("biset")) {
        handleClose();
        onStartGuidedCombination("BI_SET");
        return;
      }

      // 3. Combination: Tri-Set Intent
      if (normalized.includes("tri-set") || normalized.includes("triset")) {
        handleClose();
        onStartGuidedCombination("TRI_SET");
        return;
      }

      // 4. Combination: Circuit Intent
      if (normalized.includes("circuito")) {
        handleClose();
        onStartGuidedCombination("CIRCUIT");
        return;
      }

      // 5. Add Custom Exercise Intent
      if (
        normalized.includes("personalizado") ||
        normalized.includes("criar exercicio") ||
        normalized.includes("novo exercicio")
      ) {
        handleClose();
        onOpenCreateCustom(effectiveCategoryId);
        return;
      }

      // 6. Add/Search Library Exercise Intent
      if (
        normalized.startsWith("adicione") ||
        normalized.startsWith("adicionar") ||
        normalized.startsWith("buscar") ||
        normalized.includes("exercicio")
      ) {
        handleClose();
        onOpenExercisePicker(effectiveCategoryId);
        return;
      }

      // Fallback: try searching student if it looks like a person's name
      if (trimmed.length > 2 && !trimmed.includes("treino")) {
        await handleStudentAssignmentFlow([trimmed]);
        return;
      }

      setErrorMessage(
        `Comando não compreendido: "${trimmed}". Tente comandos como: "Envie esse treino para Anny Santos", "Criar bi-set" ou "Adicionar supino".`
      );
    },
    [effectiveCategoryId, handleClose, handleStudentAssignmentFlow, onOpenCreateCustom, onOpenExercisePicker, onStartGuidedCombination, version.status]
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

  // Confirm and Execute Real Assignment (Rule 15 - Step 8)
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

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-900 dark:text-zinc-100"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-950/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
              ✨
            </div>
            <div>
              <h3 id="assistant-modal-title" className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                Assistente de Montagem Inteligente
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Comande por voz ou digitação para montar, agrupar ou atribuir este treino
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fechar assistente"
            className="w-9 h-9 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.08] flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Command Input Area with Mic */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900 space-y-3 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExecuteCommand(commandInput);
            }}
            className="relative flex items-center gap-2"
          >
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Digite ou fale: 'Envie esse treino para Anny', 'Criar bi-set'..."
              className="flex-1 px-4 py-3 text-xs sm:text-sm font-semibold rounded-2xl border border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[46px]"
              autoFocus
            />

            {/* Voice Mic Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                aria-label={isListening ? "Parar gravação" : "Falar comando"}
                title={isListening ? "Parar de ouvir" : "Falar comando por voz"}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs ${
                  isListening
                    ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 border border-zinc-300 dark:border-white/10"
                }`}
              >
                {isListening ? (
                  <span className="text-base font-black">⏹</span>
                ) : (
                  <span className="text-lg">🎙️</span>
                )}
              </button>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!commandInput.trim()}
              className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs sm:text-sm min-h-[46px] shadow-xs cursor-pointer shrink-0 transition-all"
            >
              Executar
            </button>
          </form>

          {isListening && (
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Ouvindo em Português... Fale o comando agora</span>
            </div>
          )}

          {speechError && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ {speechError}
            </p>
          )}

          {errorMessage && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Content & Flow States */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* STATE: DRAFT WARNING (Rule 15 - Step 5) */}
          {flowState === "draft_warning" && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                    Treino ainda não publicado
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    A rotina <strong>{workout.title}</strong> está no status de <strong>Rascunho V{version.versionNumber}</strong>. Alunos só podem receber versões oficiais devidamente publicadas.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    onOpenPublishDialog();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Revisar e Publicar Agora
                </button>
                <button
                  type="button"
                  onClick={() => setFlowState("idle")}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* STATE: PUBLISHED WARNING (Section 4 Rule: Prompt to create new draft) */}
          {flowState === "published_warning" && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔒</span>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-blue-950 dark:text-blue-200">
                    Versão Publicada (V{version.versionNumber}) — Somente Leitura
                  </h4>
                  <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                    Esta versão já foi publicada e é imutável para garantir a segurança dos alunos. Para adicionar exercícios ou criar novas combinações, crie um novo rascunho de edição.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {onCreateDraft && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onCreateDraft();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Criar novo rascunho para editar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFlowState("idle")}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* STATE: AMBIGUITY RESOLUTION (Rule 15 - Step 3) */}
          {flowState === "ambiguity" && (
            <div className="space-y-3">
              <h4 className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-white">
                Mais de um aluno encontrado. Toque para selecionar o aluno correto:
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {matchedStudents.map((st) => (
                  <button
                    key={st.membershipPublicId}
                    type="button"
                    onClick={() => {
                      setSelectedStudents([st]);
                      checkExistingAssignmentNotice(st);
                      setFlowState("confirm_assignment");
                    }}
                    className="w-full p-3 rounded-2xl border border-zinc-200 dark:border-white/10 hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 flex items-center justify-between gap-3 text-left transition-all cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {st.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {st.email}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Selecionar →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STATE: CONFIRM ASSIGNMENT (Rule 15 - Step 7) */}
          {flowState === "confirm_assignment" && (
            <div className="space-y-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Confirmação de Prescrição
                </span>
                <h4 className="text-sm sm:text-base font-black text-zinc-900 dark:text-white">
                  Deseja atribuir este treino ao aluno?
                </h4>
              </div>

              {/* Assignment Details Card */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-white/[0.06]">
                  <span className="text-zinc-500">Destinatário(s):</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {selectedStudents.map((s) => s.name).join(", ")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-white/[0.06]">
                  <span className="text-zinc-500">Ficha de Treino:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{workout.title}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-white/[0.06]">
                  <span className="text-zinc-500">Versão Oficial:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    V{version.versionNumber} (Publicada)
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-zinc-500">Data de Início:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">Hoje</span>
                </div>
              </div>

              {/* Existing Assignment Alert */}
              {assignmentNotice && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs leading-relaxed font-medium space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                    <span>⚠️</span>
                    <span>Substituir treino ativo:</span>
                  </div>
                  <div>{assignmentNotice}</div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFlowState("idle")}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer"
                >
                  Confirmar Atribuição
                </button>
              </div>
            </div>
          )}

          {/* STATE: ASSIGNING IN PROGRESS */}
          {flowState === "assigning" && (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">
                Atribuindo treino no sistema...
              </p>
            </div>
          )}

          {/* STATE: ASSIGNMENT SUCCESS (Rule 15 - Step 9) */}
          {flowState === "assignment_success" && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-center space-y-3">
              <span className="text-3xl block">🎉</span>
              <h4 className="text-base font-black text-emerald-950 dark:text-emerald-100">
                Treino atribuído com sucesso!
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                A ficha <strong>{workout.title}</strong> (V{version.versionNumber}) foi devidamente associada para{" "}
                <strong>{selectedStudents.map((s) => s.name).join(", ")}</strong>.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                {selectedStudents[0] && (
                  <a
                    href={`/consultoria/${consultancySlug}/progresso/alunos/${selectedStudents[0].membershipPublicId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Ver Aluno</span>
                    <span>→</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 font-bold text-xs cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          )}

          {/* STATE: ASSIGNMENT ERROR / PARTIAL SUCCESS */}
          {flowState === "assignment_error" && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 space-y-3">
              <h4 className="text-xs sm:text-sm font-black text-rose-900 dark:text-rose-200">
                Resultado do envio:
              </h4>
              <div className="space-y-1.5 text-xs">
                {assignmentResults.map((res, i) => (
                  <div
                    key={i}
                    className={`p-2 rounded-lg flex items-center justify-between ${
                      res.ok ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700" : "bg-rose-100 dark:bg-rose-950/40 text-rose-700"
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
                className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs cursor-pointer"
              >
                Voltar
              </button>
            </div>
          )}

          {/* Quick Action Chips (Always available in idle) */}
          {flowState === "idle" && (
            <div className="space-y-3">
              {version.status !== "DRAFT" && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-900 dark:text-blue-300 flex items-center justify-between gap-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <span>🔒</span>
                    <span>Versão Publicada (V{version.versionNumber})</span>
                  </span>
                  <span className="text-[11px] text-blue-700 dark:text-blue-400">
                    Atribuição direta ao aluno ativa
                  </span>
                </div>
              )}

              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Ações Rápidas do Assistente:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (version.status !== "DRAFT") {
                      setFlowState("published_warning");
                      return;
                    }
                    handleClose();
                    onOpenExercisePicker(effectiveCategoryId);
                  }}
                  className="p-3 rounded-2xl border border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 flex items-center gap-3 text-left transition-all cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm shrink-0">
                    +
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Adicionar Exercício</h5>
                    <p className="text-[10px] text-zinc-500">Buscar no catálogo ou biblioteca</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (version.status !== "DRAFT") {
                      setFlowState("published_warning");
                      return;
                    }
                    handleClose();
                    onStartGuidedCombination("BI_SET");
                  }}
                  className="p-3 rounded-2xl border border-zinc-200 dark:border-white/[0.08] hover:border-blue-500 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 flex items-center gap-3 text-left transition-all cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0">
                    2
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Criar Bi-Set</h5>
                    <p className="text-[10px] text-zinc-500">Combinar 2 exercícios seguidos</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (version.status !== "DRAFT") {
                      setFlowState("published_warning");
                      return;
                    }
                    handleClose();
                    onStartGuidedCombination("TRI_SET");
                  }}
                  className="p-3 rounded-2xl border border-zinc-200 dark:border-white/[0.08] hover:border-purple-500 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 flex items-center gap-3 text-left transition-all cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-sm shrink-0">
                    3
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Criar Tri-Set</h5>
                    <p className="text-[10px] text-zinc-500">Sequência de 3 exercícios</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (version.status !== "DRAFT") {
                      setFlowState("published_warning");
                      return;
                    }
                    handleClose();
                    onStartGuidedCombination("CIRCUIT");
                  }}
                  className="p-3 rounded-2xl border border-zinc-200 dark:border-white/[0.08] hover:border-amber-500 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 flex items-center gap-3 text-left transition-all cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm shrink-0">
                    ⚡
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Criar Circuito</h5>
                    <p className="text-[10px] text-zinc-500">4 ou mais estações</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (version.status !== "DRAFT") {
                      setFlowState("published_warning");
                      return;
                    }
                    handleClose();
                    onOpenCreateCustom(effectiveCategoryId);
                  }}
                  className="p-3 rounded-2xl border border-zinc-200 dark:border-white/[0.08] hover:border-teal-500 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 flex items-center gap-3 text-left transition-all cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center font-black text-sm shrink-0">
                    ✏️
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Exercício Personalizado</h5>
                    <p className="text-[10px] text-zinc-500">Criar com vídeo e instruções</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCommandInput("Envie esse treino para ");
                  }}
                  className="p-3 rounded-2xl border border-zinc-200 dark:border-white/[0.08] hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 flex items-center gap-3 text-left transition-all cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm shrink-0">
                    👤
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-white">Atribuir ao Aluno</h5>
                    <p className="text-[10px] text-zinc-500">Ex: &quot;Envie esse treino para Anny&quot;</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
