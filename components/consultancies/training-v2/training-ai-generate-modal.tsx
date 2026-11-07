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

const PRIMARY_OBJECTIVES = [
  { id: "massa", label: "Ganhar massa", internal: "Hipertrofia e Ganho de Massa Muscular" },
  { id: "gordura", label: "Perder gordura", internal: "Emagrecimento e Definição" },
  { id: "forca", label: "Ganhar força", internal: "Força e Potência Muscular" },
  { id: "condicionamento", label: "Condicionamento", internal: "Condicionamento Geral e Resistência" },
  { id: "outro", label: "Outro objetivo", internal: "" },
];

export function TrainingAiGenerateModal({
  consultancySlug,
  isOpen,
  onClose,
  targetStudentMembershipId,
}: TrainingAiGenerateModalProps) {
  const router = useRouter();

  // Navigation steps: 'INITIAL' (3 decisions) | 'DETAILS' (perguntar só o que falta) | 'GENERATING' | 'PREVIEW' | 'SAVING'
  const [step, setStep] = useState<"INITIAL" | "DETAILS" | "DESCRIBE" | "CLARIFY" | "SUMMARY" | "GENERATING" | "PREVIEW" | "SAVING">("INITIAL");

  // Step 1: 3 Initial Decisions (zero fictitious defaults)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    targetStudentMembershipId || null
  );
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [customObjectiveText, setCustomObjectiveText] = useState("");
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [showOtherDays, setShowOtherDays] = useState(false);

  // Step 2: "Perguntar só o que falta"
  const [selectedEquipment, setSelectedEquipment] = useState<string>(EQUIPMENT_OPTIONS[0]);
  const [selectedDuration, setSelectedDuration] = useState<number>(50);
  const [selectedLevel, setSelectedLevel] = useState<string>("Intermediário");
  const [hasRestrictions, setHasRestrictions] = useState<boolean | null>(null);
  const [restrictionsText, setRestrictionsText] = useState("");

  // Optional: Personalizar mais
  const [focusMuscles, setFocusMuscles] = useState<string>("");
  const [freeTextExplanation, setFreeTextExplanation] = useState("");
  const [customTitle, setCustomTitle] = useState("");

  // Student data & prefill
  const [students, setStudents] = useState<StudentOption[]>([]);
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
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const handleClose = useCallback(() => {
    if (step === "GENERATING" || step === "SAVING") return;
    setStep("INITIAL");
    setErrorMessage(null);
    setProposal(null);
    idempotencyKeyRef.current = "";
    onClose();
  }, [step, onClose]);

  const applyStudentData = useCallback((currentStudent: StudentOption) => {
    const notes: string[] = [];

    // Objective prefill
    if (currentStudent.objective) {
      const lower = currentStudent.objective.toLowerCase();
      if (lower.includes("hipertrofia") || lower.includes("massa") || lower.includes("ganhar")) {
        setSelectedObjectiveId("massa");
        notes.push("Ganhar massa");
      } else if (lower.includes("emagrec") || lower.includes("gordura") || lower.includes("peso") || lower.includes("perder")) {
        setSelectedObjectiveId("gordura");
        notes.push("Perder gordura");
      } else if (lower.includes("força") || lower.includes("forca")) {
        setSelectedObjectiveId("forca");
        notes.push("Ganhar força");
      } else if (lower.includes("condicionamento") || lower.includes("saúde") || lower.includes("saude") || lower.includes("resistencia")) {
        setSelectedObjectiveId("condicionamento");
        notes.push("Condicionamento");
      } else {
        setSelectedObjectiveId("outro");
        setCustomObjectiveText(currentStudent.objective);
        notes.push(currentStudent.objective);
      }
    }

    // Frequency prefill
    if (currentStudent.frequency) {
      const match = currentStudent.frequency.match(/([1-7])\s*(?:dias|x|vezes)/i);
      if (match && match[1]) {
        const days = Number(match[1]);
        if (days >= 1 && days <= 7) {
          setSelectedDays(days);
          notes.push(`${days} dias/sem`);
        }
      }
    }

    // Experience prefill
    if (currentStudent.experience) {
      const lowerExp = currentStudent.experience.toLowerCase();
      if (lowerExp.includes("iniciante") || lowerExp.includes("começando") || lowerExp.includes("nunca")) {
        setSelectedLevel("Iniciante");
      } else if (lowerExp.includes("avançado") || lowerExp.includes("avancado") || lowerExp.includes("anos")) {
        setSelectedLevel("Avançado");
      } else {
        setSelectedLevel("Intermediário");
      }
    }

    // Restrictions prefill
    if (currentStudent.restrictions && currentStudent.restrictions.trim().length > 0) {
      setHasRestrictions(true);
      setRestrictionsText(currentStudent.restrictions.trim());
      notes.push(`Restrição: ${currentStudent.restrictions.trim()}`);
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

  // Loading animation cycle
  useEffect(() => {
    if (step !== "GENERATING") return;
    const messages = [
      "Preparando a rotina de treino...",
      "Selecionando os exercícios ideais...",
      "Calculando séries, repetições e intervalos...",
      "Garantindo equilíbrio muscular e segurança...",
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

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Handle ESC
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

  const activeStudent = students.find((s) => s.membershipId === selectedStudentId);

  // Resolved objective string
  const resolvedObjective =
    selectedObjectiveId === "outro"
      ? customObjectiveText.trim() || "Treino Personalizado"
      : PRIMARY_OBJECTIVES.find((o) => o.id === selectedObjectiveId)?.internal || "Hipertrofia e Ganho de Massa Muscular";

  const daysNumber = selectedDays || 3;

  const suggestedTitle =
    customTitle.trim() ||
    (daysNumber === 1
      ? `Ficha ${resolvedObjective.split(" ")[0]} - Sessão Única`
      : `Ficha ${resolvedObjective.split(" ")[0]} ${daysNumber}D`);

  // Proceed from Step 1 (Initial Decisions) to Step 2 (Perguntar só o que falta)
  const handleProceedToDetails = () => {
    if (!selectedObjectiveId) {
      setErrorMessage("Por favor, selecione qual é o objetivo do treino.");
      return;
    }
    if (selectedObjectiveId === "outro" && !customObjectiveText.trim()) {
      setErrorMessage("Por favor, informe o objetivo do treino.");
      return;
    }
    if (!selectedDays) {
      setErrorMessage("Por favor, selecione quantos dias por semana o aluno irá treinar.");
      return;
    }
    setErrorMessage(null);
    setStep("DETAILS");
  };

  // Generate Workout Proposal via AI
  const handleGenerateProposal = async () => {
    setErrorMessage(null);
    setStep("GENERATING");

    const frequencyText =
      daysNumber === 1
        ? "1 dia (sessão única / treino completo Full Body)"
        : `${daysNumber} dias por semana`;

    const orientationText =
      daysNumber === 1
        ? `Monte uma rotina de treino estruturada de sessão única (1 bloco ou divisão principal completa). Crie uma categoria válida (ex: "Treino Principal" ou "Full Body") com seus exercícios adequados aos equipamentos (${selectedEquipment}) e à duração de ${selectedDuration} min.`
        : `Monte uma rotina de treino estruturada e dividida exatamente em ${daysNumber} sessões. Para cada divisão (ex: Treino A, Treino B, etc.), crie uma categoria com seus exercícios adequados aos equipamentos (${selectedEquipment}) e à duração de ${selectedDuration} min.`;

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
${freeTextExplanation.trim() ? `- Observações e preferências do profissional: ${freeTextExplanation.trim()}\n` : ""}

Orientações de prescrição:
${orientationText}
Defina séries, repetições e intervalos de descanso para cada exercício. Respeite com fidelidade as restrições informadas sem extrapolações clínicas.`;

    try {
      analyzeWorkoutDescription(composedPrompt);
    } catch {
      // Non-blocking
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
      setStep("DETAILS");
    }
  };

  // Save proposal as official DRAFT and redirect to editor
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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-generate-modal-title"
    >
      <div
        className="w-full h-auto max-h-[92vh] sm:max-h-[85vh] sm:max-w-lg lg:max-w-xl bg-[#FDFDFC] dark:bg-[#151619] rounded-t-3xl sm:rounded-3xl border-t sm:border border-[#E5E8E2] dark:border-zinc-800 flex flex-col shadow-2xl overflow-hidden text-[#102E23] dark:text-zinc-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - 100% Light Trevo One Official Theme */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-[#E5E8E2] dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#1A1C20]">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-[#176B49]/10 text-[#176B49] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#176B49]/20 font-bold">
              ⚡
            </div>
            <div className="min-w-0">
              <h2 id="ai-generate-modal-title" className="text-base sm:text-lg font-extrabold text-[#102E23] dark:text-white leading-tight">
                {step === "PREVIEW" ? "Revisar proposta de treino" : "Criar treino com IA"}
              </h2>
              <p className="text-xs text-[#526058] dark:text-zinc-400 mt-0.5">
                {step === "PREVIEW"
                  ? "Confira o treino antes de abrir no editor"
                  : step === "DETAILS"
                  ? "Só mais alguns detalhes rápidos"
                  : "Vamos preparar seu treino juntos."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Cota discreta sem jargão técnico */}
            {quota && quota.remainingToday > 0 && (
              <span className="hidden sm:inline-flex text-[11px] font-bold text-[#176B49] dark:text-emerald-400 bg-[#176B49]/10 dark:bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-[#176B49]/20">
                {quota.remainingToday} criações disponíveis hoje
              </span>
            )}
            <button
              type="button"
              onClick={handleClose}
              disabled={step === "GENERATING" || step === "SAVING"}
              className="min-h-[40px] min-w-[40px] p-2 rounded-xl text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0] dark:hover:bg-zinc-800 transition flex items-center justify-center cursor-pointer"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
          {/* Cota discreta no mobile */}
          {quota && quota.remainingToday > 0 && (
            <div className="sm:hidden flex items-center justify-between text-xs font-semibold text-[#176B49] bg-[#176B49]/10 px-3 py-1.5 rounded-xl border border-[#176B49]/20">
              <span>Cota de criação</span>
              <strong>{quota.remainingToday} disponíveis hoje</strong>
            </div>
          )}

          {/* Contextual Error Message */}
          {errorMessage && step !== "PREVIEW" && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {errorMessage}
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 1: PRIMEIRA TELA — SOMENTE TRÊS DECISÕES           */}
          {/* ======================================================== */}
          {step === "INITIAL" && (
            <div className="space-y-4">
              {/* 1. Para quem é o treino? */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider">
                  1. Para quem é o treino?
                </label>

                {targetStudentMembershipId && activeStudent ? (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F5F5F0] dark:bg-zinc-800/50 border border-[#E5E8E2] dark:border-zinc-700 text-xs">
                    <div className="min-w-0 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#176B49] text-white font-bold flex items-center justify-center text-xs shrink-0">
                        {activeStudent.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#102E23] dark:text-white truncate">
                          {activeStudent.name}
                        </p>
                        <p className="text-[#526058] dark:text-zinc-400 text-[11px] truncate">
                          {activeStudent.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#176B49] dark:text-emerald-400 bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-[#E5E8E2] dark:border-zinc-700 shrink-0">
                      Aluno selecionado
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedStudentId || ""}
                    onChange={(e) =>
                      handleStudentSelect(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3.5 py-2.5 text-xs sm:text-sm text-[#102E23] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#176B49] min-h-[44px] cursor-pointer"
                  >
                    <option value="">Ficha geral / modelo base (sem aluno vinculado)</option>
                    {students.map((st) => (
                      <option key={st.membershipId} value={st.membershipId}>
                        {st.name} ({st.email})
                      </option>
                    ))}
                  </select>
                )}

                {/* Nota de dados pré-existentes na ficha do aluno */}
                {studentPrefillNote && (
                  <p className="text-[11px] text-[#176B49] dark:text-emerald-400 font-medium pt-0.5">
                    ✓ Aproveitando histórico do aluno: {studentPrefillNote}
                  </p>
                )}
              </div>

              {/* 2. Qual é o objetivo? */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider">
                  2. Qual é o objetivo?
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRIMARY_OBJECTIVES.map((obj) => {
                    const isSelected = selectedObjectiveId === obj.id;
                    return (
                      <button
                        key={obj.id}
                        type="button"
                        onClick={() => setSelectedObjectiveId(obj.id)}
                        className={`py-3 px-3 rounded-2xl border text-center font-bold text-xs sm:text-sm transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                          isSelected
                            ? "bg-[#176B49] text-white border-[#176B49] shadow-xs"
                            : "bg-white dark:bg-zinc-900 text-[#102E23] dark:text-zinc-200 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                        }`}
                      >
                        <span>{obj.label}</span>
                      </button>
                    );
                  })}
                </div>

                {selectedObjectiveId === "outro" && (
                  <div className="pt-1.5 animate-in fade-in duration-150">
                    <input
                      type="text"
                      value={customObjectiveText}
                      onChange={(e) => setCustomObjectiveText(e.target.value)}
                      placeholder="Qual é o objetivo específico? (Ex: Treino para corrida, reabilitação...)"
                      className="w-full rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3.5 py-2.5 text-xs text-[#102E23] dark:text-zinc-100 placeholder:text-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#176B49] min-h-[42px]"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* 3. Quantos dias por semana? */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider">
                  3. Quantos dias por semana?
                </label>

                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5].map((days) => {
                    const isSelected = selectedDays === days && !showOtherDays;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          setSelectedDays(days);
                          setShowOtherDays(false);
                        }}
                        className={`py-3 rounded-2xl border text-center font-bold text-xs sm:text-sm transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                          isSelected
                            ? "bg-[#176B49] text-white border-[#176B49] shadow-xs"
                            : "bg-white dark:bg-zinc-900 text-[#102E23] dark:text-zinc-200 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                        }`}
                      >
                        <span>{days}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setShowOtherDays(true);
                      if (selectedDays === 2 || selectedDays === 3 || selectedDays === 4 || selectedDays === 5) {
                        setSelectedDays(null);
                      }
                    }}
                    className={`py-3 rounded-2xl border text-center font-bold text-xs sm:text-sm transition-all cursor-pointer min-h-[44px] flex items-center justify-center ${
                      showOtherDays
                        ? "bg-[#176B49] text-white border-[#176B49] shadow-xs"
                        : "bg-white dark:bg-zinc-900 text-[#102E23] dark:text-zinc-200 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                    }`}
                  >
                    <span>Outro</span>
                  </button>
                </div>

                {showOtherDays && (
                  <div className="pt-1.5 flex items-center gap-2 animate-in fade-in duration-150">
                    <span className="text-xs text-[#526058] dark:text-zinc-400 font-semibold">
                      Outras frequências:
                    </span>
                    {[1, 6, 7].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDays(d)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer min-h-[36px] ${
                          selectedDays === d
                            ? "bg-[#176B49] text-white border-[#176B49]"
                            : "bg-white text-[#102E23] border-[#E5E8E2] hover:border-[#176B49]"
                        }`}
                      >
                        {d === 1 ? "1 dia (Único)" : `${d} dias`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão de Avanço */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProceedToDetails}
                  disabled={!selectedObjectiveId || !selectedDays || (selectedObjectiveId === "outro" && !customObjectiveText.trim())}
                  className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-[#176B49] hover:bg-[#12583B] active:bg-[#0E442E] disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
                >
                  <span>Continuar</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 2: PERGUNTAR SÓ O QUE FALTA                        */}
          {/* ======================================================== */}
          {step === "DETAILS" && (
            <div className="space-y-4">
              {/* Resumo compacto das 3 decisões anteriores */}
              <div className="p-3 rounded-2xl bg-[#F5F5F0] dark:bg-zinc-800/50 border border-[#E5E8E2] dark:border-zinc-700 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-bold text-[#102E23] dark:text-white">
                    {activeStudent ? activeStudent.name : "Ficha geral"}
                  </span>
                  <span>·</span>
                  <span className="text-[#176B49] dark:text-emerald-400 font-semibold">
                    {PRIMARY_OBJECTIVES.find((o) => o.id === selectedObjectiveId)?.label || customObjectiveText}
                  </span>
                  <span>·</span>
                  <span>{selectedDays === 1 ? "1 dia" : `${selectedDays} dias/sem`}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("INITIAL")}
                  className="text-xs font-bold text-[#176B49] hover:underline shrink-0 cursor-pointer"
                >
                  Alterar
                </button>
              </div>

              {/* Se for ficha geral, aviso amigável */}
              {!activeStudent && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300">
                  <strong>Ficha geral:</strong> esta rotina servirá de base reutilizável e poderá ser individualizada para cada aluno ao prescrever.
                </div>
              )}

              {/* Informações que faltam */}
              <div className="space-y-3.5">
                {/* 1. Local de treino */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider">
                    Onde vai treinar?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedEquipment(EQUIPMENT_OPTIONS[0])}
                      className={`p-3 rounded-2xl border text-xs font-bold transition text-left cursor-pointer min-h-[42px] ${
                        selectedEquipment === EQUIPMENT_OPTIONS[0]
                          ? "bg-[#176B49] text-white border-[#176B49]"
                          : "bg-white dark:bg-zinc-900 text-[#102E23] dark:text-zinc-200 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                      }`}
                    >
                      🏋️ Academia completa
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedEquipment(EQUIPMENT_OPTIONS[1])}
                      className={`p-3 rounded-2xl border text-xs font-bold transition text-left cursor-pointer min-h-[42px] ${
                        selectedEquipment === EQUIPMENT_OPTIONS[1]
                          ? "bg-[#176B49] text-white border-[#176B49]"
                          : "bg-white dark:bg-zinc-900 text-[#102E23] dark:text-zinc-200 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                      }`}
                    >
                      🏠 Em casa / Halteres
                    </button>
                  </div>
                </div>

                {/* 2. Tempo por sessão */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider">
                    Tempo disponível por sessão
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[30, 45, 50, 60, 75].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedDuration(m)}
                        className={`py-2 rounded-xl border text-xs font-bold transition text-center cursor-pointer min-h-[38px] ${
                          selectedDuration === m
                            ? "bg-[#176B49] text-white border-[#176B49]"
                            : "bg-white dark:bg-zinc-900 text-[#102E23] dark:text-zinc-200 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                        }`}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Nível de experiência */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider">
                    Nível de experiência
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {LEVEL_OPTIONS.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSelectedLevel(lvl)}
                        className={`py-2.5 rounded-2xl border text-xs font-bold transition text-center cursor-pointer min-h-[40px] ${
                          selectedLevel === lvl
                            ? "bg-[#176B49] text-white border-[#176B49]"
                            : "bg-white dark:bg-zinc-900 text-[#102E23] dark:text-zinc-200 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Dores ou restrições (nunca presumir ausência) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider">
                    Possui alguma dor ou restrição física?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHasRestrictions(false);
                        setRestrictionsText("");
                      }}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition text-center cursor-pointer min-h-[40px] ${
                        hasRestrictions === false
                          ? "bg-[#176B49] text-white border-[#176B49]"
                          : "bg-white dark:bg-zinc-900 text-[#102E23] dark:text-zinc-200 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                      }`}
                    >
                      Não possui
                    </button>
                    <button
                      type="button"
                      onClick={() => setHasRestrictions(true)}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition text-center cursor-pointer min-h-[40px] ${
                        hasRestrictions === true
                          ? "bg-[#176B49] text-white border-[#176B49]"
                          : "bg-white dark:bg-zinc-900 text-[#102E23] dark:text-zinc-200 border-[#E5E8E2] dark:border-zinc-800 hover:border-[#176B49]"
                      }`}
                    >
                      Sim, possui
                    </button>
                  </div>

                  {hasRestrictions === true && (
                    <div className="pt-1.5 animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={restrictionsText}
                        onChange={(e) => setRestrictionsText(e.target.value)}
                        placeholder="Descreva (ex: dor no joelho esquerdo, evitar agachamento profundo...)"
                        className="w-full rounded-2xl bg-white dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3.5 py-2.5 text-xs text-[#102E23] dark:text-zinc-100 placeholder:text-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#176B49] min-h-[42px]"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* 5. Personalizar mais (Acordeão opcional) */}
                <details className="rounded-2xl border border-[#E5E8E2] dark:border-zinc-800 bg-[#F5F5F0]/60 dark:bg-zinc-900/40 p-3.5 text-xs group">
                  <summary className="font-bold text-[#102E23] dark:text-white cursor-pointer select-none list-none flex items-center justify-between">
                    <span>Personalizar mais (opcional)</span>
                    <span className="text-[#8C9890] group-open:rotate-180 transition-transform text-xs">▼</span>
                  </summary>

                  <div className="pt-3 space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#526058] dark:text-zinc-400 uppercase tracking-wider">
                        Foco ou ênfase muscular
                      </label>
                      <input
                        type="text"
                        value={focusMuscles}
                        onChange={(e) => setFocusMuscles(e.target.value)}
                        placeholder="Ex: Foco em glúteos e posteriores de coxa, dar ênfase em ombros..."
                        className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3 py-2 text-xs text-[#102E23] dark:text-zinc-100 placeholder:text-[#8C9890] focus:outline-none min-h-[40px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#526058] dark:text-zinc-400 uppercase tracking-wider">
                        Quero explicar do meu jeito
                      </label>
                      <textarea
                        rows={2}
                        value={freeTextExplanation}
                        onChange={(e) => setFreeTextExplanation(e.target.value)}
                        placeholder="Ex: Não prescrever leg press; priorizar exercícios livres com halteres..."
                        className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 p-2.5 text-xs text-[#102E23] dark:text-zinc-100 placeholder:text-[#8C9890] focus:outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-[#526058] dark:text-zinc-400 uppercase tracking-wider">
                        Nome da ficha
                      </label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder={`Sugerido: ${suggestedTitle}`}
                        className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 px-3 py-2 text-xs font-semibold text-[#102E23] dark:text-zinc-100 placeholder:text-[#8C9890] focus:outline-none min-h-[40px]"
                      />
                    </div>
                  </div>
                </details>
              </div>

              {/* Botões do Rodapé */}
              <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#E5E8E2] dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep("INITIAL")}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-[#526058] hover:bg-[#F5F5F0] transition cursor-pointer min-h-[44px]"
                >
                  ← Voltar
                </button>

                <button
                  type="button"
                  onClick={handleGenerateProposal}
                  disabled={quota?.remainingToday === 0}
                  className="px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-[#176B49] hover:bg-[#12583B] active:bg-[#0E442E] disabled:opacity-50 transition shadow-sm flex items-center gap-2 cursor-pointer min-h-[46px]"
                >
                  <span>⚡ Gerar treino com IA</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 3: GENERATING                                      */}
          {/* ======================================================== */}
          {step === "GENERATING" && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#176B49]/10 text-[#176B49] dark:text-emerald-400 flex items-center justify-center border border-[#176B49]/20 animate-pulse">
                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#102E23] dark:text-white">
                  Construindo sua ficha personalizada...
                </p>
                <p className="text-xs text-[#526058] dark:text-zinc-400">
                  {[
                    "Preparando a rotina de treino...",
                    "Selecionando os exercícios ideais...",
                    "Calculando séries, repetições e intervalos...",
                    "Garantindo equilíbrio muscular e segurança...",
                  ][loadingMsgIndex]}
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 4: PREVIEW (REVISÃO ANTES DO EDITOR)                */}
          {/* ======================================================== */}
          {step === "PREVIEW" && proposal && (
            <div className="space-y-4">
              {/* Banner contextual de sucesso ou erro */}
              {errorMessage ? (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">⚠️ Erro ao salvar:</span>
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
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-[#176B49] dark:text-emerald-300 flex items-center gap-2">
                  <span className="font-bold">✓ Proposta pronta para revisão!</span>
                  <span>Esta ficha será salva estritamente como Rascunho para você revisar no editor.</span>
                </div>
              )}

              <div>
                <label htmlFor="ai-preview-title" className="block text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider mb-1">
                  Título do Treino
                </label>
                <input
                  id="ai-preview-title"
                  type="text"
                  value={workoutTitle}
                  onChange={(e) => setWorkoutTitle(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-[#E5E8E2] dark:border-zinc-800 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#102E23] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#176B49] min-h-[44px]"
                />
              </div>

              <div className="space-y-3 max-h-[50vh] sm:max-h-[55vh] overflow-y-auto pr-1">
                {editableCategories.map((cat, cIdx) => {
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
                      className="border border-[#E5E8E2] dark:border-zinc-800 rounded-2xl p-3.5 bg-white dark:bg-zinc-900 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-[#102E23] dark:text-white uppercase tracking-wider pb-1 border-b border-[#F0F2ED] dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[#176B49]/10 text-[#176B49] text-[11px] font-bold">
                            Divisão {String.fromCharCode(65 + cIdx)}
                          </span>
                          <span>{cat.name}</span>
                        </div>
                        <span className="text-[11px] text-[#526058] font-mono">
                          {cat.exercises.length} {cat.exercises.length === 1 ? "exercício" : "exercícios"}
                        </span>
                      </div>

                      <div className="space-y-1.5">
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
                                className="bg-[#176B49]/[0.04] border border-[#176B49]/20 rounded-xl p-2.5 space-y-2"
                              >
                                <div className="flex items-center justify-between text-xs pb-1 border-b border-[#176B49]/15">
                                  <span className="font-bold text-[#176B49]">⚡ {typeLabel} ({cluster.items.length} exercícios)</span>
                                  <span className="text-[11px] text-[#526058] font-mono">{cluster.rounds} rodadas · {cluster.restSeconds}s descanso</span>
                                </div>
                                <div className="space-y-1.5 pl-1">
                                  {cluster.items.map((ex, mIdx) => (
                                    <div
                                      key={`comb-m-${cIdx}-${clIdx}-${mIdx}`}
                                      className="bg-white dark:bg-zinc-800 border border-[#E5E8E2] dark:border-zinc-700 rounded-lg p-2 text-xs flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full bg-[#176B49]/10 text-[#176B49] font-bold flex items-center justify-center text-[9px]">
                                          {String.fromCharCode(65 + mIdx)}
                                        </span>
                                        <span className="font-semibold text-[#102E23] dark:text-white">{ex.exerciseNameSnapshot}</span>
                                      </div>
                                      <span className="text-[11px] text-[#526058] font-mono">
                                        {ex.sets || 3} × {ex.reps || "8-12"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          const ex = cluster.item;
                          return (
                            <div
                              key={`single-${cIdx}-${cluster.originalIndex}`}
                              className="bg-[#FAFBF9] dark:bg-zinc-800/60 border border-[#E5E8E2] dark:border-zinc-700/60 rounded-xl p-2.5 text-xs flex items-center justify-between"
                            >
                              <div className="font-semibold text-[#102E23] dark:text-white truncate max-w-[220px] sm:max-w-xs">
                                {ex.exerciseNameSnapshot}
                              </div>
                              <div className="text-[11px] text-[#526058] font-mono shrink-0">
                                {ex.sets || 3} × {ex.reps ? `${ex.reps} reps` : ex.durationSeconds ? formatDurationNatural(ex.durationSeconds, ex.durationUnit) : "livre"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#E5E8E2] dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setStep("DETAILS")}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-[#526058] hover:bg-[#F5F5F0] transition cursor-pointer min-h-[44px]"
                >
                  ← Ajustar opções
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-[#176B49] hover:bg-[#12583B] active:bg-[#0E442E] transition shadow-sm flex items-center gap-2 cursor-pointer min-h-[46px]"
                >
                  <span>Salvar rascunho e abrir no editor</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ETAPA 5: SAVING                                          */}
          {/* ======================================================== */}
          {step === "SAVING" && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#176B49]/10 text-[#176B49] flex items-center justify-center border border-[#176B49]/20 animate-pulse">
                <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#102E23]">
                  Salvando rascunho de treino...
                </p>
                <p className="text-xs text-[#526058]">
                  Abrindo no editor para você conferir e personalizar os detalhes.
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
