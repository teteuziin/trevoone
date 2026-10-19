"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DuotoneStudentsIcon,
  DuotoneNutritionIcon,
  DuotoneFormsIcon,
} from "@/components/ui/icons/duotone-icons";
import { NutritionAiImportModal } from "@/components/consultancies/nutrition-v2/nutrition-ai-import-modal";
import {
  NutritionPlanChoiceModal,
  type NutritionPlanCreationChoice,
} from "@/components/consultancies/nutrition-v2/nutrition-plan-choice-modal";
import { NutritionAiGenerateModal } from "@/components/consultancies/nutrition-v2/nutrition-ai-generate-modal";
import { NutritionTemplatePickerModal } from "@/components/consultancies/nutrition-v2/nutrition-template-picker-modal";

export interface NutritionOverviewHeaderProps {
  consultancySlug: string;
  totalStudents?: number | null;
  activePlansCount?: number | null;
  draftPlansCount?: number | null;
}

function DocumentUploadIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

export function NutritionOverviewHeader({
  consultancySlug,
  totalStudents,
  activePlansCount,
  draftPlansCount,
}: NutritionOverviewHeaderProps) {
  const displayStudents =
    totalStudents !== undefined && totalStudents !== null ? totalStudents : "—";
  const displayActivePlans =
    activePlansCount !== undefined && activePlansCount !== null ? activePlansCount : "—";
  const displayDraftPlans =
    draftPlansCount !== undefined && draftPlansCount !== null ? draftPlansCount : "—";

  const router = useRouter();
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isGenerateAiOpen, setIsGenerateAiOpen] = useState(false);
  const [isImportAiOpen, setIsImportAiOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  const handleSelectChoice = (choice: NutritionPlanCreationChoice) => {
    setIsChoiceModalOpen(false);
    if (choice === "manual") {
      router.push(`/consultoria/${consultancySlug}/planos-v2/novo`);
    } else if (choice === "ai-scratch") {
      setIsGenerateAiOpen(true);
    } else if (choice === "ai-import") {
      setIsImportAiOpen(true);
    } else if (choice === "template") {
      setIsTemplatePickerOpen(true);
    }
  };

  return (
    <header className="w-full">
      {/* 1. Header Card Sólido Executivo com Indicadores Integrados Compactos */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" aria-hidden="true" />
              <span className="text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
                Nutricionista · Painel de Atendimento
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Visão geral da nutrição
            </h1>
          </div>

          {/* Ações Desktop & Mobile com alinhamento preciso e sem quebra */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsImportAiOpen(true)}
              className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 active:translate-y-[1px] transition-colors cursor-pointer select-none shadow-sm whitespace-nowrap"
            >
              <DocumentUploadIcon className="w-4 h-4 text-[#8E95A2] shrink-0" />
              <span>Importar plano</span>
            </button>

            {/* + Novo plano (Ação primária de novo plano - sem duplicar o ícone + com o texto) */}
            <button
              type="button"
              onClick={() => setIsChoiceModalOpen(true)}
              className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center gap-2 shadow-sm active:translate-y-[1px] transition-colors cursor-pointer select-none whitespace-nowrap"
            >
              <PlusIcon className="w-4 h-4 stroke-[3] shrink-0" />
              <span>Novo plano</span>
            </button>
          </div>
        </div>

        {/* Linha de Indicadores Compactos Integrados (3 colunas uniformes) */}
        <div className="mt-5 pt-4 border-t border-[#303238] grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* 1. Pacientes ativos */}
          <Link
            href={`/consultoria/${consultancySlug}/planos-v2/prontuario`}
            prefetch={false}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B1D21] transition-colors group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] group-hover:border-blue-500/50 flex items-center justify-center shrink-0">
              <DuotoneStudentsIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white group-hover:text-blue-400 transition-colors font-mono tabular-nums">
                  {displayStudents}
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">pacientes ativos</span>
              </div>
              <span className="text-[11px] text-blue-400 group-hover:underline block truncate font-medium">
                Ver pacientes →
              </span>
            </div>
          </Link>

          {/* 2. Planos ativos */}
          <Link
            href={`/consultoria/${consultancySlug}/planos-v2`}
            prefetch={false}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B1D21] transition-colors group cursor-pointer sm:border-l sm:border-[#303238]/60 sm:pl-4"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] group-hover:border-emerald-500/50 flex items-center justify-center shrink-0">
              <DuotoneNutritionIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white group-hover:text-emerald-400 transition-colors font-mono tabular-nums">
                  {displayActivePlans}
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">planos ativos</span>
              </div>
              <span className="text-[11px] text-emerald-400 group-hover:underline block truncate font-medium">
                Ver planos →
              </span>
            </div>
          </Link>

          {/* 3. Planos com rascunho */}
          <Link
            href={`/consultoria/${consultancySlug}/planos-v2`}
            prefetch={false}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1B1D21] transition-colors group cursor-pointer sm:border-l sm:border-[#303238]/60 sm:pl-4"
          >
            <div className="w-9 h-9 rounded-lg bg-[#1B1D21] border border-[#303238] group-hover:border-amber-500/50 flex items-center justify-center shrink-0">
              <DuotoneFormsIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-white group-hover:text-amber-400 transition-colors font-mono tabular-nums">
                  {displayDraftPlans}
                </span>
                <span className="text-xs text-[#8E95A2] font-medium truncate">planos com rascunho</span>
              </div>
              <span className="text-[11px] text-amber-400 group-hover:underline block truncate font-medium">
                Ver rascunhos →
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* 1. Modal Seletor de Opções (Como deseja criar o plano?) */}
      <NutritionPlanChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelectOption={handleSelectChoice}
      />

      {/* 2. Modal Criar do Zero com IA */}
      <NutritionAiGenerateModal
        consultancySlug={consultancySlug}
        isOpen={isGenerateAiOpen}
        onClose={() => setIsGenerateAiOpen(false)}
      />

      {/* 3. Modal Importar com IA (também acionado diretamente pelo botão 'Importar plano') */}
      {isImportAiOpen && (
        <NutritionAiImportModal
          consultancySlug={consultancySlug}
          isOpenControlled={isImportAiOpen}
          onCloseControlled={() => setIsImportAiOpen(false)}
          hideTrigger={true}
        />
      )}

      {/* 4. Modal Usar Modelo */}
      <NutritionTemplatePickerModal
        consultancySlug={consultancySlug}
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
      />
    </header>
  );
}
