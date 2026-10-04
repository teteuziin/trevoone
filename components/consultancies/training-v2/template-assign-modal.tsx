"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  searchActiveStudentsAction,
  assignTemplateToStudentAction,
  getTemplatePreviewAction,
} from "@/app/consultoria/[slug]/rotinas/actions";
import type { StudentSearchResult } from "@/lib/training-v2/assignment-repository";
import type { TemplatePreviewDto } from "@/lib/training-v2/workout-repository";

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
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

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.286L13 21l-2.286-6.857L5 12l5.714-2.286L13 3z" />
    </svg>
  );
}

export type TemplateAssignModalProps = {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  templatePublicId: string;
  templateTitle: string;
  initialStudentMembershipPublicId?: string;
  initialStudentName?: string;
  onAssigned?: (workoutPublicId: string, assignmentPublicId: string) => void;
};

export function TemplateAssignModal({
  isOpen,
  onClose,
  slug,
  templatePublicId,
  templateTitle,
  initialStudentMembershipPublicId,
  initialStudentName,
  onAssigned,
}: TemplateAssignModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(() => {
    if (initialStudentMembershipPublicId && initialStudentName) {
      return {
        membershipPublicId: initialStudentMembershipPublicId,
        userPublicId: "",
        name: initialStudentName,
        email: "",
      };
    }
    return null;
  });
  const [preview, setPreview] = useState<TemplatePreviewDto | null>(null);
  const [customTitle, setCustomTitle] = useState(templateTitle);
  const [startsOn, setStartsOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [endsOn, setEndsOn] = useState("");
  const [notesForStudent, setNotesForStudent] = useState("");
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ workoutPublicId: string; assignmentPublicId: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load template preview once open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    getTemplatePreviewAction(slug, templatePublicId).then((res) => {
      if (isMounted && res.ok && res.data) {
        setPreview(res.data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isOpen, slug, templatePublicId]);

  // Search students with debounce
  useEffect(() => {
    if (!isOpen || selectedStudent) return;

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
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, slug, searchQuery, selectedStudent]);

  if (!isOpen) return null;

  const handleConfirmAssignment = () => {
    if (!selectedStudent) {
      setErrorMessage("Selecione um aluno para continuar.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await assignTemplateToStudentAction(
        slug,
        templatePublicId,
        selectedStudent.membershipPublicId,
        {
          startsOn,
          endsOn: endsOn || null,
          notesForStudent: notesForStudent.trim() || null,
          customTitle: customTitle.trim() || undefined,
        }
      );

      if (!res.ok || !res.data) {
        setErrorMessage(res.error || "Erro ao atribuir modelo ao aluno.");
        return;
      }

      setSuccessData({
        workoutPublicId: res.data.workoutPublicId,
        assignmentPublicId: res.data.assignmentPublicId,
      });

      if (onAssigned) {
        onAssigned(res.data.workoutPublicId, res.data.assignmentPublicId);
      }
    });
  };

  const handleClose = () => {
    setSuccessData(null);
    setErrorMessage(null);
    onClose();
  };

  const handleGoToPersonalize = () => {
    if (!successData || !selectedStudent) return;
    handleClose();
    router.push(
      `/consultoria/${slug}/rotinas/${successData.workoutPublicId}?student=${selectedStudent.membershipPublicId}`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-[var(--surface)] border-t sm:border border-[var(--border-default)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-[var(--text-primary)] truncate">
                Atribuir Modelo ao Aluno
              </h3>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {templateTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {successData ? (
            /* Success confirmation */
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h4 className="text-lg font-bold text-[var(--text-primary)]">
                  Plano Atribuído com Sucesso!
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Uma cópia independente de <strong>{templateTitle}</strong> foi criada para{" "}
                  <strong>{selectedStudent?.name}</strong>.
                </p>
              </div>

              {/* Notice */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-left text-xs text-[var(--text-secondary)] space-y-1">
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ Cópia 100% Independente (Copy-On-Assign)
                </p>
                <p>
                  Você pode personalizar exercícios, cargas e repetições livremente para este aluno sem alterar o modelo padrão.
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row gap-2.5 justify-center">
                <button
                  type="button"
                  onClick={handleGoToPersonalize}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Personalizar treino agora</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    router.refresh();
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] min-h-[48px] flex items-center justify-center cursor-pointer"
                >
                  <span>Concluir</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Core Principle Alert */}
              <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs text-[var(--text-secondary)] leading-relaxed">
                <strong className="text-purple-600 dark:text-purple-400 font-bold block mb-0.5">
                  Cópia Independente Garantida
                </strong>
                Será criada uma cópia deste plano para o aluno. Qualquer alteração feita depois no treino do aluno não modificará o modelo padrão.
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 font-semibold">
                  {errorMessage}
                </div>
              )}

              {/* Step 1: Select Student */}
              {!selectedStudent ? (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-[var(--text-primary)]">
                    Selecione o aluno que receberá o plano:
                  </label>

                  <div className="relative">
                    <SearchIcon className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nome ou email..."
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-2xl p-2 bg-[var(--surface-subtle)]">
                    {isLoadingStudents ? (
                      <p className="text-xs text-[var(--text-tertiary)] text-center py-4">
                        Buscando alunos...
                      </p>
                    ) : students.length === 0 ? (
                      <p className="text-xs text-[var(--text-tertiary)] text-center py-4">
                        {searchQuery ? "Nenhum aluno encontrado." : "Digite para buscar um aluno."}
                      </p>
                    ) : (
                      students.map((student) => (
                        <button
                          key={student.membershipPublicId}
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="w-full p-2.5 rounded-xl hover:bg-[var(--surface)] text-left flex items-center justify-between gap-3 transition-colors cursor-pointer min-h-[44px]"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {student.name}
                            </p>
                            {student.email && (
                              <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                                {student.email}
                              </p>
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-[var(--brand)] shrink-0">
                            Selecionar →
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* Student Selected Banner */
                <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--brand)] text-white font-bold flex items-center justify-center text-sm shrink-0">
                      {selectedStudent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          Aluno Selecionado
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                        {selectedStudent.name}
                      </p>
                      {selectedStudent.email && (
                        <p className="text-[11px] text-[var(--text-tertiary)] truncate">
                          {selectedStudent.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {!initialStudentMembershipPublicId && (
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors min-h-[36px] cursor-pointer"
                    >
                      Trocar
                    </button>
                  )}
                </div>
              )}

              {/* Structure Preview */}
              {preview && (
                <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-semibold">
                    <span>Estrutura do Modelo:</span>
                    <span>
                      {preview.blocks.length} {preview.blocks.length === 1 ? "categoria" : "categorias"} • {preview.totalExercises} exercícios
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.blocks.map((b, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border-default)] text-[11px] font-medium text-[var(--text-secondary)]"
                      >
                        {b.title} ({b.itemsCount} ex.)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Options */}
              {selectedStudent && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[var(--text-primary)]">
                      Nome do treino do aluno
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--text-primary)]">
                        Início da prescrição
                      </label>
                      <input
                        type="date"
                        value={startsOn}
                        onChange={(e) => setStartsOn(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-[var(--text-primary)] min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[var(--text-primary)]">
                        Término (opcional)
                      </label>
                      <input
                        type="date"
                        value={endsOn}
                        onChange={(e) => setEndsOn(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-[var(--text-primary)] min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[var(--text-primary)]">
                      Observações para o aluno (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={notesForStudent}
                      onChange={(e) => setNotesForStudent(e.target.value)}
                      placeholder="Ex: Foco na execução e descanso controlado..."
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)] text-[var(--text-primary)] resize-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!successData && (
          <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5 shrink-0 bg-[var(--surface)]">
            <button
              type="button"
              disabled={isPending}
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors min-h-[44px] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!selectedStudent || isPending}
              onClick={handleConfirmAssignment}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs min-h-[48px] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isPending ? (
                <span>Criando cópia e atribuindo...</span>
              ) : (
                <span>Confirmar Atribuição</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
