"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClinicalConsultationDetailDto } from "@/lib/nutrition-v2/clinical-consultation-types";
import {
  CONSULTATION_TYPE_LABELS,
  CLINICAL_CONSULTATION_STATUS_LABELS,
  ADHERENCE_LABELS,
  formatDateToPtBr,
} from "@/lib/nutrition-v2/clinical-consultation-types";

interface ClinicalConsultationDetailModalProps {
  slug: string;
  detail: ClinicalConsultationDetailDto;
  isOpen: boolean;
  onClose: () => void;
}

export function ClinicalConsultationDetailModal({
  slug,
  detail,
  isOpen,
  onClose,
}: ClinicalConsultationDetailModalProps) {
  if (!isOpen) return null;

  const { consultation, student, professional, evolution, anthropometricsSnapshot, planSnapshot } = detail;
  const isCompleted = consultation.status === "COMPLETED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--surface-secondary)]/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                {CONSULTATION_TYPE_LABELS[consultation.consultationType] || consultation.consultationType}
              </h2>
              <Badge variant={isCompleted ? "success" : "neutral"} className="text-xs">
                {CLINICAL_CONSULTATION_STATUS_LABELS[consultation.status] || consultation.status}
              </Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {formatDateToPtBr(consultation.consultationDate)} • Paciente:{" "}
              <span className="font-semibold text-[var(--text-primary)]">{student.fullName}</span> • Atendido por{" "}
              <span className="font-semibold text-[var(--text-primary)]">{professional.fullName}</span>
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

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Evolução & Peso Card */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] space-y-2">
            <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)] block">
              Dados do Momento & Evolução
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] block">Peso na Consulta</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {anthropometricsSnapshot?.weightKg !== null && anthropometricsSnapshot?.weightKg !== undefined
                    ? `${anthropometricsSnapshot.weightKg} kg`
                    : "Não informado"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] block">Desde a Última Consulta</span>
                {evolution.hasComparison && evolution.weightDeltaKg !== null ? (
                  <span
                    className={`text-sm font-bold ${
                      evolution.weightDeltaKg <= 0 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {evolution.weightDeltaKg > 0 ? "+" : ""}
                    {evolution.weightDeltaKg} kg (
                    {evolution.weightDeltaPercent! > 0 ? "+" : ""}
                    {evolution.weightDeltaPercent}%)
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-tertiary)] italic">
                    {evolution.message || "Sem comparação"}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] block">Adesão Avaliada</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {ADHERENCE_LABELS[consultation.adherence] || consultation.adherence}
                </span>
              </div>
            </div>

            {/* Circunferências se houver */}
            {anthropometricsSnapshot && (anthropometricsSnapshot.waistCm || anthropometricsSnapshot.hipCm) && (
              <div className="pt-2 border-t border-[var(--border-subtle)]/60 flex items-center gap-4 text-[11px] text-[var(--text-secondary)]">
                {anthropometricsSnapshot.waistCm && (
                  <span>
                    Cintura: <strong>{anthropometricsSnapshot.waistCm} cm</strong>
                  </span>
                )}
                {anthropometricsSnapshot.hipCm && (
                  <span>
                    Quadril: <strong>{anthropometricsSnapshot.hipCm} cm</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Adesão & Dificuldades */}
          {(consultation.adherenceNotes || consultation.difficulties) && (
            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] space-y-2">
              <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)] block">
                Adesão & Dificuldades
              </span>
              {consultation.adherenceNotes && (
                <div>
                  <span className="text-[10px] text-[var(--text-tertiary)] block">Observações de Adesão:</span>
                  <p className="text-[var(--text-primary)] mt-0.5 leading-relaxed whitespace-pre-wrap">
                    {consultation.adherenceNotes}
                  </p>
                </div>
              )}
              {consultation.difficulties && (
                <div className="pt-2 border-t border-[var(--border-subtle)]/60">
                  <span className="text-[10px] text-[var(--text-tertiary)] block">Dificuldades Relatadas:</span>
                  <p className="text-[var(--text-primary)] mt-0.5 leading-relaxed whitespace-pre-wrap">
                    {consultation.difficulties}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sintomas / Observações */}
          {consultation.symptomsObservations && (
            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] space-y-1">
              <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)] block">
                Sintomas / Observações Clínicas
              </span>
              <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                {consultation.symptomsObservations}
              </p>
            </div>
          )}

          {/* Conduta Nutricional */}
          {consultation.conduct && (
            <div className="p-3.5 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 space-y-1">
              <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--accent-primary)] block">
                Conduta Nutricional
              </span>
              <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-medium">
                {consultation.conduct}
              </p>
            </div>
          )}

          {/* Metas / Objetivos */}
          {consultation.nextGoals && (
            <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] space-y-1">
              <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)] block">
                Metas até o Próximo Retorno
              </span>
              <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                {consultation.nextGoals}
              </p>
            </div>
          )}

          {/* Plano & Retorno */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-subtle)] space-y-2">
            <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)] block">
              Plano & Retorno
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] block">Retorno Recomendado</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {consultation.recommendedReturnDate
                    ? formatDateToPtBr(consultation.recommendedReturnDate)
                    : "Não definido"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-secondary)] block">Plano Alterado na Consulta?</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  {consultation.planAdjusted === true
                    ? "Sim"
                    : consultation.planAdjusted === false
                    ? "Não"
                    : "Não informado"}
                </span>
              </div>
            </div>

            {planSnapshot && (
              <div className="pt-2 border-t border-[var(--border-subtle)]/60 flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">
                  Plano Vigente ao Início: <strong>{planSnapshot.planTitle} (v{planSnapshot.versionNumber})</strong>
                </span>
                <a
                  href={`/consultoria/${slug}/planos-v2/${planSnapshot.planPublicId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[var(--accent-primary)] hover:underline font-medium"
                >
                  Visualizar plano ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
