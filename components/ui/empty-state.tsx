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
      className={`flex flex-col items-center justify-center text-center p-6 sm:p-9 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs ${className}`.trim()}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-sunken)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)] mb-3.5 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight">
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
