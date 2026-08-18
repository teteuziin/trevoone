"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";

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

      // Success: refresh server component state to show UNDER_REVIEW UI
      router.refresh();
    } catch {
      setErrorMessage("Falha de conexão ao enviar o comprovante. Verifique sua rede e tente novamente.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Previous Rejection Banner */}
      {hasPreviousRejection && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/90 text-amber-950 space-y-1 text-xs shadow-2xs">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <svg
              className="w-4 h-4 text-amber-600 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <span>O último comprovante enviado não foi aprovado</span>
          </div>
          {previousRejectionReason ? (
            <p className="text-amber-800 leading-relaxed pl-6">
              <span className="font-semibold">Motivo informado:</span> {previousRejectionReason}
            </p>
          ) : (
            <p className="text-amber-800 leading-relaxed pl-6">
              Você pode enviar um novo comprovante de pagamento abaixo.
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-start gap-2.5 shadow-2xs"
        >
          <svg
            className="w-4 h-4 text-red-600 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="leading-relaxed font-medium">{errorMessage}</p>
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="receipt-file-input" className="block text-xs font-bold text-zinc-900 mb-1">
            Enviar comprovante de pagamento
          </label>
          <p className="text-[11px] text-zinc-500 mb-2.5">
            Formatos aceitos: <strong>JPG, PNG, WEBP ou PDF</strong> (máx. 5 MB).
          </p>

          <input
            ref={fileInputRef}
            id="receipt-file-input"
            type="file"
            name="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            disabled={isSubmitting}
            onChange={handleFileChange}
            className="block w-full text-xs text-zinc-700 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border file:border-zinc-300 file:text-xs file:font-semibold file:bg-zinc-50 file:text-zinc-800 hover:file:bg-zinc-100 hover:file:border-zinc-400 file:cursor-pointer cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00A859] rounded-xl p-1 bg-zinc-50/50 border border-zinc-200"
          />
        </div>

        {/* Selected File Details */}
        {selectedFile && (
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <svg
                className="w-4 h-4 text-[#008f4c] shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 truncate">{selectedFile.name}</p>
                <p className="text-[11px] text-zinc-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearFile}
              disabled={isSubmitting}
              className="text-xs text-zinc-500 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-zinc-200/60 transition-colors shrink-0 disabled:opacity-50"
            >
              Remover
            </button>
          </div>
        )}

        {/* Submit CTA */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={!selectedFile || isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#00A859] hover:bg-[#008f4c] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition-all shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A859]"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin shrink-0"
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
                <span>Enviando comprovante...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                <span>Enviar comprovante</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
