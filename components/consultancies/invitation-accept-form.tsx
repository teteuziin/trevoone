"use client";

import { useActionState } from "react";
import {
  acceptInvitationAction,
  type AcceptInvitationState,
} from "@/app/convite/[token]/actions";

const initialState: AcceptInvitationState = {
  success: false,
};

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
          className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium text-left leading-relaxed"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-11 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2 flex items-center justify-center"
      >
        {isPending ? "Aceitando..." : "Aceitar convite"}
      </button>
    </form>
  );
}
