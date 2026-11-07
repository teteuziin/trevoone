"use client";

import React, { useState, useEffect, useTransition } from "react";
import { searchExercisesForPickerAction } from "@/app/consultoria/[slug]/rotinas/actions";
import type { ExerciseItemDto } from "@/lib/training-v2/types";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  onSelectExercise: (exercise: ExerciseItemDto) => Promise<void>;
  onCreateMethod: (method: "BI_SET" | "TRI_SET" | "CIRCUIT" | "SUPERSET") => Promise<void>;
  targetIndex?: number;
}

const MUSCLE_GROUPS = [
  "Todos",
  "Peito",
  "Costas",
  "Quadríceps",
  "Posterior",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Abdômen",
  "Glúteos",
  "Panturrilha",
];

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function AddItemModal({
  isOpen,
  onClose,
  consultancySlug,
  onSelectExercise,
  onCreateMethod,
}: AddItemModalProps) {
  const [activeTab, setActiveTab] = useState<"exercises" | "methods">("exercises");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("Todos");
  const [results, setResults] = useState<ExerciseItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load initial popular exercises or search
  useEffect(() => {
    let isCancelled = false;

    async function fetchExercises() {
      setIsLoading(true);
      try {
        const muscleFilter = selectedMuscle === "Todos" ? undefined : selectedMuscle;
        const res = await searchExercisesForPickerAction(
          consultancySlug,
          {
            query: searchQuery.trim() || undefined,
            muscle: muscleFilter,
          }
        );
        if (!isCancelled && res.ok && res.data) {
          setResults(res.data);
        }
      } catch (err) {
        console.error("Erro ao buscar exercícios:", err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    const timer = setTimeout(fetchExercises, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [consultancySlug, searchQuery, selectedMuscle]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("exercises")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "exercises"
                  ? "bg-[#176B49] text-white shadow-2xs"
                  : "bg-[#F5F5F0] text-[#526058] hover:text-[#102E23]"
              }`}
            >
              🏋️ Exercícios
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("methods")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "methods"
                  ? "bg-[#176B49] text-white shadow-2xs"
                  : "bg-[#F5F5F0] text-[#526058] hover:text-[#102E23]"
              }`}
            >
              ⚡ Métodos Avançados
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content Tab 1: Exercícios da Biblioteca */}
        {activeTab === "exercises" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Search + Muscle Filters */}
            <div className="p-3 sm:p-4 border-b border-[#F0F2ED] space-y-2.5 bg-[#FAFBF9]">
              <div className="relative">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7870] w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar exercício pelo nome..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-[#E5E8E2] focus:border-[#176B49] text-sm text-[#102E23] placeholder-[#6B7870] outline-none shadow-2xs font-sans"
                />
              </div>

              {/* Muscle Group Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {MUSCLE_GROUPS.map((mg) => {
                  const isSelected = selectedMuscle === mg;
                  return (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => setSelectedMuscle(mg)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#102E23] text-white"
                          : "bg-white text-[#526058] hover:bg-[#E8F0EA] border border-[#E5E8E2]"
                      }`}
                    >
                      {mg}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List of Exercises */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-[#F0F2ED]">
              {isLoading ? (
                <div className="p-8 text-center text-xs text-[#526058]">
                  Carregando exercícios...
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-sm font-bold text-[#102E23]">
                    Nenhum exercício encontrado
                  </p>
                  <p className="text-xs text-[#526058]">
                    Tente buscar por outro termo ou selecione outro grupo muscular.
                  </p>
                </div>
              ) : (
                results.map((exercise) => (
                  <div
                    key={exercise.publicId}
                    onClick={() => {
                      startTransition(async () => {
                        await onSelectExercise(exercise);
                        onClose();
                      });
                    }}
                    className="py-3 px-2 sm:px-3 flex items-center justify-between gap-3 hover:bg-[#F5F5F0] rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-[#102E23] group-hover:text-[#176B49] transition-colors truncate">
                        {exercise.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-[#526058]">
                        {exercise.muscleGroupPrimary && (
                          <span className="font-semibold text-[#176B49]">
                            {exercise.muscleGroupPrimary}
                          </span>
                        )}
                        {exercise.equipment && (
                          <span>• {exercise.equipment}</span>
                        )}
                        {exercise.media && exercise.media.length > 0 && (
                          <span className="text-blue-600 font-medium">▶ Vídeo</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8F0EA] text-[#176B49] group-hover:bg-[#176B49] group-hover:text-white transition-all shadow-2xs shrink-0 cursor-pointer"
                    >
                      + Adicionar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Content Tab 2: Métodos Avançados */}
        {activeTab === "methods" && (
          <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#102E23]">
                Estruturas de Treinamento Avançado
              </h3>
              <p className="text-xs text-[#526058]">
                Selecione um método para criar a estrutura na divisão.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bi-set */}
              <div
                onClick={() => {
                  onCreateMethod("BI_SET");
                  onClose();
                }}
                className="p-4 rounded-2xl border-2 border-[#D5E2D7] hover:border-blue-500 bg-white hover:bg-blue-50/20 transition-all cursor-pointer space-y-2 shadow-xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm">
                  ⚡
                </div>
                <h4 className="font-extrabold text-sm text-[#102E23] group-hover:text-blue-700 transition-colors">
                  Bi-set
                </h4>
                <p className="text-xs text-[#526058] leading-relaxed">
                  2 exercícios executados em sequência para o mesmo grupo muscular.
                </p>
              </div>

              {/* Tri-set */}
              <div
                onClick={() => {
                  onCreateMethod("TRI_SET");
                  onClose();
                }}
                className="p-4 rounded-2xl border-2 border-[#D5E2D7] hover:border-purple-500 bg-white hover:bg-purple-50/20 transition-all cursor-pointer space-y-2 shadow-xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black text-sm">
                  ⚡
                </div>
                <h4 className="font-extrabold text-sm text-[#102E23] group-hover:text-purple-700 transition-colors">
                  Tri-set
                </h4>
                <p className="text-xs text-[#526058] leading-relaxed">
                  3 exercícios executados seguidamente para o mesmo grupo ou sinergistas.
                </p>
              </div>

              {/* Supersérie */}
              <div
                onClick={() => {
                  onCreateMethod("SUPERSET");
                  onClose();
                }}
                className="p-4 rounded-2xl border-2 border-[#D5E2D7] hover:border-emerald-500 bg-white hover:bg-emerald-50/20 transition-all cursor-pointer space-y-2 shadow-xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm">
                  ⚡
                </div>
                <h4 className="font-extrabold text-sm text-[#102E23] group-hover:text-emerald-700 transition-colors">
                  Supersérie
                </h4>
                <p className="text-xs text-[#526058] leading-relaxed">
                  2 exercícios combinados para grupos opostos/antagônicos sem intervalo.
                </p>
              </div>

              {/* Circuito */}
              <div
                onClick={() => {
                  onCreateMethod("CIRCUIT");
                  onClose();
                }}
                className="p-4 rounded-2xl border-2 border-[#D5E2D7] hover:border-amber-500 bg-white hover:bg-amber-50/20 transition-all cursor-pointer space-y-2 shadow-xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-black text-sm">
                  🔄
                </div>
                <h4 className="font-extrabold text-sm text-[#102E23] group-hover:text-amber-800 transition-colors">
                  Circuito
                </h4>
                <p className="text-xs text-[#526058] leading-relaxed">
                  Sequência contínua com repetições ou tempo determinado por estação.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
