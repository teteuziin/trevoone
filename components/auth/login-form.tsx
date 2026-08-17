"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAccount, LoginFormState } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form-controls";

const initialState: LoginFormState = {
  success: false,
};

export function LoginForm({
  returnTo,
  resetSuccess,
}: {
  returnTo?: string;
  resetSuccess?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(loginAccount, initialState);
  const [showPassword, setShowPassword] = useState(false);

  const errors = state.errors || {};

  return (
    <form action={formAction} className="w-full space-y-4.5" noValidate>
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      {/* Alerta de sucesso após redefinição de senha */}
      {resetSuccess && !state.message && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium leading-relaxed text-left flex items-start gap-2.5"
        >
          <svg
            className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Sua senha foi redefinida com sucesso. Faça login com a nova senha.</span>
        </div>
      )}

      {/* Alerta de erro geral */}
      {state.message && !state.success && (
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
          <span>{state.message}</span>
        </div>
      )}

      {/* Campo E-mail */}
      <FormField
        label="E-mail"
        id="email"
        error={errors.email}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          hasError={!!errors.email}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
      </FormField>

      {/* Campo Senha */}
      <FormField
        label="Senha"
        id="password"
        error={errors.password}
      >
        <div className="relative flex items-center">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            hasError={!!errors.password}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:text-[var(--brand)] transition-colors"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12c1.274 4.057 5.065 7 9.542 7 4.477 0 8.268-2.943 9.542-7-1.274-4.057-5.065-7-9.542-7-4.477 0-8.268 2.943-9.542 7z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        </div>
      </FormField>

      {/* Opções: Manter conectado & Esqueci minha senha */}
      <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
        <label className="flex items-center space-x-2 cursor-pointer select-none text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <input
            type="checkbox"
            name="remember_me"
            className="w-4 h-4 rounded border-[var(--border-default)] text-[var(--brand)] focus:ring-[var(--brand)] accent-[var(--brand)] cursor-pointer"
          />
          <span className="text-xs font-normal">Manter conectado</span>
        </label>

        <Link
          href="/recuperar-senha"
          className="text-xs font-medium text-[var(--brand-strong)] hover:text-[var(--brand)] hover:underline focus-visible:outline-[var(--brand)] rounded px-1 py-0.5 transition-colors"
        >
          Esqueci minha senha
        </Link>
      </div>

      {/* Botão Entrar */}
      <Button
        type="submit"
        fullWidth
        size="md"
        isLoading={isPending}
        className="mt-2 font-semibold"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </Button>

      {/* Link para Criar Conta */}
      <div className="text-center text-xs sm:text-sm text-[var(--text-secondary)] pt-4 border-t border-[var(--border-subtle)]">
        <span>Ainda não possui uma conta? </span>
        <Link
          href={`/cadastro${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          className="font-semibold text-[var(--brand-strong)] hover:text-[var(--brand)] hover:underline focus-visible:outline-[var(--brand)] rounded px-1 py-0.5 transition-colors"
        >
          Criar conta
        </Link>
      </div>
    </form>
  );
}
