"use client";

import React from "react";
import Link from "next/link";
import type { StudentAssignedPlanTreeDto } from "@/lib/nutrition-v2/assignment-repository";

interface Props {
  consultancySlug: string;
  consultancyName: string;
  consultancyLogoUrl?: string | null;
  assignedPlan: StudentAssignedPlanTreeDto;
}

export function StudentNutritionV2({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  assignedPlan,
}: Props) {
  const { version, meals, totals, notesForStudent } = assignedPlan;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Plan Header Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {consultancyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={consultancyLogoUrl}
                  alt={consultancyName}
                  className="h-5 max-w-[120px] object-contain"
                />
              ) : (
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {consultancyName}
                </span>
              )}
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Plano Alimentar Ativo
              </span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                Versão {version.versionNumber}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {version.title}
            </h1>

            {version.subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                {version.subtitle}
              </p>
            )}
          </div>

          {/* Action to Print */}
          <Link
            href={`/consultoria/${consultancySlug}/nutricao/imprimir`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shrink-0 shadow-sm"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir / PDF</span>
          </Link>
        </div>

        {/* Objective */}
        {version.objective && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-950">
            <span className="font-bold text-emerald-900">Objetivo: </span>
            {version.objective}
          </div>
        )}

        {/* Macro Summary Chips (Safe with NULL: omits or explains unknown, no fake 0) */}
        {totals.caloriesKcal != null && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Metas Estimadas do Plano
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Calorias</div>
                <div className="text-base font-bold text-slate-800">{totals.caloriesKcal} kcal</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Proteínas</div>
                <div className="text-base font-bold text-emerald-700">{totals.proteinG ?? "-"} g</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Carboidratos</div>
                <div className="text-base font-bold text-amber-700">{totals.carbohydrateG ?? "-"} g</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gorduras</div>
                <div className="text-base font-bold text-red-700">{totals.fatG ?? "-"} g</div>
              </div>
            </div>
          </div>
        )}

        {/* General Guidance */}
        {version.generalGuidance && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-700">
            <div className="font-bold text-slate-900">Orientações do Nutricionista</div>
            <p className="whitespace-pre-line leading-relaxed">{version.generalGuidance}</p>
          </div>
        )}

        {/* Notes for Student from Prescriber */}
        {notesForStudent && (
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1 text-xs text-amber-950">
            <div className="font-bold text-amber-900">Recado da sua Prescrição</div>
            <p className="whitespace-pre-line leading-relaxed">{notesForStudent}</p>
          </div>
        )}
      </div>

      {/* Meals List - strictly ordered by sort_order */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 px-1">
          Refeições Prescritas
        </h2>

        {meals.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-xs text-slate-500">
            Nenhuma refeição cadastrada para este plano.
          </div>
        ) : (
          meals.map((meal) => (
            <div
              key={meal.publicId}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4"
            >
              {/* Meal Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    {meal.title}
                  </h3>
                  {meal.notes && (
                    <p className="text-xs text-slate-500 italic">{meal.notes}</p>
                  )}
                </div>

                {meal.scheduledTime && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 shrink-0">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{meal.scheduledTime}</span>
                  </span>
                )}
              </div>

              {/* Items List - strictly ordered by sort_order */}
              <div className="space-y-3">
                {meal.items.map((item) => (
                  <div
                    key={item.publicId}
                    className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2.5"
                  >
                    {/* Main Item */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-slate-900">
                          {item.foodNameSnapshot}
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-500 italic">{item.notes}</div>
                        )}
                      </div>

                      {item.prescribedQuantity != null && (
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-900">
                            {item.prescribedQuantity} {item.prescribedUnitLabel || item.prescribedUnitCode || ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Substitutions with explicit 'OU' semantics (mutual exclusivity) */}
                    {item.substitutions.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Opções de Substituição
                        </div>
                        <div className="space-y-1.5 pl-1">
                          {item.substitutions.map((sub) => (
                            <div
                              key={sub.publicId}
                              className="flex items-start justify-between gap-2 text-xs text-slate-700 bg-white p-2 rounded-lg border border-slate-200/60"
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">
                                  OU
                                </span>
                                <span className="truncate">{sub.foodNameSnapshot}</span>
                                {sub.notes && (
                                  <span className="text-[10px] text-slate-400 italic">({sub.notes})</span>
                                )}
                              </div>

                              {sub.prescribedQuantity != null && (
                                <span className="font-semibold text-slate-800 shrink-0">
                                  {sub.prescribedQuantity} {sub.prescribedUnitLabel || sub.prescribedUnitCode || ""}
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
