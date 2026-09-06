"use client";

import React from "react";
import Link from "next/link";
import type { StudentAssignedPlanTreeDto } from "@/lib/nutrition-v2/assignment-repository";

interface Props {
  consultancySlug: string;
  consultancyName: string;
  consultancyLogoUrl?: string | null;
  studentName: string;
  assignedPlan: StudentAssignedPlanTreeDto;
  backHref: string;
}

export function StudentNutritionV2Print({
  consultancyName,
  consultancyLogoUrl,
  studentName,
  assignedPlan,
  backHref,
}: Props) {
  const { version, meals, totals, notesForStudent } = assignedPlan;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 antialiased">
      {/* Top Action Bar (Screen Only) */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar ao Plano</span>
          </Link>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <main className="max-w-4xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        <div className="bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-slate-200 print:border-none p-6 sm:p-10 print:p-0 space-y-6">
          {/* Document Header */}
          <header className="border-b border-slate-200 pb-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {consultancyLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={consultancyLogoUrl}
                      alt={consultancyName}
                      className="h-7 max-w-[140px] object-contain"
                    />
                  ) : (
                    <span className="text-xs uppercase font-bold tracking-widest text-emerald-700">
                      {consultancyName}
                    </span>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    Plano Alimentar
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 pt-1">
                  {version.title}
                </h1>

                {version.subtitle && (
                  <p className="text-xs text-slate-600">{version.subtitle}</p>
                )}
              </div>

              <div className="text-left sm:text-right space-y-0.5 text-xs text-slate-500">
                <div>Aluno: <strong className="text-slate-900">{studentName}</strong></div>
                <div>Versão: <strong className="text-slate-800">{version.versionNumber}</strong></div>
                <div>Início: <span>{assignedPlan.startsOn}</span></div>
              </div>
            </div>

            {version.objective && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100">
                <strong className="text-slate-900">Objetivo: </strong>
                {version.objective}
              </div>
            )}

            {totals.caloriesKcal != null && (
              <div className="flex flex-wrap gap-4 text-xs pt-1">
                <span>Calorias: <strong>{totals.caloriesKcal} kcal</strong></span>
                {totals.proteinG != null && <span>Proteínas: <strong>{totals.proteinG} g</strong></span>}
                {totals.carbohydrateG != null && <span>Carboidratos: <strong>{totals.carbohydrateG} g</strong></span>}
                {totals.fatG != null && <span>Gorduras: <strong>{totals.fatG} g</strong></span>}
              </div>
            )}

            {version.generalGuidance && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-700">
                <div className="font-bold text-slate-900">Orientações do Nutricionista</div>
                <p className="whitespace-pre-line leading-relaxed">{version.generalGuidance}</p>
              </div>
            )}

            {notesForStudent && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950">
                <strong className="text-amber-900">Observações: </strong>
                {notesForStudent}
              </div>
            )}
          </header>

          {/* Meals - strictly ordered by sort_order */}
          <div className="space-y-6">
            {meals.map((meal) => (
              <section key={meal.publicId} className="border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3 break-inside-avoid">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <h2 className="font-bold text-sm sm:text-base text-slate-900">{meal.title}</h2>
                    {meal.notes && <p className="text-xs text-slate-500 italic">{meal.notes}</p>}
                  </div>
                  {meal.scheduledTime && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {meal.scheduledTime}
                    </span>
                  )}
                </div>

                {/* Items - strictly ordered by sort_order */}
                <div className="space-y-2.5">
                  {meal.items.map((item) => (
                    <div key={item.publicId} className="text-xs space-y-1.5 bg-slate-50/60 p-2.5 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-slate-900">{item.foodNameSnapshot}</span>
                          {item.notes && <span className="text-[11px] text-slate-500 italic ml-1.5">({item.notes})</span>}
                        </div>
                        {item.prescribedQuantity != null && (
                          <span className="font-bold text-slate-800 shrink-0">
                            {item.prescribedQuantity} {item.prescribedUnitLabel || item.prescribedUnitCode || ""}
                          </span>
                        )}
                      </div>

                      {/* Substitutions with explicit 'OU' semantics */}
                      {item.substitutions.length > 0 && (
                        <div className="pl-3 border-l-2 border-slate-200 space-y-1 pt-1">
                          {item.substitutions.map((sub) => (
                            <div key={sub.publicId} className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-amber-800 text-[10px] uppercase">OU</span>
                                <span>{sub.foodNameSnapshot}</span>
                                {sub.notes && <span className="text-slate-400 italic">({sub.notes})</span>}
                              </div>
                              {sub.prescribedQuantity != null && (
                                <span className="font-medium text-slate-700">
                                  {sub.prescribedQuantity} {sub.prescribedUnitLabel || sub.prescribedUnitCode || ""}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
