import React from "react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] ${className}`.trim()}
    >
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)] mb-3 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
