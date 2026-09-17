"use client";

import { useState } from "react";
import Image from "next/image";

interface ConsultancyLogoProps {
  logoUrl?: string | null;
  name: string;
  size?: number;
  className?: string;
  priority?: boolean;
}

function isValidInternalPath(url: unknown): url is string {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;

  // Must start with single slash, not protocol-relative '//', and no dangerous schemes
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return false;
  if (
    trimmed.toLowerCase().startsWith("javascript:") ||
    trimmed.toLowerCase().startsWith("data:") ||
    trimmed.toLowerCase().startsWith("blob:")
  ) {
    return false;
  }

  return true;
}

export function ConsultancyLogo({
  logoUrl,
  name,
  size = 48,
  className = "",
  priority = false,
}: ConsultancyLogoProps) {
  const [prevLogoUrl, setPrevLogoUrl] = useState(logoUrl);
  const [hasError, setHasError] = useState(false);

  // Reset error state during render if logoUrl changes
  if (logoUrl !== prevLogoUrl) {
    setPrevLogoUrl(logoUrl);
    setHasError(false);
  }

  const isSafeUrl = isValidInternalPath(logoUrl);
  const showImage = isSafeUrl && !hasError;

  if (showImage && logoUrl) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden flex items-center justify-center rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] shadow-2xs ${className}`.trim()}
        style={{ width: size, height: size }}
      >
        <Image
          key={logoUrl}
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          unoptimized
          priority={priority}
          onError={() => setHasError(true)}
          className="w-full h-full object-contain p-1"
        />
      </div>
    );
  }

  const initial = (name.trim().charAt(0) || "C").toUpperCase();

  return (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] font-bold select-none shadow-2xs ${className}`.trim()}
      style={{ width: size, height: size, fontSize: Math.max(14, Math.floor(size * 0.45)) }}
      aria-label={name}
    >
      {initial}
    </div>
  );
}
