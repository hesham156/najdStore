import {
  Archive,
  BookOpen,
  Calculator,
  CreditCard,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  MessageSquare,
  Package,
  Palette,
  Plug,
  Receipt,
  SearchCheck,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Truck,
  Tag,
  TicketPercent,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match the path exactly instead of by prefix. */
  exact?: boolean;
  /** Shown in the command palette / search to help find the page. */
  keywords?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Single source of truth for admin navigation. The shell derives page
 * titles and breadcrumbs from this list, so adding a page here wires up
 * the sidebar, the header title and the quick-jump search at once.
 */
export const navGroups: NavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard, exact: true, keywords: "dashboard home تحليلات" },
    ],
  },
  {
    label: "الكتالوج",
    items: [
      { href: "/admin/products", label: "المنتجات", icon: Package, keywords: "products items" },
      { href: "/admin/categories", label: "الفئات", icon: Tag, keywords: "categories" },
      { href: "/admin/stock", label: "المخزون", icon: Archive, keywords: "stock inventory" },
    ],
  },
  {
    label: "المبيعات",
    items: [
      { href: "/admin/orders", label: "الطلبات", icon: ShoppingBag, keywords: "orders" },
      { href: "/admin/payments", label: "المدفوعات", icon: CreditCard, keywords: "payments" },
      { href: "/admin/customers", label: "العملاء", icon: Users, keywords: "customers users" },
      { href: "/admin/abandoned-carts", label: "السلات المتروكة", icon: ShoppingCart, keywords: "abandoned carts سلات متروكة" },
      { href: "/admin/coupons", label: "الكوبونات", icon: TicketPercent, keywords: "coupons discounts" },
    ],
  },
  {
    label: "التسويق",
    items: [
      { href: "/admin/homepage", label: "تصميم الصفحة الرئيسية", icon: Palette, keywords: "homepage builder design sections الصفحة الرئيسية تصميم" },
      { href: "/admin/announcements", label: "الإعلانات والعروض", icon: Megaphone, keywords: "announcements" },
      { href: "/admin/ads", label: "البنرات الإعلانية", icon: Sparkles, keywords: "ads banners" },
      { href: "/admin/popups", label: "النوافذ المنبثقة", icon: Megaphone, keywords: "popups" },
      { href: "/admin/upsells", label: "عروض Upsell", icon: TrendingUp, keywords: "upsell" },
      { href: "/admin/blog", label: "المقالات", icon: BookOpen, keywords: "blog posts" },
    ],
  },
  {
    label: "المالية",
    items: [
      { href: "/admin/accounting", label: "لوحة المحاسبة", icon: Calculator, exact: true, keywords: "accounting" },
      { href: "/admin/accounting/expenses", label: "المصاريف", icon: TrendingDown, keywords: "expenses" },
      { href: "/admin/accounting/invoices", label: "الفواتير الضريبية", icon: Receipt, keywords: "invoices tax" },
    ],
  },
  {
    label: "الدعم",
    items: [{ href: "/admin/tickets", label: "تذاكر الدعم", icon: MessageSquare, keywords: "tickets support" }],
  },
  {
    label: "الإعدادات",
    items: [
      { href: "/admin/payment-methods", label: "طرق الدفع", icon: Wallet, keywords: "payment methods" },
      { href: "/admin/shipping-rates", label: "رسوم الشحن", icon: Truck, keywords: "shipping rates cities رسوم شحن مدن" },
      { href: "/admin/integrations", label: "التكاملات", icon: Plug, keywords: "integrations" },
      { href: "/admin/seo", label: "إعدادات SEO", icon: SearchCheck, keywords: "seo" },
      { href: "/admin/admins", label: "المشرفون", icon: Shield, keywords: "admins staff" },
      { href: "/admin/logs", label: "سجل النشاطات", icon: FileText, keywords: "logs activity" },
      { href: "/admin/settings", label: "الإعدادات العامة", icon: Settings, keywords: "settings" },
      { href: "/admin/design-system", label: "نظام التصميم", icon: Palette, keywords: "design system ui components tokens" },
    ],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

/** Extra titles for detail/sub pages that have no sidebar entry of their own. */
const EXTRA_TITLES: Record<string, string> = {
  "/admin/products/new": "منتج جديد",
  "/admin/blog/new": "مقال جديد",
  "/admin/blog/categories": "تصنيفات المقالات",
  "/admin/ads/new": "بنر جديد",
};

/** Human page title for the top bar, derived from the nav config. */
export function titleForPath(pathname: string): string {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  const exact = allNavItems.find((i) => i.href === pathname);
  if (exact) return exact.label;
  const prefix = allNavItems
    .filter((i) => i.href !== "/admin" && pathname.startsWith(i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return prefix ? prefix.label : "لوحة الإدارة";
}

/** Breadcrumb trail for a path: لوحة التحكم › section › page. */
export function breadcrumbsForPath(pathname: string): { label: string; href?: string }[] {
  if (pathname === "/admin") return [{ label: "لوحة التحكم" }];
  const item = allNavItems
    .filter((i) => i.href !== "/admin" && pathname.startsWith(i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const trail: { label: string; href?: string }[] = [{ label: "لوحة التحكم", href: "/admin" }];
  if (item) trail.push({ label: item.label, href: item.href === pathname ? undefined : item.href });
  if (EXTRA_TITLES[pathname]) trail.push({ label: EXTRA_TITLES[pathname] });
  return trail;
}
