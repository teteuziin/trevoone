"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Informe seu e-mail.");
      return;
    }

    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setError("Informe um e-mail válido.");
      return;
    }

    setError(undefined);
    // Validação local concluída com sucesso.
    // Nenhuma chamada de rede, API ou envio de e-mail é realizado nesta etapa.
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5" noValidate>
      {/* Campo E-mail */}
      <div className="space-y-1.5 text-left">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-zinc-700"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seuemail@exemplo.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(undefined);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "email-error" : undefined}
          className={`w-full h-11 px-3.5 rounded-lg border bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent transition-all ${
            error ? "border-red-500" : "border-zinc-300"
          }`}
        />
        {error && (
          <p id="email-error" className="text-xs text-red-600 font-medium pt-0.5">
            {error}
          </p>
        )}
      </div>

      {/* Botão Principal Enviar Instruções */}
      <button
        type="submit"
        className="w-full h-11 mt-2 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2"
      >
        Enviar instruções
      </button>

      {/* Navegação Voltar para o Login */}
      <div className="text-center text-xs sm:text-sm text-zinc-500 pt-4 border-t border-zinc-100">
        <Link
          href="/login"
          className="inline-flex items-center font-semibold text-[#00A859] hover:underline focus:outline-none focus:ring-1 focus:ring-[#00A859] rounded px-1 py-0.5"
        >
          ← Voltar para o login
        </Link>
      </div>
    </form>
  );
}
