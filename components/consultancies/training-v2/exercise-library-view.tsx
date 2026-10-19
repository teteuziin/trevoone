"use client";

import React, { useState, useRef, useId } from "react";
import Link from "next/link";
import type { ExerciseItemDto } from "@/lib/training-v2/types";
import { searchLibraryExercisesAction } from "@/app/consultoria/[slug]/exercicios/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DuotoneExercisesIcon } from "@/components/ui/icons/duotone-icons";

export type ExerciseTabOption = "TODOS" | "TREVO_ONE" | "CONSULTORIA" | "MEUS";

export interface ExerciseLibraryViewProps {
  slug: string;
  initialItems: ExerciseItemDto[];
  initialTotal: number;
  initialPage: number;
  initialTotalPages: number;
  availableMuscles: string[];
  availableEquipments: string[];
  currentTab: string;
  currentQuery?: string;
  currentMuscle?: string;
  currentEquipment?: string;
  canCreate?: boolean;
  canManageConsultancy?: boolean;
}

export function ExerciseLibraryView({
  slug,
  initialItems,
  initialTotal,
  initialPage,
  initialTotalPages,
  availableMuscles,
  availableEquipments,
  currentTab: initialTab = "TODOS",
  currentQuery: initialQueryParam = "",
  currentMuscle: initialMuscleParam = "Todos os Músculos",
  currentEquipment: initialEquipmentParam = "Todos os Equipamentos",
  canCreate = true,
  canManageConsultancy = false,
}: ExerciseLibraryViewProps) {
  const searchInputId = useId();

  // Controlled search and filter states
  const [query, setQuery] = useState(initialQueryParam);
  const [selectedTab, setSelectedTab] = useState<ExerciseTabOption>(
    initialTab === "TREVO_ONE" || initialTab === "CONSULTORIA" || initialTab === "MEUS"
      ? initialTab
      : "TODOS"
  );
  const [selectedMuscle, setSelectedMuscle] = useState(initialMuscleParam || "Todos os Músculos");
  const [selectedEquipment, setSelectedEquipment] = useState(initialEquipmentParam || "Todos os Equipamentos");
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Results state
  const [items, setItems] = useState<ExerciseItemDto[]>(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);

  // Modal / Drawer state for exercise details
  const [activeExerciseDetails, setActiveExerciseDetails] = useState<ExerciseItemDto | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Request counter to avoid race conditions
  const requestIdRef = useRef(0);

  // Debounced live search
  const queryDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = async (overrides?: {
    q?: string;
    tab?: "TODOS" | "TREVO_ONE" | "CONSULTORIA" | "MEUS";
    muscle?: string;
    equipment?: string;
    page?: number;
  }) => {
    const activeQuery = overrides?.q !== undefined ? overrides.q : query;
    const activeTab = overrides?.tab !== undefined ? overrides.tab : selectedTab;
    const activeMuscle = overrides?.muscle !== undefined ? overrides.muscle : selectedMuscle;
    const activeEquipment = overrides?.equipment !== undefined ? overrides.equipment : selectedEquipment;
    const activePage = overrides?.page !== undefined ? overrides.page : 1;

    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const res = await searchLibraryExercisesAction(slug, {
        tab: activeTab,
        query: activeQuery,
        muscle: activeMuscle,
        equipment: activeEquipment,
        page: activePage,
        pageSize: 25,
      });

      // Ignore outdated responses
      if (currentRequestId !== requestIdRef.current) return;

      if (res.ok && res.data) {
        setItems(res.data.items);
        setTotal(res.data.total);
        setCurrentPage(res.data.page);
        setTotalPages(res.data.totalPages);
      }
    } catch {
      // Graceful error state
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }

    // Keep URL in sync without triggering full server re-render
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams();
      if (activeTab && activeTab !== "TODOS") sp.set("tab", activeTab);
      if (activeQuery.trim()) sp.set("q", activeQuery.trim());
      if (activeMuscle && activeMuscle !== "Todos os Músculos") sp.set("muscle", activeMuscle);
      if (activeEquipment && activeEquipment !== "Todos os Equipamentos") sp.set("equipment", activeEquipment);
      if (activePage > 1) sp.set("page", String(activePage));

      const newUrl = `/consultoria/${slug}/exercicios${sp.toString() ? `?${sp.toString()}` : ""}`;
      window.history.replaceState(null, "", newUrl);
    }
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (queryDebounceTimerRef.current) {
      clearTimeout(queryDebounceTimerRef.current);
    }
    queryDebounceTimerRef.current = setTimeout(() => {
      fetchResults({ q: val, page: 1 });
    }, 280);
  };

  const handleClearQuery = () => {
    setQuery("");
    if (queryDebounceTimerRef.current) {
      clearTimeout(queryDebounceTimerRef.current);
    }
    fetchResults({ q: "", page: 1 });
  };

  const handleTabChange = (tab: "TODOS" | "TREVO_ONE" | "CONSULTORIA" | "MEUS") => {
    setSelectedTab(tab);
    fetchResults({ tab, page: 1 });
  };

  const handleMuscleChange = (muscle: string) => {
    setSelectedMuscle(muscle);
    fetchResults({ muscle, page: 1 });
  };

  const handleEquipmentChange = (equipment: string) => {
    setSelectedEquipment(equipment);
    fetchResults({ equipment, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchResults({ page: newPage });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const clearAllFilters = () => {
    setSelectedMuscle("Todos os Músculos");
    setSelectedEquipment("Todos os Equipamentos");
    setIsFilterSheetOpen(false);
    fetchResults({
      muscle: "Todos os Músculos",
      equipment: "Todos os Equipamentos",
      page: 1,
    });
  };

  // Count active filters (excluding query and tab)
  const activeFiltersCount =
    (selectedMuscle !== "Todos os Músculos" ? 1 : 0) +
    (selectedEquipment !== "Todos os Equipamentos" ? 1 : 0);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-5 pb-16 animate-in fade-in duration-150">
      {/* =========================================================================
          1. CABEÇALHO COMPACTO
          Voltar, Título "Biblioteca de Exercícios", Ação "+ Novo Exercício"
          Fundo grafite/preto, cantos arredondados, sem textos genéricos redundantes.
          ========================================================================= */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/consultoria/${slug}`}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
            aria-label="Voltar para a visão geral da consultoria"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>

          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <DuotoneExercisesIcon className="w-5 h-5 text-indigo-400" />
          </div>

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              Biblioteca de Exercícios
            </h1>
            <p className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate">
              {total} {total === 1 ? "exercício disponível" : "exercícios disponíveis"}
            </p>
          </div>
        </div>

        {canCreate && (
          <Link href={`/consultoria/${slug}/exercicios/novo`} className="shrink-0">
            <Button
              variant="primary"
              size="sm"
              className="font-bold min-h-[40px] px-3.5 flex items-center gap-1.5 shadow-sm text-xs sm:text-sm"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Novo Exercício</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </Link>
        )}
      </div>

      {/* =========================================================================
          2. CAMPO DE BUSCA DESTACADO COM DEBOUNCE E LIMPEZA
          ========================================================================= */}
      <div className="bg-[#151619] border border-[#303238] rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
        <div>
          <label htmlFor={searchInputId} className="block text-xs font-bold text-neutral-200 mb-1.5">
            Buscar exercício
          </label>
          <div className="relative flex items-center w-full">
            <div className="absolute left-3.5 text-neutral-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              </svg>
            </div>

            <input
              id={searchInputId}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Nome, apelido ou equipamento..."
              className="w-full h-11 pl-10 pr-10 bg-[#1B1D21] border border-[#303238] hover:border-neutral-500 focus:border-[#10B981] rounded-xl text-base sm:text-sm text-white placeholder:text-neutral-500 outline-none transition-all shadow-inner"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />

            {query ? (
              <button
                type="button"
                onClick={handleClearQuery}
                aria-label="Limpar busca"
                className="absolute right-2.5 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}

            {isLoading && (
              <div className="absolute right-3.5">
                <span className="w-4 h-4 border-2 border-neutral-600 border-t-[#10B981] rounded-full animate-spin inline-block" />
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            3. ABAS DE ORIGEM (Todos, Trevo One, Minha Consultoria, Só para mim)
            ========================================================================= */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-[#252830]">
          <div className="flex items-center gap-1 p-1 bg-[#1B1D21] border border-[#303238] rounded-xl overflow-x-auto max-w-full">
            {(
              [
                { id: "TODOS", label: "Todos" },
                { id: "TREVO_ONE", label: "Trevo One" },
                { id: "CONSULTORIA", label: "Minha Consultoria" },
                {
                  id: "MEUS",
                  label: (
                    <span className="flex items-center gap-1">
                      <span>🔒</span>
                      <span>Só para mim</span>
                    </span>
                  ),
                },
              ] as { id: ExerciseTabOption; label: React.ReactNode }[]
            ).map((t) => {
              const active = selectedTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTabChange(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all cursor-pointer whitespace-nowrap min-h-[34px] flex items-center justify-center ${
                    active
                      ? "bg-[#252830] text-white border border-[#404450] shadow-xs"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/60 border border-transparent font-medium"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Desktop Filter Dropdowns (Inline & Compact) */}
          <div className="hidden sm:flex items-center gap-2">
            <select
              value={selectedMuscle}
              onChange={(e) => handleMuscleChange(e.target.value)}
              className="h-9 px-3 bg-[#1B1D21] border border-[#303238] hover:border-neutral-500 rounded-xl text-xs font-medium text-neutral-200 outline-none focus:border-[#10B981] cursor-pointer"
              aria-label="Filtrar por grupo muscular"
            >
              <option value="Todos os Músculos">Todos os Músculos</option>
              {availableMuscles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={selectedEquipment}
              onChange={(e) => handleEquipmentChange(e.target.value)}
              className="h-9 px-3 bg-[#1B1D21] border border-[#303238] hover:border-neutral-500 rounded-xl text-xs font-medium text-neutral-200 outline-none focus:border-[#10B981] cursor-pointer"
              aria-label="Filtrar por equipamento"
            >
              <option value="Todos os Equipamentos">Todos os Equipamentos</option>
              {availableEquipments.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-neutral-400 hover:text-white px-2 py-1 transition-colors cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Smartphone "Filtros" Button with Badge */}
          <div className="sm:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterSheetOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all min-h-[36px] cursor-pointer ${
                activeFiltersCount > 0
                  ? "bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]"
                  : "bg-[#1B1D21] border-[#303238] text-neutral-300 hover:text-white"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18m-15 7.5h12m-9 7.5h6" />
              </svg>
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#10B981] text-black text-[10px] font-bold flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filter Chips on Mobile */}
        {activeFiltersCount > 0 && (
          <div className="flex sm:hidden flex-wrap items-center gap-1.5 pt-1">
            {selectedMuscle !== "Todos os Músculos" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#252830] border border-[#3A3F4C] text-[11px] font-semibold text-neutral-200">
                <span>{selectedMuscle}</span>
                <button
                  type="button"
                  onClick={() => handleMuscleChange("Todos os Músculos")}
                  className="text-neutral-400 hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            {selectedEquipment !== "Todos os Equipamentos" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#252830] border border-[#3A3F4C] text-[11px] font-semibold text-neutral-200">
                <span>{selectedEquipment}</span>
                <button
                  type="button"
                  onClick={() => handleEquipmentChange("Todos os Equipamentos")}
                  className="text-neutral-400 hover:text-white"
                >
                  ×
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] text-neutral-400 hover:text-white underline ml-1 cursor-pointer"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          4. LISTA DE RESULTADOS MAIS LEGÍVEL
          Cards compactos, informativos, responsivos, com ação clara.
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400 px-1 font-medium">
          <span>
            {query.trim()
              ? `${total} ${total === 1 ? "resultado encontrado" : "resultados encontrados"}`
              : `Mostrando ${items.length} de ${total} ${total === 1 ? "exercício" : "exercícios"}`}
          </span>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="Nenhum exercício encontrado"
            description={
              query || activeFiltersCount > 0
                ? "Tente ajustar os termos de pesquisa ou remover os filtros aplicados."
                : selectedTab === "MEUS"
                ? "Você ainda não criou nenhum exercício privado. Clique em '+ Novo Exercício' para cadastrar."
                : "Nenhum exercício disponível nesta seção."
            }
            action={
              canCreate ? (
                <Link href={`/consultoria/${slug}/exercicios/novo`}>
                  <Button variant="primary" size="sm" className="font-bold min-h-[44px]">
                    Cadastrar exercício personalizado
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {items.map((ex) => {
              const isGlobal = ex.scope === "GLOBAL";
              const isShared = ex.scope === "CONSULTANCY" && ex.visibility === "CONSULTANCY";
              const isPrivate = ex.scope === "CONSULTANCY" && ex.visibility === "CREATOR_ONLY";
              const canEditThis = !isGlobal && (canManageConsultancy || isPrivate);

              const hasVideo = ex.media?.some((m) => m.role === "EXECUTION_VIDEO");
              const hasImage = ex.media?.some((m) => m.role === "START_IMAGE");

              return (
                <div
                  key={ex.publicId}
                  onClick={() => setActiveExerciseDetails(ex)}
                  className="bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-neutral-500 rounded-2xl p-3.5 sm:p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group select-none"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Top Row: Name and Origin Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm sm:text-base font-bold text-white group-hover:text-[#10B981] transition-colors">
                        {ex.name}
                      </span>

                      {/* Origin Badge */}
                      {isGlobal && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                          Trevo One
                        </span>
                      )}
                      {isShared && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          Minha Consultoria
                        </span>
                      )}
                      {isPrivate && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Só para mim
                        </span>
                      )}

                      {ex.status === "DRAFT" && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                          Rascunho
                        </span>
                      )}
                    </div>

                    {/* Matched Alias or Match Reason (when search match originates from alias or attribute) */}
                    {ex.matchedAlias && (
                      <p className="text-xs text-[#10B981] font-semibold flex items-center gap-1">
                        <span>💡</span>
                        <span>Também conhecido como: &ldquo;{ex.matchedAlias}&rdquo;</span>
                      </p>
                    )}
                    {ex.matchReason && !ex.matchedAlias && (
                      <p className="text-xs text-neutral-300 font-medium">
                        {ex.matchReason}
                      </p>
                    )}

                    {/* Secondary Attributes */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 font-medium">
                      <span className="text-neutral-200 font-semibold">{ex.muscleGroupPrimary}</span>
                      <span className="text-neutral-600">•</span>
                      <span>{ex.equipment}</span>
                      {ex.movementPattern && (
                        <>
                          <span className="text-neutral-600">•</span>
                          <span className="text-neutral-400">{ex.movementPattern}</span>
                        </>
                      )}

                      {/* Discrete Media Badges (Only shown when media exists!) */}
                      {(hasVideo || hasImage) && (
                        <>
                          <span className="text-neutral-600">•</span>
                          <div className="inline-flex items-center gap-2 text-[11px] text-[#10B981]">
                            {hasImage && (
                              <span className="flex items-center gap-1" title="Foto inicial disponível">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <rect x="3" y="3" width="18" height="18" rx="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <polyline points="21 15 16 10 5 21" />
                                </svg>
                                <span>Foto</span>
                              </span>
                            )}
                            {hasVideo && (
                              <span className="flex items-center gap-1" title="Vídeo de execução disponível">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <polygon points="23 7 16 12 23 17 23 7" />
                                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                                <span>Vídeo</span>
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveExerciseDetails(ex);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-[#1B1D21] hover:bg-neutral-800 border border-[#303238] transition-all min-h-[38px] flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver detalhes</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>

                    {canEditThis && (
                      <Link
                        href={`/consultoria/${slug}/exercicios/${ex.publicId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#10B981] hover:text-white bg-[#10B981]/10 hover:bg-[#10B981] border border-[#10B981]/30 transition-all min-h-[38px] flex items-center gap-1"
                      >
                        <span>Editar</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            5. PAGINAÇÃO LIMPA
            ========================================================================= */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-[#303238] text-xs font-medium">
            <span className="text-neutral-400">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="text-xs min-h-[38px] px-3.5 disabled:opacity-40"
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="text-xs min-h-[38px] px-3.5 disabled:opacity-40"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          6. MODAL DE DETALHES DO EXERCÍCIO (SEPARANDO CONSULTAR DE EDITAR)
          ========================================================================= */}
      {activeExerciseDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-[#151619] border border-[#303238] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[#252830] flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  {activeExerciseDetails.name}
                </h3>
                <p className="text-xs text-neutral-400 font-medium">
                  {activeExerciseDetails.muscleGroupPrimary} • {activeExerciseDetails.equipment}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveExerciseDetails(null)}
                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Fechar modal de detalhes"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-neutral-300">
              {/* Media Player if Execution Video or Image is attached */}
              {(() => {
                const video = activeExerciseDetails.media?.find((m) => m.role === "EXECUTION_VIDEO");
                const image = activeExerciseDetails.media?.find((m) => m.role === "START_IMAGE");

                if (video) {
                  return (
                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-[#303238] flex items-center justify-center relative">
                      <video
                        src={`/api/training-v2/media/${video.mediaAsset.publicId}`}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                        preload="metadata"
                      />
                    </div>
                  );
                }

                if (image) {
                  return (
                    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-[#303238] flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/training-v2/media/${image.mediaAsset.publicId}`}
                        alt={activeExerciseDetails.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  );
                }

                return null;
              })()}

              {/* Badges Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#1B1D21] border border-[#252830]">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase block mb-0.5">Origem</span>
                  <span className="font-semibold text-white">
                    {activeExerciseDetails.scope === "GLOBAL"
                      ? "Oficial Trevo One"
                      : activeExerciseDetails.visibility === "CREATOR_ONLY"
                      ? "Privado (Só para mim)"
                      : "Minha Consultoria"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#1B1D21] border border-[#252830]">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase block mb-0.5">Padrão Motor</span>
                  <span className="font-semibold text-white">{activeExerciseDetails.movementPattern || "Livre"}</span>
                </div>
              </div>

              {/* Instructions / Execution biomechanics */}
              {activeExerciseDetails.instructions && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">Instruções de Execução</h4>
                  <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap bg-[#1B1D21] p-3 rounded-xl border border-[#252830]">
                    {activeExerciseDetails.instructions}
                  </p>
                </div>
              )}

              {/* Execution Tips */}
              {activeExerciseDetails.executionTips && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#10B981] uppercase tracking-wider">Dicas Biomecânicas</h4>
                  <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap bg-[#1B1D21] p-3 rounded-xl border border-[#252830]">
                    {activeExerciseDetails.executionTips}
                  </p>
                </div>
              )}

              {/* Common Mistakes */}
              {activeExerciseDetails.commonMistakes && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Erros Comuns a Evitar</h4>
                  <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap bg-[#1B1D21] p-3 rounded-xl border border-[#252830]">
                    {activeExerciseDetails.commonMistakes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-[#252830] flex items-center justify-between gap-2 shrink-0 bg-[#151619]">
              <button
                type="button"
                onClick={() => setActiveExerciseDetails(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 transition-colors"
              >
                Fechar
              </button>

              {activeExerciseDetails.scope !== "GLOBAL" &&
                (canManageConsultancy || activeExerciseDetails.visibility === "CREATOR_ONLY") && (
                  <Link href={`/consultoria/${slug}/exercicios/${activeExerciseDetails.publicId}`}>
                    <Button variant="primary" size="sm" className="font-bold text-xs min-h-[38px]">
                      Editar e Mídias →
                    </Button>
                  </Link>
                )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. BOTTOM SHEET DE FILTROS MOBILE
          ========================================================================= */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex flex-col justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full bg-[#151619] border-t border-[#303238] rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#252830]">
              <h3 className="text-base font-bold text-white">Filtrar Exercícios</h3>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-8 h-8 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">Grupo Muscular</label>
                <select
                  value={selectedMuscle}
                  onChange={(e) => setSelectedMuscle(e.target.value)}
                  className="w-full h-11 px-3 bg-[#1B1D21] border border-[#303238] rounded-xl text-sm text-white outline-none"
                >
                  <option value="Todos os Músculos">Todos os Músculos</option>
                  {availableMuscles.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">Equipamento</label>
                <select
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                  className="w-full h-11 px-3 bg-[#1B1D21] border border-[#303238] rounded-xl text-sm text-white outline-none"
                >
                  <option value="Todos os Equipamentos">Todos os Equipamentos</option>
                  {availableEquipments.map((eq) => (
                    <option key={eq} value={eq}>
                      {eq}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex-1 py-3 text-xs font-semibold text-neutral-400 bg-neutral-800 rounded-xl"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFilterSheetOpen(false);
                  fetchResults({ muscle: selectedMuscle, equipment: selectedEquipment, page: 1 });
                }}
                className="flex-1 py-3 text-xs font-bold text-black bg-[#10B981] rounded-xl"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
