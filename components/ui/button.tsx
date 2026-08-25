import React, { forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] text-white shadow-xs hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none",
  secondary:
    "bg-[var(--surface)] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none",
  ghost:
    "bg-transparent hover:bg-[var(--surface-hover)] active:bg-[var(--surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none",
  danger:
    "bg-[var(--danger)] hover:bg-[var(--danger-hover)] active:bg-[var(--danger-hover)] text-white shadow-xs focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-danger)] focus-visible:outline-none",
  outline:
    "bg-transparent hover:bg-[var(--brand-soft)] text-[var(--brand-foreground)] border border-[var(--brand-soft-border)] hover:border-[var(--brand)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:outline-none",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8.5 px-3 text-xs font-semibold gap-1.5 rounded-xl",
  md: "h-10 px-4 text-sm font-semibold gap-2 rounded-xl",
  lg: "h-12 px-5 text-base font-semibold gap-2.5 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      type = "button",
      isLoading = false,
      icon,
      iconRight,
      fullWidth = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center select-none transition-all duration-150 ease-out cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
    const widthClass = fullWidth ? "w-full" : "";
    const variantClass = variantStyles[variant] || variantStyles.primary;
    const sizeClass = sizeStyles[size] || sizeStyles.md;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          icon
        )}
        {children && <span>{children}</span>}
        {!isLoading && iconRight}
      </button>
    );
  }
);

Button.displayName = "Button";

// ==========================================
// ICON BUTTON
// ==========================================
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const iconButtonSizeStyles: Record<"sm" | "md" | "lg", string> = {
  sm: "w-8.5 h-8.5 rounded-xl",
  md: "w-10 h-10 rounded-xl",
  lg: "w-12 h-12 rounded-xl",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      variant = "ghost",
      size = "md",
      type = "button",
      isLoading = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center select-none transition-all duration-150 ease-out cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";
    const variantClass = variantStyles[variant] || variantStyles.ghost;
    const sizeClass = iconButtonSizeStyles[size] || iconButtonSizeStyles.md;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim()}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          children
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";
