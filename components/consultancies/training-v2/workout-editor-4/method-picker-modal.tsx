"use client";

import React, { useState } from "react";
import type { WorkoutCombinationType, ExerciseItemDto } from "@/lib/training-v2/types";
import { AddItemModal } from "./add-item-modal";

interface MethodPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseItemName: string;
  consultancySlug: string;
  blockPublicId: string;
  onSelectMethodAndSecondExercise: (
    methodType: WorkoutCombinationType,
    secondExercise: ExerciseItemDto
  ) => Promise<void>;
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function MethodPickerModal({
  isOpen,
  onClose,
  baseItemName,
  consultancySlug,
  blockPublicId,
  onSelectMethodAndSecondExercise,
}: MethodPickerModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<WorkoutCombinationType | null>(null);
  const [isChoosingSecond, setIsChoosingSecond] = useState(false);

  if (!isOpen) return null;

  const methods: Array<{
    type: WorkoutCombinationType;
    title: string;
    description: string;
    badgeColor: string;
    icon: string;
  }> = [
    {
      type: "BI_SET",
      title: "Bi-set",
      description: "2 exercícios executados em sequência para o mesmo grupo, sem descanso intermediário.",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      icon: "⚡",
    },
    {
      type: "SUPERSET",
      title: "Supersérie",
      description: "2 exercícios combinados, normalmente para grupos musculares agonista e antagonista.",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      icon: "⚡",
    },
    {
      type: "TRI_SET",
      title: "Tri-set",
      description: "3 exercícios em sequência contínua para exaustão e estímulo metabólico intensificado.",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      icon: "🔥",
    },
    {
      type: "CIRCUIT",
      title: "Circuito",
      description: "Sequência de estações com transição rápida e descanso somente ao final da rodada.",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      icon: "🔄",
    },
  ];

  const handleSelectMethodType = (type: WorkoutCombinationType) => {
    setSelectedMethod(type);
    setIsChoosingSecond(true);
  };

  const handleSecondExerciseSelected = async (ex: ExerciseItemDto) => {
    if (!selectedMethod) return;
    await onSelectMethodAndSecondExercise(selectedMethod, ex);
    setIsChoosingSecond(false);
    setSelectedMethod(null);
    onClose();
  };

  if (isChoosingSecond && selectedMethod) {
    const methodObj = methods.find((m) => m.type === selectedMethod);
    return (
      <AddItemModal
        isOpen={true}
        onClose={() => {
          setIsChoosingSecond(false);
          setSelectedMethod(null);
          onClose();
        }}
        consultancySlug={consultancySlug}
        blockPublicId={blockPublicId}
        onSelectExercise={handleSecondExerciseSelected}
        onCreateMethod={async () => {}}
        title={`Escolha o 2º exercício do ${methodObj?.title || "Método"}`}
        subtitle={`1º exercício: ${baseItemName}`}
      />
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Criar método com este exercício"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-black text-[#102E23] leading-tight">
              Criar método com este exercício
            </h2>
            <p className="text-xs text-[#526058] mt-0.5 truncate">
              Exercício 1: <strong className="text-[#176B49]">{baseItemName}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Method Cards */}
        <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto">
          {methods.map((method) => (
            <div
              key={method.type}
              onClick={() => handleSelectMethodType(method.type)}
              className="p-3.5 sm:p-4 rounded-2xl border border-[#E5E8E2] hover:border-[#176B49] bg-white hover:bg-[#F3F7F4] transition-all cursor-pointer group shadow-2xs hover:shadow-xs space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider border shadow-2xs ${method.badgeColor}`}>
                    {method.icon} {method.title}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#176B49] group-hover:translate-x-0.5 transition-transform">
                  Continuar →
                </span>
              </div>
              <p className="text-xs text-[#526058] leading-relaxed">
                {method.description}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E8E2] bg-[#FAFBF9] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
