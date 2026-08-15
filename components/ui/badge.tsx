import React from "react";

export type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  neutral: {
    container: "bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border-default)]",
    dot: "bg-[var(--text-tertiary)]",
  },
  brand: {
    container: "bg-[var(--brand-soft)] text-[var(--brand-foreground)] border-[var(--brand-soft-border)]",
    dot: "bg-[var(--brand)]",
  },
  success: {
    container: "bg-[var(--success-soft)] text-[var(--success-foreground)] border-[var(--success-border)]",
    dot: "bg-[var(--success)]",
  },
  warning: {
    container: "bg-[var(--warning-soft)] text-[var(--warning-foreground)] border-[var(--warning-border)]",
    dot: "bg-[var(--warning)]",
  },
  danger: {
    container: "bg-[var(--danger-soft)] text-[var(--danger-foreground)] border-[var(--danger-border)]",
    dot: "bg-[var(--danger)]",
  },
  info: {
    container: "bg-[var(--info-soft)] text-[var(--info-foreground)] border-[var(--info-border)]",
    dot: "bg-[var(--info)]",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px] font-medium gap-1 rounded-md",
  md: "px-2.5 py-1 text-xs font-medium gap-1.5 rounded-md",
};

export function Badge({
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  const vStyle = variantStyles[variant] || variantStyles.neutral;
  const sStyle = sizeStyles[size] || sizeStyles.md;

  return (
    <span
      className={`inline-flex items-center border font-medium tracking-tight select-none ${vStyle.container} ${sStyle} ${className}`.trim()}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${vStyle.dot}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
}
