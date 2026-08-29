import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

interface Point { label: string; sales: number; orders: number; date: string }

// Store operates in KSA time (UTC+3, no DST). Bucketing/boundaries use this
// offset so days and hours match the merchant's local calendar.
const KSA_OFFSET_MS = 3 * 60 * 60 * 1000;
/** A Date whose UTC fields read as KSA wall-clock time. */
const toKsa = (d: Date) => new Date(d.getTime() + KSA_OFFSET_MS);
/** Build a real UTC instant from KSA wall-clock components. */
const fromKsa = (y: number, m: number, day: number, h = 0) =>
  new Date(Date.UTC(y, m, day, h) - KSA_OFFSET_MS);

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();

  try {
    const range = new URL(req.url).searchParams.get("range") === "daily" ? "daily" : "monthly";
    const nowKsa = toKsa(new Date());
    const y = nowKsa.getUTCFullYear();
    const mo = nowKsa.getUTCMonth();

    let periodStart: Date;
    let periodEnd: Date;
    const series: Point[] = [];

    if (range === "daily") {
      // Today (KSA), bucketed by hour (0–23)
      const day = nowKsa.getUTCDate();
      periodStart = fromKsa(y, mo, day);
      periodEnd = fromKsa(y, mo, day + 1);
      for (let h = 0; h < 24; h++) {
        series.push({ label: `${h}`, sales: 0, orders: 0, date: `${h}:00` });
      }
    } else {
      // Current month (KSA), bucketed by day
      periodStart = fromKsa(y, mo, 1);
      periodEnd = fromKsa(y, mo + 1, 1);
      const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      for (let d = 1; d <= daysInMonth; d++) {
        series.push({ label: `${d}`, sales: 0, orders: 0, date: `${d}` });
      }
    }

    const [orders, visits, goal] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: periodStart, lt: periodEnd } },
        select: { createdAt: true, status: true, total: true },
      }),
      // Unique visitors in the period (dedup by stable visitorId), not raw
      // page-views — the same browser revisiting must not inflate the count.
      (async () => {
        const rows = await prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(DISTINCT COALESCE("visitorId", "id")) AS count
          FROM page_visits
          WHERE "createdAt" >= ${periodStart} AND "createdAt" < ${periodEnd}
        `;
        return Number(rows[0]?.count ?? 0);
      })(),
      prisma.storeGoal.findUnique({
        where: { month: `${y}-${String(mo + 1).padStart(2, "0")}` },
      }),
    ]);

    let netSales = 0;
    for (const o of orders) {
      const ksa = toKsa(o.createdAt);
      const bucket = range === "daily" ? ksa.getUTCHours() : ksa.getUTCDate() - 1;
      if (series[bucket]) {
        series[bucket].orders += 1;
        if (o.status === "DELIVERED") {
          const t = Number(o.total);
          series[bucket].sales += t;
        }
      }
      if (o.status === "DELIVERED") netSales += Number(o.total);
    }

    const target = goal ? Number(goal.target) : null;

    return NextResponse.json({
      success: true,
      data: {
        range,
        month: mo + 1,
        year: y,
        series,
        totals: { visits, orders: orders.length, netSales },
        goal: target !== null ? { target, progress: target > 0 ? Math.min(1, netSales / target) : 0 } : null,
      },
    });
  } catch (err) {
    return serverError("GET /api/admin/dashboard/summary", err);
  }
}
