"use client";

import React, { useState, useEffect, useTransition } from "react";
import { searchExercisesForPickerAction } from "@/app/consultoria/[slug]/rotinas/actions";
import type { ExerciseItemDto } from "@/lib/training-v2/types";
import { ExercisePreviewModal } from "./exercise-preview-modal";
import { CreateExerciseModal } from "./create-exercise-modal";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  blockPublicId?: string;
  onSelectExercise: (exercise: ExerciseItemDto) => Promise<void>;
  onCreateMethod: (method: "BI_SET" | "TRI_SET" | "CIRCUIT" | "SUPERSET") => Promise<void>;
  targetIndex?: number;
  title?: string;
  subtitle?: string;
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

function PlayCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

export function AddItemModal({
  isOpen,
  onClose,
  consultancySlug,
  blockPublicId,
  onSelectExercise,
  onCreateMethod,
  title = "Adicionar exercício",
  subtitle,
}: AddItemModalProps) {
  const [activeTab, setActiveTab] = useState<"exercises" | "methods">("exercises");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState("Todos");
  const [results, setResults] = useState<ExerciseItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Preview modal state
  const [previewExercise, setPreviewExercise] = useState<ExerciseItemDto | null>(null);

  // Custom exercise modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Load initial popular exercises or search whole library
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

    const timer = setTimeout(fetchExercises, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [consultancySlug, searchQuery, selectedMuscle]);

  if (!isOpen) return null;

  const handleCustomExerciseCreated = async (createdEx: ExerciseItemDto) => {
    startTransition(async () => {
      await onSelectExercise(createdEx);
      onClose();
    });
  };

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
      >
        <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden">
          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("exercises")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "exercises"
                    ? "bg-[#102E23] text-white shadow-2xs"
                    : "bg-[#F5F5F0] text-[#526058] hover:text-[#102E23]"
                }`}
              >
                📚 Exercícios
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#EBF7EE] text-[#12583B] border border-[#CDEED5] hover:bg-[#DDF0E3] transition-colors cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Criar exercício</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Subtitle / context reminder if provided */}
          {subtitle && (
            <div className="px-4 py-2 bg-[#F3F7F4] border-b border-[#DDE7DF] text-xs font-semibold text-[#12583B] flex items-center justify-between">
              <span>{subtitle}</span>
              <span className="text-[11px] font-normal text-[#4A6356] hidden sm:inline">
                Selecione o exercício abaixo para associar
              </span>
            </div>
          )}

          {/* Content Tab 1: Exercícios da Biblioteca */}
          {activeTab === "exercises" && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Search + Muscle Filters */}
              <div className="p-3 sm:p-4 border-b border-[#F0F2ED] space-y-2.5 bg-[#FAFBF9]">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7870] w-4 h-4 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por qualquer exercício..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E5E8E2] focus:border-[#176B49] text-xs sm:text-sm text-[#102E23] placeholder-[#6B7870] outline-none shadow-2xs font-sans"
                      autoFocus
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="sm:hidden px-2.5 py-2.5 rounded-xl text-xs font-bold bg-[#EBF7EE] text-[#12583B] border border-[#CDEED5] shrink-0"
                    title="Criar novo exercício"
                  >
                    + Criar
                  </button>
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
                    Buscando na biblioteca completa...
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#F5F5F0] text-[#6B7870] flex items-center justify-center mx-auto text-lg font-bold">
                      ?
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-[#102E23]">
                        {searchQuery
                          ? `Não encontrou "${searchQuery}"?`
                          : "Nenhum exercício encontrado"}
                      </p>
                      <p className="text-xs text-[#526058] max-w-sm mx-auto">
                        Crie um exercício exclusivo para a sua consultoria com seu próprio vídeo em MP4 ou animação GIF.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-[#176B49] text-white hover:bg-[#12583B] transition-all shadow-2xs cursor-pointer"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>+ Criar exercício próprio</span>
                    </button>
                  </div>
                ) : (
                  results.map((exercise) => {
                    const isConsultancy = exercise.scope === "CONSULTANCY";
                    const hasMedia = Boolean(
                      exercise.customVideoUrl || (exercise.media && exercise.media.length > 0)
                    );

                    return (
                      <div
                        key={exercise.publicId}
                        data-testid="add-exercise-item"
                        data-exercise-name={exercise.name}
                        className="py-3 px-2 sm:px-3 flex items-center justify-between gap-3 hover:bg-[#F5F5F0] rounded-xl transition-colors group"
                      >
                        <div
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                            startTransition(async () => {
                              await onSelectExercise(exercise);
                              onClose();
                            });
                          }}
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                isConsultancy
                                  ? "bg-[#EBF7EE] text-[#12583B] border-[#CDEED5]"
                                  : "bg-[#F5F5F0] text-[#6B7870] border-[#E5E8E2]"
                              }`}
                            >
                              {isConsultancy ? "Consultoria" : "Biblioteca"}
                            </span>
                            <span className="text-xs text-[#6B7870]">
                              {exercise.muscleGroupPrimary}
                              {exercise.equipment && ` · ${exercise.equipment}`}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-[#102E23] group-hover:text-[#176B49] transition-colors truncate">
                            {exercise.name}
                          </h4>
                        </div>

                        {/* Actions: Ver demonstração & Adicionar */}
                        <div className="flex items-center gap-2 shrink-0">
                          {hasMedia && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewExercise(exercise);
                              }}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-white border border-[#E5E8E2] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Ver demonstração em vídeo/GIF"
                            >
                              <PlayCircleIcon className="w-3.5 h-3.5 text-[#176B49]" />
                              <span className="hidden sm:inline">Ver</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                await onSelectExercise(exercise);
                                onClose();
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-[#176B49] text-white hover:bg-[#12583B] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Adicionar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Content Tab 2: Métodos Avançados */}
          {activeTab === "methods" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              <div className="text-xs text-[#526058] mb-2">
                Selecione o método avançado desejado para estruturar a divisão:
              </div>

              {[
                {
                  id: "BI_SET" as const,
                  name: "Bi-set",
                  desc: "2 exercícios em sequência sem pausa para o mesmo grupo muscular.",
                  badge: "bg-blue-50 text-blue-700 border-blue-200",
                },
                {
                  id: "SUPERSET" as const,
                  name: "Supersérie",
                  desc: "2 exercícios para grupos musculares opostos/antagonistas em sequência.",
                  badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
                },
                {
                  id: "TRI_SET" as const,
                  name: "Tri-set",
                  desc: "3 exercícios em sequência contínua para exaustão e hipertrofia.",
                  badge: "bg-purple-50 text-purple-700 border-purple-200",
                },
                {
                  id: "CIRCUIT" as const,
                  name: "Circuito",
                  desc: "3 ou mais estações com descanso somente ao final da rodada.",
                  badge: "bg-amber-50 text-amber-800 border-amber-200",
                },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    startTransition(async () => {
                      await onCreateMethod(m.id);
                      onClose();
                    });
                  }}
                  className="p-3.5 sm:p-4 rounded-2xl border border-[#E5E8E2] hover:border-[#176B49] bg-white hover:bg-[#F3F7F4] transition-all cursor-pointer group shadow-2xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider border ${m.badge}`}>
                      ⚡ {m.name}
                    </span>
                    <span className="text-xs font-bold text-[#176B49] group-hover:translate-x-0.5 transition-transform">
                      Inserir →
                    </span>
                  </div>
                  <p className="text-xs text-[#526058]">{m.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video/GIF Preview Modal */}
      {previewExercise && (
        <ExercisePreviewModal
          exercise={previewExercise}
          isOpen={true}
          onClose={() => setPreviewExercise(null)}
          onAdd={async (ex) => {
            setPreviewExercise(null);
            await onSelectExercise(ex);
            onClose();
          }}
        />
      )}

      {/* Custom Exercise Creation Modal */}
      {isCreateModalOpen && (
        <CreateExerciseModal
          isOpen={true}
          onClose={() => setIsCreateModalOpen(false)}
          consultancySlug={consultancySlug}
          blockPublicId={blockPublicId}
          initialName={searchQuery.trim()}
          onExerciseCreated={handleCustomExerciseCreated}
        />
      )}
    </>
  );
}
