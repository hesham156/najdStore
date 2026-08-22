"use client";

import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, RefreshCw, SearchX, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

/* ═══════════════════════════════════════════════════════════
   Empty / error / loading states.
   Every message says what happened AND what to do next.
   ═══════════════════════════════════════════════════════════ */

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Compact fits inside a table cell; default stands alone on a page. */
  size?: "sm" | "md";
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className, size = "md" }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "gap-2 px-4 py-10" : "gap-3 px-6 py-16",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-surface-sunken text-fg-subtle",
          size === "sm" ? "h-10 w-10" : "h-14 w-14"
        )}
      >
        <Icon className={size === "sm" ? "h-5 w-5" : "h-6 w-6"} aria-hidden />
      </div>
      <div className="space-y-1">
        <p className={cn("font-semibold text-fg", size === "sm" ? "text-sm" : "text-base")}>{title}</p>
        {description && <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Empty state for a search/filter that matched nothing. */
export function NoResultsState({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={SearchX}
      size="sm"
      title="لا توجد نتائج مطابقة"
      description={
        query
          ? `لم نعثر على أي نتيجة لـ "${query}". جرّب كلمات أقل أو أزل بعض عوامل التصفية.`
          : "لا توجد عناصر تطابق عوامل التصفية الحالية. جرّب تعديلها."
      }
      action={
        onClear && (
          <Button variant="secondary" size="sm" onClick={onClear}>
            مسح التصفية
          </Button>
        )
      }
    />
  );
}

/** Something went wrong talking to the API. */
export function ErrorState({
  title = "تعذّر تحميل البيانات",
  description = "حدث خطأ أثناء الاتصال بالخادم. تحقق من اتصالك بالإنترنت ثم أعد المحاولة.",
  onRetry,
  size = "md",
}: {
  title?: string;
  description?: React.ReactNode;
  onRetry?: () => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        size === "sm" ? "px-4 py-10" : "px-6 py-16"
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <WifiOff className="h-5 w-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-fg-muted">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={<RefreshCw className="h-3.5 w-3.5" />}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

/* ── Skeletons ────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3.5" style={{ width: i === lines - 1 ? "60%" : "100%" }} />
      ))}
    </div>
  );
}

/** Matches the KPI card row so the layout does not shift on load. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-card border border-line bg-surface p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="skeleton h-9 w-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-16" />
              <div className="skeleton h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Inline alert / callout ───────────────────────────────── */

type AlertTone = "info" | "success" | "warning" | "danger";

const ALERT_TONES: Record<AlertTone, { wrap: string; icon: string }> = {
  info: {
    wrap: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200",
    icon: "text-blue-600 dark:text-blue-400",
  },
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200",
    icon: "text-amber-600 dark:text-amber-400",
  },
  danger: {
    wrap: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200",
    icon: "text-red-600 dark:text-red-400",
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  icon: Icon = AlertTriangle,
  action,
  className,
}: {
  tone?: AlertTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  const t = ALERT_TONES[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-control border px-4 py-3 text-[13px]", t.wrap, className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.icon)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn("leading-relaxed", title && "mt-0.5 opacity-90")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
