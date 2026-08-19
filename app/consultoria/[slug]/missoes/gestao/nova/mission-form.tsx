"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createMissionAction,
  type CreateMissionFormState,
} from "../actions";
import type { EligibleInfluencerOption } from "@/lib/consultancies/missions";

export function MissionCreateForm({
  slug,
  timezone,
  influencers,
  defaultDate,
}: {
  slug: string;
  timezone: string;
  influencers: EligibleInfluencerOption[];
  defaultDate: string;
}) {
  const [state, formAction, isPending] = useActionState<CreateMissionFormState | null, FormData>(
    (prevState, formData) => createMissionAction(slug, prevState, formData),
    null
  );

  const [assigneeMembershipPublicId, setAssigneeMembershipPublicId] = useState(
    influencers.length === 1 ? influencers[0].membershipPublicId : ""
  );
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [instructions, setInstructions] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [dueDate, setDueDate] = useState(defaultDate);
  const [dueTime, setDueTime] = useState("18:00");

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200/80 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Influencer selection */}
      <div>
        <label
          htmlFor="assigneeMembershipPublicId"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
        >
          Destinatário (Influenciador / VIP) *
        </label>
        {influencers.length === 0 ? (
          <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
            Nenhum membro com perfil de Influenciador / VIP ativo encontrado nesta consultoria. Convide ou atribua a função a um participante antes de criar missões.
          </div>
        ) : (
          <select
            id="assigneeMembershipPublicId"
            name="assigneeMembershipPublicId"
            required
            value={assigneeMembershipPublicId}
            onChange={(e) => setAssigneeMembershipPublicId(e.target.value)}
            disabled={isPending}
            className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm transition-all disabled:opacity-60"
          >
            <option value="">Selecione um influenciador / VIP...</option>
            {influencers.map((inf) => (
              <option key={inf.membershipPublicId} value={inf.membershipPublicId}>
                {inf.name} ({inf.email})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
        >
          Título da Missão *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Gravação de depoimento sobre o plano nutricional"
          disabled={isPending}
          className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm transition-all disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-zinc-500 text-right">{title.length}/160</p>
      </div>

      {/* Objective */}
      <div>
        <label
          htmlFor="objective"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
        >
          Objetivo da Missão *
        </label>
        <textarea
          id="objective"
          name="objective"
          rows={3}
          required
          maxLength={2000}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Descreva de forma concisa o que se espera alcançar com esta entrega..."
          disabled={isPending}
          className="w-full p-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm transition-all disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-zinc-500 text-right">{objective.length}/2000</p>
      </div>

      {/* Instructions */}
      <div>
        <label
          htmlFor="instructions"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
        >
          Instruções e Diretrizes Detalhadas *
        </label>
        <textarea
          id="instructions"
          name="instructions"
          rows={6}
          required
          maxLength={10000}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="1. Mencionar a consultoria no início do vídeo&#10;2. Enfatizar a personalização da periodização&#10;3. Inserir o link oficial na bio ou sticker do Instagram..."
          disabled={isPending}
          className="w-full p-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm transition-all disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-zinc-500 text-right">{instructions.length}/10000</p>
      </div>

      {/* Priority & Deadline Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div>
          <label
            htmlFor="priority"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
          >
            Prioridade
          </label>
          <select
            id="priority"
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={isPending}
            className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm transition-all disabled:opacity-60"
          >
            <option value="LOW">Baixa</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="dueDate"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
          >
            Data Limite *
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isPending}
            className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm transition-all disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="dueTime"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
          >
            Horário Limite *
          </label>
          <input
            id="dueTime"
            name="dueTime"
            type="time"
            required
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={isPending}
            className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm transition-all disabled:opacity-60"
          />
        </div>
      </div>

      <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 flex items-center justify-between">
        <span>Fuso horário canônico da consultoria:</span>
        <strong className="font-mono text-zinc-800 font-semibold">{timezone}</strong>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
        <button
          type="submit"
          disabled={isPending || influencers.length === 0}
          className="px-6 h-11 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Criando missão..." : "Criar missão"}
        </button>

        <Link
          href={`/consultoria/${slug}/missoes/gestao`}
          className="px-4 h-11 flex items-center text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
