import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized } from "@/lib/api";
import { PAID_STATUSES } from "@/lib/orders";

export const dynamic = "force-dynamic";

function startOf(period: string, now: Date) {
  const d = new Date(now);
  if (period === "month") { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
  if (period === "quarter") {
    const q = Math.floor(d.getMonth() / 3);
    d.setMonth(q * 3, 1); d.setHours(0, 0, 0, 0); return d;
  }
  if (period === "year") { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d; }
  return new Date(0);
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return unauthorized();

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "month"; // month | quarter | year | all
  const now = new Date();
  const from = startOf(period, now);

  const dateFilter = period === "all" ? {} : { gte: from };

  // Revenue = orders that are PAYMENT_APPROVED, PROCESSING, or DELIVERED
  const revenueOrders = await prisma.order.aggregate({
    where: {
      status: { in: PAID_STATUSES },
      createdAt: dateFilter,
    },
    _sum: { total: true, discount: true },
    _count: { id: true },
  });

  // Refunds
  const refundOrders = await prisma.order.aggregate({
    where: { status: "REFUNDED", createdAt: dateFilter },
    _sum: { total: true },
  });

  // Expenses
  const expensesAgg = await prisma.expense.aggregate({
    where: { date: dateFilter },
    _sum: { amount: true },
  });

  // Expenses by category
  const expensesByCategory = await prisma.expense.groupBy({
    by: ["category"],
    where: { date: dateFilter },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  // Monthly revenue for chart (last 12 months)
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const monthlyOrders = await prisma.order.findMany({
    where: {
      status: { in: PAID_STATUSES },
      createdAt: { gte: twelveMonthsAgo },
    },
    select: { total: true, createdAt: true },
  });

  const monthlyExpenses = await prisma.expense.findMany({
    where: { date: { gte: twelveMonthsAgo } },
    select: { amount: true, date: true },
  });

  // Group by YYYY-MM
  const monthMap: Record<string, { revenue: number; expenses: number }> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = { revenue: 0, expenses: 0 };
  }
  for (const o of monthlyOrders) {
    const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap[key]) monthMap[key].revenue += Number(o.total);
  }
  for (const e of monthlyExpenses) {
    const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap[key]) monthMap[key].expenses += Number(e.amount);
  }

  const revenue    = Number(revenueOrders._sum.total ?? 0);
  const discounts  = Number(revenueOrders._sum.discount ?? 0);
  const refunds    = Number(refundOrders._sum.total ?? 0);
  const expenses   = Number(expensesAgg._sum.amount ?? 0);
  const taxSetting = await prisma.setting.findUnique({ where: { key: "tax_rate" } });
  const taxRate    = parseFloat(taxSetting?.value ?? "15");
  // Tax included in price: tax = total * rate / (100 + rate)
  const taxAmount  = revenue * taxRate / (100 + taxRate);
  const netRevenue = revenue - refunds;
  const profit     = netRevenue - taxAmount - expenses;

  return NextResponse.json({
    success: true,
    data: {
      revenue,
      discounts,
      refunds,
      expenses,
      taxAmount,
      taxRate,
      profit,
      orderCount: revenueOrders._count.id,
      expensesByCategory,
      monthlyChart: Object.entries(monthMap).map(([month, v]) => ({ month, ...v })),
    },
  });
}
