"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ExerciseItemDto,
  DifficultyLevel,
  MovementPattern,
} from "@/lib/training-v2/types";
import {
  createGlobalExerciseDraftAction,
  updateGlobalExerciseAction,
  publishGlobalExerciseAction,
  archiveGlobalExerciseAction,
} from "@/app/admin/exercicios/actions";
import { FormField, Input, Textarea, Select } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { ExerciseMediaManager } from "./exercise-media-manager";

interface ExerciseFormProps {
  mode: "create" | "edit";
  initialData?: ExerciseItemDto;
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

export function ExerciseForm({ mode, initialData }: ExerciseFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
  const [rightsNotes, setRightsNotes] = useState(initialData?.rightsNotes || "");

  // Feedback state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const status = initialData?.status || "DRAFT";
  const isArchived = status === "ARCHIVED";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const secondaryArray = muscleGroupsSecondary
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      if (mode === "create") {
        const res = await createGlobalExerciseDraftAction({
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
          rightsNotes: rightsNotes.trim() || null,
        });

        if (!res.ok || !res.data) {
          setErrorMessage(res.error || "Erro ao criar rascunho de exercício.");
          return;
        }

        router.push(`/admin/exercicios/${res.data.publicId}`);
      } else if (mode === "edit" && initialData) {
        const res = await updateGlobalExerciseAction(initialData.publicId, {
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
          rightsNotes: rightsNotes.trim() || null,
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
    if (!initialData || isPending) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!confirm("Deseja publicar este exercício oficialmente na Biblioteca Global Trevo One?")) {
      return;
    }

    startTransition(async () => {
      const res = await publishGlobalExerciseAction(initialData.publicId);
      if (!res.ok) {
        setErrorMessage(res.error || "Falha na validação de publicação do exercício.");
      } else {
        setSuccessMessage("Exercício publicado com sucesso na Biblioteca Global!");
        router.refresh();
      }
    });
  };

  const handleArchive = () => {
    if (!initialData || isPending) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (
      !confirm(
        "Deseja realmente arquivar este exercício? Ele não aparecerá nas novas prescrições dos profissionais, mas os treinos históricos que o utilizam permanecerão intactos."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await archiveGlobalExerciseAction(initialData.publicId);
      if (!res.ok) {
        setErrorMessage(res.error || "Falha ao arquivar exercício.");
      } else {
        setSuccessMessage("Exercício arquivado com sucesso.");
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
                Identificação e taxonomia biomecânica oficial do exercício.
              </p>
            </div>
            {mode === "edit" && (
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
                  placeholder="Ex: Supino Reto com Halteres"
                  disabled={isPending || isArchived}
                  required
                />
              </FormField>
            </div>

            <FormField label="Grupo Muscular Principal" required>
              <Select
                value={muscleGroupPrimary}
                onChange={(e) => setMuscleGroupPrimary(e.target.value)}
                disabled={isPending || isArchived}
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
                disabled={isPending || isArchived}
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
                disabled={isPending || isArchived}
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
                disabled={isPending || isArchived}
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
                helperText="Separe os grupos musculares por vírgula (ex: Tríceps, Deltoide Anterior)"
              >
                <Input
                  value={muscleGroupsSecondary}
                  onChange={(e) => setMuscleGroupsSecondary(e.target.value)}
                  placeholder="Ex: Tríceps, Deltoide Anterior"
                  disabled={isPending || isArchived}
                />
              </FormField>
            </div>

            <div className="sm:col-span-2">
              <FormField label="Descrição Breve" optional>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Resumo contextual sobre a aplicabilidade do exercício."
                  rows={2}
                  disabled={isPending || isArchived}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: EXECUÇÃO E ORIENTAÇÕES TÉCNICAS
            ========================================================================= */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-7 shadow-xs space-y-5">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
              Execução Técnica e Prescrição
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Orientações para o profissional prescrever com precisão e o aluno executar com segurança.
            </p>
          </div>

          <div className="space-y-5">
            <FormField
              label="Instruções Passo a Passo"
              optional
              helperText="Descreva o posicionamento corporal, pegada, trajetória da carga e respiração."
            >
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="1. Deite no banco mantendo as escápulas aduzidas...&#10;2. Desça os halteres com controle...&#10;3. Empurre expirando o ar..."
                rows={4}
                disabled={isPending || isArchived}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Dicas de Execução (Cues)" optional>
                <Textarea
                  value={executionTips}
                  onChange={(e) => setExecutionTips(e.target.value)}
                  placeholder="Ex: Pense em esmagar o peito no topo; pés firmes no chão."
                  rows={3}
                  disabled={isPending || isArchived}
                />
              </FormField>

              <FormField label="Erros Comuns a Evitar" optional>
                <Textarea
                  value={commonMistakes}
                  onChange={(e) => setCommonMistakes(e.target.value)}
                  placeholder="Ex: Deixar os cotovelos alinhados a 90 graus com os ombros."
                  rows={3}
                  disabled={isPending || isArchived}
                />
              </FormField>

              <FormField label="Progressões Recomendadas" optional>
                <Textarea
                  value={progressions}
                  onChange={(e) => setProgressions(e.target.value)}
                  placeholder="Ex: Supino Reto com Barra, Supino com Pausa isométrica."
                  rows={2}
                  disabled={isPending || isArchived}
                />
              </FormField>

              <FormField label="Regressões Recomendadas" optional>
                <Textarea
                  value={regressions}
                  onChange={(e) => setRegressions(e.target.value)}
                  placeholder="Ex: Supino na Máquina Sentado, Flexão de Braço no Chão."
                  rows={2}
                  disabled={isPending || isArchived}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 3: GOVERNANÇA E DIREITOS AUTORAIS
            ========================================================================= */}
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-5 sm:p-7 shadow-xs space-y-4">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
              Governança e Fonte de Mídia
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Campo de uso estritamente interno e administrativo (não exibido para alunos).
            </p>
          </div>

          <FormField
            label="Notas de Direitos / Fonte Editorial"
            optional
            helperText="Registre a produtora, licença, modelo ou lote de gravação da mídia oficial."
          >
            <Input
              value={rightsNotes}
              onChange={(e) => setRightsNotes(e.target.value)}
              placeholder="Ex: Produção Trevo One 2026 - Lote 01 Gravado no Studio Alpha"
              disabled={isPending || isArchived}
            />
          </FormField>
        </div>

        {/* Action Buttons */}
        {!isArchived && (
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
                ? "Criar Rascunho"
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
                Publicar Exercício Oficial
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
          SECTION 4: MEDIA MANAGER (Only in Edit Mode)
          ========================================================================= */}
      {mode === "edit" && initialData && (
        <div className="pt-4">
          <ExerciseMediaManager
            exercisePublicId={initialData.publicId}
            mediaList={initialData.media || []}
            onMediaChange={() => router.refresh()}
            disabled={isPending || isArchived}
          />
        </div>
      )}
    </div>
  );
}
