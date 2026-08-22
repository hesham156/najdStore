"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Side = "top" | "bottom" | "inline-start" | "inline-end";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: Side;
  /** Skip rendering entirely (e.g. only show tooltips while the sidebar is collapsed). */
  disabled?: boolean;
  className?: string;
}

/**
 * Pointer- and keyboard-triggered tooltip. Purely descriptive — never put
 * an action or information that exists nowhere else inside one.
 */
export function Tooltip({ content, children, side = "inline-end", disabled, className }: TooltipProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    const el = anchorRef.current?.firstElementChild ?? anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
    const gap = 8;

    let top = r.top + r.height / 2;
    let left = r.left + r.width / 2;
    if (side === "top") top = r.top - gap;
    else if (side === "bottom") top = r.bottom + gap;
    else {
      const startsRight = isRtl;
      const toStart = side === "inline-start";
      left = startsRight === toStart ? r.right + gap : r.left - gap;
    }
    setPos({ top, left });
  }, [side]);

  const hide = useCallback(() => setPos(null), []);

  if (disabled) return children;

  const transform =
    side === "top"
      ? "translate(-50%, -100%)"
      : side === "bottom"
        ? "translate(-50%, 0)"
        : (typeof document !== "undefined" && document.documentElement.dir === "rtl") === (side === "inline-end")
          ? "translate(-100%, -50%)"
          : "translate(0, -50%)";

  return (
    <>
      <span
        ref={anchorRef}
        className="contents"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocusCapture={show}
        onBlurCapture={hide}
      >
        {children}
      </span>
      {pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: pos.top, left: pos.left, transform }}
            className={cn(
              "pointer-events-none fixed z-popover whitespace-nowrap rounded-lg px-2.5 py-1.5",
              "bg-gray-900 text-[11px] font-medium text-white shadow-pop animate-fade-in",
              "dark:bg-gray-700",
              className
            )}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
