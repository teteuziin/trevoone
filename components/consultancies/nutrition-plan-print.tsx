import { formatMacroRange } from "@/lib/consultancies/nutrition-totals";
import { NutritionPrintButton } from "./nutrition-print-button";
import type {
  NutritionPlanDto,
  NutritionMealDto,
  NutritionMealOptionDto,
  NutritionMealSectionDto,
  NutritionMealChoiceGroupDto,
  NutritionMealItemDto,
  NutritionistPlanEditorDto,
} from "@/lib/consultancies/nutrition";

type Props = {
  consultancyName: string;
  consultancyLogoUrl?: string | null;
  studentName: string;
  plan: NutritionPlanDto | NutritionistPlanEditorDto;
  backHref: string;
};

export function NutritionPlanPrint({
  consultancyName,
  consultancyLogoUrl,
  studentName,
  plan,
  backHref,
}: Props) {
  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 antialiased">
      {/* Top Action Bar (Screen only) */}
      <NutritionPrintButton backHref={backHref} />

      {/* Screen Preview Container / A4 Page */}
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
                  {plan.title}
                </h1>
                {plan.subtitle && (
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">
                    {plan.subtitle}
                  </p>
                )}
              </div>

              <div className="text-left sm:text-right text-xs text-slate-600 space-y-1 shrink-0 bg-slate-50 print:bg-transparent p-3 sm:p-0 rounded-xl print:rounded-none border border-slate-100 print:border-none">
                <p>
                  <strong className="text-slate-900">Aluno:</strong> {studentName}
                </p>
                {(plan.startsOn || plan.endsOn) && (
                  <p>
                    <strong className="text-slate-900">Vigência:</strong>{" "}
                    {plan.startsOn ? new Date(plan.startsOn + "T00:00:00").toLocaleDateString("pt-BR") : "Início"}{" "}
                    até{" "}
                    {plan.endsOn ? new Date(plan.endsOn + "T00:00:00").toLocaleDateString("pt-BR") : "Indeterminado"}
                  </p>
                )}
                {plan.activatedAt && (
                  <p>
                    <strong className="text-slate-900">Data de liberação:</strong>{" "}
                    {new Date(plan.activatedAt).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </div>

            {/* General Guidance */}
            {plan.generalGuidance && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1 break-inside-avoid">
                <span className="font-semibold text-slate-900 block">Orientações Gerais:</span>
                <p className="whitespace-pre-line text-slate-700 leading-relaxed">
                  {plan.generalGuidance}
                </p>
              </div>
            )}
          </header>

          {/* Daily Nutritional Summary */}
          {plan.totals && (
            <section className="bg-slate-50/80 rounded-xl border border-slate-200 p-4 space-y-2.5 break-inside-avoid">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {plan.totals.isExact.all ? "Total Diário Estimado" : "Faixa Nutricional Diária"}
                </span>
                {!plan.totals.isExact.all && (
                  <span className="text-[11px] text-slate-500">
                    Os limites consideram as alternativas do plano e são calculados separadamente por nutriente.
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase">Calorias</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {formatMacroRange(plan.totals.min.calories, plan.totals.max.calories, "kcal")}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase">Proteínas</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {formatMacroRange(plan.totals.min.protein, plan.totals.max.protein, "g")}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase">Carboidratos</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {formatMacroRange(plan.totals.min.carbohydrate, plan.totals.max.carbohydrate, "g")}
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase">Gorduras</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900">
                    {formatMacroRange(plan.totals.min.fat, plan.totals.max.fat, "g")}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Meals List */}
          <div className="space-y-6 pt-2">
            {plan.meals.map((meal: NutritionMealDto, mealIdx: number) => (
              <section
                key={meal.publicId || `meal-${mealIdx}`}
                className="rounded-xl border border-slate-200 overflow-hidden"
              >
                {/* Meal Header */}
                <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 break-inside-avoid">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {meal.scheduledTime && (
                      <span className="px-2 py-0.5 text-xs font-bold font-mono text-emerald-900 bg-emerald-100 rounded border border-emerald-200 shrink-0">
                        {meal.scheduledTime.slice(0, 5)}
                      </span>
                    )}
                    <h2 className="text-sm font-bold text-slate-900 truncate">
                      {meal.title}
                    </h2>
                  </div>

                  {meal.totals && (
                    <div className="text-[11px] font-medium text-slate-600 shrink-0">
                      <span>{formatMacroRange(meal.totals.min.calories, meal.totals.max.calories, "kcal")}</span>
                      <span className="text-slate-300 mx-1.5">•</span>
                      <span>P: {formatMacroRange(meal.totals.min.protein, meal.totals.max.protein, "g")}</span>
                      <span className="text-slate-300 mx-1.5">•</span>
                      <span>C: {formatMacroRange(meal.totals.min.carbohydrate, meal.totals.max.carbohydrate, "g")}</span>
                      <span className="text-slate-300 mx-1.5">•</span>
                      <span>G: {formatMacroRange(meal.totals.min.fat, meal.totals.max.fat, "g")}</span>
                    </div>
                  )}
                </div>

                {meal.notes && (
                  <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 italic">
                    {meal.notes}
                  </div>
                )}

                {/* Options List */}
                <div className="p-4 space-y-4">
                  {meal.options.map((option: NutritionMealOptionDto, optIdx: number) => {
                    const hasMultipleOptions = meal.options.length > 1;
                    const optionLabel = option.title || `OPÇÃO ${optIdx + 1}`;

                    return (
                      <div
                        key={option.publicId || `opt-${optIdx}`}
                        className={`space-y-3 ${
                          hasMultipleOptions
                            ? "p-3.5 rounded-lg border border-slate-200 bg-slate-50/40"
                            : ""
                        }`}
                      >
                        {/* Option Header */}
                        {hasMultipleOptions && (
                          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 break-inside-avoid">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded">
                                {optionLabel}
                              </span>
                              {option.description && (
                                <span className="text-xs text-slate-600 italic">
                                  — {option.description}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Sections List */}
                        <div className="space-y-3">
                          {option.sections.map((section: NutritionMealSectionDto, secIdx: number) => (
                            <div
                              key={section.publicId || `sec-${secIdx}`}
                              className="bg-white rounded-lg border border-slate-200 p-3 space-y-2.5 break-inside-avoid"
                            >
                              {/* Section Title */}
                              <div className="border-b border-slate-100 pb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  {section.title}
                                </span>
                              </div>

                              {/* Choice Groups */}
                              <div className="space-y-2">
                                {section.choiceGroups.map((cg: NutritionMealChoiceGroupDto, cgIdx: number) => (
                                  <div key={cg.publicId || `cg-${cgIdx}`} className="space-y-1.5">
                                    {cg.items.map((item: NutritionMealItemDto, itemIdx: number) => (
                                      <div key={item.publicId || `item-${itemIdx}`} className="space-y-1.5">
                                        {/* Centered "OU" divider between alternatives in same group */}
                                        {itemIdx > 0 && (
                                          <div className="relative py-0.5 flex items-center justify-center">
                                            <div className="absolute inset-0 flex items-center">
                                              <div className="w-full border-t border-dashed border-slate-200" />
                                            </div>
                                            <span className="relative bg-amber-50 text-amber-700 font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-200">
                                              OU
                                            </span>
                                          </div>
                                        )}

                                        {/* Food Item Row */}
                                        <div className="flex items-start justify-between gap-3 p-2 rounded bg-slate-50/60 border border-slate-100">
                                          <div className="space-y-0.5 min-w-0">
                                            <span className="text-xs font-semibold text-slate-900 block truncate">
                                              {item.foodNameSnapshot}
                                            </span>
                                            {item.notes && (
                                              <span className="text-[10px] text-slate-500 block italic">
                                                {item.notes}
                                              </span>
                                            )}
                                          </div>

                                          <span className="shrink-0 px-2 py-0.5 rounded text-xs font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-200">
                                            {item.prescribedQuantity} {item.prescribedUnitLabel}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Option Totals Summary Footer */}
                        {option.totals && (
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 break-inside-avoid">
                            <span className="font-medium">
                              {option.totals.isExact.all ? "Total da opção:" : "Faixa da opção:"}
                            </span>
                            <div className="flex items-center gap-2 font-medium">
                              <strong className="text-slate-900">
                                {formatMacroRange(option.totals.min.calories, option.totals.max.calories, "kcal")}
                              </strong>
                              <span className="text-slate-300">•</span>
                              <span>P: {formatMacroRange(option.totals.min.protein, option.totals.max.protein, "g")}</span>
                              <span className="text-slate-300">•</span>
                              <span>C: {formatMacroRange(option.totals.min.carbohydrate, option.totals.max.carbohydrate, "g")}</span>
                              <span className="text-slate-300">•</span>
                              <span>G: {formatMacroRange(option.totals.min.fat, option.totals.max.fat, "g")}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Document Footer */}
          <footer className="pt-6 pb-2 text-center text-[10px] text-slate-400 border-t border-slate-200 break-inside-avoid">
            Trevo One • {consultancyName}
          </footer>
        </div>
      </main>
    </div>
  );
}
