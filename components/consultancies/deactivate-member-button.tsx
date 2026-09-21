"use client";

import React, { useState, useTransition, useEffect } from "react";
import { deactivateMemberAction } from "@/app/consultoria/[slug]/membros/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface DeactivateMemberButtonProps {
  slug: string;
  memberPublicId: string;
  memberName: string;
}

export function DeactivateMemberButton({
  slug,
  memberPublicId,
  memberName,
}: DeactivateMemberButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isPending) {
        setIsOpen(false);
        setError(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending]);

  function handleOpen() {
    setError(null);
    setIsOpen(true);
  }

  function handleClose() {
    if (isPending) return;
    setError(null);
    setIsOpen(false);
  }

  function handleConfirm() {
    if (isPending) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await deactivateMemberAction(slug, memberPublicId);
        if (!res.success) {
          setError(res.error || "Não foi possível desligar o membro.");
          return;
        }
        setIsOpen(false);
      } catch {
        setError("Erro inesperado ao processar o desligamento. Tente novamente.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:text-white hover:bg-[var(--danger)] border border-[var(--danger-soft-border)] hover:border-[var(--danger)] rounded-xl transition-colors shadow-2xs focus-visible:outline-[var(--danger)] min-h-[36px] cursor-pointer select-none"
      >
        Desligar da consultoria
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-dialog-title"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3
                id="deactivate-dialog-title"
                className="text-base font-bold text-[var(--text-primary)] tracking-tight"
              >
                Desligar membro?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-[var(--text-primary)] font-semibold">
                  {memberName}
                </strong>{" "}
                perderá o acesso à consultoria e aos recursos vinculados a este
                vínculo. O histórico existente será preservado.
              </p>
            </div>

            {error && (
              <Alert variant="danger" title="Não foi possível desligar">
                <p className="text-xs">{error}</p>
              </Alert>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirm}
                isLoading={isPending}
                disabled={isPending}
              >
                {isPending ? "Desligando..." : "Desligar membro"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
