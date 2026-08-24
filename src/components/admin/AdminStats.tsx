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
  /** Tailwind classes for the icon chip, e.g. "text-info bg-info/10" */
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
              ? "bg-success/10 text-success"
              : "bg-danger/10 text-danger"
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

/**
 * Icon-chip presets for KPI rows.
 *
 * A KPI chip is brand-coloured by default. It only takes a state tone when
 * the number itself means something is good, waiting, or wrong — "expired
 * coupons" earns `warning`, "total customers" does not.
 *
 * The hue-named keys below are kept so existing call sites keep working, but
 * `blue`, `purple` and `primary` all resolve to the brand: they were being
 * picked interchangeably for plain counts, and that is what made a row of
 * four sibling tiles read as four unrelated things. Prefer the semantic
 * names in new code.
 */
const BRAND_CHIP = "text-brand bg-brand/10";

export const statColors = {
  /* Semantic — use these. */
  brand: BRAND_CHIP,
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  danger: "text-danger bg-danger/10",
  info: "text-info bg-info/10",
  neutral: "text-fg-muted bg-surface-sunken",

  /* Hue-named aliases, kept for existing call sites. */
  primary: BRAND_CHIP,
  blue: BRAND_CHIP,
  purple: BRAND_CHIP,
  green: "text-success bg-success/10",
  amber: "text-warning bg-warning/10",
  red: "text-danger bg-danger/10",
  gray: "text-fg-muted bg-surface-sunken",
} as const;
