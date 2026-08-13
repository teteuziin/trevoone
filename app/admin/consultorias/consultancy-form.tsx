"use client";

import { useActionState, useState } from "react";
import {
  createConsultancyAction,
  type CreateConsultancyFormState,
} from "./actions";

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
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200/80 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
        >
          Nome da consultoria
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={160}
          value={name}
          onChange={handleNameChange}
          placeholder="Ex: Saiya Shape"
          disabled={isPending}
          className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm transition-all disabled:opacity-60"
        />
      </div>

      <div>
        <label
          htmlFor="slug"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
        >
          Slug (identificador de URL)
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          maxLength={120}
          value={slug}
          onChange={handleSlugChange}
          placeholder="Ex: saiya-shape"
          disabled={isPending}
          className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm font-mono transition-all disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Acesso futuro: /consultoria/{slug || "slug-da-consultoria"}
        </p>
      </div>

      <div>
        <label
          htmlFor="initialAdminEmail"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
        >
          Administrador inicial (e-mail)
        </label>
        <input
          id="initialAdminEmail"
          name="initialAdminEmail"
          type="email"
          required
          maxLength={254}
          value={initialAdminEmail}
          onChange={(e) => setInitialAdminEmail(e.target.value)}
          placeholder="admin@exemplo.com"
          disabled={isPending}
          className="w-full h-11 px-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm transition-all disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-zinc-500">
          A conta já deve estar cadastrada no Trevo One.
        </p>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto px-6 h-11 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Criando..." : "Criar consultoria"}
        </button>
      </div>
    </form>
  );
}
