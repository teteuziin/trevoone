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
  userPublicId?: string;
  consultancyPublicId?: string;
  role?: string;
}

export function StudentNutritionV2({
  consultancySlug,
  consultancyName,
  consultancyLogoUrl,
  studentName = "Aluno",
  assignedPlan,
  userPublicId: initialUserPublicId,
  consultancyPublicId: initialConsultancyPublicId,
  role: initialRole,
}: Props) {
  const [activeContext, setActiveContext] = React.useState<{
    userPublicId: string;
    consultancyPublicId: string;
    role: string;
  } | null>(() => {
    if (initialUserPublicId) {
      return {
        userPublicId: initialUserPublicId,
        consultancyPublicId: initialConsultancyPublicId || "",
        role: initialRole || "STUDENT",
      };
    }
    return null;
  });

  React.useEffect(() => {
    if (!activeContext) {
      import("@/lib/offline/offline-context").then(({ getValidOfflineActiveContext }) => {
        getValidOfflineActiveContext().then((ctx) => {
          if (ctx) {
            setActiveContext({
              userPublicId: ctx.userPublicId,
              consultancyPublicId: ctx.consultancyPublicId,
              role: ctx.role,
            });
          }
        }).catch(() => {});
      }).catch(() => {});
    }
  }, [activeContext]);

  const scopedUserPublicId = initialUserPublicId || activeContext?.userPublicId || "";
  const scopedConsultancyPublicId = initialConsultancyPublicId || activeContext?.consultancyPublicId || "";
  const scopedRole = initialRole || activeContext?.role || "STUDENT";

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
    if (
      typeof window === "undefined" ||
      !scopedUserPublicId ||
      scopedUserPublicId === "student" ||
      !scopedConsultancyPublicId ||
      scopedConsultancyPublicId === "consultancy"
    ) {
      return;
    }
    import("@/lib/offline/offline-nutrition")
      .then(({ saveNutritionSnapshot }) => {
        saveNutritionSnapshot({
          userPublicId: scopedUserPublicId,
          consultancyPublicId: scopedConsultancyPublicId,
          role: scopedRole,
          planPublicId: assignedPlan.version.publicId || "active_plan",
          planTitle: assignedPlan.version.title,
          planSubtitle: assignedPlan.version.subtitle,
          data: assignedPlan,
        });
      })
      .catch(() => {});
  }, [assignedPlan, scopedUserPublicId, scopedConsultancyPublicId, scopedRole]);

  const pdfDownloadUrl = `/api/consultancies/${consultancySlug}/nutricao/pdf?download=true`;

  // Calculate next / current meal based on current local time
  const nextMeal = React.useMemo(() => {
    if (!plan.meals || plan.meals.length === 0) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const meal of plan.meals) {
      if (meal.timeFormatted) {
        const match = meal.timeFormatted.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
          const mealMinutes = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
          if (mealMinutes >= currentMinutes) {
            return meal;
          }
        }
      }
    }
    return plan.meals[0];
  }, [plan.meals]);

  const scrollToMeal = (id: string) => {
    const el = document.getElementById(`meal-mobile-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* 2. Top Action Bar (Discrete, placed strictly outside the editorial sheet) */}
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <Link
          href={`/consultoria/${consultancySlug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          title="Voltar ao painel da consultoria"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Voltar ao painel</span>
          <span className="sm:hidden">Voltar</span>
        </Link>

        <div className="flex items-center gap-2">
          <a
            href={pdfDownloadUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/15 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 hover:border-slate-300 dark:hover:border-white/25 transition-all shadow-2xs shrink-0"
            title="Baixar arquivo PDF oficial"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Baixar PDF</span>
          </a>

          <Link
            href={`/consultoria/${consultancySlug}/nutricao/imprimir`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-white/15 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 hover:border-slate-300 dark:hover:border-white/25 transition-all shadow-2xs shrink-0"
            title="Visualizar para impressão"
          >
            <svg className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir</span>
          </Link>
        </div>
      </div>

      {/* MOBILE NATIVE STUDENT COCKPIT (< sm) */}
      <div className="sm:hidden space-y-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        {/* Context & Plan Header Card */}
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400">
              {plan.consultancyName}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Plano Ativo
            </span>
          </div>

          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
              {plan.title}
            </h1>
            {plan.subtitle && (
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{plan.subtitle}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-[var(--text-tertiary)] pt-1 border-t border-[var(--border-subtle)]">
            <span>Aluno: <strong className="text-[var(--text-primary)]">{plan.studentName}</strong></span>
            {plan.prescriberName && (
              <>
                <span>•</span>
                <span>Nutri: <strong className="text-[var(--text-primary)]">{plan.prescriberName}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Daily Macros Grid */}
        {plan.totals.hasAnyMacro && (
          <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl p-3.5 space-y-2 shadow-2xs">
            <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)]">
              Metas Nutricionais Diárias
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-[var(--surface-subtle)] rounded-xl py-2 px-1 text-center">
                <div className="text-[9px] uppercase font-semibold text-[var(--text-tertiary)]">Calorias</div>
                <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5 tabular-nums truncate">
                  {plan.totals.caloriesFormatted}
                </div>
              </div>
              <div className="bg-[var(--surface-subtle)] rounded-xl py-2 px-1 text-center">
                <div className="text-[9px] uppercase font-semibold text-[var(--text-tertiary)]">Proteínas</div>
                <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5 tabular-nums truncate">
                  {plan.totals.proteinFormatted}
                </div>
              </div>
              <div className="bg-[var(--surface-subtle)] rounded-xl py-2 px-1 text-center">
                <div className="text-[9px] uppercase font-semibold text-[var(--text-tertiary)]">Carbos</div>
                <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5 tabular-nums truncate">
                  {plan.totals.carbohydrateFormatted}
                </div>
              </div>
              <div className="bg-[var(--surface-subtle)] rounded-xl py-2 px-1 text-center">
                <div className="text-[9px] uppercase font-semibold text-[var(--text-tertiary)]">Gorduras</div>
                <div className="text-xs font-bold text-[var(--text-primary)] mt-0.5 tabular-nums truncate">
                  {plan.totals.fatFormatted}
                </div>
              </div>
            </div>
            {plan.totals.isPartial && (
              <p className="text-[10px] text-[var(--text-tertiary)] italic">
                * Alguns alimentos têm nutrientes em revisão clínica.
              </p>
            )}
          </div>
        )}

        {/* Current / Next Meal Highlight Card */}
        {nextMeal && (
          <div className="bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Próxima Refeição
                </span>
              </div>
              {nextMeal.timeFormatted && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white tabular-nums">
                  {nextMeal.timeFormatted}
                </span>
              )}
            </div>

            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {nextMeal.title}
              </h2>
              {nextMeal.notes && (
                <p className="text-xs text-[var(--text-secondary)] italic mt-0.5">
                  {nextMeal.notes}
                </p>
              )}
            </div>

            {/* Foods in Next Meal */}
            <div className="space-y-2 pt-1 border-t border-emerald-500/20">
              {nextMeal.items.map((it) => (
                <div key={it.id} className="text-xs space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {it.foodName}
                    </span>
                    {it.quantityFormatted && (
                      <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0 tabular-nums">
                        {it.quantityFormatted}
                      </span>
                    )}
                  </div>
                  {it.notes && (
                    <div className="text-[11px] text-[var(--text-secondary)] italic pl-2 border-l-2 border-emerald-500/40">
                      {it.notes}
                    </div>
                  )}
                  {it.substitutions.length > 0 && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 pl-2">
                      <span className="font-medium">⇄ Substituir por: </span>
                      {it.substitutions.map((sub, idx) => (
                        <span key={sub.id}>
                          {sub.foodName} ({sub.quantityFormatted || "mesma porção"})
                          {idx < it.substitutions.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollToMeal(nextMeal.id)}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-zinc-700/50 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Ver detalhes no cardápio</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}

        {/* Meal Navigation Pills */}
        {plan.meals.length > 1 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
              Refeições do Dia
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {plan.meals.map((meal) => (
                <button
                  key={meal.id}
                  type="button"
                  onClick={() => scrollToMeal(meal.id)}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-emerald-600 hover:border-emerald-500/40 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>{meal.title}</span>
                  {meal.timeFormatted && (
                    <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">
                      {meal.timeFormatted}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Guidance and Notes (if present) */}
        {(plan.objective || plan.generalGuidance || plan.notesForStudent) && (
          <div className="space-y-2">
            {plan.objective && (
              <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-secondary)] space-y-1">
                <strong className="text-[var(--text-primary)] font-semibold block">Objetivo do Plano</strong>
                <p>{plan.objective}</p>
              </div>
            )}
            {plan.generalGuidance && (
              <div className="p-3 bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-secondary)] space-y-1">
                <strong className="text-[var(--text-primary)] font-semibold block">Orientações do Nutricionista</strong>
                <p className="whitespace-pre-line leading-relaxed">{plan.generalGuidance}</p>
              </div>
            )}
            {plan.notesForStudent && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <strong className="font-semibold block text-amber-900 dark:text-amber-200">Observações para Você</strong>
                <p>{plan.notesForStudent}</p>
              </div>
            )}
          </div>
        )}

        {/* All Meals Cards */}
        <div className="space-y-3 pt-1">
          {plan.meals.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-tertiary)] bg-[var(--surface-elevated)] rounded-xl border border-[var(--border-default)]">
              Nenhuma refeição cadastrada para este plano alimentar.
            </div>
          ) : (
            plan.meals.map((meal, mealIdx) => (
              <div
                key={meal.id}
                id={`meal-mobile-${meal.id}`}
                className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl p-4 space-y-3 shadow-2xs scroll-mt-4"
              >
                {/* Meal Header */}
                <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                      {mealIdx + 1}
                    </span>
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">
                      {meal.title}
                    </h2>
                  </div>
                  {meal.timeFormatted && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] tabular-nums">
                      {meal.timeFormatted}
                    </span>
                  )}
                </div>

                {meal.notes && (
                  <p className="text-xs text-[var(--text-tertiary)] italic">
                    {meal.notes}
                  </p>
                )}

                {/* Food Items */}
                <div className="divide-y divide-[var(--border-subtle)]">
                  {meal.items.map((item) => (
                    <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          {item.foodName}
                        </div>
                        {item.quantityFormatted && (
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0 tabular-nums">
                            {item.quantityFormatted}
                          </div>
                        )}
                      </div>

                      {item.notes && (
                        <div className="text-[11px] text-[var(--text-tertiary)] italic flex items-start gap-1">
                          <span>💡</span>
                          <span>{item.notes}</span>
                        </div>
                      )}

                      {/* Substitutions */}
                      {item.substitutions.length > 0 && (
                        <div className="mt-1 pl-2.5 py-1.5 border-l-2 border-amber-400 bg-amber-500/5 rounded-r-lg space-y-1">
                          <div className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                            Pode ser substituído por:
                          </div>
                          {item.substitutions.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-baseline justify-between gap-2 text-[11px] text-[var(--text-secondary)]"
                            >
                              <div>
                                <span>{sub.foodName}</span>
                                {sub.notes && (
                                  <span className="text-[var(--text-tertiary)] italic ml-1">
                                    ({sub.notes})
                                  </span>
                                )}
                              </div>
                              {sub.quantityFormatted && (
                                <span className="font-semibold text-[var(--text-primary)] shrink-0 tabular-nums">
                                  {sub.quantityFormatted}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Micronutrientes (Collapsible) */}
        {plan.micronutrients && plan.micronutrients.length > 0 && (
          <details className="group bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl p-4 text-xs shadow-2xs">
            <summary className="cursor-pointer font-semibold text-[var(--text-primary)] flex items-center justify-between select-none">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Micronutrientes ({plan.micronutrients.length})
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
              {plan.micronutrients.map((micro) => (
                <div key={micro.code} className="flex items-baseline justify-between gap-1 text-[11px] py-0.5">
                  <span className="text-[var(--text-secondary)] truncate">{micro.name}:</span>
                  <span className="font-semibold text-[var(--text-primary)] shrink-0 tabular-nums">{micro.valueFormatted}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        <div className="text-center text-[10px] text-[var(--text-tertiary)] py-4">
          Trevo One • {plan.consultancyName}
        </div>
      </div>

      {/* DESKTOP CARDÁPIO CONTINUOUS SHEET (hidden sm:block) */}
      <div className="hidden sm:block bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl shadow-sm p-4 sm:p-9 space-y-6 text-[var(--text-primary)] transition-colors">
        {/* 3. Document Header (Editorial format) */}
        <header className="border-b border-[var(--border-subtle)] pb-5 space-y-4">
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
                <span className="text-[var(--border-strong)]">•</span>
                <span className="text-xs uppercase font-semibold text-[var(--text-tertiary)] tracking-wider">
                  Plano Alimentar
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] pt-0.5">
                {plan.title}
              </h1>

              {plan.subtitle && (
                <p className="text-xs text-[var(--text-secondary)]">{plan.subtitle}</p>
              )}
            </div>

            {/* Right-aligned editorial metadata block (omits absent lines) */}
            <div className="text-left sm:text-right space-y-0.5 text-xs text-[var(--text-tertiary)] shrink-0">
              <div>Aluno: <strong className="text-[var(--text-primary)] font-semibold">{plan.studentName}</strong></div>
              {plan.prescriberName && (
                <div>Nutricionista: <strong className="text-[var(--text-primary)] font-semibold">{plan.prescriberName}</strong></div>
              )}
              {plan.periodFormatted && (
                <div>Período: <span className="text-[var(--text-secondary)] font-medium">{plan.periodFormatted}</span></div>
              )}
              <div>Emissão: <span>{plan.generationDateFormatted}</span></div>
            </div>
          </div>

          {/* Objetivo do Plano (Subtle box, only if present) */}
          {plan.objective && (
            <div className="p-3 bg-[var(--surface-subtle)] rounded-lg text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              <strong className="text-[var(--text-primary)] font-semibold">Objetivo: </strong>
              {plan.objective}
            </div>
          )}

          {/* 4. Macros Mais Compactos (Low height, small radius, subtle borders, integrated) */}
          {plan.totals.hasAnyMacro && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
              <div className="bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-md py-1.5 px-2.5 text-center">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-tertiary)]">Calorias</div>
                <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">{plan.totals.caloriesFormatted}</div>
              </div>
              <div className="bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-md py-1.5 px-2.5 text-center">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-tertiary)]">Proteínas</div>
                <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">{plan.totals.proteinFormatted}</div>
              </div>
              <div className="bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-md py-1.5 px-2.5 text-center">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-tertiary)]">Carboidratos</div>
                <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">{plan.totals.carbohydrateFormatted}</div>
              </div>
              <div className="bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-md py-1.5 px-2.5 text-center">
                <div className="text-[10px] uppercase font-semibold tracking-wider text-[var(--text-tertiary)]">Gorduras</div>
                <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5 tabular-nums">{plan.totals.fatFormatted}</div>
              </div>
            </div>
          )}

          {/* Micronutrientes do Plano (Expandable if present) */}
          {plan.micronutrients && plan.micronutrients.length > 0 && (
            <details className="group bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-[var(--text-primary)] flex items-center justify-between select-none">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Micronutrientes do Plano ({plan.micronutrients.length} identificados)
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                {plan.micronutrients.map((micro) => (
                  <div key={micro.code} className="flex items-baseline justify-between gap-1 text-[11px] py-0.5">
                    <span className="text-[var(--text-secondary)] truncate">{micro.name}:</span>
                    <span className="font-semibold text-[var(--text-primary)] shrink-0 tabular-nums">{micro.valueFormatted}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Orientações do Nutricionista (Subtle box, only if present) */}
          {plan.generalGuidance && (
            <div className="p-3.5 bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-lg space-y-1 text-xs text-[var(--text-secondary)]">
              <div className="font-semibold text-[var(--text-primary)]">Orientações do Nutricionista</div>
              <p className="whitespace-pre-line leading-relaxed">{plan.generalGuidance}</p>
            </div>
          )}

          {/* Observações da Prescrição (Subtle amber box, only if present) */}
          {plan.notesForStudent && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              <strong className="text-amber-800 dark:text-amber-200 font-semibold">Observações: </strong>
              {plan.notesForStudent}
            </div>
          )}
        </header>

        {/* 5. Refeições — Seções Contínuas da Folha (ZERO "card dentro de card") */}
        <div className="divide-y divide-[var(--border-subtle)]">
          {plan.meals.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-tertiary)]">
              Nenhuma refeição cadastrada para este plano alimentar.
            </div>
          ) : (
            plan.meals.map((meal) => (
              <section key={meal.id} className="pt-6 pb-6 first:pt-1 last:pb-2 space-y-3">
                {/* Meal Header (Inline with section, clean title and time pill) */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                      {meal.title}
                    </h2>
                    {meal.notes && (
                      <p className="text-xs text-[var(--text-tertiary)] italic mt-0.5">
                        {meal.notes}
                      </p>
                    )}
                  </div>
                  {meal.timeFormatted && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)] shrink-0 tabular-nums">
                      {meal.timeFormatted}
                    </span>
                  )}
                </div>

                {/* 6. Alimentos — Formato Editorial (Linhas limpas sem card/pill pesado) */}
                <div className="space-y-3 pt-1">
                  {meal.items.map((item) => (
                    <div
                      key={item.id}
                      className="border-b border-[var(--border-subtle)] pb-3 last:border-b-0 space-y-2"
                    >
                      {/* Clean Food Row: Name left, Quantity right */}
                      <div className="flex items-baseline justify-between gap-3 text-xs sm:text-sm">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {item.foodName}
                          </span>
                          {item.notes && (
                            <div className="text-xs text-[var(--text-tertiary)] italic mt-0.5">
                              {item.notes}
                            </div>
                          )}
                        </div>
                        {item.quantityFormatted && (
                          <span className="font-medium text-[var(--text-secondary)] shrink-0 text-right tabular-nums whitespace-nowrap">
                            {item.quantityFormatted}
                          </span>
                        )}
                      </div>

                      {/* 7. Substituições — Padrão editorial com borda lateral discreta */}
                      {item.substitutions.length > 0 && (
                        <div className="mt-2 pl-3 py-1.5 border-l-2 border-amber-400/80 bg-amber-500/5 rounded-r-md space-y-1.5">
                          <div className="text-[10px] font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                            Pode ser substituído por:
                          </div>
                          <div className="space-y-1">
                            {item.substitutions.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-baseline justify-between gap-3 text-xs text-[var(--text-secondary)]"
                              >
                                <div className="min-w-0 pr-2">
                                  <span>{sub.foodName}</span>
                                  {sub.notes && (
                                    <span className="text-[var(--text-tertiary)] italic ml-1">
                                      ({sub.notes})
                                    </span>
                                  )}
                                </div>
                                {sub.quantityFormatted && (
                                  <span className="font-medium text-[var(--text-secondary)] shrink-0 text-right tabular-nums whitespace-nowrap">
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
        <footer className="pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[var(--text-tertiary)]">
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
