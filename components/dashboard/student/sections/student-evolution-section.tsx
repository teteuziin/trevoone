"use client";

import React from "react";
import Link from "next/link";
import { DuotoneProgressIcon } from "@/components/ui/icons/duotone-icons";

export interface StudentProgressEntry {
  recordedOn: string;
  weightKg: number | null;
  waistCm?: number | null;
  abdomenCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
}

export interface StudentEvolutionSectionProps {
  consultancySlug: string;
  latestProgress: StudentProgressEntry | null;
  previousProgress?: StudentProgressEntry | null;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function StudentEvolutionSection({
  consultancySlug,
  latestProgress,
  previousProgress,
}: StudentEvolutionSectionProps) {
  const hasWeight = latestProgress?.weightKg !== null && latestProgress?.weightKg !== undefined;
  const hasPreviousWeight =
    previousProgress?.weightKg !== null && previousProgress?.weightKg !== undefined;

  const weightDelta =
    hasWeight && hasPreviousWeight
      ? Number((latestProgress!.weightKg! - previousProgress!.weightKg!).toFixed(1))
      : null;

  return (
    <section className="w-full space-y-3">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight">
            Minha evolução
          </h2>
        </div>
        <Link
          href={`/consultoria/${consultancySlug}/progresso`}
          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
        >
          Ver histórico completo →
        </Link>
      </div>

      {/* Conteúdo Sólido */}
      <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm p-5 sm:p-6 transition-colors">
        {hasWeight ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238]">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <DuotoneProgressIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-[#8E95A2] block">
                    Peso mais recente
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-black text-zinc-900 dark:text-white">
                      {latestProgress!.weightKg} kg
                    </span>
                    {latestProgress?.recordedOn && (
                      <span className="text-xs text-zinc-500 dark:text-[#6B7280]">
                        em {formatDate(latestProgress.recordedOn)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Variação Neutra (sem rótulos avaliativos) */}
              {weightDelta !== null && (
                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg vs registro anterior
                  </span>
                </div>
              )}
            </div>

            {/* Medidas de Circunferência quando existentes */}
            {(latestProgress?.waistCm || latestProgress?.abdomenCm || latestProgress?.armCm) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {latestProgress.waistCm && (
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/60 dark:border-[#303238]/60 text-xs">
                    <span className="text-zinc-500 dark:text-[#8E95A2] block">Cintura</span>
                    <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block">
                      {latestProgress.waistCm} cm
                    </span>
                  </div>
                )}
                {latestProgress.abdomenCm && (
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/60 dark:border-[#303238]/60 text-xs">
                    <span className="text-zinc-500 dark:text-[#8E95A2] block">Abdômen</span>
                    <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block">
                      {latestProgress.abdomenCm} cm
                    </span>
                  </div>
                )}
                {latestProgress.armCm && (
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/60 dark:border-[#303238]/60 text-xs">
                    <span className="text-zinc-500 dark:text-[#8E95A2] block">Braço</span>
                    <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block">
                      {latestProgress.armCm} cm
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Botão de Registro */}
            <div className="pt-2 flex justify-end">
              <Link
                href={`/consultoria/${consultancySlug}/progresso`}
                className="w-full sm:w-auto px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-[#303238] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>+ Registrar nova medição</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center space-y-3">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Ainda não há registros de evolução.
              </p>
              <p className="text-xs text-zinc-500 dark:text-[#8E95A2]">
                Registre seu peso e medidas para acompanhar seu progresso com sua equipe.
              </p>
            </div>
            <Link
              href={`/consultoria/${consultancySlug}/progresso`}
              className="inline-flex items-center justify-center px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
            >
              <span>+ Registrar primeira medição</span>
              <span className="ml-1.5">→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
