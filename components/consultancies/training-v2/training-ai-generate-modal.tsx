"use client";

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
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

const OBJECTIVE_OPTIONS = [
  "Hipertrofia e Ganho de Massa Muscular",
  "Emagrecimento e Definição",
  "Força e Potência Muscular",
  "Condicionamento Geral e Resistência",
  "Reabilitação, Postura e Funcional",
];

const LEVEL_OPTIONS = ["Iniciante", "Intermediário", "Avançado"];

const SPLIT_OPTIONS = [
  "ABC (Push / Pull / Legs)",
  "ABCD (Peito e Tríceps, Costas e Bíceps, Pernas, Ombros)",
  "ABCDE (Músculo isolado por dia)",
  "Upper / Lower (Membros Superiores / Membros Inferiores)",
  "Full Body (Corpo Inteiro)",
  "A/B (Alternado Superior e Inferior)",
];

const DAYS_OPTIONS = [2, 3, 4, 5, 6];

const EQUIPMENT_OPTIONS = [
  "Academia Completa (Aparelhos, Polias, Barras e Halteres)",
  "Halteres e Barras Livres",
  "Peso Corporal / Calistenia",
  "Treino em Casa / Elásticos e Acessórios",
];

export function TrainingAiGenerateModal({
  consultancySlug,
  isOpen,
  onClose,
  targetStudentMembershipId,
}: TrainingAiGenerateModalProps) {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("Nova Ficha Personalizada");
  const [objective, setObjective] = useState(OBJECTIVE_OPTIONS[0]);
  const [level, setLevel] = useState(LEVEL_OPTIONS[1]);
  const [split, setSplit] = useState(SPLIT_OPTIONS[0]);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [equipment, setEquipment] = useState(EQUIPMENT_OPTIONS[0]);
  const [restrictions, setRestrictions] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    targetStudentMembershipId || null
  );

  // Students list
  const [students, setStudents] = useState<
    Array<{ membershipId: number; fullName: string; email: string }>
  >([]);

  // Workflow states: 'FORM' | 'GENERATING' | 'PREVIEW' | 'SAVING'
  const [state, setState] = useState<"FORM" | "GENERATING" | "PREVIEW" | "SAVING">("FORM");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generated proposal
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

  const handleClose = useCallback(() => {
    if (state !== "GENERATING" && state !== "SAVING") {
      setState("FORM");
      setErrorMessage(null);
      setProposal(null);
      onClose();
    }
  }, [state, onClose]);

  // Fetch students & quota when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Fetch Quota
    fetch(`/api/consultancies/${consultancySlug}/ai/quota`)
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

    // Fetch active students
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

  async function handleGenerateProposal(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setState("GENERATING");

    const composedPrompt = `PROPOSTA DE TREINO PERSONALIZADO
Título sugerido: ${title.trim() || "Ficha de Treino"}
Objetivo Principal: ${objective}
Nível de Aptidão: ${level}
Divisão Estrutural (Split): ${split}
Frequência Semanal: ${daysPerWeek} dias por semana
Equipamentos Disponíveis: ${equipment}
Restrições Médicas / Lesões / Cuidados: ${restrictions.trim() || "Nenhuma restrição informada"}

Orientações de prescrição:
Monte uma rotina de treino dividida de acordo com o split solicitado (${split}).
Para cada divisão (ex: Treino A, Treino B, etc.), crie uma categoria com seus exercícios adequados ao nível ${level} e aos equipamentos ${equipment}.
Defina repetições, séries e descansos para cada exercício e respeite as restrições informadas.`;

    try {
      const formData = new FormData();
      formData.append("text", composedPrompt);
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
      setProposal(prop);
      setWorkoutTitle(prop.title || title);
      setEditableCategories(prop.categories || []);
      setState("PREVIEW");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Falha na geração do treino.");
      setState("FORM");
    }
  }

  async function handleSaveDraft() {
    if (!proposal) return;
    setErrorMessage(null);
    setState("SAVING");

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
      setState("PREVIEW");
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-generate-modal-title"
    >
      <div
        className="w-full sm:max-w-2xl bg-white dark:bg-[#151619] border-t sm:border border-[#E5E7EB] dark:border-[#303238] rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 text-[#17191D] dark:text-[#E5E7EB]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-[#D1D5DB] dark:bg-[#303238] rounded-full mx-auto sm:hidden -mt-1 mb-2" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-[#303238] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 id="ai-generate-modal-title" className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white">
                Criar ficha com IA
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-[#8E95A2]">
                Gere uma estrutura completa e revise como rascunho
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={state === "GENERATING" || state === "SAVING"}
            className="p-2 rounded-lg text-[#6B7280] hover:text-[#17191D] dark:text-[#8E95A2] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quota Banner */}
        {quota && (
          <div className="px-3.5 py-2 rounded-xl text-xs flex items-center justify-between bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20 text-purple-700 dark:text-purple-300">
            <span>
              Cota diária: <strong>{quota.usedToday}</strong> de <strong>{quota.dailyLimit}</strong> fichas
            </span>
            <span className="font-semibold">Restam: {quota.remainingToday}</span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 font-medium">
            {errorMessage}
          </div>
        )}

        {/* STEP 1: FORM */}
        {state === "FORM" && (
          <form onSubmit={handleGenerateProposal} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                Nome da ficha
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Treino Hipertrofia ABCD"
                required
                className="w-full bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                  Objetivo Principal
                </label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl px-3 py-2 text-xs font-semibold text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                >
                  {OBJECTIVE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                  Nível de Aptidão
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl px-3 py-2 text-xs font-semibold text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                >
                  {LEVEL_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                  Divisão de Treino (Split)
                </label>
                <select
                  value={split}
                  onChange={(e) => setSplit(e.target.value)}
                  className="w-full bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl px-3 py-2 text-xs font-semibold text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                >
                  {SPLIT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                  Frequência Semanal
                </label>
                <select
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                  className="w-full bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl px-3 py-2 text-xs font-semibold text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                >
                  {DAYS_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d} dias por semana
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                Equipamentos Disponíveis
              </label>
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl px-3 py-2 text-xs font-semibold text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
              >
                {EQUIPMENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                Restrições, Lesões ou Preferências (Opcional)
              </label>
              <textarea
                value={restrictions}
                onChange={(e) => setRestrictions(e.target.value)}
                rows={2}
                placeholder="Ex: Evitar sobrecarga axial na lombar, ombro direito sensível a abdução."
                className="w-full bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl px-3 py-2 text-xs text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
            </div>

            {students.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                  Vincular a Aluno (Opcional)
                </label>
                <select
                  value={selectedStudentId || ""}
                  onChange={(e) =>
                    setSelectedStudentId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl px-3 py-2 text-xs font-semibold text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px]"
                >
                  <option value="">Nenhum (salvar como modelo / ficha geral)</option>
                  {students.map((st) => (
                    <option key={st.membershipId} value={st.membershipId}>
                      {st.fullName} ({st.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={quota?.remainingToday === 0}
                className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Gerar proposta com IA</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: GENERATING */}
        {state === "GENERATING" && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 animate-pulse">
              <svg className="w-8 h-8 text-purple-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#17191D] dark:text-white">
                Construindo sua ficha personalizada...
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] max-w-sm">
                A IA está dividindo os treinos, selecionando exercícios compatíveis e calculando repetições e descansos ideais.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW */}
        {state === "PREVIEW" && proposal && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <span className="font-bold">✓ Proposta gerada com sucesso!</span>
              <span>Esta ficha será salva estritamente como Rascunho para você revisar.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1">
                Título do Treino
              </label>
              <input
                type="text"
                value={workoutTitle}
                onChange={(e) => setWorkoutTitle(e.target.value)}
                className="w-full bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl px-3 py-2 text-xs font-semibold text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {editableCategories.map((cat, cIdx) => (
                <div
                  key={`cat-${cIdx}`}
                  className="border border-[#E5E7EB] dark:border-[#303238] rounded-xl p-3 bg-[#F9FAFB] dark:bg-[#1B1D21]/60 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-[#17191D] dark:text-white uppercase tracking-wider">
                    <span>{cat.name}</span>
                    <span className="text-[11px] text-[#6B7280] dark:text-[#8E95A2] font-normal font-mono">
                      {cat.exercises.length} exercícios
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {cat.exercises.map((ex, eIdx) => (
                      <div
                        key={`ex-${cIdx}-${eIdx}`}
                        className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-lg p-2 text-xs space-y-1"
                      >
                        <div className="font-semibold text-[#17191D] dark:text-white flex items-center justify-between">
                          <span>{ex.exerciseNameSnapshot}</span>
                          {ex.groupName && (
                            <span className="text-[10px] text-[#6B7280] dark:text-[#8E95A2] px-1.5 py-0.5 rounded bg-[#F3F4F6] dark:bg-[#252830]">
                              {ex.groupName}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#6B7280] dark:text-[#8E95A2] font-mono">
                          {ex.sets || 3} séries ×{" "}
                          {ex.reps
                            ? ex.repsMax && ex.repsMax > ex.reps
                              ? `${ex.reps}–${ex.repsMax} reps`
                              : `${ex.reps} reps`
                            : ex.durationSeconds
                            ? formatDurationNatural(ex.durationSeconds, ex.durationUnit)
                            : "livre"}
                          {ex.restSeconds ? ` · Descanso: ${ex.restSeconds}s` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setState("FORM")}
                className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] hover:bg-[#F3F4F6] dark:hover:bg-[#1B1D21] transition-colors"
              >
                ← Ajustar parâmetros
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Salvar rascunho e abrir no editor</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SAVING */}
        {state === "SAVING" && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 animate-pulse">
              <svg className="w-8 h-8 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[#17191D] dark:text-white">
                Salvando rascunho de treino...
              </p>
              <p className="text-xs text-[#6B7280] dark:text-[#8E95A2]">
                Redirecionando para o editor para você conferir os detalhes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
