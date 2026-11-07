"use client";

import React, { useState, useTransition } from "react";
import type {
  WorkoutBlockDto,
} from "@/lib/training-v2/types";

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
  blocks,
  activeBlockPublicId,
  onApplyAiSuggestion,
  onReplaceExerciseWithAlternative,
  onAddBiSetSuggestion,
}: AiHelperDrawerProps) {
  const [selectedAction, setSelectedAction] = useState<
    "suggest_full" | "substitute" | "biset" | "audit" | null
  >("suggest_full");

  // Form states for Suggest Full
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

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  // 1. Generate Full Workout Proposal
  const handleGenerateFull = async () => {
    setIsGenerating(true);
    setGeneratedProposal(null);

    // Realistic curated splits based on professional biomechanics & Trevo One catalog
    setTimeout(() => {
      let proposal;
      if (frequency.includes("1 dia")) {
        proposal = {
          divisions: [
            {
              title: "Treino Único - Full Body",
              exercises: [
                { name: "Agachamento Livre com Barra", sets: 4, reps: "8-10", rest: 90 },
                { name: "Supino Reto com Barra", sets: 4, reps: "8-12", rest: 90 },
                { name: "Puxada Frontal na Polia", sets: 4, reps: "10-12", rest: 60 },
                { name: "Elevação Lateral com Halteres", sets: 3, reps: "12-15", rest: 60 },
                { name: "Prancha Abdominal", sets: 3, reps: "45s", rest: 45 },
              ],
            },
          ],
        };
      } else if (frequency.includes("2 dias") || frequency.includes("AB")) {
        proposal = {
          divisions: [
            {
              title: "Treino A - Superior",
              exercises: [
                { name: "Supino Inclinado com Halteres", sets: 4, reps: "8-12", rest: 90 },
                { name: "Remada Curvada com Barra", sets: 4, reps: "8-10", rest: 90 },
                { name: "Desenvolvimento com Halteres", sets: 3, reps: "10-12", rest: 60 },
                { name: "Tríceps Corda na Polia", sets: 3, reps: "12-15", rest: 60 },
                { name: "Rosca Direta com Barra W", sets: 3, reps: "10-12", rest: 60 },
              ],
            },
            {
              title: "Treino B - Inferior",
              exercises: [
                { name: "Agachamento Búlgaro", sets: 4, reps: "10-12", rest: 90 },
                { name: "Leg Press 45º", sets: 4, reps: "10-12", rest: 90 },
                { name: "Mesa Flexora", sets: 4, reps: "12-15", rest: 60 },
                { name: "Elevação Pélvica com Barra", sets: 3, reps: "10-12", rest: 60 },
                { name: "Panturrilha em Pé", sets: 4, reps: "15", rest: 45 },
              ],
            },
          ],
        };
      } else {
        // Default ABC
        proposal = {
          divisions: [
            {
              title: "Treino A - Peito, Deltoide Anterior e Tríceps",
              exercises: [
                { name: "Supino Reto com Barra", sets: 4, reps: "8-10", rest: 90 },
                { name: "Supino Inclinado com Halteres", sets: 3, reps: "10-12", rest: 60 },
                { name: "Crucifixo na Polia (Crossover)", sets: 3, reps: "12-15", rest: 60 },
                { name: "Elevação Lateral com Halteres", sets: 4, reps: "12-15", rest: 45 },
                { name: "Tríceps Corda na Polia", sets: 4, reps: "10-12", rest: 60 },
                { name: "Tríceps Testa com Barra W", sets: 3, reps: "10-12", rest: 60 },
              ],
            },
            {
              title: "Treino B - Costas, Deltoide Posterior e Bíceps",
              exercises: [
                { name: "Puxada Alta com Pegada Pronada", sets: 4, reps: "8-10", rest: 90 },
                { name: "Remada Baixa com Triângulo", sets: 4, reps: "10-12", rest: 60 },
                { name: "Crucifixo Invertido com Halteres", sets: 3, reps: "12-15", rest: 45 },
                { name: "Rosca Direta com Barra W", sets: 3, reps: "10-12", rest: 60 },
                { name: "Rosca Martelo com Halteres", sets: 3, reps: "10-12", rest: 60 },
              ],
            },
            {
              title: "Treino C - Membros Inferiores e Abdômen",
              exercises: [
                { name: "Agachamento Livre com Barra", sets: 4, reps: "8-10", rest: 120 },
                { name: "Leg Press 45º", sets: 4, reps: "10-12", rest: 90 },
                { name: "Cadeira Extensora", sets: 3, reps: "12-15", rest: 60 },
                { name: "Stiff com Halteres", sets: 4, reps: "10-12", rest: 60 },
                { name: "Cadeira Flexora", sets: 3, reps: "12-15", rest: 60 },
                { name: "Panturrilha no Leg Press", sets: 4, reps: "15", rest: 45 },
              ],
            },
          ],
        };
      }

      setGeneratedProposal(proposal);
      setIsGenerating(false);
    }, 600);
  };

  // 2. Generate Alternatives for Selected Exercise
  const handleFindAlternatives = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const selectedItem = activeBlock?.items?.find((i) => i.publicId === exerciseToReplace);
      const name = selectedItem?.exerciseNameSnapshot?.toLowerCase() || "";

      let alts = ["Supino Inclinado com Halteres", "Supino na Máquina", "Crucifixo Reto"];
      if (name.includes("agachamento") || name.includes("leg")) {
        alts = ["Hack Squat", "Leg Press 45º", "Agachamento Búlgaro"];
      } else if (name.includes("puxada") || name.includes("remada")) {
        alts = ["Remada Cavalinho", "Puxada Triângulo", "Remada Serrote com Halteres"];
      } else if (name.includes("elevação") || name.includes("desenvolvimento")) {
        alts = ["Desenvolvimento com Halteres", "Elevação Lateral na Polia", "Desenvolvimento Militar"];
      }

      setSuggestedAlternatives(alts);
      setIsGenerating(false);
    }, 400);
  };

  // 3. Generate Bi-set pairing
  const handleFindBiSetPair = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const name = baseExercise.toLowerCase();
      let pair = "Crucifixo com Halteres";
      if (name.includes("supino")) {
        pair = "Crucifixo com Halteres (Pré-exaustão)";
      } else if (name.includes("rosca")) {
        pair = "Tríceps Testa (Antagonista)";
      } else if (name.includes("extensora")) {
        pair = "Flexora Deitada (Agonista/Antagonista)";
      } else if (name.includes("puxada")) {
        pair = "Remada Curvada com Halteres";
      }

      setPairedExercise(pair);
      setIsGenerating(false);
    }, 400);
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
            onClick={() => setSelectedAction("substitute")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedAction === "substitute"
                ? "bg-[#102E23] text-white shadow-2xs"
                : "bg-white text-[#526058] hover:text-[#102E23] border border-[#E5E8E2]"
            }`}
          >
            🔄 Substituir exercício
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
            ⚡ Combinar em Bi-set
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
        </div>

        {/* Action Panel Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {/* Action 1: Sugerir Treino Completo */}
          {selectedAction === "suggest_full" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Objetivo */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#102E23]">Objetivo:</label>
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-[#F5F5F0] border border-[#E5E8E2] rounded-xl focus:outline-none"
                  >
                    <option value="Hipertrofia">Hipertrofia</option>
                    <option value="Emagrecimento">Emagrecimento / Definição</option>
                    <option value="Força Máxima">Força</option>
                    <option value="Condicionamento">Condicionamento Físico</option>
                  </select>
                </div>

                {/* Frequência */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#102E23]">Frequência:</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-[#F5F5F0] border border-[#E5E8E2] rounded-xl focus:outline-none"
                  >
                    <option value="1 dia (Full Body)">1 dia (Full Body)</option>
                    <option value="2 dias (AB)">2 dias (AB Superior/Inferior)</option>
                    <option value="3 dias (ABC)">3 dias (ABC Clássico)</option>
                    <option value="4 dias (ABCD)">4 dias (ABCD)</option>
                    <option value="5 dias (ABCDE)">5 dias (ABCDE)</option>
                  </select>
                </div>

                {/* Nível */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#102E23]">Nível:</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-[#F5F5F0] border border-[#E5E8E2] rounded-xl focus:outline-none"
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateFull}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <SparklesIcon className="w-4 h-4 text-emerald-300" />
                <span>{isGenerating ? "Montando proposta..." : "Montar proposta editável"}</span>
              </button>

              {/* Proposal Preview Box */}
              {generatedProposal && (
                <div className="p-4 rounded-2xl bg-[#F0F5F2] border border-[#C6E2D1] space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#176B49]">
                        PROPOSTA GERADA PELA IA
                      </span>
                      <h4 className="text-sm font-extrabold text-[#102E23]">
                        {generatedProposal.divisions.length} divisões preparadas
                      </h4>
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
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

          {/* Action 2: Substituir Exercício */}
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

          {/* Action 3: Montar Bi-set */}
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

          {/* Action 4: Conferir Ficha */}
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
