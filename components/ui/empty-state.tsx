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
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-xl bg-[var(--surface-subtle)] border border-dashed border-[var(--border-default)] ${className}`.trim()}
    >
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)] mb-4 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
