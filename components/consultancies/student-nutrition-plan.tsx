import { Badge } from "@/components/ui/badge";
import { formatMacroRange } from "@/lib/consultancies/nutrition-totals";
import type {
  NutritionPlanDto,
  NutritionMealDto,
  NutritionMealOptionDto,
  NutritionMealSectionDto,
  NutritionMealChoiceGroupDto,
  NutritionMealItemDto,
} from "@/lib/consultancies/nutrition";

type Props = {
  consultancySlug: string;
  consultancyName: string;
  consultancyLogoUrl?: string | null;
  plan: NutritionPlanDto;
};

export function StudentNutritionPlan({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  plan,
}: Props) {
  return (
    <div className="w-full space-y-6">
      {/* Top Banner & Plan Information */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-pulse mr-1" />
                Plano Atual
              </Badge>
              {consultancyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={consultancyLogoUrl}
                  alt={consultancyName}
                  className="h-5 max-w-[100px] object-contain"
                />
              ) : (
                <span className="text-xs text-[var(--text-tertiary)] font-medium">
                  {consultancyName}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {plan.title}
            </h1>
            {plan.subtitle && (
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                {plan.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/consultoria/${consultancySlug}/nutricao/imprimir`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] text-[var(--surface)] text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
            >
              <svg className="w-4 h-4 text-[var(--border-subtle)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir plano
            </a>
          </div>
        </div>

        {/* Vigência / Data de disponibilização */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
          {(plan.startsOn || plan.endsOn) && (
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                Vigência: <strong className="text-[var(--text-primary)]">{plan.startsOn ? new Date(plan.startsOn + "T00:00:00").toLocaleDateString("pt-BR") : "Início"}</strong> até <strong className="text-[var(--text-primary)]">{plan.endsOn ? new Date(plan.endsOn + "T00:00:00").toLocaleDateString("pt-BR") : "Indeterminado"}</strong>
              </span>
            </div>
          )}
          {plan.activatedAt && (
            <span>
              Disponibilizado em: {new Date(plan.activatedAt).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>

        {/* Orientações Gerais */}
        {plan.generalGuidance && (
          <div className="p-4 bg-[var(--surface-sunken)] rounded-xl border border-[var(--border-subtle)] text-xs space-y-1.5">
            <span className="font-semibold text-[var(--text-primary)] block flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[var(--brand)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Orientações Gerais do Nutricionista:
            </span>
            <p className="whitespace-pre-line text-[var(--text-secondary)] leading-relaxed pl-5.5">
              {plan.generalGuidance}
            </p>
          </div>
        )}
      </div>

      {/* Daily Nutritional Summary Card */}
      {plan.totals && (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                {plan.totals.isExact.all ? "Total Diário Estimado" : "Faixa Nutricional Diária"}
              </span>
            </div>
            {!plan.totals.isExact.all && (
              <span className="text-[11px] text-[var(--text-tertiary)]">
                Os limites são calculados separadamente para cada nutriente, considerando as alternativas do plano.
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0.5">
            <div className="bg-[var(--surface-sunken)] p-3 rounded-xl border border-[var(--border-subtle)] shadow-2xs">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] block uppercase">Calorias</span>
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {formatMacroRange(plan.totals.min.calories, plan.totals.max.calories, "kcal")}
              </span>
            </div>

            <div className="bg-[var(--surface-sunken)] p-3 rounded-xl border border-[var(--border-subtle)] shadow-2xs">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] block uppercase">Proteínas</span>
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {formatMacroRange(plan.totals.min.protein, plan.totals.max.protein, "g")}
              </span>
            </div>

            <div className="bg-[var(--surface-sunken)] p-3 rounded-xl border border-[var(--border-subtle)] shadow-2xs">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] block uppercase">Carboidratos</span>
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {formatMacroRange(plan.totals.min.carbohydrate, plan.totals.max.carbohydrate, "g")}
              </span>
            </div>

            <div className="bg-[var(--surface-sunken)] p-3 rounded-xl border border-[var(--border-subtle)] shadow-2xs">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)] block uppercase">Gorduras</span>
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {formatMacroRange(plan.totals.min.fat, plan.totals.max.fat, "g")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Meals Container */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
          Estrutura de Refeições
        </h2>

        <div className="space-y-4">
          {plan.meals.map((meal: NutritionMealDto) => (
            <div
              key={meal.publicId}
              className="bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] shadow-xs overflow-hidden"
            >
              {/* Meal Header */}
              <div className="p-4 sm:p-5 bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {meal.scheduledTime && (
                    <div className="px-2.5 py-1 bg-[var(--brand-surface)] text-[var(--brand-foreground)] font-bold text-xs rounded-lg border border-[var(--border-subtle)]">
                      {meal.scheduledTime.slice(0, 5)}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                        {meal.title}
                      </h3>
                      {meal.totals && (
                        <span className="hidden sm:inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
                          <span>{formatMacroRange(meal.totals.min.calories, meal.totals.max.calories, "kcal")}</span>
                          <span className="text-[var(--text-tertiary)]">•</span>
                          <span>P: {formatMacroRange(meal.totals.min.protein, meal.totals.max.protein, "g")}</span>
                          <span className="text-[var(--text-tertiary)]">•</span>
                          <span>C: {formatMacroRange(meal.totals.min.carbohydrate, meal.totals.max.carbohydrate, "g")}</span>
                          <span className="text-[var(--text-tertiary)]">•</span>
                          <span>G: {formatMacroRange(meal.totals.min.fat, meal.totals.max.fat, "g")}</span>
                        </span>
                      )}
                    </div>
                    {meal.notes && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{meal.notes}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Meal Options */}
              <div className="p-5 space-y-4">
                {meal.options.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)] italic">Sem opções cadastradas para esta refeição.</p>
                ) : (
                  meal.options.map((option: NutritionMealOptionDto, optIdx: number) => {
                    const optionDisplayLabel = option.title || `Opção ${optIdx + 1}`;
                    const hasMultipleOptions = meal.options.length > 1;

                    return (
                      <div
                        key={option.publicId || `opt-${optIdx}`}
                        className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4 space-y-3.5 ${
                          hasMultipleOptions ? "relative" : ""
                        }`}
                      >
                        {/* Option Header */}
                        {hasMultipleOptions && (
                          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-2.5">
                            <div className="flex items-center gap-2">
                              <Badge variant="brand" size="sm">
                                {optionDisplayLabel}
                              </Badge>
                              {option.description && (
                                <span className="text-xs text-[var(--text-secondary)] italic">
                                  — {option.description}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Option Sections */}
                        <div className="space-y-3">
                          {option.sections.map((section: NutritionMealSectionDto, secIdx: number) => (
                            <div
                              key={section.publicId || `sec-${secIdx}`}
                              className="bg-[var(--surface)] rounded-xl border border-[var(--border-subtle)] p-3.5 space-y-3"
                            >
                              {/* Section Title */}
                              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                  {section.title}
                                </span>
                              </div>

                              {/* Section Choice Groups */}
                              <div className="space-y-3">
                                {section.choiceGroups.map((cg: NutritionMealChoiceGroupDto, cgIdx: number) => (
                                  <div key={cg.publicId || `cg-${cgIdx}`} className="space-y-2">
                                    {cg.items.map((item: NutritionMealItemDto, itemIdx: number) => (
                                      <div key={item.publicId || `item-${itemIdx}`} className="space-y-2">
                                        {/* Divider "OU" if itemIdx > 0 */}
                                        {itemIdx > 0 && (
                                          <div className="relative py-1 flex items-center justify-center">
                                            <div className="absolute inset-0 flex items-center">
                                              <div className="w-full border-t border-dashed border-[var(--border-subtle)]" />
                                            </div>
                                            <span className="relative bg-[var(--surface-sunken)] text-[var(--text-secondary)] font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                                              OU
                                            </span>
                                          </div>
                                        )}

                                        {/* Food Item Row */}
                                        <div className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors">
                                          <div className="space-y-0.5 min-w-0">
                                            <span className="text-xs font-semibold text-[var(--text-primary)] block truncate">
                                              {item.foodNameSnapshot}
                                            </span>
                                            {item.notes && (
                                              <span className="text-[11px] text-[var(--text-secondary)] block italic">
                                                {item.notes}
                                              </span>
                                            )}
                                          </div>

                                          <div className="shrink-0 text-right">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono text-[var(--brand-foreground)] bg-[var(--brand-surface)] border border-[var(--border-subtle)]">
                                              {item.prescribedQuantity} {item.prescribedUnitLabel}
                                            </span>
                                          </div>
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
                          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[var(--text-secondary)]">
                              {option.totals.isExact.all ? "Total da opção:" : "Faixa da opção:"}
                            </span>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--text-secondary)]">
                              <span className="font-bold text-[var(--text-primary)]">
                                {formatMacroRange(option.totals.min.calories, option.totals.max.calories, "kcal")}
                              </span>
                              <span className="text-[var(--text-tertiary)]">•</span>
                              <span>P: {formatMacroRange(option.totals.min.protein, option.totals.max.protein, "g")}</span>
                              <span className="text-[var(--text-tertiary)]">•</span>
                              <span>C: {formatMacroRange(option.totals.min.carbohydrate, option.totals.max.carbohydrate, "g")}</span>
                              <span className="text-[var(--text-tertiary)]">•</span>
                              <span>G: {formatMacroRange(option.totals.min.fat, option.totals.max.fat, "g")}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
