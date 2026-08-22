"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ChevronsLeft, ChevronsRight, LogOut, Store } from "lucide-react";
import { SiteLogo } from "@/components/ui/site-logo";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { navGroups } from "./nav-config";

interface AdminSidebarProps {
  storeName?: string;
  /** Collapsed rail mode — icons only, labels shown as tooltips. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export function AdminSidebar({
  storeName = "المتجر",
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const roleLabel = session?.user.role === "ADMIN" ? "مدير عام" : "موظف";
  const initial = session?.user.name?.trim().charAt(0) || "م";

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-surface transition-[width] duration-200 ease-out",
        collapsed ? "w-[var(--sidebar-w-collapsed)]" : "w-[var(--sidebar-w)]"
      )}
    >
      {/* ── Brand ── */}
      <div className={cn("flex h-[var(--header-h)] shrink-0 items-center border-b border-line px-3", collapsed && "justify-center px-2")}>
        <Link
          href="/admin"
          onClick={onNavigate}
          className={cn("flex min-w-0 items-center gap-2.5 rounded-lg", collapsed && "justify-center")}
          aria-label={`لوحة الإدارة — ${storeName}`}
        >
          <SiteLogo size="sm" />
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold leading-tight text-fg">لوحة الإدارة</span>
              <span className="block truncate text-[11px] leading-tight text-fg-muted">{storeName}</span>
            </span>
          )}
        </Link>
        {!collapsed && onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="طيّ القائمة الجانبية"
            title="طيّ القائمة الجانبية"
            className="ms-auto hidden rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg lg:block"
          >
            <ChevronsRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav aria-label="التنقل الرئيسي" className={cn("flex-1 overflow-y-auto overflow-x-hidden py-3", collapsed ? "px-2" : "px-3")}>
        {navGroups.map((group, groupIdx) => (
          <div key={group.label} className="mb-3 last:mb-0">
            {collapsed ? (
              groupIdx > 0 && <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden />
            ) : (
              <p className="sidebar-group-label">{group.label}</p>
            )}
            <ul className="space-y-0.5" role="list">
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Tooltip content={item.label} side="inline-end" disabled={!collapsed}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={cn("sidebar-link", collapsed && "justify-center px-0", active && "sidebar-link-active")}
                      >
                        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Account + footer ── */}
      <div className={cn("shrink-0 space-y-1 border-t border-line py-3", collapsed ? "px-2" : "px-3")}>
        {collapsed && onToggleCollapse && (
          <Tooltip content="توسيع القائمة" side="inline-end">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="توسيع القائمة الجانبية"
              className="sidebar-link w-full justify-center px-0"
            >
              <ChevronsLeft className="h-[18px] w-[18px] rtl:rotate-0 ltr:rotate-180" aria-hidden />
            </button>
          </Tooltip>
        )}

        <Tooltip content="عرض المتجر" side="inline-end" disabled={!collapsed}>
          <Link
            href="/"
            target="_blank"
            onClick={onNavigate}
            className={cn("sidebar-link", collapsed && "justify-center px-0")}
            aria-label={collapsed ? "عرض المتجر" : undefined}
          >
            <Store className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {!collapsed && <span>عرض المتجر</span>}
          </Link>
        </Tooltip>

        <Tooltip content="تسجيل الخروج" side="inline-end" disabled={!collapsed}>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className={cn(
              "sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10",
              collapsed && "justify-center px-0"
            )}
            aria-label={collapsed ? "تسجيل الخروج" : undefined}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </Tooltip>

        {/* Signed-in identity */}
        <div className={cn("mt-2 flex items-center gap-2.5 rounded-xl bg-surface-sunken p-2", collapsed && "justify-center bg-transparent p-0 pt-1")}>
          <Tooltip content={`${session?.user.name ?? ""} — ${roleLabel}`} side="inline-end" disabled={!collapsed}>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-violet-600 text-[13px] font-bold text-white"
              aria-hidden
            >
              {initial}
            </span>
          </Tooltip>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-fg">{session?.user.name}</span>
              <span className="block truncate text-[11px] text-fg-muted">{roleLabel}</span>
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
