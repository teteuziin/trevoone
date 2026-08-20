"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAccount, RegisterFormState } from "@/app/cadastro/actions";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form-controls";
import { Alert } from "@/components/ui/alert";

const initialState: RegisterFormState = {
  success: false,
};

export function RegisterForm({ returnTo }: { returnTo?: string }) {
  const [state, formAction, isPending] = useActionState(registerAccount, initialState);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginHref = `/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`;

  if (state.success) {
    return (
      <div className="w-full space-y-5 text-center py-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)] flex items-center justify-center">
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {state.message || "Conta criada com sucesso."}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Sua conta no Trevo One foi registrada com sucesso.
          </p>
        </div>
        <div className="pt-2">
          <Link href={loginHref} className="w-full block">
            <Button
              type="button"
              fullWidth
              size="md"
              className="font-semibold"
            >
              Ir para o login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const errors = state.errors || {};

  return (
    <form action={formAction} className="w-full space-y-4" noValidate>
      {/* Alerta de erro geral */}
      {state.message && !state.success && (
        <Alert variant="danger">
          {state.message}
        </Alert>
      )}

      {/* Campo Nome completo */}

      <FormField
        label="Nome completo"
        id="full_name"
        error={errors.full_name}
      >
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          placeholder="Digite seu nome completo"
          hasError={!!errors.full_name}
          aria-invalid={!!errors.full_name}
          aria-describedby={errors.full_name ? "full_name-error" : undefined}
        />
      </FormField>

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
        helperText={!errors.password ? "Mínimo de 6 caracteres." : undefined}
        error={errors.password}
      >
        <div className="relative flex items-center">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            hasError={!!errors.password}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : "password-hint"}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:text-[var(--brand)] transition-colors"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c1.274 4.057 5.065 7 9.542 7 4.477 0 8.268-2.943 9.542-7-1.274-4.057-5.065-7-9.542-7-4.477 0-8.268 2.943-9.542 7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </FormField>

      {/* Campo Confirmar senha */}
      <FormField
        label="Confirmar senha"
        id="confirm_password"
        error={errors.confirm_password}
      >
        <div className="relative flex items-center">
          <Input
            id="confirm_password"
            name="confirm_password"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            hasError={!!errors.confirm_password}
            aria-invalid={!!errors.confirm_password}
            aria-describedby={errors.confirm_password ? "confirm_password-error" : undefined}
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:text-[var(--brand)] transition-colors"
            aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
          >
            {showConfirmPassword ? (
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12c1.274 4.057 5.065 7 9.542 7 4.477 0 8.268-2.943 9.542-7-1.274-4.057-5.065-7-9.542-7-4.477 0-8.268 2.943-9.542 7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </FormField>

      {/* Aceite dos Termos de Uso */}
      <div className="pt-1 text-left space-y-1">
        <label className="flex items-start space-x-2 cursor-pointer select-none text-xs text-[var(--text-secondary)] leading-normal hover:text-[var(--text-primary)] transition-colors">
          <input
            type="checkbox"
            name="terms_accepted"
            aria-invalid={!!errors.terms_accepted}
            aria-describedby={errors.terms_accepted ? "terms-error" : undefined}
            className="w-4 h-4 mt-0.5 rounded border-[var(--border-default)] text-[var(--brand)] focus:ring-[var(--brand)] accent-[var(--brand)] cursor-pointer shrink-0"
          />
          <span>
            Li e aceito os{" "}
            <span className="font-medium text-[var(--text-primary)]">Termos de Uso</span> e a{" "}
            <span className="font-medium text-[var(--text-primary)]">Política de Privacidade</span>.
          </span>
        </label>
        {errors.terms_accepted && (
          <p id="terms-error" className="text-xs text-[var(--danger)] font-medium pt-0.5">
            {errors.terms_accepted}
          </p>
        )}
      </div>

      {/* Botão Principal Criar conta */}
      <Button
        type="submit"
        fullWidth
        size="md"
        isLoading={isPending}
        className="mt-3 font-semibold"
      >
        {isPending ? "Criando conta..." : "Criar conta"}
      </Button>

      {/* Navegação Cadastro -> Login */}
      <div className="text-center text-xs sm:text-sm text-[var(--text-secondary)] pt-3 border-t border-[var(--border-subtle)]">
        <span>Já possui uma conta? </span>
        <Link
          href={loginHref}
          className="font-semibold text-[var(--brand-strong)] hover:text-[var(--brand)] hover:underline focus-visible:outline-[var(--brand)] rounded px-1 py-0.5 transition-colors"
        >
          Entrar
        </Link>
      </div>
    </form>
  );
}
