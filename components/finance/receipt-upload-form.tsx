"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export interface ReceiptUploadFormProps {
  slug: string;
  chargePublicId: string;
  hasPreviousRejection?: boolean;
  previousRejectionReason?: string | null;
}

const MAX_CLIENT_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReceiptUploadForm({
  slug,
  chargePublicId,
  hasPreviousRejection = false,
  previousRejectionReason = null,
}: ReceiptUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null);
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = files[0];

    // Client pre-validation for size
    if (file.size === 0) {
      setErrorMessage("O arquivo selecionado está vazio. Escolha um arquivo válido.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_CLIENT_FILE_SIZE) {
      setErrorMessage("O arquivo selecionado ultrapassa o limite de 5 MB. Selecione um arquivo menor.");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
  }

  function handleClearFile() {
    setSelectedFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const endpoint = `/consultoria/${slug}/pagamentos/cobrancas/${chargePublicId}/comprovante`;
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorText =
          data?.error ||
          (response.status === 413
            ? "O arquivo excede o limite máximo de 5 MB."
            : response.status === 415
            ? "Formato de arquivo não aceito. Envie em JPG, PNG, WEBP ou PDF."
            : response.status === 409
            ? "Já existe um comprovante em análise ou a cobrança foi alterada."
            : "Não foi possível enviar o comprovante no momento. Tente novamente.");

        setErrorMessage(errorText);
        setIsSubmitting(false);
        return;
      }

      router.refresh();
    } catch {
      setErrorMessage("Erro de conexão ao enviar comprovante. Tente novamente.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {hasPreviousRejection && (
        <Alert variant="warning" title="Reenvio de Comprovante">
          <p className="text-xs">
            Seu envio anterior precisou de ajustes.
            {previousRejectionReason ? (
              <span className="block mt-1 font-medium italic">
                Motivo informado: &quot;{previousRejectionReason}&quot;
              </span>
            ) : (
              " Verifique a imagem ou documento e envie um novo arquivo legível."
            )}
          </p>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="danger" title="Erro no envio">
          <p className="text-xs">{errorMessage}</p>
        </Alert>
      )}

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-zinc-900">
          Enviar comprovante Pix <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-zinc-500">
          Selecione a foto, print ou PDF do seu comprovante de transferência.
        </p>

        <div className="relative border-2 border-dashed border-zinc-200 hover:border-emerald-500/50 transition-colors rounded-xl p-4 bg-zinc-50/50 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            disabled={isSubmitting}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />

          {!selectedFile ? (
            <div className="space-y-1.5 py-1">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#00A859] flex items-center justify-center mx-auto">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-zinc-800">
                Clique para selecionar o arquivo
              </p>
              <p className="text-[11px] text-zinc-500">
                Formatos aceitos: JPG, PNG, WEBP ou PDF (máx. 5 MB)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-zinc-200 text-left relative z-20">
              <div className="min-w-0 flex-1 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100/70 text-[#00A859] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearFile}
                disabled={isSubmitting}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                title="Remover arquivo"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        disabled={!selectedFile || isSubmitting}
        className="w-full"
      >
        {isSubmitting ? "Enviando comprovante..." : "Enviar comprovante para análise"}
      </Button>
    </form>
  );
}
