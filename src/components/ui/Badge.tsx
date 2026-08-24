import { cn } from "@/lib/utils";

/**
 * Five meanings, not five decorations. `purple` is kept as an alias of
 * `primary` so old call sites keep working while resolving to the brand.
 */
export type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "gray";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  size?: "sm" | "md";
}

/**
 * Status colours are defined once here and reused everywhere so a given
 * status always reads the same across the whole dashboard.
 */
const VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-brand/10 text-brand ring-brand/20",
  primary: "bg-brand/10 text-brand ring-brand/20",
  purple: "bg-brand/10 text-brand ring-brand/20",
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning ring-warning/20",
  danger: "bg-danger/10 text-danger ring-danger/20",
  info: "bg-info/10 text-info ring-info/20",
  gray: "bg-surface-sunken text-fg-muted ring-line-strong/40",
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  default: "bg-brand",
  primary: "bg-brand",
  purple: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  gray: "bg-fg-subtle",
};

export function Badge({ variant = "default", children, className, dot, size = "md" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full font-medium ring-1 ring-inset",
        size === "sm" ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]",
        VARIANTS[variant],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_COLORS[variant])} aria-hidden />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Small numeric pill for nav items and filter tabs. */
export function CountBadge({ value, active, className }: { value: number; active?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tnum",
        active ? "bg-white/20 text-inherit" : "bg-surface-sunken text-fg-muted",
        className
      )}
    >
      {value}
    </span>
  );
}

/** Single source of truth for every status label + colour in the dashboard. */
export function getStatusBadge(status: string): { variant: BadgeVariant; label: string } {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    PENDING: { variant: "warning", label: "في الانتظار" },
    PENDING_PAYMENT_REVIEW: { variant: "info", label: "بانتظار مراجعة الدفع" },
    PAYMENT_APPROVED: { variant: "primary", label: "تم الموافقة على الدفع" },
    PROCESSING: { variant: "default", label: "جاري المعالجة" },
    DELIVERED: { variant: "success", label: "تم التسليم" },
    CANCELLED: { variant: "danger", label: "ملغي" },
    REFUNDED: { variant: "gray", label: "مسترد" },
    OPEN: { variant: "info", label: "مفتوح" },
    IN_PROGRESS: { variant: "warning", label: "قيد المعالجة" },
    RESOLVED: { variant: "success", label: "محلول" },
    CLOSED: { variant: "gray", label: "مغلق" },
    UPLOADED: { variant: "info", label: "تم الرفع" },
    APPROVED: { variant: "success", label: "موافق عليه" },
    REJECTED: { variant: "danger", label: "مرفوض" },
    LOW: { variant: "gray", label: "منخفض" },
    MEDIUM: { variant: "warning", label: "متوسط" },
    HIGH: { variant: "danger", label: "عالي" },
    URGENT: { variant: "danger", label: "عاجل" },
  };
  return map[status] || { variant: "gray" as BadgeVariant, label: status };
}
