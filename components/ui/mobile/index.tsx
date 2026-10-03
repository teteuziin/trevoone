"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ============================================================================
// 1. MOBILE PAGE HEADER
// Dedicated mobile-first top navigation bar with back button & primary actions
// ============================================================================
export interface MobilePageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function MobilePageHeader({
  title,
  subtitle,
  eyebrow,
  backHref,
  onBack,
  backLabel = "Voltar",
  actions,
  className = "",
  sticky = true,
}: MobilePageHeaderProps) {
  return (
    <header
      data-testid="mobile-page-header"
      className={`w-full bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border-subtle)] px-3.5 py-2.5 transition-all select-none ${
        sticky ? "sticky top-0 z-30" : "relative"
      } ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-2.5 min-h-[44px]">
        {/* Leading: Back button or placeholder */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {backHref ? (
            <Link
              href={backHref}
              aria-label={backLabel}
              className="min-h-[44px] min-w-[44px] -ml-1 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-subtle)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ) : onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              className="min-h-[44px] min-w-[44px] -ml-1 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-subtle)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}

          {/* Titles */}
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <span className="block text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider truncate leading-tight">
                {eyebrow}
              </span>
            )}
            <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight truncate leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Trailing: Contextual Actions */}
        {actions && (
          <div className="flex items-center gap-1.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

// ============================================================================
// 2. MOBILE SECTION HEADER
// Clean divider with title, count/badge and optional action link
// ============================================================================
export interface MobileSectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function MobileSectionHeader({
  title,
  subtitle,
  badge,
  action,
  className = "",
}: MobileSectionHeaderProps) {
  return (
    <div
      data-testid="mobile-section-header"
      className={`flex items-center justify-between gap-3 px-1 py-1.5 select-none ${className}`.trim()}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tracking-tight">
            {title}
          </h2>
          {badge}
        </div>
        {subtitle && (
          <p className="text-[11px] text-[var(--text-tertiary)] leading-tight">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ============================================================================
// 3. MOBILE CARD
// Touch-optimized elevated card with subtle border and touch feedback
// ============================================================================
export interface MobileCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  selected?: boolean;
}

export function MobileCard({
  children,
  onClick,
  href,
  className = "",
  selected = false,
}: MobileCardProps) {
  const isInteractive = Boolean(onClick || href);
  const baseClasses = `p-4 rounded-2xl bg-[var(--surface)] border transition-all duration-150 ${
    selected
      ? "border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)] shadow-sm"
      : "border-[var(--border-default)] shadow-2xs hover:border-[var(--border-strong)]"
  } ${
    isInteractive
      ? "cursor-pointer active:scale-[0.99] select-none hover:bg-[var(--surface-hover)]"
      : ""
  } ${className}`.trim();

  if (href) {
    return (
      <Link
        href={href}
        data-testid="mobile-card"
        className={`block ${baseClasses}`}
      >
        {children}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      data-testid="mobile-card"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={baseClasses}
    >
      {children}
    </div>
  );
}

// ============================================================================
// 4. MOBILE LIST ITEM
// Full-width touch item with leading icon/avatar and trailing chevron/status
// ============================================================================
export interface MobileListItemProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  caption?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  showChevron?: boolean;
}

export function MobileListItem({
  title,
  subtitle,
  caption,
  leading,
  trailing,
  onClick,
  href,
  className = "",
  showChevron = true,
}: MobileListItemProps) {
  const isInteractive = Boolean(onClick || href);

  const innerContent = (
    <div className="flex items-center justify-between gap-3 min-w-0 flex-1">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px] text-[var(--text-secondary)] truncate">
              {subtitle}
            </div>
          )}
          {caption && (
            <div className="text-[10px] text-[var(--text-tertiary)] truncate">
              {caption}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {trailing}
        {isInteractive && showChevron && !trailing && (
          <svg
            className="w-4 h-4 text-[var(--text-tertiary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>
    </div>
  );

  const containerClasses = `flex items-center min-h-[52px] p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] transition-all duration-150 ${
    isInteractive
      ? "cursor-pointer active:scale-[0.99] hover:bg-[var(--surface-hover)] hover:border-[var(--border-default)] select-none"
      : ""
  } ${className}`.trim();

  if (href) {
    return (
      <Link
        href={href}
        data-testid="mobile-list-item"
        className={containerClasses}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <div
      onClick={onClick}
      data-testid="mobile-list-item"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={containerClasses}
    >
      {innerContent}
    </div>
  );
}

// ============================================================================
// 5. MOBILE BOTTOM SHEET
// High-grade bottom sheet drawer with grab handle, spring slide and safe-area
// ============================================================================
export interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className = "",
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="mobile-bottom-sheet"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Painel"}
        className={`w-full sm:max-w-lg bg-[var(--surface)] border-t sm:border border-[var(--border-default)] rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-8 duration-200 ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="pt-2.5 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/70 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 6. MOBILE ACTION SHEET
// Quick contextual options sheet with large 48px touch rows & cancel button
// ============================================================================
export interface ActionSheetOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  options: ActionSheetOption[];
}

export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  options,
}: MobileActionSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      data-testid="mobile-action-sheet"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--surface)] border-t sm:border border-[var(--border-default)] rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-8 duration-200 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-1 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1.5 rounded-full bg-[var(--border-strong)]" />
        </div>

        {title && (
          <div className="px-2 py-1 text-center">
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
              {title}
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={opt.disabled}
              onClick={() => {
                onClose();
                opt.onClick();
              }}
              className={`w-full min-h-[48px] px-4 py-3 rounded-xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                opt.variant === "danger"
                  ? "bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                  : "bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              } ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-3">
                {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                <span>{opt.label}</span>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl font-bold text-xs sm:text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border-default)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 7. MOBILE CONFIRM SHEET
// Dedicated sheet for destructive or critical confirmation
// ============================================================================
export interface MobileConfirmSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
}

export function MobileConfirmSheet({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  isLoading = false,
}: MobileConfirmSheetProps) {
  if (!isOpen) return null;

  return (
    <div
      data-testid="mobile-confirm-sheet"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[var(--surface)] border-t sm:border border-[var(--border-default)] rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-8 duration-200 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-1 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1.5 rounded-full bg-[var(--border-strong)]" />
        </div>

        <div className="text-center space-y-2 pt-2">
          <div
            className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center ${
              variant === "danger"
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {variant === "danger" ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            {title}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
            {description}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="md"
            disabled={isLoading}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full min-h-[48px] font-bold text-sm"
          >
            {isLoading ? "Processando..." : confirmLabel}
          </Button>
          <Button
            variant="ghost"
            size="md"
            disabled={isLoading}
            onClick={onClose}
            className="w-full min-h-[48px] font-semibold text-xs"
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 8. MOBILE STICKY ACTION BAR
// Fixed bottom action bar floating above the bottom-nav or device bottom
// ============================================================================
export interface MobileStickyActionBarProps {
  children: React.ReactNode;
  hasBottomNav?: boolean;
  className?: string;
}

export function MobileStickyActionBar({
  children,
  hasBottomNav = false,
  className = "",
}: MobileStickyActionBarProps) {
  // If bottom nav is present (height 16 / 64px), position above it
  const bottomPositionClass = hasBottomNav
    ? "bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] md:bottom-0"
    : "bottom-0";

  return (
    <div
      data-testid="mobile-sticky-action-bar"
      className={`fixed ${bottomPositionClass} left-0 right-0 z-30 p-3 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border-default)] shadow-lg flex items-center justify-between gap-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] ${className}`.trim()}
    >
      {children}
    </div>
  );
}

// ============================================================================
// 9. MOBILE FORM SECTION & FIELD
// Mobile-friendly single-column form grouping with full-width inputs
// ============================================================================
export interface MobileFormSectionProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function MobileFormSection({
  title,
  subtitle,
  children,
  className = "",
}: MobileFormSectionProps) {
  return (
    <div
      data-testid="mobile-form-section"
      className={`p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-4 ${className}`.trim()}
    >
      {(title || subtitle) && (
        <div className="space-y-0.5 pb-1 border-b border-[var(--border-subtle)]">
          {title && (
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-[11px] text-[var(--text-tertiary)]">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="space-y-3.5">
        {children}
      </div>
    </div>
  );
}

export interface MobileFieldProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  helperText?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function MobileField({
  label,
  required,
  optional,
  helperText,
  error,
  children,
  className = "",
}: MobileFieldProps) {
  return (
    <div data-testid="mobile-field" className={`w-full space-y-1.5 ${className}`.trim()}>
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
        <label className="flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-red-500 font-bold">*</span>}
        </label>
        {optional && (
          <span className="text-[10px] text-[var(--text-tertiary)] font-normal">
            (opcional)
          </span>
        )}
      </div>

      {children}

      {error ? (
        <p className="text-xs text-red-500 font-medium leading-tight flex items-center gap-1">
          <span>⚠</span>
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-[var(--text-tertiary)] leading-tight">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

// ============================================================================
// 10. MOBILE SELECT
// Large touch target select with custom arrow
// ============================================================================
export interface MobileSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export function MobileSelect({
  hasError,
  children,
  className = "",
  disabled,
  ...props
}: MobileSelectProps) {
  return (
    <div className="relative w-full">
      <select
        data-testid="mobile-select"
        disabled={disabled}
        className={`w-full min-h-[44px] py-2.5 pl-3.5 pr-10 bg-[var(--surface-sunken)] border rounded-xl text-sm shadow-inner transition-colors appearance-none outline-none disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-tertiary)] ${
          hasError
            ? "border-red-500 text-red-600 focus:border-red-500"
            : "border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-primary)] focus:border-[var(--brand)]"
        } ${className}`.trim()}
        {...props}
      >
        {children}
      </select>
      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[var(--text-tertiary)]">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// 11. MOBILE EMPTY STATE
// Clean, welcoming state with prominent 48px CTA
// ============================================================================
export interface MobileEmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function MobileEmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}: MobileEmptyStateProps) {
  return (
    <div
      data-testid="mobile-empty-state"
      className={`p-6 sm:p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] text-center space-y-3.5 shadow-2xs ${className}`.trim()}
    >
      <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)]">
        {icon || (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8" />
          </svg>
        )}
      </div>
      <div className="space-y-1 max-w-xs mx-auto">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

// ============================================================================
// 12. MOBILE LOADING STATE
// Clean pulse skeleton keeping page layout intact without white flash
// ============================================================================
export interface MobileLoadingStateProps {
  message?: string;
  cardsCount?: number;
  className?: string;
}

export function MobileLoadingState({
  message = "Carregando...",
  cardsCount = 3,
  className = "",
}: MobileLoadingStateProps) {
  return (
    <div
      data-testid="mobile-loading-state"
      className={`space-y-3 p-2 select-none ${className}`.trim()}
      aria-busy="true"
    >
      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-2 px-1">
        <div className="w-3.5 h-3.5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
        <span>{message}</span>
      </div>
      {Array.from({ length: cardsCount }).map((_, i) => (
        <div
          key={i}
          className="h-20 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] animate-pulse"
        />
      ))}
    </div>
  );
}

// ============================================================================
// 13. MOBILE TABS
// Horizontally scrollable pill tabs with 44px+ touch targets
// ============================================================================
export interface MobileTabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface MobileTabsProps {
  tabs: MobileTabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function MobileTabs({
  tabs,
  activeId,
  onChange,
  className = "",
}: MobileTabsProps) {
  return (
    <div
      data-testid="mobile-tabs"
      className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 -mx-1 select-none ${className}`.trim()}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              isActive
                ? "bg-[var(--brand)] text-[var(--text-inverse)] shadow-xs"
                : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)]"
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-[var(--surface)] text-[var(--text-tertiary)]"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// 14. MOBILE SEGMENTED CONTROL
// iOS-style 2-4 option segmented pill control with full width
// ============================================================================
export interface MobileSegmentedControlProps {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export function MobileSegmentedControl({
  options,
  value,
  onChange,
  className = "",
}: MobileSegmentedControlProps) {
  return (
    <div
      data-testid="mobile-segmented-control"
      className={`flex items-center p-1 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] select-none ${className}`.trim()}
    >
      {options.map((opt) => {
        const isSelected = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
              isSelected
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-strong)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// 15. MOBILE SEARCH BAR
// Touch-optimized search input with clear button & optional filter sheet trigger
// ============================================================================
export interface MobileSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onFilterClick?: () => void;
  activeFiltersCount?: number;
  className?: string;
  disabled?: boolean;
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = "Buscar...",
  onFilterClick,
  activeFiltersCount = 0,
  className = "",
  disabled = false,
}: MobileSearchBarProps) {
  return (
    <div
      data-testid="mobile-search-bar"
      className={`flex items-center gap-2 select-none ${className}`.trim()}
    >
      <div className="relative flex-1">
        <span className="absolute left-3.5 inset-y-0 flex items-center pointer-events-none text-[var(--text-tertiary)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full min-h-[44px] pl-9.5 pr-9 text-xs sm:text-sm bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-xl placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] outline-none transition-colors"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 inset-y-0 p-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer min-h-[44px] min-w-[36px]"
            aria-label="Limpar busca"
          >
            ✕
          </button>
        )}
      </div>

      {onFilterClick && (
        <button
          type="button"
          onClick={onFilterClick}
          aria-label="Filtrar"
          className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center relative cursor-pointer transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--brand)] text-[var(--text-inverse)] text-[10px] font-extrabold flex items-center justify-center shadow-xs">
              {activeFiltersCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// 16. MOBILE FAB (Floating Action Button)
// Prominent 52px+ floating trigger placed in thumb zone
// ============================================================================
export interface MobileFABProps {
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  label?: string;
  hasBottomNav?: boolean;
  className?: string;
}

export function MobileFAB({
  onClick,
  href,
  icon,
  label,
  hasBottomNav = true,
  className = "",
}: MobileFABProps) {
  // If bottom nav is active, stay above it (height 64px + safe-area)
  const bottomOffset = hasBottomNav
    ? "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] md:hidden"
    : "bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:hidden";

  const content = (
    <div className="flex items-center gap-2">
      {icon || (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      )}
      {label && <span className="text-xs font-bold pr-1">{label}</span>}
    </div>
  );

  const baseClasses = `fixed ${bottomOffset} right-4 z-40 min-h-[52px] min-w-[52px] px-4 rounded-full bg-[var(--brand)] text-[var(--text-inverse)] shadow-lg hover:bg-[var(--brand-hover)] active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none ${className}`.trim();

  if (href) {
    return (
      <Link
        href={href}
        data-testid="mobile-fab"
        className={baseClasses}
        aria-label={label || "Ação principal"}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="mobile-fab"
      className={baseClasses}
      aria-label={label || "Ação principal"}
    >
      {content}
    </button>
  );
}

// ============================================================================
// 17. MOBILE KEYBOARD SAFE CONTAINER
// Wrapper padding bottom to keep forms and CTAs visible above virtual keyboards
// ============================================================================
export interface MobileKeyboardSafeContainerProps {
  children: React.ReactNode;
  hasStickyBar?: boolean;
  hasBottomNav?: boolean;
  className?: string;
}

export function MobileKeyboardSafeContainer({
  children,
  hasStickyBar = false,
  hasBottomNav = false,
  className = "",
}: MobileKeyboardSafeContainerProps) {
  // Compute safe bottom spacing
  let paddingBottom = "pb-[calc(2rem+env(safe-area-inset-bottom,0px))]";
  if (hasStickyBar && hasBottomNav) {
    paddingBottom = "pb-[calc(10rem+env(safe-area-inset-bottom,0px))]";
  } else if (hasStickyBar || hasBottomNav) {
    paddingBottom = "pb-[calc(6rem+env(safe-area-inset-bottom,0px))]";
  }

  return (
    <div
      data-testid="mobile-keyboard-safe-container"
      className={`w-full ${paddingBottom} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
