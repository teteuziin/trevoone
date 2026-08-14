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

    const payload = {
      title: wTitle,
      subtitle: wSubtitle || null,
      scheduledWeekday: wWeekday !== "" ? Number(wWeekday) : null,
      notes: wNotes || null,
    };

    startTransition(async () => {
      if (editingWorkout) {
        const res = await updateTrainingWorkoutAction(
          consultancySlug,
          plan.publicId,
          editingWorkout.publicId,
          payload
        );
        if (res.success) {
          setIsWorkoutModalOpen(false);
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao atualizar treino." });
        }
      } else {
        const res = await createTrainingWorkoutAction(
          consultancySlug,
          plan.publicId,
          payload
        );
        if (res.success) {
          setIsWorkoutModalOpen(false);
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao adicionar treino." });
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

    const payload = {
      title: sTitle,
      description: sDesc || null,
    };

    startTransition(async () => {
      if (editingSection) {
        const res = await updateTrainingWorkoutSectionAction(
          consultancySlug,
          plan.publicId,
          editingSection.publicId,
          payload
        );
        if (res.success) {
          setIsSectionModalOpen(false);
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao atualizar seção." });
        }
      } else if (currentWorkoutIdForSection) {
        const res = await createTrainingWorkoutSectionAction(
          consultancySlug,
          plan.publicId,
          currentWorkoutIdForSection,
          payload
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
    if (!confirm("Deseja remover esta divisão muscular e todos os seus blocos?")) return;
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
    setBRestBetween(
      block.restBetweenExercisesSeconds !== null
        ? block.restBetweenExercisesSeconds
        : ""
    );
    setBRestAfter(
      block.restAfterBlockSeconds !== null ? block.restAfterBlockSeconds : ""
    );
    setBInstructions(block.instructions || "");
    setIsBlockModalOpen(true);
  }

  function handleSaveBlock(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    const payload = {
      blockType: bType,
      title: bTitle || null,
      rounds: bRounds !== "" ? Number(bRounds) : null,
      restBetweenExercisesSeconds: bRestBetween !== "" ? Number(bRestBetween) : null,
      restAfterBlockSeconds: bRestAfter !== "" ? Number(bRestAfter) : null,
      instructions: bInstructions || null,
    };

    startTransition(async () => {
      if (editingBlock) {
        const res = await updateTrainingWorkoutBlockAction(
          consultancySlug,
          plan.publicId,
          editingBlock.publicId,
          payload
        );
        if (res.success) {
          setIsBlockModalOpen(false);
          router.refresh();
        } else {
          setFeedback({ type: "error", message: res.error || "Erro ao atualizar bloco." });
        }
      } else if (currentSectionIdForBlock) {
        const res = await createTrainingWorkoutBlockAction(
          consultancySlug,
          plan.publicId,
          currentSectionIdForBlock,
          payload
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
    if (!confirm("Deseja remover este bloco de exercícios?")) return;
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

  // --- Handlers: Exercises / Prescription ---
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
    setExReps("12-15");
    setExRest(60);
    setExLoad("");
    setExTech("");
    setExNotes("");
    setExVideoUrl("");
    setIsAddExerciseModalOpen(true);
  }

  function openEditExerciseItemModal(exerciseItem: TrainingBlockExerciseDto) {
    setEditingExerciseItem(exerciseItem);
    setExName(exerciseItem.exerciseName);
    setExMuscle(exerciseItem.muscleGroup || "");
    setExEquip(exerciseItem.equipment || "");
    setExDesc(exerciseItem.description || "");
    setExInst(exerciseItem.instructions || "");
    setExSets(exerciseItem.sets !== null ? exerciseItem.sets : "");
    setExReps(exerciseItem.repetitionsText || "");
    setExRest(exerciseItem.restSeconds !== null ? exerciseItem.restSeconds : "");
    setExLoad(exerciseItem.loadGuidance || "");
    setExTech(exerciseItem.technique || "");
    setExNotes(exerciseItem.notes || "");
    setExVideoUrl(exerciseItem.videoUrl || "");
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
      } else if (currentBlockIdForExercise) {
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

        {/* Mobile Tab Toggle */}
        <div className="flex lg:hidden items-center p-1 bg-zinc-200/80 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`flex-1 py-1.5 px-4 text-xs font-semibold rounded-lg transition-all ${
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
            className={`flex-1 py-1.5 px-4 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "preview"
                ? "bg-white text-zinc-900 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Prévia do Aluno
          </button>
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
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-all"
              >
                Editar Informações
              </button>
            </div>
            {plan.subtitle && <p className="text-xs text-zinc-600 font-medium">{plan.subtitle}</p>}
            {(plan.startsOn || plan.endsOn) && (
              <p className="text-xs text-zinc-500">
                Período: {plan.startsOn || "—"} até {plan.endsOn || "—"}
              </p>
            )}
            {plan.description && (
              <p className="text-xs text-zinc-600 border-t border-zinc-100 pt-2 leading-relaxed">
                {plan.description}
              </p>
            )}
          </div>

          {/* Workouts List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-900">
                Treinos da Ficha ({plan.workouts.length})
              </h2>
              <button
                type="button"
                onClick={openNewWorkoutModal}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00A859] hover:bg-[#008f4c] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all"
              >
                + Adicionar Treino
              </button>
            </div>

            {plan.workouts.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-zinc-200 shadow-2xs text-center space-y-2">
                <p className="text-xs font-semibold text-zinc-700">Nenhum treino adicionado</p>
                <p className="text-xs text-zinc-400">
                  Clique em &quot;+ Adicionar Treino&quot; para criar a primeira divisão (ex: Treino A).
                </p>
              </div>
            ) : (
              plan.workouts.map((workout, wIndex) => (
                <div
                  key={workout.publicId}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-4"
                >
                  {/* Workout Header Controls */}
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                        {String.fromCharCode(65 + wIndex)}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">{workout.title}</h3>
                        {workout.subtitle && (
                          <p className="text-[11px] text-zinc-500">{workout.subtitle}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Mover treino para cima"
                        onClick={() => handleMoveWorkout(workout.publicId, "UP")}
                        disabled={isPending || wIndex === 0}
                        className="p-1 text-zinc-400 hover:text-zinc-900 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label="Mover treino para baixo"
                        onClick={() => handleMoveWorkout(workout.publicId, "DOWN")}
                        disabled={isPending || wIndex === plan.workouts.length - 1}
                        className="p-1 text-zinc-400 hover:text-zinc-900 disabled:opacity-30"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditWorkoutModal(workout)}
                        className="px-2 py-1 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveWorkout(workout.publicId)}
                        className="px-2 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded"
                      >
                        Remover
                      </button>
                    </div>
                  </div>

                  {/* Sections List */}
                  <div className="space-y-4 pl-1 sm:pl-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Divisões Musculares / Seções ({workout.sections.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => openNewSectionModal(workout.publicId)}
                        disabled={isPending}
                        className="text-xs font-semibold text-[#00A859] hover:underline"
                      >
                        + Adicionar Seção
                      </button>
                    </div>

                    {workout.sections.length === 0 ? (
                      <p className="text-xs text-zinc-400 italic py-2">
                        Nenhuma seção (ex: Peitoral, Tríceps) neste treino.
                      </p>
                    ) : (
                      workout.sections.map((section, sIndex) => (
                        <div
                          key={section.publicId}
                          className="p-3 sm:p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80 space-y-3"
                        >
                          {/* Section Header Controls */}
                          <div className="flex items-center justify-between border-b border-zinc-200/60 pb-2">
                            <h5 className="text-xs font-bold text-zinc-800">
                              {section.title}
                            </h5>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                aria-label="Mover seção para cima"
                                onClick={() => handleMoveSection(section.publicId, "UP")}
                                disabled={isPending || sIndex === 0}
                                className="p-0.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-30 text-xs"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                aria-label="Mover seção para baixo"
                                onClick={() => handleMoveSection(section.publicId, "DOWN")}
                                disabled={isPending || sIndex === workout.sections.length - 1}
                                className="p-0.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-30 text-xs"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditSectionModal(section)}
                                className="px-1.5 py-0.5 text-[11px] font-semibold text-zinc-700 bg-white border border-zinc-200 rounded"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSection(section.publicId)}
                                className="px-1.5 py-0.5 text-[11px] font-semibold text-red-600 bg-red-50 rounded"
                              >
                                Remover
                              </button>
                            </div>
                          </div>

                          {/* Blocks List */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-zinc-500">
                                Blocos de Exercício ({section.blocks.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => openNewBlockModal(section.publicId)}
                                disabled={isPending}
                                className="text-xs font-semibold text-[#00A859] hover:underline"
                              >
                                + Adicionar Bloco
                              </button>
                            </div>

                            {section.blocks.map((block, bIndex) => (
                              <div
                                key={block.publicId}
                                className="p-3 rounded-lg bg-white border border-zinc-200 shadow-2xs space-y-3"
                              >
                                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800">
                                      {block.blockType}
                                    </span>
                                    {block.title && (
                                      <span className="text-xs font-semibold text-zinc-800">
                                        {block.title}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      aria-label="Mover bloco para cima"
                                      onClick={() => handleMoveBlock(block.publicId, "UP")}
                                      disabled={isPending || bIndex === 0}
                                      className="p-0.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-30 text-xs"
                                    >
                                      ▲
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Mover bloco para baixo"
                                      onClick={() => handleMoveBlock(block.publicId, "DOWN")}
                                      disabled={isPending || bIndex === section.blocks.length - 1}
                                      className="p-0.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-30 text-xs"
                                    >
                                      ▼
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditBlockModal(block)}
                                      className="px-1.5 py-0.5 text-[11px] font-semibold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBlock(block.publicId)}
                                      className="px-1.5 py-0.5 text-[11px] font-semibold text-red-600 bg-red-50 rounded"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>

                                {/* Exercises in Block */}
                                <div className="space-y-2">
                                  {block.exercises.map((exercise, eIndex) => (
                                    <div
                                      key={exercise.publicId}
                                      className="p-2.5 rounded-lg bg-zinc-50/70 border border-zinc-200/60 flex items-center justify-between gap-2"
                                    >
                                      <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-zinc-900">
                                          {exercise.exerciseName}
                                        </p>
                                        <p className="text-[11px] text-zinc-500">
                                          {exercise.sets ? `${exercise.sets} séries` : ""}{" "}
                                          {exercise.repetitionsText ? `• ${exercise.repetitionsText} reps` : ""}
                                          {exercise.loadGuidance ? ` • ${exercise.loadGuidance}` : ""}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          aria-label="Mover exercício para cima"
                                          onClick={() => handleMoveExercise(exercise.publicId, "UP")}
                                          disabled={isPending || eIndex === 0}
                                          className="p-0.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-30 text-xs"
                                        >
                                          ▲
                                        </button>
                                        <button
                                          type="button"
                                          aria-label="Mover exercício para baixo"
                                          onClick={() =>
                                            handleMoveExercise(exercise.publicId, "DOWN")
                                          }
                                          disabled={
                                            isPending || eIndex === block.exercises.length - 1
                                          }
                                          className="p-0.5 text-zinc-400 hover:text-zinc-900 disabled:opacity-30 text-xs"
                                        >
                                          ▼
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openEditExerciseItemModal(exercise)}
                                          className="px-1.5 py-0.5 text-[11px] font-semibold text-zinc-700 bg-white border border-zinc-200 rounded"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveExercise(exercise.publicId)}
                                          className="px-1.5 py-0.5 text-[11px] font-semibold text-red-600 bg-red-50 rounded"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Button to add exercise */}
                                  <button
                                    type="button"
                                    onClick={() => openAddExerciseModal(block.publicId)}
                                    className="w-full py-2 border border-dashed border-zinc-300 hover:border-[#00A859] text-zinc-600 hover:text-[#00A859] text-xs font-semibold rounded-lg transition-all"
                                  >
                                    + Adicionar Exercício ao Bloco
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

        {/* Right Column: Live Student Preview */}
        <div
          className={`lg:col-span-6 xl:col-span-5 lg:sticky lg:top-6 ${
            activeTab === "preview" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="space-y-2 pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
                Prévia do Aluno
              </h2>
              <span className="text-[11px] text-zinc-400">Atualização em tempo real</span>
            </div>
          </div>

          <TrainingPlanRenderer
            plan={plan}
            studentName={plan.studentName}
            isDraft={true}
          />
        </div>
      </div>

      {/* --- MODAL: EDIT PLAN METADATA --- */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-[500px] bg-white rounded-2xl border border-zinc-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-base font-bold text-zinc-900">Editar Informações do Plano</h3>
              <button
                type="button"
                onClick={() => setIsMetaModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateMetadata} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-800">
                  Título do plano <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  maxLength={255}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-800">Subtítulo</label>
                <input
                  type="text"
                  value={metaSubtitle}
                  onChange={(e) => setMetaSubtitle(e.target.value)}
                  maxLength={255}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-800">Data Inicial</label>
                  <input
                    type="date"
                    value={metaStart}
                    onChange={(e) => setMetaStart(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-800">Data Final</label>
                  <input
                    type="date"
                    value={metaEnd}
                    onChange={(e) => setMetaEnd(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-800">Descrição / Metas</label>
                <textarea
                  rows={3}
                  value={metaDesc}
                  onChange={(e) => setMetaDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsMetaModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: WORKOUT FORM --- */}
      {isWorkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-[480px] bg-white rounded-2xl border border-zinc-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-base font-bold text-zinc-900">
                {editingWorkout ? "Editar Treino" : "Novo Treino"}
              </h3>
              <button
                type="button"
                onClick={() => setIsWorkoutModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWorkout} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-800">
                  Título do Treino (ex: Treino A - Peito e Tríceps) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={wTitle}
                  onChange={(e) => setWTitle(e.target.value)}
                  placeholder="Ex: Treino A"
                  maxLength={255}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-800">Subtítulo (opcional)</label>
                <input
                  type="text"
                  value={wSubtitle}
                  onChange={(e) => setWSubtitle(e.target.value)}
                  placeholder="Ex: Foco em força e hipertrofia"
                  maxLength={255}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-800">Dia sugerido (opcional)</label>
                <select
                  value={wWeekday}
                  onChange={(e) => setWWeekday(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
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
                <label className="block text-xs font-bold text-zinc-800">Observações gerais do treino</label>
                <textarea
                  rows={2}
                  value={wNotes}
                  onChange={(e) => setWNotes(e.target.value)}
                  placeholder="Orientações de aquecimento, cardio ou descanso..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsWorkoutModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: SECTION FORM --- */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-[440px] bg-white rounded-2xl border border-zinc-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-base font-bold text-zinc-900">
                {editingSection ? "Editar Seção" : "Nova Seção / Divisão"}
              </h3>
              <button
                type="button"
                onClick={() => setIsSectionModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSection} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-800">
                  Título da seção <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sTitle}
                  onChange={(e) => setSTitle(e.target.value)}
                  placeholder="Ex: Peitoral, Tríceps, Mobilidade"
                  maxLength={255}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-800">Descrição (opcional)</label>
                <input
                  type="text"
                  value={sDesc}
                  onChange={(e) => setSDesc(e.target.value)}
                  placeholder="Ex: Ênfase em porção superior"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsSectionModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: BLOCK FORM --- */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-[480px] bg-white rounded-2xl border border-zinc-200 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-base font-bold text-zinc-900">
                {editingBlock ? "Editar Bloco" : "Novo Bloco de Exercícios"}
              </h3>
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-800">
                  Tipo de Bloco <span className="text-red-500">*</span>
                </label>
                <select
                  value={bType}
                  onChange={(e) => setBType(e.target.value as TrainingBlockType)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white font-medium"
                >
                  <option value="SINGLE">Exercício Isolado (Normal)</option>
                  <option value="BI_SET">Bi-Set (2 exercícios combinados)</option>
                  <option value="TRI_SET">Tri-Set (3 exercícios combinados)</option>
                  <option value="SUPERSET">Superset</option>
                  <option value="CIRCUIT">Circuito</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-800">Título do Bloco (opcional)</label>
                <input
                  type="text"
                  value={bTitle}
                  onChange={(e) => setBTitle(e.target.value)}
                  placeholder="Ex: Combinado Peito + Ombro"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-700">Rounds</label>
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
                  <label className="block text-[11px] font-bold text-zinc-700">Descanso entre ex.</label>
                  <input
                    type="number"
                    min="0"
                    value={bRestBetween}
                    onChange={(e) => setBRestBetween(e.target.value ? Number(e.target.value) : "")}
                    placeholder="0s"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-zinc-700">Descanso final</label>
                  <input
                    type="number"
                    min="0"
                    value={bRestAfter}
                    onChange={(e) => setBRestAfter(e.target.value ? Number(e.target.value) : "")}
                    placeholder="90s"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-800">Instruções do bloco</label>
                <textarea
                  rows={2}
                  value={bInstructions}
                  onChange={(e) => setBInstructions(e.target.value)}
                  placeholder="Ex: Executar sem pausa entre A1 e A2..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 text-zinc-900 bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] rounded-lg shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EXERCISE FORM (LIBRARY / CUSTOM / EDIT) --- */}
      {isAddExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-zinc-200 shadow-xl p-5 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h3 className="text-base font-bold text-zinc-900">
                {editingExerciseItem
                  ? "Editar Exercício na Prescrição"
                  : "Adicionar Exercício ao Bloco"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddExerciseModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {!editingExerciseItem && (
              <div className="flex p-1 bg-zinc-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setExerciseMode("library")}
                  className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${
                    exerciseMode === "library"
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-600"
                  }`}
                >
                  Selecionar da Biblioteca
                </button>
                <button
                  type="button"
                  onClick={() => setExerciseMode("custom")}
                  className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all ${
                    exerciseMode === "custom"
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-600"
                  }`}
                >
                  Criar Personalizado
                </button>
              </div>
            )}

            <form onSubmit={handleSaveExercise} className="space-y-3">
              {/* Exercise Selector / Inputs */}
              {!editingExerciseItem && exerciseMode === "library" ? (
                <div className="space-y-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-800">
                      Buscar na biblioteca
                    </label>
                    <input
                      type="text"
                      value={librarySearch}
                      onChange={(e) => setLibrarySearch(e.target.value)}
                      placeholder="Filtrar por nome, grupo muscular ou equipamento..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-800">
                      Exercício <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedLibraryPublicId}
                      onChange={(e) => setSelectedLibraryPublicId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-zinc-300 text-zinc-900 bg-white font-medium"
                    >
                      {filteredLibrary.length === 0 ? (
                        <option value="">Nenhum exercício encontrado</option>
                      ) : (
                        filteredLibrary.map((item) => (
                          <option key={item.publicId} value={item.publicId}>
                            {item.name} {item.muscleGroup ? `(${item.muscleGroup})` : ""}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-800">
                      Nome do exercício <span className="text-red-500">*</span>
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
                  className="px-3 py-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg"
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
