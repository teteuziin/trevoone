"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createPlanFromTemplateAction,
  applyTemplateToPatientAction,
  listStudentsForPlanCopyAction,
} from "@/app/consultoria/[slug]/planos-v2/actions";
import { Button } from "@/components/ui/button";
import type { NutritionV2PlanTemplateListItemDto } from "@/lib/nutrition-v2/types";

interface StudentOption {
  membershipPublicId: string;
  studentPublicId: string;
  fullName: string;
  email: string;
  hasActivePlan: boolean;
  activePlanTitle: string | null;
  hasDraftPlan: boolean;
}

interface NutritionUseTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  consultancySlug: string;
  template: NutritionV2PlanTemplateListItemDto | null;
  targetStudentMembershipPublicId?: string;
  targetStudentName?: string;
}

export function NutritionUseTemplateDialog({
  isOpen,
  onClose,
  consultancySlug,
  template,
  targetStudentMembershipPublicId,
  targetStudentName,
}: NutritionUseTemplateDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState(() => {
    if (!template) return "";
    return targetStudentName ? `Plano Alimentar - ${targetStudentName}` : template.name;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Patient selector state when used outside patient hub
  const [selectedStudentMembershipId, setSelectedStudentMembershipId] = useState<string>(
    targetStudentMembershipPublicId || ""
  );
  const [searchStudent, setSearchStudent] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const isLoadingStudents = isOpen && !targetStudentMembershipPublicId && studentOptions.length === 0;

  // Existing draft conflict resolution state (Section 22)
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
    if (!isOpen || !template) return;

    if (!targetStudentMembershipPublicId) {
      let active = true;
      listStudentsForPlanCopyAction(consultancySlug).then((res) => {
        if (active && res.success && res.data) {
          setStudentOptions(res.data);
        }
      });
      return () => {
        active = false;
      };
    }
  }, [isOpen, template, targetStudentMembershipPublicId, consultancySlug]);

  if (!isOpen || !template) return null;

  const effectiveStudentMembershipId = targetStudentMembershipPublicId || selectedStudentMembershipId;

  async function handleSubmit(replaceExistingDraft: boolean = false) {
    if (!template) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (effectiveStudentMembershipId) {
        // Apply template directly to patient
        const res = await applyTemplateToPatientAction(consultancySlug, {
          templatePublicId: template.publicId,
          targetStudentMembershipPublicId: effectiveStudentMembershipId,
          title: title.trim() || undefined,
          replaceExistingDraft,
        });

        if (!res.success || !res.data) {
          setErrorMessage(res.error || "Erro ao aplicar modelo ao paciente.");
          setIsSubmitting(false);
          return;
        }

        if (res.data.status === "EXISTING_DRAFT") {
          setExistingDraftData(res.data.existingDraft);
          setIsSubmitting(false);
          return;
        }

        // Applied successfully -> Navigate to Builder in student context
        const data = res.data;
        router.push(
          `/consultoria/${consultancySlug}/planos-v2/${data.planPublicId}?v=${data.versionPublicId}&studentId=${effectiveStudentMembershipId}&origin=template&originName=${encodeURIComponent(template.name)}`
        );
        handleClose();
      } else {
        // Standalone plan creation
        const formData = new FormData();
        formData.set("templatePublicId", template.publicId);
        if (title.trim()) {
          formData.set("title", title.trim());
        }

        const res = await createPlanFromTemplateAction(consultancySlug, formData);
        if (!res.success || !res.data) {
          setErrorMessage(res.error || "Erro ao criar plano a partir do modelo.");
          setIsSubmitting(false);
          return;
        }

        router.push(
          `/consultoria/${consultancySlug}/planos-v2/${res.data.planPublicId}?origin=template&originName=${encodeURIComponent(template.name)}`
        );
        handleClose();
      }
    } catch {
      setErrorMessage("Falha de conexão ao aplicar modelo.");
      setIsSubmitting(false);
    }
  }

  function handleContinueExistingDraft() {
    if (!existingDraftData) return;
    router.push(
      `/consultoria/${consultancySlug}/planos-v2/${existingDraftData.planPublicId}?v=${existingDraftData.versionPublicId}&studentId=${effectiveStudentMembershipId}`
    );
    handleClose();
  }

  const filteredStudents = studentOptions.filter((s) => {
    if (!searchStudent.trim()) return true;
    const q = searchStudent.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[var(--surface)] border-t sm:border border-[var(--border-default)] rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
        {/* Mobile Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[var(--border-default)] flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-[var(--text-primary)] leading-snug">
              {targetStudentName ? `Usar modelo para ${targetStudentName}` : "Usar modelo"}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Gera um novo plano alimentar rascunho independente baseado no blueprint deste modelo.
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

        {/* Form Body */}
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

          {/* EXISTING DRAFT CONFLICT MODAL (Section 22) */}
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
                  Existe um rascunho de plano ativo para esta paciente ({existingDraftData.title}). Deseja continuar o rascunho existente ou substituir seu conteúdo pela estrutura do modelo?
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
                      onClick={() => handleSubmit(true)}
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
              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Estrutura do Modelo
                </span>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {template.name}
                </div>
                <div className="text-xs text-[var(--text-secondary)] flex items-center gap-3">
                  <span>{template.mealCount} refeições</span>
                  <span>•</span>
                  <span>{template.itemCount} alimentos/itens</span>
                </div>
              </div>

              {/* Patient Selection (if not pre-defined by context) */}
              {!targetStudentMembershipPublicId && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Vincular a um paciente (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Buscar paciente pelo nome ou email..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)]"
                  />
                  <div className="mt-1.5 max-h-36 overflow-y-auto border border-[var(--border-default)] rounded-xl divide-y divide-[var(--border-subtle)]">
                    {isLoadingStudents ? (
                      <div className="p-3 text-center text-xs text-[var(--text-tertiary)]">
                        Carregando pacientes...
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentMembershipId("")}
                          className={`w-full p-2.5 text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            !selectedStudentMembershipId
                              ? "bg-[var(--brand-soft)] text-[var(--brand)] font-bold"
                              : "hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                          }`}
                        >
                          <span>Nenhum (Criar plano avulso sem vínculo)</span>
                          {!selectedStudentMembershipId && <span>✓</span>}
                        </button>
                        {filteredStudents.map((s) => (
                          <button
                            key={s.membershipPublicId}
                            type="button"
                            onClick={() => setSelectedStudentMembershipId(s.membershipPublicId)}
                            className={`w-full p-2.5 text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                              selectedStudentMembershipId === s.membershipPublicId
                                ? "bg-[var(--brand-soft)] text-[var(--brand)] font-bold"
                                : "hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                            }`}
                          >
                            <span className="truncate">{s.fullName}</span>
                            {selectedStudentMembershipId === s.membershipPublicId && <span>✓</span>}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="plan-title" className="text-xs font-semibold text-[var(--text-primary)]">
                  Título do novo plano alimentar <span className="text-red-500">*</span>
                </label>
                <input
                  id="plan-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título para personalizar este plano..."
                  maxLength={255}
                  disabled={isSubmitting}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-colors disabled:opacity-50"
                />
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1">
                <p className="font-semibold text-[var(--text-primary)]">Independência do plano:</p>
                <p>
                  O novo plano será criado em status <strong>Rascunho</strong>. Ele não fica vinculado ao modelo — edições futuras não afetarão o modelo nem outros planos.
                </p>
              </div>

              {/* Footer Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="min-h-[44px] cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting || !title.trim()}
                  className="font-bold min-h-[48px] px-5 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "Criando plano..." : "Criar Plano Rascunho"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
