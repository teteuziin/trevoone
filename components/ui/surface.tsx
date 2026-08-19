import React, { forwardRef } from "react";

export type SurfaceVariant = "default" | "subtle" | "elevated" | "interactive";
export type SurfacePadding = "none" | "sm" | "md" | "lg";

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
}

const variantStyles: Record<SurfaceVariant, string> = {
  default:
    "bg-[var(--surface)] border border-[var(--border-default)] shadow-xs rounded-2xl",
  subtle:
    "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-2xl",
  elevated:
    "bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-sm rounded-2xl",
  interactive:
    "bg-[var(--surface)] border border-[var(--border-default)] shadow-xs hover:border-[var(--border-strong)] hover:shadow-sm transition-all duration-150 ease-out cursor-pointer rounded-2xl",
};

const paddingStyles: Record<SurfacePadding, string> = {
  none: "p-0",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5 lg:p-6",
  lg: "p-6 sm:p-7 lg:p-8",
};

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ variant = "default", padding = "md", className = "", children, ...props }, ref) => {
    const variantClass = variantStyles[variant] || variantStyles.default;
    const paddingClass = paddingStyles[padding] || paddingStyles.md;

    return (
      <div
        ref={ref}
        className={`${variantClass} ${paddingClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Surface.displayName = "Surface";

// Card alias
export const Card = Surface;

// ==========================================
// CARD SUBCOMPONENTS
// ==========================================

export function CardHeader({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex flex-col space-y-1 mb-4 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-base font-bold text-[var(--text-primary)] tracking-tight ${className}`.trim()}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed ${className}`.trim()} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center pt-4 border-t border-[var(--border-subtle)] mt-4 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
