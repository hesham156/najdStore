import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag, MessageSquare, Bell, ArrowLeft, CheckCircle, User, HeadphonesIcon, Tag, Package } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import AdBanner from "@/components/store/AdBanner";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [orders, unreadNotifications, openTickets, featuredProducts] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id },
      include: { items: { include: { product: true } }, payment: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, isRead: false },
    }),
    prisma.supportTicket.count({
      where: { userId: session.user.id, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      include: { category: true },
      orderBy: { sortOrder: "asc" },
      take: 3,
    }),
  ]);

  const totalSpent = orders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + parseFloat(String(o.total)), 0);

  const quickActions = [
    { icon: ShoppingBag, label: "طلباتي", desc: "تتبع طلباتك الحالية", href: "/dashboard/orders", color: "bg-info/10 text-info" },
    { icon: Package, label: "اشتراكاتي", desc: "إدارة اشتراكاتك النشطة", href: "/dashboard/subscriptions", color: "bg-success/10 text-success" },
    { icon: HeadphonesIcon, label: "الدعم الفني", desc: "تواصل مع فريق الدعم", href: "/dashboard/tickets", color: "bg-brand/10 text-brand" },
    { icon: Tag, label: "العروض", desc: "تصفح أحدث العروض", href: "/products", color: "bg-warning/10 text-warning" },
    { icon: Bell, label: "الإشعارات", desc: `${unreadNotifications} غير مقروء`, href: "/dashboard/notifications", color: "bg-danger/10 text-danger" },
    { icon: User, label: "الملف الشخصي", desc: "تحديث بياناتك", href: "/dashboard/profile", color: "bg-surface-sunken text-fg-muted" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="bg-gradient-to-l from-primary-600 to-primary-800 rounded-2xl p-6 text-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black mb-1">مرحباً، {session.user.name.split(" ")[0]} 👋</h1>
          <p className="text-white/70 text-sm">هذه نظرة عامة على حسابك</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-white/80 text-sm">
          <div className="text-center">
            <p className="text-2xl font-black text-white">{orders.length}</p>
            <p className="text-xs">طلب</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center">
            <p className="text-2xl font-black text-white">{formatCurrency(totalSpent)}</p>
            <p className="text-xs">إجمالي الإنفاق</p>
          </div>
        </div>
      </div>

      {/* Ads Banners */}
      <div className="-mx-4 sm:mx-0">
        <AdBanner placement="DASHBOARD_MAIN" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: ShoppingBag, label: "إجمالي الطلبات", value: orders.length, color: "text-info bg-info/10", href: "/dashboard/orders" },
          { icon: CheckCircle, label: "طلبات مكتملة", value: orders.filter(o => o.status === "DELIVERED").length, color: "text-success bg-success/10", href: "/dashboard/orders" },
          { icon: Bell, label: "إشعارات غير مقروءة", value: unreadNotifications, color: "text-warning bg-warning/10", href: "/dashboard/notifications" },
          { icon: MessageSquare, label: "تذاكر مفتوحة", value: openTickets, color: "text-brand bg-brand/10", href: "/dashboard/tickets" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card hover className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color} shrink-0`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-black text-fg">{stat.value}</p>
                <p className="text-xs text-fg-subtle leading-tight">{stat.label}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Left: Recent Orders ── */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-fg">آخر الطلبات</h2>
            <Link href="/dashboard/orders" className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:gap-2 transition-all font-medium">
              عرض الكل <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>

          {orders.length === 0 ? (
            <Card className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-fg-subtle mx-auto mb-3" />
              <p className="font-semibold text-fg-muted">لا توجد طلبات بعد</p>
              <p className="text-sm text-fg-subtle mt-1">ابدأ رحلتك الرقمية الآن</p>
              <Link href="/products" className="btn-primary inline-flex mt-4 text-sm">تصفح المنتجات</Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const { variant, label } = getStatusBadge(order.status);
                return (
                  <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                    <Card hover className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                          <ShoppingBag className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-fg text-sm">{order.orderNumber}</p>
                          <p className="text-xs text-fg-subtle">{order.items.length} منتج • {formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant={variant}>{label}</Badge>
                        <span className="font-bold text-fg text-sm">{formatCurrency(parseFloat(String(order.total)))}</span>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Featured products (only when no orders or as extra content) */}
          {featuredProducts.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-fg">منتجات مميزة</h2>
                <Link href="/products" className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">عرض الكل</Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {featuredProducts.map((p) => (
                  <Link key={p.id} href={`/products/${p.slug}`}>
                    <Card hover className="flex items-center gap-3 p-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0 text-lg overflow-hidden">
                        {p.image ? <img src={p.image} alt={p.nameAr} className="w-full h-full object-cover rounded-lg" /> : <span>{p.category.icon || "📦"}</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-fg line-clamp-1">{p.nameAr}</p>
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-bold mt-0.5">{formatCurrency(parseFloat(String(p.price)))}</p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Quick Actions ── */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-fg">إجراءات سريعة</h2>
          <div className="grid grid-cols-2 xl:grid-cols-1 gap-3">
            {quickActions.map((action) => (
              <Link key={action.label} href={action.href}>
                <Card hover className="flex items-center gap-3 p-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${action.color}`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-fg">{action.label}</p>
                    <p className="text-xs text-fg-subtle truncate">{action.desc}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
