"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/account/user-avatar";
import { DuotoneTrainingIcon } from "@/components/ui/icons/duotone-icons";
import {
  NutritionPlanChoiceModal,
  type NutritionPlanCreationChoice,
} from "../nutrition-v2/nutrition-plan-choice-modal";
import { NutritionAiGenerateModal } from "../nutrition-v2/nutrition-ai-generate-modal";
import { NutritionAiImportModal } from "../nutrition-v2/nutrition-ai-import-modal";
import { NutritionTemplatePickerModal } from "../nutrition-v2/nutrition-template-picker-modal";
import { PersonalRequestModal, type RequestModalType } from "./personal-request-modal";
import { StudentNewWorkoutSheet } from "./student-new-workout-sheet";
import { StudentPhotosMural } from "./student-photos-mural";
import { StudentAnamnesisHub } from "./student-anamnesis-hub";
import { StudentFormsHub } from "./student-forms-hub";
import { StudentPhysicalAssessmentHub } from "./student-physical-assessment-hub";
import { StudentChargePlanModal } from "@/components/finance/student-charge-plan-modal";
import { updateStudentPersonalDataAction } from "@/app/consultoria/[slug]/progresso/alunos/[studentPublicId]/actions";
import type { StudentEvaluationResult } from "@/lib/monitoring/evaluator";
import type {
  PersonalStudentDetail,
  PhysicalMeasurement,
} from "@/lib/consultancies/personal-student-hub";

interface PersonalStudentDetailViewProps {
  consultancySlug: string;
  detail: PersonalStudentDetail;
  studentMonitoring?: StudentEvaluationResult | null;
  effectiveMode?: string;
  userRoles?: string[];
  backHref?: string;
  initialTab?: string;
}

type MainTab = "acompanhamento" | "gestao";
type FocusedView = "main" | "fotos" | "avaliacao-fisica" | "anamnese" | "formularios" | "historico";
type MetricKey = "weightKg" | "bodyFatPct" | "muscleMassKg" | "waistCm" | "abdomenCm" | "hipCm" | "armCm" | "thighCm";

// ============================================================================
// ICONS
// ============================================================================
function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function PhotoIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function FileTextIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ClipboardCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function ClockHistoryIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function MoreDotsIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ScaleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-7-5l7-3 7 3M4 14l3.5-7L11 14M13 14l3.5-7L20 14" />
    </svg>
  );
}

function AlertCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
    </svg>
  );
}

function EditIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  );
}

function ChatBubbleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-.84-.84c.137-.99.53-1.92 1.134-2.695C4.03 16.035 3 14.126 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function ChartBarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function UserBadgeIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

// ============================================================================
// FORMATTERS & HELPERS
// ============================================================================
export function formatDisplayDate(dateVal: unknown): string {
  if (!dateVal) return "Não informado";
  const str = String(dateVal).trim();
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return str;
  const d = String(parsed.getUTCDate()).padStart(2, "0");
  const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const y = parsed.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

function formatHeight(heightCm: number | null): string {
  if (!heightCm || heightCm <= 0) return "Não informada";
  if (heightCm > 3) {
    return `${(heightCm / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
  }
  return `${heightCm.toLocaleString("pt-BR")} m`;
}

function formatWeight(weightKg: number | null): string {
  if (!weightKg || weightKg <= 0) return "Não informado";
  return `${weightKg.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg`;
}

function calculateBMI(weightKg: number | null, heightCm: number | null): { bmi: number; label: string; color: string; disclaimer: string } | null {
  if (!weightKg || !heightCm || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm > 3 ? heightCm / 100 : heightCm;
  const bmiVal = weightKg / (heightM * heightM);
  if (isNaN(bmiVal) || bmiVal <= 0 || bmiVal > 100) return null;
  const bmi = Number(bmiVal.toFixed(1));

  let label = "Peso adequado (referência OMS)";
  let color = "text-emerald-800 bg-emerald-50 border-emerald-200";
  if (bmi < 18.5) {
    label = "Abaixo do peso ideal (OMS)";
    color = "text-amber-800 bg-amber-50 border-amber-200";
  } else if (bmi >= 25 && bmi < 30) {
    label = "Sobrepeso (referência OMS)";
    color = "text-amber-800 bg-amber-50 border-amber-200";
  } else if (bmi >= 30) {
    label = "Obesidade (referência OMS)";
    color = "text-rose-800 bg-rose-50 border-rose-200";
  }
  const disclaimer = "Índice populacional de referência da OMS. Não diferencia massa magra de gordura e não substitui avaliação clínica presencial.";
  return { bmi, label, color, disclaimer };
}

function getWhatsAppHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;
  const fullNumber = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${fullNumber}`;
}

// ============================================================================
// NATIVE SVG BODY COMPOSITION CHART
// ============================================================================
interface ChartProps {
  measurements: PhysicalMeasurement[];
  metricKey: MetricKey;
  metricLabel: string;
  metricUnit: string;
}

function NativeBodyCompositionChart({ measurements, metricKey, metricLabel, metricUnit }: ChartProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  // Filter valid data points and sort chronologically (oldest to newest)
  const validPoints = useMemo(() => {
    return measurements
      .filter((m) => m[metricKey] != null && !isNaN(Number(m[metricKey])))
      .map((m) => ({
        date: m.recordedOn,
        value: Number(m[metricKey]),
        note: m.note,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [measurements, metricKey]);

  if (validPoints.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-[#FAF9F6] border border-[#E5E8E2] text-center space-y-2">
        <ScaleIcon className="w-8 h-8 text-[#8E9992] mx-auto" />
        <p className="text-xs font-semibold text-[#102E23]">
          Nenhum registro de {metricLabel.toLowerCase()} para este aluno.
        </p>
        <p className="text-[11px] text-[#5A6660] max-w-md mx-auto">
          {metricKey === "bodyFatPct" || metricKey === "muscleMassKg"
            ? "Métricas de composição corporal são preenchidas no módulo de avaliação física (bioimpedância ou protocolo de dobras cutâneas)."
            : "Adicione uma avaliação física para acompanhar a evolução das medidas anatômicas ao longo do tempo."}
        </p>
      </div>
    );
  }

  const initialVal = validPoints[0].value;
  const currentVal = validPoints[validPoints.length - 1].value;
  const minVal = Math.min(...validPoints.map((p) => p.value));
  const maxVal = Math.max(...validPoints.map((p) => p.value));
  const delta = currentVal - initialVal;
  const deltaFormatted = delta === 0 ? "0.0" : delta > 0 ? `+${delta.toFixed(1)}` : `${delta.toFixed(1)}`;

  // SVG Coordinates calculation
  const width = 600;
  const height = 220;
  const padTop = 25;
  const padBottom = 40;
  const padLeft = 45;
  const padRight = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const yRange = maxVal === minVal ? (maxVal * 0.1 || 1) : maxVal - minVal;
  const yMin = Math.max(0, minVal - yRange * 0.15);
  const yMax = maxVal + yRange * 0.15;
  const ySpread = yMax - yMin;

  const coords = validPoints.map((p, idx) => {
    const x = validPoints.length === 1
      ? padLeft + chartW / 2
      : padLeft + (idx / (validPoints.length - 1)) * chartW;
    const y = padTop + chartH - ((p.value - yMin) / ySpread) * chartH;
    return { x, y, ...p };
  });

  // Build SVG path
  const linePath = coords.length === 1
    ? `M ${coords[0].x - 10} ${coords[0].y} L ${coords[0].x + 10} ${coords[0].y}`
    : coords.reduce((acc, pt, idx) => {
        if (idx === 0) return `M ${pt.x} ${pt.y}`;
        const prev = coords[idx - 1];
        const cpX = (prev.x + pt.x) / 2;
        return `${acc} C ${cpX} ${prev.y}, ${cpX} ${pt.y}, ${pt.x} ${pt.y}`;
      }, "");

  const areaPath = coords.length > 1
    ? `${linePath} L ${coords[coords.length - 1].x} ${padTop + chartH} L ${coords[0].x} ${padTop + chartH} Z`
    : "";

  return (
    <div className="space-y-4">
      {/* Header com Resumo Estatístico */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
        <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2]">
          <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Inicial</span>
          <span className="text-sm font-bold text-[#102E23]">{initialVal.toFixed(1)} {metricUnit}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2]">
          <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Atual</span>
          <span className="text-sm font-bold text-[#102E23]">{currentVal.toFixed(1)} {metricUnit}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2]">
          <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Menor</span>
          <span className="text-sm font-bold text-[#102E23]">{minVal.toFixed(1)} {metricUnit}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2]">
          <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Maior</span>
          <span className="text-sm font-bold text-[#102E23]">{maxVal.toFixed(1)} {metricUnit}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Variação Total</span>
          <span className={`text-sm font-bold ${delta < 0 ? "text-emerald-700" : delta > 0 ? "text-amber-700" : "text-[#102E23]"}`}>
            {deltaFormatted} {metricUnit}
          </span>
        </div>
      </div>

      {/* Alternador de visualização: Gráfico vs Tabela */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#5A6660]">
          {validPoints.length} {validPoints.length === 1 ? "registro encontrado" : "registros ao longo do tempo"}
        </span>
        <button
          type="button"
          onClick={() => setViewMode(viewMode === "chart" ? "table" : "chart")}
          className="text-xs font-bold text-[#176B49] hover:text-[#125438] underline cursor-pointer"
        >
          {viewMode === "chart" ? "Ver em tabela" : "Ver em gráfico"}
        </button>
      </div>

      {viewMode === "chart" ? (
        <div className="w-full overflow-hidden rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] p-2 sm:p-4">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            aria-label={`Gráfico de evolução de ${metricLabel}`}
          >
            <defs>
              <linearGradient id="gradient-area-student" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#176B49" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#176B49" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines Horizontais */}
            {[0, 0.5, 1].map((pct) => {
              const yPos = padTop + chartH * pct;
              const val = yMax - pct * ySpread;
              return (
                <g key={pct}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={width - padRight}
                    y2={yPos}
                    stroke="#E5E8E2"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={yPos + 4}
                    textAnchor="end"
                    fill="#8E9992"
                    fontSize="10"
                    fontWeight="500"
                  >
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Área Gradiente sob a curva */}
            {areaPath && (
              <path d={areaPath} fill="url(#gradient-area-student)" />
            )}

            {/* Linha Principal */}
            <path
              d={linePath}
              fill="none"
              stroke="#176B49"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Pontos de Dados */}
            {coords.map((pt, idx) => (
              <g key={idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="#176B49"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  className="transition-transform hover:scale-125"
                />
                {/* Rótulo de valor no ponto */}
                <text
                  x={pt.x}
                  y={pt.y - 10}
                  textAnchor="middle"
                  fill="#102E23"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {pt.value.toFixed(1)}
                </text>
                {/* Rótulo de data no eixo X */}
                <text
                  x={pt.x}
                  y={padTop + chartH + 18}
                  textAnchor="middle"
                  fill="#8E9992"
                  fontSize="9"
                  fontWeight="600"
                >
                  {formatDisplayDate(pt.date).slice(0, 5)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      ) : (
        /* Tabela Detalhada com os dados */
        <div className="overflow-x-auto rounded-xl border border-[#E5E8E2] bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] text-[#5A6660] font-bold border-b border-[#E5E8E2]">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Valor ({metricUnit})</th>
                <th className="p-3">Diferença</th>
                <th className="p-3">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E2]">
              {[...validPoints].reverse().map((pt, idx, arr) => {
                const prev = arr[idx + 1];
                const stepDelta = prev ? pt.value - prev.value : 0;
                const stepDeltaFormatted = prev
                  ? stepDelta === 0
                    ? "0.0"
                    : stepDelta > 0
                    ? `+${stepDelta.toFixed(1)}`
                    : stepDelta.toFixed(1)
                  : "Não informado";

                return (
                  <tr key={idx} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="p-3 font-semibold text-[#102E23]">{formatDisplayDate(pt.date)}</td>
                    <td className="p-3 font-bold text-[#102E23]">{pt.value.toFixed(1)} {metricUnit}</td>
                    <td className="p-3">
                      <span className={`font-semibold ${stepDelta < 0 ? "text-emerald-700" : stepDelta > 0 ? "text-amber-700" : "text-[#5A6660]"}`}>
                        {stepDeltaFormatted}
                      </span>
                    </td>
                    <td className="p-3 text-[#5A6660]">{pt.note || "Não informado"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function PersonalStudentDetailView({
  consultancySlug,
  detail,
  backHref,
  initialTab,
}: PersonalStudentDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const student = useMemo(() => detail.student || {
    membershipPublicId: "",
    userPublicId: "",
    name: "Aluno",
    email: "",
    phone: null,
    joinedAt: null,
    status: "ACTIVE",
  }, [detail.student]);

  const overview = useMemo(() => detail.overview || {
    objective: null,
    nutritionGoal: null,
    allergies: null,
    intolerances: null,
    dietaryRestrictions: null,
    birthDate: null,
    age: null,
    sex: null,
    heightCm: null,
    weightKg: null,
    lastWeightRecordedOn: null,
    latestWorkoutTitle: null,
    latestWorkoutDifficulty: null,
    activeWorkoutsCount: 0,
    completedWorkoutsCount: 0,
    hasAnamnesis: false,
    hasPhotos: false,
    hasForms: false,
    latestNutritionTitle: null,
    activeNutritionCount: 0,
    hasPendingPhotos: false,
    hasPendingAnamnesis: false,
    hasPendingAssessment: false,
    coachName: null,
    studentLevel: "INICIANTE",
    discProfile: null,
    parqStatus: "NAO_PREENCHIDO",
    injuriesAndLimitations: null,
    latestBodyFatPct: null,
    latestMuscleMassKg: null,
    completedLast30DaysCount: 0,
    last30DaysActivityDates: [],
    contractPlanTitle: null,
    contractStartsOn: null,
    contractEndsOn: null,
    contractDaysRemaining: null,
    contractPercentElapsed: null,
    last30DaysSummary: [],
  }, [detail.overview]);

  const photos = useMemo(() => detail.photos || [], [detail.photos]);
  const anamnesis = useMemo(() => detail.anamnesis || [], [detail.anamnesis]);
  const forms = useMemo(() => detail.forms || [], [detail.forms]);
  const workouts = useMemo(() => detail.workouts || [], [detail.workouts]);
  const completedSessions = useMemo(() => detail.completedSessions || [], [detail.completedSessions]);
  const measurements = useMemo(() => detail.measurements || [], [detail.measurements]);
  const latestMeasurement = measurements.length > 0 ? measurements[0] : null;
  const financialCharges = useMemo(() => detail.financial?.charges || [], [detail.financial?.charges]);
  const availablePlans = useMemo(() => detail.financial?.availablePlans || [], [detail.financial?.availablePlans]);

  // Tabs state: Acompanhamento (default) vs Gestão do Aluno
  const [activeTab, setActiveTab] = useState<MainTab>("acompanhamento");

  // Sub-view focalizada (para abrir mural de fotos, avaliação física completa, etc.)
  const [focusedView, setFocusedView] = useState<FocusedView>(() => {
    if (initialTab && ["fotos", "avaliacao-fisica", "anamnese", "formularios", "historico"].includes(initialTab)) {
      return initialTab as FocusedView;
    }
    return "main";
  });

  // Selected metric for SVG chart in Gestão tab
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("weightKg");

  // UI state
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);
  const [isEditDataModalOpen, setIsEditDataModalOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isChargePlanModalOpen, setIsChargePlanModalOpen] = useState(false);

  // Edit form state
  const [editWeight, setEditWeight] = useState(overview.weightKg ? String(overview.weightKg) : "");
  const [editHeight, setEditHeight] = useState(overview.heightCm ? String(overview.heightCm) : "");
  const [editObjective, setEditObjective] = useState(overview.objective || "");
  const [editPhone, setEditPhone] = useState(student.phone || "");
  const [editDisc, setEditDisc] = useState(overview.discProfile || "");
  const [editLevel, setEditLevel] = useState(overview.studentLevel || "INICIANTE");
  const [editError, setEditError] = useState<string | null>(null);

  // Sheets and Request Modals
  const [isNewWorkoutSheetOpen, setIsNewWorkoutSheetOpen] = useState(false);
  const [requestModal, setRequestModal] = useState<{ isOpen: boolean; type: RequestModalType }>({
    isOpen: false,
    type: "PHOTOS",
  });

  // Nutrition plan creation modals
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isGenerateAiOpen, setIsGenerateAiOpen] = useState(false);
  const [isImportAiOpen, setIsImportAiOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  const handleSelectPlanChoice = (choice: NutritionPlanCreationChoice) => {
    setIsChoiceModalOpen(false);
    const studentPubId = student.membershipPublicId;
    if (choice === "manual") {
      router.push(`/consultoria/${consultancySlug}/planos-v2/novo?student=${studentPubId}&studentId=${studentPubId}`);
    } else if (choice === "ai-scratch") {
      setIsGenerateAiOpen(true);
    } else if (choice === "ai-import") {
      setIsImportAiOpen(true);
    } else if (choice === "template") {
      setIsTemplatePickerOpen(true);
    }
  };

  // Active workout
  const activeWorkout = workouts.find((w) => w.status === "ACTIVE") || null;
  const endedWorkouts = workouts.filter((w) => w.status === "ENDED");

  // BMI calculation
  const currentWeightForBmi = latestMeasurement?.weightKg || overview.weightKg;
  const currentHeightForBmi = overview.heightCm;
  const bmiInfo = calculateBMI(currentWeightForBmi, currentHeightForBmi);

  // WhatsApp link
  const whatsAppHref = getWhatsAppHref(student.phone);

  // Contract validity calculations (pure, server-backed)
  const contractValidity = useMemo(() => {
    const startsOn = overview.contractStartsOn || activeWorkout?.startsOn || student.joinedAt;
    const endsOn = overview.contractEndsOn || activeWorkout?.endsOn || null;

    if (!endsOn) {
      return {
        hasEndDate: false,
        startsOnFormatted: formatDisplayDate(startsOn),
        endsOnFormatted: "Contínuo",
        percentElapsed: 100,
        daysRemaining: null,
        badgeLabel: "Plano Contínuo",
        badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
      };
    }

    const percent = overview.contractPercentElapsed ?? 100;
    const daysRemaining = overview.contractDaysRemaining ?? 0;

    let badgeLabel = `${daysRemaining} dias restantes`;
    let badgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";

    if (daysRemaining < 0) {
      badgeLabel = `Vencido há ${Math.abs(daysRemaining)} dias`;
      badgeColor = "text-rose-700 bg-rose-50 border-rose-200";
    } else if (daysRemaining <= 7) {
      badgeLabel = `Vence em ${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"}`;
      badgeColor = "text-amber-700 bg-amber-50 border-amber-200";
    }

    return {
      hasEndDate: true,
      startsOnFormatted: formatDisplayDate(startsOn),
      endsOnFormatted: formatDisplayDate(endsOn),
      percentElapsed: percent,
      daysRemaining,
      badgeLabel,
      badgeColor,
    };
  }, [overview.contractStartsOn, overview.contractEndsOn, overview.contractPercentElapsed, overview.contractDaysRemaining, activeWorkout?.startsOn, activeWorkout?.endsOn, student.joinedAt]);

  // 30 Days Activity Map (last 30 days grid computed on server)
  const last30DaysList = useMemo(() => overview.last30DaysSummary || [], [overview.last30DaysSummary]);

  // Unified Student Timeline Events (for Histórico)
  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string;
      date: string;
      title: string;
      subtitle: string;
      type: "workout" | "photo" | "anamnesis" | "form" | "session";
    }> = [];

    workouts.forEach((w) => {
      events.push({
        id: `workout-${w.assignmentPublicId}`,
        date: w.assignedAt || w.startsOn,
        title: `Treino prescrito: ${w.title}`,
        subtitle: `Versão ${w.versionNumber} • ${w.status === "ACTIVE" ? "Em andamento" : "Encerrado"}`,
        type: "workout",
      });
    });

    completedSessions.forEach((s) => {
      events.push({
        id: `session-${s.publicId}`,
        date: s.completedAt,
        title: `Sessão de treino concluída: ${s.workoutTitle}`,
        subtitle: `${s.completedSetsCount} séries realizadas ${s.studentFeedbackNotes ? `• "${s.studentFeedbackNotes}"` : ""}`,
        type: "session",
      });
    });

    photos.forEach((p) => {
      events.push({
        id: `photo-${p.requestPublicId}`,
        date: p.submittedAt || p.createdAt || p.evaluationDate || "",
        title: `Fotos de evolução registradas (${p.images?.length || 0} poses)`,
        subtitle: p.reviewerNotes || "Avaliação fotográfica arquivada",
        type: "photo",
      });
    });

    forms.forEach((f) => {
      events.push({
        id: `form-${f.publicId}`,
        date: f.submittedAt || f.requestedAt || "",
        title: `Formulário: ${f.title}`,
        subtitle: `Situação: ${f.status === "SUBMITTED" ? "Respondido" : f.status === "PENDING" ? "Aguardando resposta" : f.status}`,
        type: "form",
      });
    });

    measurements.forEach((m, idx) => {
      events.push({
        id: `assessment-${idx}-${m.recordedOn}`,
        date: m.recordedOn,
        title: `Avaliação física realizada${m.weightKg ? `: ${m.weightKg} kg` : ""}`,
        subtitle: [
          m.bodyFatPct != null ? `Gordura: ${m.bodyFatPct}%` : null,
          m.muscleMassKg != null ? `Massa muscular: ${m.muscleMassKg}kg` : null,
          m.waistCm ? `Cintura: ${m.waistCm}cm` : null,
          m.abdomenCm ? `Abdômen: ${m.abdomenCm}cm` : null,
          m.armCm ? `Braço: ${m.armCm}cm` : null,
          m.thighCm ? `Coxa: ${m.thighCm}cm` : null,
        ].filter(Boolean).join(" • ") || (m.note ? m.note : "Medidas corporais registradas"),
        type: "session",
      });
    });

    return events.sort((a, b) => {
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    });
  }, [workouts, completedSessions, photos, forms, measurements]);

  const handleSavePersonalData = () => {
    setEditError(null);
    const weightNum = editWeight.trim() ? parseFloat(editWeight.replace(",", ".")) : null;
    const heightNum = editHeight.trim() ? parseFloat(editHeight.replace(",", ".")) : null;

    startTransition(async () => {
      const res = await updateStudentPersonalDataAction(consultancySlug, student.membershipPublicId, {
        weightKg: weightNum,
        heightCm: heightNum,
        objective: editObjective.trim() || null,
        phone: editPhone.trim() || null,
        discProfile: editDisc.trim() || null,
        studentLevel: editLevel || null,
      });

      if (!res.success) {
        setEditError(res.error || "Não foi possível salvar os dados.");
      } else {
        setIsEditDataModalOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4 pb-20 max-w-full overflow-x-hidden">
      {/* =========================================================================
          CABEÇALHO COMPACTO FIXO NO MOBILE (Aparece suave durante a rolagem)
          ========================================================================= */}
      <div className="sticky top-0 z-30 sm:hidden -mx-4 px-4 py-2.5 bg-[#F5F5F0]/95 backdrop-blur-md border-b border-[#E5E8E2] flex items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <UserAvatar
            fullName={student.name}
            userPublicId={student.userPublicId}
            size="sm"
            className="shrink-0 border border-[#E5E8E2]"
          />
          <div className="min-w-0">
            <p className="font-bold text-xs text-[#102E23] truncate leading-tight">{student.name}</p>
            <p className="text-[10px] text-[#5A6660] truncate">
              {activeTab === "acompanhamento" ? "Acompanhamento" : "Gestão do Aluno"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsNewWorkoutSheetOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-[#176B49] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <PlusIcon className="w-3 h-3" />
            <span>Treino</span>
          </button>
          {whatsAppHref && (
            <a
              href={whatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5] cursor-pointer"
              title="Abrir WhatsApp do aluno"
            >
              <WhatsAppIcon className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* =========================================================================
          BARRA DE VOLTAR
          ========================================================================= */}
      <div className="flex items-center justify-between">
        {focusedView === "main" ? (
          <Link
            href={backHref || `/consultoria/${consultancySlug}/progresso/alunos`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#5A6660] hover:text-[#102E23] transition-colors min-h-[36px]"
          >
            <ArrowLeftIcon className="w-4 h-4 text-[#176B49]" />
            <span>Voltar aos alunos</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setFocusedView("main")}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#176B49] hover:text-[#125438] bg-[#E8F0EA] hover:bg-[#DBE7DE] px-3.5 py-1.5 rounded-xl border border-[#CDEED5] transition-colors min-h-[36px] cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4 text-[#176B49]" />
            <span>Voltar ao perfil de {student.name}</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          CABEÇALHO EXPANDIDO DO ALUNO
          Foto + Nome + Idade/Altura/Peso chips + Ações Rápidas
          ========================================================================= */}
      <header className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Identificação Principal: Avatar + Nome + Chips */}
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <UserAvatar
              fullName={student.name}
              userPublicId={student.userPublicId}
              size="lg"
              className="shrink-0 border border-[#E5E8E2] shadow-2xs"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[#102E23] truncate">
                  {student.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                  {student.status === "ACTIVE" ? "Ativo" : student.status}
                </span>
              </div>

              {/* Chips Rápidos: Idade, Altura, Peso */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#5A6660]">
                {overview.age ? (
                  <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E8E2] font-semibold text-[#102E23]">
                    {overview.age} anos
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E8E2] text-[#8E9992]">
                    Idade não informada
                  </span>
                )}
                {overview.heightCm ? (
                  <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E8E2] font-semibold text-[#102E23]">
                    {formatHeight(overview.heightCm)}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E8E2] text-[#8E9992]">
                    Altura não informada
                  </span>
                )}
                {(latestMeasurement?.weightKg || overview.weightKg) ? (
                  <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E8E2] font-semibold text-[#102E23]">
                    {formatWeight(latestMeasurement?.weightKg || overview.weightKg)}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E8E2] text-[#8E9992]">
                    Peso não informado
                  </span>
                )}
                {overview.sex ? (
                  <span className="px-2 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E8E2] font-semibold text-[#5A6660]">
                    {overview.sex.toUpperCase() === "M" || overview.sex.toUpperCase() === "MASCULINO" ? "Masc." : "Fem."}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Ações Rápidas do Cabeçalho */}
          <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
            {/* Novo treino */}
            <button
              type="button"
              onClick={() => setIsNewWorkoutSheetOpen(true)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#176B49] hover:bg-[#125438] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Novo treino</span>
            </button>

            {/* Nova avaliação */}
            <button
              type="button"
              onClick={() => setFocusedView("avaliacao-fisica")}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EBEBE5] text-[#102E23] font-bold text-xs flex items-center gap-1.5 border border-[#E5E8E2] transition-colors cursor-pointer"
            >
              <ScaleIcon className="w-4 h-4 text-[#176B49]" />
              <span className="hidden sm:inline">Nova avaliação</span>
              <span className="sm:hidden">Avaliação</span>
            </button>

            {/* Solicitar fotos */}
            <button
              type="button"
              onClick={() => setRequestModal({ isOpen: true, type: "PHOTOS" })}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EBEBE5] text-[#102E23] font-bold text-xs flex items-center gap-1.5 border border-[#E5E8E2] transition-colors cursor-pointer"
            >
              <PhotoIcon className="w-4 h-4 text-[#176B49]" />
              <span className="hidden sm:inline">Solicitar fotos</span>
              <span className="sm:hidden">Fotos</span>
            </button>

            {/* Conversar (WhatsApp direto se houver telefone, ou Trevo Chat) */}
            {whatsAppHref ? (
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#E8F0EA] hover:bg-[#DBE7DE] text-[#176B49] font-bold text-xs flex items-center gap-1.5 border border-[#CDEED5] transition-colors shadow-2xs"
                title="Conversar com o aluno no WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#176B49]" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            ) : (
              <Link
                href={`/consultoria/${consultancySlug}/consultas?student=${student.membershipPublicId}`}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#E8F0EA] hover:bg-[#DBE7DE] text-[#176B49] font-bold text-xs flex items-center gap-1.5 border border-[#CDEED5] transition-colors shadow-2xs"
                title="Conversar no Trevo Chat"
              >
                <ChatBubbleIcon className="w-4 h-4 text-[#176B49]" />
                <span className="hidden sm:inline">Trevo Chat</span>
              </Link>
            )}

            {/* Menu 3 Pontos (Mais opções) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSecondaryMenuOpen((prev) => !prev)}
                aria-label="Mais opções do aluno"
                className="p-2 rounded-xl text-[#5A6660] hover:text-[#102E23] bg-[#FAF9F6] hover:bg-[#EBEBE5] border border-[#E5E8E2] min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors cursor-pointer"
              >
                <MoreDotsIcon className="w-5 h-5" />
              </button>

              {isSecondaryMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsSecondaryMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-1 z-50 w-56 p-1 rounded-2xl bg-white border border-[#E5E8E2] shadow-xl space-y-0.5">
                    <Link
                      href={`/consultoria/${consultancySlug}/consultas?student=${student.membershipPublicId}`}
                      onClick={() => setIsSecondaryMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#FAF9F6] text-left cursor-pointer"
                    >
                      <ChatBubbleIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Conversar no chat</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setRequestModal({ isOpen: true, type: "ANAMNESIS" });
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#FAF9F6] text-left cursor-pointer"
                    >
                      <ClipboardCheckIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Solicitar anamnese</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setRequestModal({ isOpen: true, type: "FORM" });
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#FAF9F6] text-left cursor-pointer"
                    >
                      <FileTextIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Enviar formulário</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setIsEditDataModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#FAF9F6] text-left cursor-pointer"
                    >
                      <EditIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Editar dados cadastrais</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        setFocusedView("historico");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#FAF9F6] text-left cursor-pointer"
                    >
                      <ClockHistoryIcon className="w-4 h-4 text-[#176B49]" />
                      <span>Ver histórico completo</span>
                    </button>
                    {student.email && (
                      <a
                        href={`mailto:${student.email}`}
                        onClick={() => setIsSecondaryMenuOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#102E23] hover:bg-[#FAF9F6] text-left"
                      >
                        <span className="w-4 text-center text-xs text-[#5A6660]">✉</span>
                        <span>Enviar e-mail</span>
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* =====================================================================
            SELETOR DE ABAS PRINCIPAIS (Segmented Control Elegante)
            Aba 1: ACOMPANHAMENTO (Default) | Aba 2: GESTÃO DO ALUNO
            ===================================================================== */}
        {focusedView === "main" && (
          <nav aria-label="Abas do perfil" className="pt-2 border-t border-[#E5E8E2]">
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2]">
              <button
                type="button"
                onClick={() => setActiveTab("acompanhamento")}
                className={`min-h-[44px] py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "acompanhamento"
                    ? "bg-white text-[#102E23] shadow-xs border border-[#E5E8E2]"
                    : "text-[#5A6660] hover:text-[#102E23]"
                }`}
              >
                <DuotoneTrainingIcon className={`w-4 h-4 ${activeTab === "acompanhamento" ? "text-[#176B49]" : "text-[#8E9992]"}`} />
                <span>ACOMPANHAMENTO</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("gestao")}
                className={`min-h-[44px] py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "gestao"
                    ? "bg-white text-[#102E23] shadow-xs border border-[#E5E8E2]"
                    : "text-[#5A6660] hover:text-[#102E23]"
                }`}
              >
                <UserBadgeIcon className={`w-4 h-4 ${activeTab === "gestao" ? "text-[#176B49]" : "text-[#8E9992]"}`} />
                <span>GESTÃO DO ALUNO</span>
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* =========================================================================
          CONTEÚDO PRINCIPAL (Exibido quando focusedView === "main")
          ========================================================================= */}
      {focusedView === "main" && (
        <main className="space-y-4">
          {/* =====================================================================
              ABA 1: ACOMPANHAMENTO (Default)
              ===================================================================== */}
          {activeTab === "acompanhamento" && (
            <div className="space-y-4">
              {/* 1. CARD DE OBJETIVO ATUAL */}
              <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                      Objetivo Principal
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditDataModalOpen(true)}
                    className="text-xs font-bold text-[#176B49] hover:text-[#125438] flex items-center gap-1 cursor-pointer"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                    <span>Editar objetivo</span>
                  </button>
                </div>
                <p className="text-base sm:text-lg font-bold text-[#102E23] leading-snug">
                  {overview.objective || "Nenhum objetivo cadastrado no momento."}
                </p>
                {overview.nutritionGoal && overview.nutritionGoal !== overview.objective && (
                  <p className="text-xs text-[#5A6660]">
                    <strong className="text-[#102E23]">Meta nutricional:</strong> {overview.nutritionGoal}
                  </p>
                )}
              </section>

              {/* 2. GRID DE INFORMAÇÕES RÁPIDAS (2x2 no mobile, 4 colunas no desktop) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 2.1. Perfil DISC */}
                <div className="p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660]">Perfil DISC</span>
                    <SparklesIcon className="w-4 h-4 text-[#176B49] shrink-0" />
                  </div>
                  <div>
                    {overview.discProfile ? (
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-[#E8F0EA] text-[#176B49] font-bold text-xs border border-[#CDEED5]">
                        {overview.discProfile}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditDataModalOpen(true)}
                        className="text-xs font-semibold text-[#8E9992] hover:text-[#176B49] transition-colors cursor-pointer text-left"
                      >
                        Não avaliado • <span className="font-bold underline text-[#176B49]">Definir</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2.2. Contatos & Notas */}
                <div className="p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660]">Contato</span>
                    <ChatBubbleIcon className="w-4 h-4 text-[#176B49] shrink-0" />
                  </div>
                  <div className="min-w-0">
                    {student.phone ? (
                      <div className="space-y-0.5">
                        <a
                          href={whatsAppHref || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-[#176B49] hover:underline flex items-center gap-1 truncate"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{student.phone}</span>
                        </a>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsEditDataModalOpen(true)}
                        className="text-xs font-semibold text-[#8E9992] hover:text-[#176B49] cursor-pointer text-left"
                      >
                        Sem telefone • <span className="font-bold underline text-[#176B49]">Adicionar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2.3. Prontidão Física (PAR-Q) */}
                <div className="p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660]">PAR-Q</span>
                    <CheckCircleIcon className="w-4 h-4 text-[#176B49] shrink-0" />
                  </div>
                  <div>
                    {overview.parqStatus === "SEM_ALERTAS" ? (
                      <div className="space-y-0.5">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                          Sem alertas no PAR-Q
                        </span>
                        <p className="text-[10px] text-[#5A6660] leading-tight">
                          Sem restrições declaradas no questionário
                        </p>
                      </div>
                    ) : overview.parqStatus === "COM_ALERTAS" ? (
                      <div className="space-y-0.5">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                          Alertas no PAR-Q
                        </span>
                        <p className="text-[10px] text-amber-700 leading-tight">
                          Restrições relatadas pelo aluno
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFocusedView("anamnese")}
                        className="text-xs font-semibold text-[#8E9992] hover:text-[#176B49] cursor-pointer text-left"
                      >
                        Não respondido • <span className="font-bold underline text-[#176B49]">Anamnese</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2.4. Lesões & Limitações */}
                <div className="p-3.5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660]">Lesões</span>
                    <AlertCircleIcon className="w-4 h-4 text-amber-700 shrink-0" />
                  </div>
                  <div className="min-w-0">
                    {overview.injuriesAndLimitations ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-amber-900 truncate" title={overview.injuriesAndLimitations}>
                          {overview.injuriesAndLimitations}
                        </p>
                        <p className="text-[10px] text-[#5A6660]">Declaradas pelo aluno</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>Nenhuma informada</span>
                        </p>
                        <p className="text-[10px] text-[#5A6660]">Conforme anamnese</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. RESUMO DA ÚLTIMA AVALIAÇÃO FÍSICA & INDICADORES CORPORAIS */}
              <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
                  <div className="flex items-center gap-2">
                    <ScaleIcon className="w-5 h-5 text-[#176B49]" />
                    <h2 className="font-heading text-base font-bold text-[#102E23]">
                      Última Avaliação Física & Composição Corporal
                    </h2>
                  </div>
                  {latestMeasurement ? (
                    <span className="text-xs font-semibold text-[#5A6660]">
                      {formatDisplayDate(latestMeasurement.recordedOn)}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#8E9992]">
                      Não registrada
                    </span>
                  )}
                </div>

                {/* 4 Indicadores Corporais de Destaque */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* 1. Peso Corporal */}
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Peso Corporal</span>
                    <span className="text-base sm:text-lg font-bold text-[#102E23] block">
                      {formatWeight(latestMeasurement?.weightKg || overview.weightKg)}
                    </span>
                    <span className="text-[10px] text-[#5A6660] block">
                      {latestMeasurement?.weightKg ? "Aferido em consulta" : "Cadastro inicial"}
                    </span>
                  </div>

                  {/* 2. Gordura Corporal (%) */}
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Gordura Corporal</span>
                    <span className="text-base sm:text-lg font-bold text-[#102E23] block">
                      {latestMeasurement?.bodyFatPct != null
                        ? `${latestMeasurement.bodyFatPct}%`
                        : overview.latestBodyFatPct != null
                        ? `${overview.latestBodyFatPct}%`
                        : "Não informada"}
                    </span>
                    <span className="text-[10px] text-[#5A6660] block">
                      {latestMeasurement?.bodyFatPct != null || overview.latestBodyFatPct != null
                        ? "Bioimpedância / Dobras"
                        : "Requer avaliação física"}
                    </span>
                  </div>

                  {/* 3. Massa Muscular */}
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Massa Muscular</span>
                    <span className="text-base sm:text-lg font-bold text-[#102E23] block">
                      {latestMeasurement?.muscleMassKg != null
                        ? `${latestMeasurement.muscleMassKg} kg`
                        : overview.latestMuscleMassKg != null
                        ? `${overview.latestMuscleMassKg} kg`
                        : "Não informada"}
                    </span>
                    <span className="text-[10px] text-[#5A6660] block">
                      {latestMeasurement?.muscleMassKg != null || overview.latestMuscleMassKg != null
                        ? "Massa esquelética"
                        : "Requer avaliação física"}
                    </span>
                  </div>

                  {/* 4. IMC Referencial OMS */}
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">IMC Referencial</span>
                    {bmiInfo ? (
                      <div className="space-y-0.5">
                        <span className="text-base sm:text-lg font-bold text-[#102E23] block">{bmiInfo.bmi} kg/m²</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border inline-block ${bmiInfo.color}`}>
                          {bmiInfo.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-[#8E9992] block pt-1">
                        Não calculado (dados incompletos)
                      </span>
                    )}
                  </div>
                </div>

                {/* Medidas de Circunferência */}
                {latestMeasurement && (
                  <div className="p-3 rounded-xl bg-white border border-[#E5E8E2] space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">
                      Circunferências Corporais
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
                        <span className="text-[10px] text-[#5A6660] block">Cintura</span>
                        <span className="font-bold text-[#102E23]">{latestMeasurement.waistCm != null ? `${latestMeasurement.waistCm} cm` : "Não informada"}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
                        <span className="text-[10px] text-[#5A6660] block">Abdômen</span>
                        <span className="font-bold text-[#102E23]">{latestMeasurement.abdomenCm != null ? `${latestMeasurement.abdomenCm} cm` : "Não informado"}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
                        <span className="text-[10px] text-[#5A6660] block">Quadril</span>
                        <span className="font-bold text-[#102E23]">{latestMeasurement.hipCm != null ? `${latestMeasurement.hipCm} cm` : "Não informado"}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
                        <span className="text-[10px] text-[#5A6660] block">Braço</span>
                        <span className="font-bold text-[#102E23]">{latestMeasurement.armCm != null ? `${latestMeasurement.armCm} cm` : "Não informado"}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-[#FAF9F6] border border-[#E5E8E2]">
                        <span className="text-[10px] text-[#5A6660] block">Coxa</span>
                        <span className="font-bold text-[#102E23]">{latestMeasurement.thighCm != null ? `${latestMeasurement.thighCm} cm` : "Não informada"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nota de rodapé explicativa sobre o IMC e avaliação */}
                <p className="text-[10px] text-[#8E9992] italic leading-tight">
                  * O Índice de Massa Corporal (IMC) é uma referência populacional da OMS e não substitui a avaliação clínica de composição corporal.
                </p>

                {/* Ações da Avaliação */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E5E8E2]">
                  <button
                    type="button"
                    onClick={() => setFocusedView("avaliacao-fisica")}
                    className="text-xs font-bold text-[#176B49] hover:text-[#125438] underline cursor-pointer"
                  >
                    Ver avaliação física completa →
                  </button>

                  <button
                    type="button"
                    onClick={() => setFocusedView("avaliacao-fisica")}
                    className="px-3.5 py-1.5 rounded-xl bg-[#FAF9F6] hover:bg-[#EBEBE5] border border-[#E5E8E2] text-xs font-bold text-[#102E23] transition-colors cursor-pointer"
                  >
                    + Nova avaliação
                  </button>
                </div>
              </section>

              {/* 4. FREQUÊNCIA & ADERÊNCIA (ÚLTIMOS 30 DIAS) */}
              <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-[#176B49]" />
                    <h2 className="font-heading text-base font-bold text-[#102E23]">
                      Frequência & Aderência
                    </h2>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                    {overview.completedLast30DaysCount || 0} treinos nos últimos 30 dias
                  </span>
                </div>

                {/* Mapa visual dos 30 dias (30 slots de consistência) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#5A6660]">
                    <span>Consistência dos últimos 30 dias:</span>
                    <span>
                      Média: {overview.completedLast30DaysCount ? (overview.completedLast30DaysCount / 4.3).toFixed(1) : "0.0"} treinos/sem
                    </span>
                  </div>
                  <div className="grid grid-cols-10 sm:grid-cols-15 gap-1 pt-1">
                    {last30DaysList.map((day, idx) => (
                      <div
                        key={idx}
                        title={`${formatDisplayDate(day.dateStr)}: ${day.trained ? "Treino concluído" : "Sem treino"}`}
                        className={`h-7 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${
                          day.trained
                            ? "bg-[#176B49] text-white shadow-2xs"
                            : "bg-[#F0F2ED] text-[#8E9992] hover:bg-[#E5E8E2]"
                        }`}
                      >
                        {day.dayNumber}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resumo do último treino concluído */}
                {completedSessions.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-1 text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold text-[#102E23]">
                        Último treino: {completedSessions[0].workoutTitle}
                      </p>
                      <span className="text-[11px] text-[#5A6660]">
                        {formatDisplayDate(completedSessions[0].completedAt)}
                      </span>
                    </div>
                    <p className="text-[#5A6660]">
                      {completedSessions[0].completedSetsCount} séries concluídas
                      {completedSessions[0].studentFeedbackNotes ? ` • "${completedSessions[0].studentFeedbackNotes}"` : ""}
                    </p>
                  </div>
                )}
              </section>

              {/* 5. ACESSO A REGISTROS / CUIDADOS (4 Cards Rápidos) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 5.1. Fotos de Evolução */}
                <button
                  type="button"
                  onClick={() => setFocusedView("fotos")}
                  className="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs hover:bg-[#FAF9F6] transition-colors text-left flex flex-col justify-between space-y-3 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
                    <PhotoIcon className="w-5 h-5 text-[#176B49]" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#102E23]">Fotos de Evolução</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 text-[#8E9992] group-hover:text-[#176B49] transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-[11px] text-[#5A6660]">
                      {photos.length > 0 ? `${photos.length} avaliações` : "Nenhuma foto"}
                    </p>
                  </div>
                </button>

                {/* 5.2. Anamnese */}
                <button
                  type="button"
                  onClick={() => setFocusedView("anamnese")}
                  className="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs hover:bg-[#FAF9F6] transition-colors text-left flex flex-col justify-between space-y-3 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
                    <ClipboardCheckIcon className="w-5 h-5 text-[#176B49]" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#102E23]">Anamnese</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 text-[#8E9992] group-hover:text-[#176B49] transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-[11px] text-[#5A6660]">
                      {overview.hasAnamnesis ? "Preenchida" : "Pendente"}
                    </p>
                  </div>
                </button>

                {/* 5.3. Formulários */}
                <button
                  type="button"
                  onClick={() => setFocusedView("formularios")}
                  className="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs hover:bg-[#FAF9F6] transition-colors text-left flex flex-col justify-between space-y-3 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
                    <FileTextIcon className="w-5 h-5 text-[#176B49]" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#102E23]">Formulários</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 text-[#8E9992] group-hover:text-[#176B49] transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-[11px] text-[#5A6660]">
                      {forms.length > 0 ? `${forms.length} total` : "Nenhum formulário"}
                    </p>
                  </div>
                </button>

                {/* 5.4. Trevo Chat / Consultas */}
                <Link
                  href={`/consultoria/${consultancySlug}/consultas?student=${student.membershipPublicId}`}
                  className="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs hover:bg-[#FAF9F6] transition-colors text-left flex flex-col justify-between space-y-3 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#E8F0EA] flex items-center justify-center shrink-0">
                    <ChatBubbleIcon className="w-5 h-5 text-[#176B49]" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[#102E23]">Trevo Chat</span>
                      <ChevronRightIcon className="w-3.5 h-3.5 text-[#8E9992] group-hover:text-[#176B49] transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <p className="text-[11px] text-[#5A6660]">
                      Canal direto do aluno
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* =====================================================================
              ABA 2: GESTÃO DO ALUNO
              ===================================================================== */}
          {activeTab === "gestao" && (
            <div className="space-y-4">
              {/* 1. IDENTIFICAÇÃO DETALHADA DO ALUNO */}
              <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
                  <div className="flex items-center gap-2">
                    <UserBadgeIcon className="w-5 h-5 text-[#176B49]" />
                    <h2 className="font-heading text-base font-bold text-[#102E23]">
                      Identificação Cadastral do Aluno
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditDataModalOpen(true)}
                    className="text-xs font-bold text-[#176B49] hover:text-[#125438] flex items-center gap-1 cursor-pointer"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                    <span>Editar dados</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Nome Completo</span>
                    <span className="font-bold text-[#102E23] text-sm">{student.name}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">E-mail</span>
                    <span className="font-semibold text-[#102E23] truncate block">{student.email || "Não informado"}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Telefone / WhatsApp</span>
                    <span className="font-semibold text-[#102E23]">{student.phone || "Não informado"}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Nascimento & Idade</span>
                    <span className="font-semibold text-[#102E23]">
                      {overview.birthDate ? formatDisplayDate(overview.birthDate) : "Não informada"} {overview.age ? `(${overview.age} anos)` : ""}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Sexo Biológico</span>
                    <span className="font-semibold text-[#102E23]">
                      {overview.sex ? (overview.sex.toUpperCase() === "M" || overview.sex.toUpperCase() === "MASCULINO" ? "Masculino" : "Feminino") : "Não informado"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Matrícula / Início</span>
                    <span className="font-semibold text-[#102E23]">{formatDisplayDate(student.joinedAt)}</span>
                  </div>
                </div>
              </section>

              {/* 2. PERSONAL RESPONSÁVEL & NÍVEL DO ALUNO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Personal Responsável</span>
                  <p className="text-base font-bold text-[#102E23]">
                    {overview.coachName || "Equipe da Consultoria"}
                  </p>
                  <p className="text-xs text-[#5A6660]">Profissional responsável pela prescrição e evolução</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Nível do Aluno</span>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="px-3 py-1 rounded-xl bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5] font-bold text-xs uppercase tracking-wide">
                      {overview.studentLevel || "INICIANTE"}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6660]">Classificação técnica da prescrição</p>
                </div>
              </div>

              {/* 3. CONTRATO & BARRA DE VIGÊNCIA */}
              <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#5A6660] block">Contrato / Plano Ativo</span>
                    <h3 className="font-heading text-base font-bold text-[#102E23]">
                      {overview.contractPlanTitle || "Consultoria Personalizada"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsChargePlanModalOpen(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors shadow-xs cursor-pointer"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Cobrar plano</span>
                    </button>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${contractValidity.badgeColor}`}>
                      {contractValidity.badgeLabel}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#5A6660]">
                    <span>Início: <strong>{contractValidity.startsOnFormatted}</strong></span>
                    <span>Término: <strong>{contractValidity.endsOnFormatted}</strong></span>
                  </div>

                  {/* Barra de progresso da vigência */}
                  <div className="w-full h-3 rounded-full bg-[#FAF9F6] border border-[#E5E8E2] overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-[#176B49] transition-all duration-500"
                      style={{ width: `${contractValidity.percentElapsed}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#5A6660]">
                    <span>Vigência decorrida: {contractValidity.percentElapsed}%</span>
                    {contractValidity.hasEndDate && (
                      <span>{contractValidity.daysRemaining !== null && contractValidity.daysRemaining >= 0 ? `${contractValidity.daysRemaining} dias para renovação` : "Vencido"}</span>
                    )}
                  </div>
                </div>
              </section>

              {/* 3.1. HISTÓRICO FINANCEIRO DE COBRANÇAS */}
              <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#176B49]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                    <div>
                      <h3 className="font-heading text-base font-bold text-[#102E23]">
                        Histórico Financeiro do Aluno
                      </h3>
                      <p className="text-xs text-[#5A6660]">
                        Cobranças emitidas, pagamentos e faturas InfinitePay
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsChargePlanModalOpen(true)}
                    className="text-xs font-bold text-[#176B49] hover:underline cursor-pointer"
                  >
                    + Cobrar plano
                  </button>
                </div>

                {financialCharges.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-center space-y-1">
                    <p className="text-xs font-semibold text-[#102E23]">Nenhuma cobrança registrada</p>
                    <p className="text-[11px] text-[#5A6660]">
                      Emita cobranças de planos com link seguro InfinitePay e ativação automática.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E5E8E2]">
                    {financialCharges.map((ch) => {
                      const brl = (ch.amountCents / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      });
                      const isPaid = ch.derivedStatus === "PAID";
                      const isOverdue = ch.derivedStatus === "OVERDUE";

                      return (
                        <div key={ch.publicId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[#102E23] text-sm">{ch.title}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isPaid
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isOverdue
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                              >
                                {isPaid ? "Pago" : isOverdue ? "Vencido" : "Aguardando Pagamento"}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#5A6660]">
                              Vencimento: {formatDisplayDate(ch.dueOn)}
                              {ch.paymentMethod ? ` • ${ch.paymentMethod === "credit_card" ? "Cartão" : "Pix"}` : ""}
                              {ch.installments && ch.installments > 1 ? ` em ${ch.installments}x` : ""}
                              {ch.paidAt ? ` • Confirmado em ${formatDisplayDate(ch.paidAt)}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <span className="font-black text-sm text-[#102E23] tabular-nums">
                              {brl}
                            </span>
                            {ch.checkoutUrl && !isPaid && (
                              <a
                                href={ch.checkoutUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-[#176B49] text-white hover:bg-[#125438] font-bold text-xs shadow-xs"
                              >
                                Link Checkout →
                              </a>
                            )}
                            {ch.receiptUrl && isPaid && (
                              <a
                                href={ch.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-[#102E23] hover:bg-[#EBEBE5] font-semibold text-xs"
                              >
                                Comprovante
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 4. EVOLUÇÃO DA COMPOSIÇÃO CORPORAL (GRÁFICO SVG NATIVO COM MULTI-MÉTRICA) */}
              <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
                  <div>
                    <h3 className="font-heading text-base font-bold text-[#102E23]">
                      Evolução da Composição Corporal
                    </h3>
                    <p className="text-xs text-[#5A6660]">
                      Histórico e tendência de composição e circunferências
                    </p>
                  </div>

                  {/* Seletor de métrica */}
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { key: "weightKg" as MetricKey, label: "Peso", unit: "kg" },
                      { key: "bodyFatPct" as MetricKey, label: "Gordura", unit: "%" },
                      { key: "muscleMassKg" as MetricKey, label: "Massa Muscular", unit: "kg" },
                      { key: "waistCm" as MetricKey, label: "Cintura", unit: "cm" },
                      { key: "abdomenCm" as MetricKey, label: "Abdômen", unit: "cm" },
                      { key: "hipCm" as MetricKey, label: "Quadril", unit: "cm" },
                      { key: "armCm" as MetricKey, label: "Braço", unit: "cm" },
                      { key: "thighCm" as MetricKey, label: "Coxa", unit: "cm" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setSelectedMetric(item.key)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedMetric === item.key
                            ? "bg-[#176B49] text-white shadow-xs"
                            : "bg-[#FAF9F6] text-[#5A6660] hover:bg-[#EBEBE5] border border-[#E5E8E2]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <NativeBodyCompositionChart
                  measurements={measurements}
                  metricKey={selectedMetric}
                  metricLabel={
                    selectedMetric === "weightKg" ? "Peso"
                    : selectedMetric === "bodyFatPct" ? "Gordura Corporal"
                    : selectedMetric === "muscleMassKg" ? "Massa Muscular"
                    : selectedMetric === "waistCm" ? "Cintura"
                    : selectedMetric === "abdomenCm" ? "Abdômen"
                    : selectedMetric === "hipCm" ? "Quadril"
                    : selectedMetric === "armCm" ? "Braço" : "Coxa"
                  }
                  metricUnit={
                    selectedMetric === "weightKg" || selectedMetric === "muscleMassKg" ? "kg"
                    : selectedMetric === "bodyFatPct" ? "%" : "cm"
                  }
                />
              </section>

              {/* 5. PROGRAMA DE TREINO ATUAL */}
              <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
                  <div className="flex items-center gap-2">
                    <DuotoneTrainingIcon className="w-5 h-5 text-[#176B49]" />
                    <h3 className="font-heading text-base font-bold text-[#102E23]">
                      Programa de Treino Atual
                    </h3>
                  </div>
                  {activeWorkout && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E8F0EA] text-[#176B49] border border-[#CDEED5]">
                      Ativo
                    </span>
                  )}
                </div>

                {activeWorkout ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-bold text-base text-[#102E23]">
                          {activeWorkout.title}
                        </p>
                        <span className="text-xs font-semibold text-[#176B49]">
                          v{activeWorkout.versionNumber}
                        </span>
                      </div>
                      {activeWorkout.subtitle && (
                        <p className="text-xs text-[#5A6660]">{activeWorkout.subtitle}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5A6660] pt-1">
                        <span>Início: {formatDisplayDate(activeWorkout.startsOn)}</span>
                        {activeWorkout.endsOn && (
                          <span>• Término: {formatDisplayDate(activeWorkout.endsOn)}</span>
                        )}
                        <span>• Nível: {activeWorkout.difficultyLevel}</span>
                      </div>
                    </div>

                    {/* Ações do Treino */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/consultoria/${consultancySlug}/rotinas/${activeWorkout.workoutPublicId}?version=${activeWorkout.versionPublicId}&student=${student.membershipPublicId}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[38px] shadow-xs"
                        >
                          <span>Abrir no Builder</span>
                          <ChevronRightIcon className="w-3.5 h-3.5" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => setIsNewWorkoutSheetOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-[#FAF9F6] hover:bg-[#EBEBE5] border border-[#E5E8E2] text-xs font-bold text-[#102E23] transition-colors min-h-[38px] cursor-pointer"
                        >
                          Substituir / Novo
                        </button>
                      </div>

                      {endedWorkouts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                          className="text-xs font-semibold text-[#5A6660] hover:text-[#102E23] px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          {isHistoryExpanded ? "Ocultar anteriores" : `Treinos anteriores (${endedWorkouts.length})`}
                        </button>
                      )}
                    </div>

                    {/* Fichas Anteriores */}
                    {isHistoryExpanded && endedWorkouts.length > 0 && (
                      <div className="p-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] space-y-2 mt-2">
                        <p className="text-xs font-bold text-[#5A6660] uppercase tracking-wider">Histórico de Programas</p>
                        <div className="divide-y divide-[#E5E8E2]">
                          {endedWorkouts.map((w) => (
                            <div key={w.assignmentPublicId} className="py-2 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-semibold text-[#102E23]">{w.title} (v{w.versionNumber})</p>
                                <p className="text-[11px] text-[#5A6660]">{formatDisplayDate(w.startsOn)} {w.endsOn ? `– ${formatDisplayDate(w.endsOn)}` : ""}</p>
                              </div>
                              <Link
                                href={`/consultoria/${consultancySlug}/rotinas/${w.workoutPublicId}?version=${w.versionPublicId}&student=${student.membershipPublicId}`}
                                className="text-xs font-bold text-[#176B49] hover:underline"
                              >
                                Abrir no Builder →
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-center space-y-2">
                    <p className="text-xs text-[#5A6660]">Este aluno não possui nenhum programa de treino ativo.</p>
                    <button
                      type="button"
                      onClick={() => setIsNewWorkoutSheetOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors min-h-[38px] shadow-xs cursor-pointer"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>Criar programa de treino</span>
                    </button>
                  </div>
                )}
              </section>

              {/* 6. HISTÓRICO DE EXECUÇÕES & ATIVIDADES */}
              <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
                  <div className="flex items-center gap-2">
                    <ClockHistoryIcon className="w-5 h-5 text-[#176B49]" />
                    <h3 className="font-heading text-base font-bold text-[#102E23]">
                      Histórico de Execuções Recentes
                    </h3>
                  </div>
                  <span className="text-xs font-semibold text-[#5A6660]">
                    {completedSessions.length} sessões registradas
                  </span>
                </div>

                {completedSessions.length === 0 ? (
                  <p className="text-xs text-[#5A6660] py-6 text-center">
                    Nenhuma execução de treino registrada para este aluno ainda.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E5E8E2]">
                    {completedSessions.map((session) => (
                      <div key={session.publicId} className="py-3 space-y-1.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-bold text-[#102E23]">{session.workoutTitle}</p>
                          <span className="text-[10px] text-[#5A6660] shrink-0">{formatDisplayDate(session.completedAt)}</span>
                        </div>
                        <p className="text-xs text-[#5A6660]">
                          {session.completedSetsCount} séries concluídas
                          {session.studentCompletionState ? ` • Status: ${session.studentCompletionState}` : ""}
                        </p>
                        {session.studentFeedbackNotes && (
                          <p className="text-xs italic text-[#102E23] bg-[#FAF9F6] p-2 rounded-lg border border-[#E5E8E2]">
                            &ldquo;{session.studentFeedbackNotes}&rdquo;
                          </p>
                        )}
                        {session.substitutions && session.substitutions.length > 0 && (
                          <div className="text-[11px] text-[#5A6660] space-y-0.5 pt-1">
                            <span className="font-bold text-[#102E23]">Substituições realizadas:</span>
                            {session.substitutions.map((sub, sIdx) => (
                              <p key={sIdx}>
                                • {sub.originalExerciseName} → <strong>{sub.performedExerciseName}</strong> ({sub.reason})
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      )}

      {/* =========================================================================
          SUB-VISÕES FOCADAS (Abertas diretamente, com botão de voltar no topo)
          ========================================================================= */}

      {/* FOTOS */}
      {focusedView === "fotos" && (
        <div className="space-y-4">
          <StudentPhotosMural
            consultancySlug={consultancySlug}
            studentPublicId={student.membershipPublicId}
            studentName={student.name}
            photos={photos}
            onRequestPhotosClick={() => setRequestModal({ isOpen: true, type: "PHOTOS" })}
          />
        </div>
      )}

      {/* AVALIAÇÃO FÍSICA */}
      {focusedView === "avaliacao-fisica" && (
        <div className="space-y-4">
          <StudentPhysicalAssessmentHub
            consultancySlug={consultancySlug}
            studentPublicId={student.membershipPublicId}
            studentName={student.name}
            measurements={measurements}
          />
        </div>
      )}

      {/* ANAMNESE */}
      {focusedView === "anamnese" && (
        <div className="space-y-4">
          <StudentAnamnesisHub
            consultancySlug={consultancySlug}
            studentPublicId={student.membershipPublicId}
            studentName={student.name}
            anamnesisHistory={
              detail.anamnesisList ||
              forms.filter(
                (f) =>
                  f.title.toLowerCase().includes("anamnes") ||
                  f.title.toLowerCase().includes("saúde") ||
                  f.title.toLowerCase().includes("saude") ||
                  f.title.toLowerCase().includes("histórico") ||
                  f.title.toLowerCase().includes("historico")
              )
            }
            structuredAnamnesis={anamnesis}
            availableTemplates={detail.availableTemplates || []}
            onRequestAnamnesisClick={() => setRequestModal({ isOpen: true, type: "ANAMNESIS" })}
          />
        </div>
      )}

      {/* FORMULÁRIOS */}
      {focusedView === "formularios" && (
        <div className="space-y-4">
          <StudentFormsHub
            consultancySlug={consultancySlug}
            studentPublicId={student.membershipPublicId}
            studentName={student.name}
            studentEmail={student.email}
            forms={
              (detail.formsList && detail.formsList.length > 0)
                ? detail.formsList
                : (forms && forms.length > 0)
                ? forms.filter(
                    (f) =>
                      !f.title.toLowerCase().includes("anamnes") &&
                      !f.title.toLowerCase().includes("saúde") &&
                      !f.title.toLowerCase().includes("saude") &&
                      !f.title.toLowerCase().includes("histórico") &&
                      !f.title.toLowerCase().includes("historico")
                  )
                : (detail.formsList || [])
            }
            availableTemplates={detail.availableTemplates || []}
            publishedForms={detail.publishedForms || []}
            onRequestFormClick={() => setRequestModal({ isOpen: true, type: "FORM" })}
          />
        </div>
      )}

      {/* HISTÓRICO COMPLETO */}
      {focusedView === "historico" && (
        <div className="p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-[#E5E8E2] pb-3">
            <div>
              <h2 className="font-heading text-base font-bold text-[#102E23]">
                Linha do Tempo Completa do Aluno
              </h2>
              <p className="text-xs text-[#5A6660]">
                Eventos cronológicos de treinos, fotos, formulários e avaliações
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8F0EA] text-[#176B49]">
              {timelineEvents.length} eventos
            </span>
          </div>

          {timelineEvents.length === 0 ? (
            <p className="text-xs text-[#5A6660] py-6 text-center">
              Nenhum evento registrado ainda para este aluno.
            </p>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E8E2]">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="relative text-xs space-y-0.5">
                  <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#176B49] border-2 border-white" />
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-bold text-[#102E23]">{evt.title}</p>
                    <span className="text-[10px] text-[#5A6660] shrink-0">{formatDisplayDate(evt.date)}</span>
                  </div>
                  <p className="text-[#5A6660]">{evt.subtitle}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAIS E SHEETS (Preservados com integridade total)
          ========================================================================= */}

      {/* Modal de Edição de Dados do Aluno */}
      {isEditDataModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md p-5 rounded-2xl bg-white border border-[#E5E8E2] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E8E2] pb-2.5">
              <h3 className="font-heading text-base font-bold text-[#102E23]">
                Editar Dados do Aluno
              </h3>
              <button
                type="button"
                onClick={() => setIsEditDataModalOpen(false)}
                className="text-[#5A6660] hover:text-[#102E23] p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <p className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs">{editError}</p>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-[#102E23] block mb-1">Peso (kg)</label>
                  <input
                    type="text"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    placeholder="Ex: 75.5"
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-sm text-[#102E23] focus:outline-none focus:border-[#176B49]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#102E23] block mb-1">Altura (cm)</label>
                  <input
                    type="text"
                    value={editHeight}
                    onChange={(e) => setEditHeight(e.target.value)}
                    placeholder="Ex: 178"
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-sm text-[#102E23] focus:outline-none focus:border-[#176B49]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#102E23] block mb-1">Objetivo Principal</label>
                <input
                  type="text"
                  value={editObjective}
                  onChange={(e) => setEditObjective(e.target.value)}
                  placeholder="Ex: Hipertrofia e definição muscular"
                  className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-sm text-[#102E23] focus:outline-none focus:border-[#176B49]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#102E23] block mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-sm text-[#102E23] focus:outline-none focus:border-[#176B49]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-[#102E23] block mb-1">Perfil DISC</label>
                  <select
                    value={editDisc}
                    onChange={(e) => setEditDisc(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-xs text-[#102E23] focus:outline-none focus:border-[#176B49]"
                  >
                    <option value="">Não avaliado</option>
                    <option value="Dominância (D)">Dominância (D)</option>
                    <option value="Influência (I)">Influência (I)</option>
                    <option value="Estabilidade (S)">Estabilidade (S)</option>
                    <option value="Conformidade (C)">Conformidade (C)</option>
                    <option value="D/I">D/I</option>
                    <option value="I/S">I/S</option>
                    <option value="S/C">S/C</option>
                    <option value="D/C">D/C</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#102E23] block mb-1">Nível do Aluno</label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(e.target.value as "INICIANTE" | "INTERMEDIARIO" | "AVANCADO")}
                    className="w-full h-10 px-3 rounded-xl bg-[#FAF9F6] border border-[#E5E8E2] text-xs text-[#102E23] focus:outline-none focus:border-[#176B49]"
                  >
                    <option value="INICIANTE">Iniciante</option>
                    <option value="INTERMEDIARIO">Intermediário</option>
                    <option value="AVANCADO">Avançado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E8E2]">
              <button
                type="button"
                onClick={() => setIsEditDataModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#5A6660] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSavePersonalData}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#176B49] hover:bg-[#125438] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Solicitar Fotos, Anamnese ou Formulário */}
      <PersonalRequestModal
        isOpen={requestModal.isOpen}
        onClose={() => setRequestModal((prev) => ({ ...prev, isOpen: false }))}
        type={requestModal.type}
        consultancySlug={consultancySlug}
        studentMembershipPublicId={student.membershipPublicId}
        studentName={student.name}
      />

      {/* Sheet para Criar Treino */}
      <StudentNewWorkoutSheet
        isOpen={isNewWorkoutSheetOpen}
        onClose={() => setIsNewWorkoutSheetOpen(false)}
        consultancySlug={consultancySlug}
        studentMembershipPublicId={student.membershipPublicId}
        studentName={student.name}
      />

      {/* Modais de Criação de Plano Nutricional */}
      <NutritionPlanChoiceModal
        isOpen={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        onSelectOption={handleSelectPlanChoice}
      />

      <NutritionAiGenerateModal
        isOpen={isGenerateAiOpen}
        onClose={() => setIsGenerateAiOpen(false)}
        consultancySlug={consultancySlug}
      />

      <NutritionAiImportModal
        isOpenControlled={isImportAiOpen}
        onCloseControlled={() => setIsImportAiOpen(false)}
        consultancySlug={consultancySlug}
        hideTrigger={true}
      />

      <NutritionTemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        consultancySlug={consultancySlug}
      />

      {/* Modal para Cobrança de Plano com InfinitePay */}
      <StudentChargePlanModal
        isOpen={isChargePlanModalOpen}
        onClose={() => setIsChargePlanModalOpen(false)}
        consultancySlug={consultancySlug}
        studentMembershipPublicId={student.membershipPublicId}
        studentName={student.name}
        availablePlans={availablePlans}
        onChargeCreated={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
