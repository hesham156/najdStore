"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X, ExternalLink } from "lucide-react";
import { AdminSidebar } from "./AdminSidebar";

/** Human page title from the current admin path (for the top bar). */
const TITLES: Record<string, string> = {
  "/admin": "لوحة التحليلات",
  "/admin/products": "المنتجات",
  "/admin/categories": "الفئات",
  "/admin/stock": "المخزون",
  "/admin/coupons": "الكوبونات",
  "/admin/announcements": "الإعلانات والعروض",
  "/admin/ads": "البنرات الإعلانية",
  "/admin/popups": "البوب آب",
  "/admin/upsells": "عروض Upsell",
  "/admin/orders": "الطلبات",
  "/admin/payments": "المدفوعات",
  "/admin/payment-methods": "طرق الدفع",
  "/admin/customers": "العملاء",
  "/admin/blog": "المقالات",
  "/admin/accounting": "المحاسبة",
  "/admin/tickets": "تذاكر الدعم",
  "/admin/admins": "المشرفون",
  "/admin/logs": "سجل النشاطات",
  "/admin/seo": "إعدادات SEO",
  "/admin/integrations": "التكاملات",
  "/admin/settings": "الإعدادات",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  // longest matching prefix
  const match = Object.keys(TITLES)
    .filter((k) => k !== "/admin" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? TITLES[match] : "لوحة الإدارة";
}

export function AdminShell({ children, storeName }: { children: React.ReactNode; storeName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the mobile drawer whenever the route changes
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0 border-e border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-screen sticky top-0">
        <AdminSidebar storeName={storeName} />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-64 max-w-[85%] bg-white dark:bg-gray-900 shadow-2xl animate-drawer flex">
            <button
              onClick={() => setOpen(false)}
              className="absolute -end-11 top-3 w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center text-gray-600 dark:text-gray-300"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
            <AdminSidebar storeName={storeName} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 h-14 px-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur">
          <button
            onClick={() => setOpen(true)}
            className="lg:hidden p-2 -ms-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="القائمة"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">{titleFor(pathname)}</h1>
          <Link
            href="/"
            target="_blank"
            className="ms-auto inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">عرض المتجر</span>
          </Link>
        </header>

        <main className="p-4 sm:p-6 max-w-full">{children}</main>
      </div>
    </div>
  );
}
