"use client";

import React, { useState } from "react";
import type { WorkoutBlockType } from "@/lib/training-v2/types";

type MethodOption = {
  type: WorkoutBlockType;
  label: string;
  badge: string;
  category: "CLASSIC" | "INTENSITY" | "CONDITIONING" | "CUSTOM";
  categoryLabel: string;
  description: string;
  cardinalityText: string;
  accentColor: {
    bg: string;
    border: string;
    text: string;
    iconBg: string;
  };
};

const METHODS: MethodOption[] = [
  {
    type: "SINGLE",
    label: "Série Simples",
    badge: "Tradicional",
    category: "CLASSIC",
    categoryLabel: "Clássicos",
    description: "Exercício individual com controle padrão de séries, repetições, carga e intervalo.",
    cardinalityText: "1 exercício isolado",
    accentColor: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25",
      text: "text-emerald-700 dark:text-emerald-400",
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
  },
  {
    type: "BI_SET",
    label: "Bi-Set",
    badge: "2 Exercícios",
    category: "CLASSIC",
    categoryLabel: "Clássicos",
    description: "2 exercícios executados em sequência contínua sem intervalo intermediário.",
    cardinalityText: "2 exercícios sem pausa",
    accentColor: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/25",
      text: "text-indigo-700 dark:text-indigo-400",
      iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    },
  },
  {
    type: "TRI_SET",
    label: "Tri-Set",
    badge: "3 Exercícios",
    category: "CLASSIC",
    categoryLabel: "Clássicos",
    description: "3 exercícios consecutivos focados na mesma ou em diferentes cadeias musculares.",
    cardinalityText: "3 exercícios consecutivos",
    accentColor: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/25",
      text: "text-purple-700 dark:text-purple-400",
      iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    },
  },
  {
    type: "SUPER_SET",
    label: "Super-Set",
    badge: "Antagonista",
    category: "CLASSIC",
    categoryLabel: "Clássicos",
    description: "2 exercícios pareados (agonista/antagonista) executados sem descanso entre eles.",
    cardinalityText: "2 exercícios pareados",
    accentColor: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/25",
      text: "text-cyan-700 dark:text-cyan-400",
      iconBg: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    },
  },
  {
    type: "COMBINED_SET",
    label: "Série Combinada",
    badge: "Multi-Exercícios",
    category: "CLASSIC",
    categoryLabel: "Clássicos",
    description: "2 ou mais exercícios combinados e executados em fluxo contínuo na mesma estação.",
    cardinalityText: "2+ exercícios combinados",
    accentColor: {
      bg: "bg-teal-500/10",
      border: "border-teal-500/25",
      text: "text-teal-700 dark:text-teal-400",
      iconBg: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    },
  },
  {
    type: "DROP_SET",
    label: "Drop-Set",
    badge: "Redução de Carga",
    category: "INTENSITY",
    categoryLabel: "Intensidade",
    description: "Série até a falha com reduções sucessivas imediatas de carga sem intervalo.",
    cardinalityText: "1 exercício + drops",
    accentColor: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
      text: "text-amber-700 dark:text-amber-400",
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
  },
  {
    type: "REST_PAUSE",
    label: "Rest-Pause",
    badge: "Intra-Pausa",
    category: "INTENSITY",
    categoryLabel: "Intensidade",
    description: "Série até a falha muscular com micro-pausas (10 a 20s) e re-ativações imediatas.",
    cardinalityText: "Falha + micro-pausas",
    accentColor: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/25",
      text: "text-rose-700 dark:text-rose-400",
      iconBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    },
  },
  {
    type: "CIRCUIT",
    label: "Circuito",
    badge: "Estações",
    category: "CONDITIONING",
    categoryLabel: "Condicionamento",
    description: "Sequência dinâmica de estações com controle estruturado de voltas e descansos.",
    cardinalityText: "2+ estações por voltas",
    accentColor: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25",
      text: "text-emerald-700 dark:text-emerald-400",
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
  },
  {
    type: "CARDIO",
    label: "Cardio / Aeróbio",
    badge: "Metabólico",
    category: "CONDITIONING",
    categoryLabel: "Condicionamento",
    description: "Prescrição aeróbia estruturada por tempo, distância, velocidade, pace, inclinação ou FC.",
    cardinalityText: "Metabólico / cardiovascular",
    accentColor: {
      bg: "bg-red-500/10",
      border: "border-red-500/25",
      text: "text-red-700 dark:text-red-400",
      iconBg: "bg-red-500/15 text-red-600 dark:text-red-400",
    },
  },
  {
    type: "WARMUP",
    label: "Aquecimento",
    badge: "Mobilidade & Ativação",
    category: "CONDITIONING",
    categoryLabel: "Condicionamento",
    description: "Mobilidade articular, ativação neuromuscular, manguito ou aquecimento específico.",
    cardinalityText: "1 ou mais exercícios",
    accentColor: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
      text: "text-amber-700 dark:text-amber-400",
      iconBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
  },
  {
    type: "CUSTOM",
    label: "Personalizado",
    badge: "Estrutura Livre",
    category: "CUSTOM",
    categoryLabel: "Livre",
    description: "Estrutura metodológica modular com campos e anotações flexíveis.",
    cardinalityText: "Configuração aberta",
    accentColor: {
      bg: "bg-zinc-500/10",
      border: "border-zinc-500/25",
      text: "text-zinc-700 dark:text-zinc-300",
      iconBg: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
    },
  },
];

function MethodIcon({ type }: { type: WorkoutBlockType }) {
  switch (type) {
    case "SINGLE":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />
        </svg>
      );
    case "BI_SET":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <circle cx="7" cy="12" r="3" />
          <circle cx="17" cy="12" r="3" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 12h4M12.5 10.5L14 12l-1.5 1.5" />
        </svg>
      );
    case "TRI_SET":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <circle cx="5" cy="12" r="2.5" />
          <circle cx="12" cy="12" r="2.5" />
          <circle cx="19" cy="12" r="2.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12h2M14.5 12h2" />
        </svg>
      );
    case "SUPER_SET":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h12m0 0l-3-3m3 3l-3 3M20 16H8m0 0l3-3m-3 3l3 3" />
        </svg>
      );
    case "COMBINED_SET":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
        </svg>
      );
    case "DROP_SET":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h4v4h4v4h4v4h6" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 14l3 3 3-3" />
        </svg>
      );
    case "REST_PAUSE":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <circle cx="12" cy="13" r="8" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4l2.5 1.5M10 2h4M12 2v3" />
        </svg>
      );
    case "CIRCUIT":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 0114.93-4M20 12a8 8 0 01-14.93 4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 4v4h-4M5 20v-4h4" />
        </svg>
      );
    case "CARDIO":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2.5-6 4 12 2.5-6h5" />
        </svg>
      );
    case "WARMUP":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-1.5 2.5-4 5-4 8a6 6 0 0012 0c0-3-2-5.5-3.5-7-.5 2-1.5 3-2.5 3s-1.5-1.5-2-4z" />
        </svg>
      );
    case "CUSTOM":
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
      );
  }
}

type WorkoutMethodSelectorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectMethod: (method: WorkoutBlockType) => void;
  isSubmitting?: boolean;
};

export function WorkoutMethodSelectorModal({
  isOpen,
  onClose,
  onSelectMethod,
  isSubmitting = false,
}: WorkoutMethodSelectorModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  if (!isOpen) return null;

  const filteredMethods =
    selectedCategory === "ALL"
      ? METHODS
      : METHODS.filter((m) => m.category === selectedCategory);

  const categories = [
    { id: "ALL", label: "Todos os 11 Métodos", count: 11 },
    { id: "CLASSIC", label: "Clássicos & Séries", count: 5 },
    { id: "INTENSITY", label: "Alta Intensidade", count: 2 },
    { id: "CONDITIONING", label: "Circuito & Cardio", count: 3 },
    { id: "CUSTOM", label: "Estrutura Livre", count: 1 },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-methodology-title"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[var(--surface)] text-[var(--text-primary)] rounded-3xl shadow-2xl border border-[var(--border-default)] flex flex-col overflow-hidden transition-all border-specular-t">
        {/* Header Premium */}
        <div className="px-5 sm:px-7 py-5 sm:py-6 border-b border-[var(--border-subtle)] bg-[var(--surface)] flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--brand-foreground)] bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] px-2.5 py-0.5 rounded-full shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse" />
                Metodologia de Treino
              </span>
            </div>
            <h2
              id="modal-methodology-title"
              className="text-lg sm:text-2xl font-bold font-heading tracking-tight text-[var(--text-primary)]"
            >
              Adicionar Bloco de Exercícios
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
              Selecione a estrutura metodológica para organizar as séries, repetições e dinâmica deste bloco da rotina.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Fechar modal"
            className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-all min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] depth-interactive cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category Segmented Controls / Chips */}
        <div className="px-5 sm:px-7 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/70 flex items-center gap-2 overflow-x-auto no-scrollbar select-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] cursor-pointer ${
                  isActive
                    ? "bg-[var(--brand)] text-white shadow-xs"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)]"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? "bg-white/20 text-white" : "bg-[var(--surface-sunken)] text-[var(--text-tertiary)]"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Methods Grid Body */}
        <div className="p-4 sm:p-6 lg:p-7 overflow-y-auto space-y-3 flex-1 max-h-[58vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {filteredMethods.map((m) => (
              <button
                key={m.type}
                type="button"
                onClick={() => onSelectMethod(m.type)}
                disabled={isSubmitting}
                className="text-left p-4 sm:p-4.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] hover:border-[var(--brand)] hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.99] transition-all group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] depth-interactive cursor-pointer"
              >
                <div>
                  {/* Top card row: Icon + Name + Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${m.accentColor.iconBg}`}
                      >
                        <MethodIcon type={m.type} />
                      </div>
                      <div className="min-w-0">
                        <span className="font-heading font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors block truncate">
                          {m.label}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)] block">
                          {m.categoryLabel}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${m.accentColor.bg} ${m.accentColor.border} ${m.accentColor.text}`}
                    >
                      {m.badge}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed font-normal">
                    {m.description}
                  </p>
                </div>

                {/* Bottom card row: Cardinality + CTA */}
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] font-medium text-[var(--text-tertiary)] flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] opacity-50" />
                    {m.cardinalityText}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--brand-foreground)] bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] group-hover:bg-[var(--brand)] group-hover:text-white transition-all shadow-2xs shrink-0">
                    <span>Criar bloco</span>
                    <svg
                      className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Refinado */}
        <div className="px-5 sm:px-7 py-4 border-t border-[var(--border-default)] bg-[var(--surface-subtle)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] text-center sm:text-left">
            <svg
              className="w-4 h-4 shrink-0 text-[var(--brand)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <span>Você poderá selecionar os exercícios, cargas e repetições na etapa seguinte.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-all min-h-[40px] shadow-2xs depth-interactive cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
