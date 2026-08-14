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
        className="px-2.5 py-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 active:bg-red-100 rounded-md border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Revogando..." : "Revogar"}
      </button>
      {state.error && (
        <span className="block text-[11px] text-red-600 font-medium pt-1">
          {state.error}
        </span>
      )}
    </form>
  );
}
