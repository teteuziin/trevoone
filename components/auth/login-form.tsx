"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAccount, LoginFormState } from "@/app/login/actions";

const initialState: LoginFormState = {
  success: false,
};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAccount, initialState);
  const [showPassword, setShowPassword] = useState(false);

  const errors = state.errors || {};

  return (
    <form action={formAction} className="w-full space-y-5" noValidate>
      {state.message && !state.success && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium leading-relaxed text-left"
        >
          {state.message}
        </div>
      )}

      {/* Campo de E-mail */}
      <div className="space-y-1.5 text-left">
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={`w-full h-11 px-3.5 rounded-lg border bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent transition-all ${
            errors.email ? "border-red-500" : "border-zinc-300"
          }`}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-red-600 font-medium pt-0.5">
            {errors.email}
          </p>
        )}
      </div>

      {/* Campo de Senha */}
      <div className="space-y-1.5 text-left">
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
          Senha
        </label>
        <div className="relative flex items-center">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`w-full h-11 pl-3.5 pr-11 rounded-lg border bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent transition-all ${
              errors.password ? "border-red-500" : "border-zinc-300"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-0 top-0 bottom-0 px-3.5 flex items-center justify-center text-zinc-500 hover:text-zinc-700 focus:outline-none focus:text-[#00A859] transition-colors"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? (
              <svg
                className="w-5 h-5"
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
                className="w-5 h-5"
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
        {errors.password && (
          <p id="password-error" className="text-xs text-red-600 font-medium pt-0.5">
            {errors.password}
          </p>
        )}
      </div>

      {/* Opção Manter Conectado & Esqueci Minha Senha */}
      <div className="flex items-center justify-between text-xs sm:text-sm pt-0.5">
        <label className="flex items-center space-x-2 cursor-pointer select-none text-zinc-600">
          <input
            type="checkbox"
            name="remember_me"
            className="w-4 h-4 rounded border-zinc-300 text-[#00A859] focus:ring-[#00A859] accent-[#00A859] cursor-pointer"
          />
          <span>Manter conectado</span>
        </label>

        <Link
          href="/recuperar-senha"
          className="font-medium text-[#00A859] hover:underline focus:outline-none focus:ring-1 focus:ring-[#00A859] rounded px-1 py-0.5"
        >
          Esqueci minha senha
        </Link>
      </div>

      {/* Botão Principal Entrar */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full h-11 mt-2 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2 flex items-center justify-center"
      >
        {isPending ? "Entrando..." : "Entrar"}
      </button>

      {/* Área Criar Conta */}
      <div className="text-center text-xs sm:text-sm text-zinc-500 pt-4 border-t border-zinc-100">
        <span>Ainda não possui uma conta? </span>
        <Link
          href="/cadastro"
          className="font-semibold text-[#00A859] hover:underline focus:outline-none focus:ring-1 focus:ring-[#00A859] rounded px-1 py-0.5"
        >
          Criar conta
        </Link>
      </div>
    </form>
  );
}
