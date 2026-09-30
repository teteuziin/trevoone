"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  ResolvedTrainingProposal,
  ResolvedTrainingCategory,
  ResolvedTrainingExerciseItem,
} from "@/lib/training-v2/training-ai-importer";

interface Props {
  consultancySlug: string;
  targetStudentMembershipId?: number;
}

export function TrainingAiImportModal({ consultancySlug, targetStudentMembershipId }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
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

  useEffect(() => {
    if (isOpen) {
      fetchQuota();
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setState("IDLE");
    setErrorMsg(null);
    setSelectedFile(null);
    setPastedText("");
    setProposal(null);
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
      if (targetStudentMembershipId) {
        formData.append("targetStudentMembershipId", String(targetStudentMembershipId));
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
    } catch (err: any) {
      setErrorMsg(err.message || "Falha na análise do treino com IA.");
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
    if (!proposal || hasUnresolvedItems) return;
    setErrorMsg(null);
    setState("SAVING");

    try {
      const res = await fetch(`/api/consultancies/${consultancySlug}/ai/training-import/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobPublicId: proposal.jobPublicId,
          targetStudentMembershipId: proposal.targetStudentMembershipId || targetStudentMembershipId || null,
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
    } catch (err: any) {
      setErrorMsg(err.message || "Falha ao confirmar importação.");
      setState("PREVIEW");
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 transition shadow-2xs min-h-[42px]"
      >
        <span className="text-sm">✨</span>
        <span>Importar treino com IA</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-sm"
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
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
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

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-medium transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    disabled={quota?.remainingToday === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
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
                                <div className="font-semibold text-foreground">
                                  {ex.exerciseNameCandidate}
                                </div>
                                <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                  {ex.sets || 3} séries × {ex.reps ? `${ex.reps} reps` : ex.durationSeconds ? `${ex.durationSeconds}s` : "livre"}
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
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-medium transition"
                  >
                    Voltar / Refazer
                  </button>

                  <button
                    type="button"
                    disabled={hasUnresolvedItems || state === "SAVING" || totalExercisesCount === 0}
                    onClick={handleConfirmImport}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <span>{state === "SAVING" ? "Criando ficha..." : "Criar Ficha de Treino"}</span>
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
