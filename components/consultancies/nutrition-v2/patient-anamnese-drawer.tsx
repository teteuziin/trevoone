"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import type { PatientRecordDetail, UpdatePatientRecordInput } from "@/lib/nutrition-v2/patient-record-types";

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
  );
}

interface PatientAnamneseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  detail: PatientRecordDetail;
  clinicalForm?: UpdatePatientRecordInput;
}

export function PatientAnamneseDrawer({
  isOpen,
  onClose,
  detail,
  clinicalForm,
}: PatientAnamneseDrawerProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const form = clinicalForm || detail.record;
  const onb = detail.onboardingReference;
  const isAnswered = Boolean(onb?.hasOnboardingData || onb?.submittedAt);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl h-full bg-[var(--surface)] border-l border-[var(--border-default)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)] shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Prontuário Clínico
              </span>
              {isAnswered ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircleIcon className="w-3 h-3" />
                  Respondida
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <ClockIcon className="w-3 h-3" />
                  Pendente
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] truncate">
              Anamnese Nutricional — {detail.student.fullName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Banner */}
          {!isAnswered && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-medium space-y-1">
              <p className="font-bold">Anamnese aguardando preenchimento</p>
              <p className="text-amber-700/80 dark:text-amber-400/80">
                O paciente ainda não enviou as respostas completas pelo aplicativo. Os dados abaixo refletem as anotações do profissional.
              </p>
            </div>
          )}

          {/* Section 1: Objetivos & Rotina */}
          <section className="p-4.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
              1. Objetivo & Rotina Diária
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Objetivo Principal:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.mainObjective || onb?.mainObjective || "Não informado"}
                </p>
              </div>
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Profissão / Ocupação:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.occupation || onb?.occupation || "Não informado"}
                </p>
              </div>
              {form.routineNotes && (
                <div>
                  <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Rotina de Horários:</span>
                  <p className="font-medium text-[var(--text-primary)] whitespace-pre-wrap">{form.routineNotes}</p>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Histórico Clínico & Medicamentos */}
          <section className="p-4.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
              2. Saúde, Condições & Medicamentos
            </h3>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Condições Patológicas / Diagnósticos:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.diagnosedConditions || onb?.healthConditions || "Nenhuma condição relatada"}
                </p>
              </div>
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Medicamentos de Uso Contínuo:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.currentMedications || onb?.medications || "Nenhum medicamento relatado"}
                </p>
              </div>
              {form.supplements && (
                <div>
                  <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Suplementos Atuais:</span>
                  <p className="font-medium text-[var(--text-primary)]">{form.supplements}</p>
                </div>
              )}
              {form.previousSurgeries && (
                <div>
                  <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Cirurgias Anteriores:</span>
                  <p className="font-medium text-[var(--text-primary)]">{form.previousSurgeries}</p>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Alergias e Restrições Alimentares */}
          <section className="p-4.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
              3. Alergias, Intolerâncias & Restrições
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Alergias Alimentares:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.allergies || onb?.foodAllergies || "Não informado"}
                </p>
              </div>
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Intolerâncias Alimentares:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.foodAllergiesIntolerances || onb?.foodIntolerances || "Não informado"}
                </p>
              </div>
              {form.dietaryRestrictions && (
                <div>
                  <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Outras Restrições (Éticas / Religiosas):</span>
                  <p className="font-medium text-[var(--text-primary)]">{form.dietaryRestrictions}</p>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: Hábitos Alimentares & Preferências */}
          <section className="p-4.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
              4. Preferências & Aversões Alimentares
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Alimentos Favoritos / Preferidos:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.foodPreferences || onb?.preferredFoods || "Não informado"}
                </p>
              </div>
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Alimentos com Aversão / Não Gosta:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.dislikedFoods || onb?.dislikedFoods || "Não informado"}
                </p>
              </div>
              {form.usualEatingRoutine && (
                <div>
                  <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Rotina Alimentar Habitual:</span>
                  <p className="font-medium text-[var(--text-primary)] whitespace-pre-wrap">{form.usualEatingRoutine}</p>
                </div>
              )}
            </div>
          </section>

          {/* Section 5: Fisiologia & Estilo de Vida */}
          <section className="p-4.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-subtle)] space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text-secondary)]">
              5. Estilo de Vida & Funcionamento Fisiológico
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Qualidade do Sono:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.sleepNotes || onb?.sleepQuality || "Não informado"}
                </p>
              </div>
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Ingestão de Água:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.hydrationNotes || onb?.waterIntake || "Não informado"}
                </p>
              </div>
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Hábito Intestinal:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.bowelHabit || onb?.bowelHabit || "Não informado"}
                </p>
              </div>
              <div>
                <span className="font-bold text-[var(--text-tertiary)] block uppercase text-[10px]">Atividade Física:</span>
                <p className="font-medium text-[var(--text-primary)]">
                  {form.physicalActivityNotes || onb?.physicalActivity || "Não informado"}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4.5 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer min-h-[40px]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
