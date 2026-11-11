"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export type WorkoutListControlsProps = {
  consultancySlug: string;
  currentQuery: string;
  currentStatus: string;
  currentSort: string;
  isTemplatesTab?: boolean;
  totalResults: number;
  hasError?: boolean;
};

export function WorkoutListControls({
  consultancySlug,
  currentQuery,
  currentStatus,
  currentSort,
  isTemplatesTab = false,
  totalResults,
  hasError = false,
}: WorkoutListControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(currentQuery);
  const [prevQuery, setPrevQuery] = useState(currentQuery);
  const [isPending, startTransition] = useTransition();

  if (prevQuery !== currentQuery) {
    setPrevQuery(currentQuery);
    setSearchTerm(currentQuery);
  }

  const updateFilters = (updates: {
    q?: string;
    status?: string;
    sort?: string;
  }) => {
    const params = new URLSearchParams(searchParams?.toString() || "");

    if (isTemplatesTab) {
      params.set("tab", "templates");
    }

    // Query
    const qValue = updates.q !== undefined ? updates.q : searchTerm;
    if (qValue && qValue.trim()) {
      params.set("q", qValue.trim());
    } else {
      params.delete("q");
    }

    // Status
    const statusValue = updates.status !== undefined ? updates.status : currentStatus;
    if (statusValue && statusValue !== "ALL") {
      params.set("status", statusValue);
    } else {
      params.delete("status");
    }

    // Sort
    const sortValue = updates.sort !== undefined ? updates.sort : currentSort;
    if (sortValue && sortValue !== "recent") {
      params.set("sort", sortValue);
    } else {
      params.delete("sort");
    }

    // Reset pagination to 1
    params.delete("page");

    const queryStr = params.toString();
    const target = `/consultoria/${consultancySlug}/rotinas${queryStr ? `?${queryStr}` : ""}`;
    startTransition(() => {
      router.push(target);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchTerm });
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    updateFilters({ q: "" });
  };

  const primaryStatusOptions = [
    { id: "ALL", label: "Todos" },
    { id: "DRAFT", label: "Em elaboração" },
  ];

  const secondaryStatusOptions = [
    { id: "PUBLISHED", label: "Publicados" },
    { id: "ARCHIVED", label: "Arquivados" },
  ];

  const sortOptions = [
    { id: "recent", label: "Mais recentes" },
    { id: "oldest", label: "Mais antigas" },
    { id: "title_asc", label: "Nome A-Z" },
  ];

  return (
    <div id="workout-search-container" className="p-3 sm:p-3.5 rounded-2xl border border-[#E5E8E2] bg-white shadow-2xs space-y-2.5 font-sans">
      <div className="flex gap-2 items-center">
        {/* Search Field */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <SearchIcon className="w-4 h-4 text-[#8C9890] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="workout-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar treino, programa ou aluno..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-[#E5E8E2] bg-[#FDFDFC] focus:outline-none focus:ring-2 focus:ring-[#176B49] focus:border-transparent text-[#102E23] placeholder-[#8C9890] transition-all min-h-[36px] sm:min-h-[38px]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#8C9890] hover:text-[#102E23] rounded-md transition-colors cursor-pointer"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Compact Sort Select */}
        <div className="shrink-0">
          <label htmlFor="sort-select" className="sr-only">
            Ordenar por
          </label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            aria-label="Ordenar treinos"
            className="px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-xl border border-[#E5E8E2] bg-[#FDFDFC] text-[#102E23] focus:outline-none focus:ring-2 focus:ring-[#176B49] transition-all min-h-[36px] sm:min-h-[38px] cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Status Pills & Compact Results Counter */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#F0F2ED]">
        {/* Status Pills */}
        {!isTemplatesTab ? (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {primaryStatusOptions.map((tab) => {
              const isActive = currentStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => updateFilters({ status: tab.id })}
                  className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs select-none transition-all min-h-[30px] sm:min-h-[32px] flex items-center justify-center whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-[#102E23] text-white font-bold shadow-2xs"
                      : "bg-[#F5F5F0] text-[#526058] hover:text-[#102E23] hover:bg-[#EAECE6] border border-[#E5E8E2] font-medium"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}

            <div className="w-[1px] h-4 bg-[#E5E8E2] mx-1 self-center shrink-0" />

            {/* Secondary Status Options */}
            {secondaryStatusOptions.map((opt) => {
              const isActive = currentStatus === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateFilters({ status: isActive ? "ALL" : opt.id })}
                  className={`px-2.5 py-1 rounded-xl text-xs select-none transition-all min-h-[30px] sm:min-h-[32px] flex items-center justify-center whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-[#102E23] text-white font-bold shadow-2xs"
                      : "bg-transparent text-[#6B7870] hover:text-[#102E23] hover:bg-[#F5F5F0] font-medium"
                  }`}
                  title={opt.id === "PUBLISHED" ? "Fichas publicadas criadas por você" : "Fichas arquivadas"}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-[#526058] font-medium">
            Programas de Treino
          </div>
        )}

        {/* Results Counter (Discreet) */}
        <div className="text-[11px] sm:text-xs text-[#6B7870] font-medium shrink-0">
          {isPending ? (
            <span className="animate-pulse">Atualizando...</span>
          ) : hasError ? (
            <span className="text-rose-600 font-semibold">Consulta indisponível</span>
          ) : totalResults > 0 ? (
            <span>
              {totalResults} {totalResults === 1 ? (isTemplatesTab ? "programa" : "treino") : (isTemplatesTab ? "programas" : "treinos")}
            </span>
          ) : (
            <span className="text-[#8C9890]">
              {isTemplatesTab ? "Nenhum programa" : "Nenhum treino"}
            </span>
          )}
        </div>
      </div>

      {/* Informative helper callout when filtering by PUBLISHED */}
      {!isTemplatesTab && currentStatus === "PUBLISHED" && (
        <div className="text-[11px] text-[#526058] bg-[#F5F5F0] border border-[#E5E8E2] rounded-xl px-3 py-1.5 flex items-center justify-between gap-2">
          <span>
            ℹ️ Exibindo fichas e programas de treino criados por você com status publicado. Para ver os treinos prescritos e ativos dos alunos, acesse a aba <strong>Treinos dos alunos</strong>.
          </span>
        </div>
      )}
    </div>
  );
}
