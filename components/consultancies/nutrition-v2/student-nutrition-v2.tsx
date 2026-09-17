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
      <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 border-specular-t depth-surface">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {consultancyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={consultancyLogoUrl}
                  alt={consultancyName}
                  className="h-5 max-w-[120px] object-contain"
                />
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {consultancyName}
                </span>
              )}
              <span className="text-[var(--border-strong)]">•</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-primary)] bg-[var(--surface-subtle)] border border-[var(--border-default)] px-2.5 py-0.5 rounded-md shadow-2xs">
                Plano Alimentar Ativo
              </span>
              <span className="text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-md">
                Versão {version.versionNumber}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {version.title}
            </h1>

            {version.subtitle && (
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
                {version.subtitle}
              </p>
            )}
          </div>

          {/* Action to Print */}
          <Link
            href={`/consultoria/${consultancySlug}/nutricao/imprimir`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-all shrink-0 shadow-2xs depth-interactive min-h-[44px] sm:min-h-[40px]"
          >
            <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir / PDF</span>
          </Link>
        </div>

        {/* Objective */}
        {version.objective && (
          <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-2xl text-xs text-[var(--text-primary)] space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">
              Objetivo
            </span>
            <p className="font-medium leading-relaxed">{version.objective}</p>
          </div>
        )}

        {/* Macro Summary Chips (Safe with NULL: omits or explains unknown, no fake 0) */}
        {totals.caloriesKcal != null && (
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2.5">
              Metas Estimadas do Plano
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border-subtle)] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">Calorias</div>
                <div className="text-base font-bold text-[var(--text-primary)] tabular-nums">{totals.caloriesKcal} kcal</div>
              </div>
              <div className="p-3 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border-subtle)] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">Proteínas</div>
                <div className="text-base font-bold text-[var(--text-primary)] tabular-nums">{totals.proteinG ?? "-"} g</div>
              </div>
              <div className="p-3 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border-subtle)] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">Carboidratos</div>
                <div className="text-base font-bold text-[var(--text-primary)] tabular-nums">{totals.carbohydrateG ?? "-"} g</div>
              </div>
              <div className="p-3 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border-subtle)] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">Gorduras</div>
                <div className="text-base font-bold text-[var(--text-primary)] tabular-nums">{totals.fatG ?? "-"} g</div>
              </div>
            </div>
          </div>
        )}

        {/* General Guidance */}
        {version.generalGuidance && (
          <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-2xl space-y-1 text-xs text-[var(--text-primary)]">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Orientações do Nutricionista
            </div>
            <p className="whitespace-pre-line leading-relaxed text-[var(--text-secondary)]">{version.generalGuidance}</p>
          </div>
        )}

        {/* Notes for Student from Prescriber */}
        {notesForStudent && (
          <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-2xl space-y-1 text-xs text-[var(--text-primary)]">
            <div className="font-semibold text-[var(--brand)]">Recado da sua Prescrição</div>
            <p className="whitespace-pre-line leading-relaxed text-[var(--text-secondary)] italic">{notesForStudent}</p>
          </div>
        )}
      </div>

      {/* Meals List - strictly ordered by sort_order */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider px-1">
          Refeições Prescritas
        </h2>

        {meals.length === 0 ? (
          <div className="p-8 text-center bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl text-xs text-[var(--text-secondary)] depth-base">
            Nenhuma refeição cadastrada para este plano.
          </div>
        ) : (
          meals.map((meal) => (
            <div
              key={meal.publicId}
              className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 depth-surface"
            >
              {/* Meal Header */}
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                    {meal.title}
                  </h3>
                  {meal.notes && (
                    <p className="text-xs text-[var(--text-secondary)] italic">{meal.notes}</p>
                  )}
                </div>

                {meal.scheduledTime && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border-default)] shrink-0 shadow-2xs tabular-nums">
                    <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{meal.scheduledTime}</span>
                  </span>
                )}
              </div>

              {/* Items List - strictly ordered by sort_order */}
              <div className="space-y-2.5">
                {meal.items.map((item) => (
                  <div
                    key={item.publicId}
                    className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-2xl space-y-2.5"
                  >
                    {/* Main Item */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                          {item.foodNameSnapshot}
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-[var(--text-secondary)] italic">{item.notes}</div>
                        )}
                      </div>

                      {item.prescribedQuantity != null && (
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
                            {item.prescribedQuantity} {item.prescribedUnitLabel || item.prescribedUnitCode || ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Substitutions with explicit 'OU' semantics (mutual exclusivity) */}
                    {item.substitutions.length > 0 && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Opções de Substituição
                        </div>
                        <div className="space-y-1.5">
                          {item.substitutions.map((sub) => (
                            <div
                              key={sub.publicId}
                              className="flex items-start justify-between gap-2 text-xs text-[var(--text-secondary)] bg-[var(--surface)] p-2.5 rounded-xl border border-[var(--border-subtle)]"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)] shrink-0">
                                  OU
                                </span>
                                <span className="truncate text-[var(--text-primary)] font-medium">{sub.foodNameSnapshot}</span>
                                {sub.notes && (
                                  <span className="text-[10px] text-[var(--text-tertiary)] italic">({sub.notes})</span>
                                )}
                              </div>

                              {sub.prescribedQuantity != null && (
                                <span className="font-semibold text-[var(--text-primary)] shrink-0 tabular-nums">
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
