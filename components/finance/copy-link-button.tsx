"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLinkButton({
  url,
  label = "Copiar link",
  copiedLabel = "Link copiado!",
  className = "",
}: {
  url: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!url) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback
    }
  }

  return (
    <Button
      type="button"
      variant={copied ? "primary" : "outline"}
      size="sm"
      onClick={handleCopy}
      className={`min-h-[44px] text-xs font-bold ${copied ? "!bg-[#176B49] !text-white" : "border-[#D5DDD6] text-[#102E23]"} ${className}`.trim()}
    >
      {copied ? (
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>{copiedLabel}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.849a6.002 6.002 0 00-8.485 0l-3 3a6.002 6.002 0 008.485 8.485l1-1m-1.5-1.5l1.5-1.5a6.002 6.002 0 018.485 0l3 3a6.002 6.002 0 01-8.485 8.485l-1-1" />
          </svg>
          <span>{label}</span>
        </span>
      )}
    </Button>
  );
}
