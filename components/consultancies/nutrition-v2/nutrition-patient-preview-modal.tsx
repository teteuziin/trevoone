"use client";

import React, { useState } from "react";
import type { PlanVersionTreeDto } from "@/lib/nutrition-v2/plan-repository";
import { formatQuantity, formatMacroGram, formatCaloriesKcal } from "@/lib/nutrition-v2/nutrition-plan-presentation";
import { presentStructuredGuidance } from "@/lib/nutrition-v2/guidance-types";

interface NutritionPatientPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tree: PlanVersionTreeDto;
  studentName?: string;
  consultancyName?: string;
}

export function NutritionPatientPreviewModal({
  isOpen,
  onClose,
  tree,
  studentName = "Paciente",
  consultancyName = "Consultoria",
}: NutritionPatientPreviewModalProps) {
  const [expandedSubstitutions, setExpandedSubstitutions] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleSubstitutions = (itemId: string) => {
    setExpandedSubstitutions((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const { version, meals, dailyTotals } = tree;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl bg-[var(--background)] border border-[var(--border-default)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--surface)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary)]">
                Prévia do Paciente (PWA)
              </h3>
              <p className="text-[10px] text-[var(--text-tertiary)]">
                Como {studentName} visualiza o plano no smartphone
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Smartphone Shell Frame */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Plan Header inside phone mockup */}
          <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--brand)] uppercase tracking-wider">
              <span>{consultancyName}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                V{version.versionNumber} {version.status === "PUBLISHED" ? "Ativo" : "Rascunho"}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] leading-tight">
              {version.title}
            </h2>

            {version.subtitle && (
              <p className="text-xs text-[var(--text-secondary)]">
                {version.subtitle}
              </p>
            )}

            {version.objective && (
              <div className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                Meta: {version.objective}
              </div>
            )}
          </div>

          {/* Daily Macros Card */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)] block">
              Metas Diárias Prescritas
            </span>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded-xl bg-[var(--brand)]/10 border border-[var(--brand)]/20">
                <span className="block text-[10px] text-[var(--text-secondary)]">Calorias</span>
                <span className="text-xs sm:text-sm font-extrabold text-[var(--brand)]">
                  {formatCaloriesKcal(dailyTotals.caloriesKcal)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="block text-[10px] text-[var(--text-secondary)]">Proteína</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {formatMacroGram(dailyTotals.proteinG)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="block text-[10px] text-[var(--text-secondary)]">Carboidrato</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {formatMacroGram(dailyTotals.carbohydrateG)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="block text-[10px] text-[var(--text-secondary)]">Gordura</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {formatMacroGram(dailyTotals.fatG)}
                </span>
              </div>
            </div>
          </div>

          {/* Meals Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider px-1">
              Refeições do Dia ({meals.length})
            </h3>

            {meals.map((meal) => (
              <div
                key={meal.publicId}
                className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-2.5"
              >
                {/* Meal Title & Time */}
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                      {meal.title}
                    </h4>
                    {meal.scheduledTime && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        {meal.scheduledTime}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-[var(--brand)]">
                    {formatCaloriesKcal(meal.mealTotals.caloriesKcal)}
                  </span>
                </div>

                {meal.notes && (
                  <p className="text-[11px] text-[var(--text-tertiary)] italic">
                    {meal.notes}
                  </p>
                )}

                {/* Items in Meal */}
                <div className="space-y-2 pt-1">
                  {meal.items.map((item) => {
                    const hasSubs = item.substitutions.length > 0;
                    const isExpanded = expandedSubstitutions[item.publicId];
                    const formattedQty = formatQuantity(
                      item.prescribedQuantity,
                      item.prescribedUnitLabel,
                      item.prescribedUnitCode
                    );

                    return (
                      <div
                        key={item.publicId}
                        className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-[var(--text-primary)] block">
                              {item.foodNameSnapshot}
                            </span>
                            <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                              {formattedQty}
                            </span>
                          </div>
                          {item.caloriesKcalSnapshot != null && (
                            <span className="text-[10px] font-semibold text-[var(--text-secondary)] font-mono shrink-0">
                              {item.caloriesKcalSnapshot} kcal
                            </span>
                          )}
                        </div>

                        {item.notes && (
                          <p className="text-[10px] text-[var(--text-tertiary)] italic">
                            Obs: {item.notes}
                          </p>
                        )}

                        {/* Substitutions Link */}
                        {hasSubs && (
                          <div className="pt-1 border-t border-[var(--border-subtle)]">
                            <button
                              type="button"
                              onClick={() => toggleSubstitutions(item.publicId)}
                              className="text-[10px] font-bold text-[var(--brand)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>
                                {isExpanded ? "Ocultar alternativas" : `Opções de substituição (${item.substitutions.length})`}
                              </span>
                              <span className="text-[9px]">{isExpanded ? "▲" : "▼"}</span>
                            </button>

                            {isExpanded && (
                              <div className="mt-1.5 space-y-1.5 pl-2 border-l-2 border-[var(--brand)]/30">
                                {item.substitutions.map((sub) => {
                                  const subQty = formatQuantity(
                                    sub.prescribedQuantity,
                                    sub.prescribedUnitLabel,
                                    sub.prescribedUnitCode
                                  );

                                  return (
                                    <div
                                      key={sub.publicId}
                                      className="p-1.5 rounded-lg bg-[var(--surface)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between gap-2"
                                    >
                                      <div>
                                        <span className="font-semibold text-[var(--text-primary)] mr-1">
                                          OU {sub.foodNameSnapshot}
                                        </span>
                                        <span className="text-[10px] text-[var(--text-tertiary)]">
                                          ({subQty})
                                        </span>
                                      </div>
                                      {sub.caloriesKcalSnapshot != null && (
                                        <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                                          {sub.caloriesKcalSnapshot} kcal
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Structured Guidance Preview */}
          {(() => {
            const guidance = version.guidanceJson ? presentStructuredGuidance(version.guidanceJson) : null;
            return (
              <div className="space-y-3">
                {guidance?.hasRecommendations && guidance.recommendations.length > 0 && (
                  <div className="p-3.5 bg-[var(--surface)] border border-[var(--border-default)] rounded-xl space-y-2 text-xs">
                    <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <span>💡</span>
                      <span>Recomendações e Hábitos</span>
                    </h4>
                    <div className="space-y-2">
                      {guidance.recommendations.map((rec) => (
                        <div key={rec.id} className="text-[var(--text-secondary)] leading-relaxed">
                          {rec.title && <strong className="text-[var(--text-primary)] block font-semibold">{rec.title}</strong>}
                          <p className="whitespace-pre-line">{rec.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {guidance?.hasSupplements && guidance.supplements.length > 0 && (
                  <div className="p-3.5 bg-blue-500/5 border border-blue-500/20 rounded-xl space-y-2 text-xs">
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <span>💊</span>
                      <span>Suplementação Prescrita</span>
                    </h4>
                    <div className="divide-y divide-blue-500/10">
                      {guidance.supplements.map((item) => (
                        <div key={item.id} className="py-2 first:pt-0 last:pb-0 space-y-1">
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <span className="font-bold text-[var(--text-primary)]">
                              {item.name} {item.presentation ? <span className="font-normal text-[var(--text-secondary)] text-[11px]">({item.presentation})</span> : null}
                            </span>
                            {item.doseFormatted && (
                              <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-[11px]">
                                {item.doseFormatted}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-secondary)]">
                            {item.frequency && <span><strong>Horário:</strong> {item.frequency}</span>}
                            {item.route && <span><strong>Via:</strong> {item.route}</span>}
                            {item.duration && <span><strong>Duração:</strong> {item.duration}</span>}
                          </div>
                          {item.notes && <p className="text-[11px] text-[var(--text-tertiary)] italic">{item.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {guidance?.hasPhytotherapeutics && guidance.phytotherapeutics.length > 0 && (
                  <div className="p-3.5 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-2 text-xs">
                    <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <span>🌿</span>
                      <span>Fitoterápicos e Botânicos</span>
                    </h4>
                    <div className="divide-y divide-purple-500/10">
                      {guidance.phytotherapeutics.map((item) => (
                        <div key={item.id} className="py-2 first:pt-0 last:pb-0 space-y-1">
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <span className="font-bold text-[var(--text-primary)]">
                              {item.name} {item.presentation ? <span className="font-normal text-[var(--text-secondary)] text-[11px]">({item.presentation})</span> : null}
                            </span>
                            {item.doseFormatted && (
                              <span className="font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded text-[11px]">
                                {item.doseFormatted}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--text-secondary)]">
                            {item.frequency && <span><strong>Horário:</strong> {item.frequency}</span>}
                            {item.route && <span><strong>Via:</strong> {item.route}</span>}
                            {item.duration && <span><strong>Duração:</strong> {item.duration}</span>}
                          </div>
                          {item.notes && <p className="text-[11px] text-[var(--text-tertiary)] italic">{item.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!guidance?.hasAny && version.generalGuidance && (
                  <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-1.5">
                    <h4 className="text-xs font-bold text-[var(--text-primary)]">
                      Orientações Gerais do Nutricionista
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                      {version.generalGuidance}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-end px-4 py-3 border-t border-[var(--border-default)] bg-[var(--surface)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--brand)] text-white hover:opacity-90 shadow-2xs transition-colors"
          >
            Fechar Prévia
          </button>
        </div>
      </div>
    </div>
  );
}
