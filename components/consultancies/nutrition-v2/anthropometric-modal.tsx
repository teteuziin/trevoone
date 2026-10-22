"use client";

import React, { useState, useTransition, useMemo } from "react";
import type {
  PatientAnthropometricEntry,
  AddAnthropometricEntryInput,
  UpdateAnthropometricEntryInput,
  SkinfoldProtocol,
  AnthropometricSourceType,
} from "@/lib/nutrition-v2/patient-record-types";
import {
  SKINFOLD_PROTOCOL_LABELS,
} from "@/lib/nutrition-v2/patient-record-types";
import {
  addAnthropometricEntryAction,
  updateAnthropometricEntryAction,
} from "@/app/consultoria/[slug]/planos-v2/patient-actions";
import {
  classifyBMI,
} from "@/lib/nutrition-v2/clinical-calculations/formulas/bmi";
import {
  calculateWaistToHipRatio,
} from "@/lib/nutrition-v2/clinical-calculations/formulas/composition";
import {
  resolveEvaluationBodyComposition,
} from "@/lib/nutrition-v2/clinical-calculations/formulas/skinfolds";
import type { BiologicalSex } from "@/lib/nutrition-v2/patient-planning-types";

export interface AnthropometricModalProps {
  slug: string;
  studentPublicId?: string;
  studentMembershipPublicId?: string;
  studentName?: string;
  biologicalSex?: BiologicalSex | null;
  patientSex?: BiologicalSex | null;
  ageYears?: number | null;
  patientAgeYears?: number | null;
  isPregnant?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (entry: PatientAnthropometricEntry) => void;
  initialEntry?: PatientAnthropometricEntry | null; // If provided, modal is in EDIT mode
  editingEntry?: PatientAnthropometricEntry | null;
}

export function AnthropometricModal({
  slug,
  studentPublicId,
  studentMembershipPublicId,
  studentName = "Paciente",
  biologicalSex,
  patientSex,
  ageYears,
  patientAgeYears,
  isPregnant,
  isOpen,
  onClose,
  onSuccess,
  initialEntry,
  editingEntry,
}: AnthropometricModalProps) {
  const effectiveEntry = initialEntry || editingEntry || null;
  const targetStudentId = studentPublicId || studentMembershipPublicId || "";
  const effectiveSex = biologicalSex || patientSex || null;
  const effectiveAge = ageYears ?? patientAgeYears ?? null;
  const isEditMode = Boolean(effectiveEntry);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [measurementDate, setMeasurementDate] = useState<string>(
    effectiveEntry?.measurementDate || new Date().toISOString().slice(0, 10)
  );
  const [weightKg, setWeightKg] = useState<string>(
    effectiveEntry?.weightKg !== null && effectiveEntry?.weightKg !== undefined
      ? String(effectiveEntry.weightKg)
      : ""
  );
  const [heightCm, setHeightCm] = useState<string>(
    effectiveEntry?.heightCm !== null && effectiveEntry?.heightCm !== undefined
      ? String(effectiveEntry.heightCm)
      : ""
  );

  const [sourceType, setSourceType] = useState<AnthropometricSourceType>(
    effectiveEntry?.sourceType || "PROFESSIONAL_RECORDED"
  );
  const [equipmentMethod, setEquipmentMethod] = useState<string>(
    effectiveEntry?.equipmentMethod || ""
  );

  // Circumferences
  const [waistCm, setWaistCm] = useState<string>(effectiveEntry?.waistCm ? String(effectiveEntry.waistCm) : "");
  const [hipCm, setHipCm] = useState<string>(effectiveEntry?.hipCm ? String(effectiveEntry.hipCm) : "");
  const [abdomenCm, setAbdomenCm] = useState<string>(effectiveEntry?.abdomenCm ? String(effectiveEntry.abdomenCm) : "");
  const [neckCm, setNeckCm] = useState<string>(effectiveEntry?.neckCm ? String(effectiveEntry.neckCm) : "");
  const [relaxedArmCm, setRelaxedArmCm] = useState<string>(effectiveEntry?.relaxedArmCm || effectiveEntry?.armCm ? String(effectiveEntry.relaxedArmCm || effectiveEntry.armCm) : "");
  const [contractedArmCm, setContractedArmCm] = useState<string>(effectiveEntry?.contractedArmCm ? String(effectiveEntry.contractedArmCm) : "");
  const [forearmCm, setForearmCm] = useState<string>(effectiveEntry?.forearmCm ? String(effectiveEntry.forearmCm) : "");
  const [chestCm, setChestCm] = useState<string>(effectiveEntry?.chestCm ? String(effectiveEntry.chestCm) : "");
  const [thighCm, setThighCm] = useState<string>(effectiveEntry?.thighCm ? String(effectiveEntry.thighCm) : "");
  const [calfCm, setCalfCm] = useState<string>(effectiveEntry?.calfCm ? String(effectiveEntry.calfCm) : "");

  // Skinfolds & Protocol
  const [skinfoldProtocol, setSkinfoldProtocol] = useState<SkinfoldProtocol>(
    effectiveEntry?.skinfoldProtocol || "POLLOCK_3"
  );
  const [tricepsMm, setTricepsMm] = useState<string>(effectiveEntry?.tricepsMm ? String(effectiveEntry.tricepsMm) : "");
  const [bicepsMm, setBicepsMm] = useState<string>(effectiveEntry?.bicepsMm ? String(effectiveEntry.bicepsMm) : "");
  const [subscapularMm, setSubscapularMm] = useState<string>(effectiveEntry?.subscapularMm ? String(effectiveEntry.subscapularMm) : "");
  const [suprailiacMm, setSuprailiacMm] = useState<string>(effectiveEntry?.suprailiacMm ? String(effectiveEntry.suprailiacMm) : "");
  const [abdominalFoldMm, setAbdominalFoldMm] = useState<string>(effectiveEntry?.abdominalFoldMm ? String(effectiveEntry.abdominalFoldMm) : "");
  const [chestFoldMm, setChestFoldMm] = useState<string>(effectiveEntry?.chestFoldMm ? String(effectiveEntry.chestFoldMm) : "");
  const [thighFoldMm, setThighFoldMm] = useState<string>(effectiveEntry?.thighFoldMm ? String(effectiveEntry.thighFoldMm) : "");
  const [midaxillaryMm, setMidaxillaryMm] = useState<string>(effectiveEntry?.midaxillaryMm ? String(effectiveEntry.midaxillaryMm) : "");
  const [calfFoldMm, setCalfFoldMm] = useState<string>(effectiveEntry?.calfFoldMm ? String(effectiveEntry.calfFoldMm) : "");

  // Body Composition (Equipment reported)
  const [bodyFatPct, setBodyFatPct] = useState<string>(effectiveEntry?.bodyFatPct ? String(effectiveEntry.bodyFatPct) : "");
  const [fatMassKg, setFatMassKg] = useState<string>(effectiveEntry?.fatMassKg ? String(effectiveEntry.fatMassKg) : "");
  const [leanMassKg, setLeanMassKg] = useState<string>(effectiveEntry?.leanMassKg ? String(effectiveEntry.leanMassKg) : "");
  const [muscleMassKg, setMuscleMassKg] = useState<string>(effectiveEntry?.muscleMassKg ? String(effectiveEntry.muscleMassKg) : "");
  const [bodyWaterPct, setBodyWaterPct] = useState<string>(effectiveEntry?.bodyWaterPct ? String(effectiveEntry.bodyWaterPct) : "");
  const [bodyWaterKg, setBodyWaterKg] = useState<string>(effectiveEntry?.bodyWaterKg ? String(effectiveEntry.bodyWaterKg) : "");

  // Bone Mass
  const [boneMassValue, setBoneMassValue] = useState<string>(effectiveEntry?.boneMassValue ? String(effectiveEntry.boneMassValue) : "");
  const [boneMassUnit, setBoneMassUnit] = useState<string>(effectiveEntry?.boneMassUnit || "kg");
  const [boneMassMethod, setBoneMassMethod] = useState<string>(effectiveEntry?.boneMassMethod || "");

  // Edit Reason (Required for Edit Mode)
  const [editReason, setEditReason] = useState<string>("");
  const [notes, setNotes] = useState<string>(effectiveEntry?.notes || "");

  // Active Accordion Section for Mobile
  const [activeSection, setActiveSection] = useState<"BASIC" | "CIRC" | "FOLDS" | "COMP" | "NOTES">("BASIC");

  // Real-time Derived Preview Calculations
  const previewBmi = useMemo(() => {
    const w = parseFloat(weightKg);
    const h = parseFloat(heightCm);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      const bmiVal = Number((w / Math.pow(h / 100, 2)).toFixed(1));
      const classification = classifyBMI(bmiVal, { ageYears: effectiveAge, isPregnant });
      return { val: bmiVal, classification };
    }
    return null;
  }, [weightKg, heightCm, effectiveAge, isPregnant]);

  const previewWHR = useMemo(() => {
    const w = parseFloat(waistCm);
    const h = parseFloat(hipCm);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      return calculateWaistToHipRatio(w, h, effectiveSex);
    }
    return null;
  }, [waistCm, hipCm, effectiveSex]);

  const previewSkinfolds = useMemo(() => {
    const parseOrNull = (val: string) => {
      const n = parseFloat(val);
      return !isNaN(n) && n > 0 ? n : null;
    };

    const sf = {
      tricepsMm: parseOrNull(tricepsMm),
      bicepsMm: parseOrNull(bicepsMm),
      subscapularMm: parseOrNull(subscapularMm),
      suprailiacMm: parseOrNull(suprailiacMm),
      abdominalFoldMm: parseOrNull(abdominalFoldMm),
      chestFoldMm: parseOrNull(chestFoldMm),
      thighFoldMm: parseOrNull(thighFoldMm),
      midaxillaryMm: parseOrNull(midaxillaryMm),
      calfFoldMm: parseOrNull(calfFoldMm),
    };

    const w = parseFloat(weightKg);
    return resolveEvaluationBodyComposition(
      sf,
      skinfoldProtocol,
      effectiveAge,
      effectiveSex,
      !isNaN(w) ? w : null
    );
  }, [
    tricepsMm,
    bicepsMm,
    subscapularMm,
    suprailiacMm,
    abdominalFoldMm,
    chestFoldMm,
    thighFoldMm,
    midaxillaryMm,
    calfFoldMm,
    skinfoldProtocol,
    effectiveAge,
    effectiveSex,
    weightKg,
  ]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parseNum = (v: string): number | null => {
      const clean = v.trim().replace(",", ".");
      if (!clean) return null;
      const n = parseFloat(clean);
      return isNaN(n) ? null : n;
    };

    const payload: AddAnthropometricEntryInput = {
      measurementDate,
      weightKg: parseNum(weightKg),
      heightCm: parseNum(heightCm),
      waistCm: parseNum(waistCm),
      hipCm: parseNum(hipCm),
      armCm: parseNum(relaxedArmCm) || parseNum(contractedArmCm),
      thighCm: parseNum(thighCm),
      calfCm: parseNum(calfCm),
      chestCm: parseNum(chestCm),
      neckCm: parseNum(neckCm),
      forearmCm: parseNum(forearmCm),
      abdomenCm: parseNum(abdomenCm),
      relaxedArmCm: parseNum(relaxedArmCm),
      contractedArmCm: parseNum(contractedArmCm),
      tricepsMm: parseNum(tricepsMm),
      bicepsMm: parseNum(bicepsMm),
      subscapularMm: parseNum(subscapularMm),
      suprailiacMm: parseNum(suprailiacMm),
      abdominalFoldMm: parseNum(abdominalFoldMm),
      chestFoldMm: parseNum(chestFoldMm),
      thighFoldMm: parseNum(thighFoldMm),
      midaxillaryMm: parseNum(midaxillaryMm),
      calfFoldMm: parseNum(calfFoldMm),
      skinfoldProtocol: skinfoldProtocol !== "NONE" ? skinfoldProtocol : null,
      bodyFatPct: parseNum(bodyFatPct),
      fatMassKg: parseNum(fatMassKg),
      leanMassKg: parseNum(leanMassKg),
      muscleMassKg: parseNum(muscleMassKg),
      bodyWaterPct: parseNum(bodyWaterPct),
      bodyWaterKg: parseNum(bodyWaterKg),
      boneMassValue: parseNum(boneMassValue),
      boneMassUnit: boneMassUnit.trim() || null,
      boneMassMethod: boneMassMethod.trim() || null,
      sourceType,
      equipmentMethod: equipmentMethod.trim() || null,
      notes: notes.trim() || null,
    };

    startTransition(async () => {
      if (isEditMode && effectiveEntry) {
        if (!editReason || editReason.trim().length < 3) {
          setError("Informe a justificativa da correção da medição (mínimo de 3 caracteres).");
          return;
        }

        const updatePayload: UpdateAnthropometricEntryInput = {
          ...payload,
          entryPublicId: effectiveEntry.publicId,
          editReason: editReason.trim(),
        };

        const res = await updateAnthropometricEntryAction(slug, targetStudentId, updatePayload);
        if (res.success) {
          onSuccess({
            ...effectiveEntry,
            ...payload,
            updatedAt: new Date().toISOString(),
            editReason: editReason.trim(),
          } as PatientAnthropometricEntry);
          onClose();
        } else {
          setError(res.error || "Erro ao atualizar medição.");
        }
      } else {
        const res = await addAnthropometricEntryAction(slug, targetStudentId, payload);
        if (res.success) {
          onSuccess({
            id: 0,
            publicId: "",
            patientRecordId: 0,
            ...payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdByMembershipId: 0,
          } as PatientAnthropometricEntry);
          onClose();
        } else {
          setError(res.error || "Erro ao registrar medição.");
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[94vh] bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="anthro-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 bg-[var(--surface-subtle)]">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              {isEditMode ? "Correção com Rastreabilidade" : "Nova Avaliação Corporal"}
            </span>
            <h2 id="anthro-modal-title" className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)]">
              {isEditMode ? "Corrigir Medição Antropométrica" : "Registrar Avaliação Física"}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Paciente: <strong className="text-[var(--text-primary)]">{studentName}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-bold min-h-[40px] min-w-[40px]"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Form Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Section Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--border-subtle)]">
            {[
              { id: "BASIC", label: "1. Dados Básicos" },
              { id: "CIRC", label: "2. Circunferências" },
              { id: "FOLDS", label: "3. Dobras Cutâneas" },
              { id: "COMP", label: "4. Bioimpedância / DEXA" },
              { id: "NOTES", label: "5. Notas & Conclusão" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as "BASIC" | "CIRC" | "FOLDS" | "COMP" | "NOTES")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all min-h-[38px] ${
                  activeSection === tab.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* SECTION 1: DADOS BÁSICOS */}
          {activeSection === "BASIC" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Data da Medição *
                  </label>
                  <input
                    type="date"
                    required
                    value={measurementDate}
                    onChange={(e) => setMeasurementDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm text-[var(--text-primary)] font-semibold min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Peso Corporal (kg)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="10"
                      max="500"
                      placeholder="Ex: 72.5"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm text-[var(--text-primary)] font-semibold min-h-[44px]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-tertiary)]">
                      kg
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Altura (cm)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="40"
                      max="300"
                      placeholder="Ex: 175"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm text-[var(--text-primary)] font-semibold min-h-[44px]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-tertiary)]">
                      cm
                    </span>
                  </div>
                </div>
              </div>

              {/* Origem e Equipamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Origem do Registro
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as AnthropometricSourceType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm text-[var(--text-primary)] font-semibold min-h-[44px]"
                  >
                    <option value="PROFESSIONAL_RECORDED">Avaliação Profissional (Nutricionista)</option>
                    <option value="PATIENT_REPORTED">Informado pelo Paciente (Anamnese / Autoavaliação)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Equipamento / Instrumento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Balança Filizola, Bioimpedância InBody 270..."
                    value={equipmentMethod}
                    onChange={(e) => setEquipmentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm text-[var(--text-primary)] font-medium min-h-[44px]"
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              {previewBmi && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[var(--text-secondary)] block">
                      Prévia do IMC
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                      {previewBmi.val} kg/m²
                    </span>
                    {previewBmi.classification && (
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-200 mt-0.5">
                        {previewBmi.classification.category} ({previewBmi.classification.referenceStandard})
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSection("CIRC")}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer min-h-[40px]"
                  >
                    Avançar para Circunferências →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: CIRCUNFERÊNCIAS */}
          {activeSection === "CIRC" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <span className="text-xs text-[var(--text-secondary)] block font-medium">
                Medições com fita métrica flexível inelástica, registradas em centímetros (cm).
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Cintura", val: waistCm, set: setWaistCm, placeholder: "Ex: 78.0" },
                  { label: "Quadril", val: hipCm, set: setHipCm, placeholder: "Ex: 98.5" },
                  { label: "Abdômen (Cicatriz)", val: abdomenCm, set: setAbdomenCm, placeholder: "Ex: 82.0" },
                  { label: "Pescoço", val: neckCm, set: setNeckCm, placeholder: "Ex: 36.0" },
                  { label: "Braço Relaxado", val: relaxedArmCm, set: setRelaxedArmCm, placeholder: "Ex: 32.0" },
                  { label: "Braço Contraído", val: contractedArmCm, set: setContractedArmCm, placeholder: "Ex: 34.5" },
                  { label: "Antebraço", val: forearmCm, set: setForearmCm, placeholder: "Ex: 26.0" },
                  { label: "Tórax / Peitoral", val: chestCm, set: setChestCm, placeholder: "Ex: 96.0" },
                  { label: "Coxa Proximal", val: thighCm, set: setThighCm, placeholder: "Ex: 56.0" },
                  { label: "Panturrilha", val: calfCm, set: setCalfCm, placeholder: "Ex: 37.0" },
                ].map((item, idx) => (
                  <div key={idx}>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1 truncate">
                      {item.label} (cm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="10"
                      max="300"
                      placeholder={item.placeholder}
                      value={item.val}
                      onChange={(e) => item.set(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold min-h-[44px]"
                    />
                  </div>
                ))}
              </div>

              {/* RCQ Preview */}
              {previewWHR && (
                <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-[var(--text-secondary)] block">
                      Relação Cintura-Quadril (RCQ)
                    </span>
                    <span className="text-base font-extrabold text-[var(--text-primary)]">
                      {previewWHR.ratio} — {previewWHR.riskCategory}
                    </span>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                      {previewWHR.referenceStandard}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: DOBRAS CUTÂNEAS */}
          {activeSection === "FOLDS" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  Protocolo de Dobras Cutâneas
                </label>
                <select
                  value={skinfoldProtocol}
                  onChange={(e) => setSkinfoldProtocol(e.target.value as SkinfoldProtocol)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs sm:text-sm font-semibold min-h-[44px]"
                >
                  {Object.entries(SKINFOLD_PROTOCOL_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  As dobras do protocolo devem pertencer à mesma avaliação. Não misturar dobras de medições diferentes.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: "triceps", label: "Tríceps", val: tricepsMm, set: setTricepsMm },
                  { id: "biceps", label: "Bíceps", val: bicepsMm, set: setBicepsMm },
                  { id: "subscapular", label: "Subescapular", val: subscapularMm, set: setSubscapularMm },
                  { id: "suprailiac", label: "Suprailíaca", val: suprailiacMm, set: setSuprailiacMm },
                  { id: "abdominal", label: "Abdominal", val: abdominalFoldMm, set: setAbdominalFoldMm },
                  { id: "chest", label: "Peitoral", val: chestFoldMm, set: setChestFoldMm },
                  { id: "thigh", label: "Coxa", val: thighFoldMm, set: setThighFoldMm },
                  { id: "midaxillary", label: "Axilar Média", val: midaxillaryMm, set: setMidaxillaryMm },
                  { id: "calf", label: "Panturrilha Medial", val: calfFoldMm, set: setCalfFoldMm },
                ].map((item, idx) => (
                  <div key={idx}>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      {item.label} (mm)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="80"
                      placeholder="Ex: 14.5"
                      value={item.val}
                      onChange={(e) => item.set(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold min-h-[44px]"
                    />
                  </div>
                ))}
              </div>

              {/* Protocol Calculation Preview */}
              {previewSkinfolds && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[var(--text-primary)]">
                      {previewSkinfolds.protocolName}
                    </span>
                    <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                      {previewSkinfolds.effectiveBodyFatPct ? `${previewSkinfolds.effectiveBodyFatPct}% de Gordura` : "Incompleto"}
                    </span>
                  </div>

                  {previewSkinfolds.isComplete ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-[var(--text-secondary)]">
                      <div>Soma das Dobras: <strong>{previewSkinfolds.sumSkinfoldsMm} mm</strong></div>
                      {previewSkinfolds.bodyDensity && (
                        <div>Densidade: <strong>{previewSkinfolds.bodyDensity} g/ml</strong></div>
                      )}
                      {previewSkinfolds.fatMassKg && (
                        <div>Massa Gorda: <strong>{previewSkinfolds.fatMassKg} kg</strong></div>
                      )}
                      {previewSkinfolds.leanMassKg && (
                        <div>Massa Magra: <strong>{previewSkinfolds.leanMassKg} kg</strong></div>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Dobras faltantes para o protocolo: {previewSkinfolds.missingSkinfolds.join(", ")}.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: BIOIMPEDÂNCIA / COMPOSIÇÃO POR EQUIPAMENTO */}
          {activeSection === "COMP" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <span className="text-xs text-[var(--text-secondary)] block font-medium">
                Valores informados diretamente por equipamentos clínicos (ex: InBody, Omron, DEXA). Dados ausentes permanecem vazios.
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    % Gordura Corporal
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="75"
                    placeholder="Ex: 18.5"
                    value={bodyFatPct}
                    onChange={(e) => setBodyFatPct(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Massa Livre de Gordura / Magra (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="300"
                    placeholder="Ex: 58.2"
                    value={leanMassKg}
                    onChange={(e) => setLeanMassKg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Massa Muscular Esquelética (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="300"
                    placeholder="Ex: 33.5"
                    value={muscleMassKg}
                    onChange={(e) => setMuscleMassKg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Massa Gorda (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="300"
                    placeholder="Ex: 14.3"
                    value={fatMassKg}
                    onChange={(e) => setFatMassKg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Água Corporal Total (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="10"
                    max="85"
                    placeholder="Ex: 57.0"
                    value={bodyWaterPct}
                    onChange={(e) => setBodyWaterPct(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                    Água Corporal (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="5"
                    max="200"
                    placeholder="Ex: 41.5"
                    value={bodyWaterKg}
                    onChange={(e) => setBodyWaterKg(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold min-h-[44px]"
                  />
                </div>
              </div>

              {/* Massa Óssea com Método e Unidade */}
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3">
                <span className="text-xs font-extrabold text-[var(--text-primary)] block">
                  Massa Óssea Efetivamente Medida
                </span>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  Armazenar apenas se efetivamente mensurada com método e unidade declarados (não deduzida por fórmula empírica).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      Valor
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="50"
                      placeholder="Ex: 3.20"
                      value={boneMassValue}
                      onChange={(e) => setBoneMassValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      Unidade
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: kg ou g/cm²"
                      value={boneMassUnit}
                      onChange={(e) => setBoneMassUnit(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                      Método / Exame
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Bioimpedância InBody, DEXA..."
                      value={boneMassMethod}
                      onChange={(e) => setBoneMassMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-semibold min-h-[44px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: OBSERVAÇÕES & AUDITORIA */}
          {activeSection === "NOTES" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {isEditMode && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <label className="block text-xs font-extrabold text-amber-900 dark:text-amber-200">
                    Justificativa da Correção (Obrigatório para Auditoria Clínica) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Erro de digitação no peso; valor corrigido após calibração da balança..."
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-[var(--surface)] text-xs sm:text-sm font-medium min-h-[44px]"
                  />
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    O histórico anterior não será apagado. Esta justificativa será gravada na trilha de auditoria clínica.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                  Observações Clínicas da Avaliação
                </label>
                <textarea
                  rows={4}
                  placeholder="Anotações sobre retenção hídrica, fase do ciclo menstrual, condições de jejum, horário da pesagem..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs sm:text-sm font-medium resize-none"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors min-h-[44px] cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors min-h-[44px] cursor-pointer inline-flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{isEditMode ? "Salvar Correção" : "Gravar Avaliação"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
