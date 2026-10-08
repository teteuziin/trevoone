"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  copyPatientPlanToStudentAction,
  listStudentsForPlanCopyAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import { Button } from "@/components/ui/button";

interface StudentOption {
  membershipPublicId: string;
  studentPublicId: string;
  fullName: string;
  email: string;
  hasActivePlan: boolean;
  activePlanTitle: string | null;
  hasDraftPlan: boolean;
}

interface NutritionCopyPlanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  sourcePlanPublicId?: string;
  sourcePlanTitle?: string;
  targetStudentMembershipPublicId?: string;
  targetStudentName?: string;
}

export function NutritionCopyPlanDialog({
  isOpen,
  onClose,
  consultancySlug,
  sourcePlanPublicId,
  sourcePlanTitle,
  targetStudentMembershipPublicId,
  targetStudentName,
}: NutritionCopyPlanDialogProps) {
  const router = useRouter();

  // Selection states
  const [selectedSourcePlanPublicId, setSelectedSourcePlanPublicId] = useState<string>(sourcePlanPublicId || "");
  const [selectedTargetMembershipId, setSelectedTargetMembershipId] = useState<string>(targetStudentMembershipPublicId || "");
  const [searchStudent, setSearchStudent] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const isLoadingStudents = isOpen && studentOptions.length === 0;

  // Submission & Conflict states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [existingDraftData, setExistingDraftData] = useState<{
    assignmentPublicId: string;
    planPublicId: string;
    versionPublicId: string;
    versionNumber: number;
    title: string;
  } | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  function handleClose() {
    setErrorMessage(null);
    setExistingDraftData(null);
    setShowReplaceConfirm(false);
    onClose();
  }

  useEffect(() => {
    if (!isOpen) return;

    // Load students list
    let active = true;
    listStudentsForPlanCopyAction(consultancySlug).then((res) => {
      if (active && res.success && res.data) {
        setStudentOptions(res.data);
      }
    });

    return () => {
      active = false;
    };
  }, [isOpen, consultancySlug]);

  if (!isOpen) return null;

  const filteredStudents = studentOptions.filter((s) => {
    if (!searchStudent.trim()) return true;
    const q = searchStudent.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  // Students who have an active plan (for picking source when inside target context)
  const sourceStudentOptions = studentOptions.filter((s) => s.hasActivePlan);

  async function handleExecuteCopy(replaceExistingDraft: boolean = false) {
    const finalSourcePlan = sourcePlanPublicId || selectedSourcePlanPublicId;
    const finalTargetMembership = targetStudentMembershipPublicId || selectedTargetMembershipId;

    if (!finalSourcePlan) {
      setErrorMessage("Selecione o plano alimentar de origem.");
      return;
    }
    if (!finalTargetMembership) {
      setErrorMessage("Selecione o paciente de destino.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await copyPatientPlanToStudentAction(consultancySlug, {
        sourcePlanPublicId: finalSourcePlan,
        targetStudentMembershipPublicId: finalTargetMembership,
        replaceExistingDraft,
      });

      if (!res.success || !res.data) {
        setErrorMessage(res.error || "Erro ao copiar plano alimentar.");
        setIsSubmitting(false);
        return;
      }

      if (res.data.status === "EXISTING_DRAFT") {
        setExistingDraftData(res.data.existingDraft);
        setIsSubmitting(false);
        return;
      }

      // Success
      const targetData = res.data;
      router.push(
        `/consultoria/${consultancySlug}/planos-v2/${targetData.planPublicId}?v=${targetData.versionPublicId}&studentId=${finalTargetMembership}&origin=copy`
      );
      handleClose();
    } catch {
      setErrorMessage("Falha de conexão ao copiar plano.");
      setIsSubmitting(false);
    }
  }

  function handleContinueExistingDraft() {
    if (!existingDraftData) return;
    const finalTargetMembership = targetStudentMembershipPublicId || selectedTargetMembershipId;
    router.push(
      `/consultoria/${consultancySlug}/planos-v2/${existingDraftData.planPublicId}?v=${existingDraftData.versionPublicId}&studentId=${finalTargetMembership}`
    );
    handleClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-[var(--surface)] border-t sm:border border-[var(--border-default)] rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
        {/* Drag Handle Mobile */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--border-default)] flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-[var(--text-primary)] leading-snug">
              Copiar plano alimentar
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Cria uma cópia independente de um plano existente para adaptação clínica individual.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3.5 text-xs rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>Atenção</span>
              </div>
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* EXISTING DRAFT CONFLICT UX (Section 22) */}
          {existingDraftData ? (
            <div className="space-y-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Este paciente já possui uma alteração em andamento.
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Existe um rascunho de plano ativo para esta paciente ({existingDraftData.title}). Deseja continuar o rascunho existente ou substituir seu conteúdo pelo plano copiado?
                </p>
              </div>

              {!showReplaceConfirm ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleContinueExistingDraft}
                    className="font-bold min-h-[44px]"
                  >
                    Continuar rascunho atual
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowReplaceConfirm(true)}
                    className="font-bold min-h-[44px] text-amber-700 dark:text-amber-400"
                  >
                    Substituir conteúdo do rascunho
                  </Button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[var(--surface)] border border-amber-500/30 space-y-3">
                  <p className="text-xs font-medium text-[var(--text-primary)] leading-relaxed">
                    <strong>Confirmação de substituição:</strong> O conteúdo atual do rascunho será substituído. O plano publicado do aluno não será alterado até nova publicação.
                  </p>
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReplaceConfirm(false)}
                      disabled={isSubmitting}
                    >
                      Voltar
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleExecuteCopy(true)}
                      disabled={isSubmitting}
                      className="font-bold bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {isSubmitting ? "Substituindo..." : "Confirmar e Substituir"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Context A: Source is fixed, choose target patient */}
              {sourcePlanPublicId ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Plano de Origem
                    </span>
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      {sourcePlanTitle || "Plano Selecionado"}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">
                      Selecione o paciente de destino <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Buscar paciente pelo nome ou email..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)]"
                    />

                    <div className="mt-2 max-h-48 overflow-y-auto border border-[var(--border-default)] rounded-xl divide-y divide-[var(--border-subtle)]">
                      {isLoadingStudents ? (
                        <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                          Carregando pacientes...
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                          Nenhum paciente encontrado.
                        </div>
                      ) : (
                        filteredStudents.map((s) => (
                          <button
                            key={s.membershipPublicId}
                            type="button"
                            onClick={() => setSelectedTargetMembershipId(s.membershipPublicId)}
                            className={`w-full p-3 text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                              selectedTargetMembershipId === s.membershipPublicId
                                ? "bg-[var(--brand-soft)] border-l-4 border-[var(--brand)]"
                                : "hover:bg-[var(--surface-hover)]"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] block truncate">
                                {s.fullName}
                              </span>
                              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                                {s.hasActivePlan ? `Plano ativo: ${s.activePlanTitle}` : "Sem plano ativo"}
                              </span>
                            </div>
                            {selectedTargetMembershipId === s.membershipPublicId && (
                              <span className="text-xs font-bold text-[var(--brand)] shrink-0">
                                Selecionado
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : targetStudentMembershipPublicId ? (
                /* Context B: Target is fixed, choose source plan */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Paciente de Destino
                    </span>
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                      {targetStudentName || "Paciente Selecionada"}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-primary)]">
                      Copiar plano de qual paciente? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Buscar paciente pelo nome..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)]"
                    />

                    <div className="mt-2 max-h-48 overflow-y-auto border border-[var(--border-default)] rounded-xl divide-y divide-[var(--border-subtle)]">
                      {isLoadingStudents ? (
                        <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                          Carregando pacientes...
                        </div>
                      ) : sourceStudentOptions.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[var(--text-secondary)]">
                          Nenhum outro paciente com plano ativo encontrado.
                        </div>
                      ) : (
                        sourceStudentOptions
                          .filter((s) => s.membershipPublicId !== targetStudentMembershipPublicId)
                          .filter((s) => {
                            if (!searchStudent.trim()) return true;
                            const q = searchStudent.toLowerCase();
                            return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
                          })
                          .map((s) => (
                            <button
                              key={s.membershipPublicId}
                              type="button"
                              onClick={() => {
                                // For source selection, we can store membership and query the active plan
                                setSelectedSourcePlanPublicId(s.membershipPublicId);
                              }}
                              className={`w-full p-3 text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                                selectedSourcePlanPublicId === s.membershipPublicId
                                  ? "bg-[var(--brand-soft)] border-l-4 border-[var(--brand)]"
                                  : "hover:bg-[var(--surface-hover)]"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] block truncate">
                                  {s.fullName}
                                </span>
                                <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                                  {s.activePlanTitle || "Plano ativo"}
                                </span>
                              </div>
                              {selectedSourcePlanPublicId === s.membershipPublicId && (
                                <span className="text-xs font-bold text-[var(--brand)] shrink-0">
                                  Selecionado
                                </span>
                              )}
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Security & Independence Notice */}
              <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1 leading-relaxed">
                <p className="font-bold text-[var(--text-primary)]">Independência e Segurança Clínica:</p>
                <p>
                  Será criada uma cópia independente em status <strong>Rascunho</strong>. Nenhuns dados clínicos, notas, metas ou nomes de outros pacientes serão transferidos.
                </p>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="min-h-[44px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => handleExecuteCopy(false)}
                  disabled={
                    isSubmitting ||
                    (sourcePlanPublicId ? !selectedTargetMembershipId : !selectedSourcePlanPublicId)
                  }
                  className="font-bold min-h-[44px] px-5 shadow-sm"
                >
                  {isSubmitting ? "Copiando plano..." : "Copiar plano independente"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
