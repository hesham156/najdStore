"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, ShoppingBag, User, MessageSquare, Bell, LogOut, ChevronLeft, Shield, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/orders",        label: "طلباتي",         icon: ShoppingBag },
  { href: "/dashboard/subscriptions", label: "اشتراكاتي",      icon: CreditCard },
  { href: "/dashboard/profile",       label: "الملف الشخصي",  icon: User },
  { href: "/dashboard/tickets", label: "تذاكر الدعم", icon: MessageSquare },
  { href: "/dashboard/notifications", label: "الإشعارات", icon: Bell },
];

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function DashboardSidebar({ mobile, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className={cn("flex flex-col h-full", mobile ? "w-full" : "w-64")}>
      {/* User Info */}
      <div className="p-4 mb-2">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-100 dark:border-primary-800">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {session?.user.name?.charAt(0) || "م"}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
              {session?.user.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session?.user.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {links.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              "sidebar-link",
              isActive(href, exact) && "sidebar-link-active"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {label}
            {isActive(href, exact) && (
              <ChevronLeft className="h-4 w-4 ms-auto text-primary-500" />
            )}
          </Link>
        ))}

        {(session?.user.role === "ADMIN" || session?.user.role === "STAFF") && (
          <>
            <div className="my-3 border-t border-gray-200 dark:border-gray-700" />
            <Link
              href="/admin"
              onClick={onClose}
              className="sidebar-link text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            >
              <Shield className="h-5 w-5 shrink-0" />
              لوحة الإدارة
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-3 mt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="sidebar-link w-full text-danger hover:bg-danger/10"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
