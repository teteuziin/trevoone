"use client";

import { useActionState, useState } from "react";
import {
  createInvitationAction,
  type InvitationFormState,
} from "@/app/consultoria/[slug]/membros/actions";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form-controls";
import { Badge } from "@/components/ui/badge";

const initialState: InvitationFormState = {
  success: false,
};

export function InvitationForm({ slug }: { slug: string }) {
  const boundAction = createInvitationAction.bind(null, slug);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (path: string) => {
    try {
      const fullUrl = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-[var(--surface)] p-5 sm:p-6 rounded-xl border border-[var(--border-default)] shadow-xs space-y-4">
      <div className="space-y-1">
        <h2 id="invitation-form-heading" className="text-base font-bold text-[var(--text-primary)] tracking-tight">
          Convidar membro
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
          Gere um link seguro com validade de 7 dias para convidar uma nova pessoa para a consultoria.
        </p>
      </div>

      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-lg border border-[var(--danger-soft-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)] text-xs font-semibold"
        >
          {state.error}
        </div>
      )}

      {state.success && state.invitationPath && (
        <div
          role="status"
          className="p-4 rounded-xl border border-[var(--brand-soft-border)] bg-[var(--brand-soft)] space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[var(--brand-foreground)]">
                Convite gerado com sucesso!
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Copie o link abaixo para enviar ao convidado. O link expira em 7 dias e só pode ser visto aqui.
              </p>
            </div>
            <Badge variant="brand" size="sm">
              Válido por 7 dias
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={
                typeof window !== "undefined"
                  ? `${window.location.origin}${state.invitationPath}`
                  : state.invitationPath
              }
              aria-label="Link do convite gerado"
              className="flex-1 h-9 px-3 text-xs bg-[var(--surface)] border border-[var(--brand-soft-border)] rounded-lg text-[var(--text-primary)] font-mono select-all focus-visible:outline-[var(--brand)]"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleCopy(state.invitationPath!)}
              className="shrink-0 flex items-center justify-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copiado!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar link
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <form action={formAction} className="space-y-4" noValidate>
        {/* E-mail */}
        <FormField
          label="E-mail do convidado"
          id="invitation_email"
          required
        >
          <Input
            id="invitation_email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="pessoa@exemplo.com"
            required
          />
        </FormField>

        {/* Roles checkboxes */}
        <div className="space-y-2 text-left">
          <label className="block text-xs font-semibold text-[var(--text-secondary)]">
            Funções na consultoria <span className="text-[var(--danger)]">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--border-default)] hover:bg-[var(--surface-hover)] cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                name="roles"
                value="STUDENT"
                defaultChecked
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand)] focus-visible:outline-[var(--brand)] accent-[var(--brand)] cursor-pointer"
              />
              <span className="text-xs font-medium text-[var(--text-primary)]">
                Aluno
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--border-default)] hover:bg-[var(--surface-hover)] cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                name="roles"
                value="PERSONAL"
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand)] focus-visible:outline-[var(--brand)] accent-[var(--brand)] cursor-pointer"
              />
              <span className="text-xs font-medium text-[var(--text-primary)]">
                Personal
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--border-default)] hover:bg-[var(--surface-hover)] cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                name="roles"
                value="NUTRITIONIST"
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand)] focus-visible:outline-[var(--brand)] accent-[var(--brand)] cursor-pointer"
              />
              <span className="text-xs font-medium text-[var(--text-primary)]">
                Nutricionista
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--border-default)] hover:bg-[var(--surface-hover)] cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                name="roles"
                value="CONSULTANCY_ADMIN"
                className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand)] focus-visible:outline-[var(--brand)] accent-[var(--brand)] cursor-pointer"
              />
              <span className="text-xs font-medium text-[var(--text-primary)]">
                Administrador
              </span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-1">
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? "Criando convite..." : "Criar convite"}
          </Button>
        </div>
      </form>
    </div>
  );
}
