"use client";

import { useActionState } from "react";
import {
  acceptInvitationAction,
  type AcceptInvitationState,
} from "@/app/convite/[token]/actions";

const initialState: AcceptInvitationState = {
  success: false,
};

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function InvitationAcceptForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    async () => {
      return await acceptInvitationAction(token);
    },
    initialState
  );

  return (
    <form action={formAction} className="w-full space-y-3">
      {state.error && (
        <div
          role="alert"
          className="p-3 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-surface)] text-[var(--danger)] text-xs font-medium text-left leading-relaxed"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full min-h-[44px] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-button transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <SpinnerIcon className="w-4 h-4 animate-spin shrink-0" />
            <span>Aceitando...</span>
          </>
        ) : (
          "Aceitar convite"
        )}
      </button>
    </form>
  );
}
