"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  listEligibleStudentsAction,
  assignPlanVersionAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import type { EligibleStudentDto } from "@/lib/nutrition-v2/assignment-repository";

interface Props {
  slug: string;
  planPublicId: string;
  planTitle: string;
  versionPublicId: string;
  versionNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NutritionAssignModal({
  slug,
  planPublicId,
  planTitle,
  versionPublicId,
  versionNumber,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState<EligibleStudentDto[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<EligibleStudentDto | null>(null);
  const [notesForStudent, setNotesForStudent] = useState("");
  const [forceReplace, setForceReplace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Load students on open or search change
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setIsLoadingStudents(true);
      setError(null);
      try {
        const res = await listEligibleStudentsAction(slug, search);
        if (res.success && res.data) {
          setStudents(res.data);
        } else {
          setError(res.error || "Não foi possível carregar a lista de alunos.");
        }
      } catch {
        setError("Erro de conexão ao buscar alunos.");
      } finally {
        setIsLoadingStudents(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, search, slug]);

  if (!isOpen) return null;

  const isSameVersion =
    selectedStudent?.activeAssignment?.planPublicId === planPublicId &&
    selectedStudent?.activeAssignment?.versionNumber === versionNumber;

  const isDifferentPlanOrVersion =
    selectedStudent?.activeAssignment != null && !isSameVersion;

  const handleAssign = () => {
    if (!selectedStudent) {
      setError("Selecione um aluno para prescrever.");
      return;
    }

    if (isSameVersion) {
      setError("O aluno já está na versão atual deste plano.");
      return;
    }

    if (isDifferentPlanOrVersion && !forceReplace) {
      setError("Confirme a substituição do plano atual antes de prosseguir.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const res = await assignPlanVersionAction(slug, {
          planPublicId,
          versionPublicId,
          studentMembershipPublicId: selectedStudent.membershipPublicId,
          notesForStudent: notesForStudent.trim() || null,
          forceReplace,
        });

        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error || "Erro ao prescrever plano.");
        }
      } catch {
        setError("Erro inesperado ao realizar prescrição.");
      }
    });
  };

  const handleClose = () => {
    setSearch("");
    setSelectedStudent(null);
    setNotesForStudent("");
    setForceReplace(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-[#151619] rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-[#E5E7EB] dark:border-[#303238] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        {/* Mobile Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-[#303238]" />
        </div>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#303238] flex items-center justify-between bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white">
              Enviar Plano Alimentar
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] truncate max-w-[280px] sm:max-w-md">
              <span className="font-semibold text-[#17191D] dark:text-[#E5E7EB]">{planTitle}</span> · Versão {versionNumber} (Publicada)
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#8E95A2] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
              {error}
            </div>
          )}

          {/* Student Picker */}
          <div>
            <label className="block text-xs font-semibold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
              Selecione o Paciente
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar paciente por nome ou e-mail..."
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-xs text-[#17191D] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-[#8E95A2] focus:bg-white dark:focus:bg-[#151619] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />

            <div className="mt-2 border border-[#E5E7EB] dark:border-[#303238] rounded-xl max-h-44 overflow-y-auto divide-y divide-[#E5E7EB] dark:divide-[#303238] bg-white dark:bg-[#151619]">
              {isLoadingStudents ? (
                <div className="p-4 text-center text-xs text-[#6B7280] dark:text-[#8E95A2]">Carregando pacientes...</div>
              ) : students.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#6B7280] dark:text-[#8E95A2]">Nenhum paciente encontrado.</div>
              ) : (
                students.map((st) => {
                  const isSelected = selectedStudent?.membershipPublicId === st.membershipPublicId;
                  return (
                    <button
                      key={st.membershipPublicId}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(st);
                        setForceReplace(false);
                        setError(null);
                      }}
                      className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
                          : "hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21] text-[#17191D] dark:text-white"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs truncate">{st.studentName}</div>
                        <div className="text-[11px] text-[#6B7280] dark:text-[#8E95A2] truncate">{st.studentEmail}</div>
                      </div>
                      {st.activeAssignment && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                          Com dieta ativa
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Student Warning/State */}
          {selectedStudent && (
            <div className="rounded-xl p-3.5 border border-[#E5E7EB] dark:border-[#303238] bg-[#F9FAFB] dark:bg-[#1B1D21] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#4B5563] dark:text-[#8E95A2]">Paciente Selecionado:</span>
                <span className="font-bold text-[#17191D] dark:text-white">{selectedStudent.studentName}</span>
              </div>

              {isSameVersion && (
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-300 font-medium">
                  Este paciente já está com a versão atual (V{versionNumber}) deste plano ativa.
                </div>
              )}

              {isDifferentPlanOrVersion && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="font-semibold">Atenção: Substituição de Plano</div>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    O paciente já possui um plano ativo ({selectedStudent.activeAssignment?.planTitle}, V
                    {selectedStudent.activeAssignment?.versionNumber}). Ao enviar, o plano anterior será encerrado e
                    este passará a ser o plano ativo.
                  </p>
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceReplace}
                      onChange={(e) => setForceReplace(e.target.checked)}
                      className="w-4 h-4 rounded border-amber-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                      Confirmar encerramento do plano anterior e ativação deste
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Notes for Student */}
          <div>
            <label className="block text-xs font-semibold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
              Observações para o Paciente (opcional)
            </label>
            <textarea
              value={notesForStudent}
              onChange={(e) => setNotesForStudent(e.target.value)}
              rows={2}
              placeholder="Ex: Seguir rigorosamente as quantidades prescritas nas refeições 1 e 3."
              className="w-full px-3 py-2 bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-xs text-[#17191D] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-[#8E95A2] focus:bg-white dark:focus:bg-[#151619] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] border-t border-[#E5E7EB] dark:border-[#303238] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2.5 sm:py-2 text-xs font-semibold text-[#4B5563] dark:text-[#C2C8CF] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-center cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={
              isPending ||
              !selectedStudent ||
              isSameVersion ||
              (isDifferentPlanOrVersion && !forceReplace)
            }
            className="w-full sm:w-auto min-h-[48px] sm:min-h-0 px-5 py-2.5 sm:py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Enviando plano...</span>
              </>
            ) : (
              <span>Confirmar Envio</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
