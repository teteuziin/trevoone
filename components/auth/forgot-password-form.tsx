"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordRecovery, ForgotPasswordFormState } from "@/app/recuperar-senha/actions";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form-controls";

const initialState: ForgotPasswordFormState = {
  success: false,
};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordRecovery,
    initialState
  );

  return (
    <form action={formAction} className="w-full space-y-4.5" noValidate>
      {/* Alerta informativo sobre status da recuperação */}
      {state.success && state.message && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300 text-xs font-medium leading-relaxed text-left flex items-start gap-2.5"
        >
          <svg
            className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <span>{state.message}</span>
        </div>
      )}

      {/* Alerta de erro de validação */}
      {!state.success && state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] text-[var(--danger-foreground)] text-xs font-medium leading-relaxed text-left flex items-start gap-2.5"
        >
          <svg
            className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span>{state.error}</span>
        </div>
      )}

      {/* Campo E-mail */}
      <FormField
        label="E-mail"
        id="email"
        error={!state.success ? state.error : undefined}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          hasError={!state.success && !!state.error}
          aria-invalid={!state.success && !!state.error}
          aria-describedby={!state.success && state.error ? "email-error" : undefined}
          disabled={isPending || state.success}
        />
      </FormField>

      {/* Botão Principal Enviar Instruções */}
      {!state.success ? (
        <Button
          type="submit"
          fullWidth
          size="md"
          isLoading={isPending}
          className="mt-2 font-semibold"
        >
          {isPending ? "Enviando..." : "Enviar instruções"}
        </Button>
      ) : (
        <div className="pt-2">
          <Link href="/login" className="w-full block">
            <Button
              type="button"
              variant="outline"
              fullWidth
              size="md"
              className="font-semibold"
            >
              Voltar para o login
            </Button>
          </Link>
        </div>
      )}

      {/* Navegação Voltar para o Login (quando formulário não concluído) */}
      {!state.success && (
        <div className="text-center text-xs sm:text-sm text-[var(--text-secondary)] pt-4 border-t border-[var(--border-subtle)]">
          <Link
            href="/login"
            className="inline-flex items-center font-semibold text-[var(--brand-strong)] hover:text-[var(--brand)] hover:underline focus-visible:outline-[var(--brand)] rounded px-1 py-0.5 transition-colors"
          >
            ← Voltar para o login
          </Link>
        </div>
      )}
    </form>
  );
}
