/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MobileBottomSheet,
  MobileActionSheet,
  MobileCard,
  MobileEmptyState,
} from "@/components/ui/mobile";
import type {
  ExerciseItemDto,
  DifficultyLevel,
  MovementPattern,
} from "@/lib/training-v2/types";
import {
  createConsultancyExerciseDraftAction,
  archiveConsultancyExerciseAction,
} from "@/app/consultoria/[slug]/exercicios/actions";
import { checkExerciseDuplicate } from "@/lib/training-v2/exercise-similarity";

export interface MobileExerciseCockpitProps {
  slug: string;
  items: ExerciseItemDto[];
  availableMuscles: string[];
  availableEquipments: string[];
  currentTab: string;
  currentQuery?: string;
  currentMuscle?: string;
  currentEquipment?: string;
  currentPage: number;
  totalPages: number;
  total: number;
  canCreate?: boolean;
  canManageConsultancy?: boolean;
}

const MOVEMENT_PATTERNS: { value: MovementPattern; label: string }[] = [
  { value: "PUSH", label: "Empurrar (Push)" },
  { value: "PULL", label: "Puxar (Pull)" },
  { value: "SQUAT", label: "Agachamento (Squat)" },
  { value: "HINGE", label: "Quadril / Terra (Hinge)" },
  { value: "LUNGE", label: "Avanço / Unilateral (Lunge)" },
  { value: "ISOLATION", label: "Isolamento Articular (Isolation)" },
  { value: "CARDIO", label: "Cardiorrespiratório (Cardio)" },
  { value: "MOBILITY", label: "Mobilidade / Flexibilidade (Mobility)" },
];

function DumbbellIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function FilterIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18m-15 7.5h12m-9 7.5h6" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function VideoCameraIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function MoreDotsIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="6" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="18" r="2" />
    </svg>
  );
}

export function MobileExerciseCockpit({
  slug,
  items,
  availableMuscles,
  availableEquipments,
  currentTab,
  currentQuery = "",
  currentMuscle = "",
  currentEquipment = "",
  currentPage,
  totalPages,
  total,
  canCreate = true,
  canManageConsultancy = false,
}: MobileExerciseCockpitProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState(currentQuery);
  const [selectedMuscle, setSelectedMuscle] = useState(currentMuscle || "Todos os Músculos");
  const [selectedEquipment, setSelectedEquipment] = useState(currentEquipment || "Todos os Equipamentos");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Detail Sheet state
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItemDto | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Contextual Action Sheet
  const [actionSheetExercise, setActionSheetExercise] = useState<ExerciseItemDto | null>(null);

  // Create Exercise Sheet state
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState(availableMuscles[0] || "Peitoral");
  const [newEquipment, setNewEquipment] = useState(availableEquipments[0] || "Halteres");
  const [newMovementPattern, setNewMovementPattern] = useState<MovementPattern | "">("");
  const [newDifficulty, setNewDifficulty] = useState<DifficultyLevel>("INTERMEDIATE");
  const [newDescription, setNewDescription] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newExecutionTips, setNewExecutionTips] = useState("");
  const [newVisibility, setNewVisibility] = useState<"CREATOR_ONLY" | "CONSULTANCY">("CREATOR_ONLY");
  const [createError, setCreateError] = useState<string | null>(null);

  // Existing names for live duplicate protection
  const existingNames = useMemo(() => items.map((ex) => ex.name), [items]);

  // Live duplicate check
  const duplicateNotice = useMemo(() => {
    if (!newName.trim() || newName.trim().length < 3) return null;
    return checkExerciseDuplicate(newName.trim(), existingNames);
  }, [newName, existingNames]);

  // Apply filters via Next.js navigation
  const applyFilters = (overrides?: {
    q?: string;
    muscle?: string;
    equipment?: string;
    tab?: string;
  }) => {
    const q = overrides?.q !== undefined ? overrides.q : searchQuery;
    const m = overrides?.muscle !== undefined ? overrides.muscle : selectedMuscle;
    const eq = overrides?.equipment !== undefined ? overrides.equipment : selectedEquipment;
    const t = overrides?.tab !== undefined ? overrides.tab : currentTab;

    const params = new URLSearchParams();
    if (t && t !== "TODOS") params.set("tab", t);
    if (q.trim()) params.set("q", q.trim());
    if (m && m !== "Todos os Músculos") params.set("muscle", m);
    if (eq && eq !== "Todos os Equipamentos") params.set("equipment", eq);

    setIsFilterSheetOpen(false);
    router.push(`/consultoria/${slug}/exercicios?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedMuscle("Todos os Músculos");
    setSelectedEquipment("Todos os Equipamentos");
    router.push(`/consultoria/${slug}/exercicios?tab=${currentTab}`);
  };

  const handleCreateExerciseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError("Informe o nome do exercício.");
      return;
    }
    setCreateError(null);

    startTransition(async () => {
      const res = await createConsultancyExerciseDraftAction(slug, {
        name: newName.trim(),
        muscleGroupPrimary: newMuscle,
        equipment: newEquipment,
        movementPattern: (newMovementPattern as MovementPattern) || undefined,
        difficultyLevel: newDifficulty,
        description: newDescription.trim() || undefined,
        instructions: newInstructions.trim() || undefined,
        executionTips: newExecutionTips.trim() || undefined,
        visibility: newVisibility,
      });

      if (res.ok && res.data) {
        setIsCreateSheetOpen(false);
        setNewName("");
        setNewDescription("");
        setNewInstructions("");
        setNewExecutionTips("");
        router.refresh();
      } else {
        setCreateError(res.error || "Erro ao cadastrar exercício.");
      }
    });
  };

  const handleArchiveExercise = (ex: ExerciseItemDto) => {
    if (!confirm(`Deseja realmente arquivar o exercício "${ex.name}"?`)) return;
    startTransition(async () => {
      const res = await archiveConsultancyExerciseAction(slug, ex.publicId);
      if (res.ok) {
        setActionSheetExercise(null);
        setSelectedExercise(null);
        router.refresh();
      } else {
        alert(res.error || "Erro ao arquivar exercício.");
      }
    });
  };

  const hasActiveFilters = Boolean(
    (selectedMuscle && selectedMuscle !== "Todos os Músculos") ||
    (selectedEquipment && selectedEquipment !== "Todos os Equipamentos") ||
    searchQuery.trim()
  );

  return (
    <div className="space-y-4 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
      {/* =========================================================================
          1. MOBILE SEARCH & PRIMARY CONTROLS
          ========================================================================= */}
      <div className="space-y-2.5">
        {/* Top Search Input with Clean Clear Button */}
        <div className="relative flex items-center">
          <SearchIcon className="w-4 h-4 absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            placeholder="Buscar por nome do exercício..."
            className="w-full h-11 pl-10 pr-9 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                applyFilters({ q: "" });
              }}
              className="absolute right-2.5 p-1 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
              aria-label="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>

        {/* Source Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {[
            { id: "TODOS", label: "Todos" },
            { id: "TREVO_ONE", label: "Trevo One" },
            { id: "CONSULTORIA", label: "Consultoria" },
            { id: "MEUS", label: "🔒 Meus" },
          ].map((t) => {
            const isActive = currentTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => applyFilters({ tab: t.id })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap min-h-[36px] transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--brand)] text-[var(--text-inverse)] shadow-xs"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Secondary Row: Filter Sheet Trigger & CTA */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setIsFilterSheetOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border-default)] hover:bg-[var(--surface-hover)] min-h-[44px] cursor-pointer shadow-2xs"
          >
            <FilterIcon className="w-4 h-4 text-[var(--text-secondary)]" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[var(--brand)] ml-0.5" />
            )}
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateSheetOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px] cursor-pointer shadow-xs"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Novo exercício</span>
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            {selectedMuscle && selectedMuscle !== "Todos os Músculos" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[11px] font-medium">
                <span>{selectedMuscle}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMuscle("Todos os Músculos");
                    applyFilters({ muscle: "Todos os Músculos" });
                  }}
                  className="hover:text-[var(--text-primary)] cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            {selectedEquipment && selectedEquipment !== "Todos os Equipamentos" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[11px] font-medium">
                <span>{selectedEquipment}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEquipment("Todos os Equipamentos");
                    applyFilters({ equipment: "Todos os Equipamentos" });
                  }}
                  className="hover:text-[var(--text-primary)] cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-[11px] text-[var(--brand)] hover:underline font-bold px-1 py-0.5 cursor-pointer"
            >
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {/* Result Counter */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-medium px-1">
        <span>{total} {total === 1 ? "exercício disponível" : "exercícios disponíveis"}</span>
        {totalPages > 1 && <span>Página {currentPage} de {totalPages}</span>}
      </div>

      {/* =========================================================================
          2. EXERCISE CARDS LIST (Mobile-first composition)
          ========================================================================= */}
      {items.length === 0 ? (
        <MobileEmptyState
          title="Nenhum exercício encontrado"
          description={
            hasActiveFilters
              ? "Tente ajustar os termos de pesquisa ou remover os filtros aplicados."
              : "Nenhum exercício cadastrado nesta categoria."
          }
          icon={<DumbbellIcon className="w-8 h-8 text-[var(--brand)]" />}
          action={
            canCreate ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsCreateSheetOpen(true)}
                className="w-full min-h-[48px] font-bold text-xs"
              >
                + Cadastrar exercício
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((ex) => {
            const isGlobal = ex.scope === "GLOBAL";
            const isShared = ex.scope === "CONSULTANCY" && ex.visibility === "CONSULTANCY";
            const isPrivate = ex.scope === "CONSULTANCY" && ex.visibility === "CREATOR_ONLY";

            const hasVideo = ex.media?.some((m) => m.role === "EXECUTION_VIDEO");
            const startImage = ex.media?.find((m) => m.role === "START_IMAGE");

            return (
              <MobileCard
                key={ex.publicId}
                className="p-3.5 space-y-2 hover:border-[var(--border-strong)] transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Thumbnail / Clean Icon Placeholder */}
                  <div
                    onClick={() => {
                      setSelectedExercise(ex);
                      setIsVideoPlaying(false);
                    }}
                    className="w-14 h-14 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] overflow-hidden shrink-0 flex items-center justify-center relative"
                  >
                    {startImage ? (
                      <img
                        src={`/api/training-v2/media/${startImage.mediaAsset.publicId}`}
                        alt={ex.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          // Prevent broken image icon
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <DumbbellIcon className="w-6 h-6 text-[var(--text-tertiary)]" />
                    )}
                    {hasVideo && (
                      <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center">
                        <VideoCameraIcon className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Main Info */}
                  <div
                    onClick={() => {
                      setSelectedExercise(ex);
                      setIsVideoPlaying(false);
                    }}
                    className="min-w-0 flex-1 space-y-1"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-heading text-xs sm:text-sm font-bold text-[var(--text-primary)] leading-tight truncate">
                        {ex.name}
                      </h3>
                      {isGlobal && (
                        <Badge variant="brand" size="sm" className="text-[9px] py-0 px-1.5">
                          Trevo One
                        </Badge>
                      )}
                      {isShared && (
                        <Badge variant="success" size="sm" className="text-[9px] py-0 px-1.5">
                          Consultoria
                        </Badge>
                      )}
                      {isPrivate && (
                        <Badge variant="neutral" size="sm" className="text-[9px] py-0 px-1.5">
                          Privado
                        </Badge>
                      )}
                    </div>

                    <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                      <span className="text-[var(--text-primary)] font-semibold">{ex.muscleGroupPrimary}</span>
                      <span className="text-[var(--text-tertiary)]"> • </span>
                      <span>{ex.equipment}</span>
                      {ex.movementPattern && (
                        <>
                          <span className="text-[var(--text-tertiary)]"> • </span>
                          <span className="text-[var(--text-tertiary)]">{ex.movementPattern}</span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Secondary Options Trigger (•••) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionSheetExercise(ex);
                    }}
                    aria-label={`Opções do exercício ${ex.name}`}
                    className="p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <MoreDotsIcon className="w-4 h-4" />
                  </button>
                </div>
              </MobileCard>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-xs">
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("page", String(currentPage - 1));
              router.push(`/consultoria/${slug}/exercicios?${params.toString()}`);
            }}
            className="min-h-[40px] font-bold text-xs"
          >
            ← Anterior
          </Button>
          <span className="text-[var(--text-secondary)] text-[11px] font-medium">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("page", String(currentPage + 1));
              router.push(`/consultoria/${slug}/exercicios?${params.toString()}`);
            }}
            className="min-h-[40px] font-bold text-xs"
          >
            Próxima →
          </Button>
        </div>
      )}

      {/* =========================================================================
          3. FILTER BOTTOM SHEET
          ========================================================================= */}
      <MobileBottomSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        title="Filtrar Exercícios"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--text-primary)]">
              Grupo Muscular
            </label>
            <select
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-medium text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <option value="Todos os Músculos">Todos os Músculos</option>
              {availableMuscles.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--text-primary)]">
              Equipamento
            </label>
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-medium text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
            >
              <option value="Todos os Equipamentos">Todos os Equipamentos</option>
              {availableEquipments.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={clearAllFilters}
              className="flex-1 min-h-[48px] font-bold text-xs"
            >
              Limpar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={() => applyFilters()}
              className="flex-1 min-h-[48px] font-bold text-xs"
            >
              Aplicar filtros
            </Button>
          </div>
        </div>
      </MobileBottomSheet>

      {/* =========================================================================
          4. EXERCISE DETAIL BOTTOM SHEET (Details on demand)
          ========================================================================= */}
      <MobileBottomSheet
        isOpen={Boolean(selectedExercise)}
        onClose={() => {
          setSelectedExercise(null);
          setIsVideoPlaying(false);
        }}
        title={selectedExercise?.name || "Detalhes do Exercício"}
      >
        {selectedExercise && (
          <div className="space-y-4">
            {/* Source & Difficulty Badges */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2.5">
              <Badge variant="brand" size="sm">
                {selectedExercise.scope === "GLOBAL" ? "Catálogo Trevo One" : "Consultoria"}
              </Badge>
              <Badge variant="neutral" size="sm">
                {selectedExercise.difficultyLevel === "BEGINNER"
                  ? "Iniciante"
                  : selectedExercise.difficultyLevel === "ADVANCED"
                  ? "Avançado"
                  : "Intermediário"}
              </Badge>
            </div>

            {/* Video / Image Display (Video loads only on tap) */}
            {selectedExercise.media && selectedExercise.media.length > 0 && (
              <div className="space-y-2">
                {selectedExercise.media.some((m) => m.role === "EXECUTION_VIDEO") ? (
                  <div className="rounded-xl overflow-hidden bg-black/80 aspect-video flex items-center justify-center relative">
                    {isVideoPlaying ? (
                      <video
                        src={`/api/training-v2/media/${selectedExercise.media.find((m) => m.role === "EXECUTION_VIDEO")?.mediaAsset.publicId}`}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsVideoPlaying(true)}
                        className="flex flex-col items-center gap-2 text-white p-4 cursor-pointer"
                      >
                        <span className="w-12 h-12 rounded-full bg-[var(--brand)] text-[var(--text-inverse)] flex items-center justify-center shadow-lg">
                          ▶
                        </span>
                        <span className="text-xs font-bold">Assistir execução</span>
                      </button>
                    )}
                  </div>
                ) : (
                  selectedExercise.media.find((m) => m.role === "START_IMAGE") && (
                    <div className="rounded-xl overflow-hidden aspect-video bg-[var(--surface-sunken)] flex items-center justify-center">
                      <img
                        src={`/api/training-v2/media/${selectedExercise.media.find((m) => m.role === "START_IMAGE")?.mediaAsset.publicId}`}
                        alt={selectedExercise.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )
                )}
              </div>
            )}

            {/* Classification Card */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1 text-xs">
              <p className="text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">Grupo Principal:</strong> {selectedExercise.muscleGroupPrimary}
              </p>
              {selectedExercise.muscleGroupsSecondary && selectedExercise.muscleGroupsSecondary.length > 0 && (
                <p className="text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">Secundários:</strong> {selectedExercise.muscleGroupsSecondary.join(", ")}
                </p>
              )}
              <p className="text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">Equipamento:</strong> {selectedExercise.equipment}
              </p>
              {selectedExercise.movementPattern && (
                <p className="text-[var(--text-secondary)]">
                  <strong className="text-[var(--text-primary)]">Padrão de Movimento:</strong> {selectedExercise.movementPattern}
                </p>
              )}
            </div>

            {/* Description & Technical Instructions */}
            {selectedExercise.description && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Descrição
                </span>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {selectedExercise.description}
                </p>
              </div>
            )}

            {selectedExercise.instructions && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Instruções de Execução
                </span>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {selectedExercise.instructions}
                </p>
              </div>
            )}

            {selectedExercise.executionTips && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Dicas Técnicas
                </span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {selectedExercise.executionTips}
                </p>
              </div>
            )}

            {/* Actions Footer */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setSelectedExercise(null);
                  setIsVideoPlaying(false);
                }}
                className="flex-1 min-h-[44px] font-bold text-xs"
              >
                Fechar
              </Button>
              {selectedExercise.scope !== "GLOBAL" && (canManageConsultancy || selectedExercise.visibility === "CREATOR_ONLY") && (
                <Link
                  href={`/consultoria/${slug}/exercicios/${selectedExercise.publicId}`}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] min-h-[44px]"
                >
                  Editar exercício
                </Link>
              )}
            </div>
          </div>
        )}
      </MobileBottomSheet>

      {/* =========================================================================
          5. CONTEXTUAL ACTION SHEET (•••)
          ========================================================================= */}
      <MobileActionSheet
        isOpen={Boolean(actionSheetExercise)}
        onClose={() => setActionSheetExercise(null)}
        title={actionSheetExercise?.name || "Ações do Exercício"}
        options={[
          {
            id: "view-details",
            label: "Ver detalhes e execução",
            icon: <DumbbellIcon className="w-5 h-5 text-[var(--brand)]" />,
            onClick: () => {
              if (actionSheetExercise) {
                setSelectedExercise(actionSheetExercise);
                setIsVideoPlaying(false);
              }
              setActionSheetExercise(null);
            },
          },
          ...(actionSheetExercise && actionSheetExercise.scope !== "GLOBAL" && (canManageConsultancy || actionSheetExercise.visibility === "CREATOR_ONLY")
            ? [
                {
                  id: "edit-exercise",
                  label: "Editar exercício e mídias",
                  icon: <span className="text-base">✏️</span>,
                  onClick: () => {
                    if (actionSheetExercise) {
                      router.push(`/consultoria/${slug}/exercicios/${actionSheetExercise.publicId}`);
                    }
                    setActionSheetExercise(null);
                  },
                },
                {
                  id: "archive-exercise",
                  label: "Arquivar exercício",
                  icon: <span className="text-base text-rose-500">🗑️</span>,
                  onClick: () => {
                    if (actionSheetExercise) {
                      handleArchiveExercise(actionSheetExercise);
                    }
                  },
                },
              ]
            : []),
        ]}
      />

      {/* =========================================================================
          6. CREATE EXERCISE SLIDE-UP SHEET (Mobile-native 4-group form)
          ========================================================================= */}
      <MobileBottomSheet
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        title="Novo Exercício"
      >
        <form onSubmit={handleCreateExerciseSubmit} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold">
              {createError}
            </div>
          )}

          {/* Group 1: IDENTIFICAÇÃO */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3">
            <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider block">
              1. Identificação
            </span>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Nome do Exercício *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Supino Inclinado com Halteres"
                className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>

            {/* Duplicate Notice */}
            {duplicateNotice?.isSimilar && (
              <div
                className={`p-3 rounded-xl text-xs space-y-1 ${
                  duplicateNotice.isExactDuplicate
                    ? "bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 font-bold"
                    : "bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-medium"
                }`}
              >
                <span>⚠️ {duplicateNotice.message}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Padrão de Movimento
              </label>
              <select
                value={newMovementPattern}
                onChange={(e) => setNewMovementPattern(e.target.value as MovementPattern)}
                className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
              >
                <option value="">Selecione se aplicável</option>
                {MOVEMENT_PATTERNS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Group 2: CLASSIFICAÇÃO */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3">
            <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider block">
              2. Classificação Muscular &amp; Equipamento
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  Músculo Principal *
                </label>
                <input
                  type="text"
                  required
                  value={newMuscle}
                  onChange={(e) => setNewMuscle(e.target.value)}
                  placeholder="Ex: Peitoral"
                  className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  Equipamento *
                </label>
                <input
                  type="text"
                  required
                  value={newEquipment}
                  onChange={(e) => setNewEquipment(e.target.value)}
                  placeholder="Ex: Halteres"
                  className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Dificuldade
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "BEGINNER", label: "Iniciante" },
                  { id: "INTERMEDIATE", label: "Intermediário" },
                  { id: "ADVANCED", label: "Avançado" },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setNewDifficulty(d.id as DifficultyLevel)}
                    className={`py-2 rounded-xl text-xs font-semibold min-h-[44px] border transition-colors ${
                      newDifficulty === d.id
                        ? "bg-[var(--brand)] text-[var(--text-inverse)] border-[var(--brand)]"
                        : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-default)]"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Group 3: EXECUÇÃO */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3">
            <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider block">
              3. Execução &amp; Instruções
            </span>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Instruções Passo a Passo
              </label>
              <textarea
                rows={3}
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
                placeholder="Descreva a postura e a execução correta..."
                className="w-full p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Dicas Técnicas
              </label>
              <textarea
                rows={2}
                value={newExecutionTips}
                onChange={(e) => setNewExecutionTips(e.target.value)}
                placeholder="Ex: Mantenha as escápulas retraídas..."
                className="w-full p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs font-medium text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
              />
            </div>
          </div>

          {/* Group 4: VISIBILIDADE */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
            <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider block">
              4. Visibilidade
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setNewVisibility("CREATOR_ONLY")}
                className={`p-2.5 rounded-xl text-xs font-semibold min-h-[44px] border transition-colors ${
                  newVisibility === "CREATOR_ONLY"
                    ? "bg-[var(--surface)] text-[var(--text-primary)] border-[var(--brand)] font-bold shadow-2xs"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-default)]"
                }`}
              >
                🔒 Só para mim
              </button>
              <button
                type="button"
                onClick={() => setNewVisibility("CONSULTANCY")}
                className={`p-2.5 rounded-xl text-xs font-semibold min-h-[44px] border transition-colors ${
                  newVisibility === "CONSULTANCY"
                    ? "bg-[var(--surface)] text-[var(--text-primary)] border-[var(--brand)] font-bold shadow-2xs"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-default)]"
                }`}
              >
                👥 Toda Consultoria
              </button>
            </div>
          </div>

          {/* Sticky CTA (>= 48px, safe-area inset) */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isPending}
              className="w-full min-h-[48px] font-bold text-xs sm:text-sm cursor-pointer shadow-md"
            >
              {isPending ? "Salvando..." : "Salvar exercício"}
            </Button>
          </div>
        </form>
      </MobileBottomSheet>
    </div>
  );
}
