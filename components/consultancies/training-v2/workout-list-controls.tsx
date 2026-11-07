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

  const statusOptions = [
    { id: "ALL", label: "Todos" },
    { id: "DRAFT", label: "Rascunhos" },
    { id: "PUBLISHED", label: "Publicados" },
    { id: "ARCHIVED", label: "Arquivados" },
  ];

  const sortOptions = [
    { id: "recent", label: "Atualizadas recentemente" },
    { id: "oldest", label: "Mais antigas" },
    { id: "title_asc", label: "Nome A-Z" },
  ];

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl border border-[#E5E8E2] bg-white shadow-2xs space-y-3.5 font-sans">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Field with Magnifying Glass and Clear Button */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <SearchIcon className="w-4 h-4 text-[#8C9890] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isTemplatesTab
                ? "Buscar por nome do modelo..."
                : "Buscar treino ou aluno..."
            }
            className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-[#E5E8E2] bg-[#FDFDFC] focus:outline-none focus:ring-2 focus:ring-[#176B49] focus:border-transparent text-[#102E23] placeholder-[#8C9890] transition-all min-h-[40px]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8C9890] hover:text-[#102E23] rounded-md transition-colors cursor-pointer"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Sort Dropdown */}
        <div className="shrink-0 flex items-center gap-2">
          <label htmlFor="sort-select" className="sr-only">
            Ordenar por
          </label>
          <select
            id="sort-select"
            value={currentSort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-[#E5E8E2] bg-[#FDFDFC] text-[#102E23] focus:outline-none focus:ring-2 focus:ring-[#176B49] transition-all min-h-[40px] cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Status Pills & Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-2.5 border-t border-[#F0F2ED]">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {statusOptions.map((tab) => {
            const isActive = currentStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => updateFilters({ status: tab.id })}
                className={`px-3 py-1.5 rounded-xl text-xs select-none transition-all min-h-[34px] flex items-center justify-center whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#102E23] text-white font-bold shadow-2xs"
                    : "bg-[#F5F5F0] text-[#526058] hover:text-[#102E23] hover:bg-[#EAECE6] border border-[#E5E8E2] font-medium"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Results Counter */}
        <div className="text-xs text-[#6B7870] font-medium shrink-0">
          {isPending ? (
            <span className="animate-pulse">Atualizando...</span>
          ) : hasError ? (
            <span className="text-rose-600 font-semibold">Consulta indisponível</span>
          ) : totalResults > 0 ? (
            <span>
              {totalResults} {totalResults === 1 ? (isTemplatesTab ? "modelo cadastrado" : "ficha encontrada") : (isTemplatesTab ? "modelos cadastrados" : "fichas encontradas")}
            </span>
          ) : (
            <span className="text-[#8C9890]">
              {isTemplatesTab ? "Nenhum modelo encontrado" : "Nenhum treino encontrado"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
