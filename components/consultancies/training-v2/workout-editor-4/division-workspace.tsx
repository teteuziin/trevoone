"use client";

import React, { useState, useEffect, useMemo } from "react";
import type {
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemCombinationDto,
  ExerciseItemDto,
  WorkoutCombinationType,
} from "@/lib/training-v2/types";
import { searchExercisesForPickerAction } from "@/app/consultoria/[slug]/rotinas/actions";
import { ExerciseCard } from "./exercise-card";
import { CombinationCard } from "./combination-card";
import { InsertHereDivider } from "./insert-here-divider";
import { MethodPickerModal } from "./method-picker-modal";
import { ExercisePreviewModal } from "./exercise-preview-modal";
import { CreateExerciseModal } from "./create-exercise-modal";

interface DivisionWorkspaceProps {
  consultancySlug: string;
  block: WorkoutBlockDto;
  onUpdateItemConfig: (itemPublicId: string, updates: {
    setsCount?: number;
    reps?: string;
    loadKg?: number | null;
    restSeconds?: number | null;
    notes?: string;
    tempo?: string;
    rpeTarget?: number | null;
  }) => Promise<void>;
  onMoveItemUp: (itemPublicId: string) => Promise<void>;
  onMoveItemDown: (itemPublicId: string) => Promise<void>;
  onDuplicateItem: (itemPublicId: string) => Promise<void>;
  onDeleteItem: (itemPublicId: string) => Promise<void>;
  onOpenAddModal: (insertIndex?: number) => void;
  onSelectExercise: (exercise: ExerciseItemDto) => Promise<void>;
  onOpenMethodModal: (method: "BI_SET" | "TRI_SET" | "CIRCUIT" | "SUPERSET", insertIndex?: number) => void;
  onOpenModelsDrawer: (insertIndex?: number) => void;
  onOpenAiDrawer: (insertIndex?: number) => void;
  onOpenReorderDrawer?: () => void;
  onSwapCombinationOrder: (combinationPublicId: string) => Promise<void>;
  onUngroupCombination: (combinationPublicId: string) => Promise<void>;
  onDuplicateCombination: (combinationPublicId: string) => Promise<void>;
  onDeleteCombination: (combinationPublicId: string) => Promise<void>;
  onAddItemToCombination: (combinationPublicId: string) => void;
  onRemoveItemFromCombination: (combinationPublicId: string, itemPublicId: string) => Promise<void>;
  onCreateCombinationFromItem?: (
    methodType: WorkoutCombinationType,
    firstItemPublicId: string,
    secondExercise: ExerciseItemDto
  ) => Promise<void>;
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
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

function ChevronDownIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export function DivisionWorkspace({
  consultancySlug,
  block,
  onUpdateItemConfig,
  onMoveItemUp,
  onMoveItemDown,
  onDuplicateItem,
  onDeleteItem,
  onOpenAddModal,
  onSelectExercise,
  onOpenMethodModal,
  onOpenModelsDrawer,
  onOpenAiDrawer,
  onOpenReorderDrawer,
  onSwapCombinationOrder,
  onUngroupCombination,
  onDuplicateCombination,
  onDeleteCombination,
  onAddItemToCombination,
  onRemoveItemFromCombination,
  onCreateCombinationFromItem,
}: DivisionWorkspaceProps) {
  // Empty state search and methods picker state
  const [emptySearchQuery, setEmptySearchQuery] = useState("");
  const [emptySearchResults, setEmptySearchResults] = useState<ExerciseItemDto[]>([]);
  const [isSearchingEmpty, setIsSearchingEmpty] = useState(false);
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  const [addingExerciseId, setAddingExerciseId] = useState<string | null>(null);

  // Modals state
  const [methodPickerTargetItem, setMethodPickerTargetItem] = useState<WorkoutBlockItemDto | null>(null);
  const [previewExercise, setPreviewExercise] = useState<ExerciseItemDto | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);


  // Fast lookup for combinations by item publicId
  const combinationItemMap = useMemo(() => {
    const map = new Map<string, WorkoutItemCombinationDto>();
    (block.combinations || []).forEach((c) => {
      (c.items || []).forEach((it) => {
        const id = typeof it === "string" ? it : it.publicId;
        map.set(id, c);
      });
    });
    return map;
  }, [block.combinations]);

  // Construct display entries grouping items by combination
  const displayEntries = useMemo(() => {
    const entries: Array<
      | { type: "item"; item: WorkoutBlockItemDto; originalIndex: number }
      | {
          type: "combination";
          combination: WorkoutItemCombinationDto;
          items: WorkoutBlockItemDto[];
          originalIndex: number;
        }
    > = [];

    const processedCombIds = new Set<string>();

    (block.items || []).forEach((item, idx) => {
      const comb = combinationItemMap.get(item.publicId);
      if (!comb) {
        entries.push({ type: "item", item, originalIndex: idx });
      } else {
        if (!processedCombIds.has(comb.publicId)) {
          processedCombIds.add(comb.publicId);
          const combItems = (block.items || []).filter(
            (it) =>
              it.combinationPublicId === comb.publicId ||
              (comb.items || []).some((ci) =>
                typeof ci === "string" ? ci === it.publicId : ci.publicId === it.publicId
              )
          );
          entries.push({
            type: "combination",
            combination: comb,
            items: combItems,
            originalIndex: idx,
          });
        }
      }
    });

    return entries;
  }, [block.items, combinationItemMap]);

  const isEmpty = !block.items || block.items.length === 0;

  // Real-time exercise search in empty state across entire library (no artificial cap when searching!)
  useEffect(() => {
    if (!isEmpty) return;
    let isCancelled = false;

    async function searchExercises() {
      setIsSearchingEmpty(true);
      try {
        const res = await searchExercisesForPickerAction(consultancySlug, {
          query: emptySearchQuery.trim() || undefined,
        });
        if (!isCancelled && res.ok && res.data) {
          // If searching with text, show all results. If query is empty, show 6 popular suggestions.
          if (emptySearchQuery.trim()) {
            setEmptySearchResults(res.data);
          } else {
            setEmptySearchResults(res.data.slice(0, 6));
          }
        }
      } catch (err) {
        console.error("Erro na busca direta:", err);
      } finally {
        if (!isCancelled) setIsSearchingEmpty(false);
      }
    }

    const timer = setTimeout(searchExercises, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isEmpty, consultancySlug, emptySearchQuery]);

  // Handle adding exercise from empty state 1-tap
  const handleAddFromEmpty = async (ex: ExerciseItemDto) => {
    setAddingExerciseId(ex.publicId);
    try {
      await onSelectExercise(ex);
    } finally {
      setAddingExerciseId(null);
    }
  };

  // Convert WorkoutBlockItemDto to ExerciseItemDto for preview
  const openPreviewFromBlockItem = (item: WorkoutBlockItemDto) => {
    const ex: ExerciseItemDto = {
      publicId: item.exercisePublicId || item.publicId,
      name: item.exerciseNameSnapshot || "Exercício",
      muscleGroupPrimary: item.muscleGroupSnapshot || "Geral",
      equipment: item.equipmentSnapshot || "Livre",
      instructions: item.instructionsSnapshot || undefined,
      description: item.notes || undefined,
      difficultyLevel: "INTERMEDIATE",
      status: "PUBLISHED",
      scope: item.isCustomExercise ? "CONSULTANCY" : "GLOBAL",
      visibility: item.isCustomExercise ? "CONSULTANCY" : "GLOBAL",
      customVideoUrl: item.customVideoUrl || undefined,
      media: item.pinnedMediaAssets?.map((p) => ({
        mediaAsset: {
          publicId: p.publicId,
          mediaType: p.mediaType,
          mimeType: p.mimeType,
          scope: "CONSULTANCY",
          visibility: "CONSULTANCY",
          fileSizeBytes: p.fileSizeBytes,
        },
      })),
    };
    setPreviewExercise(ex);
  };

  // =========================================================================
  // 1. EMPTY STATE REFINADO: Compacto, busca direta na biblioteca completa
  // =========================================================================
  if (isEmpty) {
    return (
      <>
        <div className="w-full max-w-2xl mx-auto bg-white border border-[#E5E8E2] rounded-3xl p-5 sm:p-7 shadow-xs space-y-5 animate-in fade-in duration-150 font-sans">
          {/* Título e Orientação Amigável */}
          <div className="text-center space-y-1">
            <h2 className="text-base sm:text-lg font-extrabold text-[#102E23]">
              Vamos adicionar o primeiro exercício?
            </h2>
            <p className="text-xs sm:text-sm text-[#526058]">
              Pesquise qualquer exercício na biblioteca oficial e da consultoria.
            </p>
          </div>

          {/* Barra de Busca Funcional Integrada com 1 Toque */}
          <div className="space-y-3">
            <div className="relative">
              <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7870] w-4 h-4 pointer-events-none" />
              <input
                type="text"
                value={emptySearchQuery}
                onChange={(e) => setEmptySearchQuery(e.target.value)}
                placeholder="Buscar por nome (ex: supino, agachamento, puxada)..."
                className="w-full pl-10 pr-20 py-2.5 rounded-2xl bg-[#F5F5F0] border border-[#E5E8E2] focus:border-[#176B49] focus:bg-white text-sm text-[#102E23] placeholder-[#6B7870] outline-none transition-all shadow-2xs"
              />
              {isSearchingEmpty && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#176B49] animate-pulse">
                  Buscando...
                </span>
              )}
            </div>

            {/* Resultados da Busca Direta com 1 Toque */}
            {emptySearchResults.length > 0 ? (
              <div className="divide-y divide-[#F0F2ED] border border-[#F0F2ED] rounded-2xl overflow-hidden bg-white max-h-72 overflow-y-auto shadow-2xs">
                {emptySearchResults.map((ex) => {
                  const isAdding = addingExerciseId === ex.publicId;
                  const isConsultancy = ex.scope === "CONSULTANCY";
                  const hasMedia = Boolean(
                    ex.customVideoUrl || (ex.media && ex.media.length > 0)
                  );

                  return (
                    <div
                      key={ex.publicId}
                      data-testid="empty-search-exercise-item"
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#F5F5F0] transition-colors group"
                    >
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => handleAddFromEmpty(ex)}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
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
                            {ex.muscleGroupPrimary}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#102E23] group-hover:text-[#176B49] transition-colors truncate">
                          {ex.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasMedia && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewExercise(ex);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#526058] hover:text-[#102E23] hover:bg-white border border-[#E5E8E2] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Ver vídeo/GIF demonstrativo"
                          >
                            <PlayCircleIcon className="w-3.5 h-3.5 text-[#176B49]" />
                            <span className="hidden sm:inline text-[11px]">Ver</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isAdding}
                          onClick={() => handleAddFromEmpty(ex)}
                          className="px-3 py-1 rounded-lg text-xs font-black bg-[#176B49] text-white hover:bg-[#12583B] transition-colors shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          <span>{isAdding ? "Adicionando..." : "Adicionar"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              emptySearchQuery.trim() && (
                <div className="p-6 text-center space-y-3 border border-[#E5E8E2] rounded-2xl bg-[#FAFBF9]">
                  <p className="text-xs sm:text-sm font-bold text-[#102E23]">
                    Não encontrou o exercício &ldquo;{emptySearchQuery}&rdquo;?
                  </p>
                  <p className="text-xs text-[#526058] max-w-sm mx-auto">
                    Você pode criar um exercício exclusivo para a sua consultoria com seu próprio vídeo ou animação GIF.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#176B49] text-white hover:bg-[#12583B] transition-all shadow-2xs cursor-pointer"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>+ Criar exercício próprio</span>
                  </button>
                </div>
              )
            )}
          </div>

          {/* Ações Alternativas: Métodos Avançados e Criar Próprio */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-[#F0F2ED]">
            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsMethodDropdownOpen(!isMethodDropdownOpen)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#102E23] bg-[#F5F5F0] hover:bg-[#EAEFEA] transition-colors cursor-pointer border border-[#E5E8E2]"
              >
                <span>⚡ Iniciar com Método Avançado</span>
                <ChevronDownIcon />
              </button>

              {isMethodDropdownOpen && (
                <div className="absolute left-0 bottom-full mb-1.5 w-60 bg-white border border-[#E5E8E2] rounded-2xl p-1.5 shadow-xl z-20 space-y-0.5 animate-in fade-in duration-100">
                  {[
                    { id: "BI_SET" as const, label: "⚡ Bi-set", sub: "(2 exercícios)" },
                    { id: "SUPERSET" as const, label: "⚡ Supersérie", sub: "(antagônicos)" },
                    { id: "TRI_SET" as const, label: "⚡ Tri-set", sub: "(3 exercícios)" },
                    { id: "CIRCUIT" as const, label: "🔄 Circuito", sub: "(estações)" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setIsMethodDropdownOpen(false);
                        onOpenMethodModal(m.id, 0);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-[#102E23] hover:bg-[#E8F0EA] hover:text-[#176B49] transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>{m.label}</span>
                      <span className="text-[10px] text-[#526058] font-normal">{m.sub}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold text-[#12583B] bg-[#EBF7EE] border border-[#CDEED5] hover:bg-[#DDF0E3] transition-colors cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Criar exercício</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAddModal(0)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#176B49] hover:bg-[#E8F0EA] transition-colors cursor-pointer"
              >
                <span>Ver biblioteca →</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modals in Empty State */}
        {previewExercise && (
          <ExercisePreviewModal
            exercise={previewExercise}
            isOpen={true}
            onClose={() => setPreviewExercise(null)}
            onAdd={async (ex) => {
              setPreviewExercise(null);
              await handleAddFromEmpty(ex);
            }}
          />
        )}

        {isCreateModalOpen && (
          <CreateExerciseModal
            isOpen={true}
            onClose={() => setIsCreateModalOpen(false)}
            consultancySlug={consultancySlug}
            blockPublicId={block.publicId}
            initialName={emptySearchQuery.trim()}
            onExerciseCreated={async (createdEx) => {
              await onSelectExercise(createdEx);
            }}
          />
        )}
      </>
    );
  }

  // =========================================================================
  // 2. LISTA PREENCHIDA COM EXERCÍCIOS, COMBINAÇÕES E DIVISORES DE POSIÇÃO EXATA
  // =========================================================================
  return (
    <>
      <div className="w-full space-y-2 pb-24 font-sans">
        {/* Inserção no Início da Divisão */}
        <InsertHereDivider
          insertIndex={0}
          onInsertExercise={(idx) => onOpenAddModal(idx)}
          onInsertMethod={(m, idx) => onOpenMethodModal(m, idx)}
          onInsertFromModel={(idx) => onOpenModelsDrawer(idx)}
          onInsertFromAi={(idx) => onOpenAiDrawer(idx)}
          label="Inserir no início"
        />

        {/* Lista de Itens e Combinações */}
        {displayEntries.map((entry, entryIdx) => {
          const nextInsertIndex =
            entry.originalIndex + (entry.type === "combination" ? entry.items.length : 1);

          return (
            <React.Fragment
              key={entry.type === "item" ? entry.item.publicId : entry.combination.publicId}
            >
              {entry.type === "item" ? (
                <ExerciseCard
                  key={entry.item.publicId}
                  item={entry.item}
                  index={entryIdx}
                  totalItems={displayEntries.length}
                  onUpdateConfig={onUpdateItemConfig}
                  onMoveUp={() => onMoveItemUp(entry.item.publicId)}
                  onMoveDown={() => onMoveItemDown(entry.item.publicId)}
                  onDuplicate={() => onDuplicateItem(entry.item.publicId)}
                  onDelete={() => onDeleteItem(entry.item.publicId)}
                  onOpenMethodMenu={() => setMethodPickerTargetItem(entry.item)}
                  onPreviewVideo={() => openPreviewFromBlockItem(entry.item)}
                  onLongPressReorder={onOpenReorderDrawer}
                  isFirst={entryIdx === 0}
                  isLast={entryIdx === displayEntries.length - 1}
                />
              ) : (
                <CombinationCard
                  combination={entry.combination}
                  items={entry.items}
                  index={entryIdx}
                  totalCombinations={displayEntries.length}
                  onUpdateConfig={onUpdateItemConfig}
                  onSwapOrder={onSwapCombinationOrder}
                  onUngroup={onUngroupCombination}
                  onDuplicate={onDuplicateCombination}
                  onDelete={onDeleteCombination}
                  onAddItem={onAddItemToCombination}
                  onRemoveItemFromCombination={onRemoveItemFromCombination}
                  onPreviewVideo={openPreviewFromBlockItem}
                  onLongPressReorder={onOpenReorderDrawer}
                  onMoveUp={() => onMoveItemUp(entry.items[0]?.publicId)}
                  onMoveDown={() => onMoveItemDown(entry.items[entry.items.length - 1]?.publicId)}
                  isFirst={entryIdx === 0}
                  isLast={entryIdx === displayEntries.length - 1}
                />
              )}

              {/* Inserir Aqui entre os itens */}
              <InsertHereDivider
                insertIndex={nextInsertIndex}
                onInsertExercise={(idx) => onOpenAddModal(idx)}
                onInsertMethod={(m, idx) => onOpenMethodModal(m, idx)}
                onInsertFromModel={(idx) => onOpenModelsDrawer(idx)}
                onInsertFromAi={(idx) => onOpenAiDrawer(idx)}
              />
            </React.Fragment>
          );
        })}

        {/* Botão no Fim da Divisão */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onOpenAddModal(block.items?.length || 0)}
            className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-[#D5E2D7] hover:border-[#176B49] bg-white hover:bg-[#E8F0EA]/40 text-[#102E23] hover:text-[#176B49] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer min-h-[52px]"
          >
            <PlusIcon className="w-5 h-5 text-[#176B49]" />
            <span>+ Adicionar exercício ou bloco</span>
          </button>
        </div>
      </div>

      {/* Modal de Prévia em Vídeo/GIF */}
      {previewExercise && (
        <ExercisePreviewModal
          exercise={previewExercise}
          isOpen={true}
          onClose={() => setPreviewExercise(null)}
        />
      )}

      {/* Modal de Criação de Método com o Exercício Selecionado */}
      {methodPickerTargetItem && (
        <MethodPickerModal
          isOpen={true}
          onClose={() => setMethodPickerTargetItem(null)}
          baseItemName={methodPickerTargetItem.exerciseNameSnapshot || "Exercício"}
          consultancySlug={consultancySlug}
          blockPublicId={block.publicId}
          onSelectMethodAndSecondExercise={async (methodType, secondEx) => {
            if (onCreateCombinationFromItem) {
              await onCreateCombinationFromItem(
                methodType,
                methodPickerTargetItem.publicId,
                secondEx
              );
            }
          }}
        />
      )}
    </>
  );
}
