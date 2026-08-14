"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TrainingExerciseItemDto } from "@/lib/consultancies/training";
import {
  createTrainingExerciseAction,
  updateTrainingExerciseAction,
  deactivateTrainingExerciseAction,
  reactivateTrainingExerciseAction,
} from "@/app/consultoria/[slug]/personal/exercicios/actions";

type Props = {
  consultancySlug: string;
  items: TrainingExerciseItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchQuery: string;
  statusFilter: "ALL" | "ACTIVE" | "INACTIVE";
  editingExercise?: TrainingExerciseItemDto | null;
};

export function TrainingExerciseLibrary({
  consultancySlug,
  items,
  total,
  page,
  totalPages,
  searchQuery,
  statusFilter,
  editingExercise = null,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search input state
  const [search, setSearch] = useState(searchQuery);

  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(Boolean(editingExercise));
  const [activeEditing, setActiveEditing] = useState<TrainingExerciseItemDto | null>(
    editingExercise
  );

  const [formName, setFormName] = useState(editingExercise?.name || "");
  const [formMuscleGroup, setFormMuscleGroup] = useState(
    editingExercise?.muscleGroup || ""
  );
  const [formEquipment, setFormEquipment] = useState(
    editingExercise?.equipment || ""
  );
  const [formDescription, setFormDescription] = useState(
    editingExercise?.description || ""
  );
  const [formInstructions, setFormInstructions] = useState(
    editingExercise?.instructions || ""
  );

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function openCreateModal() {
    setActiveEditing(null);
    setFormName("");
    setFormMuscleGroup("");
    setFormEquipment("");
    setFormDescription("");
    setFormInstructions("");
    setFeedback(null);
    setFieldErrors({});
    setIsFormOpen(true);
  }

  function openEditModal(exercise: TrainingExerciseItemDto) {
    setActiveEditing(exercise);
    setFormName(exercise.name);
    setFormMuscleGroup(exercise.muscleGroup || "");
    setFormEquipment(exercise.equipment || "");
    setFormDescription(exercise.description || "");
    setFormInstructions(exercise.instructions || "");
    setFeedback(null);
    setFieldErrors({});
    setIsFormOpen(true);
  }

  function closeModal() {
    setIsFormOpen(false);
    setActiveEditing(null);
    setFeedback(null);
    setFieldErrors({});
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    params.set("page", "1");
    router.push(`/consultoria/${consultancySlug}/personal/exercicios?${params.toString()}`);
  }

  function handleStatusTabClick(newStatus: "ALL" | "ACTIVE" | "INACTIVE") {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (newStatus !== "ALL") params.set("status", newStatus);
    params.set("page", "1");
    router.push(`/consultoria/${consultancySlug}/personal/exercicios?${params.toString()}`);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("slug", consultancySlug);
    formData.set("name", formName);
    formData.set("muscleGroup", formMuscleGroup);
    formData.set("equipment", formEquipment);
    formData.set("description", formDescription);
    formData.set("instructions", formInstructions);

    startTransition(async () => {
      if (activeEditing) {
        formData.set("exercisePublicId", activeEditing.publicId);
        const res = await updateTrainingExerciseAction({}, formData);
        if (res.success) {
          setFeedback({
            type: "success",
            message: res.message || "Exercício atualizado com sucesso!",
          });
          setTimeout(() => {
            closeModal();
            router.refresh();
          }, 800);
        } else {
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          setFeedback({
            type: "error",
            message: res.error || "Erro ao atualizar exercício.",
          });
        }
      } else {
        const res = await createTrainingExerciseAction({}, formData);
        if (res.success) {
          setFeedback({
            type: "success",
            message: res.message || "Exercício cadastrado com sucesso!",
          });
          setTimeout(() => {
            closeModal();
            router.refresh();
          }, 800);
        } else {
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          setFeedback({
            type: "error",
            message: res.error || "Erro ao cadastrar exercício.",
          });
        }
      }
    });
  }

  function handleDeactivate(exercisePublicId: string) {
    if (!confirm("Deseja desativar este exercício? Ele não aparecerá no catálogo de novas prescrições.")) {
      return;
    }
    startTransition(async () => {
      const res = await deactivateTrainingExerciseAction(exercisePublicId, consultancySlug);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Erro ao desativar exercício.");
      }
    });
  }

  function handleReactivate(exercisePublicId: string) {
    startTransition(async () => {
      const res = await reactivateTrainingExerciseAction(exercisePublicId, consultancySlug);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || "Erro ao reativar exercício.");
      }
    });
  }

  function getPageUrl(targetPage: number) {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    params.set("page", String(targetPage));
    return `/consultoria/${consultancySlug}/personal/exercicios?${params.toString()}`;
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 pb-1">
            <Link
              href={`/consultoria/${consultancySlug}`}
              className="inline-flex items-center text-xs font-semibold text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              ← Voltar à consultoria
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Biblioteca de Exercícios
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Gerencie o catálogo de exercícios para a prescrição de treinos.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white text-sm font-semibold rounded-lg shadow-sm transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Exercício
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="p-4 sm:p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, grupo muscular ou equipamento..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-zinc-900 placeholder:text-zinc-400 bg-white"
            />
            <svg
              className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 active:bg-black text-white text-sm font-semibold rounded-lg shadow-2xs transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            Buscar
          </button>
        </form>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={() => handleStatusTabClick("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "ALL"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => handleStatusTabClick("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "ACTIVE"
                ? "bg-[#00A859] text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Ativos
          </button>
          <button
            type="button"
            onClick={() => handleStatusTabClick("INACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "INACTIVE"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Inativos
          </button>

          <span className="ml-auto text-xs text-zinc-500 font-medium">
            {total} {total === 1 ? "exercício" : "exercícios"}
          </span>
        </div>
      </div>

      {/* Exercises List */}
      {items.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-xl bg-white border border-zinc-200 shadow-2xs text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-zinc-900">
            Nenhum exercício encontrado
          </h3>
          <p className="text-xs text-zinc-500 max-w-[360px] mx-auto">
            {searchQuery
              ? `Não foram encontrados resultados para "${searchQuery}". Tente outros termos.`
              : "Comece cadastrando o primeiro exercício da sua consultoria."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center px-4 py-2 bg-[#00A859] hover:bg-[#008f4c] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all"
            >
              Cadastrar Exercício
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {items.map((exercise) => {
              const isActive = exercise.status === "ACTIVE";

              return (
                <div
                  key={exercise.publicId}
                  className={`p-4 sm:p-5 rounded-xl bg-white border transition-all ${
                    isActive
                      ? "border-zinc-200 shadow-2xs"
                      : "border-zinc-200/80 bg-zinc-50/50 opacity-85"
                  } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900">
                        {exercise.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isActive
                            ? "bg-emerald-50 text-[#00A859] border border-emerald-200"
                            : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                        }`}
                      >
                        {isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    {/* Muscle group & Equipment tags */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                      {exercise.muscleGroup && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium">
                          {exercise.muscleGroup}
                        </span>
                      )}
                      {exercise.equipment && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 font-medium">
                          {exercise.equipment}
                        </span>
                      )}
                    </div>

                    {exercise.description && (
                      <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                        {exercise.description}
                      </p>
                    )}

                    {exercise.instructions && (
                      <details className="text-xs text-zinc-500 pt-1">
                        <summary className="cursor-pointer font-medium text-zinc-700 hover:text-zinc-900 transition-colors">
                          Ver instruções de execução
                        </summary>
                        <p className="mt-1.5 p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/60 text-zinc-700 whitespace-pre-line leading-relaxed">
                          {exercise.instructions}
                        </p>
                      </details>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100">
                    <button
                      type="button"
                      onClick={() => openEditModal(exercise)}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859]"
                    >
                      Editar
                    </button>

                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(exercise.publicId)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 active:bg-amber-100 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        Desativar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReactivate(exercise.publicId)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 border border-emerald-300 text-[#00A859] hover:bg-emerald-100 active:bg-emerald-200 transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859]"
                      >
                        Reativar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-500 font-medium">
                Página {page} de {totalPages}
              </span>

              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={getPageUrl(page - 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-all"
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 text-zinc-400 cursor-not-allowed">
                    ← Anterior
                  </span>
                )}

                {page < totalPages ? (
                  <Link
                    href={getPageUrl(page + 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-all"
                  >
                    Próxima →
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 text-zinc-400 cursor-not-allowed">
                    Próxima →
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal / Drawer for Create & Edit */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-[540px] max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-zinc-200 shadow-xl p-5 sm:p-6 space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="text-lg font-bold text-zinc-900">
                {activeEditing ? "Editar Exercício" : "Novo Exercício"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold border ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-[#00A859] border-emerald-200"
                    : "bg-red-50 text-red-800 border-red-200"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-800">
                  Nome do exercício <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Supino Reto com Barra"
                  maxLength={255}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#00A859] text-zinc-900 bg-white"
                />
                {fieldErrors.name && (
                  <p className="text-xs text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Grupo muscular
                  </label>
                  <input
                    type="text"
                    value={formMuscleGroup}
                    onChange={(e) => setFormMuscleGroup(e.target.value)}
                    placeholder="Ex: Peitoral, Quadríceps"
                    maxLength={100}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#00A859] text-zinc-900 bg-white"
                  />
                  {fieldErrors.muscleGroup && (
                    <p className="text-xs text-red-600">{fieldErrors.muscleGroup}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-800">
                    Equipamento
                  </label>
                  <input
                    type="text"
                    value={formEquipment}
                    onChange={(e) => setFormEquipment(e.target.value)}
                    placeholder="Ex: Barra, Halteres, Polia"
                    maxLength={100}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#00A859] text-zinc-900 bg-white"
                  />
                  {fieldErrors.equipment && (
                    <p className="text-xs text-red-600">{fieldErrors.equipment}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-800">
                  Descrição
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Breve resumo ou objetivo do exercício..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#00A859] text-zinc-900 bg-white resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-800">
                  Instruções de execução
                </label>
                <textarea
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Orientações de postura, cadência e execução..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#00A859] text-zinc-900 bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 rounded-lg transition-all"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : activeEditing ? "Salvar Alterações" : "Cadastrar Exercício"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
