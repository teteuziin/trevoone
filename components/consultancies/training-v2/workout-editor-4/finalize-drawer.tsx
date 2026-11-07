"use client";

import React, { useTransition } from "react";
import type { WorkoutBlockDto } from "@/lib/training-v2/types";
import type { EditorStudentInfo } from "./types";

interface FinalizeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  student: EditorStudentInfo | null;
  blocks: WorkoutBlockDto[];
  onOpenStudentSelector: () => void;
  onPublish: () => Promise<void>;
  onSaveAsTemplate: () => Promise<void>;
  isTemplate?: boolean;
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function AlertTriangleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

export function FinalizeDrawer({
  isOpen,
  onClose,
  title,
  student,
  blocks,
  onOpenStudentSelector,
  onPublish,
  onSaveAsTemplate,
  isTemplate = false,
}: FinalizeDrawerProps) {
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const totalExercises = blocks.reduce((acc, b) => acc + (b.items?.length || 0), 0);
  const emptyBlocks = blocks.filter((b) => !b.items || b.items.length === 0);

  // Issues validation checklist
  const issues: string[] = [];
  if (!isTemplate && !student) {
    issues.push("Nenhum aluno vinculado à ficha.");
  }
  if (!title.trim() || title === "Sem título") {
    issues.push("A ficha precisa de um nome descritivo.");
  }
  if (totalExercises === 0) {
    issues.push("Adicione ao menos um exercício antes de publicar.");
  }
  if (emptyBlocks.length > 0) {
    issues.push(
      `A divisão "${emptyBlocks[0].title}" está sem exercícios.`
    );
  }

  // Check incomplete combinations (bi-sets, tri-sets, circuits, supersets)
  let hasIncompleteCombinations = false;
  blocks.forEach((b) => {
    (b.combinations || []).forEach((c) => {
      const itemsCount = (c.items || []).length;
      const type = c.combinationType;
      const required = type === "TRI_SET" ? 3 : 2;
      const label =
        type === "TRI_SET"
          ? "Tri-set"
          : type === "CIRCUIT"
          ? "Circuito"
          : (type as string) === "SUPERSET"
          ? "Supersérie"
          : "Bi-set";
      if (itemsCount < required) {
        hasIncompleteCombinations = true;
        issues.push(
          `Na divisão "${b.title}": o ${label} está incompleto (${itemsCount}/${required} exercícios). Adicione os exercícios faltantes ou desfaça a combinação.`
        );
      }
    });
  });

  const canPublish =
    totalExercises > 0 &&
    title.trim().length > 0 &&
    !hasIncompleteCombinations &&
    emptyBlocks.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAFBF9]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#E8F0EA] text-[#176B49] flex items-center justify-center text-sm font-black">
              ✓
            </span>
            <div>
              <h2 className="text-base font-extrabold text-[#102E23]">
                {isTemplate ? "Finalizar e Salvar Modelo" : "Conferir e Publicar Treino"}
              </h2>
              <p className="text-xs text-[#526058]">
                Revise os pontos principais antes de disponibilizar a ficha.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F5F5F0] hover:bg-[#EAEFEA] text-[#526058] flex items-center justify-center transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content Checklist */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Card Resumo */}
          <div className="p-4 rounded-2xl bg-[#F5F5F0] border border-[#E5E8E2] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#526058]">Nome do treino:</span>
              <span className="font-extrabold text-[#102E23] truncate max-w-[200px]">
                {title}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#526058]">Divisões:</span>
              <span className="font-extrabold text-[#102E23]">
                {blocks.length} {blocks.length === 1 ? "divisão" : "divisões"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#526058]">Total de exercícios:</span>
              <span className="font-extrabold text-[#102E23]">
                {totalExercises} exercícios
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#526058]">Aluno:</span>
              {student ? (
                <span className="font-bold text-[#176B49]">
                  👤 {student.name}
                </span>
              ) : isTemplate ? (
                <span className="font-bold text-[#526058]">
                  Modelo reutilizável
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenStudentSelector();
                  }}
                  className="font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  + Vincular agora
                </button>
              )}
            </div>
          </div>

          {/* Avisos / Pendências */}
          {issues.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <AlertTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Atenção antes de publicar:</span>
              </div>
              <ul className="space-y-1 text-xs text-amber-900 pl-5 list-disc">
                {issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Confirmação Positiva se tudo OK */}
          {issues.length === 0 && (
            <div className="p-3.5 rounded-2xl bg-[#EDF5F0] border border-[#C6E2D1] flex items-center gap-2.5 text-xs text-[#176B49] font-bold">
              <CheckIcon className="w-4 h-4 shrink-0" />
              <span>Tudo certo! A ficha está completa e pronta para publicação.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E5E8E2] bg-[#FAFBF9] flex flex-col sm:flex-row items-center justify-between gap-2">
          {!isTemplate && (
            <button
              type="button"
              disabled={isPending}
              onClick={async () => {
                await onSaveAsTemplate();
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-[#526058] hover:text-[#102E23] hover:bg-[#F5F5F0] transition-colors cursor-pointer"
            >
              Salvar cópia como modelo
            </button>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#526058] hover:text-[#102E23] cursor-pointer"
            >
              Voltar à edição
            </button>

            <button
              type="button"
              disabled={!canPublish || isPending}
              onClick={() => {
                startTransition(async () => {
                  await onPublish();
                });
              }}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold bg-[#176B49] text-white hover:bg-[#102E23] disabled:opacity-40 transition-colors shadow-xs cursor-pointer min-h-[44px]"
            >
              {isPending ? "Publicando..." : isTemplate ? "Salvar modelo" : "Confirmar e Publicar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
