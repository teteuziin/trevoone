"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PhysicalMeasurement } from "@/lib/consultancies/personal-student-hub";
import { computeMetricDelta } from "@/lib/consultancies/physical-assessments-types";
import { recordProfessionalProgressAction } from "@/app/consultoria/[slug]/progresso/actions";

export interface StudentPhysicalAssessmentHubProps {
  consultancySlug: string;
  studentPublicId: string;
  studentName: string;
  measurements: PhysicalMeasurement[];
}

function ScaleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-7-5l7-3 7 3M4 14l3.5-7L11 14M13 14l3.5-7L20 14" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    }
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return dateStr;
    return dt.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

export function StudentPhysicalAssessmentHub({
  consultancySlug,
  studentPublicId,
  studentName,
  measurements = [],
}: StudentPhysicalAssessmentHubProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const latest = measurements.length > 0 ? measurements[0] : null;

  // Comparison selectors
  const [indexA, setIndexA] = useState<number>(0);
  const [indexB, setIndexB] = useState<number>(measurements.length > 1 ? 1 : 0);

  const measurementA = measurements[indexA] || latest;
  const measurementB = measurements[indexB] || null;

  const deltas = useMemo(() => {
    if (!measurementA || !measurementB || indexA === indexB) return null;
    return {
      weight: computeMetricDelta(measurementB.weightKg, measurementA.weightKg, "kg"),
      waist: computeMetricDelta(measurementB.waistCm, measurementA.waistCm, "cm"),
      abdomen: computeMetricDelta(measurementB.abdomenCm, measurementA.abdomenCm, "cm"),
      hip: computeMetricDelta(measurementB.hipCm, measurementA.hipCm, "cm"),
      arm: computeMetricDelta(measurementB.armCm, measurementA.armCm, "cm"),
      thigh: computeMetricDelta(measurementB.thighCm, measurementA.thighCm, "cm"),
    };
  }, [measurementA, measurementB, indexA, indexB]);

  return (
    <div className="space-y-4">
      {/* Topo do Hub */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
            <ScaleIcon className="w-5 h-5 text-[#176B49]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-base sm:text-lg font-bold text-[#102E23]">
                Avaliação Física
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                {measurements.length} {measurements.length === 1 ? "registro" : "registros"}
              </span>
            </div>
            <p className="text-xs text-[#5A6660] mt-0.5">
              Medidas corporais e histórico de evolução de {studentName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#176B49] hover:bg-[#125438] active:scale-[0.99] transition-all shadow-xs cursor-pointer min-h-[40px] shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Nova avaliação física</span>
        </button>
      </div>

      {/* Estado Vazio */}
      {measurements.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white border border-[#E5E8E2] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF9F6] border border-[#E5E8E2] flex items-center justify-center mx-auto text-[#8E9992]">
            <ScaleIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-[#102E23]">
              Nenhuma avaliação física registrada
            </h3>
            <p className="text-xs text-[#5A6660] max-w-sm mx-auto mt-1">
              Registre a primeira avaliação deste aluno para acompanhar peso, circunferências corporais e deltas de evolução.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Registrar primeira avaliação</span>
          </button>
        </div>
      ) : (
        <>
          {/* Card Destaque: Última Avaliação */}
          {latest && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#176B49]" />
                  <h3 className="font-heading text-sm font-bold text-[#102E23]">
                    Última Avaliação Registrada
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#5A6660]">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#176B49]" />
                  <span>{formatDisplayDate(latest.recordedOn)}</span>
                </div>
              </div>

              {/* Grid com Medidas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Peso Corporal</p>
                  <p className="text-sm sm:text-base font-bold text-[#102E23]">
                    {latest.weightKg != null
                      ? `${latest.weightKg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg`
                      : "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Cintura</p>
                  <p className="text-sm sm:text-base font-bold text-[#102E23]">
                    {latest.waistCm != null ? `${latest.waistCm} cm` : "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Abdômen</p>
                  <p className="text-sm sm:text-base font-bold text-[#102E23]">
                    {latest.abdomenCm != null ? `${latest.abdomenCm} cm` : "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Quadril</p>
                  <p className="text-sm sm:text-base font-bold text-[#102E23]">
                    {latest.hipCm != null ? `${latest.hipCm} cm` : "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Braço</p>
                  <p className="text-sm sm:text-base font-bold text-[#102E23]">
                    {latest.armCm != null ? `${latest.armCm} cm` : "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2]">
                  <p className="text-[11px] text-[#5A6660]">Coxa</p>
                  <p className="text-sm sm:text-base font-bold text-[#102E23]">
                    {latest.thighCm != null ? `${latest.thighCm} cm` : "—"}
                  </p>
                </div>
              </div>

              {latest.note && (
                <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-xs text-[#5A6660]">
                  <span className="font-semibold text-[#102E23]">Anotação: </span>
                  {latest.note}
                </div>
              )}
            </div>
          )}

          {/* Comparativo entre 2 Datas */}
          {measurements.length > 1 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
                <h3 className="font-heading text-sm font-bold text-[#102E23]">
                  Comparador de Evolução
                </h3>
                <span className="text-xs text-[#176B49] font-semibold">
                  {measurements.length} datas registradas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#102E23]">
                    Data Recente (A):
                  </label>
                  <select
                    value={indexA}
                    onChange={(e) => setIndexA(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-xs font-semibold text-[#102E23] focus:outline-none focus:ring-1 focus:ring-[#176B49]"
                  >
                    {measurements.map((m, idx) => (
                      <option key={`a-${idx}`} value={idx}>
                        {formatDisplayDate(m.recordedOn)} {m.weightKg ? `(${m.weightKg} kg)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-[#102E23]">
                    Data Anterior (B):
                  </label>
                  <select
                    value={indexB}
                    onChange={(e) => setIndexB(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-xs font-semibold text-[#102E23] focus:outline-none focus:ring-1 focus:ring-[#176B49]"
                  >
                    {measurements.map((m, idx) => (
                      <option key={`b-${idx}`} value={idx}>
                        {formatDisplayDate(m.recordedOn)} {m.weightKg ? `(${m.weightKg} kg)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {measurementA && measurementB && deltas && (
                <div className="border border-[#E5E8E2] rounded-xl overflow-hidden divide-y divide-[#E5E8E2]">
                  <div className="grid grid-cols-4 px-3 py-2 bg-[#FAF9F6] text-[11px] font-bold text-[#5A6660] uppercase">
                    <span>Métrica</span>
                    <span className="text-center">{formatDisplayDate(measurementB.recordedOn)}</span>
                    <span className="text-center">{formatDisplayDate(measurementA.recordedOn)}</span>
                    <span className="text-right">Diferença</span>
                  </div>

                  <DetailComparisonRow
                    label="Peso"
                    valB={measurementB.weightKg != null ? `${measurementB.weightKg} kg` : "—"}
                    valA={measurementA.weightKg != null ? `${measurementA.weightKg} kg` : "—"}
                    delta={deltas.weight}
                  />

                  <DetailComparisonRow
                    label="Cintura"
                    valB={measurementB.waistCm != null ? `${measurementB.waistCm} cm` : "—"}
                    valA={measurementA.waistCm != null ? `${measurementA.waistCm} cm` : "—"}
                    delta={deltas.waist}
                  />

                  <DetailComparisonRow
                    label="Abdômen"
                    valB={measurementB.abdomenCm != null ? `${measurementB.abdomenCm} cm` : "—"}
                    valA={measurementA.abdomenCm != null ? `${measurementA.abdomenCm} cm` : "—"}
                    delta={deltas.abdomen}
                  />

                  <DetailComparisonRow
                    label="Quadril"
                    valB={measurementB.hipCm != null ? `${measurementB.hipCm} cm` : "—"}
                    valA={measurementA.hipCm != null ? `${measurementA.hipCm} cm` : "—"}
                    delta={deltas.hip}
                  />

                  <DetailComparisonRow
                    label="Braço"
                    valB={measurementB.armCm != null ? `${measurementB.armCm} cm` : "—"}
                    valA={measurementA.armCm != null ? `${measurementA.armCm} cm` : "—"}
                    delta={deltas.arm}
                  />

                  <DetailComparisonRow
                    label="Coxa"
                    valB={measurementB.thighCm != null ? `${measurementB.thighCm} cm` : "—"}
                    valA={measurementA.thighCm != null ? `${measurementA.thighCm} cm` : "—"}
                    delta={deltas.thigh}
                  />
                </div>
              )}
            </div>
          )}

          {/* Linha do Tempo de Avaliações Anteriores */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3">
            <h3 className="font-heading text-sm font-bold text-[#102E23] border-b border-[#E5E8E2] pb-3">
              Linha do Tempo de Avaliações
            </h3>

            <div className="divide-y divide-[#E5E8E2]">
              {measurements.map((m, idx) => (
                <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#102E23]">
                        {formatDisplayDate(m.recordedOn)}
                      </span>
                      {m.weightKg != null && (
                        <span className="font-bold text-[#176B49] bg-[#E8F0EA] px-2 py-0.5 rounded-full text-[11px]">
                          {m.weightKg} kg
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5A6660]">
                      {m.waistCm != null && <span>Cintura: {m.waistCm} cm</span>}
                      {m.abdomenCm != null && <span>• Abd: {m.abdomenCm} cm</span>}
                      {m.armCm != null && <span>• Braço: {m.armCm} cm</span>}
                      {m.thighCm != null && <span>• Coxa: {m.thighCm} cm</span>}
                      {m.hipCm != null && <span>• Quad: {m.hipCm} cm</span>}
                    </div>
                    {m.note && (
                      <p className="text-[11px] text-[#5A6660] italic pt-0.5">&ldquo;{m.note}&rdquo;</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modal Nova Avaliação */}
      {isAddModalOpen && (
        <QuickAddAssessmentModal
          consultancySlug={consultancySlug}
          studentPublicId={studentPublicId}
          studentName={studentName}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            startTransition(() => {
              router.refresh();
            });
          }}
        />
      )}
    </div>
  );
}

function DetailComparisonRow({
  label,
  valB,
  valA,
  delta,
}: {
  label: string;
  valB: string;
  valA: string;
  delta: { diff: number; diffFormatted: string; direction: "INCREASED" | "DECREASED" | "UNCHANGED" } | null;
}) {
  return (
    <div className="grid grid-cols-4 px-3 py-2 text-xs items-center hover:bg-[#FAF9F6]/50">
      <span className="font-semibold text-[#102E23]">{label}</span>
      <span className="text-center text-[#5A6660]">{valB}</span>
      <span className="text-center font-bold text-[#102E23]">{valA}</span>
      <div className="text-right">
        {delta ? (
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
              delta.direction === "DECREASED"
                ? "bg-emerald-50 text-emerald-700"
                : delta.direction === "INCREASED"
                ? "bg-amber-50 text-amber-800"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {delta.diffFormatted}
          </span>
        ) : (
          <span className="text-[#8E9992]">—</span>
        )}
      </div>
    </div>
  );
}

function QuickAddAssessmentModal({
  consultancySlug,
  studentPublicId,
  studentName,
  onClose,
  onSuccess,
}: {
  consultancySlug: string;
  studentPublicId: string;
  studentName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [recordedOn, setRecordedOn] = useState(todayStr);

  const [weightKg, setWeightKg] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [abdomenCm, setAbdomenCm] = useState("");
  const [hipCm, setHipCm] = useState("");
  const [armCm, setArmCm] = useState("");
  const [thighCm, setThighCm] = useState("");
  const [note, setNote] = useState("");

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (
      !weightKg.trim() &&
      !waistCm.trim() &&
      !abdomenCm.trim() &&
      !hipCm.trim() &&
      !armCm.trim() &&
      !thighCm.trim()
    ) {
      setErrorMessage("Preencha ao menos uma medida (peso ou circunferência).");
      return;
    }

    const formData = new FormData();
    formData.set("recordedOn", recordedOn);
    if (weightKg.trim()) formData.set("weightKg", weightKg.trim().replace(",", "."));
    if (waistCm.trim()) formData.set("waistCm", waistCm.trim().replace(",", "."));
    if (abdomenCm.trim()) formData.set("abdomenCm", abdomenCm.trim().replace(",", "."));
    if (hipCm.trim()) formData.set("hipCm", hipCm.trim().replace(",", "."));
    if (armCm.trim()) formData.set("armCm", armCm.trim().replace(",", "."));
    if (thighCm.trim()) formData.set("thighCm", thighCm.trim().replace(",", "."));
    if (note.trim()) formData.set("note", note.trim());

    startTransition(async () => {
      const res = await recordProfessionalProgressAction(
        consultancySlug,
        studentPublicId,
        formData
      );

      if (res.success) {
        onSuccess();
      } else {
        setErrorMessage(res.error || "Erro ao salvar avaliação física.");
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-[#E5E8E2] shadow-xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-[#E5E8E2] flex items-center justify-between gap-3 bg-[#FAF9F6]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
              <ScaleIcon className="w-5 h-5 text-[#176B49]" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold text-[#102E23]">
                Nova Avaliação Física
              </h2>
              <p className="text-xs text-[#5A6660]">
                Aluno: {studentName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg hover:bg-[#E5E8E2] text-[#5A6660] hover:text-[#102E23] flex items-center justify-center transition-colors cursor-pointer"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#102E23]">
              Data da avaliação <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={recordedOn}
              max={todayStr}
              onChange={(e) => setRecordedOn(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#102E23]">
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min="20"
              max="350"
              placeholder="Ex: 78.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-[#E5E8E2]">
            <p className="text-xs font-bold text-[#5A6660] uppercase tracking-wider">
              Circunferências (cm)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5A6660]">Cintura</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 82.0"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5A6660]">Abdômen</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 85.5"
                  value={abdomenCm}
                  onChange={(e) => setAbdomenCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5A6660]">Quadril</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 98.0"
                  value={hipCm}
                  onChange={(e) => setHipCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#5A6660]">Braço</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 34.0"
                  value={armCm}
                  onChange={(e) => setArmCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="block text-xs font-medium text-[#5A6660]">Coxa</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 56.5"
                  value={thighCm}
                  onChange={(e) => setThighCm(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-[#E5E8E2]">
            <label className="block text-xs font-bold text-[#102E23]">
              Observações (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Observações do Personal..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5E8E2] text-sm text-[#102E23] placeholder-[#8E9992] focus:outline-none focus:ring-2 focus:ring-[#176B49]/20 focus:border-[#176B49]"
            />
          </div>

          <div className="pt-3 border-t border-[#E5E8E2] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#5A6660] hover:text-[#102E23] hover:bg-[#F5F5F0] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] active:scale-[0.99] transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isPending ? "Salvando..." : "Salvar avaliação"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
