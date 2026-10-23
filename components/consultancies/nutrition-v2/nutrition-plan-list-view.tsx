"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { PlanListItemDto } from "@/lib/nutrition-v2/plan-repository";
import { NutritionPlanCardActions } from "./nutrition-plan-card-actions";
import { NutritionAssignModal } from "./nutrition-assign-modal";
import { NutritionDraftWarningModal } from "./nutrition-draft-warning-modal";

interface NutritionPlanListViewProps {
  consultancySlug: string;
  items: PlanListItemDto[];
  isTemplatesTab?: boolean;
}

function ArrowRightIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function PaperAirplaneIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 12L3 21l18-9L3 3l3 9zm0 0h9" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function NutritionPlanListView({
  consultancySlug,
  items,
  isTemplatesTab = false,
}: NutritionPlanListViewProps) {
  const router = useRouter();

  // Assignment & Draft warning state
  const [selectedPlanForAssign, setSelectedPlanForAssign] = useState<PlanListItemDto | null>(null);
  const [draftWarningPlan, setDraftWarningPlan] = useState<PlanListItemDto | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Mobile Touch Scroll Guard
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isScrollingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    if (deltaX > 10 || deltaY > 10) {
      isScrollingRef.current = true;
    }
  };

  const handleOpenSendPlan = (e: React.MouseEvent, plan: PlanListItemDto) => {
    e.stopPropagation();
    if (!plan.publishedVersionPublicId) {
      setDraftWarningPlan(plan);
    } else {
      setSelectedPlanForAssign(plan);
    }
  };

  const handleCardClick = (publicId: string) => {
    if (isScrollingRef.current) return;
    router.push(`/consultoria/${consultancySlug}/planos-v2/${publicId}`);
  };

  return (
    <>
      {/* Success Notification Banner */}
      {successFeedback && (
        <div
          role="status"
          className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessFeedback(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 hover:underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* =========================================================================
          DESKTOP TABLE (hidden sm:block)
          6 columns: Plano alimentar | Paciente / Vínculo | Situação & Versão | Refeições | Atualização | Ações
          ========================================================================= */}
      <div className="hidden sm:block rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#151619] shadow-xs overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-bold text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 uppercase tracking-wider">
          <div className="col-span-3">Plano alimentar</div>
          <div className="col-span-2">Paciente / Vínculo</div>
          <div className="col-span-2">Situação & Versão</div>
          <div className="col-span-1">Refeições</div>
          <div className="col-span-1">Atualização</div>
          <div className="col-span-3 text-right">Ações</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {items.map((plan) => {
            const title = plan.currentVersion?.title || "Plano sem título";
            const objective = plan.currentVersion?.objective || plan.currentVersion?.subtitle;
            const hasDraft = Boolean(plan.draftVersionNumber || plan.currentVersion?.status === "DRAFT");
            const hasPublished = Boolean(plan.publishedVersionNumber);
            const isArchived = plan.status === "ARCHIVED";
            const isTemplate = Boolean(plan.isTemplate || isTemplatesTab);

            return (
              <div
                key={plan.publicId}
                className="grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition-colors group"
              >
                {/* Col 1: Plano alimentar (título + objetivo secundário) */}
                <div className="col-span-3 min-w-0 pr-2">
                  <Link
                    href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                    className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors block truncate"
                  >
                    {title}
                  </Link>
                  {objective && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {objective}
                    </p>
                  )}
                </div>

                {/* Col 2: Paciente / Vínculo */}
                <div className="col-span-2 min-w-0 pr-2 text-xs">
                  {isTemplate ? (
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                      Modelo padrão
                    </span>
                  ) : plan.assignedStudentName ? (
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate block">
                      {plan.assignedStudentName}
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500 font-normal">
                      Sem paciente vinculado
                    </span>
                  )}
                </div>

                {/* Col 3: Situação & Versão */}
                <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                  {isArchived ? (
                    <Badge variant="neutral" size="sm">
                      Arquivado
                    </Badge>
                  ) : (
                    <>
                      {hasPublished && (
                        <Badge variant="success" size="sm">
                          Publicado V{plan.publishedVersionNumber}
                        </Badge>
                      )}
                      {hasDraft && (
                        <Badge variant="warning" size="sm">
                          Rascunho V{plan.draftVersionNumber || plan.currentVersion?.versionNumber || 1}
                        </Badge>
                      )}
                    </>
                  )}
                  {isTemplate && (
                    <Badge variant="brand" size="sm">
                      Modelo
                    </Badge>
                  )}
                </div>

                {/* Col 4: Refeições */}
                <div className="col-span-1 text-xs text-zinc-600 dark:text-zinc-300 font-medium truncate">
                  <span>
                    {plan.mealsCount ? `${plan.mealsCount} ${plan.mealsCount === 1 ? "refeição" : "refeições"}` : "Sem refeições"}
                  </span>
                </div>

                {/* Col 5: Atualização */}
                <div className="col-span-1 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  {new Date(plan.updatedAt).toLocaleDateString("pt-BR")}
                </div>

                {/* Col 6: Ações (Enviar plano, Abrir plano, Excluir, Menu ⋮) */}
                <div className="col-span-3 flex items-center justify-end gap-1.5 whitespace-nowrap">
                  {!isTemplate && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenSendPlan(e, plan)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-300/60 dark:border-emerald-800/60 transition-colors cursor-pointer min-h-[34px]"
                    >
                      <PaperAirplaneIcon className="w-3 h-3" />
                      <span>Enviar</span>
                    </button>
                  )}

                  <Link
                    href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white transition-colors min-h-[34px]"
                  >
                    <span>Abrir plano</span>
                    <ArrowRightIcon className="w-3 h-3" />
                  </Link>

                  <NutritionPlanCardActions
                    consultancySlug={consultancySlug}
                    planPublicId={plan.publicId}
                    planTitle={title}
                    isDraft={hasDraft && !hasPublished}
                    isTemplate={isTemplate}
                    assignedStudentName={plan.assignedStudentName}
                    activeAssignmentsCount={plan.activeAssignmentsCount}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          MOBILE LIST (sm:hidden)
          Cards compactos com superfície única por item (sem cards aninhados)
          ========================================================================= */}
      <div className="sm:hidden space-y-3">
        {items.map((plan) => {
          const title = plan.currentVersion?.title || "Plano sem título";
          const objective = plan.currentVersion?.objective || plan.currentVersion?.subtitle;
          const hasDraft = Boolean(plan.draftVersionNumber || plan.currentVersion?.status === "DRAFT");
          const hasPublished = Boolean(plan.publishedVersionNumber);
          const isArchived = plan.status === "ARCHIVED";
          const isTemplate = Boolean(plan.isTemplate || isTemplatesTab);

          return (
            <div
              key={`mobile-${plan.publicId}`}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onClick={() => handleCardClick(plan.publicId)}
              className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#151619] shadow-xs space-y-2.5 transition-colors active:border-emerald-500/50 cursor-pointer"
            >
              {/* Top Line: Title + Badges */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug truncate flex-1">
                  {title}
                </h3>
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  {isArchived ? (
                    <Badge variant="neutral" size="sm">
                      Arquivado
                    </Badge>
                  ) : (
                    <>
                      {hasPublished && (
                        <Badge variant="success" size="sm">
                          Publicado V{plan.publishedVersionNumber}
                        </Badge>
                      )}
                      {hasDraft && (
                        <Badge variant="warning" size="sm">
                          Rascunho V{plan.draftVersionNumber || plan.currentVersion?.versionNumber || 1}
                        </Badge>
                      )}
                    </>
                  )}
                  {isTemplate && (
                    <Badge variant="brand" size="sm">
                      Modelo
                    </Badge>
                  )}
                </div>
              </div>

              {/* Objective if present */}
              {objective && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {objective}
                </p>
              )}

              {/* Meta details: Paciente • Refeições • Atualização */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 pt-0.5">
                {isTemplate ? (
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Modelo padrão
                  </span>
                ) : plan.assignedStudentName ? (
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {plan.assignedStudentName}
                  </span>
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-500">
                    Sem paciente vinculado
                  </span>
                )}
                <span>•</span>
                <span>
                  {plan.mealsCount ? `${plan.mealsCount} ${plan.mealsCount === 1 ? "refeição" : "refeições"}` : "Sem refeições"}
                </span>
                <span>•</span>
                <span>{new Date(plan.updatedAt).toLocaleDateString("pt-BR")}</span>
              </div>

              {/* Action Buttons: two rows on smartphone so Excluir stays
                  visible/accessible without opening the ⋮ menu.
                  Stop propagation so card touch isn't triggered simultaneously */}
              <div
                className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  {!isTemplate ? (
                    <button
                      type="button"
                      onClick={(e) => handleOpenSendPlan(e, plan)}
                      className="flex-1 min-h-[44px] px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      <PaperAirplaneIcon className="w-3.5 h-3.5" />
                      <span>Enviar plano</span>
                    </button>
                  ) : null}

                  <Link
                    href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl font-semibold text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Abrir plano</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <NutritionPlanCardActions
                    consultancySlug={consultancySlug}
                    planPublicId={plan.publicId}
                    planTitle={title}
                    isDraft={hasDraft && !hasPublished}
                    isTemplate={isTemplate}
                    assignedStudentName={plan.assignedStudentName}
                    activeAssignmentsCount={plan.activeAssignmentsCount}
                    variant="mobile"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          MODAIS DE ATRIBUIÇÃO E AVISO DE RASCUNHO
          ========================================================================= */}
      {selectedPlanForAssign && selectedPlanForAssign.publishedVersionPublicId && (
        <NutritionAssignModal
          slug={consultancySlug}
          planPublicId={selectedPlanForAssign.publicId}
          planTitle={selectedPlanForAssign.currentVersion?.title || "Plano alimentar"}
          versionPublicId={selectedPlanForAssign.publishedVersionPublicId}
          versionNumber={selectedPlanForAssign.publishedVersionNumber || 1}
          isOpen={Boolean(selectedPlanForAssign)}
          onClose={() => setSelectedPlanForAssign(null)}
          onSuccess={() => {
            const assignedTitle = selectedPlanForAssign.currentVersion?.title || "Plano alimentar";
            setSelectedPlanForAssign(null);
            setSuccessFeedback(`Plano "${assignedTitle}" enviado com sucesso ao paciente!`);
            router.refresh();
          }}
        />
      )}

      {draftWarningPlan && (
        <NutritionDraftWarningModal
          isOpen={Boolean(draftWarningPlan)}
          onClose={() => setDraftWarningPlan(null)}
          planTitle={draftWarningPlan.currentVersion?.title || "Plano alimentar"}
          editorHref={`/consultoria/${consultancySlug}/planos-v2/${draftWarningPlan.publicId}`}
        />
      )}
    </>
  );
}
