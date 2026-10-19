"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { NutritionAiImportModal } from "./nutrition-ai-import-modal";
import {
  NutritionPlanChoiceModal,
  type NutritionPlanCreationChoice,
} from "./nutrition-plan-choice-modal";
import { NutritionAiGenerateModal } from "./nutrition-ai-generate-modal";
import { NutritionTemplatePickerModal } from "./nutrition-template-picker-modal";

interface NutritionPlanCreationSheetProps {
  consultancySlug: string;
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14m-7-7h14" />
    </svg>
  );
}

export function NutritionPlanCreationSheet({ consultancySlug }: NutritionPlanCreationSheetProps) {
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
    <>
      {/* Desktop view: Importar plano (atalho) + Novo plano (abre seletor de 4 opções) */}
      <div className="hidden sm:flex items-center gap-2.5 shrink-0">
        <NutritionAiImportModal consultancySlug={consultancySlug} />
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsChoiceModalOpen(true)}
          className="font-bold min-h-[44px] shadow-sm cursor-pointer"
        >
          <PlusIcon className="w-4 h-4 mr-1.5" />
          <span>Novo plano</span>
        </Button>
      </div>

      {/* Mobile view: single prominent CTA opening unified 4-options modal */}
      <div className="sm:hidden w-full">
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsChoiceModalOpen(true)}
          className="font-bold min-h-[48px] w-full shadow-sm flex items-center justify-center gap-2 text-sm cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Novo plano</span>
        </Button>
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

      {/* 3. Modal Importar com IA */}
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
    </>
  );
}
