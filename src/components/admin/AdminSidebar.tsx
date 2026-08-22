"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { SiteLogo } from "@/components/ui/site-logo";
import {
  LayoutDashboard, Package, Tag, ShoppingBag, Users, CreditCard, Archive,
  MessageSquare, TicketPercent, Settings, Shield, FileText, LogOut, ChevronLeft, Home, Wallet, SearchCheck, BookOpen, Megaphone, TrendingUp, Bell, Calculator, TrendingDown, Receipt, Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "الرئيسية",
    items: [
      { href: "/admin", label: "لوحة التحليلات", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "الكتالوج",
    items: [
      { href: "/admin/products", label: "المنتجات", icon: Package },
      { href: "/admin/categories", label: "الفئات", icon: Tag },
      { href: "/admin/stock", label: "المخزون", icon: Archive },
    ],
  },
  {
    label: "المبيعات",
    items: [
      { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag },
      { href: "/admin/payments", label: "المدفوعات", icon: CreditCard },
      { href: "/admin/customers", label: "العملاء", icon: Users },
      { href: "/admin/coupons", label: "الكوبونات", icon: TicketPercent },
    ],
  },
  {
    label: "التسويق",
    items: [
      { href: "/admin/announcements",  label: "الإعلانات والعروض", icon: Megaphone },
      { href: "/admin/ads",            label: "البنرات الإعلانية", icon: Tag },
      { href: "/admin/popups",         label: "البوب آب",           icon: Bell },
      { href: "/admin/upsells",        label: "عروض Upsell",        icon: TrendingUp },
      { href: "/admin/blog",           label: "المقالات",           icon: BookOpen },
    ],
  },
  {
    label: "المالية",
    items: [
      { href: "/admin/accounting",           label: "لوحة المحاسبة",    icon: Calculator, exact: true },
      { href: "/admin/accounting/expenses",  label: "المصاريف",         icon: TrendingDown },
      { href: "/admin/accounting/invoices",  label: "الفواتير الضريبية", icon: Receipt },
    ],
  },
  {
    label: "الدعم",
    items: [
      { href: "/admin/tickets", label: "تذاكر الدعم", icon: MessageSquare },
    ],
  },
  {
    label: "الإعدادات",
    items: [
      { href: "/admin/payment-methods", label: "طرق الدفع", icon: Wallet },
      { href: "/admin/integrations", label: "التكاملات", icon: Plug },
      { href: "/admin/seo", label: "إعدادات SEO", icon: SearchCheck },
      { href: "/admin/admins", label: "المشرفون", icon: Shield },
      { href: "/admin/logs", label: "سجل النشاطات", icon: FileText },
      { href: "/admin/settings", label: "الإعدادات العامة", icon: Settings },
    ],
  },
];

export function AdminSidebar({ storeName = "المتجر", onNavigate }: { storeName?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside className="flex flex-col h-full w-64">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <SiteLogo size="sm" />
          <div className="min-w-0">
            <p className="font-black text-gray-900 dark:text-white text-sm">لوحة الإدارة</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{storeName}</p>
          </div>
        </div>
      </div>

      {/* Admin Info */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-primary-50 dark:bg-primary-900/20">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {session?.user.name?.charAt(0) || "م"}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-xs truncate">{session?.user.name}</p>
            <p className="text-xs text-primary-600 dark:text-primary-400">{session?.user.role === "ADMIN" ? "مدير عام" : "موظف"}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-bold text-gray-400 dark:text-gray-600 uppercase tracking-wider px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const exact = (item as { exact?: boolean }).exact;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "sidebar-link",
                      isActive(item.href, exact) && "sidebar-link-active"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                    {isActive(item.href, exact) && (
                      <ChevronLeft className="h-3.5 w-3.5 ms-auto text-primary-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
        <Link href="/" onClick={onNavigate} className="sidebar-link">
          <Home className="h-4 w-4 shrink-0" />
          المتجر
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="sidebar-link w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
