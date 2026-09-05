"use client";

import { useState, useEffect, useTransition } from "react";
import {
  searchActiveStudentsAction,
  assignWorkoutVersionAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import type { StudentSearchResult } from "@/lib/training-v2/assignment-repository";

function UserCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

function Search({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}

function Check({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
    </svg>
  );
}

type WorkoutAssignModalProps = {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  workoutPublicId: string;
  workoutTitle: string;
  versionPublicId: string;
  versionNumber: number;
  onAssigned?: (assignmentPublicId: string) => void;
};

export function WorkoutAssignModal({
  isOpen,
  onClose,
  slug,
  workoutPublicId,
  workoutTitle,
  versionPublicId,
  versionNumber,
  onAssigned,
}: WorkoutAssignModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [startsOn, setStartsOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [endsOn, setEndsOn] = useState("");
  const [notesForStudent, setNotesForStudent] = useState("");
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load students on open or query change
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const timer = setTimeout(() => {
      setIsLoadingStudents(true);
      setErrorMessage(null);
      searchActiveStudentsAction(slug, searchQuery).then((res) => {
        if (cancelled) return;
        setIsLoadingStudents(false);
        if (res.ok && res.data) {
          setStudents(res.data);
        } else {
          setErrorMessage(res.error || "Erro ao buscar alunos.");
        }
      });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, slug, searchQuery]);

  if (!isOpen) return null;

  function handleAssign() {
    if (!selectedStudent) {
      setErrorMessage("Selecione um aluno para continuar.");
      return;
    }

    if (!startsOn) {
      setErrorMessage("Informe a data de início da prescrição.");
      return;
    }

    if (endsOn && endsOn < startsOn) {
      setErrorMessage("A data de término não pode ser anterior à data de início.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await assignWorkoutVersionAction(
        slug,
        workoutPublicId,
        versionPublicId,
        selectedStudent.membershipPublicId,
        {
          startsOn,
          endsOn: endsOn || null,
          notesForStudent: notesForStudent.trim() || null,
        }
      );

      if (!res.ok) {
        setErrorMessage(res.error || "Erro ao prescrever treino.");
        return;
      }

      setSuccessMessage(`Treino prescrito com sucesso para ${selectedStudent.name}!`);
      setTimeout(() => {
        onAssigned?.(res.data!.assignmentPublicId);
        onClose();
      }, 1200);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose();
      }}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] bg-[var(--surface-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 id="assign-modal-title" className="text-base font-semibold text-[var(--foreground)]">
                Prescrever Treino
              </h2>
              <p className="text-xs text-[var(--foreground-muted)] truncate max-w-[280px]">
                {workoutTitle} · Versão {versionNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-2 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
            aria-label="Fechar modal"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
              <span className="shrink-0 font-bold">!</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Student Search & Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--foreground)]">
              Selecionar Aluno <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-muted)]" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isPending}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Students List */}
            <div className="border border-[var(--border-default)] rounded-2xl max-h-48 overflow-y-auto divide-y divide-[var(--border-default)] bg-[var(--surface-subtle)]/50">
              {isLoadingStudents ? (
                <div className="p-4 text-center text-xs text-[var(--foreground-muted)]">
                  Carregando alunos ativos...
                </div>
              ) : students.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--foreground-muted)]">
                  Nenhum aluno ativo encontrado.
                </div>
              ) : (
                students.map((student) => {
                  const isSelected = selectedStudent?.membershipPublicId === student.membershipPublicId;
                  return (
                    <button
                      key={student.membershipPublicId}
                      type="button"
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[var(--surface-subtle)] transition-colors ${
                        isSelected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : ""
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {student.name}
                        </p>
                        <p className="text-xs text-[var(--foreground-muted)] truncate">
                          {student.email}
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {selectedStudent && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Selecionado: <span className="font-semibold">{selectedStudent.name}</span>
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                Início da Prescrição <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                disabled={isPending}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                Término (Opcional)
              </label>
              <input
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                disabled={isPending}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Notes for Student */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]">
              Orientações para o Aluno (Opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Realizar este treino às segundas e quintas. Focar na cadência..."
              value={notesForStudent}
              onChange={(e) => setNotesForStudent(e.target.value)}
              disabled={isPending}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-default)] bg-[var(--surface-subtle)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={isPending || !selectedStudent}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Prescrevendo...</span>
              </>
            ) : (
              <span>Confirmar Prescrição</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
