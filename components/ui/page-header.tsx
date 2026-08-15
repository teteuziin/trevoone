import React from "react";
import Link from "next/link";

export interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel = "Voltar",
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`w-full pb-6 mb-6 border-b border-[var(--border-subtle)] ${className}`.trim()}>
      {backHref && (
        <div className="mb-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span>{backLabel}</span>
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          {eyebrow && (
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-foreground)] mb-1">
              {eyebrow}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-1 md:pt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
