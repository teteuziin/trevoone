"use client";

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type {
  ResolvedTrainingProposal,
  ResolvedTrainingCategory,
  ResolvedTrainingExerciseItem,
} from "@/lib/training-v2/training-ai-importer";
import { formatDurationNatural } from "@/lib/training-v2/reps-normalizer";

interface Props {
  consultancySlug: string;
  targetStudentMembershipId?: number;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
  hideTrigger?: boolean;
}

export function TrainingAiImportModal({
  consultancySlug,
  targetStudentMembershipId,
  isOpenControlled,
  onCloseControlled,
  hideTrigger = false,
}: Props) {
  const router = useRouter();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : internalIsOpen;
  const setIsOpen = useCallback((val: boolean) => {
    setInternalIsOpen(val);
    if (!val && onCloseControlled) {
      onCloseControlled();
    }
  }, [onCloseControlled]);
  const [mode, setMode] = useState<"FILE" | "TEXT">("FILE");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quota info
  const [quota, setQuota] = useState<{
    usedToday: number;
    dailyLimit: number;
    remainingToday: number;
    canImport: boolean;
    blockReason?: string;
  } | null>(null);

  // States: 'IDLE' | 'ANALYZING' | 'PREVIEW' | 'SAVING'
  const [state, setState] = useState<"IDLE" | "ANALYZING" | "PREVIEW" | "SAVING">("IDLE");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ResolvedTrainingProposal | null>(null);
  const [editableCategories, setEditableCategories] = useState<ResolvedTrainingCategory[]>([]);
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    targetStudentMembershipId || null
  );
  const [students, setStudents] = useState<Array<{ membershipId: number; fullName: string; email: string }>>([]);

  const fetchQuota = async () => {
    try {
      const res = await fetch(`/api/consultancies/${consultancySlug}/ai/usage`);
      const data = await res.json();
      if (data.success && data.quota) {
        setQuota({
          usedToday: data.quota.memberUsedToday,
          dailyLimit: data.quota.memberLimit,
          remainingToday: data.quota.effectiveRemaining,
          canImport: data.quota.canImport,
          blockReason: data.quota.blockReason,
        });
      }
    } catch {
      // Ignore
    }
  };

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
        if (state === "ANALYZING" || state === "SAVING") return;
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, state, setIsOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setState("IDLE");
    setErrorMsg(null);
    setSelectedFile(null);
    setPastedText("");
    setProposal(null);
    fetchQuota();
    if (!targetStudentMembershipId) {
      fetch(`/api/consultancies/${consultancySlug}/students`)
        .then((res) => res.json())
        .then((data) => {
          if (data.students && Array.isArray(data.students)) {
            setStudents(data.students);
          }
        })
        .catch(() => {});
    }
  };

  const handleClose = () => {
    if (state === "ANALYZING" || state === "SAVING") return;
    setIsOpen(false);
  };

  const handleStartAnalysis = async () => {
    setErrorMsg(null);
    if (mode === "FILE" && !selectedFile) {
      setErrorMsg("Selecione um arquivo PDF, imagem, TXT, MD ou DOCX.");
      return;
    }
    if (mode === "TEXT" && !pastedText.trim()) {
      setErrorMsg("Cole o texto do treino para análise.");
      return;
    }

    setState("ANALYZING");

    try {
      const formData = new FormData();
      if (mode === "FILE" && selectedFile) {
        formData.append("file", selectedFile);
      } else {
        formData.append("text", pastedText.trim());
      }
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
        throw new Error(data.error || "Erro ao processar treino com IA.");
      }

      const prop: ResolvedTrainingProposal = data.proposal;
      setProposal(prop);
      setWorkoutTitle(prop.title);
      setEditableCategories(prop.categories);
      setState("PREVIEW");
      fetchQuota();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Falha na análise do treino com IA.");
      setState("IDLE");
    }
  };

  const handleResolveCandidate = (
    categoryIdx: number,
    exerciseIdx: number,
    candidate: { exercisePublicId: string; name: string; muscleGroupPrimary: string; equipment: string }
  ) => {
    setEditableCategories((prev) => {
      const clone = JSON.parse(JSON.stringify(prev));
      const ex: ResolvedTrainingExerciseItem = clone[categoryIdx].exercises[exerciseIdx];
      ex.matchStatus = "MATCHED";
      ex.exercisePublicId = candidate.exercisePublicId;
      // CRITICAL: NEVER overwrite exerciseNameSnapshot!
      // Verbatim source truth is preserved. Candidate name is metadata for display only.
      ex.matchedExerciseName = candidate.name;
      ex.muscleGroupSnapshot = candidate.muscleGroupPrimary;
      ex.equipmentSnapshot = candidate.equipment;
      return clone;
    });
  };

  const handleUnlinkExercise = (categoryIdx: number, exerciseIdx: number) => {
    setEditableCategories((prev) => {
      const clone = JSON.parse(JSON.stringify(prev));
      const ex: ResolvedTrainingExerciseItem = clone[categoryIdx].exercises[exerciseIdx];
      ex.matchStatus = "NOT_FOUND";
      ex.exercisePublicId = null;
      ex.matchedExerciseName = null;
      return clone;
    });
  };

  const handleRemoveExercise = (categoryIdx: number, exerciseIdx: number) => {
    setEditableCategories((prev) => {
      const clone = JSON.parse(JSON.stringify(prev));
      clone[categoryIdx].exercises.splice(exerciseIdx, 1);
      return clone;
    });
  };

  const totalExercisesCount = editableCategories.reduce((acc, cat) => acc + cat.exercises.length, 0);

  const handleConfirmImport = async () => {
    if (!proposal) return;
    setErrorMsg(null);
    setState("SAVING");

    try {
      const finalStudentId = selectedStudentId || proposal.targetStudentMembershipId || targetStudentMembershipId || null;
      const res = await fetch(`/api/consultancies/${consultancySlug}/ai/training-import/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobPublicId: proposal.jobPublicId,
          targetStudentMembershipId: finalStudentId,
          confirmedTitle: workoutTitle.trim() || proposal.title,
          confirmedCategories: editableCategories,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Erro ao criar rotina.");
      }

      setIsOpen(false);
      router.push(`/consultoria/${consultancySlug}/rotinas/${data.workoutPublicId}`);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao confirmar importação.");
      setState("PREVIEW");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <>
      {/* Trigger Button */}
      {!hideTrigger && (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] transition shadow-2xs min-h-[42px] cursor-pointer"
        >
          <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Importar treino</span>
        </button>
      )}

      {/* Modal / Dialog */}
      {isOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
        >
          <div
            className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white dark:bg-[#151619] sm:border border-zinc-200 dark:border-zinc-800 rounded-none sm:rounded-2xl flex flex-col shadow-2xl overflow-hidden text-zinc-900 dark:text-zinc-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Compact with exact title and subtitle, touch target >= 44x44px */}
            <div className="px-5 sm:px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-[#151619]">
              <div className="min-w-0 pr-3">
                <h2 id="import-modal-title" className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                  Importar treino
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Envie um arquivo ou cole o treino.
                </p>
              </div>
              <button
                type="button"
                disabled={state === "ANALYZING" || state === "SAVING"}
                onClick={handleClose}
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
                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Importações com IA hoje:{" "}
                    <strong className="text-zinc-900 dark:text-white">{quota.usedToday}</strong> de{" "}
                    <strong className="text-zinc-900 dark:text-white">{quota.dailyLimit}</strong> utilizadas
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Restam: {quota.remainingToday}
                  </span>
                </div>
              )}

              {/* Error Message with Non-Blocking Retry */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3">
                  <span className="font-medium">{errorMsg}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setState("IDLE");
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 transition cursor-pointer shrink-0 min-h-[36px]"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {/* STATE: IDLE - Form */}
              {state === "IDLE" && (
                <div className="space-y-5">
                  {/* Two Tabs: Arquivo vs Texto */}
                  <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-sm font-semibold">
                    <button
                      type="button"
                      onClick={() => setMode("FILE")}
                      className={`flex-1 py-3 px-4 border-b-2 text-center transition min-h-[44px] cursor-pointer ${
                        mode === "FILE"
                          ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                          : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      }`}
                    >
                      Arquivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("TEXT")}
                      className={`flex-1 py-3 px-4 border-b-2 text-center transition min-h-[44px] cursor-pointer ${
                        mode === "TEXT"
                          ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                          : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      }`}
                    >
                      Texto
                    </button>
                  </div>

                  {/* Tab 1: Arquivo */}
                  {mode === "FILE" && (
                    <div className="space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,.md,.docx,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />

                      {!selectedFile ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 space-y-3"
                        >
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 min-h-[44px] cursor-pointer mb-2"
                            >
                              Escolher arquivo
                            </button>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                              Formatos aceitos: PDF, Imagem (PNG, JPG, WEBP), TXT, MD ou DOCX (até 15MB)
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                {selectedFile.name}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {formatFileSize(selectedFile.size)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer min-h-[44px]"
                            >
                              Trocar arquivo
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer min-h-[44px]"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Texto */}
                  {mode === "TEXT" && (
                    <div className="space-y-1.5">
                      <label htmlFor="import-pasted-text" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Texto do treino
                      </label>
                      <textarea
                        id="import-pasted-text"
                        rows={8}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={`Exemplo:\nTreino A — Peito e tríceps\n1. Supino reto — 4x10 — 60s descanso\n2. Crucifixo inclinado — 3x12 — 60s descanso\n3. Tríceps corda — 4x12 — 45s descanso`}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-base sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono leading-relaxed resize-y min-h-[160px]"
                      />
                    </div>
                  )}

                  {/* Student Selector (Draft Linkage Disclaimer) */}
                  <div className="space-y-1.5 pt-2">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                      Vincular rascunho a um aluno (opcional)
                    </label>
                    {targetStudentMembershipId ? (
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                        Rascunho vinculado ao aluno selecionado nesta página.
                      </div>
                    ) : (
                      <select
                        value={selectedStudentId || ""}
                        onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 text-base sm:text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 min-h-[44px]"
                      >
                        <option value="">Nenhum (salvar como ficha geral / modelo)</option>
                        {students.map((s) => (
                          <option key={s.membershipId} value={s.membershipId}>
                            {s.fullName} ({s.email})
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                      Identifica para quem este rascunho está sendo preparado. A atribuição efetiva do treino ao aluno só ocorre após a publicação e confirmação.
                    </p>
                  </div>

                  {/* Action Footer */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs sm:text-sm font-semibold transition min-h-[44px] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleStartAnalysis}
                      disabled={
                        quota?.remainingToday === 0 ||
                        (mode === "FILE" && !selectedFile) ||
                        (mode === "TEXT" && !pastedText.trim())
                      }
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Analisar treino</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STATE: ANALYZING */}
              {state === "ANALYZING" && (
                <div className="py-16 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-spin">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      Analisando treino...
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                      Identificando divisões, exercícios, séries, repetições e correlacionando com a biblioteca.
                    </p>
                  </div>
                </div>
              )}

              {/* STATE: PREVIEW */}
              {(state === "PREVIEW" || state === "SAVING") && proposal && (
                <div className="space-y-5">
                  {/* Summary Card */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">
                        Prévia da importação (preservando material original)
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                        {proposal.stats.totalExercises} exercícios identificados •{" "}
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {editableCategories.reduce((acc, c) => acc + c.exercises.filter((e) => e.exercisePublicId).length, 0)} vinculados à biblioteca
                        </span>
                        {" • "}
                        <span className="text-zinc-600 dark:text-zinc-300 font-semibold">
                          {editableCategories.reduce((acc, c) => acc + c.exercises.filter((e) => !e.exercisePublicId).length, 0)} mantidos com texto original
                        </span>
                      </span>
                    </div>

                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 self-start sm:self-auto">
                      ✓ Pronto para rascunho
                    </span>
                  </div>

                  {/* Student Tagging in Preview */}
                  <div className="flex items-center gap-2 text-xs flex-wrap p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Aluno vinculado:</span>
                    {targetStudentMembershipId ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {proposal.targetStudentName || "Aluno da página atual"}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={selectedStudentId || ""}
                          onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500 min-h-[36px]"
                        >
                          <option value="">[ Nenhum — salvar como rascunho geral ]</option>
                          {students.map((s) => (
                            <option key={s.membershipId} value={s.membershipId}>
                              {s.fullName} ({s.email})
                            </option>
                          ))}
                        </select>
                        {proposal.studentNameCandidate && (
                          <span className="text-zinc-500 dark:text-zinc-400 text-[11px] italic">
                            (Documento indica: &ldquo;{proposal.studentNameCandidate}&rdquo;)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Workout Title Field */}
                  <div>
                    <label htmlFor="import-workout-title" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                      Título da Ficha de Treino
                    </label>
                    <input
                      id="import-workout-title"
                      type="text"
                      value={workoutTitle}
                      onChange={(e) => setWorkoutTitle(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-base sm:text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 min-h-[44px]"
                    />
                  </div>

                  {/* Categories & Exercises List */}
                  <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                    {editableCategories.map((cat, cIdx) => (
                      <div key={`c-${cIdx}`} className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 bg-zinc-50/50 dark:bg-zinc-800/20 space-y-2.5">
                        <div className="font-bold text-xs text-zinc-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                          <span>{cat.name}</span>
                          <span className="text-[11px] text-zinc-500 font-normal">
                            {cat.exercises.length} exercícios
                          </span>
                        </div>

                        <div className="space-y-2">
                          {cat.exercises.map((ex, eIdx) => (
                            <div
                              key={ex.id || `e-${eIdx}`}
                              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2 text-xs shadow-2xs"
                            >
                              <div className="flex items-start justify-between gap-2.5 flex-wrap">
                                <div className="min-w-0 flex-1 space-y-1">
                                  <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                                      Original da Origem:
                                    </span>
                                    <div className="font-bold text-zinc-900 dark:text-white text-sm flex items-center gap-1.5 flex-wrap mt-0.5">
                                      <span>{ex.exerciseNameSnapshot}</span>
                                      {ex.notes?.includes("REVIEW_REQUIRED") && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                          Revisar Leitura
                                        </span>
                                      )}
                                      {ex.groupName && (
                                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                          {ex.groupName}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono mt-0.5">
                                    {ex.sets || 3} séries × {ex.reps ? (ex.repsMax && ex.repsMax > ex.reps ? `${ex.reps}–${ex.repsMax} reps` : `${ex.reps} reps`) : ex.durationSeconds ? formatDurationNatural(ex.durationSeconds, ex.durationUnit) : "livre"}
                                    {ex.load ? ` • Carga: ${ex.load} kg` : ""}
                                    {ex.restSeconds ? ` • Descanso: ${ex.restSeconds}s` : ""}
                                    {ex.notes && !ex.notes.includes("REVIEW_REQUIRED") ? ` • Obs: ${ex.notes}` : ""}
                                  </div>

                                  {/* Library link status */}
                                  <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 flex-wrap text-[11px]">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                      Biblioteca Trevo One:
                                    </span>
                                    {ex.exercisePublicId ? (
                                      <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        <span>Vinculado a: <strong>{ex.matchedExerciseName || ex.exerciseNameSnapshot}</strong></span>
                                        <button
                                          type="button"
                                          onClick={() => handleUnlinkExercise(cIdx, eIdx)}
                                          className="text-[10px] text-zinc-500 hover:text-rose-500 underline ml-1 cursor-pointer"
                                          title="Desvincular da biblioteca"
                                        >
                                          (desvincular)
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5 text-zinc-500 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded-md">
                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
                                        <span>Mantido com nome original</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveExercise(cIdx, eIdx)}
                                  className="text-zinc-400 hover:text-rose-500 p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shrink-0"
                                  title="Remover exercício da ficha"
                                >
                                  ✕
                                </button>
                              </div>

                              {/* Candidate Suggestions */}
                              {!ex.exercisePublicId && ex.candidates && ex.candidates.length > 0 && (
                                <div className="pt-1.5 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
                                    Sugestões para vincular (opcional — padrão é manter texto original):
                                  </span>
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {ex.candidates.map((cand) => (
                                      <button
                                        key={cand.exercisePublicId}
                                        type="button"
                                        onClick={() => handleResolveCandidate(cIdx, eIdx, cand)}
                                        className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-500/20 hover:text-emerald-500 text-zinc-700 dark:text-zinc-300 rounded-lg text-[11px] font-medium border border-zinc-200 dark:border-zinc-700 transition cursor-pointer min-h-[32px] flex items-center gap-1"
                                      >
                                        <span>+ Vincular:</span>
                                        <span className="font-semibold">{cand.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Controls */}
                  <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setState("IDLE")}
                      className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs sm:text-sm font-semibold transition min-h-[44px] cursor-pointer"
                    >
                      Voltar / Refazer
                    </button>

                    <button
                      type="button"
                      disabled={state === "SAVING" || totalExercisesCount === 0}
                      onClick={handleConfirmImport}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs flex items-center gap-2 min-h-[48px] cursor-pointer"
                    >
                      <span>
                        {state === "SAVING"
                          ? "Salvando rascunho..."
                          : selectedStudentId || targetStudentMembershipId
                          ? "Salvar rascunho de treino"
                          : "Salvar rascunho"}
                      </span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
