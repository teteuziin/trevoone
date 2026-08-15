"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  DraftTrainingPlanEditorDto,
  TrainingExerciseItemDto,
  TrainingBlockType,
  TrainingWorkoutDto,
  TrainingWorkoutSectionDto,
  TrainingWorkoutBlockDto,
  TrainingBlockExerciseDto,
  ValidationIssue,
} from "@/lib/consultancies/training";
import { TrainingPlanRenderer } from "./training-plan-renderer";
import {
  updateDraftTrainingPlanMetadataAction,
  createTrainingWorkoutAction,
  updateTrainingWorkoutAction,
  moveTrainingWorkoutAction,
  removeTrainingWorkoutAction,
  createTrainingWorkoutSectionAction,
  updateTrainingWorkoutSectionAction,
  moveTrainingWorkoutSectionAction,
  removeTrainingWorkoutSectionAction,
  createTrainingWorkoutBlockAction,
  updateTrainingWorkoutBlockAction,
  moveTrainingWorkoutBlockAction,
  removeTrainingWorkoutBlockAction,
  addTrainingBlockExerciseFromLibraryAction,
  addCustomTrainingBlockExerciseAction,
  updateTrainingBlockExerciseAction,
  moveTrainingBlockExerciseAction,
  removeTrainingBlockExerciseAction,
  validateTrainingPlanActivationAction,
  activateTrainingPlanAction,
} from "@/app/consultoria/[slug]/personal/treinos/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea, Select } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/empty-state";

type Props = {
  consultancySlug: string;
  plan: DraftTrainingPlanEditorDto;
  activeLibraryExercises: TrainingExerciseItemDto[];
};

const WEEKDAY_NAMES = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

const BLOCK_TYPE_MAP: Record<string, { label: string; variant: "neutral" | "brand" | "success" | "warning" }> = {
  SINGLE: { label: "Exercício Isolado", variant: "neutral" },
  BI_SET: { label: "Bi-Set", variant: "brand" },
  TRI_SET: { label: "Tri-Set", variant: "brand" },
  SUPERSET: { label: "Superset", variant: "brand" },
  CIRCUIT: { label: "Circuito", variant: "warning" },
};

export function TrainingPlanEditor({
  consultancySlug,
  plan,
  activeLibraryExercises,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Mobile Tab toggle: "editor" | "preview"
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  // Feedback banner state
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal states
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<TrainingWorkoutDto | null>(null);

  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [currentWorkoutIdForSection, setCurrentWorkoutIdForSection] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<TrainingWorkoutSectionDto | null>(null);

  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [currentSectionIdForBlock, setCurrentSectionIdForBlock] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<TrainingWorkoutBlockDto | null>(null);

  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [currentBlockIdForExercise, setCurrentBlockIdForExercise] = useState<string | null>(null);
  const [exerciseMode, setExerciseMode] = useState<"library" | "custom">("library");
  const [editingExerciseItem, setEditingExerciseItem] = useState<TrainingBlockExerciseDto | null>(null);

  // Activation & Validation Modal state
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [isValidatingReadiness, setIsValidatingReadiness] = useState(false);
  const [activationIssues, setActivationIssues] = useState<ValidationIssue[]>([]);

  // Form Fields State - Metadata
  const [metaTitle, setMetaTitle] = useState(plan.title);
  const [metaSubtitle, setMetaSubtitle] = useState(plan.subtitle || "");
  const [metaDesc, setMetaDesc] = useState(plan.description || "");
  const [metaStart, setMetaStart] = useState(plan.startsOn || "");
  const [metaEnd, setMetaEnd] = useState(plan.endsOn || "");

  // Form Fields State - Workout
  const [wTitle, setWTitle] = useState("");
  const [wSubtitle, setWSubtitle] = useState("");
  const [wWeekday, setWWeekday] = useState<number | "">("");
  const [wNotes, setWNotes] = useState("");

  // Form Fields State - Section
  const [sTitle, setSTitle] = useState("");
  const [sDesc, setSDesc] = useState("");

  // Form Fields State - Block
  const [bType, setBType] = useState<TrainingBlockType>("SINGLE");
  const [bTitle, setBTitle] = useState("");
  const [bRounds, setBRounds] = useState<number | "">("");
  const [bRestBetween, setBRestBetween] = useState<number | "">("");
  const [bRestAfter, setBRestAfter] = useState<number | "">("");
  const [bInstructions, setBInstructions] = useState("");

  // Form Fields State - Exercise / Prescription
  const [selectedLibraryPublicId, setSelectedLibraryPublicId] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [exName, setExName] = useState("");
  const [exMuscle, setExMuscle] = useState("");
  const [exEquip, setExEquip] = useState("");
  const [exDesc, setExDesc] = useState("");
  const [exInst, setExInst] = useState("");
  const [exSets, setExSets] = useState<number | "">("");
  const [exReps, setExReps] = useState("");
  const [exRest, setExRest] = useState<number | "">("");
  const [exLoad, setExLoad] = useState("");
  const [exTech, setExTech] = useState("");
  const [exNotes, setExNotes] = useState("");
  const [exVideoUrl, setExVideoUrl] = useState("");

  // --- Handlers: Metadata ---
  function handleUpdateMetadata(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const formData = new FormData();
    formData.set("slug", consultancySlug);
    formData.set("planPublicId", plan.publicId);
    formData.set("title", metaTitle);
    formData.set("subtitle", metaSubtitle);
    formData.set("description", metaDesc);
    formData.set("startsOn", metaStart);
    formData.set("endsOn", metaEnd);

    startTransition(async () => {
      const res = await updateDraftTrainingPlanMetadataAction({}, formData);
      if (res.success) {
        setFeedback({ type: "success", message: res.message || "Informações atualizadas!" });
        setIsMetaModalOpen(false);
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Erro ao atualizar informações." });
      }
    });
  }

  // --- Handlers: Workouts ---
  function openNewWorkoutModal() {
    setEditingWorkout(null);
    setWTitle("");
    setWSubtitle("");
    setWWeekday("");
    setWNotes("");
    setIsWorkoutModalOpen(true);
  }

  function openEditWorkoutModal(workout: TrainingWorkoutDto) {
    setEditingWorkout(workout);
    setWTitle(workout.title);
    setWSubtitle(workout.subtitle || "");
    setWWeekday(workout.scheduledWeekday !== null ? workout.scheduledWeekday : "");
    setWNotes(workout.notes || "");
    setIsWorkoutModalOpen(true);
  }

  function handleSaveWorkout(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      if (editingWorkout) {
        const res = await updateTrainingWorkoutAction(
          consultancySlug,
          plan.publicId,
          editingWorkout.publicId,
          {
            title: wTitle,
            subtitle: wSubtitle || null,
            scheduledWeekday: wWeekday !== "" ? Number(wWeekday) : null,
            notes: wNotes || null,
          }
        );
        if (res.success) {
          setIsWorkoutModalOpen(false);
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao salvar treino." });
        }
      } else {
        const res = await createTrainingWorkoutAction(
          consultancySlug,
          plan.publicId,
          {
            title: wTitle,
            subtitle: wSubtitle || null,
            scheduledWeekday: wWeekday !== "" ? Number(wWeekday) : null,
            notes: wNotes || null,
          }
        );
        if (res.success) {
          setIsWorkoutModalOpen(false);
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao criar treino." });
        }
      }
    });
  }

  function handleMoveWorkout(workoutPublicId: string, direction: "UP" | "DOWN") {
    startTransition(async () => {
      const res = await moveTrainingWorkoutAction(
        consultancySlug,
        plan.publicId,
        workoutPublicId,
        direction
      );
      if (res.success) router.refresh();
      else setFeedback({ type: "error", message: res.error || "Erro ao reordenar treino." });
    });
  }

  function handleRemoveWorkout(workoutPublicId: string) {
    if (!confirm("Deseja remover este treino e todas as suas divisões e exercícios?")) return;
    startTransition(async () => {
      const res = await removeTrainingWorkoutAction(
        consultancySlug,
        plan.publicId,
        workoutPublicId
      );
      if (res.success) router.refresh();
      else setFeedback({ type: "error", message: res.error || "Erro ao remover treino." });
    });
  }

  // --- Handlers: Sections ---
  function openNewSectionModal(workoutPublicId: string) {
    setCurrentWorkoutIdForSection(workoutPublicId);
    setEditingSection(null);
    setSTitle("");
    setSDesc("");
    setIsSectionModalOpen(true);
  }

  function openEditSectionModal(section: TrainingWorkoutSectionDto) {
    setEditingSection(section);
    setSTitle(section.title);
    setSDesc(section.description || "");
    setIsSectionModalOpen(true);
  }

  function handleSaveSection(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      if (editingSection) {
        const res = await updateTrainingWorkoutSectionAction(
          consultancySlug,
          plan.publicId,
          editingSection.publicId,
          {
            title: sTitle,
            description: sDesc || null,
          }
        );
        if (res.success) {
          setIsSectionModalOpen(false);
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao salvar seção." });
        }
      } else {
        if (!currentWorkoutIdForSection) return;
        const res = await createTrainingWorkoutSectionAction(
          consultancySlug,
          plan.publicId,
          currentWorkoutIdForSection,
          {
            title: sTitle,
            description: sDesc || null,
          }
        );
        if (res.success) {
          setIsSectionModalOpen(false);
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao criar seção." });
        }
      }
    });
  }

  function handleMoveSection(sectionPublicId: string, direction: "UP" | "DOWN") {
    startTransition(async () => {
      const res = await moveTrainingWorkoutSectionAction(
        consultancySlug,
        plan.publicId,
        sectionPublicId,
        direction
      );
      if (res.success) router.refresh();
      else setFeedback({ type: "error", message: res.error || "Erro ao reordenar seção." });
    });
  }

  function handleRemoveSection(sectionPublicId: string) {
    if (!confirm("Deseja remover esta seção muscular e todos os seus blocos?")) return;
    startTransition(async () => {
      const res = await removeTrainingWorkoutSectionAction(
        consultancySlug,
        plan.publicId,
        sectionPublicId
      );
      if (res.success) router.refresh();
      else setFeedback({ type: "error", message: res.error || "Erro ao remover seção." });
    });
  }

  // --- Handlers: Blocks ---
  function openNewBlockModal(sectionPublicId: string) {
    setCurrentSectionIdForBlock(sectionPublicId);
    setEditingBlock(null);
    setBType("SINGLE");
    setBTitle("");
    setBRounds("");
    setBRestBetween("");
    setBRestAfter("");
    setBInstructions("");
    setIsBlockModalOpen(true);
  }

  function openEditBlockModal(block: TrainingWorkoutBlockDto) {
    setEditingBlock(block);
    setBType(block.blockType as TrainingBlockType);
    setBTitle(block.title || "");
    setBRounds(block.rounds !== null ? block.rounds : "");
    setBRestBetween(block.restBetweenExercisesSeconds !== null ? block.restBetweenExercisesSeconds : "");
    setBRestAfter(block.restAfterBlockSeconds !== null ? block.restAfterBlockSeconds : "");
    setBInstructions(block.instructions || "");
    setIsBlockModalOpen(true);
  }

  function handleSaveBlock(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      if (editingBlock) {
        const res = await updateTrainingWorkoutBlockAction(
          consultancySlug,
          plan.publicId,
          editingBlock.publicId,
          {
            blockType: bType,
            title: bTitle || null,
            rounds: bRounds !== "" ? Number(bRounds) : null,
            restBetweenExercisesSeconds: bRestBetween !== "" ? Number(bRestBetween) : null,
            restAfterBlockSeconds: bRestAfter !== "" ? Number(bRestAfter) : null,
            instructions: bInstructions || null,
          }
        );
        if (res.success) {
          setIsBlockModalOpen(false);
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao salvar bloco." });
        }
      } else {
        if (!currentSectionIdForBlock) return;
        const res = await createTrainingWorkoutBlockAction(
          consultancySlug,
          plan.publicId,
          currentSectionIdForBlock,
          {
            blockType: bType,
            title: bTitle || null,
            rounds: bRounds !== "" ? Number(bRounds) : null,
            restBetweenExercisesSeconds: bRestBetween !== "" ? Number(bRestBetween) : null,
            restAfterBlockSeconds: bRestAfter !== "" ? Number(bRestAfter) : null,
            instructions: bInstructions || null,
          }
        );
        if (res.success) {
          setIsBlockModalOpen(false);
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao criar bloco." });
        }
      }
    });
  }

  function handleMoveBlock(blockPublicId: string, direction: "UP" | "DOWN") {
    startTransition(async () => {
      const res = await moveTrainingWorkoutBlockAction(
        consultancySlug,
        plan.publicId,
        blockPublicId,
        direction
      );
      if (res.success) router.refresh();
      else setFeedback({ type: "error", message: res.error || "Erro ao reordenar bloco." });
    });
  }

  function handleRemoveBlock(blockPublicId: string) {
    if (!confirm("Deseja remover este bloco e os exercícios contidos nele?")) return;
    startTransition(async () => {
      const res = await removeTrainingWorkoutBlockAction(
        consultancySlug,
        plan.publicId,
        blockPublicId
      );
      if (res.success) router.refresh();
      else setFeedback({ type: "error", message: res.error || "Erro ao remover bloco." });
    });
  }

  // --- Handlers: Exercises / Prescriptions ---
  function openAddExerciseModal(blockPublicId: string) {
    setCurrentBlockIdForExercise(blockPublicId);
    setEditingExerciseItem(null);
    setExerciseMode("library");
    setSelectedLibraryPublicId(activeLibraryExercises[0]?.publicId || "");
    setLibrarySearch("");
    setExName("");
    setExMuscle("");
    setExEquip("");
    setExDesc("");
    setExInst("");
    setExSets(3);
    setExReps("12");
    setExRest(60);
    setExLoad("");
    setExTech("");
    setExNotes("");
    setExVideoUrl("");
    setIsAddExerciseModalOpen(true);
  }

  function openEditExerciseModal(exercise: TrainingBlockExerciseDto) {
    setEditingExerciseItem(exercise);
    setExerciseMode("custom");
    setExName(exercise.exerciseName);
    setExMuscle(exercise.muscleGroup || "");
    setExEquip(exercise.equipment || "");
    setExDesc(exercise.description || "");
    setExInst(exercise.instructions || "");
    setExSets(exercise.sets !== null ? exercise.sets : "");
    setExReps(exercise.repetitionsText || "");
    setExRest(exercise.restSeconds !== null ? exercise.restSeconds : "");
    setExLoad(exercise.loadGuidance || "");
    setExTech(exercise.technique || "");
    setExNotes(exercise.notes || "");
    setExVideoUrl(exercise.videoUrl || "");
    setIsAddExerciseModalOpen(true);
  }

  function handleSaveExercise(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const prescriptionPayload = {
      sets: exSets !== "" ? Number(exSets) : null,
      repetitionsText: exReps || null,
      restSeconds: exRest !== "" ? Number(exRest) : null,
      loadGuidance: exLoad || null,
      technique: exTech || null,
      notes: exNotes || null,
      videoUrl: exVideoUrl || null,
    };

    startTransition(async () => {
      if (editingExerciseItem) {
        const res = await updateTrainingBlockExerciseAction(
          consultancySlug,
          plan.publicId,
          editingExerciseItem.publicId,
          {
            nameSnapshot: exName,
            descriptionSnapshot: exDesc || null,
            muscleGroupSnapshot: exMuscle || null,
            equipmentSnapshot: exEquip || null,
            instructionsSnapshot: exInst || null,
            ...prescriptionPayload,
          }
        );
        if (res.success) {
          setIsAddExerciseModalOpen(false);
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao atualizar exercício." });
        }
      } else {
        if (!currentBlockIdForExercise) return;
        if (exerciseMode === "library") {
          if (!selectedLibraryPublicId) {
            setFeedback({ type: "error", message: "Selecione um exercício da biblioteca." });
            return;
          }
          const res = await addTrainingBlockExerciseFromLibraryAction(
            consultancySlug,
            plan.publicId,
            currentBlockIdForExercise,
            selectedLibraryPublicId,
            prescriptionPayload
          );
          if (res.success) {
            setIsAddExerciseModalOpen(false);
            router.refresh();
          } else {
            setFeedback({ type: "error", message: res.error || "Erro ao adicionar exercício." });
          }
        } else {
          const res = await addCustomTrainingBlockExerciseAction(
            consultancySlug,
            plan.publicId,
            currentBlockIdForExercise,
            {
              name: exName,
              description: exDesc || null,
              muscleGroup: exMuscle || null,
              equipment: exEquip || null,
              instructions: exInst || null,
              ...prescriptionPayload,
            }
          );
          if (res.success) {
            setIsAddExerciseModalOpen(false);
            router.refresh();
          } else {
            setFeedback({ type: "error", message: res.error || "Erro ao adicionar exercício." });
          }
        }
      }
    });
  }

  function handleMoveExercise(exercisePublicId: string, direction: "UP" | "DOWN") {
    startTransition(async () => {
      const res = await moveTrainingBlockExerciseAction(
        consultancySlug,
        plan.publicId,
        exercisePublicId,
        direction
      );
      if (res.success) router.refresh();
      else setFeedback({ type: "error", message: res.error || "Erro ao reordenar exercício." });
    });
  }

  function handleRemoveExercise(exercisePublicId: string) {
    if (!confirm("Deseja remover este exercício da prescrição?")) return;
    startTransition(async () => {
      const res = await removeTrainingBlockExerciseAction(
        consultancySlug,
        plan.publicId,
        exercisePublicId
      );
      if (res.success) router.refresh();
      else setFeedback({ type: "error", message: res.error || "Erro ao remover exercício." });
    });
  }

  // --- Handlers: Preflight & Activation ---
  async function handleOpenActivation() {
    setFeedback(null);
    setIsValidatingReadiness(true);

    try {
      const res = await validateTrainingPlanActivationAction(consultancySlug, plan.publicId);
      setIsValidatingReadiness(false);

      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "Não foi possível validar o plano." });
        return;
      }

      if (res.valid) {
        setActivationIssues([]);
      } else {
        setActivationIssues(res.issues || []);
      }
      setIsActivationModalOpen(true);
    } catch {
      setIsValidatingReadiness(false);
      setFeedback({ type: "error", message: "Erro inesperado ao validar prontidão do plano." });
    }
  }

  function handleConfirmActivation() {
    startTransition(async () => {
      const res = await activateTrainingPlanAction(consultancySlug, plan.publicId);
      if (res.success) {
        setIsActivationModalOpen(false);
        router.push(`/consultoria/${consultancySlug}/personal/treinos?status=ACTIVE`);
      } else {
        if (res.issues && res.issues.length > 0) {
          setActivationIssues(res.issues);
        } else {
          setIsActivationModalOpen(false);
          setFeedback({ type: "error", message: res.error || "Erro ao ativar plano de treino." });
        }
      }
    });
  }

  const filteredLibrary = activeLibraryExercises.filter((item) => {
    if (!librarySearch.trim()) return true;
    const q = librarySearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.muscleGroup && item.muscleGroup.toLowerCase().includes(q)) ||
      (item.equipment && item.equipment.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 pb-1">
            <Link
              href={`/consultoria/${consultancySlug}/personal/treinos`}
              className="inline-flex items-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← Voltar aos planos
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              {plan.title}
            </h1>
            <Badge variant="warning" size="sm">
              Rascunho
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Aluno: <span className="font-semibold text-[var(--text-primary)]">{plan.studentName}</span> ({plan.studentEmail})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenActivation}
            disabled={isPending || isValidatingReadiness}
            isLoading={isValidatingReadiness}
          >
            Disponibilizar para o aluno
          </Button>

          {/* Mobile Tab Toggle */}
          <div className="flex lg:hidden items-center p-1 bg-[var(--surface-hover)] rounded-xl border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "editor"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Editar Ficha
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "preview"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Prévia do Aluno
            </button>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          aria-live="polite"
          className={`p-3.5 rounded-xl text-xs font-semibold border ${
            feedback.type === "success"
              ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border-[var(--brand-soft-border)]"
              : "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border-[var(--danger-soft-border)]"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Main 2-Column or Tabbed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Editor */}
        <div
          className={`space-y-6 lg:col-span-6 xl:col-span-7 ${
            activeTab === "editor" ? "block" : "hidden lg:block"
          }`}
        >
          {/* Metadata Overview Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Informações do Plano
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsMetaModalOpen(true)}
              >
                Editar Informações
              </Button>
            </div>
            {plan.subtitle && (
              <p className="text-xs text-[var(--text-secondary)] font-medium">{plan.subtitle}</p>
            )}
            {plan.description && (
              <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{plan.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
              <span>
                Início: <strong className="text-[var(--text-primary)]">{plan.startsOn ? new Date(plan.startsOn + "T00:00:00").toLocaleDateString("pt-BR") : "Não definido"}</strong>
              </span>
              <span>
                Término: <strong className="text-[var(--text-primary)]">{plan.endsOn ? new Date(plan.endsOn + "T00:00:00").toLocaleDateString("pt-BR") : "Não definido"}</strong>
              </span>
            </div>
          </div>

          {/* Workouts Container */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                Treinos Prescritos ({plan.workouts.length})
              </h2>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={openNewWorkoutModal}
              >
                + Adicionar Treino
              </Button>
            </div>

            {plan.workouts.length === 0 ? (
              <EmptyState
                title="Nenhum treino adicionado neste plano"
                description="Adicione o primeiro treino (ex: Treino A - Peitoral e Tríceps) para estruturar a ficha."
                action={
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={openNewWorkoutModal}
                  >
                    Criar Primeiro Treino
                  </Button>
                }
              />
            ) : (
              plan.workouts.map((workout, wIdx) => (
                <div
                  key={workout.publicId}
                  className="p-4 sm:p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4"
                >
                  {/* Workout Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--surface)] font-bold text-xs flex items-center justify-center">
                          {String.fromCharCode(65 + wIdx)}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                          {workout.title}
                        </h3>
                        {workout.scheduledWeekday && (
                          <Badge variant="neutral" size="sm">
                            {WEEKDAY_NAMES[workout.scheduledWeekday - 1]}
                          </Badge>
                        )}
                      </div>
                      {workout.subtitle && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{workout.subtitle}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={wIdx === 0 || isPending}
                        onClick={() => handleMoveWorkout(workout.publicId, "UP")}
                        className="p-1 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 rounded hover:bg-[var(--surface-hover)] transition-colors"
                        title="Mover treino para cima"
                        aria-label="Mover treino para cima"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={wIdx === plan.workouts.length - 1 || isPending}
                        onClick={() => handleMoveWorkout(workout.publicId, "DOWN")}
                        className="p-1 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 rounded hover:bg-[var(--surface-hover)] transition-colors"
                        title="Mover treino para baixo"
                        aria-label="Mover treino para baixo"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditWorkoutModal(workout)}
                        className="px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--surface-hover)] transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveWorkout(workout.publicId)}
                        className="px-2 py-1 text-xs font-semibold text-[var(--danger)] hover:text-[var(--danger-foreground)] rounded hover:bg-[var(--danger-soft)] transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  {/* Sections List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        Divisões / Seções ({workout.sections.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => openNewSectionModal(workout.publicId)}
                        className="text-xs font-bold text-[var(--brand-foreground)] hover:underline"
                      >
                        + Nova Seção
                      </button>
                    </div>

                    {workout.sections.length === 0 ? (
                      <p className="text-xs text-[var(--text-tertiary)] italic py-2">
                        Nenhuma seção nesta divisão (ex: Aquecimento, Principal, etc).
                      </p>
                    ) : (
                      workout.sections.map((section, sIdx) => (
                        <div
                          key={section.publicId}
                          className="p-3.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-xs font-bold text-[var(--text-primary)]">
                                {section.title}
                              </h5>
                              {section.description && (
                                <p className="text-[11px] text-[var(--text-secondary)]">{section.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={sIdx === 0 || isPending}
                                onClick={() => handleMoveSection(section.publicId, "UP")}
                                className="p-0.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                                title="Mover seção para cima"
                                aria-label="Mover seção para cima"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={sIdx === workout.sections.length - 1 || isPending}
                                onClick={() => handleMoveSection(section.publicId, "DOWN")}
                                className="p-0.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                                title="Mover seção para baixo"
                                aria-label="Mover seção para baixo"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditSectionModal(section)}
                                className="px-1.5 py-0.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSection(section.publicId)}
                                className="px-1.5 py-0.5 text-xs font-medium text-[var(--danger)] hover:text-[var(--danger-foreground)] transition-colors"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>

                          {/* Blocks List */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                                Blocos de Exercício ({section.blocks.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => openNewBlockModal(section.publicId)}
                                className="text-[11px] font-bold text-[var(--brand-foreground)] hover:underline"
                              >
                                + Adicionar Bloco
                              </button>
                            </div>

                            {section.blocks.map((block, bIdx) => {
                              const blockTypeInfo = BLOCK_TYPE_MAP[block.blockType] || BLOCK_TYPE_MAP.SINGLE;

                              return (
                                <div
                                  key={block.publicId}
                                  className="p-3 rounded-lg bg-[var(--surface)] border border-[var(--border-default)] space-y-2.5 shadow-2xs"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[var(--border-subtle)] pb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant={blockTypeInfo.variant} size="sm">
                                        {blockTypeInfo.label}
                                      </Badge>
                                      {block.title && (
                                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                                          {block.title}
                                        </span>
                                      )}
                                      {block.rounds && (
                                        <span className="text-[11px] text-[var(--text-secondary)]">
                                          • {block.rounds} rounds
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        disabled={bIdx === 0 || isPending}
                                        onClick={() => handleMoveBlock(block.publicId, "UP")}
                                        className="p-0.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                                        title="Mover bloco para cima"
                                        aria-label="Mover bloco para cima"
                                      >
                                        ▲
                                      </button>
                                      <button
                                        type="button"
                                        disabled={bIdx === section.blocks.length - 1 || isPending}
                                        onClick={() => handleMoveBlock(block.publicId, "DOWN")}
                                        className="p-0.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                                        title="Mover bloco para baixo"
                                        aria-label="Mover bloco para baixo"
                                      >
                                        ▼
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEditBlockModal(block)}
                                        className="px-1.5 py-0.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                      >
                                        Editar Bloco
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveBlock(block.publicId)}
                                        className="px-1.5 py-0.5 text-xs font-medium text-[var(--danger)] hover:text-[var(--danger-foreground)] transition-colors"
                                      >
                                        Excluir
                                      </button>
                                    </div>
                                  </div>

                                  {/* Exercises in this Block */}
                                  <div className="space-y-1.5">
                                    {block.exercises.map((ex, eIdx) => (
                                      <div
                                        key={ex.publicId}
                                        className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs"
                                      >
                                        <div className="space-y-0.5 min-w-0 flex-1">
                                          <div className="font-bold text-[var(--text-primary)] truncate">
                                            {ex.exerciseName}
                                          </div>
                                          <div className="flex flex-wrap gap-2 text-[11px] text-[var(--text-secondary)]">
                                            {ex.sets && <span>{ex.sets} séries</span>}
                                            {ex.repetitionsText && <span>{ex.repetitionsText} reps</span>}
                                            {ex.restSeconds !== null && <span>{ex.restSeconds}s rest</span>}
                                            {ex.loadGuidance && <span>Carga: {ex.loadGuidance}</span>}
                                            {ex.technique && <Badge variant="brand" size="sm">{ex.technique}</Badge>}
                                            {ex.videoUrl && <span className="text-[var(--brand-foreground)] font-semibold">▶ Vídeo</span>}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                          <button
                                            type="button"
                                            disabled={eIdx === 0 || isPending}
                                            onClick={() => handleMoveExercise(ex.publicId, "UP")}
                                            className="p-0.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                                            title="Mover exercício para cima"
                                            aria-label="Mover exercício para cima"
                                          >
                                            ▲
                                          </button>
                                          <button
                                            type="button"
                                            disabled={eIdx === block.exercises.length - 1 || isPending}
                                            onClick={() => handleMoveExercise(ex.publicId, "DOWN")}
                                            className="p-0.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
                                            title="Mover exercício para baixo"
                                            aria-label="Mover exercício para baixo"
                                          >
                                            ▼
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => openEditExerciseModal(ex)}
                                            className="px-1 py-0.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                                          >
                                            Editar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveExercise(ex.publicId)}
                                            className="px-1 py-0.5 text-xs text-[var(--danger)] hover:text-[var(--danger-foreground)] transition-colors"
                                          >
                                            Excluir
                                          </button>
                                        </div>
                                      </div>
                                    ))}

                                    {/* Add Exercise CTA to this block */}
                                    <button
                                      type="button"
                                      onClick={() => openAddExerciseModal(block.publicId)}
                                      className="w-full py-2 text-xs font-semibold text-[var(--brand-foreground)] bg-[var(--brand-soft)] hover:bg-[var(--brand-soft-border)] rounded-lg border border-dashed border-[var(--brand-soft-border)] transition-colors"
                                    >
                                      + Adicionar Exercício neste Bloco
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Real-time Canonical Preview */}
        <div
          className={`space-y-4 lg:col-span-6 xl:col-span-5 ${
            activeTab === "preview" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Prévia em Tempo Real (Visual do Aluno)
              </h2>
              <span className="text-[11px] text-[var(--text-tertiary)]">Visualização canônica</span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs max-h-[80vh] overflow-y-auto">
              <TrainingPlanRenderer plan={plan} />
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL 0: Activation & Readiness Preflight Confirmation --- */}
      {isActivationModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="activation_modal_title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] p-5 sm:p-6 shadow-2xl border border-[var(--border-default)] max-h-[90vh] overflow-y-auto space-y-4 text-left">
            {activationIssues.length > 0 ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--warning-soft)] text-[var(--warning-foreground)] flex items-center justify-center shrink-0 font-bold text-sm">
                    !
                  </div>
                  <div>
                    <h3 id="activation_modal_title" className="text-base font-bold text-[var(--text-primary)]">
                      Pendências no Plano de Treino
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Não é possível disponibilizar este plano ainda. Por favor, ajuste as seguintes inconsistências:
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto p-3.5 bg-[var(--warning-soft)] rounded-xl border border-[var(--warning-border)]">
                  {activationIssues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[var(--warning-foreground)]">
                      <span className="font-bold">•</span>
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsActivationModalOpen(false)}
                  >
                    Entendido / Fechar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--brand-soft)] text-[var(--brand-foreground)] flex items-center justify-center shrink-0 font-bold text-sm">
                    ✓
                  </div>
                  <div>
                    <h3 id="activation_modal_title" className="text-base font-bold text-[var(--text-primary)]">
                      Disponibilizar Plano de Treino?
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Confirmação de ativação para o aluno
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border-subtle)] space-y-2 text-xs text-[var(--text-secondary)]">
                  <p>
                    O plano <strong className="text-[var(--text-primary)]">{plan.title}</strong> ficará <strong>ativo</strong> e acessível para o aluno <strong className="text-[var(--text-primary)]">{plan.studentName}</strong>.
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Após a ativação, esta versão ficará estável para o aluno. Se já existir outro plano ativo para este aluno, ele será automaticamente arquivado no histórico.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setIsActivationModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isPending}
                    isLoading={isPending}
                    onClick={handleConfirmActivation}
                  >
                    {isPending ? "Disponibilizando..." : "Disponibilizar Agora"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 1: Edit Plan Metadata --- */}
      {isMetaModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="meta_modal_title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 sm:p-6 shadow-2xl border border-[var(--border-default)] space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 id="meta_modal_title" className="text-base font-bold text-[var(--text-primary)]">
                Editar Informações do Plano
              </h3>
              <button
                type="button"
                onClick={() => setIsMetaModalOpen(false)}
                aria-label="Fechar modal"
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMetadata} className="space-y-3">
              <FormField
                label="Título do Plano"
                id="meta_plan_title"
                required
              >
                <Input
                  id="meta_plan_title"
                  type="text"
                  required
                  maxLength={255}
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                />
              </FormField>

              <FormField
                label="Subtítulo (opcional)"
                id="meta_plan_subtitle"
              >
                <Input
                  id="meta_plan_subtitle"
                  type="text"
                  maxLength={255}
                  value={metaSubtitle}
                  onChange={(e) => setMetaSubtitle(e.target.value)}
                />
              </FormField>

              <FormField
                label="Descrição / Objetivo"
                id="meta_plan_desc"
              >
                <Textarea
                  id="meta_plan_desc"
                  rows={3}
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  label="Início"
                  id="meta_plan_start"
                >
                  <Input
                    id="meta_plan_start"
                    type="date"
                    value={metaStart}
                    onChange={(e) => setMetaStart(e.target.value)}
                  />
                </FormField>

                <FormField
                  label="Término"
                  id="meta_plan_end"
                >
                  <Input
                    id="meta_plan_end"
                    type="date"
                    value={metaEnd}
                    onChange={(e) => setMetaEnd(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMetaModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPending}
                  isLoading={isPending}
                >
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Create / Edit Workout --- */}
      {isWorkoutModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="workout_modal_title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 sm:p-6 shadow-2xl border border-[var(--border-default)] space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 id="workout_modal_title" className="text-base font-bold text-[var(--text-primary)]">
                {editingWorkout ? "Editar Treino" : "Novo Treino (Divisão)"}
              </h3>
              <button
                type="button"
                onClick={() => setIsWorkoutModalOpen(false)}
                aria-label="Fechar modal"
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWorkout} className="space-y-3">
              <FormField
                label="Título do Treino"
                id="w_title_input"
                required
              >
                <Input
                  id="w_title_input"
                  type="text"
                  required
                  placeholder="Ex: Treino A ou Dorsal e Bíceps"
                  maxLength={255}
                  value={wTitle}
                  onChange={(e) => setWTitle(e.target.value)}
                />
              </FormField>

              <FormField
                label="Subtítulo (opcional)"
                id="w_subtitle_input"
              >
                <Input
                  id="w_subtitle_input"
                  type="text"
                  placeholder="Ex: Ênfase em Costas e Deltoide Posterior"
                  maxLength={255}
                  value={wSubtitle}
                  onChange={(e) => setWSubtitle(e.target.value)}
                />
              </FormField>

              <FormField
                label="Dia sugerido (opcional)"
                id="w_weekday_select"
              >
                <Select
                  id="w_weekday_select"
                  value={wWeekday}
                  onChange={(e) => setWWeekday(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Sem dia fixo</option>
                  <option value="1">Segunda-feira</option>
                  <option value="2">Terça-feira</option>
                  <option value="3">Quarta-feira</option>
                  <option value="4">Quinta-feira</option>
                  <option value="5">Sexta-feira</option>
                  <option value="6">Sábado</option>
                  <option value="7">Domingo</option>
                </Select>
              </FormField>

              <FormField
                label="Orientações do Treino"
                id="w_notes_input"
              >
                <Textarea
                  id="w_notes_input"
                  rows={2}
                  value={wNotes}
                  onChange={(e) => setWNotes(e.target.value)}
                  placeholder="Ex: Aquecer 10min no manguito antes de iniciar..."
                />
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWorkoutModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPending}
                  isLoading={isPending}
                >
                  Salvar Treino
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Create / Edit Section --- */}
      {isSectionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="section_modal_title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 sm:p-6 shadow-2xl border border-[var(--border-default)] space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 id="section_modal_title" className="text-base font-bold text-[var(--text-primary)]">
                {editingSection ? "Editar Seção" : "Nova Seção Muscular"}
              </h3>
              <button
                type="button"
                onClick={() => setIsSectionModalOpen(false)}
                aria-label="Fechar modal"
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-3">
              <FormField
                label="Título da Seção"
                id="s_title_input"
                required
              >
                <Input
                  id="s_title_input"
                  type="text"
                  required
                  placeholder="Ex: Aquecimento, Parte Principal ou Cardio"
                  maxLength={255}
                  value={sTitle}
                  onChange={(e) => setSTitle(e.target.value)}
                />
              </FormField>

              <FormField
                label="Descrição (opcional)"
                id="s_desc_input"
              >
                <Textarea
                  id="s_desc_input"
                  rows={2}
                  value={sDesc}
                  onChange={(e) => setSDesc(e.target.value)}
                  placeholder="Orientações sobre esta seção..."
                />
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSectionModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPending}
                  isLoading={isPending}
                >
                  Salvar Seção
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: Create / Edit Block --- */}
      {isBlockModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="block_modal_title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-5 sm:p-6 shadow-2xl border border-[var(--border-default)] space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 id="block_modal_title" className="text-base font-bold text-[var(--text-primary)]">
                {editingBlock ? "Editar Bloco de Exercício" : "Novo Bloco de Exercício"}
              </h3>
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                aria-label="Fechar modal"
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="space-y-3">
              <FormField
                label="Tipo de Estrutura"
                id="b_type_select"
                required
              >
                <Select
                  id="b_type_select"
                  value={bType}
                  onChange={(e) => setBType(e.target.value as TrainingBlockType)}
                >
                  <option value="SINGLE">Exercício Isolado / Normal (1 exercício)</option>
                  <option value="BI_SET">Bi-Set (2 exercícios combinados)</option>
                  <option value="TRI_SET">Tri-Set (3 exercícios combinados)</option>
                  <option value="SUPERSET">Superset (múltiplos exercícios)</option>
                  <option value="CIRCUIT">Circuito (múltiplos exercícios)</option>
                </Select>
              </FormField>

              <FormField
                label="Título do Bloco (opcional)"
                id="b_title_input"
              >
                <Input
                  id="b_title_input"
                  type="text"
                  placeholder="Ex: Bloco A - Peitoral"
                  maxLength={255}
                  value={bTitle}
                  onChange={(e) => setBTitle(e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-3 gap-2">
                <FormField
                  label="Rounds"
                  id="b_rounds_input"
                >
                  <Input
                    id="b_rounds_input"
                    type="number"
                    min="1"
                    value={bRounds}
                    onChange={(e) => setBRounds(e.target.value ? Number(e.target.value) : "")}
                    placeholder="3"
                  />
                </FormField>

                <FormField
                  label="Desc. Entre (s)"
                  id="b_rest_between_input"
                >
                  <Input
                    id="b_rest_between_input"
                    type="number"
                    min="0"
                    value={bRestBetween}
                    onChange={(e) => setBRestBetween(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0"
                  />
                </FormField>

                <FormField
                  label="Desc. Final (s)"
                  id="b_rest_after_input"
                >
                  <Input
                    id="b_rest_after_input"
                    type="number"
                    min="0"
                    value={bRestAfter}
                    onChange={(e) => setBRestAfter(e.target.value ? Number(e.target.value) : "")}
                    placeholder="90"
                  />
                </FormField>
              </div>

              <FormField
                label="Instruções do Bloco"
                id="b_instructions_input"
              >
                <Textarea
                  id="b_instructions_input"
                  rows={2}
                  value={bInstructions}
                  onChange={(e) => setBInstructions(e.target.value)}
                  placeholder="Orientações de transição entre exercícios..."
                />
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBlockModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPending}
                  isLoading={isPending}
                >
                  Salvar Bloco
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: Add / Edit Exercise --- */}
      {isAddExerciseModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exercise_modal_title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[var(--surface)] p-5 sm:p-6 shadow-2xl border border-[var(--border-default)] space-y-4 max-h-[90vh] overflow-y-auto text-left">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 id="exercise_modal_title" className="text-base font-bold text-[var(--text-primary)]">
                {editingExerciseItem ? "Editar Prescrição do Exercício" : "Adicionar Exercício ao Bloco"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddExerciseModalOpen(false)}
                aria-label="Fechar modal"
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {!editingExerciseItem && (
              <div className="flex items-center p-1 bg-[var(--surface-hover)] rounded-xl border border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setExerciseMode("library")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    exerciseMode === "library" ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs" : "text-[var(--text-secondary)]"
                  }`}
                >
                  Da Biblioteca de Exercícios
                </button>
                <button
                  type="button"
                  onClick={() => setExerciseMode("custom")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    exerciseMode === "custom" ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs" : "text-[var(--text-secondary)]"
                  }`}
                >
                  Personalizado (Exclusivo)
                </button>
              </div>
            )}

            <form onSubmit={handleSaveExercise} className="space-y-3">
              {/* Library Mode */}
              {!editingExerciseItem && exerciseMode === "library" && (
                <div className="space-y-2.5 p-3.5 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border-subtle)]">
                  <label htmlFor="library_exercise_search" className="block text-xs font-bold text-[var(--text-primary)]">
                    Selecione da sua Biblioteca de Exercícios
                  </label>
                  <Input
                    id="library_exercise_search"
                    type="text"
                    placeholder="Buscar por nome ou grupo muscular..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredLibrary.length === 0 ? (
                      <p className="text-xs text-[var(--text-tertiary)] py-2 text-center">
                        Nenhum exercício encontrado.
                      </p>
                    ) : (
                      filteredLibrary.map((item) => (
                        <label
                          key={item.publicId}
                          className={`flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer border transition-all ${
                            selectedLibraryPublicId === item.publicId
                              ? "bg-[var(--brand-soft)] border-[var(--brand-soft-border)] font-bold text-[var(--brand-foreground)]"
                              : "bg-[var(--surface)] border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="libraryExercise"
                              checked={selectedLibraryPublicId === item.publicId}
                              onChange={() => setSelectedLibraryPublicId(item.publicId)}
                              className="accent-[var(--brand)] text-[var(--brand)]"
                            />
                            <span>{item.name}</span>
                          </div>
                          {item.muscleGroup && (
                            <Badge variant="neutral" size="sm">
                              {item.muscleGroup}
                            </Badge>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Custom Mode / Editing Snapshot Name */}
              {(editingExerciseItem || exerciseMode === "custom") && (
                <div className="space-y-3 p-3.5 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border-subtle)]">
                  <FormField
                    label="Nome do Exercício"
                    id="ex_custom_name"
                    required
                  >
                    <Input
                      id="ex_custom_name"
                      type="text"
                      required
                      value={exName}
                      onChange={(e) => setExName(e.target.value)}
                      placeholder="Ex: Supino Inclinado com Halteres"
                      maxLength={255}
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      label="Grupo muscular"
                      id="ex_custom_muscle"
                    >
                      <Input
                        id="ex_custom_muscle"
                        type="text"
                        value={exMuscle}
                        onChange={(e) => setExMuscle(e.target.value)}
                        placeholder="Ex: Peitoral"
                      />
                    </FormField>

                    <FormField
                      label="Equipamento"
                      id="ex_custom_equip"
                    >
                      <Input
                        id="ex_custom_equip"
                        type="text"
                        value={exEquip}
                        onChange={(e) => setExEquip(e.target.value)}
                        placeholder="Ex: Halteres"
                      />
                    </FormField>
                  </div>
                </div>
              )}

              {/* Prescription Fields */}
              <div className="space-y-2.5 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Parâmetros de Prescrição
                </h4>

                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    label="Séries"
                    id="ex_sets_input"
                  >
                    <Input
                      id="ex_sets_input"
                      type="number"
                      min="1"
                      value={exSets}
                      onChange={(e) => setExSets(e.target.value ? Number(e.target.value) : "")}
                      placeholder="3"
                    />
                  </FormField>

                  <FormField
                    label="Repetições"
                    id="ex_reps_input"
                  >
                    <Input
                      id="ex_reps_input"
                      type="text"
                      value={exReps}
                      onChange={(e) => setExReps(e.target.value)}
                      placeholder="12-15"
                    />
                  </FormField>

                  <FormField
                    label="Descanso (s)"
                    id="ex_rest_input"
                  >
                    <Input
                      id="ex_rest_input"
                      type="number"
                      min="0"
                      value={exRest}
                      onChange={(e) => setExRest(e.target.value ? Number(e.target.value) : "")}
                      placeholder="60"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    label="Carga / RIR"
                    id="ex_load_input"
                  >
                    <Input
                      id="ex_load_input"
                      type="text"
                      value={exLoad}
                      onChange={(e) => setExLoad(e.target.value)}
                      placeholder="Ex: 20kg ou RIR 2"
                    />
                  </FormField>

                  <FormField
                    label="Técnica Avançada"
                    id="ex_tech_input"
                  >
                    <Input
                      id="ex_tech_input"
                      type="text"
                      value={exTech}
                      onChange={(e) => setExTech(e.target.value)}
                      placeholder="Ex: Drop-set, Rest-pause"
                    />
                  </FormField>
                </div>

                <FormField
                  label="URL do Vídeo de Execução (HTTPS - YouTube / Vimeo)"
                  id="ex_video_url_input"
                >
                  <Input
                    id="ex_video_url_input"
                    type="url"
                    value={exVideoUrl}
                    onChange={(e) => setExVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </FormField>

                <FormField
                  label="Observações específicas"
                  id="ex_notes_input"
                >
                  <Textarea
                    id="ex_notes_input"
                    rows={2}
                    value={exNotes}
                    onChange={(e) => setExNotes(e.target.value)}
                    placeholder="Orientações de postura, pegada ou cadência..."
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddExerciseModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isPending}
                  isLoading={isPending}
                >
                  Salvar Exercício
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
