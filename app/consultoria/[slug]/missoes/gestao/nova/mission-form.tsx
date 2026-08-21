"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  createMissionAction,
  type CreateMissionFormState,
} from "../actions";
import type { EligibleInfluencerOption } from "@/lib/consultancies/missions";
import {
  FormField,
  Label,
  Input,
  Textarea,
  Select,
} from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

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
        <Alert variant="danger" title="Erro ao criar missão">
          {state.error}
        </Alert>
      )}

      {/* Influencer selection */}
      <div>
        <Label htmlFor="assigneeMembershipPublicId" required>
          Destinatário (Influenciador / VIP)
        </Label>
        {influencers.length === 0 ? (
          <Alert
            variant="warning"
            title="Nenhum influenciador disponível"
          >
            Nenhum membro com perfil de Influenciador / VIP ativo encontrado nesta consultoria. Convide ou atribua a função a um participante antes de criar missões.
          </Alert>
        ) : (
          <Select
            id="assigneeMembershipPublicId"
            name="assigneeMembershipPublicId"
            required
            value={assigneeMembershipPublicId}
            onChange={(e) => setAssigneeMembershipPublicId(e.target.value)}
            disabled={isPending}
            hasError={state?.field === "assigneeMembershipPublicId"}
          >
            <option value="">Selecione um influenciador / VIP...</option>
            {influencers.map((inf) => (
              <option key={inf.membershipPublicId} value={inf.membershipPublicId}>
                {inf.name} ({inf.email})
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* Title */}
      <FormField
        id="title"
        label="Título da Missão"
        required
        helperText={`${title.length}/160 caracteres`}
        error={state?.field === "title" ? state.error : undefined}
      >
        <Input
          id="title"
          name="title"
          type="text"
          required
          maxLength={160}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Gravação de depoimento sobre o plano nutricional"
          disabled={isPending}
          hasError={state?.field === "title"}
        />
      </FormField>

      {/* Objective */}
      <FormField
        id="objective"
        label="Objetivo da Missão"
        required
        helperText={`${objective.length}/2000 caracteres`}
        error={state?.field === "objective" ? state.error : undefined}
      >
        <Textarea
          id="objective"
          name="objective"
          rows={3}
          required
          maxLength={2000}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="Descreva de forma concisa o que se espera alcançar com esta entrega..."
          disabled={isPending}
          hasError={state?.field === "objective"}
        />
      </FormField>

      {/* Instructions */}
      <FormField
        id="instructions"
        label="Instruções e Diretrizes Detalhadas"
        required
        helperText={`${instructions.length}/10000 caracteres`}
        error={state?.field === "instructions" ? state.error : undefined}
      >
        <Textarea
          id="instructions"
          name="instructions"
          rows={6}
          required
          maxLength={10000}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={"1. Mencionar a consultoria no início do vídeo\n2. Enfatizar a personalização da periodização\n3. Inserir o link oficial na bio ou sticker do Instagram..."}
          disabled={isPending}
          hasError={state?.field === "instructions"}
        />
      </FormField>

      {/* Priority & Deadline Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
        <div>
          <Label htmlFor="priority">
            Prioridade
          </Label>
          <Select
            id="priority"
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={isPending}
          >
            <option value="LOW">Baixa</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
          </Select>
        </div>

        <div>
          <Label htmlFor="dueDate" required>
            Data Limite
          </Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isPending}
            hasError={state?.field === "dueDate"}
          />
        </div>

        <div>
          <Label htmlFor="dueTime" required>
            Horário Limite
          </Label>
          <Input
            id="dueTime"
            name="dueTime"
            type="time"
            required
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={isPending}
            hasError={state?.field === "dueTime"}
          />
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] flex items-center justify-between">
        <span>Fuso horário canônico da consultoria:</span>
        <strong className="font-mono text-[var(--text-primary)] font-semibold">{timezone}</strong>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-subtle)]">
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isPending}
          disabled={isPending || influencers.length === 0}
        >
          {isPending ? "Criando missão..." : "Criar missão"}
        </Button>

        <Link href={`/consultoria/${slug}/missoes/gestao`}>
          <Button variant="ghost" size="md">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
