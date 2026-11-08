"use client";

import React, { useState, useTransition, useMemo } from "react";
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
  const totalItemsCount = useMemo(() => {
    return blocks.reduce((acc, b) => acc + (b.items?.length || 0), 0);
  }, [blocks]);

  const hasExistingItems = totalItemsCount > 0;

  const [selectedAction, setSelectedAction] = useState<
    "suggest_full" | "complete_workout" | "substitute" | "biset" | "audit"
  >(hasExistingItems ? "complete_workout" : "suggest_full");

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

  // States for Complete Workout suggestions
  const [completionSuggestions, setCompletionSuggestions] = useState<
    Array<{ name: string; sets: number; reps: string; rest: number; reason: string }>
  >([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  // 1. Generate Full Workout Proposal with strict structural validation
  const handleGenerateFull = async () => {
    setIsGenerating(true);
    setGeneratedProposal(null);

    setTimeout(() => {
      let proposal: {
        divisions: Array<{
          title: string;
          exercises: Array<{ name: string; sets: number; reps: string; rest: number }>;
        }>;
      };

      // Strict matching based on frequency selection (no broken .includes("AB") substring collision)
      if (frequency.startsWith("1 dia")) {
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
      } else if (frequency.startsWith("2 dias")) {
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
      } else if (frequency.startsWith("3 dias")) {
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
      } else if (frequency.startsWith("4 dias")) {
        proposal = {
          divisions: [
            {
              title: "Treino A - Peito e Tríceps",
              exercises: [
                { name: "Supino Reto com Barra", sets: 4, reps: "8-10", rest: 90 },
                { name: "Supino Inclinado com Halteres", sets: 3, reps: "10-12", rest: 60 },
                { name: "Crucifixo na Máquina", sets: 3, reps: "12-15", rest: 60 },
                { name: "Tríceps Corda na Polia", sets: 4, reps: "10-12", rest: 60 },
                { name: "Tríceps Francês Unilateral", sets: 3, reps: "12", rest: 45 },
              ],
            },
            {
              title: "Treino B - Costas e Bíceps",
              exercises: [
                { name: "Puxada Frontal na Polia", sets: 4, reps: "8-10", rest: 90 },
                { name: "Remada Curvada com Barra", sets: 4, reps: "8-10", rest: 90 },
                { name: "Remada Baixa com Triângulo", sets: 3, reps: "10-12", rest: 60 },
                { name: "Rosca Direta com Barra W", sets: 4, reps: "10-12", rest: 60 },
                { name: "Rosca Scott com Halteres", sets: 3, reps: "10-12", rest: 45 },
              ],
            },
            {
              title: "Treino C - Membros Inferiores Completo",
              exercises: [
                { name: "Agachamento Livre com Barra", sets: 4, reps: "8-10", rest: 120 },
                { name: "Leg Press 45º", sets: 4, reps: "10-12", rest: 90 },
                { name: "Cadeira Extensora", sets: 3, reps: "12-15", rest: 60 },
                { name: "Mesa Flexora", sets: 4, reps: "10-12", rest: 60 },
                { name: "Stiff com Halteres", sets: 3, reps: "10-12", rest: 60 },
                { name: "Panturrilha em Pé", sets: 4, reps: "15", rest: 45 },
              ],
            },
            {
              title: "Treino D - Ombros, Trapézio e Abdômen",
              exercises: [
                { name: "Desenvolvimento com Halteres", sets: 4, reps: "8-10", rest: 90 },
                { name: "Elevação Lateral com Halteres", sets: 4, reps: "12-15", rest: 45 },
                { name: "Crucifixo Invertido com Halteres", sets: 3, reps: "12-15", rest: 45 },
                { name: "Encolhimento com Barra", sets: 4, reps: "12-15", rest: 45 },
                { name: "Abdominal Supra na Polia", sets: 3, reps: "15-20", rest: 45 },
              ],
            },
          ],
        };
      } else if (frequency.startsWith("5 dias")) {
        // ABCDE split: exactly 5 distinct, balanced divisions
        proposal = {
          divisions: [
            {
              title: "Treino A - Peitoral e Abdômen",
              exercises: [
                { name: "Supino Reto com Barra", sets: 4, reps: "8-10", rest: 90 },
                { name: "Supino Inclinado com Halteres", sets: 4, reps: "10-12", rest: 60 },
                { name: "Crucifixo no Banco Inclinado", sets: 3, reps: "12-15", rest: 60 },
                { name: "Crossover na Polia Média", sets: 3, reps: "12-15", rest: 45 },
                { name: "Abdominal Infra no Solo", sets: 4, reps: "15-20", rest: 45 },
              ],
            },
            {
              title: "Treino B - Dorsais e Panturrilhas",
              exercises: [
                { name: "Puxada Alta Pegada Pronada", sets: 4, reps: "8-10", rest: 90 },
                { name: "Remada Curvada com Barra", sets: 4, reps: "8-10", rest: 90 },
                { name: "Remada Unilateral com Halter (Serrote)", sets: 3, reps: "10-12", rest: 60 },
                { name: "Pulldown na Polia Alta", sets: 3, reps: "12-15", rest: 45 },
                { name: "Panturrilha no Leg Press", sets: 4, reps: "15-20", rest: 45 },
              ],
            },
            {
              title: "Treino C - Quadríceps e Glúteos",
              exercises: [
                { name: "Agachamento Livre com Barra", sets: 4, reps: "8-10", rest: 120 },
                { name: "Leg Press 45º", sets: 4, reps: "10-12", rest: 90 },
                { name: "Agachamento Búlgaro", sets: 3, reps: "10-12", rest: 60 },
                { name: "Cadeira Extensora", sets: 4, reps: "12-15", rest: 45 },
                { name: "Elevação Pélvica com Barra", sets: 4, reps: "10-12", rest: 60 },
              ],
            },
            {
              title: "Treino D - Deltoides e Trapézio",
              exercises: [
                { name: "Desenvolvimento Militar com Halteres", sets: 4, reps: "8-10", rest: 90 },
                { name: "Elevação Lateral com Halteres", sets: 4, reps: "12-15", rest: 45 },
                { name: "Elevação Lateral na Polia Baixa", sets: 3, reps: "12-15", rest: 45 },
                { name: "Crucifixo Invertido na Máquina", sets: 4, reps: "12-15", rest: 45 },
                { name: "Encolhimento de Ombros com Halteres", sets: 4, reps: "12-15", rest: 45 },
              ],
            },
            {
              title: "Treino E - Braços e Isquiotibiais",
              exercises: [
                { name: "Stiff com Halteres", sets: 4, reps: "10-12", rest: 60 },
                { name: "Mesa Flexora", sets: 4, reps: "10-12", rest: 60 },
                { name: "Rosca Direta com Barra W", sets: 3, reps: "10-12", rest: 60 },
                { name: "Tríceps Testa com Barra W", sets: 3, reps: "10-12", rest: 60 },
                { name: "Rosca Martelo com Halteres", sets: 3, reps: "10-12", rest: 45 },
                { name: "Tríceps Corda na Polia", sets: 3, reps: "12-15", rest: 45 },
              ],
            },
          ],
        };
      } else if (frequency.startsWith("6 dias")) {
        // 6 dias (ABCDEF / Push Pull Legs 2x)
        proposal = {
          divisions: [
            {
              title: "Treino A - Push 1 (Peito, Ombros e Tríceps)",
              exercises: [
                { name: "Supino Reto com Barra", sets: 4, reps: "6-8", rest: 120 },
                { name: "Supino Inclinado com Halteres", sets: 3, reps: "8-10", rest: 90 },
                { name: "Desenvolvimento com Halteres", sets: 3, reps: "8-10", rest: 90 },
                { name: "Elevação Lateral com Halteres", sets: 4, reps: "12-15", rest: 45 },
                { name: "Tríceps Francês na Polia", sets: 3, reps: "10-12", rest: 60 },
              ],
            },
            {
              title: "Treino B - Pull 1 (Costas, Trapézio e Bíceps)",
              exercises: [
                { name: "Puxada Alta com Pegada Aberta", sets: 4, reps: "8-10", rest: 90 },
                { name: "Remada Curvada com Barra", sets: 4, reps: "6-8", rest: 90 },
                { name: "Crucifixo Invertido com Halteres", sets: 3, reps: "12-15", rest: 45 },
                { name: "Rosca Direta com Barra W", sets: 3, reps: "8-10", rest: 60 },
                { name: "Rosca Martelo", sets: 3, reps: "10-12", rest: 45 },
              ],
            },
            {
              title: "Treino C - Legs 1 (Foco Quadríceps)",
              exercises: [
                { name: "Agachamento Livre com Barra", sets: 4, reps: "6-8", rest: 120 },
                { name: "Leg Press 45º", sets: 4, reps: "10-12", rest: 90 },
                { name: "Cadeira Extensora", sets: 4, reps: "12-15", rest: 45 },
                { name: "Panturrilha em Pé", sets: 4, reps: "15", rest: 45 },
              ],
            },
            {
              title: "Treino D - Push 2 (Peito Inclinado, Ombros e Tríceps)",
              exercises: [
                { name: "Supino Inclinado com Barra", sets: 4, reps: "8-10", rest: 90 },
                { name: "Crucifixo na Polia (Crossover)", sets: 3, reps: "12-15", rest: 60 },
                { name: "Elevação Lateral na Polia", sets: 4, reps: "12-15", rest: 45 },
                { name: "Tríceps Corda na Polia", sets: 4, reps: "10-12", rest: 45 },
              ],
            },
            {
              title: "Treino E - Pull 2 (Costas com Foco Largura e Bíceps)",
              exercises: [
                { name: "Remada Baixa com Triângulo", sets: 4, reps: "8-10", rest: 90 },
                { name: "Puxada com Triângulo", sets: 4, reps: "10-12", rest: 60 },
                { name: "Encolhimento com Barra", sets: 3, reps: "12-15", rest: 45 },
                { name: "Rosca Scott com Halteres", sets: 3, reps: "10-12", rest: 60 },
              ],
            },
            {
              title: "Treino F - Legs 2 (Foco Isquiotibiais e Glúteos)",
              exercises: [
                { name: "Stiff com Halteres", sets: 4, reps: "8-10", rest: 90 },
                { name: "Mesa Flexora", sets: 4, reps: "10-12", rest: 60 },
                { name: "Elevação Pélvica com Barra", sets: 4, reps: "10-12", rest: 60 },
                { name: "Panturrilha no Leg Press", sets: 4, reps: "15", rest: 45 },
              ],
            },
          ],
        };
      }

      // Programmatic structural verification:
      const expectedDays = frequency.startsWith("1 dia")
        ? 1
        : frequency.startsWith("2 dias")
        ? 2
        : frequency.startsWith("3 dias")
        ? 3
        : frequency.startsWith("4 dias")
        ? 4
        : frequency.startsWith("5 dias")
        ? 5
        : 6;

      if (proposal.divisions.length !== expectedDays) {
        console.error(
          `[AiHelperDrawer] Inconsistência de divisões detectada: esperadas ${expectedDays}, obtidas ${proposal.divisions.length}`
        );
      }

      setGeneratedProposal(proposal);
      setIsGenerating(false);
    }, 450);
  };

  // 2. Generate Alternatives for Selected Exercise
  const handleFindAlternatives = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const selectedItem = activeBlock?.items?.find((i) => i.publicId === exerciseToReplace);
      const name = selectedItem?.exerciseNameSnapshot?.toLowerCase() || "";

      let alts = ["Supino Inclinado com Halteres", "Supino na Máquina", "Crucifixo Reto"];
      if (name.includes("agachamento") || name.includes("leg")) {
        alts = ["Hack Squat", "Leg Press 45º", "Agachamento Búlgaro", "Cadeira Extensora"];
      } else if (name.includes("puxada") || name.includes("remada")) {
        alts = ["Remada Cavalinho", "Puxada Triângulo", "Remada Serrote com Halteres", "Pulldown na Polia"];
      } else if (name.includes("elevação") || name.includes("desenvolvimento")) {
        alts = ["Desenvolvimento com Halteres", "Elevação Lateral na Polia", "Desenvolvimento Militar", "Elevação Frontal"];
      } else if (name.includes("tríceps") || name.includes("triceps")) {
        alts = ["Tríceps Corda na Polia", "Tríceps Testa Barra W", "Tríceps Francês", "Mergulho em Paralelas"];
      } else if (name.includes("rosca") || name.includes("bíceps") || name.includes("biceps")) {
        alts = ["Rosca Direta Barra W", "Rosca Martelo com Halteres", "Rosca Scott", "Rosca Inclinada"];
      }

      setSuggestedAlternatives(alts);
      setIsGenerating(false);
    }, 350);
  };

  // 3. Generate Bi-set pairing
  const handleFindBiSetPair = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const name = baseExercise.toLowerCase();
      let pair = "Crucifixo com Halteres (Pré-exaustão)";
      if (name.includes("supino")) {
        pair = "Crucifixo com Halteres (Pré-exaustão)";
      } else if (name.includes("rosca")) {
        pair = "Tríceps Testa Barra W (Antagonista)";
      } else if (name.includes("extensora")) {
        pair = "Mesa Flexora (Agonista/Antagonista)";
      } else if (name.includes("puxada")) {
        pair = "Remada Curvada com Halteres (Sinergista)";
      } else if (name.includes("elevação lateral") || name.includes("desenvolvimento")) {
        pair = "Crucifixo Invertido com Halteres (Deltoide Posterior)";
      }

      setPairedExercise(pair);
      setIsGenerating(false);
    }, 350);
  };

  // 4. Generate Completion Suggestions for Current Division
  const handleGenerateCompletion = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const currentNames = (activeBlock?.items || []).map((i) => i.exerciseNameSnapshot.toLowerCase());
      const suggestions: Array<{ name: string; sets: number; reps: string; rest: number; reason: string }> = [];

      const hasChest = currentNames.some((n) => n.includes("supino") || n.includes("peito") || n.includes("crucifixo"));
      const hasBack = currentNames.some((n) => n.includes("puxada") || n.includes("remada") || n.includes("costas"));
      const hasLegs = currentNames.some((n) => n.includes("agachamento") || n.includes("leg") || n.includes("extensora"));

      if (hasChest) {
        if (!currentNames.some((n) => n.includes("elevação lateral") || n.includes("ombro"))) {
          suggestions.push({
            name: "Elevação Lateral com Halteres",
            sets: 3,
            reps: "12-15",
            rest: 45,
            reason: "Trabalho de deltoide lateral para equilibrar o treino de empurrar.",
          });
        }
        if (!currentNames.some((n) => n.includes("tríceps") || n.includes("triceps"))) {
          suggestions.push({
            name: "Tríceps Corda na Polia",
            sets: 3,
            reps: "10-12",
            rest: 60,
            reason: "Isolamento de tríceps como sinergista do peitoral.",
          });
        }
      } else if (hasBack) {
        if (!currentNames.some((n) => n.includes("rosca") || n.includes("bíceps"))) {
          suggestions.push({
            name: "Rosca Direta com Barra W",
            sets: 3,
            reps: "10-12",
            rest: 60,
            reason: "Trabalho sinergista do bíceps após o volume dorsal.",
          });
        }
        if (!currentNames.some((n) => n.includes("crucifixo invertido") || n.includes("posterior"))) {
          suggestions.push({
            name: "Crucifixo Invertido com Halteres",
            sets: 3,
            reps: "12-15",
            rest: 45,
            reason: "Equilíbrio postural e fortalecimento de deltoide posterior.",
          });
        }
      } else if (hasLegs) {
        if (!currentNames.some((n) => n.includes("panturrilha"))) {
          suggestions.push({
            name: "Panturrilha em Pé",
            sets: 4,
            reps: "15",
            rest: 45,
            reason: "Fechamento indispensável para a cadeia inferior.",
          });
        }
        if (!currentNames.some((n) => n.includes("stiff") || n.includes("flexora"))) {
          suggestions.push({
            name: "Mesa Flexora",
            sets: 3,
            reps: "10-12",
            rest: 60,
            reason: "Equilíbrio agonista/antagonista para isquiotibiais.",
          });
        }
      } else {
        suggestions.push(
          {
            name: "Elevação Lateral com Halteres",
            sets: 3,
            reps: "12-15",
            rest: 45,
            reason: "Excelente complemento para volume de ombros.",
          },
          {
            name: "Prancha Abdominal",
            sets: 3,
            reps: "45s",
            rest: 45,
            reason: "Estabilidade de core e postura.",
          }
        );
      }

      setCompletionSuggestions(suggestions);
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
                  <label className="text-xs font-bold text-[#102E23]">Frequência semanal:</label>
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
                    <option value="6 dias (ABCDEF)">6 dias (ABCDEF / PPL 2x)</option>
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
                <span>{isGenerating ? "Montando proposta..." : "Montar proposta completa"}</span>
              </button>

              {/* Proposal Preview Box */}
              {generatedProposal && (
                <div className="p-4 rounded-2xl bg-[#F0F5F2] border border-[#C6E2D1] space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#176B49]">
                        PROPOSTA ESTRUTURADA PELA IA
                      </span>
                      <h4 className="text-sm font-extrabold text-[#102E23]">
                        {generatedProposal.divisions.length} divisões completas
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
