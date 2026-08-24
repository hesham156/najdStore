"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "soft-danger";

type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  /** Rendered before the label; hidden while `loading` so the row never jumps. */
  icon?: React.ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 text-white shadow-xs hover:bg-primary-700 active:bg-primary-800 focus-visible:outline-primary-600",
  secondary:
    "bg-surface text-fg border border-line shadow-xs hover:bg-surface-hover active:bg-surface-sunken",
  outline:
    "border border-primary-300 text-primary-700 hover:bg-primary-50 dark:border-primary-500/40 dark:text-primary-300 dark:hover:bg-primary-500/10",
  ghost:
    "text-fg-muted hover:bg-surface-hover hover:text-fg",
  danger:
    "bg-danger-solid text-white shadow-xs hover:opacity-90 active:opacity-80 focus-visible:outline-danger",
  success:
    "bg-success-solid text-white shadow-xs hover:opacity-90 active:opacity-80 focus-visible:outline-success",
  "soft-danger":
    "bg-danger/10 text-danger hover:bg-danger/[0.16]",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs rounded-lg gap-1.5",
  sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-control gap-2",
  lg: "h-11 px-5 text-sm rounded-control gap-2",
  icon: "h-10 w-10 rounded-control",
  "icon-sm": "h-8 w-8 rounded-lg",
};

/**
 * The one button in the system. Icon-only sizes (`icon`, `icon-sm`) must be
 * given an `aria-label` or `title` so screen readers announce something.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, fullWidth, icon, children, disabled, type, ...props },
    ref
  ) => (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold",
        "transition-[background-color,color,box-shadow,opacity] duration-150",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        icon
      )}
      {children}
    </button>
  )
);

Button.displayName = "Button";

/** Small square button for table rows and toolbars. Always pass `label`. */
const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "children" | "size"> & { label: string; size?: "icon" | "icon-sm" }
>(({ label, size = "icon-sm", variant = "ghost", ...props }, ref) => (
  <Button ref={ref} size={size} variant={variant} aria-label={label} title={label} {...props} />
));

IconButton.displayName = "IconButton";

export { Button, IconButton };
export type { ButtonProps, ButtonVariant, ButtonSize };
