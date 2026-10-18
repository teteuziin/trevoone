"use client";

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type {
  ResolvedTrainingProposal,
  ResolvedTrainingCategory,
} from "@/lib/training-v2/training-ai-importer";
import { formatDurationNatural } from "@/lib/training-v2/reps-normalizer";

interface TrainingAiGenerateModalProps {
  consultancySlug: string;
  isOpen: boolean;
  onClose: () => void;
  targetStudentMembershipId?: number;
}

// Preset options preserved for fallback inference, editing and regression testing
export const OBJECTIVE_OPTIONS = [
  "Hipertrofia e Ganho de Massa Muscular",
  "Emagrecimento e Definição",
  "Força e Potência Muscular",
  "Condicionamento Geral e Resistência",
  "Reabilitação, Postura e Funcional",
];

export const LEVEL_OPTIONS = ["Iniciante", "Intermediário", "Avançado"];

export const SPLIT_OPTIONS = [
  "ABC (Push / Pull / Legs)",
  "ABCD (Peito e Tríceps, Costas e Bíceps, Pernas, Ombros)",
  "ABCDE (Músculo isolado por dia)",
  "Upper / Lower (Membros Superiores / Membros Inferiores)",
  "Full Body (Corpo Inteiro)",
  "A/B (Alternado Superior e Inferior)",
];

export const DAYS_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export const EQUIPMENT_OPTIONS = [
  "Academia Completa (Aparelhos, Polias, Barras e Halteres)",
  "Halteres e Barras Livres",
  "Peso Corporal / Calistenia",
  "Treino em Casa / Elásticos e Acessórios",
];

import {
  analyzeWorkoutDescription,
  type ParsedWorkoutInterpretation,
} from "@/lib/training-v2/training-ai-text-analyzer";

export { analyzeWorkoutDescription, type ParsedWorkoutInterpretation };


export function TrainingAiGenerateModal({
  consultancySlug,
  isOpen,
  onClose,
  targetStudentMembershipId,
}: TrainingAiGenerateModalProps) {
  const router = useRouter();

  // Steps: 'DESCRIBE' | 'CLARIFY' | 'SUMMARY' | 'GENERATING' | 'PREVIEW' | 'SAVING'
  const [step, setStep] = useState<"DESCRIBE" | "CLARIFY" | "SUMMARY" | "GENERATING" | "PREVIEW" | "SAVING">("DESCRIBE");

  // User input states
  const [description, setDescription] = useState("");
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");

  // Editable summary fields before generation
  const [title, setTitle] = useState("Nova Ficha Personalizada");
  const [confirmedDays, setConfirmedDays] = useState(4);
  const [confirmedDuration, setConfirmedDuration] = useState(50);
  const [confirmedObjective, setConfirmedObjective] = useState(OBJECTIVE_OPTIONS[0]);
  const [confirmedEquipment, setConfirmedEquipment] = useState(EQUIPMENT_OPTIONS[0]);
  const [confirmedLevel, setConfirmedLevel] = useState<string | null>(null);
  const [confirmedFocus, setConfirmedFocus] = useState<string | null>(null);
  const [confirmedRestrictions, setConfirmedRestrictions] = useState("");

  // Students list
  const [students, setStudents] = useState<
    Array<{ membershipId: number; fullName: string; email: string }>
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    targetStudentMembershipId || null
  );

  // Generation & Review state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ResolvedTrainingProposal | null>(null);
  const [editableCategories, setEditableCategories] = useState<ResolvedTrainingCategory[]>([]);
  const [workoutTitle, setWorkoutTitle] = useState("");

  // Quota info
  const [quota, setQuota] = useState<{
    usedToday: number;
    dailyLimit: number;
    remainingToday: number;
    canImport: boolean;
    blockReason?: string;
  } | null>(null);

  // Idempotency key per generation workflow
  const idempotencyKeyRef = useRef<string>("");

  const handleClose = useCallback(() => {
    if (step === "GENERATING" || step === "SAVING") return;
    if (description.trim() && step !== "PREVIEW") {
      const confirmDiscard = window.confirm("Deseja fechar o assistente? As alterações não salvas serão descartadas.");
      if (!confirmDiscard) return;
    }
    setStep("DESCRIBE");
    setDescription("");
    setClarificationAnswer("");
    setErrorMessage(null);
    setProposal(null);
    idempotencyKeyRef.current = "";
    onClose();
  }, [step, description, onClose]);

  // Fetch quota & students on modal open
  useEffect(() => {
    if (!isOpen) return;

    fetch(`/api/consultancies/${consultancySlug}/ai/usage`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.quota) {
          setQuota({
            usedToday: data.quota.memberUsedToday,
            dailyLimit: data.quota.memberLimit,
            remainingToday: data.quota.effectiveRemaining,
            canImport: data.quota.canImport,
            blockReason: data.quota.blockReason,
          });
        }
      })
      .catch(() => {});

    fetch(`/api/consultancies/${consultancySlug}/training-v2/students`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.students)) {
          setStudents(data.students);
        }
      })
      .catch(() => {});
  }, [isOpen, consultancySlug]);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !mounted) return null;

  // STEP 1: Professional submitted description
  const handleProceedFromDescription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage("Por favor, descreva como deseja montar o treino.");
      return;
    }
    setErrorMessage(null);

    const interp = analyzeWorkoutDescription(description);

    // Apply values found to confirmed states
    if (interp.daysPerWeek) setConfirmedDays(interp.daysPerWeek);
    if (interp.durationMinutes) setConfirmedDuration(interp.durationMinutes);
    if (interp.objective) setConfirmedObjective(interp.objective);
    if (interp.equipment) setConfirmedEquipment(interp.equipment);
    if (interp.level) setConfirmedLevel(interp.level);
    if (interp.focusMuscles) setConfirmedFocus(interp.focusMuscles);
    if (interp.restrictions) setConfirmedRestrictions(interp.restrictions);

    // Dynamic Title suggestion based on input
    const titleObj = interp.objective ? interp.objective.split(" ")[0] : "Treino";
    const titleDays = interp.daysPerWeek ? `${interp.daysPerWeek}D` : "Personalizado";
    setTitle(`Ficha ${titleObj} ${titleDays}`);

    if (interp.isComplete) {
      // Input is already complete! Skip directly to SUMMARY without redundant questions.
      setStep("SUMMARY");
    } else {
      // Missing essential info or contradiction: ask 1 short natural question
      setCurrentQuestion(interp.clarificationQuestion || "Quantos dias por semana e quanto tempo por sessão?");
      setStep("CLARIFY");
    }
  };

  // STEP 2: Professional answered clarification question
  const handleProceedFromClarification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarificationAnswer.trim()) {
      setErrorMessage("Por favor, responda à pergunta para continuar ou volte para ajustar a descrição.");
      return;
    }
    setErrorMessage(null);

    // Combine original description with the clarification answer and re-analyze
    const combinedText = `${description}\nComplemento: ${clarificationAnswer}`;
    const interp = analyzeWorkoutDescription(combinedText);

    if (interp.daysPerWeek) setConfirmedDays(interp.daysPerWeek);
    if (interp.durationMinutes) setConfirmedDuration(interp.durationMinutes);
    if (interp.objective) setConfirmedObjective(interp.objective);
    if (interp.equipment) setConfirmedEquipment(interp.equipment);
    if (interp.level) setConfirmedLevel(interp.level);
    if (interp.focusMuscles) setConfirmedFocus(interp.focusMuscles);
    if (interp.restrictions) setConfirmedRestrictions(interp.restrictions);

    setStep("SUMMARY");
  };

  // STEP 3: Generate proposal using full composed prompt & idempotencyKey
  const handleGenerateProposal = async () => {
    setErrorMessage(null);
    setStep("GENERATING");

    const frequencyText =
      confirmedDays === 1
        ? "1 dia (sessão única / treino completo)"
        : `${confirmedDays} dias por semana`;

    const orientationText =
      confirmedDays === 1
        ? `Monte uma rotina de treino estruturada de sessão única (1 bloco ou divisão principal completa). Crie uma categoria válida (ex: "Treino Principal" ou "Full Body") com seus exercícios adequados aos equipamentos (${confirmedEquipment}) e à duração de ${confirmedDuration} min.`
        : `Monte uma rotina de treino estruturada e dividida exatamente em ${confirmedDays} sessões. Para cada divisão (ex: Treino A, Treino B, etc.), crie uma categoria com seus exercícios adequados aos equipamentos (${confirmedEquipment}) e à duração de ${confirmedDuration} min.`;

    const composedPrompt = `PROPOSTA DE TREINO PERSONALIZADO
Título sugerido: ${title.trim() || "Ficha de Treino"}
Descrição do profissional: ${description.trim()}
${clarificationAnswer.trim() ? `Esclarecimentos adicionais: ${clarificationAnswer.trim()}\n` : ""}
Parâmetros acordados:
- Frequência: ${frequencyText}
- Duração estimada: até ${confirmedDuration} minutos por sessão
- Objetivo: ${confirmedObjective}
- Equipamentos: ${confirmedEquipment}
${confirmedLevel ? `- Nível de aptidão informado: ${confirmedLevel}\n` : ""}
${confirmedFocus ? `- Foco / Grupos prioritários: ${confirmedFocus}\n` : ""}
${confirmedRestrictions ? `- Restrições e cuidados de saúde: ${confirmedRestrictions}\n` : ""}

Orientações de prescrição:
${orientationText}
Defina séries, repetições e intervalos de descanso para cada exercício. Respeite com fidelidade as restrições informadas sem extrapolações clínicas.`;

    try {
      const formData = new FormData();
      formData.append("text", composedPrompt);
      formData.append("mode", "GENERATE");
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      }
      formData.append("idempotencyKey", idempotencyKeyRef.current);

      const studentIdToSend = selectedStudentId || targetStudentMembershipId;
      if (studentIdToSend) {
        formData.append("targetStudentMembershipId", String(studentIdToSend));
      }

      const res = await fetch(`/api/consultancies/${consultancySlug}/ai/training-import`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Erro ao gerar proposta de treino com IA.");
      }

      const prop: ResolvedTrainingProposal = data.proposal;
      if (!prop || !Array.isArray(prop.categories) || prop.categories.length === 0) {
        throw new Error(
          "A IA não retornou nenhuma divisão de treino. Por favor, detalhe mais seu pedido e tente novamente."
        );
      }

      const totalExercises = prop.categories.reduce(
        (acc, c) => acc + (Array.isArray(c?.exercises) ? c.exercises.length : 0),
        0
      );
      if (totalExercises === 0) {
        throw new Error(
          "A IA não retornou exercícios estruturados para esta proposta. Por favor, detalhe os exercícios ou grupos musculares desejados e tente novamente."
        );
      }

      setProposal(prop);
      setWorkoutTitle(prop.title || title);
      setEditableCategories(prop.categories || []);
      setErrorMessage(null);
      setStep("PREVIEW");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Falha na geração do treino.");
      setStep("SUMMARY");
    }
  };

  // STEP 4: Save proposal as official DRAFT and redirect to workout builder
  const handleSaveDraft = async () => {
    if (!proposal) return;
    if (!editableCategories || editableCategories.length === 0) {
      setErrorMessage("O treino precisa conter pelo menos uma divisão/categoria para ser salvo.");
      return;
    }
    const totalExercises = editableCategories.reduce(
      (acc, c) => acc + (Array.isArray(c?.exercises) ? c.exercises.length : 0),
      0
    );
    if (totalExercises === 0) {
      setErrorMessage("O treino precisa conter pelo menos um exercício para ser salvo.");
      return;
    }

    setErrorMessage(null);
    setStep("SAVING");

    try {
      const finalStudentId = selectedStudentId || targetStudentMembershipId || null;

      const res = await fetch(
        `/api/consultancies/${consultancySlug}/ai/training-import/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobPublicId: proposal.jobPublicId,
            targetStudentMembershipId: finalStudentId,
            confirmedTitle: workoutTitle.trim() || proposal.title,
            confirmedCategories: editableCategories,
          }),
        }
      );

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Erro ao salvar rascunho da rotina.");
      }

      onClose();
      router.push(`/consultoria/${consultancySlug}/rotinas/${data.workoutPublicId}`);
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Falha ao salvar rascunho.");
      setStep("PREVIEW");
    }
  };

  // Build the compact badge summary text (only when informed!)
  const summaryBadges: string[] = [];
  summaryBadges.push(confirmedDays === 1 ? "1 dia (treino único)" : `${confirmedDays} dias por semana`);
  summaryBadges.push(`até ${confirmedDuration} min`);
  if (confirmedObjective) summaryBadges.push(confirmedObjective.split(" ")[0].toLowerCase());
  if (confirmedEquipment) {
    if (confirmedEquipment.includes("Academia Completa")) summaryBadges.push("academia completa");
    else if (confirmedEquipment.includes("Halteres")) summaryBadges.push("halteres e barras");
    else if (confirmedEquipment.includes("Peso Corporal")) summaryBadges.push("peso corporal");
    else summaryBadges.push("em casa");
  }
  if (confirmedLevel) summaryBadges.push(confirmedLevel.toLowerCase());
  if (confirmedFocus) summaryBadges.push(`foco em ${confirmedFocus}`);

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-generate-modal-title"
    >
      <div
        className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-[840px] bg-white dark:bg-[#151619] sm:border border-zinc-200 dark:border-zinc-800 rounded-none sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#151619]">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 id="ai-generate-modal-title" className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                Criar treino com IA
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {step === "PREVIEW" ? "Revise a proposta antes de salvar como rascunho" : "Descreva como deseja prescrever a ficha"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={step === "GENERATING" || step === "SAVING"}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
          {/* Quota Banner */}
          {quota && (
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-400">
                Cota diária: <strong className="text-zinc-900 dark:text-white">{quota.usedToday}</strong> de{" "}
                <strong className="text-zinc-900 dark:text-white">{quota.dailyLimit}</strong> fichas utilizadas
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Restam: {quota.remainingToday}
              </span>
            </div>
          )}

          {/* Error message (only when not in PREVIEW, since PREVIEW has its own contextual banner) */}
          {errorMessage && step !== "PREVIEW" && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errorMessage}
            </div>
          )}

          {/* STEP 1: DESCRIBE (Main text entry — no initial selects) */}
          {step === "DESCRIBE" && (
            <form onSubmit={handleProceedFromDescription} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="ai-training-description" className="block text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                  Como você quer montar esse treino?
                </label>
                <textarea
                  id="ai-training-description"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: Treino de hipertrofia para um aluno intermediário, 4 dias por semana, até 50 minutos por sessão, em academia completa. Quero priorizar costas e pernas."
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 leading-relaxed resize-y min-h-[140px]"
                  required
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal">
                  Conte o objetivo, os dias disponíveis, o tempo por sessão e os equipamentos. Inclua também preferências e restrições.
                </p>
              </div>

              {/* Student Tagging (Draft linkage disclaimer) */}
              <div className="space-y-1.5 pt-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Vincular rascunho a um aluno (opcional)
                </label>
                {targetStudentMembershipId ? (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                    Rascunho contextualizado para o aluno desta página.
                  </div>
                ) : (
                  <select
                    value={selectedStudentId || ""}
                    onChange={(e) =>
                      setSelectedStudentId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 text-base sm:text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 min-h-[44px]"
                  >
                    <option value="">Nenhum (salvar como ficha geral / modelo)</option>
                    {students.map((st) => (
                      <option key={st.membershipId} value={st.membershipId}>
                        {st.fullName} ({st.email})
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  A atribuição definitiva do treino ao aluno ocorre apenas após a publicação.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={quota?.remainingToday === 0 || !description.trim()}
                  className="px-6 py-2.5 min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Continuar</span>
                  <span>→</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: CLARIFY (Short natural conversation when info is missing) */}
          {step === "CLARIFY" && (
            <form onSubmit={handleProceedFromClarification} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1.5">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 block uppercase tracking-wider text-[10px]">
                  Sua descrição inicial:
                </span>
                <p className="text-zinc-800 dark:text-zinc-200 italic line-clamp-3">
                  &ldquo;{description}&rdquo;
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="ai-clarification-answer" className="block text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                  {currentQuestion}
                </label>
                <input
                  id="ai-clarification-answer"
                  type="text"
                  value={clarificationAnswer}
                  onChange={(e) => setClarificationAnswer(e.target.value)}
                  placeholder="Ex.: 4 dias por semana, cerca de 50 minutos por sessão."
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-3 text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 min-h-[48px]"
                  autoFocus
                  required
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Responda escrevendo normalmente para definirmos a estrutura exata do treino.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep("DESCRIBE")}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  ← Editar descrição
                </button>
                <button
                  type="submit"
                  disabled={!clarificationAnswer.trim()}
                  className="px-6 py-2.5 min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Continuar</span>
                  <span>→</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUMMARY (Compact, editable overview before generation) */}
          {step === "SUMMARY" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Resumo do que foi entendido
                </span>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                  <div className="flex flex-wrap gap-2 text-xs">
                    {summaryBadges.map((badge, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/20"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 italic pt-1">
                    &ldquo;{description}&rdquo;
                    {clarificationAnswer.trim() ? ` — ${clarificationAnswer.trim()}` : ""}
                  </p>
                </div>
              </div>

              {/* Title parameter */}
              <div>
                <label htmlFor="ai-summary-title" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Nome da ficha
                </label>
                <input
                  id="ai-summary-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 min-h-[44px]"
                  placeholder="Ex: Treino Hipertrofia ABCD"
                />
              </div>

              {/* Collapsible fine tuning */}
              <details className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-3.5 text-xs group">
                <summary className="font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none list-none flex items-center justify-between">
                  <span>Ajustar parâmetros detalhados (opcional)</span>
                  <span className="text-zinc-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="pt-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                        Frequência semanal
                      </label>
                      <select
                        value={confirmedDays}
                        onChange={(e) => setConfirmedDays(Number(e.target.value))}
                        className="w-full rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white"
                      >
                        {DAYS_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d === 1 ? "1 dia (treino único)" : `${d} dias por semana`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                        Duração da sessão
                      </label>
                      <select
                        value={confirmedDuration}
                        onChange={(e) => setConfirmedDuration(Number(e.target.value))}
                        className="w-full rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white"
                      >
                        {[30, 40, 45, 50, 60, 75, 90].map((m) => (
                          <option key={m} value={m}>
                            Até {m} minutos
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Equipamentos
                    </label>
                    <select
                      value={confirmedEquipment}
                      onChange={(e) => setConfirmedEquipment(e.target.value)}
                      className="w-full rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-white"
                    >
                      {EQUIPMENT_OPTIONS.map((eq) => (
                        <option key={eq} value={eq}>
                          {eq}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </details>

              <div className="pt-3 flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep("DESCRIBE")}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  ← Editar descrição
                </button>
                <button
                  type="button"
                  onClick={handleGenerateProposal}
                  disabled={quota?.remainingToday === 0}
                  className="px-6 py-2.5 min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Gerar proposta</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: GENERATING */}
          {step === "GENERATING" && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 animate-pulse text-emerald-600 dark:text-emerald-400">
                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                  Construindo sua ficha personalizada...
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                  Dividindo os treinos, selecionando exercícios compatíveis e calculando repetições e descansos ideais.
                </p>
              </div>
            </div>
          )}

          {/* STEP 5: PREVIEW (Review proposal before saving draft) */}
          {step === "PREVIEW" && proposal && (
            <div className="space-y-4">
              {/* Contextual Banner: Never show conflicting success & error banners */}
              {errorMessage ? (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-600 dark:text-rose-400">⚠️ Erro ao salvar:</span>
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer text-xs shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <span className="font-bold">✓ Proposta pronta para revisão!</span>
                  <span>Esta ficha será salva estritamente como Rascunho para você revisar no editor.</span>
                </div>
              )}

              <div>
                <label htmlFor="ai-preview-title" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Título do Treino
                </label>
                <input
                  id="ai-preview-title"
                  type="text"
                  value={workoutTitle}
                  onChange={(e) => setWorkoutTitle(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm sm:text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              <div className="space-y-4 max-h-[58vh] sm:max-h-[62vh] overflow-y-auto pr-1">
                {editableCategories.map((cat, cIdx) => {
                  // Group contiguous exercises by combinationIndex if present
                  type Cluster =
                    | {
                        type: "COMBINATION";
                        combinationIndex: number;
                        combinationType: string;
                        rounds: number;
                        restSeconds: number;
                        items: typeof cat.exercises;
                      }
                    | {
                        type: "SINGLE";
                        item: (typeof cat.exercises)[0];
                        originalIndex: number;
                      };

                  const clusters: Cluster[] = [];
                  let activeComb: {
                    combinationIndex: number;
                    combinationType: string;
                    rounds: number;
                    restSeconds: number;
                    items: typeof cat.exercises;
                  } | null = null;

                  for (let eIdx = 0; eIdx < cat.exercises.length; eIdx++) {
                    const ex = cat.exercises[eIdx];
                    if (ex.combinationIndex != null) {
                      if (activeComb && activeComb.combinationIndex === ex.combinationIndex) {
                        activeComb.items.push(ex);
                      } else {
                        if (activeComb) {
                          clusters.push({
                            type: "COMBINATION",
                            combinationIndex: activeComb.combinationIndex,
                            combinationType: activeComb.combinationType,
                            rounds: activeComb.rounds,
                            restSeconds: activeComb.restSeconds,
                            items: activeComb.items,
                          });
                        }
                        activeComb = {
                          combinationIndex: ex.combinationIndex,
                          combinationType: ex.combinationType || "BI_SET",
                          rounds: ex.sets || 3,
                          restSeconds: ex.combinationRestSeconds ?? 60,
                          items: [ex],
                        };
                      }
                    } else {
                      if (activeComb) {
                        clusters.push({
                          type: "COMBINATION",
                          combinationIndex: activeComb.combinationIndex,
                          combinationType: activeComb.combinationType,
                          rounds: activeComb.rounds,
                          restSeconds: activeComb.restSeconds,
                          items: activeComb.items,
                        });
                        activeComb = null;
                      }
                      clusters.push({ type: "SINGLE", item: ex, originalIndex: eIdx });
                    }
                  }
                  if (activeComb) {
                    clusters.push({
                      type: "COMBINATION",
                      combinationIndex: activeComb.combinationIndex,
                      combinationType: activeComb.combinationType,
                      rounds: activeComb.rounds,
                      restSeconds: activeComb.restSeconds,
                      items: activeComb.items,
                    });
                  }

                  return (
                    <div
                      key={`cat-${cIdx}`}
                      className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 bg-zinc-50 dark:bg-zinc-900/60 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider pb-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                            Divisão {String.fromCharCode(65 + cIdx)}
                          </span>
                          <span className="text-zinc-900 dark:text-white text-xs">{cat.name}</span>
                        </div>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal font-mono">
                          {cat.exercises.length} {cat.exercises.length === 1 ? "exercício" : "exercícios"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {clusters.map((cluster, clIdx) => {
                          if (cluster.type === "COMBINATION") {
                            const typeLabel =
                              cluster.combinationType === "TRI_SET"
                                ? "Tri-set"
                                : cluster.combinationType === "CIRCUIT"
                                ? "Circuito"
                                : "Bi-set";

                            return (
                              <div
                                key={`comb-${cIdx}-${clIdx}`}
                                className="bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl p-3 space-y-2.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-1.5 border-b border-emerald-500/15">
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                                    <span className="text-sm">⚡</span>
                                    <span>{typeLabel}</span>
                                    <span className="font-normal text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
                                      ({cluster.items.length} exercícios)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                                    {cluster.rounds} rodadas · {cluster.restSeconds}s descanso final
                                  </div>
                                </div>

                                <div className="space-y-2 pl-0.5 sm:pl-1">
                                  {cluster.items.map((ex, mIdx) => (
                                    <div
                                      key={`comb-m-${cIdx}-${clIdx}-${mIdx}`}
                                      className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs flex items-start gap-2.5 shadow-2xs"
                                    >
                                      <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5 border border-emerald-500/20">
                                        {String.fromCharCode(65 + mIdx)}
                                      </span>
                                      <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                                          <span className="font-semibold text-zinc-900 dark:text-white break-words">
                                            {ex.exerciseNameSnapshot}
                                          </span>
                                          {ex.matchStatus === "MATCHED" ? (
                                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                                              ✓ Na biblioteca
                                            </span>
                                          ) : ex.matchStatus === "AMBIGUOUS" ? (
                                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                                              ⚠️ Similar
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20 shrink-0">
                                              ✨ Personalizado
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono flex flex-wrap items-center gap-x-2">
                                          <span>
                                            {ex.sets || 3} séries ×{" "}
                                            {ex.reps
                                              ? ex.repsMax && ex.repsMax > ex.reps
                                                ? `${ex.reps}–${ex.repsMax} reps`
                                                : `${ex.reps} reps`
                                              : ex.durationSeconds
                                              ? formatDurationNatural(ex.durationSeconds, ex.durationUnit)
                                              : "livre"}
                                          </span>
                                          {ex.load ? <span>· Carga: {ex.load}kg</span> : null}
                                          {ex.notes ? <span className="italic text-zinc-400">· {ex.notes}</span> : null}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          // Single Exercise
                          const ex = cluster.item;
                          return (
                            <div
                              key={`single-${cIdx}-${cluster.originalIndex}`}
                              className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs space-y-1 shadow-2xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="font-semibold text-zinc-900 dark:text-white break-words flex items-center gap-2">
                                  <span>{ex.exerciseNameSnapshot}</span>
                                  {ex.muscleGroupSnapshot ? (
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                                      {ex.muscleGroupSnapshot}
                                    </span>
                                  ) : null}
                                </div>
                                {ex.matchStatus === "MATCHED" ? (
                                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                                    ✓ Na biblioteca
                                  </span>
                                ) : ex.matchStatus === "AMBIGUOUS" ? (
                                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                                    ⚠️ Similar
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20 shrink-0">
                                    ✨ Personalizado
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono flex flex-wrap items-center gap-x-2">
                                <span>
                                  {ex.sets || 3} séries ×{" "}
                                  {ex.reps
                                    ? ex.repsMax && ex.repsMax > ex.reps
                                      ? `${ex.reps}–${ex.repsMax} reps`
                                      : `${ex.reps} reps`
                                    : ex.durationSeconds
                                    ? formatDurationNatural(ex.durationSeconds, ex.durationUnit)
                                    : "livre"}
                                </span>
                                {ex.restSeconds ? <span>· Descanso: {ex.restSeconds}s</span> : null}
                                {ex.load ? <span>· Carga: {ex.load}kg</span> : null}
                                {ex.notes ? <span className="italic text-zinc-400">· {ex.notes}</span> : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 flex items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep("SUMMARY")}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  ← Ajustar parâmetros
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-5 py-2.5 min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Salvar rascunho e abrir no editor</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: SAVING */}
          {step === "SAVING" && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 animate-pulse text-emerald-600">
                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                  Salvando rascunho de treino...
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Redirecionando para o editor para você conferir e personalizar os detalhes.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
