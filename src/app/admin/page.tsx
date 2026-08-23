import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BadgePercent,
  Boxes,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  MessageSquare,
  Package,
  PackagePlus,
  Plus,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, serializeData } from "@/lib/utils";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Card, Section } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { AdminStats, statColors, type StatItem } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { SalesChart, type SalesPoint } from "@/components/admin/SalesChart";
import { PeriodPicker } from "@/components/admin/PeriodPicker";
import { resolveRange, type RangeKey } from "@/components/admin/period-options";
import { MonthlySummaryCard } from "@/components/admin/MonthlySummaryCard";
import { LastHourVisitsCard } from "@/components/admin/LastHourVisitsCard";

export const dynamic = "force-dynamic";

/** Orders that still need someone to act on them. */
const OPEN_STATUSES = ["PENDING", "PENDING_PAYMENT_REVIEW", "PAYMENT_APPROVED", "PROCESSING"] as const;
const LOW_STOCK_THRESHOLD = 5;

const pctChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

const dayKey = (d: Date) => {
  // Local (Riyadh) calendar day, so buckets line up with what the owner sees.
  const riyadh = new Date(d.getTime() + 3 * 3600_000);
  return riyadh.toISOString().slice(0, 10);
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: { range?: string };
}) {
  const range = resolveRange(searchParams?.range);
  const rangeKey: RangeKey = range.value;
  const days = Number(rangeKey);

  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 86_400_000);
  const prevStart = new Date(now.getTime() - 2 * days * 86_400_000);

  const [
    periodOrders,
    prevOrders,
    newCustomers,
    prevNewCustomers,
    lifetimeRevenue,
    totalOrders,
    totalCustomers,
    totalProducts,
    statusCounts,
    openTickets,
    recentOrders,
    topProducts,
    lowStock,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: periodStart } },
      select: { total: true, createdAt: true, status: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: prevStart, lt: periodStart } },
      select: { total: true, status: true },
    }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: periodStart } } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: prevStart, lt: periodStart } } }),
    prisma.order.aggregate({ where: { status: "DELIVERED" }, _sum: { total: true } }),
    prisma.order.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        payment: { select: { status: true } },
        items: { select: { id: true } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      include: { category: true, _count: { select: { orderItems: true } } },
      orderBy: { orderItems: { _count: "desc" } },
      take: 5,
    }),
    // Low stock is measured from undelivered stock rows, which is the real number.
    (async () => {
      const groups = await prisma.subscriptionStock.groupBy({
        by: ["productId"],
        where: { isDelivered: false },
        _count: { _all: true },
      });
      const available = new Map(groups.map((g) => [g.productId, g._count._all]));
      const autoProducts = await prisma.product.findMany({
        where: { isActive: true, deliveryMethod: "AUTOMATIC" },
        include: { category: true },
        orderBy: { createdAt: "desc" },
      });
      return autoProducts
        .map((p) => ({ ...p, available: available.get(p.id) ?? 0 }))
        .filter((p) => p.available < LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.available - b.available)
        .slice(0, 5);
    })(),
  ]);

  /* ── Period metrics ── */
  const sumTotals = (rows: { total: unknown }[]) =>
    rows.reduce((sum, r) => sum + (parseFloat(String(r.total)) || 0), 0);

  const revenue = sumTotals(periodOrders);
  const prevRevenue = sumTotals(prevOrders);
  const orderCount = periodOrders.length;
  const prevOrderCount = prevOrders.length;
  const aov = orderCount > 0 ? revenue / orderCount : 0;
  const prevAov = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;

  const countByStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all])) as Record<string, number>;
  const newOrders = countByStatus.PENDING ?? 0;
  const awaitingPayment = countByStatus.PENDING_PAYMENT_REVIEW ?? 0;
  const inProgress = (countByStatus.PAYMENT_APPROVED ?? 0) + (countByStatus.PROCESSING ?? 0);
  const openOrders = OPEN_STATUSES.reduce((n, s) => n + (countByStatus[s] ?? 0), 0);

  /* ── Daily series for the chart ── */
  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(dayKey(new Date(now.getTime() - i * 86_400_000)), { revenue: 0, orders: 0 });
  }
  for (const order of periodOrders) {
    const bucket = buckets.get(dayKey(order.createdAt));
    if (!bucket) continue;
    bucket.revenue += parseFloat(String(order.total)) || 0;
    bucket.orders += 1;
  }
  const labelFmt = new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", timeZone: "Asia/Riyadh" });
  const series: SalesPoint[] = Array.from(buckets.entries()).map(([date, v]) => ({
    date,
    label: labelFmt.format(new Date(`${date}T12:00:00Z`)),
    revenue: Math.round(v.revenue * 100) / 100,
    orders: v.orders,
  }));

  const safeRecentOrders = serializeData(recentOrders);
  const safeTopProducts = serializeData(topProducts);
  const safeLowStock = serializeData(lowStock);

  const kpis: StatItem[] = [
    {
      label: "المبيعات",
      value: formatCurrency(revenue),
      icon: DollarSign,
      color: statColors.primary,
      delta: pctChange(revenue, prevRevenue),
      deltaLabel: range.compareLabel,
    },
    {
      label: "الطلبات",
      value: orderCount,
      icon: ShoppingBag,
      color: statColors.blue,
      delta: pctChange(orderCount, prevOrderCount),
      deltaLabel: range.compareLabel,
      href: "/admin/orders",
    },
    {
      label: "متوسط قيمة الطلب",
      value: formatCurrency(aov),
      icon: Receipt,
      color: statColors.amber,
      delta: pctChange(aov, prevAov),
      deltaLabel: range.compareLabel,
    },
    {
      label: "عملاء جدد",
      value: newCustomers,
      icon: Users,
      color: statColors.green,
      delta: pctChange(newCustomers, prevNewCustomers),
      deltaLabel: range.compareLabel,
      href: "/admin/customers",
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="لوحة التحكم"
        description={`نظرة على أداء المتجر خلال ${range.label}`}
        actions={
          <>
            <PeriodPicker value={rangeKey} />
            <Link
              href="/admin/products/new"
              className="inline-flex h-10 items-center gap-2 rounded-control bg-primary-600 px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-primary-700"
            >
              <Plus className="h-4 w-4" aria-hidden />
              منتج جديد
            </Link>
          </>
        }
      />

      <AdminStats items={kpis} />

      {/* ── Salla-style monthly summary + live visits ── */}
      <MonthlySummaryCard />
      <LastHourVisitsCard />

      {/* ── Needs attention ── */}
      <section aria-labelledby="attention-heading" className="space-y-3">
        <h2 id="attention-heading" className="text-[13px] font-bold text-fg-muted">
          يحتاج إلى إجراء
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ActionTile
            href="/admin/orders"
            icon={Clock}
            value={newOrders}
            label="طلبات جديدة"
            tone={newOrders > 0 ? "amber" : "muted"}
          />
          <ActionTile
            href="/admin/payments"
            icon={CreditCard}
            value={awaitingPayment}
            label="بانتظار مراجعة الدفع"
            tone={awaitingPayment > 0 ? "blue" : "muted"}
          />
          <ActionTile
            href="/admin/stock"
            icon={Boxes}
            value={safeLowStock.length}
            label="منتجات مخزونها منخفض"
            tone={safeLowStock.length > 0 ? "red" : "muted"}
          />
          <ActionTile
            href="/admin/tickets"
            icon={MessageSquare}
            value={openTickets}
            label="تذاكر دعم مفتوحة"
            tone={openTickets > 0 ? "purple" : "muted"}
          />
        </div>
      </section>

      {/* ── Chart + top products ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Section
          className="xl:col-span-2"
          title="تحليل المبيعات"
          description={`الإيرادات وعدد الطلبات خلال ${range.label}`}
        >
          <SalesChart data={series} emptyHint="ستظهر المبيعات هنا فور تسجيل أول طلب في هذه الفترة." />
        </Section>

        <Section
          title="الأكثر مبيعاً"
          description="المنتجات الأعلى طلباً على الإطلاق"
          action={
            <Link href="/admin/products" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
              عرض الكل
            </Link>
          }
          contentClassName="pt-0"
        >
          {safeTopProducts.length === 0 ? (
            <EmptyState
              size="sm"
              icon={TrendingUp}
              title="لا توجد مبيعات بعد"
              description="بمجرد وصول أول طلب ستظهر المنتجات الأكثر مبيعاً هنا."
            />
          ) : (
            <ol className="space-y-1">
              {safeTopProducts.map((product, i) => (
                <li key={product.id}>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-hover"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        i === 0
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                          : i === 1
                            ? "bg-surface-sunken text-fg-muted"
                            : i === 2
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
                              : "bg-surface-sunken text-fg-subtle"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-fg">{product.nameAr}</span>
                      <span className="block truncate text-[11px] text-fg-muted">{product.category?.nameAr}</span>
                    </span>
                    <span className="shrink-0 text-xs font-bold tnum text-primary-600 dark:text-primary-400">
                      {product._count?.orderItems ?? 0}
                      <span className="ms-1 font-normal text-fg-subtle">مبيعة</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>

      {/* ── Latest orders + low stock ── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Section
          className="xl:col-span-2"
          title="آخر الطلبات"
          description={`${openOrders} طلب مفتوح من إجمالي ${totalOrders}`}
          action={
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
            >
              عرض كل الطلبات
              <ArrowLeft className="h-3 w-3 rtl:rotate-0 ltr:rotate-180" aria-hidden />
            </Link>
          }
          contentClassName="px-0 pb-0"
        >
          {safeRecentOrders.length === 0 ? (
            <EmptyState
              size="sm"
              icon={ShoppingBag}
              title="لا توجد طلبات بعد"
              description="ستظهر الطلبات الجديدة هنا فور وصولها من المتجر."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-line bg-surface-muted">
                    {["رقم الطلب", "العميل", "المبلغ", "الحالة", "التاريخ"].map((h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className={`whitespace-nowrap px-5 py-2 text-start text-[11px] font-bold uppercase tracking-wide text-fg-muted ${
                          i > 2 ? "hidden sm:table-cell" : ""
                        }`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {safeRecentOrders.map((order) => {
                    const { variant, label } = getStatusBadge(order.status);
                    return (
                      <tr key={order.id} className="border-b border-line last:border-0 hover:bg-surface-hover">
                        <td className="px-5 py-2.5">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-mono text-xs font-bold text-primary-600 hover:underline dark:text-primary-400"
                          >
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="max-w-[12rem] truncate px-5 py-2.5 text-[13px] text-fg">{order.user?.name}</td>
                        <td className="whitespace-nowrap px-5 py-2.5 text-[13px] font-bold tnum text-fg">
                          {formatCurrency(parseFloat(String(order.total)))}
                        </td>
                        <td className="hidden px-5 py-2.5 sm:table-cell">
                          <Badge variant={variant}>{label}</Badge>
                        </td>
                        <td className="hidden whitespace-nowrap px-5 py-2.5 text-xs text-fg-muted sm:table-cell">
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <div className="space-y-5">
          <Section
            title="تنبيه المخزون"
            description={`أقل من ${LOW_STOCK_THRESHOLD} اشتراكات متاحة`}
            action={
              <Link href="/admin/stock" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400">
                إدارة
              </Link>
            }
            contentClassName="pt-0"
          >
            {safeLowStock.length === 0 ? (
              <EmptyState
                size="sm"
                icon={CheckCircle2}
                title="المخزون بحالة جيدة"
                description="جميع المنتجات التلقائية لديها رصيد كافٍ."
              />
            ) : (
              <ul className="space-y-2">
                {safeLowStock.map((product) => (
                  <li key={product.id}>
                    <Link
                      href="/admin/stock"
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                        product.available === 0
                          ? "border-red-200 bg-red-50 hover:bg-red-100/70 dark:border-red-500/25 dark:bg-red-500/10 dark:hover:bg-red-500/15"
                          : "border-amber-200 bg-amber-50 hover:bg-amber-100/70 dark:border-amber-500/25 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                      }`}
                    >
                      <AlertTriangle
                        className={`h-4 w-4 shrink-0 ${
                          product.available === 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400"
                        }`}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-fg">{product.nameAr}</span>
                        <span className="block truncate text-[11px] text-fg-muted">{product.category?.nameAr}</span>
                      </span>
                      <span
                        className={`shrink-0 text-sm font-bold tnum ${
                          product.available === 0 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {product.available}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="إجراءات سريعة" contentClassName="pt-0">
            <div className="grid grid-cols-2 gap-2">
              <QuickAction href="/admin/products/new" icon={Plus} label="منتج جديد" />
              <QuickAction href="/admin/stock" icon={PackagePlus} label="إضافة مخزون" />
              <QuickAction href="/admin/coupons" icon={BadgePercent} label="كوبون خصم" />
              <QuickAction href="/admin/accounting" icon={Receipt} label="التقارير المالية" />
            </div>
          </Section>

          <Card className="space-y-2.5">
            <p className="text-[13px] font-bold text-fg">إجمالي المتجر</p>
            <dl className="space-y-2 text-[13px]">
              <SummaryRow icon={DollarSign} label="إيرادات مكتملة" value={formatCurrency(parseFloat(String(lifetimeRevenue._sum.total || 0)))} />
              <SummaryRow icon={ShoppingBag} label="إجمالي الطلبات" value={totalOrders} />
              <SummaryRow icon={Users} label="إجمالي العملاء" value={totalCustomers} />
              <SummaryRow icon={Package} label="منتجات نشطة" value={totalProducts} />
              <SummaryRow icon={Clock} label="طلبات قيد التنفيذ" value={inProgress} />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ── Small building blocks ─────────────────────────────────── */

const TILE_TONES = {
  amber: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-400",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-400",
  purple: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-400",
  muted: "border-line bg-surface text-fg-subtle",
} as const;

function ActionTile({
  href,
  icon: Icon,
  value,
  label,
  tone,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  tone: keyof typeof TILE_TONES;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-card border px-4 py-3 shadow-card transition-shadow hover:shadow-card-hover ${TILE_TONES[tone]}`}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-tight tnum">{value}</span>
        <span className="block truncate text-[11px] font-medium text-fg-muted">{label}</span>
      </span>
    </Link>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface-muted px-3 py-3 text-center transition-colors hover:border-primary-300 hover:bg-primary-50 dark:hover:border-primary-500/30 dark:hover:bg-primary-500/10"
    >
      <Icon className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden />
      <span className="text-[11px] font-medium text-fg">{label}</span>
    </Link>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-fg-muted">
        <Icon className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
        {label}
      </dt>
      <dd className="font-semibold tnum text-fg">{value}</dd>
    </div>
  );
}
