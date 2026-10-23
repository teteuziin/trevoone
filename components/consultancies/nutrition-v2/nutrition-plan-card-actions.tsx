"use client";

import React, { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MobileActionSheet, type ActionSheetOption } from "@/components/ui/mobile";
import { deletePlanAction } from "@/app/consultoria/[slug]/planos-v2/actions";

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export interface NutritionPlanCardActionsProps {
  consultancySlug: string;
  planPublicId: string;
  planTitle: string;
  isDraft: boolean;
  isTemplate?: boolean;
  assignedStudentName?: string | null;
  activeAssignmentsCount?: number;
  /**
   * "icons" (default): compact trash icon + ⋮ menu, used in the desktop table.
   * "mobile": full-width labeled "Excluir" button + ⋮ menu, used in the
   * smartphone card footer so the delete action is visible without opening
   * the ⋮ menu first.
   */
  variant?: "icons" | "mobile";
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

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="3 6 5 6 21 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function NutritionPlanCardActions({
  consultancySlug,
  planPublicId,
  planTitle,
  isDraft,
  isTemplate = false,
  assignedStudentName,
  activeAssignmentsCount = 0,
  variant = "icons",
}: NutritionPlanCardActionsProps) {
  const router = useRouter();
  const mounted = useIsMounted();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const deleteLabel = isTemplate ? "Excluir modelo" : "Excluir plano";
  const hasActiveAssignment = Boolean(assignedStudentName) || activeAssignmentsCount > 0;

  // Lock body scroll + close on Escape while the confirmation is open
  useEffect(() => {
    if (!isDeleteDialogOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsDeleteDialogOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeleteDialogOpen]);

  const handleConfirmDelete = () => {
    startTransition(async () => {
      const res = await deletePlanAction(consultancySlug, planPublicId);
      if (res.success) {
        setIsDeleteDialogOpen(false);
        router.refresh();
      } else {
        alert(res.error || "Erro ao excluir plano.");
      }
    });
  };

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
    {
      id: "delete",
      label: deleteLabel,
      icon: <TrashIcon className="w-4 h-4 text-rose-500" />,
      variant: "danger",
      disabled: isPending,
      onClick: () => {
        setIsDeleteDialogOpen(true);
      },
    },
  ];

  const actionSheet = (
    <MobileActionSheet
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title={planTitle}
      options={options}
    />
  );

  // Rendered through a portal (same pattern as the other nutrition modals):
  // the desktop table cell applies whitespace-nowrap and layout containment,
  // which made the confirmation text overflow the dialog box when the modal
  // was rendered inline.
  const deleteDialog = isDeleteDialogOpen ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isTemplate ? "Excluir este modelo?" : "Excluir este plano?"}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 whitespace-normal"
      onClick={() => setIsDeleteDialogOpen(false)}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl p-5 space-y-4 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <TrashIcon className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-[var(--text-primary)] break-words">
            {isTemplate ? "Excluir este modelo?" : "Excluir este plano?"}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed break-words">
            O plano <strong className="text-[var(--text-primary)]">&ldquo;{planTitle}&rdquo;</strong>{" "}
            sairá da lista de planos alimentares. Essa ação não pode ser desfeita.
          </p>
          {hasActiveAssignment && (
            <p className="text-xs leading-relaxed break-words rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 px-3 py-2">
              Este plano está vinculado a {assignedStudentName || "um paciente"}. Ao excluir, o
              vínculo será encerrado e o paciente deixará de acessar este plano.
            </p>
          )}
        </div>

        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setIsDeleteDialogOpen(false)}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleConfirmDelete}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {isPending ? "Excluindo..." : deleteLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {variant === "mobile" ? (
        <button
          type="button"
          aria-label={`${deleteLabel}: ${planTitle}`}
          disabled={isPending}
          onClick={() => setIsDeleteDialogOpen(true)}
          className="flex-1 min-h-[48px] px-3 rounded-xl font-bold text-xs bg-rose-50 hover:bg-rose-100 active:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
        >
          <TrashIcon className="w-4 h-4" />
          <span>{isTemplate ? "Excluir" : "Excluir plano"}</span>
        </button>
      ) : (
        <button
          type="button"
          aria-label={`${deleteLabel}: ${planTitle}`}
          title={deleteLabel}
          disabled={isPending}
          onClick={() => setIsDeleteDialogOpen(true)}
          className="hidden sm:flex min-h-[34px] min-w-[34px] rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 active:scale-95 text-rose-600 dark:text-rose-400 items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}

      <button
        type="button"
        aria-label={`Mais opções para ${planTitle}`}
        onClick={() => setIsOpen(true)}
        className={`${
          variant === "mobile" ? "min-h-[48px] min-w-[48px]" : "min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px]"
        } rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer shrink-0`}
      >
        <MoreVerticalIcon className="w-4 h-4" />
      </button>

      {mounted ? createPortal(actionSheet, document.body) : actionSheet}
      {mounted && deleteDialog ? createPortal(deleteDialog, document.body) : null}
    </>
  );
}
