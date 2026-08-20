"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordRecovery, ForgotPasswordFormState } from "@/app/recuperar-senha/actions";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/alert";

const initialState: ForgotPasswordFormState = {
  success: false,
};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    requestPasswordRecovery,
    initialState
  );

  return (
    <form action={formAction} className="w-full space-y-4" noValidate>
      {/* Alerta de envio / conclusão genérica com entrega configurada */}
      {state.success && state.status === "COMPLETED" && state.message && (
        <Alert variant="success">
          {state.message}
        </Alert>
      )}

      {/* Alerta informativo quando SMTP não está configurado no ambiente */}
      {state.success && state.status === "UNAVAILABLE" && state.message && (
        <Alert variant="info">
          {state.message}
        </Alert>
      )}

      {/* Alerta de erro de validação */}
      {!state.success && state.error && (
        <Alert variant="danger">
          {state.error}
        </Alert>
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
