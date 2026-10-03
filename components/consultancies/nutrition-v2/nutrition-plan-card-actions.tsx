"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileActionSheet, type ActionSheetOption } from "@/components/ui/mobile";

export interface NutritionPlanCardActionsProps {
  consultancySlug: string;
  planPublicId: string;
  planTitle: string;
  isDraft: boolean;
  assignedStudentName?: string | null;
}

function MoreVerticalIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function EditIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function PdfIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function LinkIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

export function NutritionPlanCardActions({
  consultancySlug,
  planPublicId,
  planTitle,
  isDraft,
}: NutritionPlanCardActionsProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const options: ActionSheetOption[] = [
    {
      id: "open",
      label: isDraft ? "Abrir editor do plano" : "Visualizar / Editar plano",
      icon: <EditIcon className="w-4 h-4 text-[var(--brand)]" />,
      onClick: () => {
        router.push(`/consultoria/${consultancySlug}/planos-v2/${planPublicId}`);
      },
    },
    {
      id: "pdf",
      label: "Baixar plano em PDF",
      icon: <PdfIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      onClick: () => {
        window.open(`/api/consultancies/${consultancySlug}/nutricao/pdf?planPublicId=${planPublicId}`, "_blank");
      },
    },
    {
      id: "copy-link",
      label: "Copiar link do editor",
      icon: <LinkIcon className="w-4 h-4 text-[var(--text-secondary)]" />,
      onClick: async () => {
        const url = `${window.location.origin}/consultoria/${consultancySlug}/planos-v2/${planPublicId}`;
        try {
          await navigator.clipboard.writeText(url);
          alert("Link copiado para a área de transferência!");
        } catch {
          // ignore clipboard errors
        }
      },
    },
  ];

  return (
    <>
      <button
        type="button"
        aria-label={`Mais opções para ${planTitle}`}
        onClick={() => setIsOpen(true)}
        className="min-h-[44px] min-w-[44px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
      >
        <MoreVerticalIcon className="w-4 h-4" />
      </button>

      <MobileActionSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={planTitle}
        options={options}
      />
    </>
  );
}
