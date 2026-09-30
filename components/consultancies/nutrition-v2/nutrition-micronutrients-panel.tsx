"use client";

import React, { useState, useMemo } from "react";
import type {
  MicronutrientTotalsSummary,
  MicronutrientTotalDetail,
} from "@/lib/nutrition-v2/nutrient-calculator";
import { CANONICAL_NUTRIENTS } from "@/lib/nutrition-v2/micronutrients";

export interface NutritionMicronutrientsPanelProps {
  totals?: MicronutrientTotalsSummary | null;
  title?: string;
  defaultCollapsed?: boolean;
  className?: string;
  isDrawer?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const CATEGORY_DEFINITIONS = [
  {
    key: "MINERAL",
    title: "Minerais",
    description: "Macrominerais e microminerais essenciais",
    codes: ["NA", "CA", "FE", "K", "MG", "P", "ZN", "CU", "MN", "SE"],
  },
  {
    key: "VITAMIN",
    title: "Vitaminas",
    description: "Vitaminas lipossolúveis e hidrossolúveis",
    codes: [
      "VIT_A",
      "VIT_C",
      "VIT_D",
      "VIT_E",
      "VIT_K",
      "VIT_B1",
      "VIT_B2",
      "VIT_B3",
      "VIT_B5",
      "VIT_B6",
      "FOLATE",
      "VIT_B12",
    ],
  },
  {
    key: "FIBER",
    title: "Fibras e Sub-macros",
    description: "Fibras e frações alimentares",
    codes: ["FIBER"],
  },
] as const;

function formatNutrientValue(value: number): string {
  if (value === 0) return "0";
  return Number(value.toFixed(2)).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function NutrientRow({ detail }: { detail: MicronutrientTotalDetail }) {
  const {
    namePtBr,
    unit,
    value,
    quantifiedItemCount,
    traceItemCount,
    hasTrace,
    hasUnknown,
    totalItemCount,
  } = detail;

  // Determine value display state:
  // KNOWN -> show numeric value with unit
  // KNOWN_ZERO -> show 0 with unit
  // TRACE -> show "Traços"
  // UNKNOWN -> show "—" (NEVER 0)
  const isQuantified = quantifiedItemCount > 0;
  const isPureTrace = quantifiedItemCount === 0 && hasTrace;
  const isUnknown = quantifiedItemCount === 0 && !hasTrace;
  const isPartial = isQuantified && hasUnknown && totalItemCount > 1;

  return (
    <div className="flex items-center justify-between py-2.5 px-3 hover:bg-[var(--surface-subtle)] rounded-xl transition-colors border-b border-[var(--border-subtle)] last:border-b-0 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold text-[var(--text-primary)] truncate" title={namePtBr}>
          {namePtBr}
        </span>
        {isPartial && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0 cursor-help"
            title={`Subtotal parcial: ${quantifiedItemCount} de ${totalItemCount} alimentos com dado nesta fonte`}
          >
            Dados parciais
          </span>
        )}
      </div>

      <div className="text-right shrink-0">
        {isUnknown ? (
          <span
            className="text-xs font-semibold text-[var(--text-tertiary)] cursor-help"
            title="Não informado na fonte deste alimento"
          >
            —
          </span>
        ) : isPureTrace ? (
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
            Traços
          </span>
        ) : (
          <div className="inline-flex items-baseline gap-1">
            <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
              {formatNutrientValue(value)}
            </span>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              {unit}
            </span>
            {hasTrace && (
              <span
                className="text-[10px] font-bold text-sky-600 dark:text-sky-400 ml-0.5 cursor-help"
                title={`+${traceItemCount} alimento(s) com traços (< LOQ)`}
              >
                (+traços)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function NutritionMicronutrientsPanel({
  totals,
  title = "Micronutrientes",
  defaultCollapsed = false,
  className = "",
  isDrawer = false,
  isOpen: controlledIsOpen,
  onClose,
}: NutritionMicronutrientsPanelProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(!defaultCollapsed);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState<string>("");

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    setInternalIsOpen(open);
    if (!open && onClose) onClose();
  };

  const { empty = true, nutrients = {} } = totals || {};

  // Count fully and partially quantified nutrients
  const { quantifiedNutrientsCount } = useMemo(() => {
    if (empty || !nutrients) return { quantifiedNutrientsCount: 0 };
    let quantified = 0;
    for (const defn of CANONICAL_NUTRIENTS) {
      const d = nutrients[defn.code];
      if (d && (d.quantifiedItemCount > 0 || d.hasTrace)) {
        quantified++;
      }
    }
    return { quantifiedNutrientsCount: quantified };
  }, [empty, nutrients]);

  // Filter canonical nutrients based on active tab and search query
  const filteredGroups = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    return CATEGORY_DEFINITIONS.filter(
      (cat) => activeCategory === "ALL" || activeCategory === cat.key
    ).map((cat) => {
      const matchedCodes = cat.codes.filter((code) => {
        const defn = CANONICAL_NUTRIENTS.find((n) => n.code === code);
        if (!defn) return false;
        if (!q) return true;
        return (
          defn.namePtBr.toLowerCase().includes(q) ||
          defn.code.toLowerCase().includes(q)
        );
      });
      return {
        ...cat,
        codes: matchedCodes,
      };
    }).filter((g) => g.codes.length > 0);
  }, [activeCategory, searchFilter]);

  const content = (
    <div className="space-y-4">
      {/* Category Tabs & Quick Search */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveCategory("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[32px] ${
              activeCategory === "ALL"
                ? "bg-[var(--brand)] text-white shadow-2xs"
                : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]"
            }`}
          >
            Todos (23)
          </button>
          {CATEGORY_DEFINITIONS.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[32px] ${
                activeCategory === cat.key
                  ? "bg-[var(--brand)] text-white shadow-2xs"
                  : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]"
              }`}
            >
              {cat.title} ({cat.codes.length})
            </button>
          ))}
        </div>

        {/* Search input for quick lookup */}
        <div className="relative">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filtrar nutriente (ex: cálcio, ferro, sódio)..."
            className="w-full text-xs px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] placeholder:text-[var(--text-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] transition-colors"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main List */}
      {empty ? (
        <div className="py-8 text-center text-xs text-[var(--text-tertiary)] italic">
          Nenhum alimento adicionado ao plano para análise de micronutrientes.
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="py-6 text-center text-xs text-[var(--text-tertiary)] italic">
          Nenhum nutriente encontrado para a busca &ldquo;{searchFilter}&rdquo;.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <div key={group.key} className="space-y-1.5">
              <div className="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">
                  {group.title}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  {group.description}
                </span>
              </div>
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
                {group.codes.map((code) => {
                  const detail = nutrients[code] || {
                    code,
                    namePtBr: CANONICAL_NUTRIENTS.find((n) => n.code === code)?.namePtBr || code,
                    unit: CANONICAL_NUTRIENTS.find((n) => n.code === code)?.unit || "",
                    category: CANONICAL_NUTRIENTS.find((n) => n.code === code)?.category || "OTHER",
                    value: 0,
                    quantifiedItemCount: 0,
                    traceItemCount: 0,
                    unknownItemCount: totals?.totalItemsCount || 0,
                    totalItemCount: totals?.totalItemsCount || 0,
                    isFullyQuantified: false,
                    hasTrace: false,
                    hasUnknown: true,
                    empty,
                    dataCompletenessPercent: 0,
                  };
                  return <NutrientRow key={code} detail={detail} />;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footnote */}
      <div className="pt-2 text-[10px] text-[var(--text-tertiary)] leading-relaxed border-t border-[var(--border-subtle)]">
        <span>
          ℹ️ <strong>Valores calculados:</strong> Proporcionais à quantidade prescrita e fontes oficiais (TACO, USDA, IBGE). Nutrientes marcados com &ldquo;—&rdquo; não possuem dados informados na fonte.
        </span>
      </div>
    </div>
  );

  // If Drawer Mode: render modal/slide-over overlay
  if (isDrawer) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        {/* Slide-over panel */}
        <div className="relative w-full max-w-md bg-[var(--surface)] shadow-2xl border-l border-[var(--border-default)] flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[var(--border-default)] flex items-center justify-between gap-3 bg-[var(--surface)]">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider block">
                Composição Nutricional
              </span>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                {title}
              </h3>
              {!empty && (
                <p className="text-xs text-[var(--text-secondary)]">
                  {quantifiedNutrientsCount} de 23 micronutrientes com dados disponíveis no plano.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              title="Fechar painel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            {content}
          </div>
        </div>
      </div>
    );
  }

  // Standard Inline Collapsible Panel
  return (
    <div
      className={`rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-4 sm:p-5 shadow-xs space-y-3 depth-surface ${className}`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider block">
            Composição Nutricional
          </span>
          <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] tracking-tight">
            {title}
          </h3>
          {!empty && (
            <p className="text-[11px] text-[var(--text-secondary)]">
              {quantifiedNutrientsCount} de 23 micronutrientes com dados no plano.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] transition-colors shadow-2xs cursor-pointer min-h-[34px]"
        >
          <span>{isOpen ? "Recolher" : "Ver micronutrientes"}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="pt-2 border-t border-[var(--border-subtle)]">
          {content}
        </div>
      )}
    </div>
  );
}
