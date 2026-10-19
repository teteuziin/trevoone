"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ExerciseItemDto,
  DifficultyLevel,
  MovementPattern,
} from "@/lib/training-v2/types";
import {
  createConsultancyExerciseDraftAction,
  updateConsultancyExerciseAction,
  publishConsultancyExerciseAction,
  archiveConsultancyExerciseAction,
  changeConsultancyExerciseVisibilityAction,
  getExerciseTaxonomyAction,
} from "@/app/consultoria/[slug]/exercicios/actions";
import {
  FormField,
  Input,
  Textarea,
  Select,
  SuggestiveInput,
  DEFAULT_SUGGESTED_MUSCLE_GROUPS,
  DEFAULT_SUGGESTED_EQUIPMENT,
} from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ConsultancyExerciseMediaManager } from "./consultancy-exercise-media-manager";

interface ConsultancyExerciseFormProps {
  slug: string;
  consultancyPublicId: string;
  mode: "create" | "edit" | "view";
  initialData?: ExerciseItemDto;
  canEdit?: boolean;
}

const MOVEMENT_PATTERNS: { value: MovementPattern; label: string }[] = [
  { value: "PUSH", label: "Empurrar (Push)" },
  { value: "PULL", label: "Puxar (Pull)" },
  { value: "SQUAT", label: "Agachamento (Squat)" },
  { value: "HINGE", label: "Quadril / Terra (Hinge)" },
  { value: "LUNGE", label: "Avanço / Unilateral (Lunge)" },
  { value: "ISOLATION", label: "Isolamento Articular (Isolation)" },
  { value: "CARDIO", label: "Cardiorrespiratório (Cardio)" },
  { value: "MOBILITY", label: "Mobilidade / Flexibilidade (Mobility)" },
];

export function ConsultancyExerciseForm({
  slug,
  consultancyPublicId,
  mode,
  initialData,
  canEdit = true,
}: ConsultancyExerciseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isViewOnly = mode === "view" || !canEdit;

  // Form state: Note that new exercises DO NOT pre-fill arbitrary defaults like "Peitoral" or "Halteres"
  const [name, setName] = useState(initialData?.name || "");
  const [muscleGroupPrimary, setMuscleGroupPrimary] = useState(initialData?.muscleGroupPrimary || "");
  const [muscleGroupsSecondary, setMuscleGroupsSecondary] = useState(
    initialData?.muscleGroupsSecondary ? initialData.muscleGroupsSecondary.join(", ") : ""
  );
  const [equipment, setEquipment] = useState(initialData?.equipment || "");
  const [movementPattern, setMovementPattern] = useState<MovementPattern | "">(
    (initialData?.movementPattern as MovementPattern) || ""
  );
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel | "">(
    (initialData?.difficultyLevel as DifficultyLevel) || ""
  );
  const [description, setDescription] = useState(initialData?.description || "");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [executionTips, setExecutionTips] = useState(initialData?.executionTips || "");
  const [commonMistakes, setCommonMistakes] = useState(initialData?.commonMistakes || "");
  const [progressions, setProgressions] = useState(initialData?.progressions || "");
  const [regressions, setRegressions] = useState(initialData?.regressions || "");

  // Aliases / Outros nomes
  const [aliasesText, setAliasesText] = useState(
    initialData?.aliases && initialData.aliases.length > 0 ? initialData.aliases.join(", ") : ""
  );

  // Accordion open/close state for demand-driven details
  const [expandedSections, setExpandedSections] = useState<{
    orientations: boolean;
    media: boolean;
    additional: boolean;
    aliases: boolean;
  }>({
    orientations: Boolean(
      initialData?.instructions ||
        initialData?.executionTips ||
        initialData?.commonMistakes ||
        initialData?.description
    ),
    media: mode === "edit",
    additional: Boolean(
      initialData?.movementPattern ||
        initialData?.muscleGroupsSecondary?.length ||
        initialData?.progressions ||
        initialData?.regressions
    ),
    aliases: Boolean(initialData?.aliases?.length),
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Visibility state: Default is CREATOR_ONLY (Só para mim)
  const [visibility, setVisibility] = useState<"CREATOR_ONLY" | "CONSULTANCY">(
    initialData?.visibility === "CONSULTANCY" ? "CONSULTANCY" : "CREATOR_ONLY"
  );
  const [showShareConfirmModal, setShowShareConfirmModal] = useState(false);

  // Feedback state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Dynamic taxonomy suggestions (initialized with defaults, updated from DB)
  const [muscleSuggestions, setMuscleSuggestions] = useState<readonly string[] | string[]>(
    DEFAULT_SUGGESTED_MUSCLE_GROUPS
  );
  const [equipmentSuggestions, setEquipmentSuggestions] = useState<readonly string[] | string[]>(
    DEFAULT_SUGGESTED_EQUIPMENT
  );

  useEffect(() => {
    let active = true;
    getExerciseTaxonomyAction(slug).then((res) => {
      if (active && res.ok && res.data) {
        if (res.data.muscleGroups?.length) {
          setMuscleSuggestions(res.data.muscleGroups);
        }
        if (res.data.equipment?.length) {
          setEquipmentSuggestions(res.data.equipment);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [slug]);

  const status = initialData?.status || "DRAFT";
  const isArchived = status === "ARCHIVED";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly || isPending) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    const trimmedMuscle = muscleGroupPrimary.trim();
    const trimmedEquipment = equipment.trim();

    if (!trimmedName) {
      setErrorMessage("O nome do exercício é obrigatório.");
      return;
    }
    if (!trimmedMuscle) {
      setErrorMessage("O grupo muscular principal é obrigatório.");
      return;
    }
    if (!trimmedEquipment) {
      setErrorMessage("O equipamento é obrigatório.");
      return;
    }

    const secondaryArray = muscleGroupsSecondary
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const aliasesArray = aliasesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      if (mode === "create") {
        const res = await createConsultancyExerciseDraftAction(slug, {
          name: trimmedName,
          muscleGroupPrimary: trimmedMuscle,
          muscleGroupsSecondary: secondaryArray.length > 0 ? secondaryArray : null,
          equipment: trimmedEquipment,
          movementPattern: movementPattern || null,
          difficultyLevel: difficultyLevel || "INTERMEDIATE",
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          executionTips: executionTips.trim() || null,
          commonMistakes: commonMistakes.trim() || null,
          progressions: progressions.trim() || null,
          regressions: regressions.trim() || null,
          visibility,
          aliases: aliasesArray.length > 0 ? aliasesArray : null,
        });

        if (!res.ok || !res.data) {
          setErrorMessage(res.error || "Erro ao criar exercício.");
          return;
        }

        router.push(`/consultoria/${slug}/exercicios/${res.data.publicId}`);
      } else if (mode === "edit" && initialData) {
        const res = await updateConsultancyExerciseAction(slug, initialData.publicId, {
          name: trimmedName,
          muscleGroupPrimary: trimmedMuscle,
          muscleGroupsSecondary: secondaryArray.length > 0 ? secondaryArray : null,
          equipment: trimmedEquipment,
          movementPattern: movementPattern || null,
          difficultyLevel: difficultyLevel || "INTERMEDIATE",
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          executionTips: executionTips.trim() || null,
          commonMistakes: commonMistakes.trim() || null,
          progressions: progressions.trim() || null,
          regressions: regressions.trim() || null,
          aliases: aliasesArray,
        });

        if (!res.ok) {
          setErrorMessage(res.error || "Erro ao salvar alterações.");
          return;
        }

        setSuccessMessage("Exercício atualizado com sucesso.");
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    });
  };

  const handlePublish = () => {
    if (!initialData || isPending || isViewOnly) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!confirm("Deseja publicar este exercício na biblioteca da consultoria?")) {
      return;
    }

    startTransition(async () => {
      const res = await publishConsultancyExerciseAction(slug, initialData.publicId);
      if (!res.ok) {
        setErrorMessage(res.error || "Falha na validação de publicação do exercício.");
      } else {
        setSuccessMessage("Exercício publicado com sucesso!");
        router.refresh();
      }
    });
  };

  const handleDeleteClick = () => {
    if (isPending || isDeleting || isViewOnly) return;
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!initialData || isDeleting || isViewOnly) return;
    setIsDeleting(true);
    setDeleteError(null);

    startTransition(async () => {
      try {
        const res = await archiveConsultancyExerciseAction(slug, initialData.publicId);
        if (!res.ok) {
          setIsDeleting(false);
          setDeleteError(res.error || "Falha ao excluir exercício.");
        } else {
          setIsDeleteModalOpen(false);
          router.push(`/consultoria/${slug}/exercicios`);
        }
      } catch (err: unknown) {
        setIsDeleting(false);
        setDeleteError(err instanceof Error ? err.message : "Erro inesperado ao excluir exercício.");
      }
    });
  };

  const handleVisibilityToggle = (targetVisibility: "CREATOR_ONLY" | "CONSULTANCY") => {
    if (isViewOnly || !initialData) {
      setVisibility(targetVisibility);
      return;
    }

    if (targetVisibility === "CONSULTANCY") {
      const hasPrivateMedia = initialData.media?.some((m) => m.mediaAsset.visibility === "CREATOR_ONLY");
      if (hasPrivateMedia) {
        setShowShareConfirmModal(true);
        return;
      }
    }

    executeVisibilityChange(targetVisibility, false);
  };

  const executeVisibilityChange = (
    targetVisibility: "CREATOR_ONLY" | "CONSULTANCY",
    promoteMedia: boolean
  ) => {
    if (!initialData) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await changeConsultancyExerciseVisibilityAction(
        slug,
        initialData.publicId,
        targetVisibility,
        { promoteAttachedMedia: promoteMedia }
      );

      if (!res.ok) {
        if (res.requiresMediaPromotion) {
          setShowShareConfirmModal(true);
        } else {
          setErrorMessage(res.error || "Falha ao alterar visibilidade.");
        }
      } else {
        setVisibility(targetVisibility);
        setShowShareConfirmModal(false);
        setSuccessMessage(
          targetVisibility === "CONSULTANCY"
            ? "Exercício compartilhado com a equipe da consultoria."
            : "Exercício alterado para visibilidade privada (Só para mim)."
        );
        router.refresh();
      }
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {errorMessage && (
        <Alert variant="danger" title="Atenção">
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" title="Sucesso">
          {successMessage}
        </Alert>
      )}

      {/* Share Private Media Confirmation Dialog */}
      {showShareConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#151619] border border-neutral-200 dark:border-[#303238] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Compartilhar Mídias Privadas
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Para compartilhar este exercício com a consultoria, as fotos e vídeos anexados de visibilidade privada
              também serão compartilhados com os demais profissionais da consultoria.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => setShowShareConfirmModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isPending}
                onClick={() => executeVisibilityChange("CONSULTANCY", true)}
                className="font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {isPending ? "Processando..." : "Confirmar e Compartilhar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* =========================================================================
            CARD PRINCIPAL: INFORMAÇÕES BÁSICAS
            ========================================================================= */}
        <div className="bg-white dark:bg-[#151619] border border-neutral-200/80 dark:border-[#303238] rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-100 dark:border-[#252830] pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                Informações Básicas
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Preencha os dados essenciais para cadastrar o exercício na biblioteca.
              </p>
            </div>
            {mode !== "create" && initialData && (
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs text-neutral-400">Status:</span>
                {status === "PUBLISHED" && <Badge variant="success">Publicado</Badge>}
                {status === "DRAFT" && <Badge variant="warning">Rascunho</Badge>}
                {status === "ARCHIVED" && <Badge variant="neutral">Arquivado</Badge>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Nome do exercício - Full width */}
            <div className="sm:col-span-2">
              <FormField label="Nome do Exercício" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Cadeira Extensora, Supino Reto com Halteres..."
                  disabled={isPending || isViewOnly || isArchived}
                  required
                  className="text-base sm:text-sm min-h-[44px]"
                />
              </FormField>
            </div>

            {/* Grupo Muscular Principal */}
            <FormField
              label="Grupo Muscular Principal"
              required
              helperText="Selecione uma categoria sugerida ou digite uma nova"
            >
              <SuggestiveInput
                value={muscleGroupPrimary}
                onChange={setMuscleGroupPrimary}
                suggestions={muscleSuggestions}
                placeholder="Ex: Quadríceps, Peitoral, Costas..."
                disabled={isPending || isViewOnly || isArchived}
                required
                maxLength={100}
                className="text-base sm:text-sm min-h-[44px]"
              />
            </FormField>

            {/* Equipamento */}
            <FormField
              label="Equipamento"
              required
              helperText="Selecione o equipamento utilizado no exercício"
            >
              <SuggestiveInput
                value={equipment}
                onChange={setEquipment}
                suggestions={equipmentSuggestions}
                placeholder="Ex: Máquina, Halteres, Barra, Cabo..."
                disabled={isPending || isViewOnly || isArchived}
                required
                maxLength={100}
                className="text-base sm:text-sm min-h-[44px]"
              />
            </FormField>

            {/* Visibilidade do Conteúdo */}
            <div className="sm:col-span-2 space-y-2 pt-1">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Visibilidade na Consultoria
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    visibility === "CREATOR_ONLY"
                      ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/10 shadow-xs"
                      : "border-neutral-200 dark:border-[#303238] bg-neutral-50/50 dark:bg-[#1B1D21] hover:bg-neutral-100 dark:hover:bg-[#252830]"
                  } ${isViewOnly ? "cursor-not-allowed opacity-75" : ""}`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="CREATOR_ONLY"
                    checked={visibility === "CREATOR_ONLY"}
                    onChange={() => handleVisibilityToggle("CREATOR_ONLY")}
                    disabled={isPending || isViewOnly || isArchived}
                    className="mt-1 accent-emerald-600"
                  />
                  <div className="min-w-0">
                    <span className="block text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                      🔒 Só para mim (Privado)
                    </span>
                    <span className="block text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
                      Visível apenas para você prescrever aos seus alunos.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    visibility === "CONSULTANCY"
                      ? "border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/10 shadow-xs"
                      : "border-neutral-200 dark:border-[#303238] bg-neutral-50/50 dark:bg-[#1B1D21] hover:bg-neutral-100 dark:hover:bg-[#252830]"
                  } ${isViewOnly ? "cursor-not-allowed opacity-75" : ""}`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="CONSULTANCY"
                    checked={visibility === "CONSULTANCY"}
                    onChange={() => handleVisibilityToggle("CONSULTANCY")}
                    disabled={isPending || isViewOnly || isArchived}
                    className="mt-1 accent-indigo-600"
                  />
                  <div className="min-w-0">
                    <span className="block text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
                      👥 Minha consultoria (Compartilhado)
                    </span>
                    <span className="block text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-snug">
                      Disponível para toda a equipe da consultoria prescrever.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            DETALHES SOB DEMANDA: ÁREAS EXPANSÍVEIS
            ========================================================================= */}

        {/* ACCORDION 1: ORIENTAÇÕES E EXECUÇÃO */}
        <div className="bg-white dark:bg-[#151619] border border-neutral-200/80 dark:border-[#303238] rounded-2xl overflow-hidden shadow-xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection("orientations")}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-neutral-50/80 dark:hover:bg-[#1B1D21] transition-colors cursor-pointer"
            aria-expanded={expandedSections.orientations}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 text-sm">
                📖
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                  Orientações
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate">
                  Descrição, instruções de execução, dicas e erros comuns (opcional)
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-neutral-400 transition-transform duration-200 shrink-0 ${
                expandedSections.orientations ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {expandedSections.orientations && (
            <div className="p-5 sm:p-6 border-t border-neutral-100 dark:border-[#252830] space-y-4 animate-in fade-in duration-150">
              <FormField label="Descrição Breve" optional>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivo principal e notas gerais do exercício."
                  rows={2}
                  disabled={isPending || isViewOnly || isArchived}
                  className="text-base sm:text-sm"
                />
              </FormField>

              <FormField label="Instruções de Execução Passo a Passo" optional>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="1. Ajuste o banco de modo que o eixo de rotação alinhe com o joelho...&#10;2. Estenda as pernas controlando o movimento...&#10;3. Retorne sem bater as placas."
                  rows={3}
                  disabled={isPending || isViewOnly || isArchived}
                  className="text-base sm:text-sm"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Dicas Biomecânicas (Cues)" optional>
                  <Textarea
                    value={executionTips}
                    onChange={(e) => setExecutionTips(e.target.value)}
                    placeholder="Ex: Segure firme nos apoios laterais e mantenha a lombar apoiada."
                    rows={2}
                    disabled={isPending || isViewOnly || isArchived}
                    className="text-base sm:text-sm"
                  />
                </FormField>

                <FormField label="Erros Comuns a Evitar" optional>
                  <Textarea
                    value={commonMistakes}
                    onChange={(e) => setCommonMistakes(e.target.value)}
                    placeholder="Ex: Projetar o quadril para frente ou usar impulso da coluna."
                    rows={2}
                    disabled={isPending || isViewOnly || isArchived}
                    className="text-base sm:text-sm"
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>

        {/* ACCORDION 2: FOTOS E VÍDEO */}
        <div className="bg-white dark:bg-[#151619] border border-neutral-200/80 dark:border-[#303238] rounded-2xl overflow-hidden shadow-xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection("media")}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-neutral-50/80 dark:hover:bg-[#1B1D21] transition-colors cursor-pointer"
            aria-expanded={expandedSections.media}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 text-sm">
                📸
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                  Fotos e vídeo
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate">
                  Mídias de demonstração e execução biomecânica
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-neutral-400 transition-transform duration-200 shrink-0 ${
                expandedSections.media ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {expandedSections.media && (
            <div className="p-5 sm:p-6 border-t border-neutral-100 dark:border-[#252830] animate-in fade-in duration-150">
              {mode === "create" ? (
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#1B1D21] border border-neutral-200 dark:border-[#303238] text-center space-y-2">
                  <p className="text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    💡 Anexo de fotos e vídeos disponível após o salvamento
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                    Salve este exercício com o nome e grupo muscular. Na tela seguinte você poderá enviar fotos e vídeos de execução diretamente pelo celular ou computador.
                  </p>
                </div>
              ) : initialData ? (
                <ConsultancyExerciseMediaManager
                  slug={slug}
                  consultancyPublicId={consultancyPublicId}
                  exercisePublicId={initialData.publicId}
                  exerciseVisibility={initialData.visibility === "CONSULTANCY" ? "CONSULTANCY" : "CREATOR_ONLY"}
                  mediaList={initialData.media || []}
                  readOnly={isViewOnly || isArchived}
                  onMediaChange={() => router.refresh()}
                />
              ) : null}
            </div>
          )}
        </div>

        {/* ACCORDION 3: DETALHES ADICIONAIS */}
        <div className="bg-white dark:bg-[#151619] border border-neutral-200/80 dark:border-[#303238] rounded-2xl overflow-hidden shadow-xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection("additional")}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-neutral-50/80 dark:hover:bg-[#1B1D21] transition-colors cursor-pointer"
            aria-expanded={expandedSections.additional}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 text-sm">
                ⚙️
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                  Detalhes adicionais
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate">
                  Nível, padrão de movimento e músculos secundários (opcional)
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-neutral-400 transition-transform duration-200 shrink-0 ${
                expandedSections.additional ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {expandedSections.additional && (
            <div className="p-5 sm:p-6 border-t border-neutral-100 dark:border-[#252830] space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Nível de Dificuldade" optional>
                  <Select
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel | "")}
                    disabled={isPending || isViewOnly || isArchived}
                    className="text-base sm:text-sm min-h-[44px]"
                  >
                    <option value="">Selecione o nível (opcional)</option>
                    <option value="BEGINNER">Iniciante</option>
                    <option value="INTERMEDIATE">Intermediário</option>
                    <option value="ADVANCED">Avançado</option>
                  </Select>
                </FormField>

                <FormField label="Padrão de Movimento" optional>
                  <Select
                    value={movementPattern}
                    onChange={(e) => setMovementPattern(e.target.value as MovementPattern | "")}
                    disabled={isPending || isViewOnly || isArchived}
                    className="text-base sm:text-sm min-h-[44px]"
                  >
                    <option value="">Selecione o padrão (opcional)</option>
                    {MOVEMENT_PATTERNS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <div className="sm:col-span-2">
                  <FormField
                    label="Grupos Musculares Secundários"
                    optional
                    helperText="Separe os grupos por vírgula (ex: Glúteos, Isquiotibiais)"
                  >
                    <Input
                      value={muscleGroupsSecondary}
                      onChange={(e) => setMuscleGroupsSecondary(e.target.value)}
                      placeholder="Ex: Glúteos, Isquiotibiais, Lombar"
                      disabled={isPending || isViewOnly || isArchived}
                      className="text-base sm:text-sm min-h-[44px]"
                    />
                  </FormField>
                </div>

                <FormField label="Progressões Recomendadas" optional>
                  <Textarea
                    value={progressions}
                    onChange={(e) => setProgressions(e.target.value)}
                    placeholder="Ex: Aumentar a carga dos halteres; adicionar pausa de 2 segundos."
                    rows={2}
                    disabled={isPending || isViewOnly || isArchived}
                    className="text-base sm:text-sm"
                  />
                </FormField>

                <FormField label="Regressões Recomendadas" optional>
                  <Textarea
                    value={regressions}
                    onChange={(e) => setRegressions(e.target.value)}
                    placeholder="Ex: Executar com peso corporal no solo antes de usar o banco."
                    rows={2}
                    disabled={isPending || isViewOnly || isArchived}
                    className="text-base sm:text-sm"
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>

        {/* ACCORDION 4: OUTROS NOMES / APELIDOS DE BUSCA */}
        <div className="bg-white dark:bg-[#151619] border border-neutral-200/80 dark:border-[#303238] rounded-2xl overflow-hidden shadow-xs transition-all">
          <button
            type="button"
            onClick={() => toggleSection("aliases")}
            className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-neutral-50/80 dark:hover:bg-[#1B1D21] transition-colors cursor-pointer"
            aria-expanded={expandedSections.aliases}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 text-sm">
                🏷️
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                  Outros nomes (Apelidos de busca)
                </h3>
                <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-medium truncate">
                  Sinônimos populares para encontrar o exercício facilmente (opcional)
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-neutral-400 transition-transform duration-200 shrink-0 ${
                expandedSections.aliases ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {expandedSections.aliases && (
            <div className="p-5 sm:p-6 border-t border-neutral-100 dark:border-[#252830] space-y-3 animate-in fade-in duration-150">
              <FormField
                label="Apelidos ou Nomes Populares"
                optional
                helperText="Separe os apelidos por vírgula. Ex: serrote, remada serrote, unilateral"
              >
                <Input
                  value={aliasesText}
                  onChange={(e) => setAliasesText(e.target.value)}
                  placeholder="Ex: serrote, remada unilateral com halter"
                  disabled={isPending || isViewOnly || isArchived}
                  className="text-base sm:text-sm min-h-[44px]"
                />
              </FormField>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Ao cadastrar esses termos, qualquer treinador que digitar esses apelidos na biblioteca ou no construtor de treinos encontrará este exercício imediatamente.
              </p>
            </div>
          )}
        </div>

        {/* =========================================================================
            BARRA DE AÇÃO PRINCIPAL (RESPONSIVA E SEM COBRIR CONTEÚDO)
            ========================================================================= */}
        {!isViewOnly && !isArchived && (
          <div className="pt-2">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#151619] border border-neutral-200/80 dark:border-[#303238] shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isPending}
                  className="font-bold min-h-[44px] px-6 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs cursor-pointer"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando exercício...</span>
                    </span>
                  ) : mode === "create" ? (
                    "Salvar exercício"
                  ) : (
                    "Salvar alterações"
                  )}
                </Button>

                <Link
                  href={`/consultoria/${slug}/exercicios`}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  Cancelar
                </Link>
              </div>

              {mode === "edit" && status === "DRAFT" && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={handlePublish}
                  className="font-bold min-h-[44px] text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                >
                  Publicar Exercício
                </Button>
              )}

              {mode === "edit" && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={isPending}
                  onClick={handleDeleteClick}
                  className="font-semibold text-xs min-h-[44px]"
                >
                  Excluir Exercício
                </Button>
              )}
            </div>
          </div>
        )}
      </form>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#151619] border border-neutral-200 dark:border-[#303238] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Excluir Exercício
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              Tem certeza de que deseja excluir este exercício? Treinos que já utilizam este exercício manterão seus dados preservados via snapshot histórico, mas ele não poderá mais ser prescrito em novas rotinas.
            </p>
            {deleteError && (
              <Alert variant="danger" title="Erro">
                {deleteError}
              </Alert>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="font-bold"
              >
                {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
