/**
 * Intentionally NOT a client component: it renders no interactive state, and
 * the server-rendered dashboard imports `statColors` from here. A "use client"
 * directive would turn that export into a client-reference proxy on the server.
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip, e.g. "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400" */
  color: string;
  /** Percentage change vs. the previous period. */
  delta?: number;
  /** What the delta is measured against, e.g. "مقارنة بالشهر الماضي". */
  deltaLabel?: string;
  /** For metrics where a drop is good (refunds, costs). */
  invertDelta?: boolean;
  /** Turns the whole card into a link. */
  href?: string;
  hint?: string;
}

function DeltaPill({ delta, invert, label }: { delta: number; invert?: boolean; label?: string }) {
  const flat = Math.abs(delta) < 0.5;
  const good = invert ? delta < 0 : delta > 0;
  const Icon = flat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[11px] font-bold tnum",
          flat
            ? "bg-surface-sunken text-fg-muted"
            : good
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
        )}
      >
        <Icon className="h-3 w-3" aria-hidden />
        {flat ? "0%" : `${Math.abs(Math.round(delta))}%`}
      </span>
      {label && <span className="text-[11px] text-fg-subtle">{label}</span>}
    </span>
  );
}

function StatBody({ item }: { item: StatItem }) {
  const Icon = item.icon;
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-fg-muted">{item.label}</p>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", item.color)}>
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </span>
      </div>
      <p className="mt-2 truncate text-[1.6rem] font-bold leading-tight tnum text-fg">{item.value}</p>
      <div className="mt-1.5 min-h-[18px]">
        {item.delta !== undefined ? (
          <DeltaPill delta={item.delta} invert={item.invertDelta} label={item.deltaLabel} />
        ) : (
          item.hint && <span className="text-[11px] text-fg-subtle">{item.hint}</span>
        )}
      </div>
    </>
  );
}

/** A responsive row of KPI cards used across admin pages. */
export function AdminStats({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4", className)}>
      {items.map((item) =>
        item.href ? (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-card border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <StatBody item={item} />
          </Link>
        ) : (
          <div key={item.label} className="rounded-card border border-line bg-surface p-4 shadow-card">
            <StatBody item={item} />
          </div>
        )
      )}
    </div>
  );
}

/* Shared icon-chip colour presets so KPI rows stay consistent page to page. */
export const statColors = {
  primary: "text-primary-600 bg-primary-50 dark:bg-primary-500/10 dark:text-primary-400",
  blue: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400",
  green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400",
  amber: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400",
  red: "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400",
  purple: "text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400",
  gray: "text-fg-muted bg-surface-sunken",
} as const;
