import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";
import { PAID_STATUSES } from "@/lib/orders";

export const dynamic = "force-dynamic";

// KSA month boundaries (UTC+3) so figures match the merchant's calendar.
const KSA = 3 * 60 * 60 * 1000;
function monthStartKsa(): Date {
  const now = new Date(Date.now() + KSA);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - KSA);
}

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();

  try {
    const monthStart = monthStartKsa();

    const [
      totalCustomers,
      newCustomers,
      ordersByUser,
      deliveredAgg,
      visits,
      activeCarts,
      ordersThisMonth,
      paidThisMonth,
      recentOrders,
      recentCustomers,
      recentPayments,
      recentTickets,
      recentCarts,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: monthStart } } }),
      // spend + order count per customer (all-time)
      prisma.order.groupBy({ by: ["userId"], _sum: { total: true }, _count: { _all: true } }),
      // revenue basis = delivered orders
      prisma.order.aggregate({ where: { status: "DELIVERED" }, _sum: { total: true }, _count: { _all: true } }),
      prisma.pageVisit.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.abandonedCart.count({ where: { status: "ACTIVE", itemCount: { gt: 0 } } }),
      prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.order.count({ where: { createdAt: { gte: monthStart }, status: { in: [...PAID_STATUSES] as never } } }),
      prisma.order.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }),
      prisma.user.findMany({ where: { role: "CUSTOMER" }, take: 5, orderBy: { createdAt: "desc" }, select: { id: true, name: true, createdAt: true } }),
      prisma.payment.findMany({ where: { status: "APPROVED" }, take: 5, orderBy: { updatedAt: "desc" }, include: { order: { select: { orderNumber: true, id: true } } } }),
      prisma.supportTicket.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }),
      prisma.abandonedCart.findMany({ where: { status: "ACTIVE", itemCount: { gt: 0 } }, take: 5, orderBy: { updatedAt: "desc" }, select: { id: true, customerName: true, total: true, updatedAt: true } }),
    ]);

    // ── Customer insights ──
    const payingCustomers = ordersByUser.length;
    const returningCustomers = ordersByUser.filter((o) => o._count._all >= 2).length;
    const repeatRate = payingCustomers > 0 ? Math.round((returningCustomers / payingCustomers) * 100) : 0;
    const deliveredCount = deliveredAgg._count._all || 0;
    const deliveredRevenue = Number(deliveredAgg._sum.total || 0);
    const aov = deliveredCount > 0 ? deliveredRevenue / deliveredCount : 0;
    const totalCustomerSpend = ordersByUser.reduce((s, o) => s + Number(o._sum.total || 0), 0);
    const clv = payingCustomers > 0 ? totalCustomerSpend / payingCustomers : 0;

    // ── Top customers (by lifetime spend) ──
    const topRanked = [...ordersByUser]
      .sort((a, b) => Number(b._sum.total || 0) - Number(a._sum.total || 0))
      .slice(0, 6);
    const topUsers = await prisma.user.findMany({
      where: { id: { in: topRanked.map((t) => t.userId) } },
      select: { id: true, name: true, email: true },
    });
    const topMap = new Map(topUsers.map((u) => [u.id, u]));
    const topCustomers = topRanked.map((t) => ({
      id: t.userId,
      name: topMap.get(t.userId)?.name || "—",
      email: topMap.get(t.userId)?.email || "",
      orders: t._count._all,
      spent: Number(t._sum.total || 0),
    }));

    // ── Funnel (this month) ──
    const funnel = {
      visits,
      carts: activeCarts + ordersThisMonth,
      orders: ordersThisMonth,
      paid: paidThisMonth,
    };

    // ── Unified activity feed ──
    type Act = { type: string; title: string; subtitle: string; at: string; href?: string };
    const activity: Act[] = [];
    for (const o of recentOrders) activity.push({ type: "order", title: `طلب جديد ${o.orderNumber}`, subtitle: `${o.user?.name || "عميل"} — ${Number(o.total).toFixed(2)} ر.س`, at: o.createdAt.toISOString(), href: `/admin/orders/${o.id}` });
    for (const c of recentCustomers) activity.push({ type: "customer", title: "عميل جديد", subtitle: c.name, at: c.createdAt.toISOString(), href: `/admin/customers/${c.id}` });
    for (const p of recentPayments) activity.push({ type: "payment", title: "دفعة مقبولة", subtitle: `طلب ${p.order?.orderNumber || ""} — ${Number(p.amount).toFixed(2)} ر.س`, at: (p.reviewedAt || p.updatedAt).toISOString(), href: p.order ? `/admin/orders/${p.order.id}` : undefined });
    for (const t of recentTickets) activity.push({ type: "ticket", title: `تذكرة دعم ${t.ticketNumber}`, subtitle: `${t.user?.name || ""} — ${t.subject}`, at: t.createdAt.toISOString(), href: `/admin/tickets/${t.id}` });
    for (const c of recentCarts) activity.push({ type: "cart", title: "سلة متروكة", subtitle: `${c.customerName || "زائر"} — ${Number(c.total).toFixed(2)} ر.س`, at: c.updatedAt.toISOString(), href: `/admin/abandoned-carts` });
    activity.sort((a, b) => +new Date(b.at) - +new Date(a.at));

    return NextResponse.json({
      success: true,
      data: {
        insights: {
          totalCustomers,
          newCustomers,
          payingCustomers,
          returningCustomers,
          repeatRate,
          aov,
          clv,
        },
        topCustomers,
        funnel,
        activity: activity.slice(0, 14),
      },
    });
  } catch (err) {
    return serverError("GET /api/admin/dashboard/crm", err);
  }
}
