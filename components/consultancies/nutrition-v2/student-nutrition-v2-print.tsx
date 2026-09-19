"use client";

import React, { useEffect } from "react";
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
  studentName: string;
  assignedPlan: StudentAssignedPlanTreeDto;
  backHref: string;
}

export function StudentNutritionV2Print({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  studentName,
  assignedPlan,
  backHref,
}: Props) {
  // Pure presentation mapper for 100% data parity with Web and PDF
  const plan: PresentedNutritionPlan = React.useMemo(() => {
    return presentNutritionPlan(assignedPlan, {
      studentName,
      consultancyName,
      consultancyLogoUrl,
    });
  }, [assignedPlan, studentName, consultancyName, consultancyLogoUrl]);

  useEffect(() => {
    const cleanStudentName = studentName.trim().replace(/\s+/g, "-");
    const originalTitle = document.title;
    document.title = `Plano-Alimentar-${cleanStudentName}`;
    return () => {
      document.title = originalTitle;
    };
  }, [studentName]);

  const handlePrint = () => {
    window.print();
  };

  const pdfUrl = `/api/consultancies/${consultancySlug}/nutricao/pdf?download=true`;

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 antialiased">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 14mm 12mm 16mm 12mm;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-header-together {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>

      {/* Top Action Bar (Screen Only) */}
      <div className="print:hidden sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors min-h-[44px] px-2 sm:min-h-0 sm:px-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar ao Plano</span>
          </Link>

          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors min-h-[44px] sm:min-h-0 cursor-pointer"
            >
              <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Baixar PDF Oficial</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors min-h-[44px] sm:min-h-0 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Imprimir Agora</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet */}
      <main className="max-w-4xl mx-auto p-4 sm:p-8 print:p-0 print:max-w-none">
        <div className="bg-white rounded-2xl print:rounded-none shadow-sm print:shadow-none border border-slate-200 print:border-none p-6 sm:p-10 print:p-0 space-y-6">
          {/* Document Header */}
          <header className="border-b border-slate-200 pb-5 space-y-4 print-avoid-break">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {plan.consultancyLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={plan.consultancyLogoUrl}
                      alt={plan.consultancyName}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                      className="h-7 max-w-[140px] object-contain"
                    />
                  ) : (
                    <span className="text-xs uppercase font-bold tracking-widest text-emerald-700">
                      {plan.consultancyName}
                    </span>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
                    Plano Alimentar
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 pt-1">
                  {plan.title}
                </h1>

                {plan.subtitle && (
                  <p className="text-xs text-slate-600">{plan.subtitle}</p>
                )}
              </div>

              <div className="text-left sm:text-right space-y-0.5 text-xs text-slate-500 shrink-0">
                <div>Aluno: <strong className="text-slate-900">{plan.studentName}</strong></div>
                {plan.prescriberName && (
                  <div>Nutricionista: <strong className="text-slate-800">{plan.prescriberName}</strong></div>
                )}
                {plan.periodFormatted && (
                  <div>Período: <span className="text-slate-700 font-medium">{plan.periodFormatted}</span></div>
                )}
                <div>Emissão: <span>{plan.generationDateFormatted}</span></div>
              </div>
            </div>

            {plan.objective && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200/80">
                <strong className="text-slate-900">Objetivo: </strong>
                {plan.objective}
              </div>
            )}

            {/* Nutrition Totals / Macros */}
            {plan.totals.hasAnyMacro && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Calorias</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{plan.totals.caloriesFormatted}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Proteínas</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{plan.totals.proteinFormatted}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Carboidratos</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{plan.totals.carbohydrateFormatted}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Gorduras</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{plan.totals.fatFormatted}</div>
                </div>
              </div>
            )}

            {/* General Guidance */}
            {plan.generalGuidance && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs text-slate-700">
                <div className="font-bold text-slate-900">Orientações do Nutricionista</div>
                <p className="whitespace-pre-line leading-relaxed">{plan.generalGuidance}</p>
              </div>
            )}

            {/* Notes for student */}
            {plan.notesForStudent && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-950">
                <strong className="text-amber-900">Observações: </strong>
                {plan.notesForStudent}
              </div>
            )}
          </header>

          {/* Meals - strictly ordered by sort_order */}
          <div className="space-y-6">
            {plan.meals.map((meal) => (
              <section key={meal.id} className="border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3">
                {/* Meal Header (kept together with content) */}
                <div className="print-avoid-break print-header-together flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div>
                    <h2 className="font-bold text-sm sm:text-base text-slate-900">{meal.title}</h2>
                    {meal.notes && <p className="text-xs text-slate-500 italic mt-0.5">{meal.notes}</p>}
                  </div>
                  {meal.timeFormatted && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                      {meal.timeFormatted}
                    </span>
                  )}
                </div>

                {/* Items - individual items avoided from breaking */}
                <div className="space-y-2.5">
                  {meal.items.map((item) => (
                    <div
                      key={item.id}
                      className="print-avoid-break text-xs space-y-2 bg-slate-50/60 border border-slate-100 p-3 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900">{item.foodName}</span>
                          {item.notes && (
                            <span className="text-[11px] text-slate-500 italic ml-1.5 block sm:inline">
                              ({item.notes})
                            </span>
                          )}
                        </div>
                        {item.quantityFormatted && (
                          <span className="font-bold text-slate-800 shrink-0 text-right">
                            {item.quantityFormatted}
                          </span>
                        )}
                      </div>

                      {/* Substitutions with clean 'Pode ser substituído por:' block */}
                      {item.substitutions.length > 0 && (
                        <div className="pt-2 mt-1 border-t border-slate-200/60 space-y-1.5">
                          <div className="text-[10px] font-semibold text-amber-900/80 uppercase tracking-wider">
                            Pode ser substituído por:
                          </div>
                          <div className="space-y-1 pl-2 border-l-2 border-amber-200">
                            {item.substitutions.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-start justify-between gap-2 text-[11px] text-slate-700"
                              >
                                <div className="min-w-0">
                                  <span>{sub.foodName}</span>
                                  {sub.notes && (
                                    <span className="text-slate-400 italic ml-1">({sub.notes})</span>
                                  )}
                                </div>
                                {sub.quantityFormatted && (
                                  <span className="font-medium text-slate-800 shrink-0 text-right">
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
            ))}
          </div>

          {/* Document Print Footer */}
          <footer className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 print:text-slate-500 print-avoid-break">
            <div>
              Trevo One • Plataforma Integrada de Saúde, Nutrição e Treinamento
            </div>
            <div>
              Documento gerado em {plan.generationDateFormatted}
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
