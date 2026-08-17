"use client";

import { useState } from "react";
import Link from "next/link";
import {
  updateNutritionPlanDetailsAction,
  moveNutritionMealAction,
  removeNutritionMealAction,
  createNutritionMealOptionAction,
  moveNutritionMealOptionAction,
  removeNutritionMealOptionAction,
  moveNutritionMealSectionAction,
  removeNutritionMealSectionAction,
  moveChoiceGroupAction,
  moveItemAction,
  removeItemAction,
} from "@/app/consultoria/[slug]/nutricao/planos/actions";
import { NutritionMealModal } from "./nutrition-meal-modal";
import { NutritionSectionModal } from "./nutrition-section-modal";
import { NutritionFoodModal } from "./nutrition-food-modal";
import { NutritionItemQuantityModal } from "./nutrition-item-quantity-modal";
import { NutritionPlanActivateButton } from "./nutrition-plan-activate-button";
import { formatMacroRange } from "@/lib/consultancies/nutrition-totals";
import type {
  NutritionistPlanEditorDto,
  NutritionMealDto,
  NutritionMealSectionDto,
  NutritionMealItemDto,
} from "@/lib/consultancies/nutrition";

interface NutritionPlanEditorProps {
  slug: string;
  plan: NutritionistPlanEditorDto;
}

export function NutritionPlanEditor({ slug, plan }: NutritionPlanEditorProps) {
  const isDraft = plan.status === "DRAFT";

  // State for Plan Details Edit Modal
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsTitle, setDetailsTitle] = useState(plan.title);
  const [detailsSubtitle, setDetailsSubtitle] = useState(plan.subtitle || "");
  const [detailsGuidance, setDetailsGuidance] = useState(plan.generalGuidance || "");
  const [detailsStartsOn, setDetailsStartsOn] = useState(plan.startsOn || "");
  const [detailsEndsOn, setDetailsEndsOn] = useState(plan.endsOn || "");
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // State for Meal Modal (create / edit)
  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<NutritionMealDto | null>(null);

  // State for Section Modal (create / edit)
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [selectedOptionForSection, setSelectedOptionForSection] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<NutritionMealSectionDto | null>(null);

  // State for Food Search / Modal
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [foodModalSectionPublicId, setFoodModalSectionPublicId] = useState<string | null>(null);
  const [foodModalChoiceGroupPublicId, setFoodModalChoiceGroupPublicId] = useState<string | null>(null);

  // State for Quantity Edit Modal
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [selectedItemForQuantity, setSelectedItemForQuantity] = useState<NutritionMealItemDto | null>(null);

  // Pending states for quick actions
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: "MEAL" | "OPTION" | "SECTION" | "ITEM";
    publicId: string;
    title: string;
  } | null>(null);

  // Handlers for Plan Metadata Edit
  async function handleSaveDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDetailsError(null);
    setIsSavingDetails(true);

    const formData = new FormData();
    formData.set("title", detailsTitle);
    formData.set("subtitle", detailsSubtitle);
    formData.set("generalGuidance", detailsGuidance);
    formData.set("startsOn", detailsStartsOn);
    formData.set("endsOn", detailsEndsOn);

    try {
      const res = await updateNutritionPlanDetailsAction(slug, plan.publicId, formData);
      if (!res.success) {
        setDetailsError(res.error || "Erro ao salvar dados.");
        setIsSavingDetails(false);
        return;
      }
      setIsEditingDetails(false);
      setIsSavingDetails(false);
    } catch {
      setDetailsError("Ocorreu um erro ao salvar os dados.");
      setIsSavingDetails(false);
    }
  }

  // Handlers for Meal actions
  async function handleMoveMeal(mealPublicId: string, direction: "UP" | "DOWN") {
    setPendingActionId(`meal-move-${mealPublicId}`);
    try {
      await moveNutritionMealAction(slug, plan.publicId, mealPublicId, direction);
    } finally {
      setPendingActionId(null);
    }
  }

  // Handlers for Option actions
  async function handleAddOption(mealPublicId: string) {
    setPendingActionId(`option-add-${mealPublicId}`);
    try {
      await createNutritionMealOptionAction(slug, plan.publicId, mealPublicId);
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleMoveOption(optionPublicId: string, direction: "UP" | "DOWN") {
    setPendingActionId(`opt-move-${optionPublicId}`);
    try {
      await moveNutritionMealOptionAction(slug, plan.publicId, optionPublicId, direction);
    } finally {
      setPendingActionId(null);
    }
  }

  // Handlers for Section actions
  async function handleMoveSection(sectionPublicId: string, direction: "UP" | "DOWN") {
    setPendingActionId(`sec-move-${sectionPublicId}`);
    try {
      await moveNutritionMealSectionAction(slug, plan.publicId, sectionPublicId, direction);
    } finally {
      setPendingActionId(null);
    }
  }

  // Handlers for Choice Group actions
  async function handleMoveChoiceGroup(choiceGroupPublicId: string, direction: "UP" | "DOWN") {
    setPendingActionId(`cg-move-${choiceGroupPublicId}`);
    try {
      await moveChoiceGroupAction(slug, plan.publicId, choiceGroupPublicId, direction);
    } finally {
      setPendingActionId(null);
    }
  }

  // Handlers for Food Item actions
  async function handleMoveItem(itemPublicId: string, direction: "UP" | "DOWN") {
    setPendingActionId(`item-move-${itemPublicId}`);
    try {
      await moveItemAction(slug, plan.publicId, itemPublicId, direction);
    } finally {
      setPendingActionId(null);
    }
  }

  // Unified Delete Execution
  async function handleExecuteDelete() {
    if (!deleteConfirmTarget) return;
    const { type, publicId } = deleteConfirmTarget;
    setPendingActionId(`delete-${publicId}`);

    try {
      if (type === "MEAL") {
        await removeNutritionMealAction(slug, plan.publicId, publicId);
      } else if (type === "OPTION") {
        await removeNutritionMealOptionAction(slug, plan.publicId, publicId);
      } else if (type === "SECTION") {
        await removeNutritionMealSectionAction(slug, plan.publicId, publicId);
      } else if (type === "ITEM") {
        await removeItemAction(slug, plan.publicId, publicId);
      }
      setDeleteConfirmTarget(null);
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Read-only banner for ACTIVE / ARCHIVED */}
      {!isDraft && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 ${
            plan.status === "ACTIVE"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-slate-100 border-slate-200 text-slate-700"
          }`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs font-medium">
            {plan.status === "ACTIVE"
              ? "Este plano alimentar está ATIVO e em vigor para o aluno. A estrutura não pode ser alterada diretamente."
              : "Este plano alimentar está ARQUIVADO (somente leitura)."}
          </p>
        </div>
      )}

      {/* Plan Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{plan.title}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  plan.status === "DRAFT"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : plan.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {plan.status === "DRAFT" ? "Rascunho" : plan.status === "ACTIVE" ? "Ativo" : "Arquivado"}
              </span>
            </div>

            {plan.subtitle && <p className="text-sm text-slate-600">{plan.subtitle}</p>}

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Aluno: {plan.studentName}
              </span>
              <span className="text-slate-400">•</span>
              <span>{plan.studentEmail}</span>
              {plan.startsOn && (
                <>
                  <span className="text-slate-400">•</span>
                  <span>Início: {plan.startsOn}</span>
                </>
              )}
              {plan.endsOn && (
                <>
                  <span className="text-slate-400">•</span>
                  <span>Término: {plan.endsOn}</span>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {isDraft && (
              <>
                <NutritionPlanActivateButton
                  slug={slug}
                  planPublicId={plan.publicId}
                  planStatus={plan.status}
                />
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 shadow-sm transition-all"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  Editar dados gerais
                </button>
              </>
            )}
          </div>
        </div>

        {/* General Guidance note */}
        {plan.generalGuidance && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
            <span className="font-semibold text-slate-900 block">Orientações Gerais:</span>
            <p className="whitespace-pre-line text-slate-600">{plan.generalGuidance}</p>
          </div>
        )}
      </div>

      {/* Daily Nutritional Summary Card */}
      {plan.totals && (
        <div className="bg-white rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/40 via-white to-slate-50/50 p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                {plan.totals.isExact.all ? "Total Diário Estimado" : "Faixa Nutricional Diária"}
              </span>
            </div>
            {!plan.totals.isExact.all && (
              <span className="text-[11px] text-slate-500">
                Os limites são calculados separadamente para cada nutriente, considerando as alternativas do plano.
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0.5">
            <div className="bg-white/90 p-3 rounded-xl border border-slate-200/70 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">Calorias</span>
              <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {formatMacroRange(plan.totals.min.calories, plan.totals.max.calories, "kcal")}
              </span>
            </div>

            <div className="bg-white/90 p-3 rounded-xl border border-slate-200/70 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">Proteínas</span>
              <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {formatMacroRange(plan.totals.min.protein, plan.totals.max.protein, "g")}
              </span>
            </div>

            <div className="bg-white/90 p-3 rounded-xl border border-slate-200/70 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">Carboidratos</span>
              <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {formatMacroRange(plan.totals.min.carbohydrate, plan.totals.max.carbohydrate, "g")}
              </span>
            </div>

            <div className="bg-white/90 p-3 rounded-xl border border-slate-200/70 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block uppercase">Gorduras</span>
              <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {formatMacroRange(plan.totals.min.fat, plan.totals.max.fat, "g")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Meals Structure Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Estrutura de Refeições</h2>
            <p className="text-xs text-slate-500">
              Organize os horários, opções alimentares e divisões de cada refeição.
            </p>
          </div>

          {isDraft && (
            <button
              type="button"
              onClick={() => {
                setSelectedMeal(null);
                setMealModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar Refeição
            </button>
          )}
        </div>

        {/* Empty state when 0 meals */}
        {plan.meals.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Este rascunho ainda não possui refeições</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Adicione a primeira refeição da rotina (ex: Café da Manhã, Almoço, Jantar).
            </p>
            {isDraft && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMeal(null);
                  setMealModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200/60"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Adicionar primeira refeição
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {plan.meals.map((meal, mealIdx) => {
              const isFirstMeal = mealIdx === 0;
              const isLastMeal = mealIdx === plan.meals.length - 1;

              return (
                <div
                  key={meal.publicId}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
                >
                  {/* Meal Header */}
                  <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {meal.scheduledTime ? (
                        <span className="px-2.5 py-1 text-xs font-bold font-mono text-emerald-800 bg-emerald-100/70 rounded-lg border border-emerald-200/60 shrink-0">
                          {meal.scheduledTime.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-semibold text-slate-500 bg-slate-200/70 rounded-lg shrink-0">
                          Sem horário
                        </span>
                      )}

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                            {meal.title}
                          </h3>
                          {meal.totals && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white text-slate-700 border border-slate-200/80 shadow-2xs">
                              <span>{formatMacroRange(meal.totals.min.calories, meal.totals.max.calories, "kcal")}</span>
                              <span className="text-slate-300">•</span>
                              <span>P: {formatMacroRange(meal.totals.min.protein, meal.totals.max.protein, "g")}</span>
                              <span className="text-slate-300">•</span>
                              <span>C: {formatMacroRange(meal.totals.min.carbohydrate, meal.totals.max.carbohydrate, "g")}</span>
                              <span className="text-slate-300">•</span>
                              <span>G: {formatMacroRange(meal.totals.min.fat, meal.totals.max.fat, "g")}</span>
                            </span>
                          )}
                        </div>
                        {meal.notes && (
                          <p className="text-xs text-slate-500 line-clamp-1">{meal.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Meal Controls */}
                    {isDraft && (
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                        {/* Move UP */}
                        <button
                          type="button"
                          disabled={isFirstMeal || pendingActionId === `meal-move-${meal.publicId}`}
                          onClick={() => handleMoveMeal(meal.publicId, "UP")}
                          aria-label={`Mover refeição ${meal.title} para cima`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>

                        {/* Move DOWN */}
                        <button
                          type="button"
                          disabled={isLastMeal || pendingActionId === `meal-move-${meal.publicId}`}
                          onClick={() => handleMoveMeal(meal.publicId, "DOWN")}
                          aria-label={`Mover refeição ${meal.title} para baixo`}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        <div className="h-4 w-px bg-slate-200 mx-1" />

                        {/* Edit Meal */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMeal(meal);
                            setMealModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-all"
                        >
                          Editar
                        </button>

                        {/* Remove Meal */}
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteConfirmTarget({
                              type: "MEAL",
                              publicId: meal.publicId,
                              title: meal.title,
                            })
                          }
                          className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Meal Body / Options */}
                  <div className="p-5 space-y-5">
                    {meal.options.length === 0 ? (
                      <div className="text-center py-6 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-xs text-slate-500 mb-3">
                          Esta refeição ainda não possui opções de cardápio.
                        </p>
                        {isDraft && (
                          <button
                            type="button"
                            disabled={pendingActionId === `option-add-${meal.publicId}`}
                            onClick={() => handleAddOption(meal.publicId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/60 transition-all"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Adicionar Opção 1
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {meal.options.map((option, optIdx) => {
                          const isFirstOpt = optIdx === 0;
                          const isLastOpt = optIdx === meal.options.length - 1;
                          const optionDisplayLabel = option.title || `Opção ${optIdx + 1}`;

                          return (
                            <div
                              key={option.publicId}
                              className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3"
                            >
                              {/* Option Header */}
                              <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-emerald-100/80 text-emerald-900 border border-emerald-200/60">
                                    {optionDisplayLabel}
                                  </span>
                                  {option.description && (
                                    <span className="text-xs text-slate-500 italic">
                                      — {option.description}
                                    </span>
                                  )}
                                </div>

                                {isDraft && (
                                  <div className="flex items-center gap-1">
                                    {/* Move Option UP */}
                                    <button
                                      type="button"
                                      disabled={isFirstOpt || pendingActionId === `opt-move-${option.publicId}`}
                                      onClick={() => handleMoveOption(option.publicId, "UP")}
                                      aria-label={`Mover ${optionDisplayLabel} para cima`}
                                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 disabled:opacity-20 disabled:cursor-not-allowed rounded transition-all"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                    </button>

                                    {/* Move Option DOWN */}
                                    <button
                                      type="button"
                                      disabled={isLastOpt || pendingActionId === `opt-move-${option.publicId}`}
                                      onClick={() => handleMoveOption(option.publicId, "DOWN")}
                                      aria-label={`Mover ${optionDisplayLabel} para baixo`}
                                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 disabled:opacity-20 disabled:cursor-not-allowed rounded transition-all"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>

                                    <div className="h-3 w-px bg-slate-200 mx-1" />

                                    {/* Remove Option */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeleteConfirmTarget({
                                          type: "OPTION",
                                          publicId: option.publicId,
                                          title: `${optionDisplayLabel} da refeição ${meal.title}`,
                                        })
                                      }
                                      className="px-2 py-0.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                                    >
                                      Remover opção
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Option Sections */}
                              <div className="space-y-3">
                                {option.sections.length === 0 ? (
                                  <div className="text-center py-4 px-3 bg-white rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
                                    Nenhuma seção nesta opção (ex: Proteínas, Carboidratos, Frutas).
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    {option.sections.map((section, secIdx) => {
                                      const isFirstSec = secIdx === 0;
                                      const isLastSec = secIdx === option.sections.length - 1;

                                      return (
                                        <div
                                          key={section.publicId}
                                          className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-3 shadow-2xs"
                                        >
                                          {/* Section Header */}
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                              <span className="text-xs font-bold text-slate-900 tracking-tight uppercase">
                                                {section.title}
                                              </span>
                                              <span className="text-[11px] text-slate-400 font-normal">
                                                ({section.choiceGroups.length} {section.choiceGroups.length === 1 ? "componente" : "componentes"})
                                              </span>
                                            </div>

                                            {isDraft && (
                                              <div className="flex items-center gap-1 self-end sm:self-center">
                                                {/* Add Food to this section */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setFoodModalSectionPublicId(section.publicId);
                                                    setFoodModalChoiceGroupPublicId(null);
                                                    setFoodModalOpen(true);
                                                  }}
                                                  className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-all flex items-center gap-1"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                  </svg>
                                                  Adicionar Alimento
                                                </button>

                                                <div className="h-3 w-px bg-slate-200 mx-0.5" />

                                                {/* Move Section UP */}
                                                <button
                                                  type="button"
                                                  disabled={isFirstSec || pendingActionId === `sec-move-${section.publicId}`}
                                                  onClick={() => handleMoveSection(section.publicId, "UP")}
                                                  aria-label={`Mover seção ${section.title} para cima`}
                                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed rounded transition-all"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                  </svg>
                                                </button>

                                                {/* Move Section DOWN */}
                                                <button
                                                  type="button"
                                                  disabled={isLastSec || pendingActionId === `sec-move-${section.publicId}`}
                                                  onClick={() => handleMoveSection(section.publicId, "DOWN")}
                                                  aria-label={`Mover seção ${section.title} para baixo`}
                                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed rounded transition-all"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                  </svg>
                                                </button>

                                                {/* Edit Section */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedSection(section);
                                                    setSelectedOptionForSection(option.publicId);
                                                    setSectionModalOpen(true);
                                                  }}
                                                  className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-all"
                                                >
                                                  Editar
                                                </button>

                                                {/* Remove Section */}
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setDeleteConfirmTarget({
                                                      type: "SECTION",
                                                      publicId: section.publicId,
                                                      title: `seção ${section.title}`,
                                                    })
                                                  }
                                                  className="px-2 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                                                >
                                                  Remover
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          {/* Section Food Groups / Items */}
                                          {section.choiceGroups.length === 0 ? (
                                            <div className="py-4 px-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                                              <p className="text-xs text-slate-500">Nenhum alimento adicionado a esta seção.</p>
                                              {isDraft && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setFoodModalSectionPublicId(section.publicId);
                                                    setFoodModalChoiceGroupPublicId(null);
                                                    setFoodModalOpen(true);
                                                  }}
                                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs transition-all"
                                                >
                                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                  </svg>
                                                  Adicionar primeiro alimento
                                                </button>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="space-y-3">
                                              {section.choiceGroups.map((cg, cgIdx) => {
                                                const isFirstCg = cgIdx === 0;
                                                const isLastCg = cgIdx === section.choiceGroups.length - 1;

                                                return (
                                                  <div
                                                    key={cg.publicId}
                                                    className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-3 space-y-2.5"
                                                  >
                                                    {/* Items in this choice group */}
                                                    <div className="space-y-2">
                                                      {cg.items.map((item, itemIdx) => {
                                                        const isFirstItem = itemIdx === 0;
                                                        const isLastItem = itemIdx === cg.items.length - 1;

                                                        return (
                                                          <div key={item.publicId} className="space-y-2">
                                                            {/* OU separator between alternatives */}
                                                            {itemIdx > 0 && (
                                                              <div className="flex items-center gap-2 py-0.5">
                                                                <div className="h-px flex-1 bg-amber-200/80" />
                                                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-wider">
                                                                  ou
                                                                </span>
                                                                <div className="h-px flex-1 bg-amber-200/80" />
                                                              </div>
                                                            )}

                                                            {/* Food Item Card */}
                                                            <div className="bg-white rounded-lg border border-slate-200 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                                                              <div className="space-y-1 min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                  <span className="font-semibold text-xs text-slate-900">
                                                                    {item.foodNameSnapshot}
                                                                  </span>
                                                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70">
                                                                    {item.prescribedQuantity} {item.prescribedUnitLabel}
                                                                  </span>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-x-2.5 text-[11px] text-slate-500">
                                                                  <span className="font-semibold text-slate-700">
                                                                    {item.calculatedCalories !== null ? item.calculatedCalories.toFixed(0) : 0} kcal
                                                                  </span>
                                                                  <span>•</span>
                                                                  <span>
                                                                    P: {item.calculatedProtein !== null ? item.calculatedProtein.toFixed(1) : 0}g
                                                                  </span>
                                                                  <span>•</span>
                                                                  <span>
                                                                    C: {item.calculatedCarbohydrate !== null ? item.calculatedCarbohydrate.toFixed(1) : 0}g
                                                                  </span>
                                                                  <span>•</span>
                                                                  <span>
                                                                    G: {item.calculatedFat !== null ? item.calculatedFat.toFixed(1) : 0}g
                                                                  </span>
                                                                </div>

                                                                {item.notes && (
                                                                  <p className="text-[11px] text-slate-500 italic">
                                                                    Obs: {item.notes}
                                                                  </p>
                                                                )}
                                                              </div>

                                                              {isDraft && (
                                                                <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
                                                                  {/* Move Item UP (within group) */}
                                                                  {cg.items.length > 1 && (
                                                                    <>
                                                                      <button
                                                                        type="button"
                                                                        disabled={isFirstItem || pendingActionId === `item-move-${item.publicId}`}
                                                                        onClick={() => handleMoveItem(item.publicId, "UP")}
                                                                        aria-label={`Mover ${item.foodNameSnapshot} para cima`}
                                                                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed rounded transition-all"
                                                                      >
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                                        </svg>
                                                                      </button>
                                                                      <button
                                                                        type="button"
                                                                        disabled={isLastItem || pendingActionId === `item-move-${item.publicId}`}
                                                                        onClick={() => handleMoveItem(item.publicId, "DOWN")}
                                                                        aria-label={`Mover ${item.foodNameSnapshot} para baixo`}
                                                                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed rounded transition-all"
                                                                      >
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                        </svg>
                                                                      </button>
                                                                      <div className="h-3 w-px bg-slate-200 mx-0.5" />
                                                                    </>
                                                                  )}

                                                                  {/* Edit Quantity */}
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                      setSelectedItemForQuantity(item);
                                                                      setQuantityModalOpen(true);
                                                                    }}
                                                                    className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-all"
                                                                  >
                                                                    Qtd
                                                                  </button>

                                                                  {/* Remove Item */}
                                                                  <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                      setDeleteConfirmTarget({
                                                                        type: "ITEM",
                                                                        publicId: item.publicId,
                                                                        title: `${item.foodNameSnapshot} (${item.prescribedQuantity} ${item.prescribedUnitLabel})`,
                                                                      })
                                                                    }
                                                                    className="px-2 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                                                                  >
                                                                    Remover
                                                                  </button>
                                                                </div>
                                                              )}
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>

                                                    {/* Choice Group Footer Controls (Add Alternative & Move Group) */}
                                                    {isDraft && (
                                                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                                                        <button
                                                          type="button"
                                                          onClick={() => {
                                                            setFoodModalChoiceGroupPublicId(cg.publicId);
                                                            setFoodModalSectionPublicId(null);
                                                            setFoodModalOpen(true);
                                                          }}
                                                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-all"
                                                        >
                                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                          </svg>
                                                          Adicionar alternativa (OU)
                                                        </button>

                                                        {section.choiceGroups.length > 1 && (
                                                          <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-slate-400 font-medium">Mover grupo:</span>
                                                            <button
                                                              type="button"
                                                              disabled={isFirstCg || pendingActionId === `cg-move-${cg.publicId}`}
                                                              onClick={() => handleMoveChoiceGroup(cg.publicId, "UP")}
                                                              aria-label="Mover grupo para cima"
                                                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed rounded transition-all"
                                                            >
                                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                              </svg>
                                                            </button>
                                                            <button
                                                              type="button"
                                                              disabled={isLastCg || pendingActionId === `cg-move-${cg.publicId}`}
                                                              onClick={() => handleMoveChoiceGroup(cg.publicId, "DOWN")}
                                                              aria-label="Mover grupo para baixo"
                                                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed rounded transition-all"
                                                            >
                                                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                              </svg>
                                                            </button>
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Option Totals Summary Footer */}
                              {option.totals && (
                                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <span className="font-semibold text-slate-700">
                                    {option.totals.isExact.all ? "Total da opção:" : "Faixa da opção:"}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                                    <span className="font-bold text-slate-900">
                                      {formatMacroRange(option.totals.min.calories, option.totals.max.calories, "kcal")}
                                    </span>
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

                        {/* Add Another Option Button */}
                        {isDraft && (
                          <button
                            type="button"
                            disabled={pendingActionId === `option-add-${meal.publicId}`}
                            onClick={() => handleAddOption(meal.publicId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-all"
                          >
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Adicionar Opção {meal.options.length + 1}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Back button */}
      <div className="pt-4">
        <Link
          href={`/consultoria/${slug}/nutricao/planos`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para a lista de planos
        </Link>
      </div>

      {/* Modal: Edit Plan Details */}
      {isEditingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Editar Dados Gerais do Plano</h3>
              <button
                type="button"
                onClick={() => setIsEditingDetails(false)}
                aria-label="Fechar"
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveDetails} className="p-6 space-y-4">
              {detailsError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  {detailsError}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="details-title" className="block text-xs font-semibold text-slate-700">
                  Título do plano <span className="text-red-500">*</span>
                </label>
                <input
                  id="details-title"
                  type="text"
                  required
                  maxLength={255}
                  value={detailsTitle}
                  onChange={(e) => setDetailsTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="details-subtitle" className="block text-xs font-semibold text-slate-700">
                  Subtítulo / Meta <span className="text-xs text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  id="details-subtitle"
                  type="text"
                  maxLength={255}
                  value={detailsSubtitle}
                  onChange={(e) => setDetailsSubtitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="details-guidance" className="block text-xs font-semibold text-slate-700">
                  Orientações gerais <span className="text-xs text-slate-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  id="details-guidance"
                  rows={3}
                  value={detailsGuidance}
                  onChange={(e) => setDetailsGuidance(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="details-starts" className="block text-xs font-semibold text-slate-700">
                    Data de início
                  </label>
                  <input
                    id="details-starts"
                    type="date"
                    value={detailsStartsOn}
                    onChange={(e) => setDetailsStartsOn(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="details-ends" className="block text-xs font-semibold text-slate-700">
                    Data de término
                  </label>
                  <input
                    id="details-ends"
                    type="date"
                    value={detailsEndsOn}
                    onChange={(e) => setDetailsEndsOn(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingDetails || !detailsTitle.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  {isSavingDetails ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Meal (Create/Edit) */}
      <NutritionMealModal
        slug={slug}
        planPublicId={plan.publicId}
        meal={selectedMeal}
        isOpen={mealModalOpen}
        onClose={() => {
          setMealModalOpen(false);
          setSelectedMeal(null);
        }}
      />

      {/* Modal: Section (Create/Edit) */}
      <NutritionSectionModal
        slug={slug}
        planPublicId={plan.publicId}
        optionPublicId={selectedOptionForSection || undefined}
        section={selectedSection}
        isOpen={sectionModalOpen}
        onClose={() => {
          setSectionModalOpen(false);
          setSelectedSection(null);
          setSelectedOptionForSection(null);
        }}
      />

      {/* Modal: Food Search / Selection */}
      <NutritionFoodModal
        slug={slug}
        planPublicId={plan.publicId}
        sectionPublicId={foodModalSectionPublicId || undefined}
        choiceGroupPublicId={foodModalChoiceGroupPublicId || undefined}
        isOpen={foodModalOpen}
        onClose={() => {
          setFoodModalOpen(false);
          setFoodModalSectionPublicId(null);
          setFoodModalChoiceGroupPublicId(null);
        }}
      />

      {/* Modal: Item Quantity Edit */}
      <NutritionItemQuantityModal
        slug={slug}
        planPublicId={plan.publicId}
        item={selectedItemForQuantity}
        isOpen={quantityModalOpen}
        onClose={() => {
          setQuantityModalOpen(false);
          setSelectedItemForQuantity(null);
        }}
      />

      {/* Modal: Delete Confirmation */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Remover {deleteConfirmTarget.type === "MEAL" ? "refeição" : deleteConfirmTarget.type === "OPTION" ? "opção" : deleteConfirmTarget.type === "SECTION" ? "seção" : "alimento"}?
              </h3>
              <p className="text-xs text-slate-500">
                Tem certeza que deseja remover {deleteConfirmTarget.title} deste rascunho?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!!pendingActionId}
                onClick={handleExecuteDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 rounded-xl shadow-xs transition-all"
              >
                {pendingActionId ? "Removendo..." : "Confirmar remoção"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
