import React, { forwardRef, useId } from "react";

// ==========================================
// LABEL
// ==========================================
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ children, required, optional, className = "", ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={`block text-xs font-semibold text-[var(--text-primary)] tracking-tight mb-1.5 ${className}`.trim()}
        {...props}
      >
        {children}
        {required && <span className="text-[var(--danger)] ml-1" aria-hidden="true">*</span>}
        {optional && (
          <span className="text-[var(--text-tertiary)] font-normal text-[11px] ml-1.5">
            (opcional)
          </span>
        )}
      </label>
    );
  }
);
Label.displayName = "Label";

// ==========================================
// INPUT HELPER / ERROR TEXT
// ==========================================
export interface InputHelperProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "default" | "error" | "success";
}

export const InputHelper = forwardRef<HTMLParagraphElement, InputHelperProps>(
  ({ children, variant = "default", className = "", ...props }, ref) => {
    if (!children) return null;

    const colorClass =
      variant === "error"
        ? "text-[var(--danger)]"
        : variant === "success"
        ? "text-[var(--brand-foreground)]"
        : "text-[var(--text-secondary)]";

    return (
      <p
        ref={ref}
        className={`text-xs mt-1.5 leading-relaxed ${colorClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </p>
    );
  }
);
InputHelper.displayName = "InputHelper";

// ==========================================
// INPUT
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, icon, iconRight, disabled, className = "", ...props }, ref) => {
    const errorClasses = hasError
      ? "border-[var(--danger)] text-[var(--text-primary)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--focus-ring-danger)]"
      : "border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--focus-ring)]";

    const paddingLeft = icon ? "pl-9.5" : "pl-3.5";
    const paddingRight = iconRight ? "pr-9.5" : "pr-3.5";

    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-tertiary)]">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`w-full h-10.5 py-2 ${paddingLeft} ${paddingRight} bg-[var(--surface)] border rounded-xl text-sm shadow-2xs transition-all duration-150 ease-out placeholder:text-[var(--text-tertiary)] outline-none disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed ${errorClasses} ${className}`.trim()}
          {...props}
        />
        {iconRight && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-tertiary)]">
            {iconRight}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

// ==========================================
// TEXTAREA
// ==========================================
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError, disabled, className = "", rows = 3, ...props }, ref) => {
    const errorClasses = hasError
      ? "border-[var(--danger)] text-[var(--text-primary)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--focus-ring-danger)]"
      : "border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--focus-ring)]";

    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`w-full py-2.5 px-3.5 bg-[var(--surface)] border rounded-xl text-sm shadow-2xs transition-all duration-150 ease-out placeholder:text-[var(--text-tertiary)] outline-none disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed resize-y ${errorClasses} ${className}`.trim()}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// ==========================================
// SELECT
// ==========================================
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError, disabled, children, className = "", ...props }, ref) => {
    const errorClasses = hasError
      ? "border-[var(--danger)] text-[var(--text-primary)] focus:border-[var(--danger)] focus:ring-2 focus:ring-[var(--focus-ring-danger)]"
      : "border-[var(--border-default)] hover:border-[var(--border-strong)] text-[var(--text-primary)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--focus-ring)]";

    return (
      <div className="relative w-full">
        <select
          ref={ref}
          disabled={disabled}
          className={`w-full h-10.5 py-2 pl-3.5 pr-9 bg-[var(--surface)] border rounded-xl text-sm shadow-2xs transition-all duration-150 ease-out placeholder:text-[var(--text-tertiary)] outline-none appearance-none disabled:bg-[var(--surface-subtle)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed ${errorClasses} ${className}`.trim()}
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
);
Select.displayName = "Select";

// ==========================================
// FORM FIELD COMPOSER
// ==========================================
export interface FormFieldProps {
  label?: string;
  required?: boolean;
  optional?: boolean;
  helperText?: string;
  error?: string;
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  required,
  optional,
  helperText,
  error,
  id: explicitId,
  className = "",
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const fieldId = explicitId || generatedId;

  return (
    <div className={`w-full ${className}`.trim()}>
      {label && (
        <Label htmlFor={fieldId} required={required} optional={optional}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <InputHelper variant="error">{error}</InputHelper>
      ) : helperText ? (
        <InputHelper variant="default">{helperText}</InputHelper>
      ) : null}
    </div>
  );
}
