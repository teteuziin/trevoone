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
    if (typeof window === "undefined" || !scopedUserPublicId || scopedUserPublicId === "student") return;
    import("@/lib/offline/offline-nutrition")
      .then(({ saveNutritionSnapshot }) => {
        saveNutritionSnapshot({
          userPublicId: scopedUserPublicId,
          consultancyPublicId: scopedConsultancyPublicId || consultancySlug,
          role: scopedRole,
          planPublicId: assignedPlan.version.publicId || "active_plan",
          planTitle: assignedPlan.version.title,
          planSubtitle: assignedPlan.version.subtitle,
          data: assignedPlan,
        });
      })
      .catch(() => {});
  }, [assignedPlan, consultancySlug, scopedUserPublicId, scopedConsultancyPublicId, scopedRole]);

  const pdfDownloadUrl = `/api/consultancies/${consultancySlug}/nutricao/pdf?download=true`;

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

      {/* 1. Main Continuous Cardápio Sheet (Single continuous editorial surface) */}
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-2xl sm:rounded-3xl shadow-sm p-4 sm:p-9 space-y-6 text-[var(--text-primary)] transition-colors">
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
