"use client";

import React, { useState, useTransition, useMemo } from "react";
import type {
  WorkoutBlockDto,
} from "@/lib/training-v2/types";
import {
  generateFullWorkoutAiAction,
  suggestExerciseAlternativeAiAction,
  suggestBiSetPairAiAction,
  adjustDivisionAiAction,
} from "@/app/consultoria/[slug]/rotinas/ai-actions";

interface AiHelperDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  blocks: WorkoutBlockDto[];
  activeBlockPublicId: string;
  onApplyAiSuggestion: (proposal: {
    divisions: Array<{
      title: string;
      exercises: Array<{ name: string; sets: number; reps: string; rest: number }>;
    }>;
  }) => Promise<void>;
  onReplaceExerciseWithAlternative: (itemPublicId: string, newExerciseName: string) => Promise<void>;
  onAddBiSetSuggestion: (exerciseNameA: string, exerciseNameB: string) => Promise<void>;
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

export function AiHelperDrawer({
  isOpen,
  onClose,
  consultancySlug,
  blocks,
  activeBlockPublicId,
  onApplyAiSuggestion,
  onReplaceExerciseWithAlternative,
  onAddBiSetSuggestion,
}: AiHelperDrawerProps) {
  const totalItemsCount = useMemo(() => {
    return blocks.reduce((acc, b) => acc + (b.items?.length || 0), 0);
  }, [blocks]);

  const hasExistingItems = totalItemsCount > 0;

  const [selectedAction, setSelectedAction] = useState<
    "suggest_full" | "complete_workout" | "substitute" | "biset" | "audit"
  >(hasExistingItems ? "complete_workout" : "suggest_full");

  // Form states for Suggest Full
  const [freePrompt, setFreePrompt] = useState("");
  const [objective, setObjective] = useState("Hipertrofia");
  const [frequency, setFrequency] = useState("3 dias (ABC)");
  const [level, setLevel] = useState("Intermediário");

  // State for proposal preview
  const [generatedProposal, setGeneratedProposal] = useState<{
    divisions: Array<{
      title: string;
      exercises: Array<{ name: string; sets: number; reps: string; rest: number }>;
    }>;
  } | null>(null);

  // States for Substitute
  const activeBlock = blocks.find((b) => b.publicId === activeBlockPublicId) || blocks[0];
  const [exerciseToReplace, setExerciseToReplace] = useState<string>(
    activeBlock?.items?.[0]?.publicId || ""
  );
  const [suggestedAlternatives, setSuggestedAlternatives] = useState<string[]>([]);

  // States for Bi-set pairing
  const [baseExercise, setBaseExercise] = useState<string>(
    activeBlock?.items?.[0]?.exerciseNameSnapshot || ""
  );
  const [pairedExercise, setPairedExercise] = useState<string>("");

  // States for Complete Workout suggestions
  const [completionSuggestions, setCompletionSuggestions] = useState<
    Array<{ name: string; sets: number; reps: string; rest: number; reason: string }>
  >([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  // 1. Generate Full Workout Proposal with Destiny AI + Fallback
  const handleGenerateFull = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setGeneratedProposal(null);

    try {
      const res = await generateFullWorkoutAiAction(consultancySlug, {
        freePrompt: freePrompt.trim() || undefined,
        objective,
        frequency,
        level,
      });

      if (res.success && res.proposal) {
        setGeneratedProposal(res.proposal);
      } else {
        setErrorMessage(
          res.error ||
            "Não conseguimos utilizar a IA agora. Você pode tentar novamente ou continuar montando o treino manualmente."
        );
      }
    } catch (err: unknown) {
      console.error("[AiHelperDrawer] Erro ao gerar proposta completa:", err);
      setErrorMessage(
        "Não conseguimos utilizar a IA agora. Você pode tentar novamente ou continuar montando o treino manualmente."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Generate Alternatives for Selected Exercise with Destiny AI
  const handleFindAlternatives = async () => {
    const selectedItem = activeBlock?.items?.find((i) => i.publicId === exerciseToReplace);
    const exerciseName = selectedItem?.exerciseNameSnapshot || "";

    if (!exerciseName.trim()) return;

    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const res = await suggestExerciseAlternativeAiAction(
        consultancySlug,
        exerciseName,
        activeBlock?.title ?? undefined
      );

      if (res.success && res.alternatives && res.alternatives.length > 0) {
        setSuggestedAlternatives(res.alternatives.map((a) => a.name));
      } else {
        setErrorMessage(
          res.error ||
            "Não conseguimos utilizar a IA agora. Você pode tentar novamente ou continuar montando o treino manualmente."
        );
      }
    } catch (err: unknown) {
      console.error("[AiHelperDrawer] Erro ao buscar alternativas:", err);
      setErrorMessage(
        "Não conseguimos utilizar a IA agora. Você pode tentar novamente ou continuar montando o treino manualmente."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Generate Bi-set pairing with Destiny AI
  const handleFindBiSetPair = async () => {
    if (!baseExercise.trim()) return;

    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const res = await suggestBiSetPairAiAction(consultancySlug, baseExercise);

      if (res.success && res.proposal?.pairedExercise) {
        setPairedExercise(res.proposal.pairedExercise);
      } else {
        setErrorMessage(
          res.error ||
            "Não conseguimos utilizar a IA agora. Você pode tentar novamente ou continuar montando o treino manualmente."
        );
      }
    } catch (err: unknown) {
      console.error("[AiHelperDrawer] Erro ao sugerir par Bi-set:", err);
      setErrorMessage(
        "Não conseguimos utilizar a IA agora. Você pode tentar novamente ou continuar montando o treino manualmente."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Generate Completion Suggestions for Current Division with Destiny AI
  const handleGenerateCompletion = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const currentNames = (activeBlock?.items || []).map((i) => i.exerciseNameSnapshot);
      const res = await adjustDivisionAiAction(
        consultancySlug,
        activeBlock?.title || "Treino A",
        currentNames,
        "Sugerir complementos equilibrados para fechar esta divisão"
      );

      if (res.success && res.adjustedDivision && res.adjustedDivision.exercises.length > 0) {
        setCompletionSuggestions(
          res.adjustedDivision.exercises.map((e) => ({
            name: e.name,
            sets: e.sets,
            reps: e.reps,
            rest: e.rest,
            reason: "Exercício complementar sugerido pela IA para equilibrar a divisão.",
          }))
        );
      } else {
        setErrorMessage(
          res.error ||
            "Não conseguimos utilizar a IA agora. Você pode tentar novamente ou continuar montando o treino manualmente."
        );
      }
    } catch (err: unknown) {
      console.error("[AiHelperDrawer] Erro ao gerar complementos:", err);
      setErrorMessage(
        "Não conseguimos utilizar a IA agora. Você pode tentar novamente ou continuar montando o treino manualmente."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-gradient-to-r from-[#0F2F24] to-[#176B49] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-emerald-300">
              <SparklesIcon />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                Me ajuda — Assistente de Prescrição
              </h2>
              <p className="text-xs text-white/80">
                Ações diretas e estruturadas para acelerar a montagem de treinos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Action Selection Tabs */}
        <div className="flex items-center gap-1.5 p-3 border-b border-[#E5E8E2] overflow-x-auto scrollbar-none bg-[#FAFBF9]">
          {hasExistingItems ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedAction("complete_workout")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedAction === "complete_workout"
                    ? "bg-[#102E23] text-white shadow-2xs"
                    : "bg-white text-[#526058] hover:text-[#102E23] border border-[#E5E8E2]"
                }`}
              >
                ⚡ Completar meu treino
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction("substitute")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedAction === "substitute"
                    ? "bg-[#102E23] text-white shadow-2xs"
                    : "bg-white text-[#526058] hover:text-[#102E23] border border-[#E5E8E2]"
                }`}
              >
                🔄 Trocar exercício
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction("biset")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedAction === "biset"
                    ? "bg-[#102E23] text-white shadow-2xs"
                    : "bg-white text-[#526058] hover:text-[#102E23] border border-[#E5E8E2]"
                }`}
              >
                🔗 Combinar em Bi-set
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction("audit")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedAction === "audit"
                    ? "bg-[#102E23] text-white shadow-2xs"
                    : "bg-white text-[#526058] hover:text-[#102E23] border border-[#E5E8E2]"
                }`}
              >
                ✓ Conferir ficha
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction("suggest_full")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedAction === "suggest_full"
                    ? "bg-[#102E23] text-white shadow-2xs"
                    : "bg-white text-[#526058] hover:text-[#102E23] border border-[#E5E8E2]"
                }`}
              >
                📋 Sugerir do zero
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSelectedAction("suggest_full")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedAction === "suggest_full"
                    ? "bg-[#102E23] text-white shadow-2xs"
                    : "bg-white text-[#526058] hover:text-[#102E23] border border-[#E5E8E2]"
                }`}
              >
                📋 Sugerir treino completo
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction("audit")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedAction === "audit"
                    ? "bg-[#102E23] text-white shadow-2xs"
                    : "bg-white text-[#526058] hover:text-[#102E23] border border-[#E5E8E2]"
                }`}
              >
                ✓ Dicas de montagem
              </button>
            </>
          )}
        </div>

        {/* Action Panel Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start justify-between gap-3 animate-in fade-in">
              <div className="space-y-0.5">
                <p className="font-bold">{errorMessage}</p>
                <p className="text-[11px] text-amber-800">
                  Você pode continuar montando o treino manualmente ou tentar novamente em instantes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-amber-800 hover:text-amber-950 font-bold px-1.5 py-0.5 rounded-md hover:bg-amber-100 transition-colors cursor-pointer"
                aria-label="Fechar aviso"
              >
                ✕
              </button>
            </div>
          )}
          {/* Action: Completar Meu Treino (quando já existem itens) */}
          {selectedAction === "complete_workout" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#F0F5F2] border border-[#C6E2D1] text-xs space-y-1">
                <span className="font-bold text-[#102E23] block">
                  Divisão ativa: {activeBlock?.title || "Treino"} ({activeBlock?.items?.length || 0} exercícios)
                </span>
                <p className="text-[#526058]">
                  A IA analisa os exercícios já adicionados nesta divisão e sugere os complementos ideais para fechar a sessão com equilíbrio.
                </p>
              </div>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateCompletion}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <SparklesIcon className="w-4 h-4 text-emerald-300" />
                <span>{isGenerating ? "Analisando lacunas..." : "Sugerir complementos para esta divisão"}</span>
              </button>

              {completionSuggestions.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <p className="text-xs font-bold text-[#102E23]">
                    Sugestões para completar sua divisão:
                  </p>
                  <div className="space-y-2">
                    {completionSuggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white border border-[#E5E8E2] text-xs flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#102E23]">{sug.name}</p>
                          <p className="text-[11px] text-[#176B49] font-medium mt-0.5">
                            {sug.sets} séries × {sug.reps} reps • {sug.rest}s descanso
                          </p>
                          <p className="text-[10px] text-[#6B7870] mt-0.5 italic">{sug.reason}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            // Add single exercise proposal to active block
                            onApplyAiSuggestion({
                              divisions: [
                                {
                                  title: activeBlock.title || "Treino",
                                  exercises: [
                                    {
                                      name: sug.name,
                                      sets: sug.sets,
                                      reps: sug.reps,
                                      rest: sug.rest,
                                    },
                                  ],
                                },
                              ],
                            });
                            // Remove from list
                            setCompletionSuggestions((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors shrink-0 cursor-pointer"
                        >
                          + Adicionar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action: Sugerir Treino Completo (do zero ou substituição total) */}
          {selectedAction === "suggest_full" && (
            <div className="space-y-4">
              {/* Campo de Texto Aberto (Pedido Livre) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="ai-free-prompt" className="text-xs font-bold text-[#102E23]">
                    Descreva o treino que você deseja
                  </label>
                  <span className="text-[11px] font-mono text-[#6B7870]">
                    {freePrompt.length}/1000
                  </span>
                </div>
                <textarea
                  id="ai-free-prompt"
                  value={freePrompt}
                  onChange={(e) => setFreePrompt(e.target.value.slice(0, 1000))}
                  placeholder="Ex.: Quero um treino ABCDE para hipertrofia, com foco em costas, sessões de 60 minutos e descansos definidos..."
                  rows={4}
                  className="w-full p-3 text-xs text-[#102E23] placeholder-[#8C9890] bg-[#FDFDFC] border border-[#E5E8E2] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#176B49] focus:border-transparent transition-all resize-none shadow-2xs leading-relaxed"
                />
              </div>

              {/* Opções rápidas de suporte */}
              <div className="p-3 rounded-2xl bg-[#F8FAF7] border border-[#E5E8E2] space-y-2.5">
                <span className="text-[11px] font-bold text-[#526058] uppercase tracking-wider block">
                  Ou ajuste os parâmetros rápidos:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Objetivo */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#102E23]">Objetivo:</label>
                    <select
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#E5E8E2] rounded-xl focus:outline-none"
                    >
                      <option value="Hipertrofia">Hipertrofia</option>
                      <option value="Emagrecimento">Emagrecimento / Definição</option>
                      <option value="Força Máxima">Força</option>
                      <option value="Condicionamento">Condicionamento Físico</option>
                    </select>
                  </div>

                  {/* Frequência */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#102E23]">Frequência semanal:</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#E5E8E2] rounded-xl focus:outline-none"
                    >
                      <option value="1 dia (Full Body)">1 dia (Full Body)</option>
                      <option value="2 dias (AB)">2 dias (AB)</option>
                      <option value="3 dias (ABC)">3 dias (ABC)</option>
                      <option value="4 dias (ABCD)">4 dias (ABCD)</option>
                      <option value="5 dias (ABCDE)">5 dias (ABCDE)</option>
                      <option value="6 dias (ABCDEF)">6 dias (ABCDEF / PPL 2x)</option>
                    </select>
                  </div>

                  {/* Nível */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#102E23]">Nível:</label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#E5E8E2] rounded-xl focus:outline-none"
                    >
                      <option value="Iniciante">Iniciante</option>
                      <option value="Intermediário">Intermediário</option>
                      <option value="Avançado">Avançado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botão Principal */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateFull}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <SparklesIcon className="w-4 h-4 text-emerald-300" />
                <span>{isGenerating ? "Gerando treino com IA..." : "Gerar treino com IA"}</span>
              </button>

              {/* Proposal Preview Box */}
              {generatedProposal && (
                <div className="p-4 rounded-2xl bg-[#F0F5F2] border border-[#C6E2D1] space-y-3 animate-in fade-in duration-150">
                  {/* Overwrite Warning Banner if Workout Already Has Exercises */}
                  {hasExistingItems && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      <p className="font-bold">⚠️ Atenção: sua ficha atual já possui exercícios.</p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Aplicar esta sugestão substituirá as divisões existentes pelo novo treino gerado.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#176B49]">
                        PROPOSTA ESTRUTURADA PELA IA
                      </span>
                      <h4 className="text-sm font-extrabold text-[#102E23]">
                        {generatedProposal.divisions.length} divisões completas
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setGeneratedProposal(null)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-black/5 transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (
                            hasExistingItems &&
                            !window.confirm(
                              "Sua ficha atual já possui exercícios. Aplicar este treino substituirá as divisões existentes. Deseja continuar?"
                            )
                          ) {
                            return;
                          }
                          startTransition(async () => {
                            await onApplyAiSuggestion(generatedProposal);
                            onClose();
                          });
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-all shadow-xs cursor-pointer"
                      >
                        Aplicar ao meu treino →
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {generatedProposal.divisions.map((div, dIdx) => (
                      <div key={dIdx} className="p-3 rounded-xl bg-white border border-[#E5E8E2] text-xs">
                        <p className="font-bold text-[#102E23]">{div.title}</p>
                        <p className="text-[11px] text-[#6B7870] mt-0.5">
                          {div.exercises.map((e) => e.name).join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action: Substituir Exercício */}
          {selectedAction === "substitute" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#102E23]">
                  Selecione o exercício que deseja trocar:
                </label>
                <select
                  value={exerciseToReplace}
                  onChange={(e) => setExerciseToReplace(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-[#F5F5F0] border border-[#E5E8E2] rounded-xl focus:outline-none"
                >
                  {(activeBlock?.items || []).map((it) => (
                    <option key={it.publicId} value={it.publicId}>
                      {it.exerciseNameSnapshot}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={isGenerating || !exerciseToReplace}
                onClick={handleFindAlternatives}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isGenerating ? "Buscando opções..." : "Sugerir alternativas do mesmo grupo"}</span>
              </button>

              {suggestedAlternatives.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-bold text-[#102E23]">
                    Selecione uma alternativa para substituir:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {suggestedAlternatives.map((alt) => (
                      <div
                        key={alt}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#F0F5F2] border border-[#C6E2D1] text-xs"
                      >
                        <span className="font-bold text-[#102E23]">{alt}</span>
                        <button
                          type="button"
                          onClick={() => {
                            onReplaceExerciseWithAlternative(exerciseToReplace, alt);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors cursor-pointer"
                        >
                          Trocar por este →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action: Montar Bi-set */}
          {selectedAction === "biset" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#102E23]">
                  Exercício base para a combinação:
                </label>
                <input
                  type="text"
                  value={baseExercise}
                  onChange={(e) => setBaseExercise(e.target.value)}
                  placeholder="Ex: Supino Reto, Rosca Direta, Puxada Alta..."
                  className="w-full px-3 py-2 text-xs font-semibold bg-[#F5F5F0] border border-[#E5E8E2] rounded-xl focus:outline-none"
                />
              </div>

              <button
                type="button"
                disabled={isGenerating || !baseExercise.trim()}
                onClick={handleFindBiSetPair}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isGenerating ? "Calculando combinação..." : "Sugerir par sinergista/antagonista"}</span>
              </button>

              {pairedExercise && (
                <div className="p-4 rounded-2xl bg-[#F0F5F2] border border-[#C6E2D1] space-y-3">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#176B49]">
                      PAR SUGERIDO PELA IA
                    </span>
                    <p className="text-sm font-extrabold text-[#102E23] mt-0.5">
                      {baseExercise} + {pairedExercise}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onAddBiSetSuggestion(baseExercise, pairedExercise);
                      onClose();
                    }}
                    className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors shadow-xs cursor-pointer"
                  >
                    Criar Bi-set com este par →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action: Conferir Ficha */}
          {selectedAction === "audit" && (
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#F0F5F2] border border-[#C6E2D1] space-y-2">
                <div className="flex items-center gap-2 text-[#176B49] font-bold">
                  <span>✓</span>
                  <span>Auditoria de Volume e Equilíbrio Muscular</span>
                </div>
                <ul className="space-y-1.5 text-[#526058] pl-5 list-disc">
                  <li>Total de divisões: {blocks.length} divisões ativas.</li>
                  <li>
                    Total de exercícios na ficha:{" "}
                    {blocks.reduce((acc, b) => acc + (b.items?.length || 0), 0)} exercícios.
                  </li>
                  <li>
                    Tempo estimado por sessão: ~
                    {Math.round(
                      (activeBlock?.items?.reduce((acc, i) => acc + (i.sets?.length || 3), 0) || 0) * 2.5
                    )}{" "}
                    minutos.
                  </li>
                  <li>Descansos configurados em todos os blocos principais.</li>
                </ul>
              </div>

              <p className="text-[11px] text-[#6B7870] italic">
                A IA do trevoone atua como suporte técnico ao Personal Trainer. A validação final e individualização da carga pertencem exclusivamente ao profissional responsável.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
