"use client";

import { useActionState, useState } from "react";
import {
  createConsultancyAction,
  type CreateConsultancyFormState,
} from "./actions";
import { FormField, Input } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ConsultancyForm() {
  const [state, formAction, isPending] = useActionState<
    CreateConsultancyFormState | null,
    FormData
  >(createConsultancyAction, null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugCustomized, setSlugCustomized] = useState(false);
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [initialAdminEmail, setInitialAdminEmail] = useState("");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!slugCustomized) {
      setSlug(slugify(newName));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugCustomized(true);
    setSlug(e.target.value);
  };

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.error && (
        <Alert variant="danger" title="Erro ao criar consultoria">
          {state.error}
        </Alert>
      )}

      <FormField
        label="Nome da consultoria"
        id="name"
        required
      >
        <Input
          id="name"
          name="name"
          type="text"
          required
          maxLength={160}
          value={name}
          onChange={handleNameChange}
          placeholder="Ex: Saiya Shape"
          disabled={isPending}
        />
      </FormField>

      <FormField
        label="Slug (identificador de URL)"
        id="slug"
        required
      >
        <Input
          id="slug"
          name="slug"
          type="text"
          required
          maxLength={120}
          value={slug}
          onChange={handleSlugChange}
          placeholder="Ex: saiya-shape"
          disabled={isPending}
          className="font-mono"
        />
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          Acesso futuro: /consultoria/{slug || "slug-da-consultoria"}
        </p>
      </FormField>

      <FormField
        label="Fuso horário"
        id="timezone"
        required
      >
        <Input
          id="timezone"
          name="timezone"
          type="text"
          required
          maxLength={64}
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="America/Sao_Paulo"
          disabled={isPending}
          className="font-mono"
        />
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          Fuso horário operacional canônico da consultoria (formato IANA, ex: America/Sao_Paulo).
        </p>
      </FormField>

      <FormField
        label="Administrador inicial (e-mail)"
        id="initialAdminEmail"
        required
      >
        <Input
          id="initialAdminEmail"
          name="initialAdminEmail"
          type="email"
          required
          maxLength={254}
          value={initialAdminEmail}
          onChange={(e) => setInitialAdminEmail(e.target.value)}
          placeholder="admin@exemplo.com"
          disabled={isPending}
        />
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          A conta já deve estar cadastrada no Trevo One.
        </p>
      </FormField>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          isLoading={isPending}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? "Criando..." : "Criar consultoria"}
        </Button>
      </div>
    </form>
  );
}
