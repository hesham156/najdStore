import { cn } from "@/lib/utils";

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
  default: "bg-primary-50 text-primary-700 ring-primary-600/15 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-400/20",
  primary: "bg-primary-50 text-primary-700 ring-primary-600/15 dark:bg-primary-500/10 dark:text-primary-300 dark:ring-primary-400/20",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
  danger: "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/20",
  info: "bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20",
  purple: "bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20",
  gray: "bg-surface-sunken text-fg-muted ring-line-strong/40",
};

const DOT_COLORS: Record<BadgeVariant, string> = {
  default: "bg-primary-500",
  primary: "bg-primary-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
  purple: "bg-violet-500",
  gray: "bg-gray-400",
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
    PAYMENT_APPROVED: { variant: "purple", label: "تم الموافقة على الدفع" },
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
