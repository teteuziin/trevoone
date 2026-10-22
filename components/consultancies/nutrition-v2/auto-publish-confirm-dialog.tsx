"use client";

import React from "react";
import { Button } from "@/components/ui/button";

export interface AutoPublishConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  planTitle: string;
  studentName: string;
  isSubmitting?: boolean;
}

export function AutoPublishConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  planTitle,
  studentName,
  isSubmitting = false,
}: AutoPublishConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-publish-dialog-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xl overflow-hidden depth-surface">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-subtle)] flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h2 id="auto-publish-dialog-title" className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Ativar atualização automática do plano
            </h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Mantenha o plano do paciente atualizado sem exigir publicação manual a cada edição.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Identification Box */}
          <div className="p-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-[var(--text-secondary)] font-medium">Plano alimentar:</span>
              <span className="font-bold text-[var(--text-primary)] truncate max-w-[240px]" title={planTitle}>
                {planTitle}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)] font-medium">Paciente vinculado:</span>
              <span className="font-bold text-[var(--brand)] truncate max-w-[240px]" title={studentName}>
                {studentName}
              </span>
            </div>
          </div>

          {/* Guarantees & Operating Details */}
          <div className="space-y-2.5 text-xs text-[var(--text-secondary)]">
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] mt-1.5 shrink-0" aria-hidden="true" />
              <p className="leading-relaxed">
                <strong className="text-[var(--text-primary)] font-semibold">Atualização em segundo plano:</strong>{" "}
                Quando você terminar uma alteração e os dados nutricionais estiverem válidos, o plano de{" "}
                <span className="font-semibold text-[var(--text-primary)]">{studentName}</span> será atualizado automaticamente.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" aria-hidden="true" />
              <p className="leading-relaxed">
                <strong className="text-[var(--text-primary)] font-semibold">Histórico imutável protegido:</strong>{" "}
                Cada atualização gera uma nova revisão numerada oficial. Nenhuma versão já entregue é sobrescrita.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" aria-hidden="true" />
              <p className="leading-relaxed">
                <strong className="text-[var(--text-primary)] font-semibold">Proteção contra dados incompletos:</strong>{" "}
                Se você estiver digitando ou se um alimento estiver sem dados nutricionais, o paciente continua visualizando a versão anterior válida.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" aria-hidden="true" />
              <p className="leading-relaxed">
                <strong className="text-[var(--text-primary)] font-semibold">Pausa e reversão:</strong>{" "}
                Você pode pausar a atualização temporariamente ou retornar para o modo manual a qualquer momento.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[var(--surface-subtle)] border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="cursor-pointer font-bold inline-flex items-center gap-1.5"
            data-testid="confirm-auto-publish-btn"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span>Ativando...</span>
              </>
            ) : (
              <span>Confirmar e ativar</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
