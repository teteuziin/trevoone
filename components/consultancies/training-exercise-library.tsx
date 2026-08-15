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
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/empty-state";

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
      <PageHeader
        title="Biblioteca de Exercícios"
        description="Gerencie o catálogo de exercícios para a prescrição e montagem de treinos."
        backHref={`/consultoria/${consultancySlug}`}
        backLabel="Voltar à visão geral"
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={openCreateModal}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Exercício
          </Button>
        }
      />

      {/* Search and Filter Controls */}
      <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, grupo muscular ou equipamento..."
              aria-label="Buscar exercícios por nome, grupo muscular ou equipamento"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border-default)] focus-visible:outline-[var(--brand)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] bg-[var(--surface)] transition-colors"
            />
            <svg
              className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            className="px-4 py-2 bg-[var(--brand-strong)] hover:bg-[var(--brand)] text-white text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0 focus-visible:outline-[var(--brand)]"
          >
            Buscar
          </button>
        </form>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border-subtle)] pt-3">
          <button
            type="button"
            onClick={() => handleStatusTabClick("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "ALL"
                ? "bg-[var(--text-primary)] text-[var(--surface)]"
                : "bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => handleStatusTabClick("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "ACTIVE"
                ? "bg-[var(--brand-strong)] text-white"
                : "bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
            }`}
          >
            Ativos
          </button>
          <button
            type="button"
            onClick={() => handleStatusTabClick("INACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === "INACTIVE"
                ? "bg-[var(--text-secondary)] text-[var(--surface)]"
                : "bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)]"
            }`}
          >
            Inativos
          </button>

          <span className="ml-auto text-xs text-[var(--text-tertiary)] font-medium">
            {total} {total === 1 ? "exercício" : "exercícios"}
          </span>
        </div>
      </div>

      {/* Exercises List */}
      {items.length === 0 ? (
        <EmptyState
          title={
            searchQuery
              ? "Nenhum exercício encontrado"
              : statusFilter !== "ALL"
              ? "Nenhum exercício neste filtro"
              : "Nenhum exercício cadastrado"
          }
          description={
            searchQuery
              ? `Não foram encontrados resultados para "${searchQuery}". Tente outros termos.`
              : statusFilter !== "ALL"
              ? "Não há exercícios cadastrados com o status selecionado."
              : "Comece cadastrando o primeiro exercício do catálogo da consultoria."
          }
          action={
            !searchQuery && statusFilter === "ALL" ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={openCreateModal}
              >
                Cadastrar Exercício
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {items.map((exercise) => {
              const isActive = exercise.status === "ACTIVE";

              return (
                <div
                  key={exercise.publicId}
                  className={`p-4 sm:p-5 rounded-xl bg-[var(--surface)] border transition-all ${
                    isActive
                      ? "border-[var(--border-default)] shadow-xs"
                      : "border-[var(--border-subtle)] bg-[var(--surface-subtle)] opacity-85"
                  } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                        {exercise.name}
                      </h3>
                      <Badge
                        variant={isActive ? "success" : "neutral"}
                        size="sm"
                      >
                        {isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    {/* Muscle group & Equipment tags */}
                    {(exercise.muscleGroup || exercise.equipment) && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {exercise.muscleGroup && (
                          <Badge variant="neutral" size="sm">
                            {exercise.muscleGroup}
                          </Badge>
                        )}
                        {exercise.equipment && (
                          <Badge variant="neutral" size="sm">
                            {exercise.equipment}
                          </Badge>
                        )}
                      </div>
                    )}

                    {exercise.description && (
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                        {exercise.description}
                      </p>
                    )}

                    {exercise.instructions && (
                      <details className="text-xs text-[var(--text-secondary)] pt-1">
                        <summary className="cursor-pointer font-medium text-[var(--text-primary)] hover:text-[var(--brand-foreground)] transition-colors">
                          Ver instruções de execução
                        </summary>
                        <p className="mt-1.5 p-3 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                          {exercise.instructions}
                        </p>
                      </details>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => openEditModal(exercise)}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] transition-colors focus-visible:outline-[var(--brand)]"
                    >
                      Editar
                    </button>

                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(exercise.publicId)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface)] border border-[var(--warning-border)] text-[var(--warning-foreground)] hover:bg-[var(--warning-soft)] transition-colors focus-visible:outline-[var(--warning-foreground)]"
                      >
                        Desativar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReactivate(exercise.publicId)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-foreground)] hover:bg-[var(--brand-soft-border)] transition-colors focus-visible:outline-[var(--brand)]"
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
            <nav
              aria-label="Paginação da biblioteca de exercícios"
              className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex items-center justify-between gap-2"
            >
              <span className="text-xs text-[var(--text-secondary)] font-medium">
                Página {page} de {totalPages}
              </span>

              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link
                    href={getPageUrl(page - 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text-primary)] border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
                  >
                    ← Anterior
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] cursor-not-allowed select-none">
                    ← Anterior
                  </span>
                )}

                {page < totalPages ? (
                  <Link
                    href={getPageUrl(page + 1)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text-primary)] border border-[var(--border-default)] transition-colors focus-visible:outline-[var(--brand)]"
                  >
                    Próxima →
                  </Link>
                ) : (
                  <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] cursor-not-allowed select-none">
                    Próxima →
                  </span>
                )}
              </div>
            </nav>
          )}
        </div>
      )}

      {/* Modal / Drawer for Create & Edit */}
      {isFormOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exercise_modal_title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-[540px] max-h-[90vh] overflow-y-auto bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] shadow-xl p-5 sm:p-6 space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 id="exercise_modal_title" className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {activeEditing ? "Editar Exercício" : "Novo Exercício"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Fechar modal"
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-sm font-semibold p-1 transition-colors"
              >
                ✕
              </button>
            </div>

            {feedback && (
              <div
                role="alert"
                aria-live="polite"
                className={`p-3.5 rounded-lg text-xs font-semibold border ${
                  feedback.type === "success"
                    ? "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border-[var(--brand-soft-border)]"
                    : "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border-[var(--danger-soft-border)]"
                }`}
              >
                {feedback.message}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <FormField
                label="Nome do exercício"
                id="exercise_name_input"
                error={fieldErrors.name}
                required
              >
                <Input
                  id="exercise_name_input"
                  name="name"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Supino Reto com Barra"
                  maxLength={255}
                  hasError={Boolean(fieldErrors.name)}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  label="Grupo muscular"
                  id="exercise_muscle_input"
                  error={fieldErrors.muscleGroup}
                >
                  <Input
                    id="exercise_muscle_input"
                    name="muscleGroup"
                    type="text"
                    value={formMuscleGroup}
                    onChange={(e) => setFormMuscleGroup(e.target.value)}
                    placeholder="Ex: Peitoral, Quadríceps"
                    maxLength={100}
                    hasError={Boolean(fieldErrors.muscleGroup)}
                  />
                </FormField>

                <FormField
                  label="Equipamento"
                  id="exercise_equipment_input"
                  error={fieldErrors.equipment}
                >
                  <Input
                    id="exercise_equipment_input"
                    name="equipment"
                    type="text"
                    value={formEquipment}
                    onChange={(e) => setFormEquipment(e.target.value)}
                    placeholder="Ex: Barra, Halteres, Polia"
                    maxLength={100}
                    hasError={Boolean(fieldErrors.equipment)}
                  />
                </FormField>
              </div>

              <FormField
                label="Descrição"
                id="exercise_description_input"
              >
                <Textarea
                  id="exercise_description_input"
                  name="description"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Breve resumo ou objetivo do exercício..."
                />
              </FormField>

              <FormField
                label="Instruções de execução"
                id="exercise_instructions_input"
              >
                <Textarea
                  id="exercise_instructions_input"
                  name="instructions"
                  rows={3}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Orientações de postura, cadência e execução..."
                />
              </FormField>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeModal}
                  disabled={isPending}
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isPending}
                  disabled={isPending}
                >
                  {isPending ? "Salvando..." : activeEditing ? "Salvar Alterações" : "Cadastrar Exercício"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
