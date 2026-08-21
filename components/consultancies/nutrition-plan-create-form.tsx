"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createNutritionPlanAction } from "@/app/consultoria/[slug]/nutricao/planos/actions";
import { FormField, Input, Textarea, Select } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import type { NutritionStudentOptionDto } from "@/lib/consultancies/nutrition";

interface NutritionPlanCreateFormProps {
  slug: string;
  students: NutritionStudentOptionDto[];
}

export function NutritionPlanCreateForm({ slug, students }: NutritionPlanCreateFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await createNutritionPlanAction(slug, formData);
      if (!res.success) {
        setError(res.error);
        setIsPending(false);
        return;
      }

      if (res.data?.planPublicId) {
        router.push(`/consultoria/${slug}/nutricao/planos/${res.data.planPublicId}`);
      } else {
        router.push(`/consultoria/${slug}/nutricao/planos`);
      }
    } catch {
      setError("Ocorreu um erro ao criar o plano alimentar. Tente novamente.");
      setIsPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-[var(--surface)] p-6 sm:p-8 rounded-2xl border border-[var(--border-default)] shadow-xs max-w-2xl"
    >
      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}

      {/* Aluno */}
      {students.length === 0 ? (
        <Alert variant="warning">
          Nenhum aluno ativo encontrado nesta consultoria. Convide ou ative alunos antes de prescrever um plano.
        </Alert>
      ) : (
        <FormField label="Aluno" id="studentMembershipPublicId" required>
          <Select
            id="studentMembershipPublicId"
            name="studentMembershipPublicId"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Selecione o aluno destinatário
            </option>
            {students.map((student) => (
              <option key={student.membershipPublicId} value={student.membershipPublicId}>
                {student.fullName} ({student.email})
              </option>
            ))}
          </Select>
        </FormField>
      )}

      {/* Título do plano */}
      <FormField label="Título do plano alimentar" id="title" required>
        <Input
          id="title"
          name="title"
          type="text"
          required
          maxLength={255}
          placeholder="Ex: Hipertrofia & Rendimento - Fase 1"
        />
      </FormField>

      {/* Subtítulo / Objetivo */}
      <FormField label="Subtítulo / Meta" id="subtitle" optional>
        <Input
          id="subtitle"
          name="subtitle"
          type="text"
          maxLength={255}
          placeholder="Ex: Foco em ganho de massa magra com aporte proteico distribuído"
        />
      </FormField>

      {/* Orientações gerais */}
      <FormField label="Orientações gerais" id="generalGuidance" optional>
        <Textarea
          id="generalGuidance"
          name="generalGuidance"
          rows={3}
          placeholder="Ex: Hidratação mínima de 3L/dia; priorizar alimentos integrais; evitar consumo de líquidos nas grandes refeições."
        />
      </FormField>

      {/* Datas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Data de início" id="startsOn" optional>
          <Input
            id="startsOn"
            name="startsOn"
            type="date"
          />
        </FormField>

        <FormField label="Data de término" id="endsOn" optional>
          <Input
            id="endsOn"
            name="endsOn"
            type="date"
          />
        </FormField>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
        <Link
          href={`/consultoria/${slug}/nutricao/planos`}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-xl transition-all"
        >
          Cancelar
        </Link>
        <Button
          type="submit"
          variant="primary"
          disabled={isPending || students.length === 0}
        >
          {isPending ? "Criando rascunho..." : "Criar rascunho e editar"}
        </Button>
      </div>
    </form>
  );
}
