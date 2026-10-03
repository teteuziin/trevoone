"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileBottomSheet } from "@/components/ui/mobile";
import { NutritionAiImportModal } from "./nutrition-ai-import-modal";

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

function SparklesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z"
      />
    </svg>
  );
}

function DocumentPlusIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export function NutritionPlanCreationSheet({ consultancySlug }: NutritionPlanCreationSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  return (
    <>
      {/* Desktop view: side-by-side action buttons */}
      <div className="hidden sm:flex items-center gap-2.5 shrink-0">
        <NutritionAiImportModal consultancySlug={consultancySlug} />
        <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`} className="shrink-0">
          <Button variant="primary" size="md" className="font-bold min-h-[44px] shadow-sm">
            <PlusIcon className="w-4 h-4 mr-1.5" />
            <span>Criar plano</span>
          </Button>
        </Link>
      </div>

      {/* Mobile view: single prominent CTA opening MobileBottomSheet */}
      <div className="sm:hidden w-full">
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsSheetOpen(true)}
          className="font-bold min-h-[48px] w-full shadow-sm flex items-center justify-center gap-2 text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          <span>+ Novo plano</span>
        </Button>
      </div>

      {/* Mobile Creation Sheet */}
      <MobileBottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Novo Plano Alimentar"
        subtitle="Escolha como deseja iniciar a prescrição"
      >
        <div className="space-y-3 pt-1">
          {/* Option 1: Criar do zero */}
          <Link
            href={`/consultoria/${consultancySlug}/planos-v2/novo`}
            onClick={() => setIsSheetOpen(false)}
            className="w-full p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all flex items-start gap-3.5 text-left group min-h-[72px]"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center shrink-0 border border-[var(--brand)]/20 mt-0.5 group-hover:scale-105 transition-transform">
              <DocumentPlusIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-[var(--text-primary)]">
                Criar do zero
              </h4>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Monte refeições, alimentos, medidas caseiras e substituições manualmente no editor.
              </p>
            </div>
          </Link>

          {/* Option 2: Importar com IA */}
          <button
            type="button"
            onClick={() => {
              setIsSheetOpen(false);
              setIsAiModalOpen(true);
            }}
            className="w-full p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all flex items-start gap-3.5 text-left group min-h-[72px] cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20 mt-0.5 group-hover:scale-105 transition-transform">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-[var(--text-primary)]">
                  Importar com IA
                </h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25">
                  Automático
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Envie um documento (PDF, imagem ou texto) e a IA monta o cardápio e refeições para você.
              </p>
            </div>
          </button>
        </div>
      </MobileBottomSheet>

      {/* Hidden AI modal triggered by mobile sheet */}
      <NutritionAiImportModal
        consultancySlug={consultancySlug}
        isOpenControlled={isAiModalOpen}
        onCloseControlled={() => setIsAiModalOpen(false)}
        hideTrigger
      />
    </>
  );
}
