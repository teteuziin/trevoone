"use client";

import { useActionState, useState } from "react";
import { submitMissionAction, type MissionActionState } from "../actions";

export function MissionSubmissionForm({
  slug,
  missionPublicId,
  isResubmission = false,
}: {
  slug: string;
  missionPublicId: string;
  isResubmission?: boolean;
}) {
  const [state, formAction, isPending] = useActionState<MissionActionState | null, FormData>(
    (prevState, formData) => submitMissionAction(slug, missionPublicId, prevState, formData),
    null
  );

  const [notes, setNotes] = useState("");
  const [linksText, setLinksText] = useState("");
  const [selectedFilesCount, setSelectedFilesCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setSelectedFilesCount(files ? files.length : 0);
  };

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200/80 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-sm text-[#008f4c]">
          Entrega enviada com sucesso! Aguarde a revisão da equipe.
        </div>
      )}

      <div>
        <label
          htmlFor="notes"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
        >
          {isResubmission ? "Observações da nova entrega" : "Observações da entrega"}
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          maxLength={5000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Descreva detalhes sobre a execução da missão, resultados, considerações ou respostas às solicitações..."
          disabled={isPending}
          className="w-full p-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm transition-all disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-zinc-500 text-right">{notes.length}/5000 caracteres</p>
      </div>

      <div>
        <label
          htmlFor="links_text"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
        >
          Links de comprovação (Vídeos, posts, drives, etc.)
        </label>
        <textarea
          id="links_text"
          name="links_text"
          rows={3}
          value={linksText}
          onChange={(e) => setLinksText(e.target.value)}
          placeholder="https://instagram.com/p/...&#10;https://youtube.com/watch?...&#10;https://drive.google.com/..."
          disabled={isPending}
          className="w-full p-3.5 rounded-lg border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:border-transparent text-sm font-mono text-xs transition-all disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Insira um link HTTPS por linha (máximo 10 links). Vídeos grandes e gravações devem ser enviados por link externo.
        </p>
      </div>

      <div>
        <label
          htmlFor="files"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 mb-1.5"
        >
          Arquivos e fotos de comprovação (Opcional)
        </label>
        <input
          id="files"
          name="files"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          disabled={isPending}
          className="block w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer disabled:opacity-60"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Formatos permitidos: JPG, PNG, WEBP ou PDF. Máximo de 3 arquivos por envio (limite de 10 MB cada, 20 MB total).
          {selectedFilesCount > 0 && ` (${selectedFilesCount} selecionado(s))`}
        </p>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto px-6 h-11 bg-[#00A859] hover:bg-[#008f4c] active:bg-[#007a41] text-white font-semibold text-sm rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#00A859] focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending ? "Enviando entrega..." : isResubmission ? "Enviar nova versão" : "Enviar entrega"}
        </button>
      </div>
    </form>
  );
}
