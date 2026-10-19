'use client';

import React, { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const emptySubscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

interface MatchedFoodCandidate {
  foodPublicId: string;
  name: string;
  sourceType: string;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
  referenceAmount: number;
  referenceUnitCode: string;
}

interface ResolvedNutritionFoodItem {
  id: string;
  originalText: string;
  foodNameCandidate: string;
  matchStatus: 'MATCHED' | 'AMBIGUOUS' | 'NOT_FOUND';
  foodPublicId: string | null;
  foodNameSnapshot: string;
  quantity: number | null;
  unitCandidate: string | null;
  notes: string | null;
  candidates: MatchedFoodCandidate[];
  authoritativeNutrients: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  } | null;
  sourceDocumentClaim: {
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
}

interface ResolvedNutritionMeal {
  name: string;
  time: string | null;
  notes: string | null;
  foods: ResolvedNutritionFoodItem[];
}

interface ResolvedNutritionProposal {
  jobPublicId: string;
  title: string;
  patientNameCandidate: string | null;
  targetPatientMembershipId: number | null;
  targetPatientName: string | null;
  objective: string | null;
  notes: string | null;
  meals: ResolvedNutritionMeal[];
  stats: {
    totalFoods: number;
    matchedCount: number;
    ambiguousCount: number;
    notFoundCount: number;
  };
  totalNutrientsAuthoritative: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  };
  knownSubtotalsAuthoritative?: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  };
  status: 'READY' | 'NEEDS_REVIEW';
}

interface NutritionAiImportModalProps {
  consultancySlug: string;
  defaultPatientMembershipId?: number;
  onSuccess?: (planPublicId: string) => void;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
  hideTrigger?: boolean;
}

export function NutritionAiImportModal({
  consultancySlug,
  defaultPatientMembershipId,
  onSuccess,
  isOpenControlled,
  onCloseControlled,
  hideTrigger = false,
}: NutritionAiImportModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const isControlled = isOpenControlled !== undefined;
  const showModal = isControlled ? Boolean(isOpenControlled) : isOpen;
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');

  // Quota status
  const [quota, setQuota] = useState<{
    dailyLimit: number;
    usedToday: number;
    remainingToday: number;
    canUseAi: boolean;
  } | null>(null);

  // Form inputs
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [objective, setObjective] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    defaultPatientMembershipId || null
  );
  const [students, setStudents] = useState<Array<{ membershipId: number; fullName: string; email: string }>>([]);

  // Loading & error
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Proposal preview
  const [proposal, setProposal] = useState<ResolvedNutritionProposal | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  // Manual search modal / replacement
  const [searchTarget, setSearchTarget] = useState<{
    mealIdx: number;
    foodId: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MatchedFoodCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const mounted = useIsMounted();

  useEffect(() => {
    if (!showModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showModal]);

  React.useEffect(() => {
    if (isControlled && isOpenControlled) {
      handleOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, isOpenControlled]);

  function handleOpen() {
    setIsOpen(true);
    setProposal(null);
    setErrorMessage(null);
    setConfirmSuccess(false);
    setFile(null);
    setPastedText('');

    if (!defaultPatientMembershipId) {
      fetch(`/api/consultancies/${consultancySlug}/students`)
        .then((res) => res.json())
        .then((data) => {
          if (data.students && Array.isArray(data.students)) {
            setStudents(data.students);
          }
        })
        .catch(() => { });
    }

    fetch(`/api/consultancies/${consultancySlug}/ai/usage?role=NUTRITIONIST`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const q = data.quota || data;
          const limit = Number(q.memberLimit ?? data.effectiveDailyLimit ?? 5);
          const used = Number(q.memberUsedToday ?? data.memberUsedToday ?? q.consultancyUsedToday ?? 0);
          const remaining = Number(q.effectiveRemaining ?? data.effectiveDailyRemaining ?? Math.max(0, limit - used));
          const canUse = q.canImport !== undefined ? Boolean(q.canImport) : remaining > 0;
          setQuota({
            dailyLimit: limit,
            usedToday: used,
            remainingToday: remaining,
            canUseAi: canUse,
          });
        }
      })
      .catch(() => { });
  }

  function handleClose() {
    if (isLoading || isConfirming) return;
    if (isControlled && onCloseControlled) {
      onCloseControlled();
    }
    setIsOpen(false);
    setProposal(null);
  }

  async function handleSubmitImport(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (activeTab === 'file' && !file) {
      setErrorMessage('Por favor, selecione um arquivo (.pdf, .txt, .md, .docx).');
      return;
    }
    if (activeTab === 'text' && !pastedText.trim()) {
      setErrorMessage('Por favor, cole o texto do plano alimentar.');
      return;
    }

    setIsLoading(true);
    setLoadingStep('Enviando documento e analisando com IA...');

    try {
      const formData = new FormData();
      if (activeTab === 'file' && file) {
        formData.append('file', file);
      } else {
        formData.append('text', pastedText);
      }

      if (objective.trim()) {
        formData.append('objective', objective.trim());
      }
      if (selectedPatientId) {
        formData.append('targetPatientMembershipId', String(selectedPatientId));
      }

      const res = await fetch(
        `/api/consultancies/${consultancySlug}/ai/nutrition-import`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao processar importação com IA.');
      }

      setProposal(data.proposal);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Importação não concluída. Nenhum plano foi alterado.'
      );
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  }

  // Update candidate selection in preview
  function handleSelectCandidate(
    mealIdx: number,
    foodId: string,
    candidate: MatchedFoodCandidate
  ) {
    if (!proposal) return;
    const nextMeals = proposal.meals.map((meal, mIdx) => {
      if (mIdx !== mealIdx) return meal;
      return {
        ...meal,
        foods: meal.foods.map((food) => {
          if (food.id !== foodId) return food;
          return {
            ...food,
            matchStatus: 'MATCHED' as const,
            foodPublicId: candidate.foodPublicId,
            foodNameSnapshot: candidate.name,
            authoritativeNutrients: {
              caloriesKcal: candidate.caloriesKcal,
              proteinG: candidate.proteinG,
              carbsG: candidate.carbsG,
              fatG: candidate.fatG,
              fiberG: candidate.fiberG,
            },
          };
        }),
      };
    });

    recalculateStats(nextMeals);
  }

  function handleRemoveFood(mealIdx: number, foodId: string) {
    if (!proposal) return;
    const nextMeals = proposal.meals.map((meal, mIdx) => {
      if (mIdx !== mealIdx) return meal;
      return {
        ...meal,
        foods: meal.foods.filter((f) => f.id !== foodId),
      };
    });

    recalculateStats(nextMeals);
  }

  function recalculateStats(nextMeals: ResolvedNutritionMeal[]) {
    if (!proposal) return;
    let matchedCount = 0;
    let ambiguousCount = 0;
    let notFoundCount = 0;
    let totalFoods = 0;
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;
    let hasUnknownCalories = false;
    let hasUnknownProtein = false;
    let hasUnknownCarbs = false;
    let hasUnknownFat = false;
    let hasUnknownFiber = false;

    for (const m of nextMeals) {
      for (const f of m.foods) {
        totalFoods++;
        if (f.matchStatus === 'MATCHED') {
          matchedCount++;
          if (f.authoritativeNutrients?.caloriesKcal !== null && f.authoritativeNutrients?.caloriesKcal !== undefined) {
            totalCalories += f.authoritativeNutrients.caloriesKcal;
          } else {
            hasUnknownCalories = true;
          }
          if (f.authoritativeNutrients?.proteinG !== null && f.authoritativeNutrients?.proteinG !== undefined) {
            totalProtein += f.authoritativeNutrients.proteinG;
          } else {
            hasUnknownProtein = true;
          }
          if (f.authoritativeNutrients?.carbsG !== null && f.authoritativeNutrients?.carbsG !== undefined) {
            totalCarbs += f.authoritativeNutrients.carbsG;
          } else {
            hasUnknownCarbs = true;
          }
          if (f.authoritativeNutrients?.fatG !== null && f.authoritativeNutrients?.fatG !== undefined) {
            totalFat += f.authoritativeNutrients.fatG;
          } else {
            hasUnknownFat = true;
          }
          if (f.authoritativeNutrients?.fiberG !== null && f.authoritativeNutrients?.fiberG !== undefined) {
            totalFiber += f.authoritativeNutrients.fiberG;
          } else {
            hasUnknownFiber = true;
          }
        } else {
          if (f.matchStatus === 'AMBIGUOUS') ambiguousCount++;
          else notFoundCount++;
          hasUnknownCalories = true;
          hasUnknownProtein = true;
          hasUnknownCarbs = true;
          hasUnknownFat = true;
          hasUnknownFiber = true;
        }
      }
    }

    setProposal({
      ...proposal,
      meals: nextMeals,
      stats: {
        totalFoods,
        matchedCount,
        ambiguousCount,
        notFoundCount,
      },
      totalNutrientsAuthoritative: {
        caloriesKcal: hasUnknownCalories ? null : Math.round(totalCalories * 10) / 10,
        proteinG: hasUnknownProtein ? null : Math.round(totalProtein * 10) / 10,
        carbsG: hasUnknownCarbs ? null : Math.round(totalCarbs * 10) / 10,
        fatG: hasUnknownFat ? null : Math.round(totalFat * 10) / 10,
        fiberG: hasUnknownFiber ? null : Math.round(totalFiber * 10) / 10,
      },
      knownSubtotalsAuthoritative: {
        caloriesKcal: totalCalories > 0 ? Math.round(totalCalories * 10) / 10 : null,
        proteinG: totalProtein > 0 ? Math.round(totalProtein * 10) / 10 : null,
        carbsG: totalCarbs > 0 ? Math.round(totalCarbs * 10) / 10 : null,
        fatG: totalFat > 0 ? Math.round(totalFat * 10) / 10 : null,
        fiberG: totalFiber > 0 ? Math.round(totalFiber * 10) / 10 : null,
      },
      status: ambiguousCount === 0 && notFoundCount === 0 ? 'READY' : 'NEEDS_REVIEW',
    });
  }

  // Search food library manually
  async function handleSearchFood(query: string) {
    setSearchQuery(query);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/consultancies/${consultancySlug}/nutricao/alimentos?q=${encodeURIComponent(
          query
        )}&limit=10`
      );
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        setSearchResults(
          data.items.map((i: {
            publicId?: string;
            id?: string;
            name: string;
            sourceType?: string;
            caloriesKcal?: number | null;
            calories?: number | null;
            proteinG?: number | null;
            protein?: number | null;
            carbsG?: number | null;
            carbs?: number | null;
            fatG?: number | null;
            fat?: number | null;
            fiberG?: number | null;
            fiber?: number | null;
            referenceAmount?: number;
            referenceUnitCode?: string;
          }) => ({
            foodPublicId: i.publicId || i.id,
            name: i.name,
            sourceType: i.sourceType || 'TREVO',
            caloriesKcal: i.caloriesKcal ?? i.calories ?? null,
            proteinG: i.proteinG ?? i.protein ?? null,
            carbsG: i.carbsG ?? i.carbs ?? null,
            fatG: i.fatG ?? i.fat ?? null,
            fiberG: i.fiberG ?? i.fiber ?? null,
            referenceAmount: i.referenceAmount || 100,
            referenceUnitCode: i.referenceUnitCode || 'g',
          }))
        );
      }
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  }

  function applySearchResult(candidate: MatchedFoodCandidate) {
    if (!searchTarget || !proposal) return;
    handleSelectCandidate(searchTarget.mealIdx, searchTarget.foodId, candidate);
    setSearchTarget(null);
    setSearchQuery('');
    setSearchResults([]);
  }

  // Confirm import
  async function handleConfirmImport() {
    if (!proposal) return;
    if (proposal.meals.length === 0 || proposal.stats.totalFoods === 0) {
      setErrorMessage(
        'O plano alimentar precisa conter pelo menos um alimento para ser salvo.'
      );
      return;
    }

    setIsConfirming(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/consultancies/${consultancySlug}/ai/nutrition-import/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobPublicId: proposal.jobPublicId,
            targetPatientMembershipId: selectedPatientId || defaultPatientMembershipId || null,
            confirmedTitle: proposal.title,
            confirmedMeals: proposal.meals,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao persistir plano alimentar.');
      }

      setConfirmSuccess(true);
      if (onSuccess) {
        onSuccess(data.planPublicId);
      } else {
        setTimeout(() => {
          setIsOpen(false);
          router.push(`/consultoria/${consultancySlug}/planos-v2/${data.planPublicId}`);
          router.refresh();
        }, 800);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao confirmar importação.');
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      {!hideTrigger && (
        <Button
          variant="secondary"
          size="md"
          onClick={handleOpen}
          className="font-bold min-h-[44px] shadow-sm flex items-center justify-center gap-2 border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          title="Importar plano alimentar a partir de PDF ou texto"
        >
          <svg
            className="w-4 h-4 text-[var(--text-secondary)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Importar plano</span>
        </Button>
      )}

      {mounted && showModal && createPortal(
        <div
          data-testid="nutrition-ai-import-modal-overlay"
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-import-title"
            aria-describedby="ai-import-description"
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--surface)] border-t sm:border border-[var(--border-strong)] rounded-t-3xl sm:rounded-2xl w-full max-w-4xl max-h-[88dvh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-0 sm:my-auto animate-in slide-in-from-bottom-8 duration-200"
          >
            {/* Mobile Drag Handle */}
            <div className="pt-3 pb-1 flex justify-center sm:hidden shrink-0" aria-hidden="true">
              <div className="w-10 h-1.5 rounded-full bg-[var(--border-strong)]" />
            </div>

            {/* Header: Title + Close Button on top, Description underneath spanning full width */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-[var(--brand)]/10 border border-[var(--brand)]/20 flex items-center justify-center text-[var(--brand)] shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h2 id="ai-import-title" className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] leading-tight">
                      Importar plano com IA
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  aria-label="Fechar"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p id="ai-import-description" className="text-sm text-[var(--text-secondary)] mt-1.5 leading-snug">
                Envie um arquivo ou cole o texto.
              </p>
            </div>

            {/* Quota Banner: clean standalone line with wrap safety */}
            {quota && (
              <div className="px-4 sm:px-6 py-2.5 bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-1.5 shrink-0">
                <span>Uso de IA hoje:</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {quota.usedToday} de {quota.dailyLimit} utilizadas{" "}
                  <span className="text-emerald-500 font-extrabold">(Restam: {quota.remainingToday})</span>
                </span>
              </div>
            )}

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 sm:space-y-6">
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm font-medium flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div className="flex-1">
                    <p>{errorMessage}</p>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="mt-1 text-xs underline font-bold hover:text-red-300 cursor-pointer"
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 1: UPLOAD / PASTE TEXT (if no proposal yet) */}
              {!proposal && !isLoading && (
                <form onSubmit={handleSubmitImport} className="space-y-5 sm:space-y-6">
                  {quota && !quota.canUseAi && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm">
                      <strong>Você atingiu o limite de importações com IA de hoje.</strong> Fale com o administrador da sua consultoria.
                    </div>
                  )}

                  {/* Tab Selector: Short Labels */}
                  <div className="flex rounded-xl bg-[var(--surface-subtle)] p-1 border border-[var(--border-subtle)] w-full sm:w-fit">
                    <button
                      type="button"
                      onClick={() => setActiveTab('file')}
                      className={`flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'file'
                          ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Arquivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('text')}
                      className={`flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] text-sm font-bold rounded-lg transition-all ${
                        activeTab === 'text'
                          ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Colar texto
                    </button>
                  </div>

                  {activeTab === 'file' ? (
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                        Documento do plano alimentar
                      </label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--brand)] rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-colors bg-[var(--surface-subtle)]/30 hover:bg-[var(--surface-subtle)]/70 flex flex-col items-center justify-center gap-2.5 w-full"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.txt,.md,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) setFile(e.target.files[0]);
                          }}
                        />
                        <div className="w-10 h-10 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        {file ? (
                          <div className="max-w-full min-w-0">
                            <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                            <div className="flex items-center justify-center gap-3 mt-2">
                              <span className="text-xs font-semibold text-emerald-500 hover:underline">
                                Trocar arquivo
                              </span>
                              <span className="text-xs text-[var(--border-strong)]">•</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFile(null);
                                  if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                                className="text-xs font-semibold text-red-400 hover:underline cursor-pointer"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-bold text-[var(--text-primary)]">
                              Selecionar arquivo
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              Clique ou arraste um arquivo aqui
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-2">
                        Formatos aceitos: PDF, DOCX, TXT ou MD (máx 15MB)
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                        Conteúdo do cardápio
                      </label>
                      <textarea
                        rows={8}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Cole aqui o plano alimentar completo com refeições, horários e alimentos..."
                        className="w-full min-h-[180px] rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-strong)] p-3.5 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] font-sans resize-y"
                      />
                    </div>
                  )}

                  {/* Form fields: Single column on mobile, 8px gap between label and field, 20-24px between groups */}
                  <div className="grid grid-cols-1 gap-5 sm:gap-6 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                        Paciente (opcional)
                      </label>
                      {defaultPatientMembershipId ? (
                        <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] min-h-[44px] flex items-center">
                          Paciente contextualizado pelo aluno.
                        </div>
                      ) : (
                        <select
                          value={selectedPatientId || ''}
                          onChange={(e) => setSelectedPatientId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-strong)] px-3 py-2.5 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[44px]"
                        >
                          <option value="">[ Nenhum — salvar como rascunho ]</option>
                          {students.map((s) => (
                            <option key={s.membershipId} value={s.membershipId}>
                              {s.fullName} ({s.email})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                        Objetivo do plano (opcional)
                      </label>
                      <input
                        type="text"
                        value={objective}
                        onChange={(e) => setObjective(e.target.value)}
                        placeholder="Ex: Emagrecimento, Hipertrofia..."
                        className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-strong)] px-3 py-2.5 text-base text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)] min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-0">
                    <Button type="button" variant="ghost" onClick={handleClose} className="min-h-[44px] w-full sm:w-auto">
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={quota?.canUseAi === false || (activeTab === 'file' ? !file : !pastedText.trim())}
                      className="font-bold min-h-[48px] w-full sm:w-auto shadow-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                      </svg>
                      <span>Analisar plano com IA</span>
                    </Button>
                  </div>
                </form>
              )}

              {/* STEP 2: LOADING */}
              {isLoading && (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-[var(--brand)]/20 animate-ping" />
                    <div className="w-16 h-16 rounded-full border-4 border-[var(--brand)] border-t-transparent animate-spin flex items-center justify-center" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                      Analisando plano com IA...
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                      {loadingStep || 'Extraindo refeições e cruzando alimentos com a Food Library V3.'}
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: PREVIEW & REVIEW */}
              {proposal && !isLoading && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-strong)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                          {proposal.title}
                        </h3>
                        {proposal.objective && (
                          <Badge variant="neutral" size="sm">
                            {proposal.objective}
                          </Badge>
                        )}
                      </div>

                      {/* Patient Selection & Document Claim */}
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="font-bold text-[var(--text-secondary)]">Paciente:</span>
                        {defaultPatientMembershipId ? (
                          <span className="text-[var(--text-primary)] font-semibold">
                            {proposal.targetPatientName || 'Paciente contextualizado'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={selectedPatientId || ''}
                              onChange={(e) => setSelectedPatientId(e.target.value ? Number(e.target.value) : null)}
                              className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-xl px-2.5 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                            >
                              <option value="">[ Nenhum — salvar como rascunho ]</option>
                              {students.map((s) => (
                                <option key={s.membershipId} value={s.membershipId}>
                                  {s.fullName} ({s.email})
                                </option>
                              ))}
                            </select>
                            {proposal.patientNameCandidate && (
                              <span className="text-[var(--text-muted)] text-[11px] italic">
                                (Documento indica sugestão: &ldquo;{proposal.patientNameCandidate}&rdquo;)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold flex-wrap">
                        <span className="text-emerald-400 flex items-center gap-1">
                          ✓ {proposal.stats.matchedCount} encontrados
                        </span>
                        {proposal.stats.ambiguousCount > 0 && (
                          <span className="text-amber-400 flex items-center gap-1">
                            ⚠ {proposal.stats.ambiguousCount} precisam de revisão
                          </span>
                        )}
                        {proposal.stats.notFoundCount > 0 && (
                          <span className="text-red-400 flex items-center gap-1">
                            ✕ {proposal.stats.notFoundCount} não encontrados
                          </span>
                        )}
                        <span className="text-[var(--text-muted)]">
                          • Total: {proposal.stats.totalFoods} alimentos
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-xs shrink-0">
                      <span className="text-[var(--text-muted)] block">
                        {proposal.stats.ambiguousCount > 0 || proposal.stats.notFoundCount > 0 || proposal.totalNutrientsAuthoritative.caloriesKcal === null
                          ? 'Total nutricional parcial:'
                          : 'Total Nutricional Real:'}
                      </span>
                      <span className="font-bold text-[var(--text-primary)] text-sm">
                        {proposal.totalNutrientsAuthoritative.caloriesKcal !== null
                          ? `${proposal.totalNutrientsAuthoritative.caloriesKcal} kcal`
                          : proposal.knownSubtotalsAuthoritative?.caloriesKcal != null
                            ? `~${proposal.knownSubtotalsAuthoritative.caloriesKcal} kcal`
                            : '— kcal'}
                      </span>
                      <span className="text-[var(--text-secondary)] block text-[11px]">
                        P: {proposal.totalNutrientsAuthoritative.proteinG !== null ? `${proposal.totalNutrientsAuthoritative.proteinG}g` : proposal.knownSubtotalsAuthoritative?.proteinG != null ? `~${proposal.knownSubtotalsAuthoritative.proteinG}g` : '—'} | C: {proposal.totalNutrientsAuthoritative.carbsG !== null ? `${proposal.totalNutrientsAuthoritative.carbsG}g` : proposal.knownSubtotalsAuthoritative?.carbsG != null ? `~${proposal.knownSubtotalsAuthoritative.carbsG}g` : '—'} | G: {proposal.totalNutrientsAuthoritative.fatG !== null ? `${proposal.totalNutrientsAuthoritative.fatG}g` : proposal.knownSubtotalsAuthoritative?.fatG != null ? `~${proposal.knownSubtotalsAuthoritative.fatG}g` : '—'}
                      </span>
                      {(proposal.stats.ambiguousCount > 0 || proposal.stats.notFoundCount > 0) && (
                        <span className="text-[10px] text-amber-500/90 font-medium block">
                          * Itens pendentes de revisão não somados
                        </span>
                      )}
                    </div>
                  </div>

                  {proposal.stats.ambiguousCount > 0 || proposal.stats.notFoundCount > 0 ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>
                        Existem alimentos que ainda precisam de revisão. Você pode criar o plano agora e revisá-los depois.
                      </span>
                    </div>
                  ) : null}

                  {/* Meals List */}
                  <div className="space-y-5">
                    {proposal.meals.map((meal, mIdx) => (
                      <div
                        key={mIdx}
                        className="rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-subtle)]/40 overflow-hidden"
                      >
                        <div className="px-4 py-3 bg-[var(--surface-subtle)] border-b border-[var(--border-subtle)] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--brand)] uppercase tracking-wider">
                              Refeição {mIdx + 1}
                            </span>
                            <h4 className="text-sm font-extrabold text-[var(--text-primary)]">
                              {meal.name}
                            </h4>
                            {meal.time && (
                              <Badge variant="neutral" size="sm">
                                {meal.time}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">
                            {meal.foods.length} alimento{meal.foods.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="divide-y divide-[var(--border-subtle)]">
                          {meal.foods.map((food) => (
                            <div
                              key={food.id}
                              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-[var(--text-primary)] text-sm">
                                    {food.foodNameCandidate}
                                  </span>

                                  {/* Match Badge */}
                                  {food.matchStatus === 'MATCHED' && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                      Encontrado
                                    </span>
                                  )}
                                  {food.matchStatus === 'AMBIGUOUS' && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                                      ⚠ Precisa revisar
                                    </span>
                                  )}
                                  {food.matchStatus === 'NOT_FOUND' && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold">
                                      Não encontrado
                                    </span>
                                  )}
                                </div>

                                <p className="text-[var(--text-muted)] text-[11px]">
                                  Texto original: &ldquo;{food.originalText}&rdquo; • Quantidade:{' '}
                                  {food.quantity ?? '—'} {food.unitCandidate ?? ''}
                                </p>

                                {food.matchStatus === 'MATCHED' && food.foodNameSnapshot && (
                                  <p className="text-[var(--brand)] text-[11px] font-medium">
                                    Mapeado para: <strong>{food.foodNameSnapshot}</strong>
                                    {food.authoritativeNutrients && (
                                      <span className="text-[var(--text-secondary)] ml-1">
                                        ({food.authoritativeNutrients.caloriesKcal !== null ? `${food.authoritativeNutrients.caloriesKcal} kcal` : '— kcal'}, P:{' '}
                                        {food.authoritativeNutrients.proteinG !== null ? `${food.authoritativeNutrients.proteinG}g` : '—'})
                                      </span>
                                    )}
                                  </p>
                                )}

                                {/* Informational source document claim (NOT used as authority) */}
                                {food.sourceDocumentClaim && (
                                  <p className="text-[var(--text-muted)] text-[10px] italic">
                                    Afirmação do documento: {food.sourceDocumentClaim.kcal} kcal (apenas informativo)
                                  </p>
                                )}
                              </div>

                              {/* Actions / Disambiguation */}
                              <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                                {food.matchStatus === 'AMBIGUOUS' && food.candidates.length > 0 && (
                                  <select
                                    className="bg-[var(--surface)] border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-400 max-w-[200px]"
                                    defaultValue=""
                                    onChange={(e) => {
                                      const cand = food.candidates.find(
                                        (c) => c.foodPublicId === e.target.value
                                      );
                                      if (cand) handleSelectCandidate(mIdx, food.id, cand);
                                    }}
                                  >
                                    <option value="" disabled>
                                      Escolher alimento...
                                    </option>
                                    {food.candidates.map((c) => (
                                      <option key={c.foodPublicId} value={c.foodPublicId}>
                                        {c.name} ({c.caloriesKcal !== null ? `${c.caloriesKcal} kcal` : '— kcal'})
                                      </option>
                                    ))}
                                  </select>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchTarget({ mealIdx: mIdx, foodId: food.id });
                                    setSearchQuery(food.foodNameCandidate);
                                    handleSearchFood(food.foodNameCandidate);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl border border-[var(--border-strong)] hover:border-[var(--brand)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold transition-colors"
                                >
                                  Procurar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveFood(mIdx, food.id)}
                                  className="px-2.5 py-1.5 rounded-xl border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 text-xs font-semibold transition-colors"
                                  title="Remover este alimento"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Manual search modal overlay */}
                  {searchTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                      <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-2xl p-5 w-full max-w-lg shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">
                            Buscar alimento na biblioteca
                          </h4>
                          <button
                            type="button"
                            onClick={() => setSearchTarget(null)}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-bold"
                          >
                            Fechar
                          </button>
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchFood(e.target.value)}
                          placeholder="Digite o nome do alimento..."
                          className="w-full rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-strong)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
                          autoFocus
                        />
                        <div className="max-h-60 overflow-y-auto divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl">
                          {isSearching ? (
                            <p className="p-3 text-xs text-[var(--text-muted)] text-center">
                              Buscando...
                            </p>
                          ) : searchResults.length === 0 ? (
                            <p className="p-3 text-xs text-[var(--text-muted)] text-center">
                              Nenhum alimento encontrado para &ldquo;{searchQuery}&rdquo;.
                            </p>
                          ) : (
                            searchResults.map((item) => (
                              <button
                                key={item.foodPublicId}
                                type="button"
                                onClick={() => applySearchResult(item)}
                                className="w-full text-left p-2.5 hover:bg-[var(--surface-subtle)] flex items-center justify-between text-xs transition-colors"
                              >
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {item.name}
                                </span>
                                <span className="text-[var(--text-muted)]">
                                  {item.caloriesKcal !== null ? `${item.caloriesKcal} kcal` : '— kcal'} / {item.referenceAmount}
                                  {item.referenceUnitCode}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confirmation Bottom Bar */}
                  <div className="pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setProposal(null)}
                      disabled={isConfirming}
                      className="min-h-[44px]"
                    >
                      Voltar ao upload
                    </Button>

                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="primary"
                        disabled={
                          isConfirming ||
                          confirmSuccess ||
                          proposal.meals.length === 0 ||
                          proposal.stats.totalFoods === 0
                        }
                        onClick={handleConfirmImport}
                        className="font-bold min-h-[48px] w-full sm:w-auto shadow-sm flex items-center justify-center gap-2"
                      >
                        {isConfirming ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <span>Salvando rascunho...</span>
                          </>
                        ) : confirmSuccess ? (
                          <span>Rascunho salvo com sucesso!</span>
                        ) : selectedPatientId || defaultPatientMembershipId ? (
                          <span>Salvar rascunho</span>
                        ) : (
                          <span>Salvar como rascunho</span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
