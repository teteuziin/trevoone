import React from "react";

export interface BetaBadgeProps {
  className?: string;
}

/**
 * Global Beta 1.0 indicator badge.
 * Discreet, accessible, non-interactive visual indicator.
 */
export function BetaBadge({ className = "" }: BetaBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-md bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-default)] select-none shrink-0 ${className}`.trim()}
      aria-label="Versão Beta 1.0"
    >
      Beta 1.0
    </span>
  );
}
