"use client";

import React, { useState } from "react";
import type {
  MicronutrientTotalsSummary,
  MicronutrientTotalDetail,
} from "@/lib/nutrition-v2/nutrient-calculator";
import { CANONICAL_NUTRIENTS } from "@/lib/nutrition-v2/micronutrients";

interface NutritionMicronutrientsPanelProps {
  totals?: MicronutrientTotalsSummary | null;
  title?: string;
  defaultCollapsed?: boolean;
  className?: string;
}

const CATEGORY_DEFINITIONS = [
  {
    key: "FIBER",
    title: "Fibra",
    description: "Componente de fibra alimentar",
    codes: ["FIBER"],
  },
  {
    key: "MINERAL",
    title: "Minerais",
    description: "Macrominerais e microminerais essenciais",
    codes: ["CA", "FE", "MG", "P", "K", "NA", "ZN", "CU", "MN", "SE"],
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
] as const;

function formatNutrientValue(value: number): string {
  if (value === 0) return "0";
  // Format with pt-BR decimal separator, maximum 2 decimal places
  return Number(value.toFixed(2)).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function NutrientItemCard({ detail }: { detail: MicronutrientTotalDetail }) {
  const {
    namePtBr,
    unit,
    value,
    quantifiedItemCount,
    traceItemCount,
    unknownItemCount,
    totalItemCount,
    isFullyQuantified,
    hasTrace,
    hasUnknown,
    empty,
    dataCompletenessPercent,
  } = detail;

  if (empty) {
    return (
      <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)]/40 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">{namePtBr}</span>
        <span className="text-xs text-[var(--text-tertiary)] italic">Nenhum alimento</span>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--brand)]/30 transition-colors shadow-2xs space-y-2">
      {/* Name and Coverage Badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[var(--text-primary)] truncate" title={namePtBr}>
          {namePtBr}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
            isFullyQuantified
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              : dataCompletenessPercent > 0
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
              : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
          }`}
          title={`${quantifiedItemCount} de ${totalItemCount} alimentos com dado quantificado (${dataCompletenessPercent}%). Não representa adequação clínica.`}
        >
          {dataCompletenessPercent}% cobertura
        </span>
      </div>

      {/* Main Quantitative Value */}
      <div className="flex items-baseline gap-1.5 flex-wrap">
        {quantifiedItemCount === 0 && !hasTrace ? (
          <span className="text-sm font-semibold text-[var(--text-tertiary)] italic">
            Não disponível
          </span>
        ) : quantifiedItemCount === 0 && hasTrace ? (
          <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
            Traços
          </span>
        ) : (
          <>
            <span className="text-lg font-extrabold text-[var(--text-primary)]">
              {formatNutrientValue(value)}
            </span>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">{unit}</span>
            {hasTrace && (
              <span
                className="text-[11px] font-medium text-sky-600 dark:text-sky-400 ml-1"
                title={`${traceItemCount} alimento(s) com concentração em nível de traço (< LOQ)`}
              >
                + traços (${traceItemCount})
              </span>
            )}
            {hasUnknown && (
              <span
                className="text-amber-500 font-bold ml-0.5 cursor-help"
                title={`${unknownItemCount} alimento(s) sem dado quantificado nesta fonte`}
              >
                *
              </span>
            )}
          </>
        )}
      </div>

      {/* Descriptive Coverage Text */}
      <div className="text-[11px] text-[var(--text-tertiary)] flex items-center justify-between gap-1 pt-0.5">
        <span>
          {quantifiedItemCount === 0
            ? "Sem dados quantificados disponíveis"
            : `${quantifiedItemCount} de ${totalItemCount} ${totalItemCount === 1 ? "alimento" : "alimentos"} com valor quantificado`}
        </span>
      </div>

      {/* Descriptive Note for Incomplete Data */}
      {hasUnknown && (
        <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-tight">
          * {unknownItemCount} {unknownItemCount === 1 ? "alimento sem informação disponível" : "alimentos sem informação disponível"}
        </p>
      )}
    </div>
  );
}

export function NutritionMicronutrientsPanel({
  totals,
  title = "Análise de micronutrientes",
  defaultCollapsed = false,
  className = "",
}: NutritionMicronutrientsPanelProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  if (!totals) {
    return null;
  }

  const { empty, nutrients } = totals;

  const totalNutrientCount = CANONICAL_NUTRIENTS.length; // 23
  let fullyQuantifiedCount = 0;
  if (!empty && nutrients) {
    for (const defn of CANONICAL_NUTRIENTS) {
      if (nutrients[defn.code]?.isFullyQuantified) {
        fullyQuantifiedCount++;
      }
    }
  }

  return (
    <div
      className={`rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-4 sm:p-5 shadow-xs space-y-4 depth-surface ${className}`}
    >
      {/* Header and Toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
              Composição Nutricional
            </span>
            <span
              className="text-xs text-[var(--text-tertiary)] cursor-help"
              title="Indica quantos alimentos possuem valor quantificado para este nutriente. Não representa adequação clínica."
            >
              ℹ️
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
            {title}
          </h3>
          {!empty ? (
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              Cobertura de dados: {fullyQuantifiedCount} de {totalNutrientCount} micronutrientes totalmente quantificados no plano.
            </p>
          ) : (
            <p className="text-xs text-[var(--text-tertiary)]">Nenhum alimento adicionado.</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] transition-colors shadow-2xs cursor-pointer min-h-[36px]"
        >
          <span>{isOpen ? "Recolher" : "Visualizar 23 micronutrientes"}</span>
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

      {/* Collapsible Content */}
      {isOpen && (
        <div className="space-y-4 pt-2 border-t border-[var(--border-subtle)]">
          {empty ? (
            <div className="py-6 text-center text-xs text-[var(--text-tertiary)] italic">
              Nenhum alimento adicionado para análise descritiva de micronutrientes.
            </div>
          ) : (
            <>
              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveCategory("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[34px] ${
                    activeCategory === "ALL"
                      ? "bg-[var(--brand)] text-white shadow-2xs"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]"
                  }`}
                >
                  Todos ({totalNutrientCount})
                </button>
                {CATEGORY_DEFINITIONS.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(cat.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[34px] ${
                      activeCategory === cat.key
                        ? "bg-[var(--brand)] text-white shadow-2xs"
                        : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]"
                    }`}
                  >
                    {cat.title} ({cat.codes.length})
                  </button>
                ))}
              </div>

              {/* Informative Disclaimer on Data Completeness */}
              <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
                <svg
                  className="w-4 h-4 text-[var(--brand)] shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  <strong>Completude dos dados:</strong> Indica quantos alimentos possuem valor quantificado para cada nutriente na biblioteca analítica. Valores são descritivos e não constituem metas ou diagnóstico clínico.
                </span>
              </div>

              {/* Render Groups */}
              <div className="space-y-5">
                {CATEGORY_DEFINITIONS.filter(
                  (cat) => activeCategory === "ALL" || activeCategory === cat.key
                ).map((cat) => (
                  <div key={cat.key} className="space-y-2.5">
                    <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-1.5">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                        {cat.title}
                      </h4>
                      <span className="text-[11px] text-[var(--text-tertiary)]">{cat.description}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {cat.codes.map((code) => {
                        const detail = nutrients?.[code];
                        if (!detail) return null;
                        return <NutrientItemCard key={code} detail={detail} />;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
