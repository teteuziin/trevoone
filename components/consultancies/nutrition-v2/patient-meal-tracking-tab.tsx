"use client";

import React, { useState, useEffect } from "react";
import type {
  MealTrackingPeriodSummaryDto,
} from "@/lib/nutrition-v2/meal-tracking-types";
import { getNutritionistMealTrackingSummaryAction } from "@/app/consultoria/[slug]/nutricao/refeicoes/actions";

interface Props {
  consultancySlug: string;
  studentPublicId: string;
  studentName?: string;
}

type PeriodFilterType = "today" | "7d" | "14d" | "30d" | "custom";

function formatDateYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PatientMealTrackingTab({
  consultancySlug,
  studentPublicId,
  studentName = "Paciente",
}: Props) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>("7d");

  const todayStr = React.useMemo(() => formatDateYmd(new Date()), []);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return formatDateYmd(d);
  });
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [filterEpoch, setFilterEpoch] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<MealTrackingPeriodSummaryDto | null>(null);

  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getNutritionistMealTrackingSummaryAction(
      consultancySlug,
      studentPublicId,
      startDate,
      endDate
    )
      .then((res) => {
        if (!cancelled) {
          if (res.success && res.summary) {
            setSummary(res.summary);
          } else {
            setErrorMessage(res.error || "Não foi possível carregar o acompanhamento.");
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : "Erro ao carregar dados.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [consultancySlug, studentPublicId, startDate, endDate, filterEpoch]);

  const applyPeriod = (type: PeriodFilterType) => {
    setPeriodFilter(type);
    const end = todayStr;
    let start = todayStr;

    if (type === "today") {
      start = todayStr;
    } else if (type === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      start = formatDateYmd(d);
    } else if (type === "14d") {
      const d = new Date();
      d.setDate(d.getDate() - 13);
      start = formatDateYmd(d);
    } else if (type === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      start = formatDateYmd(d);
    } else if (type === "custom") {
      return; // Do not auto-fetch until user clicks or changes custom dates
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header & Period Filter Bar */}
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Acompanhamento das Refeições
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] mt-1">
              Diário Alimentar e Adesão de {studentName}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Visualize registros em tempo real, fotos dos pratos, substituições feitas e motivos relatados.
            </p>
          </div>

          {/* Quick Period Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap bg-[var(--surface-subtle)] p-1.5 rounded-2xl border border-[var(--border-subtle)] shrink-0">
            <button
              type="button"
              onClick={() => applyPeriod("today")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                periodFilter === "today"
                  ? "bg-white dark:bg-zinc-800 text-[var(--text-primary)] shadow-2xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => applyPeriod("7d")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                periodFilter === "7d"
                  ? "bg-white dark:bg-zinc-800 text-[var(--text-primary)] shadow-2xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              7 dias
            </button>
            <button
              type="button"
              onClick={() => applyPeriod("14d")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                periodFilter === "14d"
                  ? "bg-white dark:bg-zinc-800 text-[var(--text-primary)] shadow-2xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              14 dias
            </button>
            <button
              type="button"
              onClick={() => applyPeriod("30d")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                periodFilter === "30d"
                  ? "bg-white dark:bg-zinc-800 text-[var(--text-primary)] shadow-2xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              30 dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter("custom")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                periodFilter === "custom"
                  ? "bg-white dark:bg-zinc-800 text-[var(--text-primary)] shadow-2xs font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Personalizado
            </button>
          </div>
        </div>

        {/* Custom date range picker (if custom selected) */}
        {periodFilter === "custom" && (
          <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-subtle)] flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)] font-medium">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)] font-medium">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)]"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setErrorMessage(null);
                setFilterEpoch((prev) => prev + 1);
              }}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-2xs cursor-pointer"
            >
              Filtrar
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs">
          {errorMessage}
        </div>
      )}

      {/* 2. Adherence Dashboard & Metrics */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Adherence Rate Box */}
          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
              Taxa de Adesão
            </span>
            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-800 dark:text-emerald-300 tabular-nums">
                {summary.adherencePercentage}%
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {summary.totalAdheredMeals} de {summary.totalExpectedMeals} refeições
            </span>
          </div>

          {/* Realizadas Conforme o Plano */}
          <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              Conforme o plano
            </span>
            <div className="my-2">
              <span className="text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {summary.totalCompleted}
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)]">Sem alterações</span>
          </div>

          {/* Com Alterações */}
          <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">
              Com alterações
            </span>
            <div className="my-2">
              <span className="text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {summary.totalCompletedWithChanges}
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)]">Substituições ou adaptações</span>
          </div>

          {/* Não Realizadas */}
          <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
              Não realizadas
            </span>
            <div className="my-2">
              <span className="text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {summary.totalNotDone}
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)]">Com motivo relatado</span>
          </div>

          {/* Sem Registro */}
          <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
              Sem registro
            </span>
            <div className="my-2">
              <span className="text-2xl font-extrabold text-[var(--text-primary)] tabular-nums">
                {summary.totalUnregistered}
              </span>
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)]">Aguardando lançamento</span>
          </div>
        </div>
      )}

      {/* Non-punitive callout */}
      <div className="p-3 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-2xl text-[11px] text-[var(--text-secondary)] flex items-center justify-between gap-3">
        <span>
          💡 <strong>Critério ético de cálculo:</strong> Dias sem plano ativo e refeições futuras não são contabilizados como falha de adesão.
        </span>
        {isLoading && (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
            Atualizando...
          </span>
        )}
      </div>

      {/* 3. Day-by-Day Timeline / Logs List */}
      {summary && (
        <div className="space-y-4">
          {summary.days.length === 0 ? (
            <div className="p-8 text-center bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl text-xs text-[var(--text-tertiary)]">
              Nenhum dado encontrado para o período selecionado.
            </div>
          ) : (
            summary.days.map((dayGroup) => (
              <div
                key={dayGroup.date}
                className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-3xl p-5 shadow-2xs space-y-4"
              >
                {/* Day Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">
                      {dayGroup.dateFormatted}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5">
                      {dayGroup.hasActivePlan ? (
                        <span>
                          Plano: <strong>{dayGroup.planTitle}</strong> (v{dayGroup.planVersionNumber})
                        </span>
                      ) : (
                        <span className="text-[var(--text-tertiary)] italic">
                          Sem prescrição alimentar ativa nesta data
                        </span>
                      )}
                    </div>
                  </div>

                  {dayGroup.hasActivePlan && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-[var(--text-secondary)]">Adesão do dia:</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-extrabold tabular-nums ${
                          dayGroup.adherenceRate >= 80
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : dayGroup.adherenceRate >= 50
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                            : "bg-zinc-500/20 text-[var(--text-secondary)]"
                        }`}
                      >
                        {dayGroup.adherenceRate}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Meals in this day */}
                {!dayGroup.hasActivePlan ? (
                  <div className="py-4 text-center text-xs text-[var(--text-tertiary)]">
                    Nenhuma refeição prescrita para este dia.
                  </div>
                ) : dayGroup.meals.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[var(--text-tertiary)]">
                    Nenhuma refeição cadastrada no plano desta data.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {dayGroup.meals.map((item) => {
                      const log = item.tracking;
                      const isCompleted = log?.status === "COMPLETED";
                      const isChanged = log?.status === "COMPLETED_WITH_CHANGES";
                      const isNotDone = log?.status === "NOT_DONE";

                      return (
                        <div
                          key={item.mealPublicId}
                          className="py-3.5 first:pt-1 last:pb-1 space-y-2"
                        >
                          {/* Meal row header */}
                          <div className="flex items-baseline justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                {item.mealTitle}
                              </h4>
                              {item.mealScheduledTime && (
                                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] bg-[var(--surface-subtle)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] tabular-nums">
                                  Previsto: {item.mealScheduledTime}
                                </span>
                              )}
                            </div>

                            {/* Status Pill */}
                            <div>
                              {isCompleted && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                  <span>✓</span>
                                  <span>Fez conforme o plano</span>
                                </span>
                              )}
                              {isChanged && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  <span>⇄</span>
                                  <span>Fez com alterações</span>
                                </span>
                              )}
                              {isNotDone && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-500/15 text-[var(--text-secondary)] border border-zinc-500/30">
                                  <span>✕</span>
                                  <span>Não fez</span>
                                </span>
                              )}
                              {!log && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
                                  Sem registro
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Prescribed food items summary */}
                          {item.itemsDescription && item.itemsDescription.length > 0 && (
                            <div className="text-xs text-[var(--text-secondary)]">
                              <span className="font-semibold text-[var(--text-tertiary)] text-[10px] uppercase tracking-wider block">
                                Prescrito:
                              </span>
                              <span>{item.itemsDescription.join(" • ")}</span>
                            </div>
                          )}

                          {/* Tracking Log Details (if logged) */}
                          {log && (
                            <div className="mt-2 p-3 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-2xl space-y-2 text-xs">
                              <div className="flex items-center gap-3 text-[11px] text-[var(--text-tertiary)] flex-wrap">
                                {log.consumedAtTime && (
                                  <span>
                                    Horário registrado: <strong className="text-[var(--text-primary)]">{log.consumedAtTime}</strong>
                                  </span>
                                )}
                                <span>
                                  Lançado em: {new Date(log.createdAt).toLocaleDateString("pt-BR")} às {new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>

                              {isNotDone && log.notDoneReasonLabel && (
                                <div className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                                  Motivo informado: <span className="underline">{log.notDoneReasonLabel}</span>
                                </div>
                              )}

                              {log.notes && (
                                <div className="text-[11px] text-[var(--text-secondary)] italic">
                                  Observação do paciente: &ldquo;{log.notes}&rdquo;
                                </div>
                              )}

                              {log.substitutions.length > 0 && (
                                <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 space-y-0.5">
                                  <strong className="block">Substituições selecionadas pelo paciente:</strong>
                                  {log.substitutions.map((sub, sIdx) => (
                                    <div key={sIdx}>
                                      • <strong>{sub.originalFoodName}</strong> ➔ <strong>{sub.substitutedWith}</strong>
                                      {sub.quantityFormatted && ` (${sub.quantityFormatted})`}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Photo thumbnail */}
                              {log.hasPhoto && log.photoUrl && (
                                <div className="pt-1 flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setLightboxImageUrl(log.photoUrl || null)}
                                    className="group relative rounded-xl overflow-hidden border border-[var(--border-default)] hover:border-emerald-500 transition-all cursor-pointer"
                                    title="Clique para ver foto ampliada"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={log.photoUrl}
                                      alt="Foto enviada pelo paciente"
                                      loading="lazy"
                                      className="w-16 h-16 object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                      🔍
                                    </div>
                                  </button>
                                  <div className="text-[11px] text-[var(--text-tertiary)]">
                                    <span className="font-semibold text-[var(--text-primary)] block">Foto do prato anexada</span>
                                    <span>Clique na miniatura para ampliar com alta resolução</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl bg-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImageUrl}
              alt="Visualização ampliada do prato"
              className="max-w-full max-h-[85vh] object-contain"
            />
            <button
              type="button"
              onClick={() => setLightboxImageUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-white text-sm font-bold flex items-center justify-center cursor-pointer shadow-md"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
