"use client";

import React, { useState, useTransition } from "react";
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

export type NutritionPlanListControlsProps = {
  consultancySlug: string;
  currentQuery: string;
  currentStatus: string;
  currentSort: string;
  isTemplatesTab?: boolean;
  totalResults: number;
};

export function NutritionPlanListControls({
  consultancySlug,
  currentQuery,
  currentStatus,
  currentSort,
  isTemplatesTab = false,
  totalResults,
}: NutritionPlanListControlsProps) {
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
    } else {
      params.delete("tab");
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
    const target = `/consultoria/${consultancySlug}/planos-v2${queryStr ? `?${queryStr}` : ""}`;
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
    { id: "DRAFT", label: "Com rascunho" },
    { id: "PUBLISHED", label: "Publicados" },
    { id: "ARCHIVED", label: "Arquivados" },
  ];

  const sortOptions = [
    { id: "recent", label: "Atualizados recentemente" },
    { id: "oldest", label: "Atualizados há mais tempo" },
    { id: "title_asc", label: "Nome A-Z" },
  ];

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#151619] shadow-xs space-y-3.5">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Field with Magnifying Glass and Clear Button */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isTemplatesTab
                ? "Buscar por nome do modelo..."
                : "Buscar plano ou paciente..."
            }
            className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 transition-all min-h-[40px]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md transition-colors cursor-pointer"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Sort Dropdown */}
        <div className="shrink-0 flex items-center gap-2">
          <label htmlFor="nutrition-sort-select" className="sr-only">
            Ordenar por
          </label>
          <select
            id="nutrition-sort-select"
            value={currentSort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all min-h-[40px] cursor-pointer"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
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
                    ? "bg-emerald-500 text-zinc-950 font-bold shadow-xs"
                    : "bg-zinc-100 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-800 font-medium"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Results Counter */}
        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium shrink-0">
          {isPending ? (
            <span className="animate-pulse">Atualizando...</span>
          ) : totalResults > 0 ? (
            <span>
              {totalResults}{" "}
              {totalResults === 1
                ? isTemplatesTab
                  ? "modelo encontrado"
                  : "plano encontrado"
                : isTemplatesTab
                ? "modelos encontrados"
                : "planos encontrados"}
            </span>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500">Nenhum resultado</span>
          )}
        </div>
      </div>
    </div>
  );
}
