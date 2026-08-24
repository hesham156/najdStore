"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   A small headless dropdown: keyboard-navigable, RTL-aware and
   rendered in a portal so it is never clipped by table overflow.
   ───────────────────────────────────────────────────────────── */

export interface DropdownItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  icon?: React.ReactNode;
  /** Renders in red — use for delete/reject style actions. */
  danger?: boolean;
  disabled?: boolean;
  /** Draws a divider above this item. */
  separated?: boolean;
}

interface DropdownProps {
  items: DropdownItem[];
  /** Custom trigger. Defaults to a "⋯" icon button. */
  trigger?: React.ReactNode;
  align?: "start" | "end";
  label?: string;
  className?: string;
  menuClassName?: string;
}

export function Dropdown({
  items,
  trigger,
  align = "end",
  label = "المزيد من الإجراءات",
  className,
  menuClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; inlineStart: number } | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const enabledIdx = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const isRtl = document.documentElement.dir === "rtl";
    // `inlineStart` is measured from the document's inline-start edge.
    const startEdge = isRtl ? window.innerWidth - r.right : r.left;
    const endEdge = isRtl ? window.innerWidth - r.left : r.right;
    setCoords({
      top: r.bottom + 6,
      inlineStart: align === "start" ? startEdge : endEdge - 200,
    });
  }, [align]);

  useEffect(() => {
    if (!open) return;
    place();
    const close = () => setOpen(false);
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !triggerRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, place]);

  const runItem = (item: DropdownItem) => {
    if (item.disabled) return;
    setOpen(false);
    item.onSelect?.();
    if (item.href) window.location.href = item.href;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setActiveIdx(enabledIdx[0] ?? -1);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const pos = enabledIdx.indexOf(activeIdx);
      const next = e.key === "ArrowDown" ? pos + 1 : pos - 1;
      setActiveIdx(enabledIdx[(next + enabledIdx.length) % enabledIdx.length]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (items[activeIdx]) runItem(items[activeIdx]);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={trigger ? undefined : label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          !trigger &&
            "inline-flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg",
          open && !trigger && "bg-surface-hover text-fg",
          className
        )}
      >
        {trigger ?? <MoreHorizontal className="h-4 w-4" aria-hidden />}
      </button>

      {open &&
        coords &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onKeyDown={onKeyDown}
            style={{ top: coords.top, insetInlineStart: coords.inlineStart }}
            className={cn(
              "fixed z-popover min-w-[11rem] overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop",
              "animate-pop-in",
              menuClassName
            )}
          >
            {items.map((item, i) => (
              <div key={`${item.label}-${i}`}>
                {item.separated && <div className="my-1 h-px bg-line" role="separator" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => runItem(item)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[13px] font-medium transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    item.danger ? "text-danger" : "text-fg",
                    activeIdx === i && !item.disabled && (item.danger ? "bg-danger/10" : "bg-surface-hover")
                  )}
                >
                  {item.icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
