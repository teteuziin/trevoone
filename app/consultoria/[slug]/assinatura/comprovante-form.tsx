"use client";

import React, { useState, useTransition } from "react";
import { submitPlatformReceiptAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

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
        setError(res.error || "Erro ao enviar comprovante.");
      } else {
        setSuccess(true);
      }
    });
  };

  if (success) {
    return (
      <Alert variant="success" title="Comprovante Enviado com Sucesso">
        <p className="text-xs">
          O comprovante foi encaminhado para análise pela equipe do Trevo One. Assim que aprovado, a quitação da fatura será registrada automaticamente.
        </p>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <Alert variant="danger" title="Erro no envio">
          <p className="text-xs">{error}</p>
        </Alert>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[var(--text-primary)]">
          Anexar Comprovante Pix (JPG, PNG, WEBP ou PDF — máx 5 MB)
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={isPending}
          className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[var(--surface-subtle)] file:text-[var(--text-primary)] hover:file:bg-[var(--surface-hover)] cursor-pointer disabled:cursor-not-allowed min-h-[44px]"
        />
      </div>

      <div className="pt-1">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isPending || !file}
          className="w-full sm:w-auto min-h-[44px]"
        >
          {isPending ? "Enviando comprovante..." : "Enviar Comprovante Pix"}
        </Button>
      </div>
    </form>
  );
}
