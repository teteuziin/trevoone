"use client";

import React, { useState, useTransition } from "react";
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
} from "@/app/consultoria/[slug]/exercicios/actions";
import { FormField, Input, Textarea, Select } from "@/components/ui/form-controls";
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

const COMMON_MUSCLES = [
  "Peitoral",
  "Dorsal",
  "Trapézio",
  "Deltoide Anterior",
  "Deltoide Lateral",
  "Deltoide Posterior",
  "Quadríceps",
  "Isquiotibiais",
  "Glúteos",
  "Panturrilhas",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Abdômen",
  "Lombar",
  "Cardiorrespiratório",
];

const COMMON_EQUIPMENT = [
  "Halteres",
  "Barra",
  "Barra W",
  "Polia / Cabo",
  "Máquina Articulada",
  "Máquina com Placas",
  "Peso Corporal",
  "Elástico / Faixa",
  "Kettlebell",
  "Smith Machine",
  "Banco Regulável",
  "Outro",
];

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

  // Form state
  const [name, setName] = useState(initialData?.name || "");
  const [muscleGroupPrimary, setMuscleGroupPrimary] = useState(initialData?.muscleGroupPrimary || "Peitoral");
  const [muscleGroupsSecondary, setMuscleGroupsSecondary] = useState(
    initialData?.muscleGroupsSecondary ? initialData.muscleGroupsSecondary.join(", ") : ""
  );
  const [equipment, setEquipment] = useState(initialData?.equipment || "Halteres");
  const [movementPattern, setMovementPattern] = useState<MovementPattern | "">(
    (initialData?.movementPattern as MovementPattern) || ""
  );
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(
    (initialData?.difficultyLevel as DifficultyLevel) || "INTERMEDIATE"
  );
  const [description, setDescription] = useState(initialData?.description || "");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [executionTips, setExecutionTips] = useState(initialData?.executionTips || "");
  const [commonMistakes, setCommonMistakes] = useState(initialData?.commonMistakes || "");
  const [progressions, setProgressions] = useState(initialData?.progressions || "");
  const [regressions, setRegressions] = useState(initialData?.regressions || "");

  // Visibility state: Default is CREATOR_ONLY
  const [visibility, setVisibility] = useState<"CREATOR_ONLY" | "CONSULTANCY">(
    initialData?.visibility === "CONSULTANCY" ? "CONSULTANCY" : "CREATOR_ONLY"
  );
  const [showShareConfirmModal, setShowShareConfirmModal] = useState(false);

  // Feedback state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const status = initialData?.status || "DRAFT";
  const isArchived = status === "ARCHIVED";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewOnly) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const secondaryArray = muscleGroupsSecondary
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      if (mode === "create") {
        const res = await createConsultancyExerciseDraftAction(slug, {
          name,
          muscleGroupPrimary,
          muscleGroupsSecondary: secondaryArray.length > 0 ? secondaryArray : null,
          equipment,
          movementPattern: movementPattern || null,
          difficultyLevel,
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          executionTips: executionTips.trim() || null,
          commonMistakes: commonMistakes.trim() || null,
          progressions: progressions.trim() || null,
          regressions: regressions.trim() || null,
          visibility,
        });

        if (!res.ok || !res.data) {
          setErrorMessage(res.error || "Erro ao criar exercício.");
          return;
        }

        router.push(`/consultoria/${slug}/exercicios/${res.data.publicId}`);
      } else if (mode === "edit" && initialData) {
        const res = await updateConsultancyExerciseAction(slug, initialData.publicId, {
          name,
          muscleGroupPrimary,
          muscleGroupsSecondary: secondaryArray.length > 0 ? secondaryArray : null,
          equipment,
          movementPattern: movementPattern || null,
          difficultyLevel,
          description: description.trim() || null,
          instructions: instructions.trim() || null,
          executionTips: executionTips.trim() || null,
          commonMistakes: commonMistakes.trim() || null,
          progressions: progressions.trim() || null,
          regressions: regressions.trim() || null,
        });

        if (!res.ok) {
          setErrorMessage(res.error || "Erro ao salvar alterações.");
          return;
        }

        setSuccessMessage("Alterações salvas com sucesso.");
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

  const handleArchive = () => {
    if (!initialData || isPending || isViewOnly) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (
      !confirm(
        "Deseja realmente arquivar este exercício? Ele não aparecerá nas novas buscas da consultoria, mas prescrições históricas permanecerão intactas."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await archiveConsultancyExerciseAction(slug, initialData.publicId);
      if (!res.ok) {
        setErrorMessage(res.error || "Falha ao arquivar exercício.");
      } else {
        setSuccessMessage("Exercício arquivado com sucesso.");
        router.refresh();
      }
    });
  };

  const handleVisibilityToggle = (targetVisibility: "CREATOR_ONLY" | "CONSULTANCY") => {
    if (isViewOnly || !initialData) {
      setVisibility(targetVisibility);
      return;
    }

    if (targetVisibility === "CONSULTANCY") {
      // Check if attached media has any private media
      const hasPrivateMedia = initialData.media?.some((m) => m.mediaAsset.visibility === "CREATOR_ONLY");
      if (hasPrivateMedia) {
        setShowShareConfirmModal(true);
        return;
      }
    }

    // Direct transition
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
    <div className="space-y-8">
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
          <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Compartilhar Mídias Privadas
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
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
                className="font-bold"
              >
                {isPending ? "Processando..." : "Confirmar e Compartilhar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* =========================================================================
            SECTION 1: INFORMAÇÕES BÁSICAS
            ========================================================================= */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                Informações Principais
              </h2>
              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                Nome, grupo muscular e parâmetros biomecânicos do exercício.
              </p>
            </div>
            {mode !== "create" && initialData && (
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs text-[var(--text-tertiary)]">Status:</span>
                {status === "PUBLISHED" && <Badge variant="success">Publicado</Badge>}
                {status === "DRAFT" && <Badge variant="warning">Rascunho</Badge>}
                {status === "ARCHIVED" && <Badge variant="neutral">Arquivado</Badge>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <FormField label="Nome do Exercício" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Agachamento Búlgaro com Halteres"
                  disabled={isPending || isViewOnly || isArchived}
                  required
                />
              </FormField>
            </div>

            <FormField label="Grupo Muscular Principal" required>
              <Select
                value={muscleGroupPrimary}
                onChange={(e) => setMuscleGroupPrimary(e.target.value)}
                disabled={isPending || isViewOnly || isArchived}
                required
              >
                {COMMON_MUSCLES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Equipamento" required>
              <Select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                disabled={isPending || isViewOnly || isArchived}
                required
              >
                {COMMON_EQUIPMENT.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Padrão de Movimento" optional>
              <Select
                value={movementPattern}
                onChange={(e) => setMovementPattern(e.target.value as MovementPattern | "")}
                disabled={isPending || isViewOnly || isArchived}
              >
                <option value="">Selecione o padrão (opcional)</option>
                {MOVEMENT_PATTERNS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Nível de Dificuldade" required>
              <Select
                value={difficultyLevel}
                onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                disabled={isPending || isViewOnly || isArchived}
              >
                <option value="BEGINNER">Iniciante</option>
                <option value="INTERMEDIATE">Intermediário</option>
                <option value="ADVANCED">Avançado</option>
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
                  placeholder="Ex: Glúteos, Isquiotibiais"
                  disabled={isPending || isViewOnly || isArchived}
                />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField label="Descrição Breve" optional>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivo principal e notas gerais do exercício."
                  rows={2}
                  disabled={isPending || isViewOnly || isArchived}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: EXECUÇÃO TÉCNICA E PRESCRIÇÃO
            ========================================================================= */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
              Execução Técnica e Orientações
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Instruções para o aluno seguir durante os treinos prescritos.
            </p>
          </div>

          <div className="space-y-5">
            <FormField label="Instruções Passo a Passo" optional>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="1. Posicione o peito do pé no banco atrás de você...&#10;2. Mantenha o tronco levemente inclinado...&#10;3. Desça até a coxa paralela ao chão..."
                rows={4}
                disabled={isPending || isViewOnly || isArchived}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Dicas de Execução (Cues)" optional>
                <Textarea
                  value={executionTips}
                  onChange={(e) => setExecutionTips(e.target.value)}
                  placeholder="Ex: Pense em descer o quadril reto; joelho alinhado com o 2º dedo do pé."
                  rows={3}
                  disabled={isPending || isViewOnly || isArchived}
                />
              </FormField>

              <FormField label="Erros Comuns a Evitar" optional>
                <Textarea
                  value={commonMistakes}
                  onChange={(e) => setCommonMistakes(e.target.value)}
                  placeholder="Ex: Tirar o calcanhar da frente do chão; projetar o joelho excessivamente para dentro."
                  rows={3}
                  disabled={isPending || isViewOnly || isArchived}
                />
              </FormField>

              <FormField label="Progressões Recomendadas" optional>
                <Textarea
                  value={progressions}
                  onChange={(e) => setProgressions(e.target.value)}
                  placeholder="Ex: Aumentar a carga dos halteres; adicionar pausa de 2 segundos no ponto mais baixo."
                  rows={2}
                  disabled={isPending || isViewOnly || isArchived}
                />
              </FormField>

              <FormField label="Regressões Recomendadas" optional>
                <Textarea
                  value={regressions}
                  onChange={(e) => setRegressions(e.target.value)}
                  placeholder="Ex: Agachamento búlgaro com peso corporal ou agachamento split estático no chão."
                  rows={2}
                  disabled={isPending || isViewOnly || isArchived}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: VISIBILIDADE E COMPARTILHAMENTO
            ========================================================================= */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
              Visibilidade do Conteúdo
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Defina quem pode visualizar e prescrever este exercício na consultoria.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                visibility === "CREATOR_ONLY"
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] shadow-2xs"
                  : "border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
              } ${isViewOnly ? "cursor-not-allowed opacity-75" : ""}`}
            >
              <input
                type="radio"
                name="visibility"
                value="CREATOR_ONLY"
                checked={visibility === "CREATOR_ONLY"}
                onChange={() => handleVisibilityToggle("CREATOR_ONLY")}
                disabled={isPending || isViewOnly || isArchived}
                className="mt-1 accent-[var(--brand)]"
              />
              <div>
                <span className="block text-sm font-bold text-[var(--text-primary)]">
                  Só para mim (Privado)
                </span>
                <span className="block text-xs text-[var(--text-secondary)] mt-0.5">
                  Visível exclusivamente para você prescrever aos seus alunos (e para a coordenação da consultoria).
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                visibility === "CONSULTANCY"
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] shadow-2xs"
                  : "border-[var(--border-default)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"
              } ${isViewOnly ? "cursor-not-allowed opacity-75" : ""}`}
            >
              <input
                type="radio"
                name="visibility"
                value="CONSULTANCY"
                checked={visibility === "CONSULTANCY"}
                onChange={() => handleVisibilityToggle("CONSULTANCY")}
                disabled={isPending || isViewOnly || isArchived}
                className="mt-1 accent-[var(--brand)]"
              />
              <div>
                <span className="block text-sm font-bold text-[var(--text-primary)]">
                  Compartilhar com a consultoria
                </span>
                <span className="block text-xs text-[var(--text-secondary)] mt-0.5">
                  Disponível para todos os personals da equipe visualizarem e utilizarem em suas prescrições.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        {!isViewOnly && !isArchived && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              className="font-bold min-w-[160px]"
            >
              {isPending
                ? "Salvando..."
                : mode === "create"
                ? visibility === "CONSULTANCY"
                  ? "Criar Exercício Compartilhado"
                  : "Criar Exercício Privado"
                : "Salvar Alterações"}
            </Button>

            {mode === "edit" && status === "DRAFT" && (
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={handlePublish}
                className="font-bold text-[var(--brand-foreground)] border-[var(--brand)]"
              >
                Publicar Exercício
              </Button>
            )}

            {mode === "edit" && (
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={handleArchive}
                className="text-xs text-[var(--danger)] hover:bg-[var(--danger-soft)] ml-auto"
              >
                Arquivar Exercício
              </Button>
            )}
          </div>
        )}
      </form>

      {/* =========================================================================
          SECTION 4: MEDIA MANAGER (Available in Edit & View Modes)
          ========================================================================= */}
      {mode !== "create" && initialData && (
        <div className="pt-4">
          <ConsultancyExerciseMediaManager
            slug={slug}
            consultancyPublicId={consultancyPublicId}
            exercisePublicId={initialData.publicId}
            exerciseVisibility={visibility}
            mediaList={initialData.media || []}
            readOnly={isViewOnly || isArchived}
            onMediaChange={() => router.refresh()}
          />
        </div>
      )}
    </div>
  );
}
