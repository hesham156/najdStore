"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/* Small building blocks used only by the design-system reference page. */

/** A labelled example block: what it looks like + what to type. */
export function Spec({
  title,
  usage,
  description,
  children,
  className,
}: {
  title: string;
  /** The Tailwind class or component call the example demonstrates. */
  usage?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5 border-b border-line pb-5 last:border-0 last:pb-0", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-fg">{title}</h3>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{description}</p>}
        </div>
        {usage && <CodeChip value={usage} />}
      </div>
      <div className="pt-1">{children}</div>
    </div>
  );
}

/** Click-to-copy code chip — the page is a reference, so copying is the point. */
export function CodeChip({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      })
      .catch(() => {
        /* clipboard blocked — the value is visible either way */
      });
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`نسخ ${value}`}
      className={cn(
        "group inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface-sunken px-2 py-1",
        "font-mono text-[11px] text-fg-muted transition-colors hover:border-line-strong hover:text-fg",
        className
      )}
      dir="ltr"
    >
      <span className="truncate">{value}</span>
      {copied ? (
        <Check className="h-3 w-3 shrink-0 text-emerald-500" aria-hidden />
      ) : (
        <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" aria-hidden />
      )}
    </button>
  );
}

/** A colour token: swatch + name + the CSS variable behind it. */
export function Swatch({
  className,
  name,
  variable,
  border,
}: {
  className: string;
  name: string;
  variable?: string;
  /** Use for near-white surfaces that would otherwise vanish on the page. */
  border?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div
        className={cn("h-14 w-full rounded-control", className, border && "border border-line")}
        aria-hidden
      />
      <div className="space-y-0.5">
        <CodeChip value={name} className="w-full justify-between" />
        {variable && <p className="px-1 font-mono text-[10px] text-fg-subtle" dir="ltr">{variable}</p>}
      </div>
    </div>
  );
}

/** A row of related examples that wraps on small screens. */
export function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

/** Do / Don't guidance pair. */
export function Guidance({ good, bad }: { good: React.ReactNode; bad: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      <div className="rounded-control border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 dark:border-emerald-500/25 dark:bg-emerald-500/10">
        <p className="mb-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">افعل</p>
        <p className="text-xs leading-relaxed text-emerald-900/80 dark:text-emerald-200/80">{good}</p>
      </div>
      <div className="rounded-control border border-red-200 bg-red-50 px-3.5 py-2.5 dark:border-red-500/25 dark:bg-red-500/10">
        <p className="mb-0.5 text-[11px] font-bold text-red-700 dark:text-red-400">تجنّب</p>
        <p className="text-xs leading-relaxed text-red-900/80 dark:text-red-200/80">{bad}</p>
      </div>
    </div>
  );
}
