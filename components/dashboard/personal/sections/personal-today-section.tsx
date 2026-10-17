"use client";

import React from "react";
import Link from "next/link";

export interface PersonalTodayConsultation {
  publicId: string;
  studentName: string;
  timeFormatted: string;
  type?: string;
  status: string;
  scheduledStartAt: string; // ISO
  scheduledEndAt: string; // ISO
  href?: string;
}

export interface PersonalTodaySectionProps {
  consultancySlug: string;
  consultations?: PersonalTodayConsultation[] | null;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function canJoinRoom(c: PersonalTodayConsultation): boolean {
  if (c.status !== "SCHEDULED" && c.status !== "IN_PROGRESS") return false;
  try {
    const now = Date.now();
    const start = new Date(c.scheduledStartAt).getTime();
    const end = new Date(c.scheduledEndAt).getTime();
    if (isNaN(start) || isNaN(end)) return false;
    const earliest = start - 10 * 60 * 1000; // 10 min antes
    const latest = end + 30 * 60 * 1000; // 30 min depois
    return now >= earliest && now <= latest;
  } catch {
    return false;
  }
}

export function PersonalTodayBanner({
  consultancySlug,
}: {
  consultancySlug: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] shadow-2xs text-xs sm:text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500/80 shrink-0" />
        <span className="font-semibold text-[#17191D] dark:text-white shrink-0">Hoje:</span>
        <span className="text-[#4B5563] dark:text-[#C2C8CF] truncate">nenhuma consulta agendada</span>
      </div>
      <Link
        href={`/consultoria/${consultancySlug}/consultas`}
        prefetch={false}
        className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-[#10B981] dark:hover:text-emerald-300 transition-colors shrink-0 ml-3"
      >
        Ver agenda →
      </Link>
    </div>
  );
}

export function PersonalTodaySection({
  consultancySlug,
  consultations = [],
  isLoading = false,
  isError = false,
  onRetry,
}: PersonalTodaySectionProps) {
  if (isLoading) {
    return (
      <section aria-label="Compromissos de hoje" className="w-full space-y-2.5">
        <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight">
          Hoje
        </h2>
        <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl p-4 space-y-2 animate-pulse">
          <div className="h-4 bg-[#F3F4F6] dark:bg-[#1B1D21] rounded w-1/4" />
          <div className="h-10 bg-[#F3F4F6] dark:bg-[#1B1D21] rounded w-full" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-label="Compromissos de hoje" className="w-full space-y-2.5">
        <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight">
          Hoje
        </h2>
        <div className="bg-white dark:bg-[#151619] border border-red-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm font-normal text-red-600 dark:text-red-300">
            Não foi possível carregar a agenda de hoje.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#F3F4F6] dark:bg-[#1B1D21] text-[#17191D] dark:text-white border border-[#E5E7EB] dark:border-[#303238] hover:border-red-500/40 cursor-pointer"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </section>
    );
  }

  const items = consultations || [];

  if (items.length === 0) {
    return <PersonalTodayBanner consultancySlug={consultancySlug} />;
  }

  return (
    <section aria-label="Compromissos de hoje" className="w-full space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight">
          Hoje
        </h2>
      </div>

      <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl divide-y divide-[#E5E7EB] dark:divide-[#303238] overflow-hidden shadow-xs">
        {items.map((consultation) => {
          const isJoinable = canJoinRoom(consultation);
          const targetHref = consultation.href || `/consultoria/${consultancySlug}/consultas`;

          return (
            <div
              key={consultation.publicId}
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-10 rounded-xl bg-[#F0F1F3] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] flex items-center justify-center text-xs font-bold font-mono text-emerald-700 dark:text-[#10B981] shrink-0 tabular-nums">
                  {consultation.timeFormatted}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#17191D] dark:text-white break-words">
                    {consultation.studentName}
                  </p>
                  <p className="text-xs text-[#4B5563] dark:text-[#C2C8CF] mt-0.5 truncate">
                    {consultation.type || "Consulta por vídeo"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end sm:shrink-0 pt-1 sm:pt-0">
                {isJoinable ? (
                  <Link
                    href={targetHref}
                    prefetch={false}
                    className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                  >
                    Entrar na sala
                  </Link>
                ) : (
                  <Link
                    href={targetHref}
                    prefetch={false}
                    className="inline-flex items-center justify-center min-h-[44px] px-3.5 py-1.5 text-xs font-semibold text-[#17191D] dark:text-[#C2C8CF] hover:text-[#17191D] dark:hover:text-white bg-[#F3F4F6] hover:bg-[#E5E7EB] dark:bg-[#1B1D21] dark:hover:bg-[#252830] border border-[#E5E7EB] dark:border-[#303238] rounded-lg shadow-xs transition-colors"
                  >
                    Ver detalhes
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
