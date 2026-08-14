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

type Props = {
  consultancySlug: string;
  plan: DraftTrainingPlanEditorDto;
  activeLibraryExercises: TrainingExerciseItemDto[];
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
              className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              ← Voltar aos planos
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              {plan.title}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              Rascunho
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Aluno: <span className="font-semibold text-zinc-800">{plan.studentName}</span> ({plan.studentEmail})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenActivation}
            disabled={isPending || isValidatingReadiness}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#00A859] hover:bg-[#008f4c] disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            {isValidatingReadiness ? "Validando..." : "Disponibilizar para o aluno"}
          </button>

          {/* Mobile Tab Toggle */}
          <div className="flex lg:hidden items-center p-1 bg-zinc-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "editor"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Editar Ficha
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                activeTab === "preview"
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
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
          className={`p-3 rounded-xl text-xs font-semibold border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-[#00A859] border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
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
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900">
                Informações do Plano
              </h2>
              <button
                type="button"
                onClick={() => setIsMetaModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-all cursor-pointer"
              >
                Editar Informações
              </button>
            </div>
            {plan.subtitle && (
              <p className="text-xs text-zinc-600 font-medium">{plan.subtitle}</p>
            )}
            {plan.description && (
              <p className="text-xs text-zinc-500 whitespace-pre-wrap">{plan.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-zinc-500 pt-1">
              <span>
                Início: <strong className="text-zinc-700">{plan.startsOn ? new Date(plan.startsOn + "T00:00:00").toLocaleDateString("pt-BR") : "Não definido"}</strong>
              </span>
              <span>
                Término: <strong className="text-zinc-700">{plan.endsOn ? new Date(plan.endsOn + "T00:00:00").toLocaleDateString("pt-BR") : "Não definido"}</strong>
              </span>
            </div>
          </div>

          {/* Workouts Container */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900">
                Treinos Prescritos ({plan.workouts.length})
              </h2>
              <button
                type="button"
                onClick={openNewWorkoutModal}
                className="px-3 py-1.5 text-xs font-bold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                + Adicionar Treino
              </button>
            </div>

            {plan.workouts.length === 0 ? (
              <div className="p-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-300 space-y-2">
                <p className="text-xs font-semibold text-zinc-600">
                  Nenhum treino adicionado neste plano.
                </p>
                <p className="text-xs text-zinc-500">
                  Adicione o primeiro treino (ex: Treino A - Peitoral e Tríceps).
                </p>
                <button
                  type="button"
                  onClick={openNewWorkoutModal}
                  className="mt-2 px-3 py-1.5 text-xs font-bold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-all cursor-pointer"
                >
                  Criar Primeiro Treino
                </button>
              </div>
            ) : (
              plan.workouts.map((workout, wIdx) => (
                <div
                  key={workout.publicId}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4"
                >
                  {/* Workout Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-700 font-bold text-xs flex items-center justify-center">
                          {wIdx + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                          {workout.title}
                        </h3>
                        {workout.scheduledWeekday && (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-medium">
                            {["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"][workout.scheduledWeekday - 1]}
                          </span>
                        )}
                      </div>
                      {workout.subtitle && (
                        <p className="text-xs text-zinc-500 mt-0.5">{workout.subtitle}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={wIdx === 0 || isPending}
                        onClick={() => handleMoveWorkout(workout.publicId, "UP")}
                        className="p-1 text-xs font-bold text-zinc-500 hover:text-zinc-800 disabled:opacity-30 rounded hover:bg-zinc-100 cursor-pointer"
                        title="Mover para cima"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={wIdx === plan.workouts.length - 1 || isPending}
                        onClick={() => handleMoveWorkout(workout.publicId, "DOWN")}
                        className="p-1 text-xs font-bold text-zinc-500 hover:text-zinc-800 disabled:opacity-30 rounded hover:bg-zinc-100 cursor-pointer"
                        title="Mover para baixo"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditWorkoutModal(workout)}
                        className="px-2 py-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded hover:bg-zinc-100 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveWorkout(workout.publicId)}
                        className="px-2 py-1 text-xs font-semibold text-red-600 hover:text-red-800 rounded hover:bg-red-50 cursor-pointer"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  {/* Sections List */}
                  <div className="space-y-3 pl-0 sm:pl-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Divisões / Seções ({workout.sections.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => openNewSectionModal(workout.publicId)}
                        className="text-xs font-bold text-[#00A859] hover:text-[#008f4c] cursor-pointer"
                      >
                        + Nova Seção
                      </button>
                    </div>

                    {workout.sections.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic py-2">
                        Nenhuma seção nesta divisão (ex: Aquecimento, Principal, etc).
                      </p>
                    ) : (
                      workout.sections.map((section, sIdx) => (
                        <div
                          key={section.publicId}
                          className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-xs font-bold text-zinc-800">
                                {section.title}
                              </h5>
                              {section.description && (
                                <p className="text-[11px] text-zinc-500">{section.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={sIdx === 0 || isPending}
                                onClick={() => handleMoveSection(section.publicId, "UP")}
                                className="p-0.5 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 cursor-pointer"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={sIdx === workout.sections.length - 1 || isPending}
                                onClick={() => handleMoveSection(section.publicId, "DOWN")}
                                className="p-0.5 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 cursor-pointer"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditSectionModal(section)}
                                className="px-1.5 py-0.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSection(section.publicId)}
                                className="px-1.5 py-0.5 text-xs font-medium text-red-600 hover:text-red-800 cursor-pointer"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>

                          {/* Blocks List */}
                          <div className="space-y-2.5 pl-0 sm:pl-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-zinc-500">
                                Blocos de Exercício ({section.blocks.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => openNewBlockModal(section.publicId)}
                                className="text-[11px] font-bold text-[#00A859] hover:text-[#008f4c] cursor-pointer"
                              >
                                + Adicionar Bloco
                              </button>
                            </div>

                            {section.blocks.map((block, bIdx) => (
                              <div
                                key={block.publicId}
                                className="p-3 rounded-lg bg-white border border-zinc-200 space-y-2.5 shadow-2xs"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-zinc-100 pb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                        block.blockType === "BI_SET"
                                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                                          : block.blockType === "TRI_SET"
                                          ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                          : block.blockType === "SUPERSET"
                                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                                          : block.blockType === "CIRCUIT"
                                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                                          : "bg-zinc-100 text-zinc-800 border border-zinc-200"
                                      }`}
                                    >
                                      {block.blockType}
                                    </span>
                                    {block.title && (
                                      <span className="text-xs font-semibold text-zinc-800">
                                        {block.title}
                                      </span>
                                    )}
                                    {block.rounds && (
                                      <span className="text-[11px] text-zinc-500">
                                        • {block.rounds} rounds
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={bIdx === 0 || isPending}
                                      onClick={() => handleMoveBlock(block.publicId, "UP")}
                                      className="p-0.5 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 cursor-pointer"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      disabled={bIdx === section.blocks.length - 1 || isPending}
                                      onClick={() => handleMoveBlock(block.publicId, "DOWN")}
                                      className="p-0.5 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 cursor-pointer"
                                    >
                                      ▼
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditBlockModal(block)}
                                      className="px-1.5 py-0.5 text-xs text-zinc-600 hover:text-zinc-900 cursor-pointer"
                                    >
                                      Editar Bloco
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBlock(block.publicId)}
                                      className="px-1.5 py-0.5 text-xs text-red-600 hover:text-red-800 cursor-pointer"
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
                                      className="flex items-center justify-between p-2 rounded bg-zinc-50 border border-zinc-100 text-xs"
                                    >
                                      <div className="space-y-0.5">
                                        <div className="font-bold text-zinc-900">
                                          {ex.exerciseName}
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
                                          {ex.sets && <span>{ex.sets} séries</span>}
                                          {ex.repetitionsText && <span>{ex.repetitionsText} reps</span>}
                                          {ex.restSeconds !== null && <span>{ex.restSeconds}s rest</span>}
                                          {ex.loadGuidance && <span>Carga: {ex.loadGuidance}</span>}
                                          {ex.technique && <span className="text-purple-700 font-medium">{ex.technique}</span>}
                                          {ex.videoUrl && <span className="text-blue-600 font-semibold">▶ Vídeo</span>}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          disabled={eIdx === 0 || isPending}
                                          onClick={() => handleMoveExercise(ex.publicId, "UP")}
                                          className="p-0.5 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 cursor-pointer"
                                        >
                                          ▲
                                        </button>
                                        <button
                                          type="button"
                                          disabled={eIdx === block.exercises.length - 1 || isPending}
                                          onClick={() => handleMoveExercise(ex.publicId, "DOWN")}
                                          className="p-0.5 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-30 cursor-pointer"
                                        >
                                          ▼
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openEditExerciseModal(ex)}
                                          className="px-1 py-0.5 text-xs text-zinc-600 hover:text-zinc-900 cursor-pointer"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveExercise(ex.publicId)}
                                          className="px-1 py-0.5 text-xs text-red-600 hover:text-red-800 cursor-pointer"
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
                                    className="w-full py-1.5 text-xs font-semibold text-[#00A859] hover:bg-emerald-50/60 rounded border border-dashed border-emerald-200 transition-all cursor-pointer"
                                  >
                                    + Adicionar Exercício neste Bloco
                                  </button>
                                </div>
                              </div>
                            ))}
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
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Prévia em Tempo Real (Visual do Aluno)
              </h2>
              <span className="text-[11px] text-zinc-400">Canonical Renderer</span>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-sm max-h-[80vh] overflow-y-auto">
              <TrainingPlanRenderer plan={plan} />
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL 0: Activation & Readiness Preflight Confirmation --- */}
      {isActivationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto space-y-4">
            {activationIssues.length > 0 ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-sm">
                    !
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">
                      Pendências no Plano de Treino
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Não é possível disponibilizar este plano ainda. Por favor, ajuste as seguintes inconsistências:
                    </p>
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
                  {activationIssues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-amber-900">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsActivationModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-all cursor-pointer"
                  >
                    Entendido / Fechar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#00A859] flex items-center justify-center shrink-0 font-bold text-sm">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-900">
                      Disponibilizar Plano de Treino?
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Confirmação de ativação para o aluno
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2 text-xs text-zinc-700">
                  <p>
                    O plano <strong className="text-zinc-900">{plan.title}</strong> ficará <strong>ativo</strong> e acessível para o aluno <strong className="text-zinc-900">{plan.studentName}</strong>.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Se já existir outro plano ativo para este aluno, ele será automaticamente <strong>arquivado</strong> no histórico e substituído por este.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setIsActivationModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleConfirmActivation}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isPending ? "Disponibilizando..." : "Disponibilizar Agora"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 1: Edit Plan Metadata --- */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-bold text-zinc-900">
              Editar Informações do Plano
            </h3>
            <form onSubmit={handleUpdateMetadata} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Título do Plano *</label>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Subtítulo (opcional)</label>
                <input
                  type="text"
                  maxLength={255}
                  value={metaSubtitle}
                  onChange={(e) => setMetaSubtitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Descrição / Objetivo</label>
                <textarea
                  rows={3}
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700">Início</label>
                  <input
                    type="date"
                    value={metaStart}
                    onChange={(e) => setMetaStart(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700">Término</label>
                  <input
                    type="date"
                    value={metaEnd}
                    onChange={(e) => setMetaEnd(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsMetaModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-sm"
                >
                  {isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Create / Edit Workout --- */}
      {isWorkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-bold text-zinc-900">
              {editingWorkout ? "Editar Treino" : "Novo Treino (Divisão)"}
            </h3>
            <form onSubmit={handleSaveWorkout} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Título do Treino *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Treino A ou Dorsal e Bíceps"
                  maxLength={255}
                  value={wTitle}
                  onChange={(e) => setWTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Subtítulo (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Ênfase em Costas e Deltoide Posterior"
                  maxLength={255}
                  value={wSubtitle}
                  onChange={(e) => setWSubtitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Dia sugerido (opcional)</label>
                <select
                  value={wWeekday}
                  onChange={(e) => setWWeekday(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                >
                  <option value="">Sem dia fixo</option>
                  <option value="1">Segunda-feira</option>
                  <option value="2">Terça-feira</option>
                  <option value="3">Quarta-feira</option>
                  <option value="4">Quinta-feira</option>
                  <option value="5">Sexta-feira</option>
                  <option value="6">Sábado</option>
                  <option value="7">Domingo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Orientações do Treino</label>
                <textarea
                  rows={2}
                  value={wNotes}
                  onChange={(e) => setWNotes(e.target.value)}
                  placeholder="Ex: Aquecer 10min no manguito antes de iniciar..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsWorkoutModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-sm"
                >
                  {isPending ? "Salvando..." : "Salvar Treino"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: Create / Edit Section --- */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-bold text-zinc-900">
              {editingSection ? "Editar Seção" : "Nova Seção Muscular"}
            </h3>
            <form onSubmit={handleSaveSection} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Título da Seção *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aquecimento, Parte Principal ou Cardio"
                  maxLength={255}
                  value={sTitle}
                  onChange={(e) => setSTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Descrição (opcional)</label>
                <textarea
                  rows={2}
                  value={sDesc}
                  onChange={(e) => setSDesc(e.target.value)}
                  placeholder="Orientações sobre esta seção..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-sm"
                >
                  {isPending ? "Salvando..." : "Salvar Seção"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: Create / Edit Block --- */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-zinc-200 space-y-4">
            <h3 className="text-base font-bold text-zinc-900">
              {editingBlock ? "Editar Bloco de Exercício" : "Novo Bloco de Exercício"}
            </h3>
            <form onSubmit={handleSaveBlock} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Tipo de Estrutura *</label>
                <select
                  value={bType}
                  onChange={(e) => setBType(e.target.value as TrainingBlockType)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                >
                  <option value="SINGLE">Exercício Isolado / Normal (1 exercício)</option>
                  <option value="BI_SET">Bi-Set (2 exercícios combinados)</option>
                  <option value="TRI_SET">Tri-Set (3 exercícios combinados)</option>
                  <option value="SUPERSET">Superset (múltiplos exercícios)</option>
                  <option value="CIRCUIT">Circuito (múltiplos exercícios)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Título do Bloco (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Bloco A - Peitoral"
                  maxLength={255}
                  value={bTitle}
                  onChange={(e) => setBTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700">Rounds</label>
                  <input
                    type="number"
                    min="1"
                    value={bRounds}
                    onChange={(e) => setBRounds(e.target.value ? Number(e.target.value) : "")}
                    placeholder="3"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700">Desc. Entre (s)</label>
                  <input
                    type="number"
                    min="0"
                    value={bRestBetween}
                    onChange={(e) => setBRestBetween(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700">Desc. Final (s)</label>
                  <input
                    type="number"
                    min="0"
                    value={bRestAfter}
                    onChange={(e) => setBRestAfter(e.target.value ? Number(e.target.value) : "")}
                    placeholder="90"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700">Instruções do Bloco</label>
                <textarea
                  rows={2}
                  value={bInstructions}
                  onChange={(e) => setBInstructions(e.target.value)}
                  placeholder="Orientações de transição entre exercícios..."
                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-sm"
                >
                  {isPending ? "Salvando..." : "Salvar Bloco"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 5: Add / Edit Exercise --- */}
      {isAddExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-zinc-900">
              {editingExerciseItem ? "Editar Prescrição do Exercício" : "Adicionar Exercício ao Bloco"}
            </h3>

            {!editingExerciseItem && (
              <div className="flex items-center p-1 bg-zinc-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setExerciseMode("library")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    exerciseMode === "library" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500"
                  }`}
                >
                  Da Biblioteca de Exercícios
                </button>
                <button
                  type="button"
                  onClick={() => setExerciseMode("custom")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    exerciseMode === "custom" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500"
                  }`}
                >
                  Personalizado (Exclusivo)
                </button>
              </div>
            )}

            <form onSubmit={handleSaveExercise} className="space-y-3">
              {/* Library Mode */}
              {!editingExerciseItem && exerciseMode === "library" && (
                <div className="space-y-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <label className="block text-xs font-bold text-zinc-700">
                    Selecione da sua Biblioteca de Exercícios
                  </label>
                  <input
                    type="text"
                    placeholder="Buscar exercício..."
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredLibrary.length === 0 ? (
                      <p className="text-xs text-zinc-400 py-2 text-center">
                        Nenhum exercício encontrado.
                      </p>
                    ) : (
                      filteredLibrary.map((item) => (
                        <label
                          key={item.publicId}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                            selectedLibraryPublicId === item.publicId
                              ? "bg-emerald-50 border-emerald-300 font-bold text-[#00A859]"
                              : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="libraryExercise"
                              checked={selectedLibraryPublicId === item.publicId}
                              onChange={() => setSelectedLibraryPublicId(item.publicId)}
                              className="text-[#00A859] focus:ring-[#00A859]"
                            />
                            <span>{item.name}</span>
                          </div>
                          {item.muscleGroup && (
                            <span className="text-[10px] text-zinc-400 font-normal">
                              {item.muscleGroup}
                            </span>
                          )}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Custom Mode / Editing Snapshot Name */}
              {(editingExerciseItem || exerciseMode === "custom") && (
                <div className="space-y-3 p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-700">
                      Nome do Exercício *
                    </label>
                    <input
                      type="text"
                      required
                      value={exName}
                      onChange={(e) => setExName(e.target.value)}
                      placeholder="Ex: Supino Inclinado com Halteres"
                      maxLength={255}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-zinc-700">
                        Grupo muscular
                      </label>
                      <input
                        type="text"
                        value={exMuscle}
                        onChange={(e) => setExMuscle(e.target.value)}
                        placeholder="Ex: Peitoral"
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-zinc-700">
                        Equipamento
                      </label>
                      <input
                        type="text"
                        value={exEquip}
                        onChange={(e) => setExEquip(e.target.value)}
                        placeholder="Ex: Halteres"
                        className="w-full px-2.5 py-1 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Prescription Fields */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  Parâmetros de Prescrição
                </h4>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-700">Séries</label>
                    <input
                      type="number"
                      min="1"
                      value={exSets}
                      onChange={(e) => setExSets(e.target.value ? Number(e.target.value) : "")}
                      placeholder="3"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-700">Repetições</label>
                    <input
                      type="text"
                      value={exReps}
                      onChange={(e) => setExReps(e.target.value)}
                      placeholder="12-15"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-700">Descanso (s)</label>
                    <input
                      type="number"
                      min="0"
                      value={exRest}
                      onChange={(e) => setExRest(e.target.value ? Number(e.target.value) : "")}
                      placeholder="60"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-700">Carga / RIR</label>
                    <input
                      type="text"
                      value={exLoad}
                      onChange={(e) => setExLoad(e.target.value)}
                      placeholder="Ex: 20kg ou RIR 2"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-zinc-700">Técnica Avançada</label>
                    <input
                      type="text"
                      value={exTech}
                      onChange={(e) => setExTech(e.target.value)}
                      placeholder="Ex: Drop-set, Rest-pause"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-700">
                    URL do Vídeo de Execução (HTTPS - YouTube / Vimeo)
                  </label>
                  <input
                    type="url"
                    value={exVideoUrl}
                    onChange={(e) => setExVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-700">Observações específicas</label>
                  <textarea
                    rows={2}
                    value={exNotes}
                    onChange={(e) => setExNotes(e.target.value)}
                    placeholder="Orientações de postura, pegada ou cadência..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddExerciseModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-sm"
                >
                  {isPending ? "Salvando..." : "Salvar Exercício"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
