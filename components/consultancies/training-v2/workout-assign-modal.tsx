"use client";

import { useState, useEffect, useTransition } from "react";
import {
  searchActiveStudentsAction,
  getActiveStudentByMembershipAction,
  assignWorkoutVersionAction,
  getStudentActiveWorkoutAssignmentAction,
  updateWorkoutAssignmentVersionAction,
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
  initialStudentPublicId?: string;
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
  initialStudentPublicId,
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
  const [existingAssignment, setExistingAssignment] = useState<{
    assignmentPublicId: string;
    versionPublicId: string;
    versionNumber: number;
    startsOn: string;
    endsOn: string | null;
  } | null>(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
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
          if (initialStudentPublicId && !selectedStudent) {
            const matched = res.data.find(
              (s) => s.membershipPublicId === initialStudentPublicId
            );
            if (matched) {
              setSelectedStudent(matched);
            } else {
              getActiveStudentByMembershipAction(slug, initialStudentPublicId).then((directRes) => {
                if (!cancelled && directRes.ok && directRes.data) {
                  setSelectedStudent(directRes.data);
                }
              });
            }
          }
        } else {
          setErrorMessage(res.error || "Erro ao buscar alunos.");
        }
      });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, slug, searchQuery, initialStudentPublicId, selectedStudent]);

  // Check if selected student already has this workout assigned
  useEffect(() => {
    if (!isOpen || !selectedStudent) return;

    let cancelled = false;
    getStudentActiveWorkoutAssignmentAction(slug, workoutPublicId, selectedStudent.membershipPublicId)
      .then((res) => {
        if (!cancelled && res.ok && res.data) {
          setExistingAssignment(res.data);
        } else if (!cancelled) {
          setExistingAssignment(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsCheckingExisting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, slug, workoutPublicId, selectedStudent]);

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

  function handleUpgradeVersion() {
    if (!existingAssignment) return;
    setIsUpgrading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await updateWorkoutAssignmentVersionAction(
        slug,
        existingAssignment.assignmentPublicId,
        versionPublicId
      );
      setIsUpgrading(false);
      if (!res.ok) {
        setErrorMessage(res.error || "Erro ao atualizar treino do aluno.");
        return;
      }
      setSuccessMessage(`Treino do aluno atualizado com sucesso para a Versão ${versionNumber}!`);
      setTimeout(() => {
        onAssigned?.(existingAssignment.assignmentPublicId);
        onClose();
      }, 1200);
    });
  }

  const hasExistingOlderVersion =
    existingAssignment && existingAssignment.versionNumber < versionNumber;
  const hasExistingSameOrNewerVersion =
    existingAssignment && existingAssignment.versionNumber >= versionNumber;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending && !isUpgrading) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[var(--surface)] border-t sm:border border-[var(--border-default)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-modal-title"
      >
        {/* Mobile Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[var(--border-strong)]" />
        </div>

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
            disabled={isPending || isUpgrading}
            className="p-2 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
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
                disabled={isPending || isUpgrading}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-emerald-500 transition-colors min-h-[44px]"
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
                      className={`w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] cursor-pointer ${
                        isSelected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold" : ""
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
              <div className="pt-1 flex items-center justify-between">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Selecionado: <span className="font-semibold">{selectedStudent.name}</span>
                </p>
                {isCheckingExisting && (
                  <span className="text-[11px] text-[var(--foreground-muted)]">
                    Verificando prescrições ativas...
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Existing Assignment Banner — Clear Version Update UX (Rule 28 & 61) */}
          {hasExistingOlderVersion && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>Este aluno já utiliza este treino</span>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                O aluno já possui uma prescrição ativa deste treino na{" "}
                <strong className="text-[var(--foreground)]">Versão {existingAssignment.versionNumber}</strong>.
                Você pode atualizar para a{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">Versão {versionNumber}</strong> com
                1 toque sem duplicar a rotina.
              </p>
              <button
                type="button"
                disabled={isUpgrading || isPending}
                onClick={handleUpgradeVersion}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all min-h-[48px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUpgrading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Atualizando treino do aluno...</span>
                  </>
                ) : (
                  <span>Atualizar treino do aluno</span>
                )}
              </button>
            </div>
          )}

          {hasExistingSameOrNewerVersion && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Este aluno já está utilizando a Versão {existingAssignment.versionNumber} deste treino.</span>
            </div>
          )}

          {/* Form Options (only when creating new assignment) */}
          {!existingAssignment && (
            <>
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
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-500 transition-colors min-h-[44px]"
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
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-sm text-[var(--foreground)] focus:outline-none focus:border-emerald-500 transition-colors min-h-[44px]"
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
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-default)] bg-[var(--surface-subtle)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending || isUpgrading}
            className="px-4 py-2.5 rounded-xl text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors min-h-[44px] cursor-pointer"
          >
            {existingAssignment ? "Fechar" : "Cancelar"}
          </button>
          {!existingAssignment && (
            <button
              type="button"
              onClick={handleAssign}
              disabled={isPending || !selectedStudent || isCheckingExisting}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 min-h-[48px] cursor-pointer"
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
          )}
        </div>
      </div>
    </div>
  );
}
