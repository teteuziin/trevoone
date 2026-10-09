"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  ConsultationType,
  AdherenceLevel,
  CreateClinicalConsultationInput,
  UpdateClinicalConsultationInput,
  ClinicalConsultationDetailDto,
} from "@/lib/nutrition-v2/clinical-consultation-types";
import {
  createClinicalConsultationAction,
  updateClinicalConsultationDraftAction,
  completeClinicalConsultationAction,
  cancelClinicalConsultationAction,
} from "@/app/consultoria/[slug]/planos-v2/consultation-actions";
import { addAnthropometricEntryAction } from "@/app/consultoria/[slug]/planos-v2/patient-actions";
import type { PatientAnthropometricEntry } from "@/lib/nutrition-v2/patient-record-types";

interface ClinicalConsultationModalProps {
  slug: string;
  studentPublicId: string;
  studentName: string;
  existingConsultationDetail?: ClinicalConsultationDetailDto | null;
  suggestedType?: ConsultationType;
  availableAnthropometrics?: PatientAnthropometricEntry[];
  initialAppointmentPublicId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ClinicalConsultationModal({
  slug,
  studentPublicId,
  studentName,
  existingConsultationDetail,
  suggestedType = "INITIAL",
  availableAnthropometrics = [],
  initialAppointmentPublicId = null,
  isOpen,
  onClose,
  onSuccess,
}: ClinicalConsultationModalProps) {
  const isEditingDraft = Boolean(existingConsultationDetail && existingConsultationDetail.consultation.status === "DRAFT");

  const [consultationType, setConsultationType] = useState<ConsultationType>(() => {
    return existingConsultationDetail?.consultation.consultationType || suggestedType;
  });

  const [consultationDate, setConsultationDate] = useState<string>(() => {
    if (existingConsultationDetail?.consultation.consultationDate) {
      return existingConsultationDetail.consultation.consultationDate.slice(0, 16);
    }
    const now = new Date();
    // format YYYY-MM-DDTHH:mm
    const tzOffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });

  const [selectedAnthroPublicId, setSelectedAnthroPublicId] = useState<string>(() => {
    return existingConsultationDetail?.anthropometricsSnapshot?.publicId || "";
  });

  const [planAdjusted, setPlanAdjusted] = useState<boolean | null>(() => {
    return existingConsultationDetail?.consultation.planAdjusted ?? null;
  });

  const [adherence, setAdherence] = useState<AdherenceLevel>(() => {
    return existingConsultationDetail?.consultation.adherence || "NOT_ASSESSED";
  });

  const [adherenceNotes, setAdherenceNotes] = useState<string>(() => {
    return existingConsultationDetail?.consultation.adherenceNotes || "";
  });

  const [difficulties, setDifficulties] = useState<string>(() => {
    return existingConsultationDetail?.consultation.difficulties || "";
  });

  const [symptomsObservations, setSymptomsObservations] = useState<string>(() => {
    return existingConsultationDetail?.consultation.symptomsObservations || "";
  });

  const [conduct, setConduct] = useState<string>(() => {
    return existingConsultationDetail?.consultation.conduct || "";
  });

  const [nextGoals, setNextGoals] = useState<string>(() => {
    return existingConsultationDetail?.consultation.nextGoals || "";
  });

  const [recommendedReturnDate, setRecommendedReturnDate] = useState<string>(() => {
    return existingConsultationDetail?.consultation.recommendedReturnDate || "";
  });

  // Quick anthropometry recording form inside consultation
  const [showQuickAnthro, setShowQuickAnthro] = useState(false);
  const [quickWeight, setQuickWeight] = useState("");
  const [quickHeight, setQuickHeight] = useState("");
  const [quickWaist, setQuickWaist] = useState("");
  const [quickHip, setQuickHip] = useState("");

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveDraft = async () => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        if (isEditingDraft && existingConsultationDetail) {
          const input: UpdateClinicalConsultationInput = {
            consultationType,
            consultationDate: new Date(consultationDate).toISOString(),
            anthropometricEntryPublicId: selectedAnthroPublicId || null,
            planAdjusted,
            adherence,
            adherenceNotes: adherenceNotes.trim() || null,
            difficulties: difficulties.trim() || null,
            symptomsObservations: symptomsObservations.trim() || null,
            conduct: conduct.trim() || null,
            nextGoals: nextGoals.trim() || null,
            recommendedReturnDate: recommendedReturnDate.trim() || null,
          };
          const res = await updateClinicalConsultationDraftAction(
            slug,
            existingConsultationDetail.consultation.publicId,
            input
          );
          if (res.success) {
            onSuccess();
          } else {
            setErrorMessage(res.error);
          }
        } else {
          const input: CreateClinicalConsultationInput = {
            consultationType,
            consultationDate: new Date(consultationDate).toISOString(),
            consultationAppointmentPublicId: initialAppointmentPublicId || null,
            anthropometricEntryPublicId: selectedAnthroPublicId || null,
            planAdjusted,
            adherence,
            adherenceNotes: adherenceNotes.trim() || null,
            difficulties: difficulties.trim() || null,
            symptomsObservations: symptomsObservations.trim() || null,
            conduct: conduct.trim() || null,
            nextGoals: nextGoals.trim() || null,
            recommendedReturnDate: recommendedReturnDate.trim() || null,
          };
          const res = await createClinicalConsultationAction(slug, studentPublicId, input);
          if (res.success) {
            onSuccess();
          } else {
            setErrorMessage(res.error);
          }
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao salvar rascunho.");
      }
    });
  };

  const handleComplete = async () => {
    setErrorMessage(null);

    // Save latest inputs first, then complete
    startTransition(async () => {
      try {
        let targetPublicId = existingConsultationDetail?.consultation.publicId;

        if (!targetPublicId) {
          // Create draft first
          const input: CreateClinicalConsultationInput = {
            consultationType,
            consultationDate: new Date(consultationDate).toISOString(),
            consultationAppointmentPublicId: initialAppointmentPublicId || null,
            anthropometricEntryPublicId: selectedAnthroPublicId || null,
            planAdjusted,
            adherence,
            adherenceNotes: adherenceNotes.trim() || null,
            difficulties: difficulties.trim() || null,
            symptomsObservations: symptomsObservations.trim() || null,
            conduct: conduct.trim() || null,
            nextGoals: nextGoals.trim() || null,
            recommendedReturnDate: recommendedReturnDate.trim() || null,
          };
          const createRes = await createClinicalConsultationAction(slug, studentPublicId, input);
          if (!createRes.success) {
            setErrorMessage(createRes.error);
            return;
          }
          targetPublicId = createRes.data.consultationPublicId;
        } else {
          // Update draft first
          const updateInput: UpdateClinicalConsultationInput = {
            consultationType,
            consultationDate: new Date(consultationDate).toISOString(),
            anthropometricEntryPublicId: selectedAnthroPublicId || null,
            planAdjusted,
            adherence,
            adherenceNotes: adherenceNotes.trim() || null,
            difficulties: difficulties.trim() || null,
            symptomsObservations: symptomsObservations.trim() || null,
            conduct: conduct.trim() || null,
            nextGoals: nextGoals.trim() || null,
            recommendedReturnDate: recommendedReturnDate.trim() || null,
          };
          const updateRes = await updateClinicalConsultationDraftAction(slug, targetPublicId, updateInput);
          if (!updateRes.success) {
            setErrorMessage(updateRes.error);
            return;
          }
        }

        const compRes = await completeClinicalConsultationAction(slug, targetPublicId);
        if (compRes.success) {
          onSuccess();
        } else {
          setErrorMessage(compRes.error);
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao finalizar consulta.");
      }
    });
  };

  const handleCancelDraft = async () => {
    if (!existingConsultationDetail) {
      onClose();
      return;
    }
    const ok = window.confirm("Deseja realmente cancelar este rascunho de consulta?");
    if (!ok) return;

    startTransition(async () => {
      const res = await cancelClinicalConsultationAction(
        slug,
        existingConsultationDetail.consultation.publicId,
        "Cancelado pelo profissional durante atendimento"
      );
      if (res.success) {
        onSuccess();
      } else {
        setErrorMessage(res.error);
      }
    });
  };

  const handleSaveQuickAnthro = async () => {
    const w = parseFloat(quickWeight);
    if (isNaN(w) || w <= 0) {
      setErrorMessage("Informe um peso válido.");
      return;
    }
    startTransition(async () => {
      try {
        const todayDate = consultationDate.slice(0, 10);
        const res = await addAnthropometricEntryAction(slug, studentPublicId, {
          measurementDate: todayDate,
          weightKg: w,
          heightCm: quickHeight ? parseFloat(quickHeight) : undefined,
          waistCm: quickWaist ? parseFloat(quickWaist) : undefined,
          hipCm: quickHip ? parseFloat(quickHip) : undefined,
          notes: "Medição realizada durante a consulta clínica",
        });
        if (res.success) {
          setShowQuickAnthro(false);
          setQuickWeight("");
        } else {
          setErrorMessage(res.error || "Erro ao registrar medição antropométrica.");
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao salvar medição.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-secondary)]/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {isEditingDraft ? "Editar Consulta em Andamento" : "Nova Consulta Clínica"}
              </h2>
              <Badge variant="neutral" className="text-xs">
                {consultationType === "INITIAL" ? "Inicial" : "Retorno"}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Paciente: <span className="font-semibold text-[var(--text-primary)]">{studentName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="px-5 py-2.5 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* Form Body - 5 Logical Blocks */}
        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* BLOCO 1: Atendimento */}
          <section className="space-y-3 pb-5 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]"></span>
              1. Identificação do Atendimento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Tipo de Consulta
                </label>
                <div className="flex rounded-lg p-0.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setConsultationType("INITIAL")}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      consultationType === "INITIAL"
                        ? "bg-[var(--accent-primary)] text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Consulta inicial
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultationType("FOLLOW_UP")}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                      consultationType === "FOLLOW_UP"
                        ? "bg-[var(--accent-primary)] text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    Retorno
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Data e Hora do Atendimento
                </label>
                <input
                  type="datetime-local"
                  value={consultationDate}
                  onChange={(e) => setConsultationDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>
          </section>

          {/* BLOCO 2: Evolução & Antropometria */}
          <section className="space-y-3 pb-5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]"></span>
                2. Antropometria & Evolução do Momento
              </h3>
              {!showQuickAnthro && (
                <button
                  type="button"
                  onClick={() => setShowQuickAnthro(true)}
                  className="text-xs text-[var(--accent-primary)] hover:underline font-medium"
                >
                  + Nova medição
                </button>
              )}
            </div>

            {/* Quick Anthro form */}
            {showQuickAnthro ? (
              <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--accent-primary)]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Registrar Antropometria do Atendimento
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickAnthro(false)}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Peso (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="65.0"
                      value={quickWeight}
                      onChange={(e) => setQuickWeight(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Altura (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="170"
                      value={quickHeight}
                      onChange={(e) => setQuickHeight(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Cintura (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="78"
                      value={quickWaist}
                      onChange={(e) => setQuickWaist(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--text-secondary)] mb-0.5">Quadril (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="98"
                      value={quickHip}
                      onChange={(e) => setQuickHip(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={handleSaveQuickAnthro} disabled={isPending} className="w-full text-xs">
                  Salvar e Vincular à Consulta
                </Button>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Medição Antropométrica Associada
                </label>
                <select
                  value={selectedAnthroPublicId}
                  onChange={(e) => setSelectedAnthroPublicId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="">Nenhuma medição selecionada</option>
                  {availableAnthropometrics.map((a) => (
                    <option key={a.publicId} value={a.publicId}>
                      {a.measurementDate} — {a.weightKg !== null ? `${a.weightKg} kg` : "Sem peso"}
                      {a.waistCm ? ` (Cintura: ${a.waistCm}cm)` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Evolution Comparison Info */}
            {existingConsultationDetail?.evolution && (
              <div className="p-3 rounded-lg bg-[var(--surface-secondary)]/70 border border-[var(--border-subtle)] text-xs space-y-1">
                <span className="font-semibold text-[var(--text-secondary)] text-[11px] block">
                  Evolução Clínica vs Último Atendimento Concluído:
                </span>
                {existingConsultationDetail.evolution.hasComparison ? (
                  <div className="flex items-center gap-3 text-[var(--text-primary)]">
                    <span>
                      Anterior: <strong>{existingConsultationDetail.evolution.previousWeightKg} kg</strong>
                    </span>
                    <span>→</span>
                    <span>
                      Atual: <strong>{existingConsultationDetail.evolution.currentWeightKg} kg</strong>
                    </span>
                    <span
                      className={`font-bold ${
                        (existingConsultationDetail.evolution.weightDeltaKg || 0) <= 0
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {existingConsultationDetail.evolution.weightDeltaKg! > 0 ? "+" : ""}
                      {existingConsultationDetail.evolution.weightDeltaKg} kg (
                      {existingConsultationDetail.evolution.weightDeltaPercent! > 0 ? "+" : ""}
                      {existingConsultationDetail.evolution.weightDeltaPercent}%)
                    </span>
                  </div>
                ) : (
                  <p className="text-[var(--text-secondary)] italic">
                    {existingConsultationDetail.evolution.message || "Sem comparação disponível"}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* BLOCO 3: Adesão e Dificuldades */}
          <section className="space-y-3 pb-5 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]"></span>
              3. Adesão & Dificuldades
            </h3>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Nível de Adesão à Dieta
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  [
                    { id: "NOT_ASSESSED", label: "Não avaliada" },
                    { id: "LOW", label: "Baixa" },
                    { id: "MODERATE", label: "Moderada" },
                    { id: "HIGH", label: "Alta" },
                  ] as const
                ).map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setAdherence(lvl.id)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg border text-center transition-all ${
                      adherence === lvl.id
                        ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary)] font-bold shadow-sm"
                        : "bg-[var(--surface-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Observações sobre a Adesão
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Seguiu bem o café da manhã, mas relatou escapes no fim de semana..."
                value={adherenceNotes}
                onChange={(e) => setAdherenceNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Principais Dificuldades Relatadas
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Fome no período da noite, dificuldade para preparar o jantar..."
                value={difficulties}
                onChange={(e) => setDifficulties(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
              />
            </div>
          </section>

          {/* BLOCO 4: Sintomas & Conduta Nutricional */}
          <section className="space-y-3 pb-5 border-b border-[var(--border-subtle)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]"></span>
              4. Registro Clínico & Conduta
            </h3>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Sintomas / Observações do Atendimento
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Queixa de constipação há 4 dias, sono irregular, boa disposição nos treinos..."
                value={symptomsObservations}
                onChange={(e) => setSymptomsObservations(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Conduta Nutricional *
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Aumentar ingestão hídrica para 2.5L/dia, incluir sementes de chia no café da manhã e ajustar o aporte proteico do jantar..."
                value={conduct}
                onChange={(e) => setConduct(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Metas & Objetivos até o Próximo Retorno
              </label>
              <textarea
                rows={2}
                placeholder="- Manter café da manhã diariamente&#10;- Bater a meta de água&#10;- Anotar escapes"
                value={nextGoals}
                onChange={(e) => setNextGoals(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
              />
            </div>
          </section>

          {/* BLOCO 5: Plano Alimentar & Próximos Passos */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]"></span>
              5. Plano & Retorno
            </h3>

            {/* Plano snapshot info */}
            {existingConsultationDetail?.planSnapshot && (
              <div className="p-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[var(--text-secondary)] block">
                    Plano Vigente ao Iniciar Atendimento
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {existingConsultationDetail.planSnapshot.planTitle} (v
                    {existingConsultationDetail.planSnapshot.versionNumber})
                  </span>
                </div>
                <a
                  href={`/consultoria/${slug}/planos-v2/${existingConsultationDetail.planSnapshot.planPublicId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[var(--accent-primary)] hover:underline font-medium"
                >
                  Abrir plano ↗
                </a>
              </div>
            )}

            {/* Plan adjusted selector */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                O Plano Alimentar foi Alterado neste Atendimento?
              </label>
              <div className="flex rounded-lg p-0.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setPlanAdjusted(null)}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                    planAdjusted === null
                      ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm font-semibold"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  Não informado
                </button>
                <button
                  type="button"
                  onClick={() => setPlanAdjusted(false)}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                    planAdjusted === false
                      ? "bg-slate-700 text-white shadow-sm font-semibold"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  Não
                </button>
                <button
                  type="button"
                  onClick={() => setPlanAdjusted(true)}
                  className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${
                    planAdjusted === true
                      ? "bg-[var(--accent-primary)] text-white shadow-sm font-semibold"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  Sim
                </button>
              </div>
            </div>

            {/* Recommended Return */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Data do Retorno Recomendado (Sugestão Clínica)
              </label>
              <input
                type="date"
                value={recommendedReturnDate}
                onChange={(e) => setRecommendedReturnDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                * Recomendação profissional do prazo de retorno. O agendamento formal continua gerenciado pela agenda de Consultas.
              </p>
            </div>
          </section>
        </div>

        {/* Footer CTAs */}
        <div className="px-5 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 flex flex-wrap items-center justify-between gap-2">
          {isEditingDraft ? (
            <button
              type="button"
              onClick={handleCancelDraft}
              disabled={isPending}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Cancelar rascunho
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isPending}
              className="text-xs"
            >
              Salvar rascunho
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleComplete}
              disabled={isPending}
              className="text-xs bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-bold"
            >
              {isPending ? "Processando..." : "Finalizar consulta"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
