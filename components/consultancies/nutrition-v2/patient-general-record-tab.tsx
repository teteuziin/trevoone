"use client";

import React, { useState, useTransition } from "react";
import type {
  PatientRecordDetail,
  UpdatePatientRecordInput,
  ClinicalFieldProvenance,
  PatientClinicalNoteDto,
  PatientRecordPreQuestionnaireItem,
  SaveClinicalNoteInput,
  ClinicalNoteContextType,
} from "@/lib/nutrition-v2/patient-record-types";
import {
  CLINICAL_NOTE_CONTEXT_LABELS,
} from "@/lib/nutrition-v2/patient-record-types";
import {
  calculateAgeFromBirthDate,
  classifyBMI,
} from "@/lib/nutrition-v2/clinical-calculations";
import {
  savePatientClinicalNoteAction,
  finalizePatientClinicalNoteAction,
  deletePatientClinicalNoteAction,
  markPatientFieldReviewedAction,
} from "@/app/consultoria/[slug]/planos-v2/patient-actions";
import { AutosaveIndicator, type AutosaveStatus } from "./autosave-indicator";
import { SendPreQuestionnaireModal } from "./send-pre-questionnaire-modal";
import { ReviewPreQuestionnaireDiffModal } from "./review-pre-questionnaire-diff-modal";
import { cancelPreQuestionnaireAction } from "@/app/consultoria/[slug]/planos-v2/pre-questionnaire-actions";

export interface PatientGeneralRecordTabProps {
  slug: string;
  detail: PatientRecordDetail;
  clinicalForm: UpdatePatientRecordInput;
  canAuthorNutrition: boolean;
  onUpdateField: (field: keyof UpdatePatientRecordInput, value: string | null) => void;
  autosaveStatus: AutosaveStatus;
  autosaveError: string | null;
  onRetryAutosave: () => void;
  onBackToOverview?: () => void;
}

function formatDate(isoStr?: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr.includes("T") ? isoStr : `${isoStr}T12:00:00`);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

export function PatientGeneralRecordTab({
  slug,
  detail,
  clinicalForm,
  canAuthorNutrition,
  onUpdateField,
  autosaveStatus,
  autosaveError,
  onRetryAutosave,
  onBackToOverview,
}: PatientGeneralRecordTabProps) {
  const [, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Accordion section collapse state for mobile / quick toggle
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    objetivo: true,
    patologias: true,
    medicamentos: true,
    habitos: true,
    preferencias: true,
    gestacao: true,
    prequestionario: true,
    prontuario: true,
    auditoria: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  // Clinical Notes local state & draft editor
  const [clinicalNotes, setClinicalNotes] = useState<PatientClinicalNoteDto[]>(detail.clinicalNotes || []);
  const [newNoteDate, setNewNoteDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [newNoteContext, setNewNoteContext] = useState<ClinicalNoteContextType>("ROUTINE");
  const [newNoteContent, setNewNoteContent] = useState<string>("");
  const [newNoteConduct, setNewNoteConduct] = useState<string>("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Pre-Questionnaires local state & modals (Etapa 10)
  const [preQuestionnaires, setPreQuestionnaires] = useState<PatientRecordPreQuestionnaireItem[]>(detail.preQuestionnaires || []);
  const [isSendPreQuestionnaireModalOpen, setIsSendPreQuestionnaireModalOpen] = useState<boolean>(false);
  const [reviewingQuestionnairePublicId, setReviewingQuestionnairePublicId] = useState<string | null>(null);
  const [isCancelingId, setIsCancelingId] = useState<string | null>(null);

  const handleCancelQuestionnaire = async (publicId: string) => {
    if (!window.confirm("Deseja realmente cancelar este pré-questionário?")) return;
    setIsCancelingId(publicId);
    try {
      const res = await cancelPreQuestionnaireAction(slug, publicId, "Cancelado pelo profissional");
      if (res.success && res.data) {
        setPreQuestionnaires((prev) =>
          prev.map((item) =>
            item.publicId === publicId
              ? { ...item, status: "CANCELLED", statusLabel: "Cancelado" }
              : item
          )
        );
      }
    } finally {
      setIsCancelingId(null);
    }
  };

  // Local provenance map state to reflect reviews in real-time
  const [provenanceMap, setProvenanceMap] = useState<Record<string, ClinicalFieldProvenance>>(
    detail.fieldProvenance || {}
  );

  // Biometrics & demographics helpers
  const ageYears = detail.resolvedBirthDate ? calculateAgeFromBirthDate(detail.resolvedBirthDate) : null;
  const latestAnthro = detail.anthropometrics.length > 0 ? detail.anthropometrics[0] : null;
  const currentWeightKg = latestAnthro?.weightKg ?? detail.onboardingReference.reportedWeightKg ?? null;
  const currentHeightCm = latestAnthro?.heightCm ?? detail.onboardingReference.reportedHeightCm ?? null;

  const bmiValue =
    currentWeightKg !== null && currentHeightCm !== null && currentHeightCm > 0
      ? currentWeightKg / Math.pow(currentHeightCm / 100, 2)
      : null;

  const bmiClassification = bmiValue !== null ? classifyBMI(bmiValue) : null;

  const bioSexLabel =
    detail.resolvedBiologicalSex === "MALE"
      ? "Masculino"
      : detail.resolvedBiologicalSex === "FEMALE"
      ? "Feminino"
      : "Não informado";

  // Provenance Badge Component
  const renderProvenanceBadge = (fieldName: string) => {
    const prov = provenanceMap[fieldName] || { origin: "NOT_INFORMED", label: "Não informado" };

    if (prov.origin === "PATIENT_REPORTED") {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          <span>Relatado pelo paciente</span>
          {prov.sourceDate && <span className="opacity-75">({formatDate(prov.sourceDate)})</span>}
          {canAuthorNutrition && (
            <button
              type="button"
              onClick={() => handleMarkReviewed(fieldName)}
              title="Confirmar e validar relato do paciente"
              className="ml-1 text-[10px] underline hover:text-blue-900 dark:hover:text-blue-100 cursor-pointer"
            >
              Revisar ✓
            </button>
          )}
        </div>
      );
    }

    if (prov.origin === "PROFESSIONAL_REVIEWED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Revisado pelo profissional</span>
          {prov.reviewedBy && <span className="opacity-75">({prov.reviewedBy})</span>}
        </span>
      );
    }

    if (prov.origin === "PROFESSIONAL_RECORDED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
          <span>Registrado pelo profissional</span>
        </span>
      );
    }

    if (prov.origin === "NOT_APPLICABLE") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
          <span>Não se aplica</span>
        </span>
      );
    }

    // NOT_INFORMED: STRICT TRI-STATE — EMPTY NEVER MEANS "NO"
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        <span>Não informado</span>
      </span>
    );
  };

  const handleMarkReviewed = async (fieldName: string) => {
    if (!canAuthorNutrition) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await markPatientFieldReviewedAction(slug, detail.student.membershipPublicId, fieldName);
      if (res.success) {
        setProvenanceMap((prev) => ({
          ...prev,
          [fieldName]: {
            origin: "PROFESSIONAL_REVIEWED",
            label: "Revisado pelo profissional",
          },
        }));
        setFeedback({ type: "success", text: "Informação validada e registrada como revisada pelo profissional." });
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao revisar informação." });
      }
    });
  };

  // Clinical Note Handlers
  const handleSaveNote = async (status: "DRAFT" | "FINALIZED") => {
    if (!canAuthorNutrition) return;
    if (!newNoteContent.trim()) {
      setFeedback({ type: "error", text: "Digite o texto da anotação clínica antes de salvar." });
      return;
    }

    setIsSavingNote(true);
    setFeedback(null);

    const input: SaveClinicalNoteInput = {
      publicId: editingNoteId,
      noteDate: newNoteDate,
      contextType: newNoteContext,
      content: newNoteContent.trim(),
      conduct: newNoteConduct.trim() || null,
      status,
    };

    const res = await savePatientClinicalNoteAction(slug, detail.student.membershipPublicId, input);
    setIsSavingNote(false);

    if (res.success && res.note) {
      const savedNote = res.note;
      setClinicalNotes((prev) => {
        const filtered = prev.filter((n) => n.publicId !== savedNote.publicId);
        return [savedNote, ...filtered].sort((a, b) => b.noteDate.localeCompare(a.noteDate));
      });
      setNewNoteContent("");
      setNewNoteConduct("");
      setEditingNoteId(null);
      setFeedback({
        type: "success",
        text: status === "FINALIZED" ? "Anotação clínica finalizada e arquivada no prontuário." : "Rascunho de anotação salvo com sucesso.",
      });
    } else {
      setFeedback({ type: "error", text: res.error || "Erro ao salvar anotação clínica." });
    }
  };

  const handleFinalizeExistingNote = async (publicId: string) => {
    if (!canAuthorNutrition) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await finalizePatientClinicalNoteAction(slug, detail.student.membershipPublicId, publicId);
      if (res.success && res.note) {
        const finalized = res.note;
        setClinicalNotes((prev) =>
          prev.map((n) => (n.publicId === finalized.publicId ? finalized : n))
        );
        setFeedback({ type: "success", text: "Registro finalizado com sucesso. Conteúdo agora é imutável." });
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao finalizar registro." });
      }
    });
  };

  const handleDeleteNote = async (publicId: string) => {
    if (!canAuthorNutrition) return;
    if (!confirm("Deseja realmente excluir este rascunho de anotação?")) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await deletePatientClinicalNoteAction(slug, detail.student.membershipPublicId, publicId);
      if (res.success) {
        setClinicalNotes((prev) => prev.filter((n) => n.publicId !== publicId));
        if (editingNoteId === publicId) {
          setEditingNoteId(null);
          setNewNoteContent("");
          setNewNoteConduct("");
        }
        setFeedback({ type: "success", text: "Rascunho excluído." });
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao excluir anotação." });
      }
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* =================================================================== */}
      {/* TOP BAR: AUTOSAVE STATUS & NAV                                      */}
      {/* =================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface)] border border-[var(--border-default)] p-4 rounded-2xl shadow-2xs">
        <div className="flex items-center gap-3">
          {onBackToOverview && (
            <button
              type="button"
              onClick={onBackToOverview}
              className="text-xs font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1.5 cursor-pointer min-h-[38px] px-2 rounded-lg hover:bg-[var(--surface-subtle)]"
            >
              <span>← Visão Geral</span>
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <span>Registro Geral do Paciente</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Prontuário Unificado
              </span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Informações clínicas integradas com rastreabilidade de proveniência e histórico imutável.
            </p>
          </div>
        </div>

        {canAuthorNutrition && (
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <AutosaveIndicator
              status={autosaveStatus}
              errorMessage={autosaveError}
              onRetry={onRetryAutosave}
            />
          </div>
        )}
      </div>

      {/* FEEDBACK ALERT */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm border font-medium ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* =================================================================== */}
      {/* COCKPIT DE DADOS PRINCIPAIS DO PACIENTE (RESUMO SUPERIOR)           */}
      {/* =================================================================== */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-xl flex items-center justify-center border border-emerald-500/30 shrink-0">
              {detail.student.fullName ? detail.student.fullName.charAt(0).toUpperCase() : "P"}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)]">
                {detail.student.fullName}
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                {detail.student.email} · Paciente desde {formatDate(detail.student.joinedAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">Idade</span>
              <span className="font-extrabold text-[var(--text-primary)]">
                {ageYears !== null ? `${ageYears} anos` : "Não informada"}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">Sexo Biológico</span>
              <span className="font-extrabold text-[var(--text-primary)]">{bioSexLabel}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">Peso / Altura</span>
              <span className="font-extrabold text-[var(--text-primary)]">
                {currentWeightKg ? `${currentWeightKg} kg` : "—"} / {currentHeightCm ? `${currentHeightCm} cm` : "—"}
              </span>
            </div>
            {bmiValue !== null && (
              <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">IMC</span>
                <span className="font-extrabold text-[var(--text-primary)]">
                  {bmiValue.toFixed(1)} <span className="text-[10px] font-normal text-[var(--text-secondary)]">({bmiClassification?.category})</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* QUICK JUMP SUBNAV (DESKTOP & HORIZONTAL SCROLL MOBILE) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
          <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] shrink-0">Ir para:</span>
          <a href="#sec-reg-objetivo" className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] font-semibold text-[var(--text-primary)] shrink-0 transition-colors">1. Objetivo</a>
          <a href="#sec-reg-patologias" className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] font-semibold text-[var(--text-primary)] shrink-0 transition-colors">2. Patologias & Histórico</a>
          <a href="#sec-reg-medicamentos" className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] font-semibold text-[var(--text-primary)] shrink-0 transition-colors">3. Medicamentos & Suplementos</a>
          <a href="#sec-reg-habitos" className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] font-semibold text-[var(--text-primary)] shrink-0 transition-colors">4. Hábitos & Fisiologia</a>
          <a href="#sec-reg-preferencias" className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] font-semibold text-[var(--text-primary)] shrink-0 transition-colors">5. Preferências, Alergias & Intolerâncias</a>
          <a href="#sec-reg-gestacao" className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] font-semibold text-[var(--text-primary)] shrink-0 transition-colors">6. Gestação</a>
          <a href="#sec-reg-prequestionario" className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] font-semibold text-[var(--text-primary)] shrink-0 transition-colors">7. Pré-Questionário</a>
          <a href="#sec-reg-prontuario" className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold shrink-0 transition-colors">8. Prontuário & Observações</a>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. SEÇÃO: OBJETIVO & MOTIVAÇÃO                                      */}
      {/* =================================================================== */}
      <section id="sec-reg-objetivo" className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("objetivo")}>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center">1</span>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">Objetivo Principal & Motivação</h3>
              <p className="text-xs text-[var(--text-secondary)]">Meta declarada do paciente e observações de conduta clínica.</p>
            </div>
          </div>
          <button type="button" className="text-sm font-bold text-[var(--text-tertiary)] p-2">
            {openSections.objetivo ? "▲" : "▼"}
          </button>
        </div>

        {openSections.objetivo && (
          <div className="space-y-4 pt-3 border-t border-[var(--border-subtle)]">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Objetivo Declarado</label>
                {renderProvenanceBadge("mainObjective")}
              </div>
              <input
                type="text"
                disabled={!canAuthorNutrition}
                value={clinicalForm.mainObjective ?? detail.onboardingReference.mainObjective ?? ""}
                onChange={(e) => onUpdateField("mainObjective", e.target.value)}
                placeholder="Ex: Emagrecimento, hipertrofia, saúde intestinal, performance..."
                className="w-full text-sm font-semibold rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-[var(--text-primary)] min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Motivo do Acompanhamento / Queixa Principal</label>
                {renderProvenanceBadge("followUpReason")}
              </div>
              <textarea
                rows={2}
                disabled={!canAuthorNutrition}
                value={clinicalForm.followUpReason ?? ""}
                onChange={(e) => onUpdateField("followUpReason", e.target.value)}
                placeholder="Queixa principal, histórico de tentativas anteriores ou encaminhamento médico..."
                className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-[var(--text-primary)] resize-none"
              />
            </div>
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* 2. SEÇÃO: HISTÓRICO DE SAÚDE & PATOLOGIAS RELATADAS                */}
      {/* =================================================================== */}
      <section id="sec-reg-patologias" className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("patologias")}>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center">2</span>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">Histórico de Saúde & Patologias Relatadas</h3>
              <p className="text-xs text-[var(--text-secondary)]">Condições clínicas, histórico familiar e pregressas.</p>
            </div>
          </div>
          <button type="button" className="text-sm font-bold text-[var(--text-tertiary)] p-2">
            {openSections.patologias ? "▲" : "▼"}
          </button>
        </div>

        {openSections.patologias && (
          <div className="space-y-4 pt-3 border-t border-[var(--border-subtle)]">
            {/* CLINICAL DISCLAIMER */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-start gap-2.5">
              <span className="text-base leading-none">⚠️</span>
              <span>
                <strong>Aviso Clínico Importante:</strong> Informações relatadas pelo paciente em formulário não constituem diagnóstico médico confirmado sem laudo ou comprovação clínica anexada.
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Patologias e Condições Relatadas</label>
                {renderProvenanceBadge("diagnosedConditions")}
              </div>
              <textarea
                rows={2}
                disabled={!canAuthorNutrition}
                value={clinicalForm.diagnosedConditions ?? detail.onboardingReference.healthConditions ?? ""}
                onChange={(e) => onUpdateField("diagnosedConditions", e.target.value)}
                placeholder="Ex: Diabetes tipo 2, hipotireoidismo, hipertensão, SOP, gastrite..."
                className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-[var(--text-primary)] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Histórico Familiar</label>
                  {renderProvenanceBadge("familyHistory")}
                </div>
                <textarea
                  rows={2}
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.familyHistory ?? ""}
                  onChange={(e) => onUpdateField("familyHistory", e.target.value)}
                  placeholder="Doenças cardiovasculares, diabetes, neoplasias em parentes de 1º grau..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-[var(--text-primary)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Cirurgias & Internações Prévias</label>
                  {renderProvenanceBadge("previousSurgeries")}
                </div>
                <textarea
                  rows={2}
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.previousSurgeries ?? detail.onboardingReference.surgeries ?? ""}
                  onChange={(e) => onUpdateField("previousSurgeries", e.target.value)}
                  placeholder="Cirurgias prévias (bariátrica, vesícula, cesárea...) ou internações relevantes..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-[var(--text-primary)] resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* 3. SEÇÃO: MEDICAMENTOS E SUPLEMENTOS ATUAIS                         */}
      {/* =================================================================== */}
      <section id="sec-reg-medicamentos" className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("medicamentos")}>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center">3</span>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">Medicamentos e Suplementos de Uso Atual</h3>
              <p className="text-xs text-[var(--text-secondary)]">Uso habitual do paciente (separado estritamente das prescrições do plano alimentar).</p>
            </div>
          </div>
          <button type="button" className="text-sm font-bold text-[var(--text-tertiary)] p-2">
            {openSections.medicamentos ? "▲" : "▼"}
          </button>
        </div>

        {openSections.medicamentos && (
          <div className="space-y-4 pt-3 border-t border-[var(--border-subtle)]">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs font-medium">
              ℹ️ <strong>Segregação Clínica:</strong> Esta seção registra o que o paciente consome habitualmente por conta própria ou por indicação médica prévia. Prescrições nutricionais orientadas pelo nutricionista devem ser elaboradas na aba de Orientações do Plano Alimentar.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Medicamentos de Uso Contínuo</label>
                  {renderProvenanceBadge("currentMedications")}
                </div>
                <textarea
                  rows={3}
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.currentMedications ?? detail.onboardingReference.medications ?? ""}
                  onChange={(e) => onUpdateField("currentMedications", e.target.value)}
                  placeholder="Nome do fármaco, dosagem e horário (ex: Levotiroxina 50mcg em jejum)..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-[var(--text-primary)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">Suplementos de Uso Habitual</label>
                  {renderProvenanceBadge("supplements")}
                </div>
                <textarea
                  rows={3}
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.supplements ?? ""}
                  onChange={(e) => onUpdateField("supplements", e.target.value)}
                  placeholder="Suplementos que o paciente já toma rotineiramente (ex: Creatina 5g, Vitamina D 2000UI)..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-[var(--text-primary)] resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* 4. SEÇÃO: HÁBITOS, FISIOLOGIA & ESTILO DE VIDA                     */}
      {/* =================================================================== */}
      <section id="sec-reg-habitos" className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("habitos")}>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center">4</span>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">Hábitos, Fisiologia & Estilo de Vida</h3>
              <p className="text-xs text-[var(--text-secondary)]">Hidratação, sono, trânsito intestinal, tabagismo e consumo de bebidas.</p>
            </div>
          </div>
          <button type="button" className="text-sm font-bold text-[var(--text-tertiary)] p-2">
            {openSections.habitos ? "▲" : "▼"}
          </button>
        </div>

        {openSections.habitos && (
          <div className="space-y-4 pt-3 border-t border-[var(--border-subtle)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Água */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">💧 Ingestão de Água</label>
                  {renderProvenanceBadge("hydrationNotes")}
                </div>
                <input
                  type="text"
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.hydrationNotes ?? detail.onboardingReference.waterIntake ?? ""}
                  onChange={(e) => onUpdateField("hydrationNotes", e.target.value)}
                  placeholder="Ex: 2 a 2.5 litros/dia, dificuldade à noite..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 text-[var(--text-primary)] min-h-[44px]"
                />
              </div>

              {/* Sono */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">🌙 Qualidade do Sono</label>
                  {renderProvenanceBadge("sleepNotes")}
                </div>
                <input
                  type="text"
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.sleepNotes ?? detail.onboardingReference.sleepQuality ?? ""}
                  onChange={(e) => onUpdateField("sleepNotes", e.target.value)}
                  placeholder="Ex: 7h/noite, sono reparador, acorda 1x..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 text-[var(--text-primary)] min-h-[44px]"
                />
              </div>

              {/* Função Intestinal */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">⚖️ Função Intestinal</label>
                  {renderProvenanceBadge("bowelHabit")}
                </div>
                <input
                  type="text"
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.bowelHabit ?? clinicalForm.gastrointestinalNotes ?? detail.onboardingReference.bowelHabit ?? ""}
                  onChange={(e) => {
                    onUpdateField("bowelHabit", e.target.value);
                    onUpdateField("gastrointestinalNotes", e.target.value);
                  }}
                  placeholder="Ex: Diário (Bristol 3-4), constipado, distensão..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 text-[var(--text-primary)] min-h-[44px]"
                />
              </div>

              {/* Tabagismo */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">🚭 Tabagismo</label>
                  {renderProvenanceBadge("smokingStatus")}
                </div>
                <input
                  type="text"
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.smokingStatus ?? detail.onboardingReference.smoking ?? ""}
                  onChange={(e) => onUpdateField("smokingStatus", e.target.value)}
                  placeholder="Ex: Não fumante, ex-fumante, 5 cigarros/dia..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 text-[var(--text-primary)] min-h-[44px]"
                />
              </div>

              {/* Bebida Alcoólica */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">🍷 Consumo de Álcool</label>
                  {renderProvenanceBadge("alcoholNotes")}
                </div>
                <input
                  type="text"
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.alcoholNotes ?? detail.onboardingReference.alcoholFrequency ?? ""}
                  onChange={(e) => onUpdateField("alcoholNotes", e.target.value)}
                  placeholder="Ex: Não consome, socialmente aos sábados (vinho)..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 text-[var(--text-primary)] min-h-[44px]"
                />
              </div>

              {/* Atividade Física */}
              <div className="space-y-1.5 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">🏃 Atividade Física</label>
                  {renderProvenanceBadge("physicalActivityNotes")}
                </div>
                <input
                  type="text"
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.physicalActivityNotes ?? detail.onboardingReference.physicalActivity ?? ""}
                  onChange={(e) => onUpdateField("physicalActivityNotes", e.target.value)}
                  placeholder="Ex: Musculação 4x/sem, corrida aos domingos..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 text-[var(--text-primary)] min-h-[44px]"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* 5. SEÇÃO: PREFERÊNCIAS, ALERGIAS E INTOLERÂNCIAS                    */}
      {/* =================================================================== */}
      <section id="sec-reg-preferencias" className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("preferencias")}>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center">5</span>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">Preferências, Alergias e Intolerâncias</h3>
              <p className="text-xs text-[var(--text-secondary)]">Alergias e intolerâncias tratadas e registradas separadamente.</p>
            </div>
          </div>
          <button type="button" className="text-sm font-bold text-[var(--text-tertiary)] p-2">
            {openSections.preferencias ? "▲" : "▼"}
          </button>
        </div>

        {openSections.preferencias && (
          <div className="space-y-4 pt-3 border-t border-[var(--border-subtle)]">
            {/* ALERGIAS vs INTOLERÂNCIAS (SEPARADAS CLARA E EXPLICITAMENTE) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Alergias */}
              <div className="space-y-2 p-4 rounded-2xl bg-red-500/5 border border-red-500/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <label className="text-xs font-bold uppercase text-red-700 dark:text-red-300">Alergias Alimentares</label>
                  </div>
                  {renderProvenanceBadge("allergies")}
                </div>
                <textarea
                  rows={2}
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.allergies ?? detail.onboardingReference.foodAllergies ?? ""}
                  onChange={(e) => onUpdateField("allergies", e.target.value)}
                  placeholder="Reações alérgicas IgE mediadas (ex: amendoim, frutos do mar, leite, ovos)..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-red-500/30 bg-[var(--surface)] p-3 text-[var(--text-primary)] resize-none"
                />
                <span className="text-[10px] text-red-600/80 dark:text-red-400/80 block">
                  Alergias envolvem resposta imunológica e risco de anafilaxia.
                </span>
              </div>

              {/* Intolerâncias */}
              <div className="space-y-2 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <label className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300">Intolerâncias Alimentares</label>
                  </div>
                  {renderProvenanceBadge("foodIntolerances")}
                </div>
                <textarea
                  rows={2}
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.foodIntolerances ?? clinicalForm.foodAllergiesIntolerances ?? detail.onboardingReference.foodIntolerances ?? ""}
                  onChange={(e) => {
                    onUpdateField("foodIntolerances", e.target.value);
                    onUpdateField("foodAllergiesIntolerances", e.target.value);
                  }}
                  placeholder="Dificuldades enzimáticas ou digestivas (ex: lactose, sensibilidade ao glúten, FODMAPs)..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-amber-500/30 bg-[var(--surface)] p-3 text-[var(--text-primary)] resize-none"
                />
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 block">
                  Intolerâncias alimentares são digestivas/enzimáticas, separadas das alergias.
                </span>
              </div>
            </div>

            {/* PREFERÊNCIAS vs AVERSÕES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">❤️ Alimentos Preferidos</label>
                  {renderProvenanceBadge("foodPreferences")}
                </div>
                <textarea
                  rows={2}
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.foodPreferences ?? detail.onboardingReference.preferredFoods ?? ""}
                  onChange={(e) => onUpdateField("foodPreferences", e.target.value)}
                  placeholder="Alimentos que facilitam a adesão e o paciente gosta de comer..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-[var(--text-primary)] resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold uppercase text-[var(--text-secondary)]">🚫 Alimentos Mal Aceitos / Aversões</label>
                  {renderProvenanceBadge("dislikedFoods")}
                </div>
                <textarea
                  rows={2}
                  disabled={!canAuthorNutrition}
                  value={clinicalForm.dislikedFoods ?? detail.onboardingReference.dislikedFoods ?? ""}
                  onChange={(e) => onUpdateField("dislikedFoods", e.target.value)}
                  placeholder="Alimentos com má palatabilidade, aversão sensorial ou náusea..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] p-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 text-[var(--text-primary)] resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* 6. SEÇÃO: SAÚDE DA MULHER & GESTAÇÃO                                */}
      {/* =================================================================== */}
      <section id="sec-reg-gestacao" className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("gestacao")}>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold text-sm flex items-center justify-center">6</span>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">Saúde da Mulher & Período Gestacional</h3>
              <p className="text-xs text-[var(--text-secondary)]">Rastreamento obstétrico com data de referência preservada sem projeção fictícia.</p>
            </div>
          </div>
          <button type="button" className="text-sm font-bold text-[var(--text-tertiary)] p-2">
            {openSections.gestacao ? "▲" : "▼"}
          </button>
        </div>

        {openSections.gestacao && (
          <div className="space-y-4 pt-3 border-t border-[var(--border-subtle)]">
            {detail.resolvedBiologicalSex === "MALE" ? (
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
                <span>ℹ️</span>
                <span>Registro gestacional classificado como <strong>Não se aplica</strong> para pacientes do sexo biológico masculino.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">Status Gestacional</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] block">
                      {detail.pregnancy?.pregnancyStatus === "PREGNANT"
                        ? "Gestante"
                        : detail.pregnancy?.pregnancyStatus === "POSTPARTUM"
                        ? "Pós-parto / Lactante"
                        : "Não gestante"}
                    </span>
                    {renderProvenanceBadge("pregnancyStatus")}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">Semanas Gestacionais</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] block">
                      {detail.pregnancy?.gestationalWeeks
                        ? `${detail.pregnancy.gestationalWeeks} semanas`
                        : "Não informado"}
                    </span>
                    {renderProvenanceBadge("gestationalWeeks")}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[var(--text-tertiary)] block">Data de Referência</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] block">
                      {detail.pregnancy?.gestationalReferenceDate
                        ? formatDate(detail.pregnancy.gestationalReferenceDate)
                        : formatDate(detail.pregnancy?.updatedAt)}
                    </span>
                    <span className="text-[10px] text-[var(--text-tertiary)] block">
                      Data exata em que o período foi informado.
                    </span>
                  </div>
                </div>

                {detail.pregnancy?.pregnancyStatus === "PREGNANT" && (
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-800 dark:text-purple-300 text-xs space-y-1">
                    <p className="font-bold">🛡️ Preservação Temporal Estrita:</p>
                    <p>
                      As semanas gestacionais exibidas preservam a data de referência em que foram aferidas. O sistema não projeta semanas futuras automaticamente sem validação clínica presencial ou remota com o profissional de saúde.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* 7. SEÇÃO: PRÉ-QUESTIONÁRIO NUTRICIONAL (ETAPA 10)                   */}
      {/* =================================================================== */}
      <section id="sec-reg-prequestionario" className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("prequestionario")}>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-sm flex items-center justify-center">7</span>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">Pré-Questionário Nutricional</h3>
              <p className="text-xs text-[var(--text-secondary)]">Envio de questionário clínico antes da consulta, rascunho automático e comparação lado a lado (Diff).</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canAuthorNutrition && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSendPreQuestionnaireModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[36px]"
              >
                <span>+ Enviar Pré-Questionário</span>
              </button>
            )}
            <button type="button" className="text-sm font-bold text-[var(--text-tertiary)] p-2">
              {openSections.prequestionario ? "▲" : "▼"}
            </button>
          </div>
        </div>

        {openSections.prequestionario && (
          <div className="space-y-4 pt-3 border-t border-[var(--border-subtle)] text-xs">
            {/* List of Sent Pre-Questionnaires */}
            {preQuestionnaires.length > 0 ? (
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] block">
                  Questionários Nutricionais Enviados ({preQuestionnaires.length})
                </span>

                <div className="space-y-2.5">
                  {preQuestionnaires.map((pq) => {
                    const isAnswered = pq.status === "ANSWERED";
                    const isReviewed = pq.status === "REVIEWED";
                    const isSent = pq.status === "SENT";
                    const isInProgress = pq.status === "IN_PROGRESS";
                    const isCancelled = pq.status === "CANCELLED";

                    return (
                      <div
                        key={pq.publicId}
                        className={`p-4 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isAnswered
                            ? "bg-emerald-500/10 border-emerald-500/30 shadow-xs"
                            : isReviewed
                            ? "bg-[var(--surface-subtle)] border-emerald-500/20"
                            : isCancelled
                            ? "bg-[var(--surface-subtle)] border-[var(--border-subtle)] opacity-70"
                            : "bg-[var(--surface-subtle)] border-[var(--border-subtle)]"
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                              {pq.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                isAnswered
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                  : isReviewed
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : isInProgress
                                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                  : isCancelled
                                  ? "bg-zinc-500/15 text-zinc-500"
                                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {pq.statusLabel || pq.status}
                            </span>
                          </div>

                          <p className="text-[11px] text-[var(--text-tertiary)] flex flex-wrap items-center gap-2">
                            <span>Solicitado por {pq.requestedByName}</span>
                            {pq.sentAt && <span>• Enviado em {formatDate(pq.sentAt)}</span>}
                            {pq.submittedAt && (
                              <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                • Respondido em {formatDate(pq.submittedAt)}
                              </span>
                            )}
                            {pq.consultationDate && (
                              <span>• Consulta: {formatDate(pq.consultationDate)}</span>
                            )}
                          </p>
                        </div>

                        {/* Actions per Status */}
                        <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-[var(--border-subtle)]">
                          {isAnswered && (
                            <button
                              type="button"
                              onClick={() => setReviewingQuestionnairePublicId(pq.publicId)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[38px]"
                            >
                              <span>Revisar Respostas (Comparar Diff) →</span>
                            </button>
                          )}

                          {isReviewed && (
                            <button
                              type="button"
                              onClick={() => setReviewingQuestionnairePublicId(pq.publicId)}
                              className="px-3.5 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-500/20 transition-colors cursor-pointer min-h-[38px]"
                            >
                              <span>Ver Comparação Diff</span>
                            </button>
                          )}

                          {(isSent || isInProgress) && canAuthorNutrition && (
                            <button
                              type="button"
                              disabled={isCancelingId === pq.publicId}
                              onClick={() => handleCancelQuestionnaire(pq.publicId)}
                              className="px-3 py-1.5 rounded-xl border border-[var(--border-default)] hover:bg-destructive/10 text-xs font-semibold text-[var(--text-secondary)] hover:text-destructive transition-colors min-h-[38px]"
                            >
                              {isCancelingId === pq.publicId ? "Cancelando..." : "Cancelar envio"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center mx-auto text-base">
                  📋
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">
                    Nenhum pré-questionário enviado ainda
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Envie perguntas personalizadas para o paciente responder antes da consulta. O paciente poderá salvar o rascunho automaticamente e suas respostas serão apresentadas em comparação lado a lado para integração segura com o Registro Geral.
                  </p>
                </div>
                {canAuthorNutrition && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsSendPreQuestionnaireModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[40px]"
                    >
                      <span>+ Enviar Pré-Questionário</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Existing Onboarding Reference Banner */}
            {detail.onboardingReference.hasOnboardingData && (
              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold flex items-center gap-2 text-[var(--text-primary)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Questionário Inicial / Onboarding do Cadastro
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                    Submetido em: {formatDate(detail.onboardingReference.submittedAt)}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Os dados iniciais do cadastro foram identificados como <em>Relatado pelo paciente</em> no prontuário.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Modals: Send & Review Diff (Etapa 10) */}
      {isSendPreQuestionnaireModalOpen && (
        <SendPreQuestionnaireModal
          slug={slug}
          studentMembershipPublicId={detail.student.membershipPublicId}
          studentName={detail.student.fullName}
          studentEmail={detail.student.email}
          biologicalSex={detail.resolvedBiologicalSex}
          isOpen={isSendPreQuestionnaireModalOpen}
          onClose={() => setIsSendPreQuestionnaireModalOpen(false)}
          onSuccess={() => {
            // Optimistically update list
            window.location.reload();
          }}
        />
      )}

      {reviewingQuestionnairePublicId && (
        <ReviewPreQuestionnaireDiffModal
          slug={slug}
          questionnairePublicId={reviewingQuestionnairePublicId}
          isOpen={Boolean(reviewingQuestionnairePublicId)}
          onClose={() => setReviewingQuestionnairePublicId(null)}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {/* =================================================================== */}
      {/* 8. SEÇÃO: PRONTUÁRIO & OBSERVAÇÕES CLÍNICAS (HISTÓRICO & CONDUTA)   */}
      {/* =================================================================== */}
      <section id="sec-reg-prontuario" className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("prontuario")}>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm flex items-center justify-center">8</span>
            <div>
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">Prontuário & Observações da Consulta</h3>
              <p className="text-xs text-[var(--text-secondary)]">Linha do tempo de atendimentos, anotações de evolução e condutas clínicas.</p>
            </div>
          </div>
          <button type="button" className="text-sm font-bold text-[var(--text-tertiary)] p-2">
            {openSections.prontuario ? "▲" : "▼"}
          </button>
        </div>

        {openSections.prontuario && (
          <div className="space-y-6 pt-3 border-t border-[var(--border-subtle)]">
            {/* EDITOR DE NOVA ANOTAÇÃO CLÍNICA COM AUTOSAVE EM RASCUNHO */}
            {canAuthorNutrition && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                    <span>{editingNoteId ? "Editar Anotação Clínica" : "+ Nova Anotação no Prontuário"}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      Rascunho com Autosave
                    </span>
                  </h4>
                  {editingNoteId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNoteId(null);
                        setNewNoteContent("");
                        setNewNoteConduct("");
                      }}
                      className="text-xs font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Data do Atendimento</label>
                    <input
                      type="date"
                      value={newNoteDate}
                      onChange={(e) => setNewNoteDate(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 font-semibold text-[var(--text-primary)] min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">Contexto do Atendimento</label>
                    <select
                      value={newNoteContext}
                      onChange={(e) => setNewNoteContext(e.target.value as ClinicalNoteContextType)}
                      className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-2.5 font-semibold text-[var(--text-primary)] min-h-[44px]"
                    >
                      <option value="INITIAL">{CLINICAL_NOTE_CONTEXT_LABELS.INITIAL}</option>
                      <option value="FOLLOW_UP">{CLINICAL_NOTE_CONTEXT_LABELS.FOLLOW_UP}</option>
                      <option value="ROUTINE">{CLINICAL_NOTE_CONTEXT_LABELS.ROUTINE}</option>
                      <option value="SPONTANEOUS">{CLINICAL_NOTE_CONTEXT_LABELS.SPONTANEOUS}</option>
                      <option value="INTERDISCIPLINARY">{CLINICAL_NOTE_CONTEXT_LABELS.INTERDISCIPLINARY}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Observações Clínicas & Queixas</label>
                  <textarea
                    rows={3}
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Relato clínico, sintomas referidos, evolução da queixa principal..."
                    className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-3 text-[var(--text-primary)] resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Conduta Nutricional & Próximas Metas</label>
                  <textarea
                    rows={2}
                    value={newNoteConduct}
                    onChange={(e) => setNewNoteConduct(e.target.value)}
                    placeholder="Conduta prescrita, ajustes na rotina, orientações complementares..."
                    className="w-full text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-3 text-[var(--text-primary)] resize-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
                  <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                    🔒 Nota interna confidencial do profissional (não exposta ao aluno)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSavingNote || !newNoteContent.trim()}
                      onClick={() => handleSaveNote("DRAFT")}
                      className="px-4 py-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50 min-h-[42px]"
                    >
                      {isSavingNote ? "Salvando..." : "Salvar Rascunho"}
                    </button>

                    <button
                      type="button"
                      disabled={isSavingNote || !newNoteContent.trim()}
                      onClick={() => handleSaveNote("FINALIZED")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 min-h-[42px]"
                    >
                      Finalizar Registro
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LINHA DO TEMPO CRONOLÓGICA DAS ANOTAÇÕES E ATENDIMENTOS */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-extrabold text-[var(--text-tertiary)] tracking-wider">
                Linha do Tempo de Atendimentos & Registros ({clinicalNotes.length})
              </h4>

              {clinicalNotes.length === 0 ? (
                <div className="p-5 rounded-2xl bg-[var(--surface-subtle)] text-center text-xs text-[var(--text-tertiary)]">
                  Nenhuma anotação clínica ou evolução registrada no prontuário ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {clinicalNotes.map((note) => (
                    <div
                      key={note.publicId}
                      className={`p-4 rounded-2xl border transition-all ${
                        note.status === "DRAFT"
                          ? "bg-amber-500/5 border-amber-500/30"
                          : "bg-[var(--surface-subtle)] border-[var(--border-subtle)]"
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-[var(--border-subtle)] text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-[var(--text-primary)]">
                            {formatDate(note.noteDate)}
                          </span>
                          <span className="px-2 py-0.5 rounded-md font-semibold bg-[var(--surface)] border border-[var(--border-default)] text-[10px] text-[var(--text-secondary)]">
                            {note.contextTypeLabel}
                          </span>
                          <span className="text-[11px] text-[var(--text-tertiary)]">
                            por {note.authorName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              note.status === "FINALIZED"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {note.statusLabel}
                          </span>

                          {note.status === "DRAFT" && canAuthorNutrition && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteId(note.publicId);
                                  setNewNoteDate(note.noteDate);
                                  setNewNoteContext(note.contextType);
                                  setNewNoteContent(note.content);
                                  setNewNoteConduct(note.conduct || "");
                                  window.scrollTo({ top: document.getElementById("sec-reg-prontuario")?.offsetTop || 0, behavior: "smooth" });
                                }}
                                className="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFinalizeExistingNote(note.publicId)}
                                className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                              >
                                Finalizar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteNote(note.publicId)}
                                className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
                              >
                                Excluir
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 space-y-2 text-xs sm:text-sm">
                        <div className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                          {note.content}
                        </div>
                        {note.conduct && (
                          <div className="p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                            <strong className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-0.5">Conduta Registrada:</strong>
                            <span className="whitespace-pre-wrap">{note.conduct}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AUDITORIA E RASTREABILIDADE DAS ALTERAÇÕES */}
            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleSection("auditoria")}>
                <span className="text-xs uppercase font-extrabold text-[var(--text-tertiary)] tracking-wider">
                  Histórico de Rastreabilidade dos Dados Gerais ({detail.recentAuditTrail?.length || 0})
                </span>
                <button type="button" className="text-xs font-bold text-[var(--text-tertiary)]">
                  {openSections.auditoria ? "Ocultar ▲" : "Ver alterações ▼"}
                </button>
              </div>

              {openSections.auditoria && (
                <div className="space-y-2 pt-2 text-xs">
                  {detail.recentAuditTrail && detail.recentAuditTrail.length > 0 ? (
                    <div className="space-y-1.5">
                      {detail.recentAuditTrail.map((audit) => (
                        <div
                          key={audit.publicId}
                          className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-2"
                        >
                          <div>
                            <span className="font-bold text-[var(--text-primary)]">{audit.fieldLabel}: </span>
                            <span className="text-[var(--text-secondary)] line-through mr-1 opacity-75">{audit.previousValue || "Vazio"}</span>
                            <span>→ </span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{audit.newValue || "Vazio"}</span>
                          </div>
                          <span className="text-[10px] text-[var(--text-tertiary)]">
                            {formatDate(audit.createdAt)} por {audit.changedByName}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      Nenhuma alteração registrada após a criação inicial.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
