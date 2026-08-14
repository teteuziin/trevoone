"use client";

import { useActionState, useState } from "react";
import {
  createInvitationAction,
  type InvitationFormState,
} from "@/app/consultoria/[slug]/membros/actions";

const initialState: InvitationFormState = {
  success: false,
};

export function InvitationForm({ slug }: { slug: string }) {
  const boundAction = createInvitationAction.bind(null, slug);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (path: string) => {
    try {
      const fullUrl = `${window.location.origin}${path}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-2xs space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-zinc-900">
          Convidar membro
        </h3>
        <p className="text-xs text-zinc-500 font-normal">
          Gere um link seguro com validade de 7 dias para convidar uma nova pessoa para a consultoria.
        </p>
      </div>

      {state.error && (
        <div
          role="alert"
          className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs font-medium"
        >
          {state.error}
        </div>
      )}

      {state.success && state.invitationPath && (
        <div
          role="status"
          className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/80 space-y-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-emerald-800">
                Convite gerado com sucesso!
              </p>
              <p className="text-[11px] text-emerald-700">
                Copie o link abaixo para enviar ao convidado. O link expira em 7 dias e só pode ser visto aqui.
              </p>
            </div>
            <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
              Válido por 7 dias
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={
                typeof window !== "undefined"
                  ? `${window.location.origin}${state.invitationPath}`
                  : state.invitationPath
              }
              className="flex-1 h-9 px-3 text-xs bg-white border border-emerald-300 rounded-lg text-zinc-800 font-mono select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={() => handleCopy(state.invitationPath!)}
              className="h-9 px-4 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copiado!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar link
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-zinc-500 italic">
            O aceite deste convite será habilitado na próxima etapa.
          </p>
        </div>
      )}

      <form action={formAction} className="space-y-4" noValidate>
        {/* E-mail */}
        <div className="space-y-1 text-left">
          <label htmlFor="invitation_email" className="block text-xs font-medium text-zinc-700">
            E-mail do convidado
          </label>
          <input
            id="invitation_email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="pessoa@exemplo.com"
            required
            className="w-full h-10 px-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent transition-all"
          />
        </div>

        {/* Roles checkboxes */}
        <div className="space-y-2 text-left">
          <label className="block text-xs font-medium text-zinc-700">
            Funções na consultoria
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50/80 cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                name="roles"
                value="STUDENT"
                defaultChecked
                className="w-4 h-4 rounded border-zinc-300 text-[#00A859] focus:ring-[#00A859] accent-[#00A859] cursor-pointer"
              />
              <span className="text-xs font-medium text-zinc-800">
                Aluno
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50/80 cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                name="roles"
                value="PERSONAL"
                className="w-4 h-4 rounded border-zinc-300 text-[#00A859] focus:ring-[#00A859] accent-[#00A859] cursor-pointer"
              />
              <span className="text-xs font-medium text-zinc-800">
                Personal
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50/80 cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                name="roles"
                value="NUTRITIONIST"
                className="w-4 h-4 rounded border-zinc-300 text-[#00A859] focus:ring-[#00A859] accent-[#00A859] cursor-pointer"
              />
              <span className="text-xs font-medium text-zinc-800">
                Nutricionista
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50/80 cursor-pointer select-none transition-colors">
              <input
                type="checkbox"
                name="roles"
                value="CONSULTANCY_ADMIN"
                className="w-4 h-4 rounded border-zinc-300 text-[#00A859] focus:ring-[#00A859] accent-[#00A859] cursor-pointer"
              />
              <span className="text-xs font-medium text-zinc-800">
                Administrador
              </span>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto h-10 px-5 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2 flex items-center justify-center"
          >
            {isPending ? "Criando convite..." : "Criar convite"}
          </button>
        </div>
      </form>
    </div>
  );
}
