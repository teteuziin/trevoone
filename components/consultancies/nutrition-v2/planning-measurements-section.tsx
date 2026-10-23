"use client";

import React, { useState } from "react";
import type { PatientAnthropometricEntry } from "@/lib/nutrition-v2/patient-record-types";
import { CANONICAL_PERIMETERS, CANONICAL_DIAMETERS, convertCmToMm } from "@/lib/nutrition-v2/clinical-measurements-catalog";
import type { PlanningFieldPreferences } from "@/lib/nutrition-v2/planning-preferences-repository";

interface PlanningMeasurementsSectionProps {
  entry: PatientAnthropometricEntry | null;
  preferences?: PlanningFieldPreferences;
  onEdit?: () => void;
  canEdit?: boolean;
}

export function PlanningMeasurementsSection({
  entry,
  preferences,
  onEdit,
  canEdit = true,
}: PlanningMeasurementsSectionProps) {
  const [diameterUnit, setDiameterUnit] = useState<"cm" | "mm">(
    preferences?.preferredDiameterUnit || "cm"
  );

  if (!entry) {
    return (
      <div className="p-8 rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] text-center space-y-2">
        <p className="text-sm font-semibold text-[var(--text-secondary)]">
          Nenhuma avaliação física registrada para este paciente.
        </p>
        {canEdit && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer min-h-[44px]"
          >
            + Registrar Primeira Avaliação
          </button>
        )}
      </div>
    );
  }

  const perimeters = entry.perimeters;
  const diameters = entry.diameters;
  const visiblePerimIds = preferences?.visiblePerimeters || CANONICAL_PERIMETERS.map((p) => p.id);
  const visibleDiamIds = preferences?.visibleDiameters || CANONICAL_DIAMETERS.map((d) => d.id);

  // Helper to extract perimeter value for a canonical item
  const getPerimeterValues = (canonicalId: string) => {
    if (!perimeters) {
      // Fallback to legacy flat fields
      switch (canonicalId) {
        case "waist": return { single: entry.waistCm };
        case "hip": return { single: entry.hipCm };
        case "abdomen": return { single: entry.abdomenCm };
        case "chest": return { single: entry.chestCm };
        case "neck": return { single: entry.neckCm };
        case "relaxed_arm": return { right: entry.relaxedArmCm ?? entry.armCm };
        case "contracted_arm": return { right: entry.contractedArmCm };
        case "forearm": return { right: entry.forearmCm };
        case "mid_thigh": return { right: entry.thighCm };
        case "calf": return { right: entry.calfCm };
        default: return {};
      }
    }

    switch (canonicalId) {
      case "neck": return { single: perimeters.neckCm };
      case "shoulders": return { single: perimeters.shouldersCm };
      case "chest": return { single: perimeters.chestCm };
      case "waist": return { single: perimeters.waistCm };
      case "abdomen": return { single: perimeters.abdomenCm };
      case "hip": return { single: perimeters.hipCm };
      case "relaxed_arm": return { right: perimeters.relaxedArmRightCm, left: perimeters.relaxedArmLeftCm };
      case "contracted_arm": return { right: perimeters.contractedArmRightCm, left: perimeters.contractedArmLeftCm };
      case "forearm": return { right: perimeters.forearmRightCm, left: perimeters.forearmLeftCm };
      case "wrist": return { right: perimeters.wristRightCm, left: perimeters.wristLeftCm };
      case "proximal_thigh": return { right: perimeters.proximalThighRightCm, left: perimeters.proximalThighLeftCm };
      case "mid_thigh": return { right: perimeters.midThighRightCm, left: perimeters.midThighLeftCm };
      case "calf": return { right: perimeters.calfRightCm, left: perimeters.calfLeftCm };
      case "ankle": return { right: perimeters.ankleRightCm, left: perimeters.ankleLeftCm };
      default: return {};
    }
  };

  // Helper to extract diameter value for a canonical item
  const getDiameterValues = (canonicalId: string) => {
    if (!diameters) return {};
    switch (canonicalId) {
      case "femur_biepicondylar": return { right: diameters.femurBiepicondylarRightCm, left: diameters.femurBiepicondylarLeftCm };
      case "humerus_biepicondylar": return { right: diameters.humerusBiepicondylarRightCm, left: diameters.humerusBiepicondylarLeftCm };
      case "wrist_biastyloid": return { right: diameters.wristBiastyloidRightCm, left: diameters.wristBiastyloidLeftCm };
      case "ankle_bimalleolar": return { right: diameters.ankleBimalleolarRightCm, left: diameters.ankleBimalleolarLeftCm };
      case "biacromial": return { single: diameters.biacromialCm };
      case "biiliocristal": return { single: diameters.biiliocristalCm };
      case "chest_transverse": return { single: diameters.chestTransverseCm };
      case "chest_anteroposterior": return { single: diameters.chestAnteroposteriorCm };
      default: return {};
    }
  };

  const formatDiameter = (valCm?: number | null) => {
    if (valCm === null || valCm === undefined) return "—";
    if (diameterUnit === "mm") {
      return `${convertCmToMm(valCm)} mm`;
    }
    return `${valCm} cm`;
  };

  const hasPerimeters = visiblePerimIds.some((id) => {
    const v = getPerimeterValues(id);
    return v.single != null || v.right != null || v.left != null;
  });

  const hasDiameters = visibleDiamIds.some((id) => {
    const v = getDiameterValues(id);
    return v.single != null || v.right != null || v.left != null;
  });

  const skinfolds = [
    { label: "Tríceps", val: entry.tricepsMm },
    { label: "Bíceps", val: entry.bicepsMm },
    { label: "Subescapular", val: entry.subscapularMm },
    { label: "Suprailíaca", val: entry.suprailiacMm },
    { label: "Abdominal", val: entry.abdominalFoldMm },
    { label: "Peitoral / Tórax", val: entry.chestFoldMm },
    { label: "Coxa", val: entry.thighFoldMm },
    { label: "Axilar Média", val: entry.midaxillaryMm },
    { label: "Panturrilha Medial", val: entry.calfFoldMm },
  ];

  const hasSkinfolds = skinfolds.some((s) => s.val != null);

  return (
    <div className="space-y-6">
      {/* SECTION 1: PERÍMETROS CORPORAIS */}
      {(preferences?.showPerimeters ?? true) && (
        <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-wrap gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
                Circunferências Antropométricas ISAK / OMS
              </span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Perímetros Corporais
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
                Unidade: <strong>cm</strong>
              </span>
              {canEdit && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)] text-xs font-bold text-[var(--text-secondary)] transition-all cursor-pointer min-h-[36px]"
                >
                  Editar
                </button>
              )}
            </div>
          </div>

          {!hasPerimeters ? (
            <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
              Nenhum perímetro informado nesta avaliação.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CANONICAL_PERIMETERS.filter((p) => visiblePerimIds.includes(p.id)).map((p) => {
                const values = getPerimeterValues(p.id);
                const hasValue = values.single != null || values.right != null || values.left != null;

                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      hasValue
                        ? "bg-[var(--surface-subtle)] border-[var(--border-subtle)]"
                        : "bg-[var(--surface)]/40 border-dashed border-[var(--border-subtle)] opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {p.name}
                      </span>
                      {p.id === "waist" && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          ISAK Menor Circ.
                        </span>
                      )}
                      {p.id === "abdomen" && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          Cicatriz Umbilical
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-[var(--text-tertiary)] mb-2 line-clamp-1" title={p.anatomicalPoint}>
                      {p.anatomicalPoint}
                    </p>

                    {p.isBilateral ? (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-subtle)]">
                        <div>
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Direito (D)</span>
                          <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                            {values.right != null ? `${values.right} cm` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Esquerdo (E)</span>
                          <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                            {values.left != null ? `${values.left} cm` : "—"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 border-t border-[var(--border-subtle)]">
                        <span className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">
                          {values.single != null ? `${values.single} cm` : "—"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Clinical distinction banner */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <span className="font-bold">Atenção anatômica:</span>
            <span>
              <strong>Cintura</strong> (menor curvatura entre costelas e crista ilíaca) é anatomicamente distinta de <strong>Abdômen</strong> (nível da cicatriz umbilical).
              O cálculo de RCQ utiliza estritamente o perímetro de Cintura.
            </span>
          </div>
        </div>
      )}

      {/* SECTION 2: DIÂMETROS ÓSSEOS */}
      {(preferences?.showDiameters ?? true) && (
        <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-wrap gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
                Antropometria Óssea & Estrutural
              </span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Diâmetros Ósseos
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)] font-medium">Unidade:</span>
              <div className="flex rounded-xl bg-[var(--surface-subtle)] p-0.5 border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setDiameterUnit("cm")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px] ${
                    diameterUnit === "cm"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  cm
                </button>
                <button
                  type="button"
                  onClick={() => setDiameterUnit("mm")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px] ${
                    diameterUnit === "mm"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  mm
                </button>
              </div>
            </div>
          </div>

          {!hasDiameters ? (
            <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
              Nenhum diâmetro ósseo registrado nesta avaliação.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {CANONICAL_DIAMETERS.filter((d) => visibleDiamIds.includes(d.id)).map((d) => {
                const values = getDiameterValues(d.id);
                const hasValue = values.single != null || values.right != null || values.left != null;

                return (
                  <div
                    key={d.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      hasValue
                        ? "bg-[var(--surface-subtle)] border-[var(--border-subtle)]"
                        : "bg-[var(--surface)]/40 border-dashed border-[var(--border-subtle)] opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {d.name}
                      </span>
                    </div>

                    <p className="text-[10px] text-[var(--text-tertiary)] mb-2 line-clamp-1" title={d.anatomicalPoint}>
                      {d.anatomicalPoint}
                    </p>

                    {d.isBilateral ? (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-subtle)]">
                        <div>
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Direito (D)</span>
                          <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                            {formatDiameter(values.right)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-tertiary)] block">Esquerdo (E)</span>
                          <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                            {formatDiameter(values.left)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1 border-t border-[var(--border-subtle)]">
                        <span className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">
                          {formatDiameter(values.single)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: DOBRAS CUTÂNEAS */}
      {(preferences?.showSkinfolds ?? true) && (
        <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-wrap gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
                Adipometria Cutânea (ISAK / Lohman)
              </span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Dobras Cutâneas
              </h3>
            </div>
            {entry.skinfoldProtocol && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Protocolo: {entry.skinfoldProtocol}
              </span>
            )}
          </div>

          {!hasSkinfolds ? (
            <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
              Nenhuma dobra cutânea informada nesta avaliação.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {skinfolds.map((s, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border ${
                    s.val != null
                      ? "bg-[var(--surface-subtle)] border-[var(--border-subtle)]"
                      : "bg-[var(--surface)]/40 border-dashed border-[var(--border-subtle)] opacity-60"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                    {s.label}
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] block tabular-nums">
                    {s.val != null ? `${s.val} mm` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
