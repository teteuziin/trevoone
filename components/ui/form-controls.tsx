"use client";

import React, { forwardRef, useId, useState, useRef, useEffect } from "react";

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

// ==========================================
// DEFAULT TAXONOMY SUGGESTIONS
// ==========================================
export const DEFAULT_SUGGESTED_MUSCLE_GROUPS: readonly string[] = [
  "Peitoral",
  "Dorsal",
  "Trapézio",
  "Deltoide Anterior",
  "Deltoide Lateral",
  "Deltoide Posterior",
  "Quadríceps",
  "Isquiotibiais",
  "Glúteos",
  "Panturrilhas",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Abdômen",
  "Lombar",
  "Cardiorrespiratório",
] as const;

export const DEFAULT_SUGGESTED_EQUIPMENT: readonly string[] = [
  "Halteres",
  "Barra",
  "Barra W",
  "Polia / Cabo",
  "Máquina Articulada",
  "Máquina com Placas",
  "Peso Corporal",
  "Elástico / Faixa",
  "Kettlebell",
  "Smith Machine",
  "Banco Regulável",
] as const;

// ==========================================
// SUGGESTIVE INPUT (COMBOBOX / INPUT COM SUGESTÕES)
// ==========================================
export interface SuggestiveInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  suggestions: readonly string[] | string[];
  hasError?: boolean;
}

export function SuggestiveInput({
  value,
  onChange,
  suggestions,
  hasError,
  disabled,
  placeholder,
  className = "",
  maxLength = 100,
  id: explicitId,
  ...props
}: SuggestiveInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedDatalistId = useId();
  const datalistId = `datalist-${generatedDatalistId.replace(/:/g, "")}`;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const query = value.toLowerCase().trim();
  const filtered = query
    ? suggestions.filter((s) => s.toLowerCase().includes(query))
    : suggestions;

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        id={explicitId}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        hasError={hasError}
        list={datalistId}
        className={className}
        iconRight={
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus:outline-none"
            aria-label="Abrir sugestões"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        }
        {...props}
      />

      <datalist id={datalistId}>
        {suggestions.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      {isOpen && !disabled && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-1.5 shadow-lg space-y-0.5 animate-in fade-in duration-100">
          {filtered.map((item) => {
            const isSelected = item.toLowerCase() === value.toLowerCase().trim();
            return (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                    isSelected
                      ? "bg-[var(--surface-subtle)] text-[var(--brand)] font-semibold"
                      : "text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                  }`}
                >
                  <span>{item}</span>
                  {isSelected && (
                    <span className="text-[var(--brand)] text-[11px] font-medium">✓</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
