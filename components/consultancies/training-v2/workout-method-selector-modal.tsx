"use client";

import React, { useState } from "react";
import type { WorkoutBlockType } from "@/lib/training-v2/types";

type MethodOption = {
  type: WorkoutBlockType;
  label: string;
  badge: string;
  badgeColor: string;
  category: "CLASSIC" | "INTENSITY" | "CONDITIONING" | "CUSTOM";
  description: string;
  cardinalityText: string;
};

const METHODS: MethodOption[] = [
  {
    type: "SINGLE",
    label: "Série Simples",
    badge: "Tradicional",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    category: "CLASSIC",
    description: "Exercício individual com controle de séries, repetições e carga.",
    cardinalityText: "1 exercício",
  },
  {
    type: "BI_SET",
    label: "Bi-Set",
    badge: "2 Exercícios",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    category: "CLASSIC",
    description: "2 exercícios executados em sequência sem pausa intermediária.",
    cardinalityText: "Exatamente 2 exercícios",
  },
  {
    type: "TRI_SET",
    label: "Tri-Set",
    badge: "3 Exercícios",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    category: "CLASSIC",
    description: "3 exercícios consecutivos focados na mesma ou em diferentes cadeias musculares.",
    cardinalityText: "Exatamente 3 exercícios",
  },
  {
    type: "SUPER_SET",
    label: "Super-Set",
    badge: "2 Exercícios em Sequência",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    category: "CLASSIC",
    description: "2 exercícios executados em sequência pareada sem intervalo intermediário.",
    cardinalityText: "Exatamente 2 exercícios",
  },
  {
    type: "COMBINED_SET",
    label: "Série Combinada",
    badge: "2+ Exercícios Combinados",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    category: "CLASSIC",
    description: "2 ou mais exercícios combinados e executados em sequência contínua.",
    cardinalityText: "2 ou mais exercícios",
  },
  {
    type: "DROP_SET",
    label: "Drop-Set",
    badge: "Redução de Carga",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    category: "INTENSITY",
    description: "Série até a falha seguida imediatamente por 1 ou mais reduções sucessivas de carga.",
    cardinalityText: "1 exercício principal + drops",
  },
  {
    type: "REST_PAUSE",
    label: "Rest-Pause",
    badge: "Intra-Pausa",
    badgeColor: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    category: "INTENSITY",
    description: "Série até a falha com pausas curtas (10-20s) e mini-séries consecutivas.",
    cardinalityText: "1 exercício + mini-séries",
  },
  {
    type: "CIRCUIT",
    label: "Circuito",
    badge: "Estações por Voltas",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    category: "CONDITIONING",
    description: "Sequência de estações com controle de voltas e descansos entre séries.",
    cardinalityText: "2 ou mais estações",
  },
  {
    type: "CARDIO",
    label: "Cardio / Aeróbio",
    badge: "Metabólico",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
    category: "CONDITIONING",
    description: "Prescrição aeróbia por tempo, distância, velocidade, pace, inclinação ou frequência cardíaca.",
    cardinalityText: "1 exercício metabólico",
  },
  {
    type: "WARMUP",
    label: "Aquecimento",
    badge: "Mobilidade / Ativação",
    badgeColor: "bg-yellow-50 text-yellow-700 border-yellow-200",
    category: "CONDITIONING",
    description: "Mobilidade, ativação neuromuscular, manguito ou aquecimento articular.",
    cardinalityText: "1 ou mais exercícios",
  },
  {
    type: "CUSTOM",
    label: "Personalizado",
    badge: "Estrutura Livre",
    badgeColor: "bg-stone-50 text-stone-700 border-stone-200",
    category: "CUSTOM",
    description: "Estrutura metodológica flexível com instruções e séries abertas.",
    cardinalityText: "1 ou mais exercícios",
  },
];

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

  const filteredMethods = selectedCategory === "ALL"
    ? METHODS
    : METHODS.filter((m) => m.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Metodologia de Treino
            </span>
            <h3 className="text-xl font-bold text-stone-900 mt-1">
              Adicionar Bloco de Exercícios
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Escolha um dos 11 métodos estruturados para este bloco da rotina.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-5 py-2.5 border-b border-stone-100 bg-stone-50/50 flex gap-1.5 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              selectedCategory === "ALL"
                ? "bg-stone-900 text-white font-semibold"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            Todos os 11 Métodos
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("CLASSIC")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              selectedCategory === "CLASSIC"
                ? "bg-stone-900 text-white font-semibold"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            Clássicos & Séries
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("INTENSITY")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              selectedCategory === "INTENSITY"
                ? "bg-stone-900 text-white font-semibold"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            Alta Intensidade
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("CONDITIONING")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              selectedCategory === "CONDITIONING"
                ? "bg-stone-900 text-white font-semibold"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            Circuito & Cardio
          </button>
        </div>

        {/* Methods Grid */}
        <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredMethods.map((m) => (
              <button
                key={m.type}
                type="button"
                onClick={() => onSelectMethod(m.type)}
                disabled={isSubmitting}
                className="text-left p-3.5 rounded-xl border border-stone-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group flex flex-col justify-between shadow-xs hover:shadow-sm active:scale-98"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-stone-900 group-hover:text-emerald-800 text-sm">
                      {m.label}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${m.badgeColor}`}>
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {m.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <span className="font-medium text-stone-500">
                    {m.cardinalityText}
                  </span>
                  <span className="text-emerald-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Criar bloco &rarr;
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Você poderá adicionar os exercícios e ajustar as repetições após criar o bloco.
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
