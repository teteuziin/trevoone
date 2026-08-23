"use client";

import { useActionState, useState, useEffect, useRef } from "react";
import { changePasswordAction, type ChangePasswordFormState } from "./actions";
import { FormField, Input } from "@/components/ui/form-controls";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const initialState: ChangePasswordFormState = {
  success: false,
};

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(
    changePasswordAction,
    initialState
  );

  const formRef = useRef<HTMLFormElement>(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Clear form inputs on success
  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      {state.success && state.message && (
        <Alert variant="success" title="Sucesso">
          {state.message}
        </Alert>
      )}

      {!state.success && state.error && (
        <Alert variant="danger" title="Atenção">
          {state.error}
        </Alert>
      )}

      {/* Current Password Field */}
      <FormField
        label="Senha atual"
        id="current_password"
        required
      >
        <div className="relative">
          <Input
            id="current_password"
            name="current_password"
            type={showCurrent ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Digite sua senha atual"
            disabled={isPending}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            aria-label={showCurrent ? "Ocultar senha atual" : "Exibir senha atual"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-[var(--brand)] rounded-r-lg"
          >
            {showCurrent ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </FormField>

      {/* New Password Field */}
      <FormField
        label="Nova senha"
        id="new_password"
        required
      >
        <div className="relative">
          <Input
            id="new_password"
            name="new_password"
            type={showNew ? "text" : "password"}
            required
            minLength={6}
            maxLength={128}
            autoComplete="new-password"
            placeholder="Digite a nova senha"
            disabled={isPending}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            aria-label={showNew ? "Ocultar nova senha" : "Exibir nova senha"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-[var(--brand)] rounded-r-lg"
          >
            {showNew ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
          A senha deve ter entre 6 e 128 caracteres.
        </p>
      </FormField>

      {/* Confirm Password Field */}
      <FormField
        label="Confirmar nova senha"
        id="confirm_password"
        required
      >
        <div className="relative">
          <Input
            id="confirm_password"
            name="confirm_password"
            type={showConfirm ? "text" : "password"}
            required
            minLength={6}
            maxLength={128}
            autoComplete="new-password"
            placeholder="Confirme a nova senha"
            disabled={isPending}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            aria-label={showConfirm ? "Ocultar confirmação de nova senha" : "Exibir confirmação de nova senha"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-[var(--brand)] rounded-r-lg"
          >
            {showConfirm ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
      </FormField>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isPending}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? "Alterando senha..." : "Alterar senha"}
        </Button>
      </div>
    </form>
  );
}
