"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, Menu, X } from "lucide-react";
import Link from "next/link";
import { AdminSidebar } from "./AdminSidebar";
import { QuickJump } from "./QuickJump";
import { titleForPath } from "./nav-config";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "admin:sidebar-collapsed";

export function AdminShell({ children, storeName }: { children: React.ReactNode; storeName: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  /* Restore the collapsed preference before first paint of the sidebar. */
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* storage unavailable (private mode) — fall back to expanded */
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  /* Close the mobile drawer whenever the route changes. */
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  /* Lock the page behind the drawer and allow Esc to dismiss it. */
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <div className="admin-scope flex min-h-screen">
      <a href="#admin-main" className="skip-link">
        تخطَّ إلى المحتوى
      </a>

      {/* ── Desktop sidebar ── */}
      <div className="sticky top-0 hidden h-screen shrink-0 border-e border-line lg:block">
        <AdminSidebar storeName={storeName} collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-drawer lg:hidden" role="dialog" aria-modal="true" aria-label="القائمة الجانبية">
          <div className="absolute inset-0 bg-surface-sunken backdrop-blur-[2px] animate-fade-in" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 start-0 flex w-[var(--sidebar-w)] max-w-[85%] shadow-overlay animate-drawer">
            <AdminSidebar storeName={storeName} onNavigate={() => setDrawerOpen(false)} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="إغلاق القائمة"
              className="absolute -end-11 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-fg-muted shadow-pop"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-header flex h-[var(--header-h)] items-center gap-2 border-b border-line px-3 sm:px-5",
            "bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/75"
          )}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="فتح القائمة"
            className="-ms-1 rounded-lg p-2 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>

          <h2 className="truncate text-sm font-bold text-fg">{titleForPath(pathname)}</h2>

          <div className="ms-auto flex items-center gap-1.5">
            <QuickJump />
            <ThemeToggle compact />
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg sm:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              عرض المتجر
            </Link>
          </div>
        </header>

        <main id="admin-main" className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
