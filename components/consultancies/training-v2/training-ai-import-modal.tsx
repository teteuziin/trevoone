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
  isTemplate?: boolean;
}

type ImportInputMode = "TEXT" | "DOCUMENT" | "IMAGE";

function ChevronDownIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function ChevronUpIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  );
}

export function TrainingAiImportModal({
  consultancySlug,
  targetStudentMembershipId,
  isOpenControlled,
  onCloseControlled,
  hideTrigger = false,
  isTemplate = false,
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

  const [mode, setMode] = useState<ImportInputMode>("TEXT");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expanded divisions state in Preview
  const [expandedDivisions, setExpandedDivisions] = useState<Record<number, boolean>>({ 0: true });

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
      // Non-blocking quota fetch
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
    if (!targetStudentMembershipId && !isTemplate) {
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
    if ((mode === "DOCUMENT" || mode === "IMAGE") && !selectedFile) {
      setErrorMsg(
        mode === "IMAGE"
          ? "Selecione uma imagem (PNG, JPG, WEBP) com o treino."
          : "Selecione um documento (PDF, DOCX, TXT) com o treino."
      );
      return;
    }
    if (mode === "TEXT" && !pastedText.trim()) {
      setErrorMsg("Cole o texto do treino para análise.");
      return;
    }

    setState("ANALYZING");

    try {
      const formData = new FormData();
      if ((mode === "DOCUMENT" || mode === "IMAGE") && selectedFile) {
        formData.append("file", selectedFile);
      } else {
        formData.append("text", pastedText.trim());
      }

      const studentIdToSend = !isTemplate ? (selectedStudentId || targetStudentMembershipId) : null;
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
      setWorkoutTitle(isTemplate ? `Modelo — ${prop.title}` : prop.title);
      setEditableCategories(prop.categories);

      // Expand all divisions by default in preview
      const initialExpanded: Record<number, boolean> = {};
      (prop.categories || []).forEach((_, idx) => {
        initialExpanded[idx] = true;
      });
      setExpandedDivisions(initialExpanded);

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

  const toggleDivisionExpand = (idx: number) => {
    setExpandedDivisions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const totalExercisesCount = editableCategories.reduce((acc, cat) => acc + cat.exercises.length, 0);

  const handleConfirmImport = async () => {
    if (!proposal) return;
    setErrorMsg(null);
    setState("SAVING");

    try {
      const finalStudentId = isTemplate
        ? null
        : selectedStudentId || proposal.targetStudentMembershipId || targetStudentMembershipId || null;

      const res = await fetch(`/api/consultancies/${consultancySlug}/ai/training-import/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobPublicId: proposal.jobPublicId,
          targetStudentMembershipId: finalStudentId,
          confirmedTitle: workoutTitle.trim() || proposal.title,
          confirmedCategories: editableCategories,
          isTemplate: Boolean(isTemplate),
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
      setErrorMsg(err instanceof Error ? err.message : "Falha ao abrir no editor.");
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
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-[#F5F5F0] text-[#102E23] border border-[#E5E8E2] transition shadow-2xs min-h-[40px] cursor-pointer"
        >
          <svg className="w-4 h-4 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Importar treino</span>
        </button>
      )}

      {/* Modal / Dialog in Official Light Palette */}
      {isOpen && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-stretch sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 font-sans"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
        >
          <div
            className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl bg-white sm:border border-[#E5E8E2] rounded-none sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden text-[#102E23]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-[#E5E8E2] flex items-center justify-between shrink-0 bg-[#FAFBF9]">
              <div className="min-w-0 pr-3">
                <h2 id="import-modal-title" className="text-base sm:text-lg font-black text-[#102E23] leading-tight">
                  {isTemplate ? "Importar modelo de treino com IA" : "Importar treino com IA"}
                </h2>
                <p className="text-xs text-[#526058] mt-0.5">
                  Cole o texto, envie um documento ou envie uma foto do treino.
                </p>
              </div>
              <button
                type="button"
                disabled={state === "ANALYZING" || state === "SAVING"}
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition cursor-pointer shrink-0"
                aria-label="Fechar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-4">
              {/* Quota Banner */}
              {quota && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAFBF9] border border-[#E5E8E2] text-xs">
                  <span className="text-[#526058]">
                    Importações com IA hoje:{" "}
                    <strong className="text-[#102E23]">{quota.usedToday}</strong> de{" "}
                    <strong className="text-[#102E23]">{quota.dailyLimit}</strong> utilizadas
                  </span>
                  <span className="font-bold text-[#176B49]">
                    Restam: {quota.remainingToday}
                  </span>
                </div>
              )}

              {/* Error Message with Non-Blocking Retry */}
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
                  <span className="font-semibold">{errorMsg}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setState("IDLE");
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 transition cursor-pointer shrink-0 min-h-[36px]"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {/* STATE: IDLE - 3 Clear Paths (Colar texto, Enviar documento, Enviar imagem) */}
              {state === "IDLE" && (
                <div className="space-y-4">
                  {/* Three Tabs: Texto, Documento, Imagem */}
                  <div className="flex border-b border-[#E5E8E2] text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("TEXT");
                        setSelectedFile(null);
                      }}
                      className={`flex-1 py-3 px-2 border-b-2 text-center transition min-h-[44px] cursor-pointer ${
                        mode === "TEXT"
                          ? "border-[#176B49] text-[#176B49]"
                          : "border-transparent text-[#526058] hover:text-[#102E23]"
                      }`}
                    >
                      ✏️ Colar texto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("DOCUMENT");
                        setSelectedFile(null);
                      }}
                      className={`flex-1 py-3 px-2 border-b-2 text-center transition min-h-[44px] cursor-pointer ${
                        mode === "DOCUMENT"
                          ? "border-[#176B49] text-[#176B49]"
                          : "border-transparent text-[#526058] hover:text-[#102E23]"
                      }`}
                    >
                      📄 Enviar documento
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("IMAGE");
                        setSelectedFile(null);
                      }}
                      className={`flex-1 py-3 px-2 border-b-2 text-center transition min-h-[44px] cursor-pointer ${
                        mode === "IMAGE"
                          ? "border-[#176B49] text-[#176B49]"
                          : "border-transparent text-[#526058] hover:text-[#102E23]"
                      }`}
                    >
                      📷 Enviar imagem
                    </button>
                  </div>

                  {/* Tab 1: Colar Texto */}
                  {mode === "TEXT" && (
                    <div className="space-y-1.5">
                      <label htmlFor="import-pasted-text" className="block text-xs font-bold text-[#102E23]">
                        Cole o treino (divisões, exercícios, séries e repetições):
                      </label>
                      <textarea
                        id="import-pasted-text"
                        rows={8}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={`Exemplo:\nTreino A — Peito e tríceps\n1. Supino reto — 4x10 — 60s descanso\n2. Crucifixo inclinado — 3x12 — 60s descanso\n3. Tríceps corda — 4x12 — 45s descanso\n\nTreino B — Costas e bíceps\n1. Puxada frontal — 4x10 — 60s descanso\n2. Remada baixa — 3x12 — 60s descanso\n3. Rosca direta — 3x10 — 60s descanso`}
                        className="w-full bg-[#FAFBF9] border border-[#E5E8E2] rounded-2xl p-3.5 text-xs text-[#102E23] placeholder-[#8C9890] focus:outline-none focus:ring-2 focus:ring-[#176B49] font-mono leading-relaxed resize-y min-h-[180px]"
                      />
                    </div>
                  )}

                  {/* Tab 2: Enviar Documento (PDF, DOCX, TXT) */}
                  {mode === "DOCUMENT" && (
                    <div className="space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />

                      {!selectedFile ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-[#D5E2D7] hover:border-[#176B49] bg-[#FAFBF9] hover:bg-[#F3F7F4] rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition space-y-3"
                        >
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#EDF5F0] text-[#176B49] flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-white text-[#102E23] border border-[#E5E8E2] shadow-2xs hover:bg-[#F5F5F0] min-h-[44px] cursor-pointer mb-2"
                            >
                              Escolher documento
                            </button>
                            <p className="text-xs text-[#526058] max-w-sm mx-auto">
                              Formatos aceitos: PDF digital ou escaneado, Word (DOCX) ou TXT (até 15MB)
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-[#E5E8E2] rounded-2xl p-4 bg-[#FAFBF9] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#EDF5F0] text-[#176B49] flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#102E23] truncate">
                                {selectedFile.name}
                              </p>
                              <p className="text-[11px] text-[#526058]">
                                {formatFileSize(selectedFile.size)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#176B49] hover:bg-[#E8F0EA] transition cursor-pointer min-h-[36px]"
                            >
                              Trocar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer min-h-[36px]"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tab 3: Enviar Imagem (JPG, PNG, WEBP) */}
                  {mode === "IMAGE" && (
                    <div className="space-y-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />

                      {!selectedFile ? (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-[#D5E2D7] hover:border-[#176B49] bg-[#FAFBF9] hover:bg-[#F3F7F4] rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition space-y-3"
                        >
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#EDF5F0] text-[#176B49] flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                          </div>
                          <div>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-white text-[#102E23] border border-[#E5E8E2] shadow-2xs hover:bg-[#F5F5F0] min-h-[44px] cursor-pointer mb-2"
                            >
                              Escolher foto do treino
                            </button>
                            <p className="text-xs text-[#526058] max-w-sm mx-auto">
                              Formatos aceitos: Imagem JPG, PNG ou WEBP (ficha física, anotação ou print)
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-[#E5E8E2] rounded-2xl p-4 bg-[#FAFBF9] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#EDF5F0] text-[#176B49] flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#102E23] truncate">
                                {selectedFile.name}
                              </p>
                              <p className="text-[11px] text-[#526058]">
                                {formatFileSize(selectedFile.size)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#176B49] hover:bg-[#E8F0EA] transition cursor-pointer min-h-[36px]"
                            >
                              Trocar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer min-h-[36px]"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Student Selector (omitted when isTemplate) */}
                  {!isTemplate && (
                    <div className="space-y-1.5 pt-2">
                      <label className="block text-xs font-bold text-[#102E23]">
                        Vincular rascunho a um aluno (opcional):
                      </label>
                      {targetStudentMembershipId ? (
                        <div className="p-3 rounded-2xl bg-[#FAFBF9] border border-[#E5E8E2] text-xs text-[#526058]">
                          Rascunho vinculado ao aluno selecionado nesta página.
                        </div>
                      ) : (
                        <select
                          value={selectedStudentId || ""}
                          onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full rounded-2xl bg-[#FAFBF9] border border-[#E5E8E2] px-3.5 py-2.5 text-xs text-[#102E23] focus:outline-none focus:ring-1 focus:ring-[#176B49] min-h-[44px]"
                        >
                          <option value="">Nenhum (salvar como ficha geral / modelo)</option>
                          {students.map((s) => (
                            <option key={s.membershipId} value={s.membershipId}>
                              {s.fullName} ({s.email})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {isTemplate && (
                    <div className="p-3 rounded-2xl bg-[#FAFBF9] border border-[#E5E8E2] text-xs text-[#526058]">
                      Esta ficha será importada diretamente como um <strong>Modelo Pronto</strong>, independente de alunos.
                    </div>
                  )}

                  {/* Action Footer */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E8E2]">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] transition min-h-[44px] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleStartAnalysis}
                      disabled={
                        quota?.remainingToday === 0 ||
                        ((mode === "DOCUMENT" || mode === "IMAGE") && !selectedFile) ||
                        (mode === "TEXT" && !pastedText.trim())
                      }
                      className="px-6 py-2.5 bg-[#176B49] hover:bg-[#12583B] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Analisar com IA</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STATE: ANALYZING */}
              {state === "ANALYZING" && (
                <div className="py-16 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#EDF5F0] text-[#176B49] flex items-center justify-center animate-spin">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#102E23]">
                      Analisando estrutura do treino...
                    </h3>
                    <p className="text-xs text-[#526058] mt-1 max-w-sm mx-auto">
                      Identificando divisões, exercícios, séries, repetições e correlacionando com a biblioteca oficial.
                    </p>
                  </div>
                </div>
              )}

              {/* STATE: PREVIEW (Expandable divisions, library linking, and "Abrir no editor") */}
              {(state === "PREVIEW" || state === "SAVING") && proposal && (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="bg-[#FAFBF9] border border-[#E5E8E2] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-[#102E23] block">
                        Prévia da importação (material original preservado)
                      </span>
                      <span className="text-[#526058] text-[11px]">
                        {proposal.stats.totalExercises} exercícios identificados •{" "}
                        <span className="text-[#176B49] font-bold">
                          {editableCategories.reduce((acc, c) => acc + c.exercises.filter((e) => e.exercisePublicId).length, 0)} vinculados à biblioteca
                        </span>
                        {" • "}
                        <span className="text-[#526058] font-medium">
                          {editableCategories.reduce((acc, c) => acc + c.exercises.filter((e) => !e.exercisePublicId).length, 0)} mantidos com texto original
                        </span>
                      </span>
                    </div>

                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border bg-[#EBF7EE] text-[#12583B] border-[#C3E6CC] self-start sm:self-auto">
                      ✓ Pronto para o editor
                    </span>
                  </div>

                  {/* Workout Title Field */}
                  <div className="space-y-1">
                    <label htmlFor="import-workout-title" className="block text-xs font-bold text-[#102E23]">
                      Título da ficha de treino:
                    </label>
                    <input
                      id="import-workout-title"
                      type="text"
                      value={workoutTitle}
                      onChange={(e) => setWorkoutTitle(e.target.value)}
                      className="w-full bg-[#FAFBF9] border border-[#E5E8E2] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#102E23] focus:outline-none focus:ring-1 focus:ring-[#176B49] min-h-[44px]"
                    />
                  </div>

                  {/* Expandable Divisions & Exercises */}
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {editableCategories.map((cat, cIdx) => {
                      const isExpanded = expandedDivisions[cIdx] !== false;

                      return (
                        <div key={`c-${cIdx}`} className="border border-[#E5E8E2] rounded-2xl p-3.5 bg-[#FAFBF9] space-y-2.5">
                          {/* Division Expandable Header */}
                          <div
                            onClick={() => toggleDivisionExpand(cIdx)}
                            className="font-bold text-xs text-[#102E23] flex items-center justify-between cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2">
                              <span>{cat.name}</span>
                              <span className="text-[11px] text-[#6B7870] font-normal">
                                ({cat.exercises.length} exercícios)
                              </span>
                            </div>

                            <button
                              type="button"
                              className="p-1 rounded-lg hover:bg-black/5 text-[#526058]"
                              aria-label={isExpanded ? "Recolher divisão" : "Expandir divisão"}
                            >
                              {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                            </button>
                          </div>

                          {/* Exercise Items in this Division */}
                          {isExpanded && (
                            <div className="space-y-2 pt-1">
                              {cat.exercises.map((ex, eIdx) => (
                                <div
                                  key={ex.id || `e-${eIdx}`}
                                  className="bg-white border border-[#E5E8E2] rounded-xl p-3 space-y-2 text-xs shadow-2xs"
                                >
                                  <div className="flex items-start justify-between gap-2.5 flex-wrap">
                                    <div className="min-w-0 flex-1 space-y-1">
                                      <div>
                                        <span className="text-[10px] font-bold uppercase text-[#8C9890] block">
                                          Original do documento:
                                        </span>
                                        <div className="font-bold text-[#102E23] text-xs flex items-center gap-1.5 flex-wrap mt-0.5">
                                          <span>{ex.exerciseNameSnapshot}</span>
                                          {ex.groupName && (
                                            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-[#F5F5F0] text-[#526058] border border-[#E5E8E2]">
                                              {ex.groupName}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="text-[11px] text-[#526058] font-mono mt-0.5">
                                        {ex.sets || 3} séries × {ex.reps ? (ex.repsMax && ex.repsMax > ex.reps ? `${ex.reps}–${ex.repsMax} reps` : `${ex.reps} reps`) : ex.durationSeconds ? formatDurationNatural(ex.durationSeconds, ex.durationUnit) : "livre"}
                                        {ex.load ? ` • Carga: ${ex.load} kg` : ""}
                                        {ex.restSeconds ? ` • Descanso: ${ex.restSeconds}s` : ""}
                                      </div>

                                      {/* Library link status */}
                                      <div className="pt-1.5 border-t border-[#F0F2ED] flex items-center gap-2 flex-wrap text-[11px]">
                                        <span className="text-[10px] font-bold uppercase text-[#8C9890]">
                                          Biblioteca Oficial:
                                        </span>
                                        {ex.exercisePublicId ? (
                                          <div className="inline-flex items-center gap-1 text-[#176B49] font-bold bg-[#EBF7EE] border border-[#C3E6CC] px-2 py-0.5 rounded-md">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#176B49] shrink-0" />
                                            <span>{ex.matchedExerciseName || ex.exerciseNameSnapshot}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleUnlinkExercise(cIdx, eIdx)}
                                              className="text-[10px] text-[#8C9890] hover:text-rose-600 underline ml-1 cursor-pointer"
                                              title="Desvincular da biblioteca"
                                            >
                                              (desvincular)
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="inline-flex items-center gap-1 text-[#526058] bg-[#F5F5F0] border border-[#E5E8E2] px-2 py-0.5 rounded-md">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#8C9890] shrink-0" />
                                            <span>Mantido com nome original</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveExercise(cIdx, eIdx)}
                                      className="text-[#8C9890] hover:text-rose-600 p-1 rounded-lg hover:bg-[#F5F5F0] cursor-pointer shrink-0"
                                      title="Remover exercício da ficha"
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  {/* Candidate Suggestions if Unmatched */}
                                  {!ex.exercisePublicId && ex.candidates && ex.candidates.length > 0 && (
                                    <div className="pt-1.5 border-t border-[#F0F2ED] space-y-1">
                                      <span className="text-[10px] text-amber-700 font-medium block">
                                        Sugestões para vincular (opcional):
                                      </span>
                                      <div className="flex flex-wrap gap-1.5 items-center">
                                        {ex.candidates.map((cand) => (
                                          <button
                                            key={cand.exercisePublicId}
                                            type="button"
                                            onClick={() => handleResolveCandidate(cIdx, eIdx, cand)}
                                            className="px-2 py-1 bg-white hover:bg-[#EBF7EE] hover:text-[#176B49] text-[#102E23] rounded-lg text-[11px] font-semibold border border-[#E5E8E2] transition cursor-pointer flex items-center gap-1"
                                          >
                                            <span>+ Vincular:</span>
                                            <span>{cand.name}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer Controls: "Abrir no editor" */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#E5E8E2]">
                    <button
                      type="button"
                      onClick={() => setState("IDLE")}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] transition cursor-pointer"
                    >
                      Voltar / Refazer
                    </button>

                    <button
                      type="button"
                      disabled={state === "SAVING" || totalExercisesCount === 0}
                      onClick={handleConfirmImport}
                      className="px-5 py-2.5 bg-[#176B49] hover:bg-[#12583B] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                    >
                      <span>
                        {state === "SAVING" ? "Preparando editor..." : "Abrir no editor"}
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
