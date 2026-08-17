"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createNutritionPlanAction } from "@/app/consultoria/[slug]/nutricao/planos/actions";
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
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Aluno */}
      <div className="space-y-1.5">
        <label htmlFor="studentMembershipPublicId" className="block text-sm font-semibold text-slate-800">
          Aluno <span className="text-red-500">*</span>
        </label>
        {students.length === 0 ? (
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
            Nenhum aluno ativo encontrado nesta consultoria. Convide ou ative alunos antes de prescrever um plano.
          </p>
        ) : (
          <select
            id="studentMembershipPublicId"
            name="studentMembershipPublicId"
            required
            defaultValue=""
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            <option value="" disabled>
              Selecione o aluno destinatário
            </option>
            {students.map((student) => (
              <option key={student.membershipPublicId} value={student.membershipPublicId}>
                {student.fullName} ({student.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Título do plano */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-semibold text-slate-800">
          Título do plano alimentar <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={255}
          placeholder="Ex: Hipertrofia & Rendimento - Fase 1"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>

      {/* Subtítulo / Objetivo */}
      <div className="space-y-1.5">
        <label htmlFor="subtitle" className="block text-sm font-semibold text-slate-800">
          Subtítulo / Meta <span className="text-xs text-slate-400 font-normal">(opcional)</span>
        </label>
        <input
          id="subtitle"
          name="subtitle"
          type="text"
          maxLength={255}
          placeholder="Ex: Foco em ganho de massa magra com aporte proteico distribuído"
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>

      {/* Orientações gerais */}
      <div className="space-y-1.5">
        <label htmlFor="generalGuidance" className="block text-sm font-semibold text-slate-800">
          Orientações gerais <span className="text-xs text-slate-400 font-normal">(opcional)</span>
        </label>
        <textarea
          id="generalGuidance"
          name="generalGuidance"
          rows={3}
          placeholder="Ex: Hidratação mínima de 3L/dia; priorizar alimentos integrais; evitar consumo de líquidos nas grandes refeições."
          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
        />
      </div>

      {/* Datas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="startsOn" className="block text-sm font-semibold text-slate-800">
            Data de início <span className="text-xs text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            id="startsOn"
            name="startsOn"
            type="date"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="endsOn" className="block text-sm font-semibold text-slate-800">
            Data de término <span className="text-xs text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            id="endsOn"
            name="endsOn"
            type="date"
            className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Link
          href={`/consultoria/${slug}/nutricao/planos`}
          className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending || students.length === 0}
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          {isPending ? "Criando rascunho..." : "Criar rascunho e editar"}
        </button>
      </div>
    </form>
  );
}
