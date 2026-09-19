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
    <div className="space-y-6 max-w-3xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Cardápio Header Card */}
      <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 border-specular-t depth-surface">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            {/* Consultancy and Status Header */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {consultancyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={consultancyLogoUrl}
                  alt={consultancyName}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                  className="h-5 max-w-[120px] object-contain"
                />
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  {consultancyName}
                </span>
              )}
              <span className="text-[var(--border-strong)]">•</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--brand)] bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] px-2.5 py-0.5 rounded-md shadow-2xs">
                Meu Plano Alimentar
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              {plan.title}
            </h1>

            {plan.subtitle && (
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
                {plan.subtitle}
              </p>
            )}

            {/* Prescriber and Period Metadata */}
            <div className="flex items-center gap-3 flex-wrap pt-1 text-xs text-[var(--text-secondary)]">
              {plan.prescriberName && (
                <div className="inline-flex items-center gap-1.5 font-medium">
                  <svg className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Prescrito por: <strong className="text-[var(--text-primary)]">{plan.prescriberName}</strong></span>
                </div>
              )}

              {plan.periodFormatted && (
                <div className="inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{plan.periodFormatted}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons: PDF & Print */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap shrink-0">
            <a
              href={pdfDownloadUrl}
              download
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] transition-all shadow-xs min-h-[44px] sm:min-h-[40px] cursor-pointer"
              title="Baixar arquivo PDF profissional"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Baixar PDF</span>
            </a>

            <Link
              href={`/consultoria/${consultancySlug}/nutricao/imprimir`}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-all shadow-2xs min-h-[44px] sm:min-h-[40px]"
              title="Visualizar e imprimir plano"
            >
              <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Imprimir</span>
            </Link>
          </div>
        </div>

        {/* Nutritional Goals Summary (Strictly Real Data) */}
        {plan.totals.hasAnyMacro && (
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
              Metas Nutricionais Estimadas
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border-subtle)] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">
                  Calorias
                </div>
                <div className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                  {plan.totals.caloriesFormatted}
                </div>
              </div>
              <div className="p-3 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border-subtle)] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">
                  Proteínas
                </div>
                <div className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                  {plan.totals.proteinFormatted}
                </div>
              </div>
              <div className="p-3 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border-subtle)] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">
                  Carboidratos
                </div>
                <div className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                  {plan.totals.carbohydrateFormatted}
                </div>
              </div>
              <div className="p-3 bg-[var(--surface-subtle)] rounded-2xl border border-[var(--border-subtle)] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">
                  Gorduras
                </div>
                <div className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                  {plan.totals.fatFormatted}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Objective */}
        {plan.objective && (
          <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-2xl text-xs text-[var(--text-primary)] space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] block">
              Objetivo do Plano
            </span>
            <p className="font-medium leading-relaxed">{plan.objective}</p>
          </div>
        )}

        {/* General Guidance */}
        {plan.generalGuidance && (
          <div className="p-4 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-2xl space-y-1 text-xs text-[var(--text-primary)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Orientações Gerais do Nutricionista
            </div>
            <p className="whitespace-pre-line leading-relaxed text-[var(--text-secondary)]">
              {plan.generalGuidance}
            </p>
          </div>
        )}

        {/* Notes for Student */}
        {plan.notesForStudent && (
          <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1 text-xs text-[var(--text-primary)]">
            <div className="font-bold text-[var(--brand)]">
              Instruções Específicas da Prescrição
            </div>
            <p className="whitespace-pre-line leading-relaxed text-[var(--text-secondary)] italic">
              {plan.notesForStudent}
            </p>
          </div>
        )}
      </div>

      {/* Meals List - strictly ordered by sort_order */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Cardápio e Refeições
          </h2>
          <span className="text-xs text-[var(--text-tertiary)] font-medium">
            {plan.meals.length} {plan.meals.length === 1 ? "refeição" : "refeições"}
          </span>
        </div>

        {plan.meals.length === 0 ? (
          <div className="p-8 text-center bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl text-xs text-[var(--text-secondary)] depth-base">
            Nenhuma refeição cadastrada para este plano.
          </div>
        ) : (
          plan.meals.map((meal) => (
            <div
              key={meal.id}
              className="bg-[var(--surface)] border border-[var(--border-default)] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 depth-surface"
            >
              {/* Meal Header */}
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
                <div className="space-y-0.5 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg text-[var(--text-primary)] tracking-tight">
                    {meal.title}
                  </h3>
                  {meal.notes && (
                    <p className="text-xs text-[var(--text-secondary)] italic">{meal.notes}</p>
                  )}
                </div>

                {meal.timeFormatted && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-[var(--surface-subtle)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)] shrink-0 shadow-2xs tabular-nums">
                    <svg className="w-3.5 h-3.5 text-[var(--brand)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{meal.timeFormatted}</span>
                  </span>
                )}
              </div>

              {/* Items List - strictly ordered by sort_order */}
              <div className="space-y-3">
                {meal.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-2xl space-y-2.5 transition-colors hover:border-[var(--border-default)]"
                  >
                    {/* Main Item Line */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="font-bold text-sm text-[var(--text-primary)] tracking-tight">
                          {item.foodName}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-[var(--text-secondary)] italic">
                            {item.notes}
                          </div>
                        )}
                      </div>

                      {item.quantityFormatted && (
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-[var(--brand-foreground)] bg-[var(--surface)] px-2.5 py-1 rounded-lg border border-[var(--border-default)] shadow-2xs tabular-nums">
                            {item.quantityFormatted}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Substitutions Block (Clean, non-repetitive) */}
                    {item.substitutions.length > 0 && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                          Pode ser substituído por:
                        </div>
                        <div className="space-y-1.5">
                          {item.substitutions.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between gap-2 text-xs bg-[var(--surface)] p-2.5 rounded-xl border border-[var(--border-subtle)]"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] shrink-0" />
                                <span className="font-medium text-[var(--text-primary)] truncate">
                                  {sub.foodName}
                                </span>
                                {sub.notes && (
                                  <span className="text-[11px] text-[var(--text-tertiary)] italic hidden sm:inline">
                                    ({sub.notes})
                                  </span>
                                )}
                              </div>

                              {sub.quantityFormatted && (
                                <span className="font-bold text-[var(--text-primary)] shrink-0 tabular-nums">
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
