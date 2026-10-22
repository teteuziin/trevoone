"use client";

import React from "react";

interface Props {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
}

function formatDatePtBr(ymd: string): string {
  try {
    const [year, month, day] = ymd.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(date);
    const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(date);
    const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return `${capWeekday}, ${dayMonth}`;
  } catch {
    return ymd;
  }
}

function getYmdOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function StudentMealDateNavigator({ selectedDate, onDateChange }: Props) {
  const todayYmd = React.useMemo(() => getYmdOffset(0), []);
  const yesterdayYmd = React.useMemo(() => getYmdOffset(-1), []);
  const tomorrowYmd = React.useMemo(() => getYmdOffset(1), []);

  const isToday = selectedDate === todayYmd;
  const isYesterday = selectedDate === yesterdayYmd;
  const isTomorrow = selectedDate === tomorrowYmd;
  const isPast = selectedDate < todayYmd;
  const isFuture = selectedDate > todayYmd;

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    onDateChange(`${year}-${month}-${day}`);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 1);
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    onDateChange(`${year}-${month}-${day}`);
  };

  return (
    <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
      {/* Date Header + Navigation Arrows */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePrevDay}
          title="Dia anterior"
          className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="text-center min-w-0">
          <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
            {formatDatePtBr(selectedDate)}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            {isToday && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                Hoje
              </span>
            )}
            {isYesterday && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                Ontem (Retroativo)
              </span>
            )}
            {isPast && !isYesterday && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/15 text-[var(--text-secondary)]">
                Registro retroativo
              </span>
            )}
            {isFuture && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                Dia futuro
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleNextDay}
          title="Próximo dia"
          className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Quick Jump Buttons + Date Input */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => onDateChange(yesterdayYmd)}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isYesterday
              ? "bg-amber-600 text-white shadow-2xs font-bold"
              : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Ontem
        </button>

        <button
          type="button"
          onClick={() => onDateChange(todayYmd)}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isToday
              ? "bg-emerald-600 text-white shadow-2xs font-bold"
              : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Hoje
        </button>

        <button
          type="button"
          onClick={() => onDateChange(tomorrowYmd)}
          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isTomorrow
              ? "bg-blue-600 text-white shadow-2xs font-bold"
              : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Amanhã
        </button>

        <div className="relative inline-flex items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                onDateChange(e.target.value);
              }
            }}
            className="px-2.5 py-1 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] font-medium cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
