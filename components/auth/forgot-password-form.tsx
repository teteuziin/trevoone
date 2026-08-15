"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/form-controls";

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
    <form onSubmit={handleSubmit} className="w-full space-y-4.5" noValidate>
      {/* Campo E-mail */}
      <FormField
        label="E-mail"
        id="email"
        error={error}
      >
        <Input
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
          hasError={!!error}
          aria-invalid={!!error}
          aria-describedby={error ? "email-error" : undefined}
        />
      </FormField>

      {/* Botão Principal Enviar Instruções */}
      <Button
        type="submit"
        fullWidth
        size="md"
        className="mt-2 font-semibold"
      >
        Enviar instruções
      </Button>

      {/* Navegação Voltar para o Login */}
      <div className="text-center text-xs sm:text-sm text-[var(--text-secondary)] pt-4 border-t border-[var(--border-subtle)]">
        <Link
          href="/login"
          className="inline-flex items-center font-semibold text-[var(--brand-strong)] hover:text-[var(--brand)] hover:underline focus-visible:outline-[var(--brand)] rounded px-1 py-0.5 transition-colors"
        >
          ← Voltar para o login
        </Link>
      </div>
    </form>
  );
}
