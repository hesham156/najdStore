"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronDown } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Shared field chrome: label → control → hint/error.
   Labels are always real <label> elements; a placeholder is
   never used as a substitute for one.
   ───────────────────────────────────────────────────────────── */

interface FieldProps {
  id: string;
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

function Field({ id, label, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="flex items-center gap-1 text-[13px] font-medium text-fg">
          {label}
          {required && (
            <span className="text-danger" aria-hidden>
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1 text-xs font-medium text-danger"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const CONTROL_BASE = cn(
  "w-full rounded-control border bg-surface px-3.5 text-sm text-fg",
  "placeholder:text-fg-subtle transition-colors duration-150",
  "focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-muted"
);

const controlState = (error?: boolean) =>
  error
    ? "border-danger/60 focus:border-danger focus:ring-danger/25"
    : "border-line hover:border-line-strong";

/* ── Input ─────────────────────────────────────────────────── */

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  /** Adornment on the reading-start side (right in RTL, left in LTR). */
  startIcon?: React.ReactNode;
  /** Adornment on the reading-end side. */
  endIcon?: React.ReactNode;
  wrapperClassName?: string;
  inputSize?: "sm" | "md";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      wrapperClassName,
      label,
      error,
      hint,
      startIcon,
      endIcon,
      id,
      required,
      inputSize = "md",
      ...props
    },
    ref
  ) => {
    const auto = useId();
    const inputId = id || `input-${auto}`;
    return (
      <Field id={inputId} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
        <div className="relative">
          {startIcon && (
            <span
              className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-fg-subtle"
              aria-hidden
            >
              {startIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={cn(
              CONTROL_BASE,
              controlState(!!error),
              inputSize === "sm" ? "h-9" : "h-10",
              startIcon && "ps-10",
              endIcon && "pe-10",
              className
            )}
            {...props}
          />
          {endIcon && (
            <span
              className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-fg-subtle"
              aria-hidden
            >
              {endIcon}
            </span>
          )}
        </div>
      </Field>
    );
  }
);
Input.displayName = "Input";

/* ── Textarea ──────────────────────────────────────────────── */

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, wrapperClassName, label, error, hint, id, required, rows = 4, ...props }, ref) => {
    const auto = useId();
    const inputId = id || `textarea-${auto}`;
    return (
      <Field id={inputId} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(CONTROL_BASE, controlState(!!error), "resize-y py-2.5 leading-relaxed", className)}
          {...props}
        />
      </Field>
    );
  }
);
Textarea.displayName = "Textarea";

/* ── Select ────────────────────────────────────────────────── */

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  wrapperClassName?: string;
  selectSize?: "sm" | "md";
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, wrapperClassName, label, error, hint, options, id, required, selectSize = "md", ...props },
    ref
  ) => {
    const auto = useId();
    const inputId = id || `select-${auto}`;
    return (
      <Field id={inputId} label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={cn(
              CONTROL_BASE,
              controlState(!!error),
              "cursor-pointer appearance-none pe-9",
              selectSize === "sm" ? "h-9" : "h-10",
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute inset-y-0 end-3 my-auto h-4 w-4 text-fg-subtle"
            aria-hidden
          />
        </div>
      </Field>
    );
  }
);
Select.displayName = "Select";

/* ── Switch ────────────────────────────────────────────────── */

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({ checked, onChange, label, description, disabled, id, className }: SwitchProps) {
  const auto = useId();
  const switchId = id || `switch-${auto}`;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <button
        type="button"
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary-600" : "bg-line-strong"
        )}
      >
        <span
          className={cn(
            "absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200",
            checked ? "start-[1.125rem]" : "start-0.5"
          )}
        />
      </button>
      {(label || description) && (
        <label htmlFor={switchId} className="cursor-pointer select-none">
          {label && <span className="block text-[13px] font-medium text-fg">{label}</span>}
          {description && <span className="block text-xs text-fg-muted">{description}</span>}
        </label>
      )}
    </div>
  );
}

/* ── Checkbox ──────────────────────────────────────────────── */

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const auto = useId();
    const inputId = id || `checkbox-${auto}`;
    return (
      <div className="flex items-start gap-2.5">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong bg-surface text-primary-600",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
            className
          )}
          {...props}
        />
        {(label || description) && (
          <label htmlFor={inputId} className="cursor-pointer select-none leading-tight">
            {label && <span className="block text-[13px] font-medium text-fg">{label}</span>}
            {description && <span className="mt-0.5 block text-xs text-fg-muted">{description}</span>}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Input, Textarea, Select, Checkbox, Field };
