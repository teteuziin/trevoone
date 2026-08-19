import React from "react";

export type AlertVariant = "info" | "success" | "warning" | "danger";

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: AlertVariant;
  title?: React.ReactNode;
  icon?: React.ReactNode;
}

const variantStyles: Record<
  AlertVariant,
  { container: string; title: string; icon: string }
> = {
  info: {
    container: "bg-[var(--info-soft)] border-[var(--info-border)] text-[var(--info-foreground)]",
    title: "text-[var(--info-foreground)]",
    icon: "text-[var(--info)]",
  },
  success: {
    container: "bg-[var(--success-soft)] border-[var(--success-border)] text-[var(--success-foreground)]",
    title: "text-[var(--success-foreground)]",
    icon: "text-[var(--success)]",
  },
  warning: {
    container: "bg-[var(--warning-soft)] border-[var(--warning-border)] text-[var(--warning-foreground)]",
    title: "text-[var(--warning-foreground)]",
    icon: "text-[var(--warning)]",
  },
  danger: {
    container: "bg-[var(--danger-soft)] border-[var(--danger-border)] text-[var(--danger-foreground)]",
    title: "text-[var(--danger-foreground)]",
    icon: "text-[var(--danger)]",
  },
};

function DefaultAlertIcon({ variant }: { variant: AlertVariant }) {
  switch (variant) {
    case "info":
      return (
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      );
    case "success":
      return (
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "warning":
      return (
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case "danger":
      return (
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      );
  }
}

export function Alert({
  variant = "info",
  title,
  icon,
  className = "",
  children,
  ...props
}: AlertProps) {
  const styles = variantStyles[variant] || variantStyles.info;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed ${styles.container} ${className}`.trim()}
      {...props}
    >
      <div className={`shrink-0 mt-0.5 ${styles.icon}`}>
        {icon || <DefaultAlertIcon variant={variant} />}
      </div>
      <div className="space-y-0.5 flex-1 min-w-0">
        {title && <h4 className={`font-bold tracking-tight ${styles.title}`}>{title}</h4>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
