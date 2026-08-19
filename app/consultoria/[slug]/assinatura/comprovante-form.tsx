"use client";

import React, { useState, useTransition } from "react";
import { submitPlatformReceiptAction } from "./actions";

interface ComprovanteFormProps {
  slug: string;
  chargePublicId: string;
}

export function ComprovanteForm({ slug, chargePublicId }: ComprovanteFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setError("Selecione o arquivo do comprovante.");
      return;
    }

    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const res = await submitPlatformReceiptAction(slug, chargePublicId, formData);
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(true);
      }
    });
  };

  if (success) {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm">
        <p className="font-semibold">Comprovante enviado com sucesso!</p>
        <p className="mt-1 text-emerald-700">
          O comprovante foi encaminhado para análise pela equipe do Trevo One. Assim que aprovado, a quitação será registrada automaticamente.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-700">
          Arquivo do comprovante Pix (JPG, PNG, WEBP ou PDF — máx 5 MB)
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={isPending}
          className="block w-full text-xs text-zinc-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
        />
      </div>

      <button
        type="submit"
        disabled={isPending || !file}
        className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#00A859] text-white hover:bg-[#008f4c] transition-colors disabled:opacity-50"
      >
        {isPending ? "Enviando comprovante..." : "Enviar comprovante"}
      </button>
    </form>
  );
}
