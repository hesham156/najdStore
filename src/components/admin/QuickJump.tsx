"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { allNavItems, navGroups } from "./nav-config";
import { cn } from "@/lib/utils";

/**
 * Keyboard-first page switcher (Ctrl/⌘ + K). Navigation only — it never
 * performs an action, so there is nothing to confirm.
 */
export function QuickJump() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  const groupOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of navGroups) for (const i of g.items) map.set(i.href, g.label);
    return map;
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allNavItems;
    return allNavItems.filter(
      (i) => i.label.toLowerCase().includes(q) || (i.keywords ?? "").toLowerCase().includes(q)
    );
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].href);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="البحث في الصفحات"
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-line bg-surface-sunken px-2.5 py-1.5",
          "text-xs font-medium text-fg-subtle transition-colors hover:border-line-strong hover:text-fg-muted"
        )}
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden md:inline">بحث سريع</span>
        <kbd className="hidden rounded border border-line bg-surface px-1 font-sans text-[10px] font-semibold md:inline">
          Ctrl K
        </kbd>
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} size="md" hideClose>
        <div className="-mx-5 -my-4">
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="انتقل إلى صفحة..."
              aria-label="انتقل إلى صفحة"
              className="w-full bg-transparent text-sm text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </div>

          <ul className="max-h-[22rem] overflow-y-auto p-2" role="listbox" aria-label="نتائج البحث">
            {results.length === 0 ? (
              <li className="px-3 py-8 text-center text-[13px] text-fg-muted">
                لا توجد صفحة بهذا الاسم — جرّب كلمة أخرى.
              </li>
            ) : (
              results.map((item, i) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item.href)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start transition-colors",
                        i === active ? "bg-surface-hover" : "hover:bg-surface-hover"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">{item.label}</span>
                      <span className="shrink-0 text-[11px] text-fg-subtle">{groupOf.get(item.href)}</span>
                      {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </Modal>
    </>
  );
}
