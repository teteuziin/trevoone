"use client";

import React from "react";
import Link from "next/link";

export interface AdminHeaderAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
  variant?: "primary" | "secondary";
}

export interface AdminExecutiveHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  primaryAction?: AdminHeaderAction;
  secondaryAction?: AdminHeaderAction;
  customActions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function AdminExecutiveHeader({
  eyebrow = "Administração · Painel Executivo",
  title,
  description,
  badge,
  backHref,
  backLabel = "Voltar à visão geral",
  primaryAction,
  secondaryAction,
  customActions,
  children,
  className = "",
}: AdminExecutiveHeaderProps) {
  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl bg-[#151619] border border-[#303238] shadow-sm text-white ${className}`.trim()}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Identidade e Contexto */}
        <div className="space-y-1 min-w-0 flex-1">
          {backHref && (
            <div className="mb-1">
              <Link
                href={backHref}
                prefetch={false}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8E95A2] hover:text-white transition-colors min-h-[32px] cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <span>{backLabel}</span>
              </Link>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
            <span className="text-xs text-[#8E95A2] font-semibold tracking-wide uppercase">
              {eyebrow}
            </span>
            {badge && <span className="ml-1 inline-flex items-center">{badge}</span>}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-sans">
            {title}
          </h1>

          {description && (
            <p className="text-xs sm:text-sm text-[#8E95A2] font-sans leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* Ações (Primária e Secundária) */}
        {(primaryAction || secondaryAction || customActions) && (
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
            {secondaryAction &&
              (secondaryAction.href ? (
                <Link
                  href={secondaryAction.href}
                  prefetch={false}
                  aria-label={secondaryAction.ariaLabel || secondaryAction.label}
                  className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 active:translate-y-[1px] transition-colors cursor-pointer select-none shadow-sm flex-1 sm:flex-initial"
                >
                  {secondaryAction.icon}
                  <span>{secondaryAction.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={secondaryAction.onClick}
                  disabled={secondaryAction.disabled}
                  aria-label={secondaryAction.ariaLabel || secondaryAction.label}
                  className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-[#E5E7EB] hover:text-white flex items-center justify-center gap-2 active:translate-y-[1px] transition-colors cursor-pointer select-none shadow-sm flex-1 sm:flex-initial disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {secondaryAction.icon}
                  <span>{secondaryAction.label}</span>
                </button>
              ))}

            {primaryAction &&
              (primaryAction.href ? (
                <Link
                  href={primaryAction.href}
                  prefetch={false}
                  aria-label={primaryAction.ariaLabel || primaryAction.label}
                  className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm active:translate-y-[1px] transition-colors cursor-pointer select-none flex-1 sm:flex-initial"
                >
                  {primaryAction.icon}
                  <span>{primaryAction.label}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  aria-label={primaryAction.ariaLabel || primaryAction.label}
                  className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-sm active:translate-y-[1px] transition-colors cursor-pointer select-none flex-1 sm:flex-initial disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {primaryAction.icon}
                  <span>{primaryAction.label}</span>
                </button>
              ))}

            {customActions}
          </div>
        )}
      </div>

      {/* Indicadores ou Conteúdo Integrado */}
      {children && (
        <div className="mt-5 pt-4 border-t border-[#303238]">
          {children}
        </div>
      )}
    </div>
  );
}
