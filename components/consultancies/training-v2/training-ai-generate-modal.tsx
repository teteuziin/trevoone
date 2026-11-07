"use client";

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type {
  ResolvedTrainingProposal,
  ResolvedTrainingCategory,
} from "@/lib/training-v2/training-ai-importer";
import { formatDurationNatural } from "@/lib/training-v2/reps-normalizer";

// Standard options preserved for fallback inference, editing and regression testing
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

interface StudentOption {
  membershipId: number;
  membershipPublicId: string;
  name: string;
  email: string;
  objective?: string | null;
  frequency?: string | null;
  experience?: string | null;
  restrictions?: string | null;
}

interface TrainingAiGenerateModalProps {
  consultancySlug: string;
  isOpen: boolean;
  onClose: () => void;
  targetStudentMembershipId?: number;
}

const QUICK_OBJECTIVES = [
  { id: "hipertrofia", label: "Hipertrofia", desc: "Ganho de massa", icon: "💪", full: "Hipertrofia e Ganho de Massa Muscular" },
  { id: "emagrecimento", label: "Emagrecimento", desc: "Perda de gordura", icon: "🔥", full: "Emagrecimento e Definição" },
  { id: "definicao", label: "Definição", desc: "Tônus muscular", icon: "✨", full: "Definição Muscular e Tônus" },
  { id: "forca", label: "Força", desc: "Cargas e potência", icon: "⚡", full: "Força e Potência Muscular" },
  { id: "condicionamento", label: "Condicionamento", desc: "Resistência geral", icon: "🏃", full: "Condicionamento Geral e Resistência" },
  { id: "outro", label: "Outro", desc: "Personalizado", icon: "✏️", full: "" },
];

const SPLIT_DESCRIPTIONS: Record<number, string> = {
  1: "Treino único completo (Full Body / Corpo inteiro)",
  2: "Divisão A / B (ex: Membros Superiores e Membros Inferiores)",
  3: "Divisão A / B / C (ex: Push / Pull / Legs)",
  4: "Divisão A / B / C / D (ex: Peito/Tríceps, Costas/Bíceps, Pernas, Ombros)",
  5: "Divisão A / B / C / D / E (Grupamentos isolados por dia)",
  6: "Divisão A / B / C 2x por semana (Rotina de alta frequência)",
  7: "Divisão diária contínua com dias regenerativos",
};

export function TrainingAiGenerateModal({
  consultancySlug,
  isOpen,
  onClose,
  targetStudentMembershipId,
}: TrainingAiGenerateModalProps) {
  const router = useRouter();

  // Steps: 'FORM' | 'DESCRIBE' | 'CLARIFY' | 'SUMMARY' | 'GENERATING' | 'PREVIEW' | 'SAVING'
  const [step, setStep] = useState<"FORM" | "DESCRIBE" | "CLARIFY" | "SUMMARY" | "GENERATING" | "PREVIEW" | "SAVING">("FORM");

  // Core Form states (Simple, guided, no prompts required)
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>("hipertrofia");
  const [customObjectiveText, setCustomObjectiveText] = useState("");
  const [selectedDays, setSelectedDays] = useState<number>(4);
  const [selectedEquipment, setSelectedEquipment] = useState<string>(EQUIPMENT_OPTIONS[0]);
  const [selectedDuration, setSelectedDuration] = useState<number>(50);
  const [selectedLevel, setSelectedLevel] = useState<string>("Intermediário");

  // Restrictions check
  const [hasRestrictions, setHasRestrictions] = useState<boolean | null>(false);
  const [restrictionsText, setRestrictionsText] = useState("");

  // Optional customizations accordion
  const [focusMuscles, setFocusMuscles] = useState<string>("");
  const [preferencesText, setPreferencesText] = useState("");
  const [customTitle, setCustomTitle] = useState("");

  // Student selection state
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    targetStudentMembershipId || null
  );
  const [studentPrefillNote, setStudentPrefillNote] = useState<string | null>(null);

  // Proposal preview and persistence state
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

  // Loading animation message index
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const handleClose = useCallback(() => {
    if (step === "GENERATING" || step === "SAVING") return;
    setStep("FORM");
    setErrorMessage(null);
    setProposal(null);
    idempotencyKeyRef.current = "";
    onClose();
  }, [step, onClose]);

  const applyStudentData = useCallback((currentStudent: StudentOption) => {
    const notes: string[] = [];

    // 1. Objective prefill
    if (currentStudent.objective) {
      const lower = currentStudent.objective.toLowerCase();
      if (lower.includes("hipertrofia") || lower.includes("massa")) {
        setSelectedObjectiveId("hipertrofia");
        notes.push("Objetivo: Hipertrofia");
      } else if (lower.includes("emagrec") || lower.includes("gordura") || lower.includes("peso")) {
        setSelectedObjectiveId("emagrecimento");
        notes.push("Objetivo: Emagrecimento");
      } else if (lower.includes("defini")) {
        setSelectedObjectiveId("definicao");
        notes.push("Objetivo: Definição");
      } else if (lower.includes("força") || lower.includes("forca")) {
        setSelectedObjectiveId("forca");
        notes.push("Objetivo: Força");
      } else if (lower.includes("condicionamento") || lower.includes("saúde") || lower.includes("saude")) {
        setSelectedObjectiveId("condicionamento");
        notes.push("Objetivo: Condicionamento");
      } else {
        setSelectedObjectiveId("outro");
        setCustomObjectiveText(currentStudent.objective);
        notes.push(`Objetivo: ${currentStudent.objective}`);
      }
    }

    // 2. Frequency prefill
    if (currentStudent.frequency) {
      const match = currentStudent.frequency.match(/([1-7])\s*(?:dias|x|vezes)/i);
      if (match && match[1]) {
        const days = Number(match[1]);
        if (days >= 1 && days <= 7) {
          setSelectedDays(days);
          notes.push(`Frequência: ${days} dias/sem`);
        }
      }
    }

    // 3. Experience prefill
    if (currentStudent.experience) {
      const lowerExp = currentStudent.experience.toLowerCase();
      if (lowerExp.includes("iniciante") || lowerExp.includes("começando") || lowerExp.includes("nunca")) {
        setSelectedLevel("Iniciante");
        notes.push("Nível: Iniciante");
      } else if (lowerExp.includes("avançado") || lowerExp.includes("avancado") || lowerExp.includes("anos")) {
        setSelectedLevel("Avançado");
        notes.push("Nível: Avançado");
      } else {
        setSelectedLevel("Intermediário");
        notes.push("Nível: Intermediário");
      }
    }

    // 4. Restrictions / injuries prefill
    if (currentStudent.restrictions && currentStudent.restrictions.trim().length > 0) {
      setHasRestrictions(true);
      setRestrictionsText(currentStudent.restrictions.trim());
      notes.push(`Restrições: ${currentStudent.restrictions.trim()}`);
    }

    if (notes.length > 0) {
      setStudentPrefillNote(notes.join(" • "));
    } else {
      setStudentPrefillNote(null);
    }
  }, []);

  const handleStudentSelect = useCallback((newId: number | null) => {
    setSelectedStudentId(newId);
    if (!newId) {
      setStudentPrefillNote(null);
      return;
    }
    const matching = students.find((s) => s.membershipId === newId);
    if (matching) {
      applyStudentData(matching);
    }
  }, [students, applyStudentData]);

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

    fetch(`/api/consultancies/${consultancySlug}/students`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.students)) {
          setStudents(data.students);
          const initialId = targetStudentMembershipId || selectedStudentId;
          if (initialId) {
            const matching = (data.students as StudentOption[]).find((s) => s.membershipId === initialId);
            if (matching) {
              applyStudentData(matching);
            }
          }
        }
      })
      .catch(() => {});
  }, [isOpen, consultancySlug, targetStudentMembershipId, selectedStudentId, applyStudentData]);

  // Loading animation message cycle
  useEffect(() => {
    if (step !== "GENERATING") return;
    const messages = [
      "Estruturando as divisões do treino...",
      "Selecionando os melhores exercícios...",
      "Configurando séries, repetições e intervalos ideais...",
      "Garantindo equilíbrio muscular e segurança biomecânica...",
    ];
    const timer = setInterval(() => {
      setLoadingMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [step]);

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

  // Selected student entity
  const activeStudent = students.find((s) => s.membershipId === selectedStudentId);

  // Resolved final objective string
  const resolvedObjective =
    selectedObjectiveId === "outro"
      ? customObjectiveText.trim() || "Treino Personalizado"
      : QUICK_OBJECTIVES.find((o) => o.id === selectedObjectiveId)?.full || "Hipertrofia e Ganho de Massa Muscular";

  // Auto-generate title suggestion
  const suggestedTitle =
    customTitle.trim() ||
    (selectedDays === 1
      ? `Ficha ${resolvedObjective.split(" ")[0]} - Treino Único`
      : `Ficha ${resolvedObjective.split(" ")[0]} ${selectedDays}D`);

  // Handle Generation
  const handleGenerateFromEasyForm = async () => {
    setErrorMessage(null);
    setStep("GENERATING");

    const frequencyText =
      selectedDays === 1
        ? "1 dia (sessão única / treino completo Full Body)"
        : `${selectedDays} dias por semana`;

    const orientationText =
      selectedDays === 1
        ? `Monte uma rotina de treino estruturada de sessão única (1 bloco ou divisão principal completa). Crie uma categoria válida (ex: "Treino Principal" ou "Full Body") com seus exercícios adequados aos equipamentos (${selectedEquipment}) e à duração de ${selectedDuration} min.`
        : `Monte uma rotina de treino estruturada e dividida exatamente em ${selectedDays} sessões. Para cada divisão (ex: Treino A, Treino B, etc.), crie uma categoria com seus exercícios adequados aos equipamentos (${selectedEquipment}) e à duração de ${selectedDuration} min.`;

    const composedPrompt = `PROPOSTA DE TREINO PERSONALIZADO
Título sugerido: ${suggestedTitle}
Destinatário: ${activeStudent ? `${activeStudent.name} (${activeStudent.email})` : "Ficha geral / modelo base"}
Parâmetros acordados:
- Frequência: ${frequencyText}
- Duração estimada: até ${selectedDuration} minutos por sessão
- Objetivo: ${resolvedObjective}
- Equipamentos: ${selectedEquipment}
- Nível de aptidão: ${selectedLevel}
${focusMuscles.trim() ? `- Foco / Grupos prioritários: ${focusMuscles.trim()}\n` : ""}
${hasRestrictions && restrictionsText.trim() ? `- Restrições e cuidados de saúde: ${restrictionsText.trim()}\n` : "- Sem restrições de saúde relatadas\n"}
${preferencesText.trim() ? `- Observações e preferências do profissional: ${preferencesText.trim()}\n` : ""}

Orientações de prescrição:
${orientationText}
Defina séries, repetições e intervalos de descanso para cada exercício. Respeite com fidelidade as restrições informadas sem extrapolações clínicas.`;

    // Retain compatibility with analyzeWorkoutDescription
    try {
      analyzeWorkoutDescription(composedPrompt);
    } catch {
      // Non-blocking analysis
    }

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
          "A IA não retornou nenhuma divisão de treino. Por favor, ajuste as opções e tente novamente."
        );
      }

      const totalExercises = prop.categories.reduce(
        (acc, c) => acc + (Array.isArray(c?.exercises) ? c.exercises.length : 0),
        0
      );
      if (totalExercises === 0) {
        throw new Error(
          "A IA não retornou exercícios estruturados para esta proposta. Por favor, tente novamente."
        );
      }

      setProposal(prop);
      setWorkoutTitle(prop.title || suggestedTitle);
      setEditableCategories(prop.categories || []);
      setErrorMessage(null);
      setStep("PREVIEW");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Falha na geração do treino com IA.");
      setStep("FORM");
    }
  };

  // STEP: Save proposal as official DRAFT and redirect to workout builder (Editor 4.0)
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

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-generate-modal-title"
    >
      <div
        className="w-full h-[95vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl lg:max-w-3xl bg-[#F5F5F0] dark:bg-[#121316] rounded-t-3xl sm:rounded-3xl border-t sm:border border-[#E5E8E2] dark:border-zinc-800 flex flex-col shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-[#E5E8E2] dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#181A1D]">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="w-10 h-10 rounded-2xl bg-[#176B49]/10 dark:bg-emerald-500/20 text-[#176B49] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#176B49]/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 id="ai-generate-modal-title" className="text-base sm:text-lg font-bold text-[#102E23] dark:text-white leading-tight">
                {step === "PREVIEW" ? "Revisar proposta gerada" : "Vamos montar seu treino?"}
              </h2>
              <p className="text-xs text-[#526058] dark:text-zinc-400 mt-0.5">
                {step === "PREVIEW"
                  ? "Confira as divisões e exercícios antes de abrir no editor"
                  : "Escolha o básico. A IA ajuda com o resto."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={step === "GENERATING" || step === "SAVING"}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[#526058] hover:text-[#102E23] dark:text-zinc-400 dark:hover:text-white hover:bg-[#E5E8E2]/60 dark:hover:bg-zinc-800 transition flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
          {/* Quota Banner */}
          {quota && (
            <div className="p-2.5 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 text-xs flex items-center justify-between shadow-2xs">
              <span className="text-[#526058] dark:text-zinc-400">
                Cota diária: <strong className="text-[#102E23] dark:text-white">{quota.usedToday}</strong> de{" "}
                <strong className="text-[#102E23] dark:text-white">{quota.dailyLimit}</strong> fichas utilizadas
              </span>
              <span className="font-bold text-[#176B49] dark:text-emerald-400">
                Restam: {quota.remainingToday}
              </span>
            </div>
          )}

          {/* Contextual Error Message */}
          {errorMessage && step !== "PREVIEW" && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-700 dark:text-rose-400 font-medium">
              {errorMessage}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP: FORM — O NOVO FLUXO INTUITIVO E SIMPLES COM IA     */}
          {/* ======================================================== */}
          {step === "FORM" && (
            <div className="space-y-4">
              {/* 1. Para quem é o treino? */}
              <div className="bg-white dark:bg-[#181A1D] border border-[#E5E8E2] dark:border-zinc-800 rounded-2xl p-4 space-y-2 shadow-2xs">
                <label className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider">
                  Para quem é o treino?
                </label>

                {targetStudentMembershipId && activeStudent ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F5F0] dark:bg-zinc-800/60 border border-[#E5E8E2] dark:border-zinc-700">
                    <div className="w-9 h-9 rounded-full bg-[#176B49] text-white font-bold flex items-center justify-center text-xs shrink-0">
                      {activeStudent.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#102E23] dark:text-white truncate">
                        {activeStudent.name}
                      </p>
                      <p className="text-xs text-[#526058] dark:text-zinc-400 truncate">
                        {activeStudent.email}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-[#176B49] dark:text-emerald-400 bg-[#176B49]/10 px-2 py-0.5 rounded-md shrink-0">
                      Aluno selecionado
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedStudentId || ""}
                    onChange={(e) =>
                      handleStudentSelect(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full rounded-xl bg-[#F5F5F0] dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3.5 py-2.5 text-sm text-[#102E23] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#176B49] min-h-[44px]"
                  >
                    <option value="">Ficha geral / modelo base (sem aluno vinculado)</option>
                    {students.map((st) => (
                      <option key={st.membershipId} value={st.membershipId}>
                        {st.name} ({st.email})
                      </option>
                    ))}
                  </select>
                )}

                {/* Pre-fill information banner from student intake data */}
                {studentPrefillNote && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-2.5">
                    <span className="text-sm">📋</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        Dados aproveitados da ficha do aluno:
                      </p>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                        {studentPrefillNote}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 italic">
                        Campos pré-ajustados. Você pode alterar qualquer opção abaixo.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. O que deseja trabalhar? (Objetivos) */}
              <div className="bg-white dark:bg-[#181A1D] border border-[#E5E8E2] dark:border-zinc-800 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider">
                    O que deseja trabalhar?
                  </label>
                  <span className="text-[11px] text-[#526058] dark:text-zinc-400">
                    Escolha o objetivo principal
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {QUICK_OBJECTIVES.map((obj) => {
                    const isSelected = selectedObjectiveId === obj.id;
                    return (
                      <button
                        key={obj.id}
                        type="button"
                        onClick={() => setSelectedObjectiveId(obj.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer min-h-[48px] flex flex-col justify-center ${
                          isSelected
                            ? "bg-[#102E23] text-white border-[#102E23] shadow-xs"
                            : "bg-[#FAFBF9] dark:bg-zinc-800/40 text-[#102E23] dark:text-zinc-200 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm">
                          <span>{obj.icon}</span>
                          <span>{obj.label}</span>
                        </div>
                        <span
                          className={`text-[11px] mt-0.5 ${
                            isSelected ? "text-emerald-200" : "text-[#526058] dark:text-zinc-400"
                          }`}
                        >
                          {obj.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedObjectiveId === "outro" && (
                  <div className="pt-1 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={customObjectiveText}
                      onChange={(e) => setCustomObjectiveText(e.target.value)}
                      placeholder="Ex: Treino funcional de estabilidade, preparação para TAF, reabilitação de joelho..."
                      className="w-full rounded-xl bg-[#F5F5F0] dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3.5 py-2.5 text-xs text-[#102E23] dark:text-zinc-100 placeholder:text-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#176B49] min-h-[44px]"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* 3. Quantos dias por semana? (Frequência) */}
              <div className="bg-white dark:bg-[#181A1D] border border-[#E5E8E2] dark:border-zinc-800 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider">
                    Quantos dias por semana?
                  </label>
                  <span className="text-[11px] font-bold text-[#176B49] dark:text-emerald-400">
                    {selectedDays === 1 ? "1 dia (Único)" : `${selectedDays} dias por semana`}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((days) => {
                    const isSelected = selectedDays === days;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setSelectedDays(days)}
                        className={`py-2.5 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm transition-all cursor-pointer min-h-[44px] flex flex-col items-center justify-center ${
                          isSelected
                            ? "bg-[#176B49] text-white border-[#176B49] shadow-xs"
                            : "bg-[#FAFBF9] dark:bg-zinc-800/40 text-[#102E23] dark:text-zinc-200 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                        }`}
                      >
                        <span>{days === 1 ? "1 dia" : `${days} dias`}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-[#526058] dark:text-zinc-400 leading-relaxed bg-[#F5F5F0] dark:bg-zinc-800/50 p-2.5 rounded-xl border border-[#E5E8E2] dark:border-zinc-700/60">
                  <strong className="text-[#102E23] dark:text-white">Divisão sugerida:</strong>{" "}
                  {SPLIT_DESCRIPTIONS[selectedDays] || "Divisão personalizada"}
                </p>
              </div>

              {/* 4. Perguntar só o que falta (Equipamentos, Duração, Nível e Restrições) */}
              <div className="bg-white dark:bg-[#181A1D] border border-[#E5E8E2] dark:border-zinc-800 rounded-2xl p-4 space-y-4 shadow-2xs">
                <span className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider">
                  Detalhes essenciais
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Local / Equipamento */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#526058] dark:text-zinc-400 uppercase tracking-wider">
                      Onde vai treinar?
                    </label>
                    <select
                      value={selectedEquipment}
                      onChange={(e) => setSelectedEquipment(e.target.value)}
                      className="w-full rounded-xl bg-[#F5F5F0] dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3 py-2 text-xs font-semibold text-[#102E23] dark:text-white focus:outline-none min-h-[42px]"
                    >
                      {EQUIPMENT_OPTIONS.map((eq) => (
                        <option key={eq} value={eq}>
                          {eq}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duração por sessão */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#526058] dark:text-zinc-400 uppercase tracking-wider">
                      Duração média por treino
                    </label>
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(Number(e.target.value))}
                      className="w-full rounded-xl bg-[#F5F5F0] dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3 py-2 text-xs font-semibold text-[#102E23] dark:text-white focus:outline-none min-h-[42px]"
                    >
                      {[30, 40, 45, 50, 60, 75, 90].map((m) => (
                        <option key={m} value={m}>
                          Até {m} minutos
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#E5E8E2] dark:border-zinc-800/80">
                  {/* Nível do aluno */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#526058] dark:text-zinc-400 uppercase tracking-wider">
                      Experiência / Nível
                    </label>
                    <div className="flex gap-2">
                      {LEVEL_OPTIONS.map((lvl) => {
                        const isSelected = selectedLevel === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setSelectedLevel(lvl)}
                            className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer min-h-[40px] text-center ${
                              isSelected
                                ? "bg-[#102E23] text-white border-[#102E23]"
                                : "bg-[#FAFBF9] dark:bg-zinc-800/40 text-[#526058] dark:text-zinc-300 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                            }`}
                          >
                            {lvl}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dores ou restrições */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#526058] dark:text-zinc-400 uppercase tracking-wider">
                      Dores ou restrições de saúde?
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setHasRestrictions(false);
                          setRestrictionsText("");
                        }}
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer min-h-[40px] text-center ${
                          hasRestrictions === false
                            ? "bg-[#102E23] text-white border-[#102E23]"
                            : "bg-[#FAFBF9] dark:bg-zinc-800/40 text-[#526058] dark:text-zinc-300 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                        }`}
                      >
                        Sem restrições
                      </button>

                      <button
                        type="button"
                        onClick={() => setHasRestrictions(true)}
                        className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer min-h-[40px] text-center ${
                          hasRestrictions === true
                            ? "bg-[#176B49] text-white border-[#176B49]"
                            : "bg-[#FAFBF9] dark:bg-zinc-800/40 text-[#526058] dark:text-zinc-300 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                        }`}
                      >
                        Possui dor/restrição
                      </button>
                    </div>
                  </div>
                </div>

                {hasRestrictions && (
                  <div className="pt-1 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={restrictionsText}
                      onChange={(e) => setRestrictionsText(e.target.value)}
                      placeholder="Ex: Dor no joelho esquerdo, evitar agachamento profundo, hérnia de disco L5-S1..."
                      className="w-full rounded-xl bg-[#F5F5F0] dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3.5 py-2.5 text-xs text-[#102E23] dark:text-zinc-100 placeholder:text-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#176B49] min-h-[42px]"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* 5. Quero personalizar mais (Accordion expansível) */}
              <details className="bg-white dark:bg-[#181A1D] border border-[#E5E8E2] dark:border-zinc-800 rounded-2xl p-4 text-xs group shadow-2xs">
                <summary className="font-bold text-[#102E23] dark:text-white cursor-pointer select-none list-none flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>⚙️</span>
                    <span>Quero personalizar mais (opcional)</span>
                  </div>
                  <span className="text-[#8C9890] group-open:rotate-180 transition-transform text-sm">
                    ▼
                  </span>
                </summary>

                <div className="pt-4 space-y-3.5 border-t border-[#E5E8E2] dark:border-zinc-800 mt-3">
                  {/* Foco muscular prioritário */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#526058] dark:text-zinc-400 uppercase tracking-wider">
                      Foco ou grupamentos prioritários
                    </label>
                    <input
                      type="text"
                      value={focusMuscles}
                      onChange={(e) => setFocusMuscles(e.target.value)}
                      placeholder="Ex: Ênfase em glúteos e posterior de coxa, foco em deltoide lateral..."
                      className="w-full rounded-xl bg-[#F5F5F0] dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3.5 py-2.5 text-xs text-[#102E23] dark:text-zinc-100 placeholder:text-[#8C9890] focus:outline-none min-h-[42px]"
                    />
                  </div>

                  {/* Exercícios a preferir ou evitar */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#526058] dark:text-zinc-400 uppercase tracking-wider">
                      Exercícios que prefere ou deseja evitar
                    </label>
                    <input
                      type="text"
                      value={preferencesText}
                      onChange={(e) => setPreferencesText(e.target.value)}
                      placeholder="Ex: Prefere halteres a barras; evitar leg press 45..."
                      className="w-full rounded-xl bg-[#F5F5F0] dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3.5 py-2.5 text-xs text-[#102E23] dark:text-zinc-100 placeholder:text-[#8C9890] focus:outline-none min-h-[42px]"
                    />
                  </div>

                  {/* Título customizado */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#526058] dark:text-zinc-400 uppercase tracking-wider">
                      Nome da ficha (opcional)
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder={`Sugerido: ${suggestedTitle}`}
                      className="w-full rounded-xl bg-[#F5F5F0] dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3.5 py-2.5 text-xs font-semibold text-[#102E23] dark:text-zinc-100 placeholder:text-[#8C9890] focus:outline-none min-h-[42px]"
                    />
                  </div>
                </div>
              </details>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#E5E8E2] dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 min-h-[46px] rounded-xl text-xs sm:text-sm font-semibold text-[#526058] dark:text-zinc-300 hover:bg-[#E5E8E2]/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleGenerateFromEasyForm}
                  disabled={quota?.remainingToday === 0}
                  className="px-6 py-2.5 min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-white bg-[#176B49] hover:bg-[#12583B] active:bg-[#0E442E] disabled:opacity-50 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Gerar treino com IA</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP: GENERATING — FEEDBACK VISUAL PREMIUM               */}
          {/* ======================================================== */}
          {step === "GENERATING" && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-[#176B49]/10 dark:bg-emerald-500/20 flex items-center justify-center border border-[#176B49]/20 text-[#176B49] dark:text-emerald-400 animate-pulse">
                <svg className="w-9 h-9 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div className="space-y-1.5 max-w-sm">
                <p className="text-base font-bold text-[#102E23] dark:text-white">
                  Construindo sua ficha de treino...
                </p>
                <p className="text-xs text-[#526058] dark:text-zinc-400 font-medium min-h-[20px] transition-all">
                  {[
                    "Estruturando as divisões do treino...",
                    "Selecionando os melhores exercícios...",
                    "Configurando séries, repetições e intervalos ideais...",
                    "Garantindo equilíbrio muscular e segurança biomecânica...",
                  ][loadingMsgIndex]}
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP: PREVIEW — REVISÃO E ABERTURA NO EDITOR 4.0         */}
          {/* ======================================================== */}
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
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <span className="font-bold">✓ Proposta pronta para revisão!</span>
                  <span>Esta ficha será salva estritamente como Rascunho para você revisar no editor.</span>
                </div>
              )}

              <div>
                <label htmlFor="ai-preview-title" className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider mb-1">
                  Título da Ficha
                </label>
                <input
                  id="ai-preview-title"
                  type="text"
                  value={workoutTitle}
                  onChange={(e) => setWorkoutTitle(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#102E23] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#176B49] min-h-[44px]"
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
                      className="border border-[#E5E8E2] dark:border-zinc-800 rounded-2xl p-4 bg-white dark:bg-[#181A1D] space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider pb-1.5 border-b border-[#E5E8E2] dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#176B49]/10 text-[#176B49] dark:text-emerald-400 text-[11px] font-bold">
                            Divisão {String.fromCharCode(65 + cIdx)}
                          </span>
                          <span className="text-[#102E23] dark:text-white text-xs">{cat.name}</span>
                        </div>
                        <span className="text-[11px] text-[#526058] dark:text-zinc-400 font-normal font-mono">
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
                                className="bg-[#176B49]/[0.04] dark:bg-emerald-500/[0.06] border border-[#176B49]/20 rounded-xl p-3 space-y-2.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-1.5 border-b border-[#176B49]/15">
                                  <div className="flex items-center gap-1.5 font-bold text-[#176B49] dark:text-emerald-400">
                                    <span className="text-sm">⚡</span>
                                    <span>{typeLabel}</span>
                                    <span className="font-normal text-[#526058] dark:text-zinc-400 font-mono text-[11px]">
                                      ({cluster.items.length} exercícios)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-[#526058] dark:text-zinc-400 font-mono">
                                    {cluster.rounds} rodadas · {cluster.restSeconds}s descanso final
                                  </div>
                                </div>

                                <div className="space-y-2 pl-0.5 sm:pl-1">
                                  {cluster.items.map((ex, mIdx) => (
                                    <div
                                      key={`comb-m-${cIdx}-${clIdx}-${mIdx}`}
                                      className="bg-white dark:bg-[#121316] border border-[#E5E8E2] dark:border-zinc-800 rounded-lg p-2.5 text-xs flex items-start gap-2.5 shadow-2xs"
                                    >
                                      <span className="w-5 h-5 rounded-full bg-[#176B49]/10 text-[#176B49] dark:text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5 border border-[#176B49]/20">
                                        {String.fromCharCode(65 + mIdx)}
                                      </span>
                                      <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                                          <span className="font-semibold text-[#102E23] dark:text-white break-words">
                                            {ex.exerciseNameSnapshot}
                                          </span>
                                          {ex.matchStatus === "MATCHED" ? (
                                            <span className="text-[10px] font-semibold text-[#176B49] dark:text-emerald-400 bg-[#176B49]/10 px-2 py-0.5 rounded-md border border-[#176B49]/20 shrink-0">
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
                                        <div className="text-[11px] text-[#526058] dark:text-zinc-400 font-mono flex flex-wrap items-center gap-x-2">
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
                              className="bg-white dark:bg-[#121316] border border-[#E5E8E2] dark:border-zinc-800 rounded-lg p-2.5 text-xs space-y-1 shadow-2xs"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <div className="font-semibold text-[#102E23] dark:text-white break-words flex items-center gap-2">
                                  <span>{ex.exerciseNameSnapshot}</span>
                                  {ex.muscleGroupSnapshot ? (
                                    <span className="text-[10px] text-[#526058] dark:text-zinc-400 px-1.5 py-0.5 rounded bg-[#F5F5F0] dark:bg-zinc-800">
                                      {ex.muscleGroupSnapshot}
                                    </span>
                                  ) : null}
                                </div>
                                {ex.matchStatus === "MATCHED" ? (
                                  <span className="text-[10px] font-semibold text-[#176B49] dark:text-emerald-400 bg-[#176B49]/10 px-2 py-0.5 rounded-md border border-[#176B49]/20 shrink-0">
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
                              <div className="text-[11px] text-[#526058] dark:text-zinc-400 font-mono flex flex-wrap items-center gap-x-2">
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

              <div className="pt-3 flex items-center justify-between gap-3 border-t border-[#E5E8E2] dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep("FORM")}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold text-[#526058] dark:text-zinc-300 hover:bg-[#E5E8E2]/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  ← Ajustar opções
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-5 py-2.5 min-h-[48px] rounded-xl text-xs sm:text-sm font-bold text-white bg-[#176B49] hover:bg-[#12583B] active:bg-[#0E442E] transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Salvar rascunho e abrir no editor</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP: SAVING — TRANSIÇÃO SUAVE PARA O EDITOR             */}
          {/* ======================================================== */}
          {step === "SAVING" && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#176B49]/10 flex items-center justify-center border border-[#176B49]/20 animate-pulse text-[#176B49]">
                <svg className="w-9 h-9 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-[#102E23] dark:text-white">
                  Salvando rascunho de treino...
                </p>
                <p className="text-xs text-[#526058] dark:text-zinc-400">
                  Abrindo no editor para você conferir, personalizar e aplicar métodos avançados.
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
