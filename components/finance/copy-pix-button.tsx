"use client";

import React, { useState } from "react";

export interface CopyPixButtonProps {
  pixKey: string;
  className?: string;
}

export function CopyPixButton({ pixKey, className = "" }: CopyPixButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!pixKey) return;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pixKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback: clipboard permission denied or unsupported.
      // The pix key remains visible and selectable on screen for manual copy.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Chave Pix copiada para a área de transferência" : "Copiar chave Pix"}
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all duration-150 active:scale-[0.98] cursor-pointer ${
        copied
          ? "bg-emerald-50 text-[#008f4c] border-emerald-300"
          : "bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400"
      } ${className}`.trim()}
    >
      {copied ? (
        <>
          <svg
            className="w-4 h-4 text-[#008f4c] shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>Chave Pix copiada!</span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4 text-zinc-600 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
            />
          </svg>
          <span>Copiar chave Pix</span>
        </>
      )}
    </button>
  );
}
