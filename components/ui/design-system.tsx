"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { PageHeader, type PageHeaderProps } from "./page-header";
import { Surface, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, type SurfaceProps } from "./surface";
import { Badge, type BadgeProps, type BadgeVariant } from "./badge";
import { Button, IconButton, type ButtonProps } from "./button";
import { EmptyState, type EmptyStateProps } from "./empty-state";
import { Tabs, type TabsProps, type TabItem } from "./tabs";

// Re-export core primitives for unified import
export {
  PageHeader,
  type PageHeaderProps,
  Surface,
  type SurfaceProps,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  type BadgeProps,
  Button,
  IconButton,
  type ButtonProps,
  EmptyState,
  type EmptyStateProps,
  Tabs,
  type TabsProps,
  type TabItem,
};

// ==========================================
// 1. PAGE ACTIONS
// ==========================================
export interface PageActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function PageActions({ children, className = "" }: PageActionsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 ${className}`.trim()}>
      {children}
    </div>
  );
}

// ==========================================
// 2. SECTION
// ==========================================
export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  noCard?: boolean;
}

export function Section({
  title,
  subtitle,
  action,
  badge,
  children,
  className = "",
  noCard = false,
  ...props
}: SectionProps) {
  const content = noCard ? (
    children
  ) : (
    <Surface variant="default" padding="md" className="space-y-4">
      {children}
    </Surface>
  );

  return (
    <section className={`space-y-3 ${className}`.trim()} {...props}>
      {(title || subtitle || action || badge) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {title && (
                <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight">
                  {title}
                </h2>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {content}
    </section>
  );
}

// ==========================================
// 3. COMPACT CARD
// ==========================================
export interface CompactCardProps {
  title: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export function CompactCard({
  title,
  value,
  subtitle,
  icon,
  badge,
  onClick,
  href,
  className = "",
}: CompactCardProps) {
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
          <span className="truncate">{title}</span>
          {badge}
        </div>
        <div className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
          {value}
        </div>
        {subtitle && (
          <div className="text-[11px] text-[var(--text-tertiary)] truncate">
            {subtitle}
          </div>
        )}
      </div>
      {icon && (
        <div className="w-9 h-9 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] shrink-0">
          {icon}
        </div>
      )}
    </div>
  );

  const containerClasses = `p-3.5 sm:p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs transition-all duration-150 ${
    onClick || href
      ? "hover:border-[var(--border-hover)] hover:shadow-sm cursor-pointer select-none"
      : ""
  } ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={containerClasses}>
        {inner}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={containerClasses}>
      {inner}
    </div>
  );
}

// ==========================================
// 4. LIST ROW
// ==========================================
export interface ListRowProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  caption?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export function ListRow({
  title,
  subtitle,
  caption,
  leading,
  trailing,
  onClick,
  href,
  className = "",
}: ListRowProps) {
  const content = (
    <div className="flex items-center justify-between gap-3 min-w-0 flex-1">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[11px] sm:text-xs text-[var(--text-secondary)] truncate">
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
      {trailing && <div className="shrink-0 flex items-center gap-2">{trailing}</div>}
    </div>
  );

  const baseClasses = `flex items-center p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] transition-all duration-140 ${
    onClick || href
      ? "hover:bg-[var(--surface-hover)] hover:border-[var(--border-default)] cursor-pointer select-none"
      : ""
  } ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={baseClasses}>
      {content}
    </div>
  );
}

// ==========================================
// 5. ERROR STATE
// ==========================================
export interface ErrorStateProps {
  title?: React.ReactNode;
  message?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Não foi possível carregar os dados",
  message = "Ocorreu uma falha temporária. Por favor, tente novamente.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`p-6 rounded-2xl bg-[var(--surface)] border border-red-500/20 text-center space-y-3 ${className}`.trim()}
    >
      <div className="w-10 h-10 mx-auto rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
        !
      </div>
      <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
        {message}
      </p>
      {onRetry && (
        <div className="pt-2">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 6. LOADING STATE
// ==========================================
export interface LoadingStateProps {
  message?: string;
  rows?: number;
  className?: string;
}

export function LoadingState({
  message = "Carregando informações...",
  rows = 3,
  className = "",
}: LoadingStateProps) {
  return (
    <div className={`space-y-3 p-4 ${className}`.trim()} aria-busy="true">
      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-2">
        <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span>{message}</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 rounded-xl bg-[var(--surface-subtle)] animate-pulse border border-[var(--border-subtle)]"
        />
      ))}
    </div>
  );
}

// ==========================================
// 7. SEARCH FIELD
// ==========================================
export interface SearchFieldProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchField({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
  disabled = false,
}: SearchFieldProps) {
  return (
    <div className={`relative flex items-center ${className}`.trim()}>
      <span className="absolute left-3 text-[var(--text-tertiary)] pointer-events-none">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-10 pl-9 pr-8 text-xs sm:text-sm bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-xl placeholder:text-[var(--text-tertiary)] focus:border-emerald-500 focus:outline-none transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="Limpar busca"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ==========================================
// 8. MODAL
// ==========================================
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = "lg",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidthClasses} bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface-subtle)]/50">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 9. BOTTOM SHEET (Mobile-First)
// ==========================================
export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
}: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[var(--surface)] border-t sm:border border-[var(--border-default)] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-2 pb-1 flex justify-center sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[var(--border-strong)]" />
        </div>
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-subtle)]/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Drawer alias / wrapper for BottomSheet on mobile or side drawer
export const Drawer = BottomSheet;

// ==========================================
// 10. DESKTOP TOOLBAR
// ==========================================
export interface DesktopToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function DesktopToolbar({ children, className = "" }: DesktopToolbarProps) {
  return (
    <div
      className={`hidden sm:flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] mb-4 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

// ==========================================
// 11. MOBILE ACTION BAR
// ==========================================
export interface MobileActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileActionBar({ children, className = "" }: MobileActionBarProps) {
  return (
    <div
      className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border-default)] shadow-lg flex items-center gap-2 safe-area-bottom ${className}`.trim()}
    >
      {children}
    </div>
  );
}

// ==========================================
// 12. STATUS BADGE
// ==========================================
export type StatusBadgeType =
  | "active"
  | "draft"
  | "archived"
  | "pending"
  | "completed"
  | "warning"
  | "danger"
  | "neutral";

export interface StatusBadgeProps {
  status: StatusBadgeType;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<StatusBadgeType, { variant: BadgeVariant; label: string }> = {
  active: { variant: "success", label: "Ativo" },
  completed: { variant: "success", label: "Concluído" },
  draft: { variant: "neutral", label: "Rascunho" },
  archived: { variant: "neutral", label: "Arquivado" },
  pending: { variant: "warning", label: "Pendente" },
  warning: { variant: "warning", label: "Atenção" },
  danger: { variant: "danger", label: "Erro" },
  neutral: { variant: "neutral", label: "Padrão" },
};

export function StatusBadge({
  status,
  label,
  size = "sm",
  className = "",
}: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.neutral;
  return (
    <Badge
      variant={config.variant}
      size={size}
      dot
      className={className}
    >
      {label || config.label}
    </Badge>
  );
}

// ==========================================
// 13. MOBILE UX PRIMITIVES RE-EXPORT
// ==========================================
export * from "./mobile";
