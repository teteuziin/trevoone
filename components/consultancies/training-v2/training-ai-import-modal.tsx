"use client";

import React, { useState, useRef } from "react";
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
  const setIsOpen = (val: boolean) => {
    setInternalIsOpen(val);
    if (!val && onCloseControlled) {
      onCloseControlled();
    }
  };
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
      setErrorMsg("Selecione um arquivo PDF, TXT, MD ou DOCX.");
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
        throw new Error(data.error || "Erro ao processar arquivo com IA.");
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
      ex.exerciseNameSnapshot = candidate.name;
      ex.muscleGroupSnapshot = candidate.muscleGroupPrimary;
      ex.equipmentSnapshot = candidate.equipment;
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

  const hasUnresolvedItems = editableCategories.some((cat) =>
    cat.exercises.some((ex) => ex.matchStatus !== "MATCHED" || !ex.exercisePublicId)
  );

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

  return (
    <>
      {/* Trigger Button */}
      {!hideTrigger && (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] transition shadow-2xs min-h-[42px]"
        >
          <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Importar treino</span>
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div
            className="w-full sm:max-w-2xl bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle */}
            <div className="pb-1 flex justify-center sm:hidden">
              <div className="w-12 h-1.5 rounded-full bg-[var(--border-strong)]" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between border-b border-border/40 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 text-sm font-bold uppercase tracking-wider">
                    Inteligência Artificial TREVO ONE
                  </span>
                </div>
                <h2 className="text-lg font-bold text-foreground mt-0.5">
                  Importação Inteligente de Treino
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Envie sua ficha em PDF, texto ou documento para extração canônica estruturada.
                </p>
              </div>
              <button
                type="button"
                disabled={state === "ANALYZING" || state === "SAVING"}
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground text-sm min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Quota Banner */}
            {quota && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40 text-xs">
                <span className="text-muted-foreground">
                  Importações com IA hoje:{" "}
                  <strong className="text-foreground">{quota.usedToday}</strong> de{" "}
                  <strong className="text-foreground">{quota.dailyLimit}</strong> utilizadas
                </span>
                <span className="font-semibold text-emerald-500">
                  Restam: {quota.remainingToday}
                </span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-3">
                <span className="font-semibold">{errorMsg}</span>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setState("IDLE");
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition cursor-pointer shrink-0 min-h-[36px]"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {/* STATE: IDLE - Upload Form */}
            {state === "IDLE" && (
              <div className="space-y-4">
                {/* Tabs: File vs Text */}
                <div className="flex border-b border-border/40 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setMode("FILE")}
                    className={`py-2 px-4 border-b-2 transition ${
                      mode === "FILE"
                        ? "border-emerald-500 text-foreground font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Enviar Arquivo (PDF / DOCX / TXT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("TEXT")}
                    className={`py-2 px-4 border-b-2 transition ${
                      mode === "TEXT"
                        ? "border-emerald-500 text-foreground font-bold"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Colar Texto
                  </button>
                </div>

                {mode === "FILE" ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border/60 hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer transition bg-muted/10 hover:bg-muted/20 space-y-3"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,.md,.docx"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <span className="text-3xl block">📄</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedFile ? selectedFile.name : "Clique para selecionar o arquivo"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos aceitos: PDF, TXT, MD ou DOCX (até 15MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Cole o conteúdo do treino abaixo:
                    </label>
                    <textarea
                      rows={8}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Ex: Treino A - Peito e Tríceps&#10;Supino reto 4x10&#10;Crucifixo 3x12&#10;Tríceps corda 4x12..."
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-mono"
                    />
                  </div>
                )}

                {/* Student Selector */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Aluno da Consultoria (Opcional)
                  </label>
                  {targetStudentMembershipId ? (
                    <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs text-muted-foreground">
                      Aluno contextualizado pela página atual.
                    </div>
                  ) : (
                    <select
                      value={selectedStudentId || ""}
                      onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-xl bg-surface border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">[ Nenhum — salvar como rascunho ]</option>
                      {students.map((s) => (
                        <option key={s.membershipId} value={s.membershipId}>
                          {s.fullName} ({s.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-semibold transition min-h-[44px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    disabled={quota?.remainingToday === 0}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs flex items-center gap-2 min-h-[48px] cursor-pointer"
                  >
                    <span>✨</span>
                    <span>Analisar treino com IA</span>
                  </button>
                </div>
              </div>
            )}

            {/* STATE: ANALYZING */}
            {state === "ANALYZING" && (
              <div className="py-12 text-center space-y-4">
                <div className="inline-block animate-spin text-3xl">✨</div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Analisando treino com inteligência artificial...
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Extraindo categorias, séries, repetições e correlacionando com a Biblioteca de Exercícios TREVO ONE.
                  </p>
                </div>
              </div>
            )}

            {/* STATE: PREVIEW */}
            {(state === "PREVIEW" || state === "SAVING") && proposal && (
              <div className="space-y-5">
                {/* Stats Summary Card */}
                <div className="bg-muted/30 border border-border/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-foreground block">
                      Resultado da Extração Canônica
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {proposal.stats.totalExercises} exercícios identificados •{" "}
                      <span className="text-emerald-500 font-semibold">
                        {proposal.stats.matchedCount} encontrados
                      </span>
                      {proposal.stats.ambiguousCount > 0 && (
                        <span className="text-amber-400 font-semibold ml-1">
                          • {proposal.stats.ambiguousCount} precisam de revisão
                        </span>
                      )}
                      {proposal.stats.notFoundCount > 0 && (
                        <span className="text-rose-400 font-semibold ml-1">
                          • {proposal.stats.notFoundCount} não encontrados
                        </span>
                      )}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      hasUnresolvedItems
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}
                  >
                    {hasUnresolvedItems ? "Precisa de Revisão" : "Pronto para Criar"}
                  </span>
                </div>

                {/* Student Assignment in Preview */}
                <div className="flex items-center gap-2 text-xs flex-wrap p-2.5 rounded-xl bg-muted/20 border border-border/40">
                  <span className="font-bold text-foreground">Aluno:</span>
                  {targetStudentMembershipId ? (
                    <span className="text-emerald-500 font-semibold">
                      {proposal.targetStudentName || "Aluno contextualizado"}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={selectedStudentId || ""}
                        onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                        className="bg-surface border border-border rounded-xl px-2 py-1 text-xs text-foreground focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">[ Nenhum — salvar como rascunho ]</option>
                        {students.map((s) => (
                          <option key={s.membershipId} value={s.membershipId}>
                            {s.fullName} ({s.email})
                          </option>
                        ))}
                      </select>
                      {proposal.studentNameCandidate && (
                        <span className="text-muted-foreground text-[11px] italic">
                          (Documento indica sugestão: &ldquo;{proposal.studentNameCandidate}&rdquo;)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Workout Title Field */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Título da Ficha de Treino
                  </label>
                  <input
                    type="text"
                    value={workoutTitle}
                    onChange={(e) => setWorkoutTitle(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                {/* Categories & Exercises List */}
                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  {editableCategories.map((cat, cIdx) => (
                    <div key={`c-${cIdx}`} className="border border-border/50 rounded-xl p-3 bg-card/40 space-y-2">
                      <div className="font-bold text-xs text-foreground uppercase tracking-wide flex items-center justify-between">
                        <span>{cat.name}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {cat.exercises.length} exercícios
                        </span>
                      </div>

                      <div className="space-y-2">
                        {cat.exercises.map((ex, eIdx) => (
                          <div
                            key={ex.id || `e-${eIdx}`}
                            className="bg-background/80 border border-border/40 rounded-lg p-2.5 space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                  <span>{ex.exerciseNameCandidate}</span>
                                  {ex.groupName && (
                                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/40">
                                      {ex.groupName}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                  {ex.sets || 3} séries × {ex.reps ? (ex.repsMax && ex.repsMax > ex.reps ? `${ex.reps}–${ex.repsMax} reps` : `${ex.reps} reps`) : ex.durationSeconds ? formatDurationNatural(ex.durationSeconds, ex.durationUnit) : "livre"}
                                  {ex.load ? ` • Carga: ${ex.load} kg` : ""}
                                  {ex.restSeconds ? ` • Descanso: ${ex.restSeconds}s` : ""}
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {ex.matchStatus === "MATCHED" && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    ✓ Encontrado
                                  </span>
                                )}
                                {ex.matchStatus === "AMBIGUOUS" && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    ⚠ Ambíguo
                                  </span>
                                )}
                                {ex.matchStatus === "NOT_FOUND" && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                    ✕ Não Encontrado
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveExercise(cIdx, eIdx)}
                                  className="text-muted-foreground hover:text-rose-400 p-0.5"
                                  title="Remover exercício"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>

                            {/* If Ambiguous, show candidate picker */}
                            {ex.matchStatus === "AMBIGUOUS" && ex.candidates.length > 0 && (
                              <div className="pt-1 border-t border-border/30 space-y-1">
                                <span className="text-[10px] text-amber-400 font-medium block">
                                  Selecione o exercício correspondente na biblioteca:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {ex.candidates.map((cand) => (
                                    <button
                                      key={cand.exercisePublicId}
                                      type="button"
                                      onClick={() => handleResolveCandidate(cIdx, eIdx, cand)}
                                      className="px-2 py-1 bg-muted/60 hover:bg-emerald-500/20 hover:text-emerald-400 rounded text-[10px] font-medium border border-border/40 transition"
                                    >
                                      {cand.name}
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
                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => setState("IDLE")}
                    className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-semibold transition min-h-[44px] cursor-pointer"
                  >
                    Voltar / Refazer
                  </button>

                  <button
                    type="button"
                    disabled={state === "SAVING" || totalExercisesCount === 0}
                    onClick={handleConfirmImport}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs flex items-center gap-2 min-h-[48px] cursor-pointer"
                  >
                    <span>
                      {state === "SAVING"
                        ? "Salvando rascunho..."
                        : hasUnresolvedItems
                        ? "Salvar rascunho com pendências"
                        : selectedStudentId || targetStudentMembershipId
                        ? "Salvar rascunho"
                        : "Salvar como rascunho"}
                    </span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
