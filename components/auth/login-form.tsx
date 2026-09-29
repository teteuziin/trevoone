"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { loginAccount, LoginFormState } from "@/app/login/actions";
import { Alert } from "@/components/ui/alert";

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

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        window.sessionStorage.removeItem("trevo_welcome_seen");
      }
    } catch {
      // Best-effort
    }
  }, []);

  const errors = state.errors || {};

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Trigger smooth audio fade-out on valid submission attempt
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("trevo-login-fade-out"));
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header do Card */}
      <div className="space-y-1.5 text-left">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-heading">
          Bem-vindo de volta
        </h1>
        <p className="text-sm text-neutral-400 font-normal leading-relaxed">
          Entre na sua conta para continuar sua evolução.
        </p>
      </div>

      <form action={formAction} onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
        {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

        {/* Alerta de sucesso após redefinição de senha */}
        {resetSuccess && !state.message && (
          <Alert variant="success" className="bg-emerald-500/10 border-emerald-500/25 text-emerald-300">
            Sua senha foi redefinida com sucesso. Faça login com a nova senha.
          </Alert>
        )}

        {/* Alerta de erro geral */}
        {state.message && !state.success && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs sm:text-sm animate-in fade-in-50 duration-200"
          >
            <svg
              className="w-5 h-5 text-red-400 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="space-y-0.5 leading-snug">
              <span className="font-semibold block text-red-100">
                {state.message.includes("Muitas") ? "Acesso temporariamente bloqueado" : "Falha na autenticação"}
              </span>
              <span className="text-red-300/90">{state.message}</span>
            </div>
          </div>
        )}

        {/* Campo E-mail */}
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-neutral-300 tracking-wide uppercase"
          >
            E-mail
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 pointer-events-none text-neutral-500 flex items-center justify-center">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="seuemail@exemplo.com"
              disabled={isPending}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={`w-full h-12 pl-10 pr-4 rounded-xl bg-neutral-900/80 border text-sm text-white placeholder-neutral-500 transition-all duration-200 outline-none select-text ${
                errors.email
                  ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              }`}
            />
          </div>
          {errors.email && (
            <p id="email-error" className="text-xs text-red-400 font-medium pl-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* Campo Senha */}
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-neutral-300 tracking-wide uppercase"
          >
            Senha
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 pointer-events-none text-neutral-500 flex items-center justify-center">
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isPending}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={`w-full h-12 pl-10 pr-12 rounded-xl bg-neutral-900/80 border text-sm text-white placeholder-neutral-500 transition-all duration-200 outline-none select-text ${
                errors.password
                  ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isPending}
              className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-neutral-400 hover:text-white focus-visible:text-emerald-400 transition-colors min-w-[44px] min-h-[44px] cursor-pointer"
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
          {errors.password && (
            <p id="password-error" className="text-xs text-red-400 font-medium pl-1">
              {errors.password}
            </p>
          )}
        </div>

        {/* Opções: Manter conectado & Esqueci minha senha */}
        <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
          <label className="flex items-center gap-2.5 cursor-pointer select-none text-neutral-400 hover:text-white transition-colors min-h-[44px] sm:min-h-0">
            <input
              type="checkbox"
              name="remember_me"
              disabled={isPending}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500/30 accent-emerald-500 cursor-pointer"
            />
            <span className="text-xs font-normal">Manter conectado</span>
          </label>

          <Link
            href="/recuperar-senha"
            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:underline focus-visible:outline-emerald-500 rounded px-1 py-1 transition-colors min-h-[44px] sm:min-h-0 inline-flex items-center"
          >
            Esqueci minha senha
          </Link>
        </div>

        {/* Botão Principal: Entrar no TREVO ONE */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-12 px-6 rounded-xl font-semibold text-sm sm:text-base text-neutral-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 disabled:opacity-75 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
        >
          {isPending ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-950"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Entrando no TREVO ONE...</span>
            </>
          ) : (
            <span>Entrar no TREVO ONE</span>
          )}
        </button>

        {/* Link para Criar Conta */}
        <div className="text-center text-xs sm:text-sm text-neutral-400 pt-3 border-t border-neutral-800/80">
          <span>Ainda não possui uma conta? </span>
          <Link
            href={`/cadastro${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
            className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline focus-visible:outline-emerald-500 rounded px-1 py-0.5 transition-colors min-h-[44px] sm:min-h-0 inline-flex items-center"
          >
            Criar conta
          </Link>
        </div>
      </form>
    </div>
  );
}
