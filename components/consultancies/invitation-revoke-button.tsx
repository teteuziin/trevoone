"use client";

import { useActionState, FormEvent } from "react";
import {
  revokeInvitationAction,
  type RevokeInvitationState,
} from "@/app/consultoria/[slug]/membros/actions";

interface InvitationRevokeButtonProps {
  slug: string;
  invitationPublicId: string;
}

const initialState: RevokeInvitationState = {
  success: false,
};

export function InvitationRevokeButton({
  slug,
  invitationPublicId,
}: InvitationRevokeButtonProps) {
  const [state, formAction, isPending] = useActionState(
    async () => {
      return await revokeInvitationAction(slug, invitationPublicId);
    },
    initialState
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!window.confirm("Revogar este convite? O link deixará de ser válido.")) {
      e.preventDefault();
    }
  };

  return (
    <form action={formAction} onSubmit={handleSubmit} className="inline-block">
      <button
        type="submit"
        disabled={isPending}
        className="px-2.5 py-1 text-xs font-semibold text-[var(--danger)] hover:text-[var(--danger-foreground)] hover:bg-[var(--danger-soft)] active:bg-[var(--danger-soft-border)] rounded-lg border border-[var(--danger-soft-border)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-[var(--danger)]"
      >
        {isPending ? "Revogando..." : "Revogar"}
      </button>
      {state.error && (
        <span role="alert" className="block text-[11px] text-[var(--danger-foreground)] font-medium pt-1">
          {state.error}
        </span>
      )}
    </form>
  );
}
