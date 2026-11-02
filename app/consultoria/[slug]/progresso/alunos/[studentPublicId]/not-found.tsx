import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StudentNotFound() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[60vh] w-full bg-transparent text-[var(--text-primary)] flex flex-col items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] mx-auto flex items-center justify-center shadow-2xs">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
            Aluno não encontrado
          </h1>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            O aluno solicitado não foi localizado ou não está ativo nesta consultoria.
          </p>
        </div>

        <div className="pt-2 border-t border-[var(--border-subtle)]">
          <Link href="." className="block w-full">
            <Button
              variant="primary"
              size="lg"
              className="w-full min-h-[48px] font-bold text-xs sm:text-sm cursor-pointer"
            >
              Voltar para lista de alunos
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
