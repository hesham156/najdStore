"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { CountBadge } from "./Badge";

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** `underline` for page-level sections, `pill` for filters above a table. */
  variant?: "underline" | "pill" | "segmented";
  className?: string;
  ariaLabel?: string;
}

/**
 * Roving-tabindex tablist: Arrow keys move between tabs, matching the
 * WAI-ARIA pattern. Works in both RTL and LTR (Arrow keys are swapped
 * automatically by reading the document direction).
 */
export function Tabs({ items, value, onChange, variant = "pill", className, ariaLabel }: TabsProps) {
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);

  const move = (dir: 1 | -1) => {
    const enabled = items.filter((i) => !i.disabled);
    const idx = enabled.findIndex((i) => i.value === value);
    const next = enabled[(idx + dir + enabled.length) % enabled.length];
    if (!next) return;
    onChange(next.value);
    listRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${baseId}-${next.value}`)}`)?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === forward || e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === back || e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        "flex items-center gap-1 overflow-x-auto no-scrollbar",
        variant === "underline" && "border-b border-line gap-0",
        variant === "segmented" && "w-fit rounded-control bg-surface-sunken p-1",
        className
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            id={`${baseId}-${item.value}`}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium transition-colors duration-150",
              "disabled:cursor-not-allowed disabled:opacity-40",
              variant === "pill" &&
                cn(
                  "rounded-full px-3 py-1.5",
                  active
                    ? "bg-primary-600 text-white shadow-xs"
                    : "bg-surface-sunken text-fg-muted hover:bg-surface-hover hover:text-fg"
                ),
              variant === "segmented" &&
                cn(
                  "rounded-lg px-3 py-1.5",
                  active ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg"
                ),
              variant === "underline" &&
                cn(
                  "-mb-px border-b-2 px-3.5 py-2.5",
                  active
                    ? "border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300"
                    : "border-transparent text-fg-muted hover:border-line-strong hover:text-fg"
                )
            )}
          >
            {item.icon && <span className="[&>svg]:h-4 [&>svg]:w-4" aria-hidden>{item.icon}</span>}
            {item.label}
            {item.count !== undefined && <CountBadge value={item.count} active={active && variant === "pill"} />}
          </button>
        );
      })}
    </div>
  );
}

/** Panel wrapper that pairs with <Tabs>; keeps hidden panels out of the tree. */
export function TabPanel({
  when,
  value,
  children,
  className,
}: {
  when: string;
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (when !== value) return null;
  return (
    <div role="tabpanel" className={cn("animate-fade-in", className)}>
      {children}
    </div>
  );
}
