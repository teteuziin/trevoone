"use client";

import React from "react";
import Link from "next/link";
import type { StudentAssignedPlanTreeDto } from "@/lib/nutrition-v2/assignment-repository";
import {
  presentNutritionPlan,
  type PresentedNutritionPlan,
} from "@/lib/nutrition-v2/nutrition-plan-presentation";

interface Props {
  consultancySlug: string;
  consultancyName: string;
  consultancyLogoUrl?: string | null;
  studentName?: string;
  assignedPlan: StudentAssignedPlanTreeDto;
}

export function StudentNutritionV2({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  studentName = "Aluno",
  assignedPlan,
}: Props) {
  // Pure presentation transformation (zero macro recalculation, zero logic tampering)
  const plan: PresentedNutritionPlan = React.useMemo(() => {
    return presentNutritionPlan(assignedPlan, {
      studentName,
      consultancyName,
      consultancyLogoUrl,
    });
  }, [assignedPlan, studentName, consultancyName, consultancyLogoUrl]);

  // Offline synchronization to existing IndexedDB store (trevo_offline_v3)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    import("@/lib/offline/offline-nutrition")
      .then(({ saveNutritionSnapshot }) => {
        saveNutritionSnapshot({
          userPublicId: "student",
          consultancyPublicId: consultancySlug,
          planPublicId: assignedPlan.version.publicId || "active_plan",
          planTitle: assignedPlan.version.title,
          planSubtitle: assignedPlan.version.subtitle,
          data: assignedPlan,
        });
      })
      .catch(() => {});
  }, [assignedPlan, consultancySlug]);

  const pdfDownloadUrl = `/api/consultancies/${consultancySlug}/nutricao/pdf?download=true`;

  return (
    <div className="max-w-4xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Top Action Bar (Refined, compact buttons) */}
      <div className="flex items-center justify-between gap-3 mb-4 px-1">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Cardápio Oficial
        </div>

        <div className="flex items-center gap-2">
          <a
            href={pdfDownloadUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-xs min-h-[38px] sm:min-h-0"
            title="Baixar arquivo PDF profissional"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Baixar PDF</span>
          </a>

          <Link
            href={`/consultoria/${consultancySlug}/nutricao/imprimir`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all shadow-2xs min-h-[38px] sm:min-h-0"
            title="Visualizar e imprimir plano"
          >
            <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir</span>
          </Link>
        </div>
      </div>

      {/* Main Continuous Cardápio Sheet (Editorial Design) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-sm p-5 sm:p-9 space-y-6 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Document Header */}
        <header className="border-b border-slate-200 dark:border-slate-800 pb-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {plan.consultancyLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={plan.consultancyLogoUrl}
                    alt={plan.consultancyName}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                    className="h-6 max-w-[130px] object-contain"
                  />
                ) : (
                  <span className="text-xs uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
                    {plan.consultancyName}
                  </span>
                )}
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                  Plano Alimentar
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white pt-1">
                {plan.title}
              </h1>

              {plan.subtitle && (
                <p className="text-xs text-slate-600 dark:text-slate-400">{plan.subtitle}</p>
              )}
            </div>

            <div className="text-left sm:text-right space-y-0.5 text-xs text-slate-500 dark:text-slate-400 shrink-0">
              <div>Aluno: <strong className="text-slate-900 dark:text-slate-100">{plan.studentName}</strong></div>
              {plan.prescriberName && (
                <div>Nutricionista: <strong className="text-slate-800 dark:text-slate-200">{plan.prescriberName}</strong></div>
              )}
              {plan.periodFormatted && (
                <div>Período: <span className="text-slate-700 dark:text-slate-300 font-medium">{plan.periodFormatted}</span></div>
              )}
              <div>Emissão: <span>{plan.generationDateFormatted}</span></div>
            </div>
          </div>

          {/* Objetivo do Plano (Horizontal, if present) */}
          {plan.objective && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
              <strong className="text-slate-900 dark:text-slate-100">Objetivo: </strong>
              {plan.objective}
            </div>
          )}

          {/* Nutrition Totals / Macros (4 horizontal boxes) */}
          {plan.totals.hasAnyMacro && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-2.5 text-center">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Calorias</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">{plan.totals.caloriesFormatted}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-2.5 text-center">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Proteínas</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">{plan.totals.proteinFormatted}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-2.5 text-center">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Carboidratos</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">{plan.totals.carbohydrateFormatted}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-2.5 text-center">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Gorduras</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 tabular-nums">{plan.totals.fatFormatted}</div>
              </div>
            </div>
          )}

          {/* Orientações do Nutricionista (if present) */}
          {plan.generalGuidance && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1 text-xs text-slate-700 dark:text-slate-300">
              <div className="font-bold text-slate-900 dark:text-slate-100">Orientações do Nutricionista</div>
              <p className="whitespace-pre-line leading-relaxed">{plan.generalGuidance}</p>
            </div>
          )}

          {/* Observações da Prescrição (if present) */}
          {plan.notesForStudent && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/30 rounded-xl text-xs text-amber-950 dark:text-amber-200">
              <strong className="text-amber-900 dark:text-amber-300">Observações: </strong>
              {plan.notesForStudent}
            </div>
          )}
        </header>

        {/* Meals Section - strictly ordered by sort_order */}
        <div className="space-y-6">
          {plan.meals.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              Nenhuma refeição cadastrada para este plano alimentar.
            </div>
          ) : (
            plan.meals.map((meal) => (
              <section key={meal.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-3 bg-white dark:bg-slate-900/60">
                {/* Meal Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <div>
                    <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">{meal.title}</h2>
                    {meal.notes && <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">{meal.notes}</p>}
                  </div>
                  {meal.timeFormatted && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shrink-0 tabular-nums">
                      {meal.timeFormatted}
                    </span>
                  )}
                </div>

                {/* Items */}
                <div className="space-y-2.5">
                  {meal.items.map((item) => (
                    <div
                      key={item.id}
                      className="text-xs space-y-2 bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 p-3 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{item.foodName}</span>
                          {item.notes && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 italic ml-1.5 block sm:inline">
                              ({item.notes})
                            </span>
                          )}
                        </div>
                        {item.quantityFormatted && (
                          <span className="font-bold text-slate-800 dark:text-slate-200 shrink-0 text-right tabular-nums">
                            {item.quantityFormatted}
                          </span>
                        )}
                      </div>

                      {/* Substitutions with clean 'Pode ser substituído por:' block */}
                      {item.substitutions.length > 0 && (
                        <div className="pt-2 mt-1 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                          <div className="text-[10px] font-semibold text-amber-900/80 dark:text-amber-400/90 uppercase tracking-wider">
                            Pode ser substituído por:
                          </div>
                          <div className="space-y-1 pl-2 border-l-2 border-amber-300 dark:border-amber-700">
                            {item.substitutions.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-start justify-between gap-2 text-[11px] text-slate-700 dark:text-slate-300"
                              >
                                <div className="min-w-0">
                                  <span>{sub.foodName}</span>
                                  {sub.notes && (
                                    <span className="text-slate-400 dark:text-slate-500 italic ml-1">({sub.notes})</span>
                                  )}
                                </div>
                                {sub.quantityFormatted && (
                                  <span className="font-medium text-slate-800 dark:text-slate-200 shrink-0 text-right tabular-nums">
                                    {sub.quantityFormatted}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Document Sheet Footer */}
        <footer className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-slate-500">
          <div>
            Trevo One • Plataforma Integrada de Saúde, Nutrição e Treinamento
          </div>
          <div>
            Documento gerado em {plan.generationDateFormatted}
          </div>
        </footer>
      </div>
    </div>
  );
}
