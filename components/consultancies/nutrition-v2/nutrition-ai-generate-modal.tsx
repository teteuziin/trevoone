"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
interface StudentOption {
  membershipId: number;
  membershipPublicId: string;
  fullName: string;
  email: string;
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
  matchStatus: "MATCHED" | "AMBIGUOUS" | "NOT_FOUND";
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
}

interface NutritionAiGenerateModalProps {
  consultancySlug: string;
  isOpen: boolean;
  onClose: () => void;
}

function SparklesIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function CloseIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export function NutritionAiGenerateModal({
  consultancySlug,
  isOpen,
  onClose,
}: NutritionAiGenerateModalProps) {
  const router = useRouter();

  // Form states
  const [description, setDescription] = useState("");
  const [objective, setObjective] = useState("Hipertrofia muscular");
  const [mealsCount, setMealsCount] = useState("5");
  const [restrictions, setRestrictions] = useState("");
  const [selectedStudentMembershipId, setSelectedStudentMembershipId] = useState<number | null>(null);

  // Async & proposal states
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ResolvedNutritionProposal | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Load students for optional patient association
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsLoadingStudents(true);
      try {
        const res = await fetch(`/api/consultancies/${consultancySlug}/students`);
        const data = await res.json();
        if (isMounted && data.students && Array.isArray(data.students)) {
          setStudents(data.students);
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsLoadingStudents(false);
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, consultancySlug]);

  // Keyboard escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading && !isSavingDraft) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoading, isSavingDraft]);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage("Por favor, descreva em texto livre o plano que deseja montar.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setLoadingStep("Analisando contexto nutricional e alimentos com IA...");

    try {
      const fullText = [
        `Descrição do plano desejado: ${description.trim()}`,
        objective.trim() ? `Objetivo nutricional: ${objective.trim()}` : "",
        mealsCount ? `Número sugerido de refeições: ${mealsCount} refeições ao dia` : "",
        restrictions.trim() ? `Restrições alimentares e preferências: ${restrictions.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const formData = new FormData();
      formData.append("text", fullText);
      if (objective.trim()) {
        formData.append("objective", objective.trim());
      }
      if (selectedStudentMembershipId) {
        formData.append("targetPatientMembershipId", String(selectedStudentMembershipId));
      }

      const res = await fetch(`/api/consultancies/${consultancySlug}/ai/nutrition-import`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao gerar proposta com IA.");
      }

      setProposal(data.proposal);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao gerar plano com IA. Tente novamente."
      );
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleConfirmAndSaveDraft = async () => {
    if (!proposal) return;
    setIsSavingDraft(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/consultancies/${consultancySlug}/ai/nutrition-import/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobPublicId: proposal.jobPublicId,
            targetPatientMembershipId: selectedStudentMembershipId,
            meals: proposal.meals,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar rascunho do plano.");
      }

      onClose();
      router.push(`/consultoria/${consultancySlug}/planos-v2/${data.planPublicId}`);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao gravar rascunho do plano."
      );
      setIsSavingDraft(false);
    }
  };

  const handleReset = () => {
    setProposal(null);
    setErrorMessage(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-generate-title"
    >
      <div className="relative w-full sm:max-w-2xl bg-white dark:bg-[#151619] rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-[#E5E7EB] dark:border-[#303238] overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-4 duration-200">
        {/* Mobile Drag Indicator */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-[#303238]" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5E7EB] dark:border-[#303238] flex items-center justify-between bg-slate-50/70 dark:bg-[#1B1D21]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="ai-generate-title" className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight">
                Criar do zero com IA
              </h2>
              <p className="text-xs text-[#6B7280] dark:text-[#8E95A2]">
                {proposal ? "Conferência da proposta gerada" : "Descreva o plano que deseja montar"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading || isSavingDraft}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#8E95A2] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
              {errorMessage}
            </div>
          )}

          {!proposal ? (
            /* STEP 1: FORM TO DESCRIBE THE PLAN */
            <form onSubmit={handleGenerate} className="space-y-4">
              {/* Free text description */}
              <div>
                <label className="block text-xs font-bold text-[#17191D] dark:text-white uppercase tracking-wider mb-1.5">
                  Descrição do plano alimentar em texto livre *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={4}
                  placeholder="Ex: Dieta para hipertrofia com aproximadamente 2500 kcal, rica em proteínas, distribuída em 5 refeições. Incluir ovos, aveia, frutas, arroz, frango, azeite de oliva e iogurte natural..."
                  className="w-full px-3.5 py-2.5 bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-xs sm:text-sm text-[#17191D] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-[#8E95A2] focus:bg-white dark:focus:bg-[#151619] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              {/* Complementary Context: 2 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Objetivo */}
                <div>
                  <label className="block text-xs font-semibold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                    Objetivo nutricional
                  </label>
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-[44px] px-3 bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-xs sm:text-sm font-medium text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Hipertrofia muscular">Hipertrofia muscular</option>
                    <option value="Emagrecimento / Definição">Emagrecimento / Definição</option>
                    <option value="Manutenção e Saúde">Manutenção e Saúde</option>
                    <option value="Performance Esportiva">Performance Esportiva</option>
                    <option value="Reeducação Alimentar">Reeducação Alimentar</option>
                  </select>
                </div>

                {/* Quantidade de refeições */}
                <div>
                  <label className="block text-xs font-semibold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                    Quantidade de refeições
                  </label>
                  <select
                    value={mealsCount}
                    onChange={(e) => setMealsCount(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-[44px] px-3 bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-xs sm:text-sm font-medium text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="3">3 refeições ao dia</option>
                    <option value="4">4 refeições ao dia</option>
                    <option value="5">5 refeições ao dia</option>
                    <option value="6">6 refeições ao dia</option>
                    <option value="7">7 refeições ao dia</option>
                  </select>
                </div>
              </div>

              {/* Restrições alimentares */}
              <div>
                <label className="block text-xs font-semibold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                  Restrições alimentares ou preferências (opcional)
                </label>
                <input
                  type="text"
                  value={restrictions}
                  onChange={(e) => setRestrictions(e.target.value)}
                  disabled={isLoading}
                  placeholder="Ex: Sem lactose, sem glúten, vegetariano, sem frutos do mar..."
                  className="w-full h-[44px] px-3.5 bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-xs sm:text-sm text-[#17191D] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-[#8E95A2] focus:bg-white dark:focus:bg-[#151619] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Paciente opcional */}
              <div>
                <label className="block text-xs font-semibold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider mb-1.5">
                  Paciente (opcional — pode associar agora ou depois)
                </label>
                <select
                  value={selectedStudentMembershipId || ""}
                  onChange={(e) => setSelectedStudentMembershipId(e.target.value ? Number(e.target.value) : null)}
                  disabled={isLoading || isLoadingStudents}
                  className="w-full h-[44px] px-3 bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-xs sm:text-sm font-medium text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="">Sem paciente por enquanto (vincular depois)</option>
                  {students.map((st) => (
                    <option key={st.membershipPublicId} value={st.membershipId}>
                      {st.fullName} ({st.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !description.trim()}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer select-none"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>{loadingStep || "Gerando proposta com IA..."}</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4" />
                      <span>Gerar proposta com IA</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: CONFERENCE PREVIEW */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#17191D] dark:text-white">
                      {proposal.title || "Proposta de Plano Alimentar"}
                    </h3>
                    <p className="text-xs text-[#6B7280] dark:text-[#8E95A2]">
                      {proposal.meals.length} refeições estruturadas · {proposal.stats.totalFoods} alimentos mapeados
                    </p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 w-fit">
                    Rascunho para conferência
                  </span>
                </div>

                {/* Macronutrients Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#E5E7EB] dark:border-[#303238] text-xs">
                  <div className="p-2 rounded-lg bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238]">
                    <span className="text-[10px] text-[#6B7280] dark:text-[#8E95A2] block">Calorias</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {Math.round(proposal.totalNutrientsAuthoritative.caloriesKcal || 0)} kcal
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238]">
                    <span className="text-[10px] text-[#6B7280] dark:text-[#8E95A2] block">Proteínas</span>
                    <span className="font-bold text-[#17191D] dark:text-white font-mono">
                      {Math.round(proposal.totalNutrientsAuthoritative.proteinG || 0)} g
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238]">
                    <span className="text-[10px] text-[#6B7280] dark:text-[#8E95A2] block">Carboidratos</span>
                    <span className="font-bold text-[#17191D] dark:text-white font-mono">
                      {Math.round(proposal.totalNutrientsAuthoritative.carbsG || 0)} g
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238]">
                    <span className="text-[10px] text-[#6B7280] dark:text-[#8E95A2] block">Gorduras</span>
                    <span className="font-bold text-[#17191D] dark:text-white font-mono">
                      {Math.round(proposal.totalNutrientsAuthoritative.fatG || 0)} g
                    </span>
                  </div>
                </div>
              </div>

              {/* Meals list */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {proposal.meals.map((meal, idx) => (
                  <div
                    key={`meal-${idx}`}
                    className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#303238] bg-white dark:bg-[#1B1D21] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#17191D] dark:text-white">
                        {meal.name}
                      </span>
                      {meal.time && (
                        <span className="text-[11px] text-[#6B7280] dark:text-[#8E95A2] font-mono">
                          {meal.time}
                        </span>
                      )}
                    </div>
                    <ul className="divide-y divide-[#F3F4F6] dark:divide-[#252830] text-xs">
                      {meal.foods.map((food, fIdx) => (
                        <li key={`food-${fIdx}`} className="py-1.5 flex items-center justify-between gap-2">
                          <span className="text-[#374151] dark:text-[#C2C8CF] truncate">
                            {food.foodNameSnapshot || food.foodNameCandidate}
                          </span>
                          <span className="text-[#6B7280] dark:text-[#8E95A2] font-mono shrink-0">
                            {food.quantity || 100} {food.unitCandidate || "g"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                <span className="font-bold">Garantia clínica:</span> Ao confirmar, o plano será gravado como rascunho independente e aberto no editor para ajustes finos. Não é publicado nem atribuído automaticamente.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] border-t border-[#E5E7EB] dark:border-[#303238] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 bg-slate-50/70 dark:bg-[#1B1D21]/70">
          {!proposal ? (
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2 text-xs font-semibold text-[#4B5563] dark:text-[#C2C8CF] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-center cursor-pointer"
            >
              Cancelar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                disabled={isSavingDraft}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-xs font-semibold text-[#4B5563] dark:text-[#C2C8CF] hover:text-[#17191D] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-center cursor-pointer"
              >
                Voltar e ajustar
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSaveDraft}
                disabled={isSavingDraft}
                className="w-full sm:w-auto min-h-[48px] px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSavingDraft ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Gravando rascunho...</span>
                  </>
                ) : (
                  <span>Salvar como rascunho e abrir no editor</span>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
