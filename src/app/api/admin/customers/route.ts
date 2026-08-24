import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";
import { PAID_STATUSES } from "@/lib/orders";

export const dynamic = "force-dynamic";

const ROW_SELECT = {
  id: true, name: true, email: true, phone: true, isActive: true, role: true, createdAt: true,
  _count: { select: { orders: true } },
} satisfies Prisma.UserSelect;

type Row = Prisma.UserGetPayload<{ select: typeof ROW_SELECT }>;

const SORT_KEYS = ["name", "orders", "totalSpent", "createdAt", "lastOrderAt"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Accepts `YYYY-MM-DD` from a date input; anything else is ignored. */
function parseDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
type SortKey = (typeof SORT_KEYS)[number];

/** Newest order date per user, as a plain `userId -> date` map. */
async function lastOrderByUser(userIds: string[]) {
  const grouped = await prisma.order.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _max: { createdAt: true },
  });
  return new Map(grouped.map((g) => [g.userId, g._max.createdAt]));
}

/** Sums paid orders per user, as a plain `userId -> amount` map. */
async function spendByUser(userIds?: string[]) {
  const grouped = await prisma.order.groupBy({
    by: ["userId"],
    where: {
      status: { in: PAID_STATUSES },
      ...(userIds ? { userId: { in: userIds } } : { user: { role: "CUSTOMER" } }),
    },
    _sum: { total: true },
  });
  return new Map(grouped.map((g) => [g.userId, Number(g._sum.total ?? 0)]));
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "all";
    const sort = (SORT_KEYS as readonly string[]).includes(searchParams.get("sort") || "")
      ? (searchParams.get("sort") as SortKey)
      : "createdAt";
    const dir: Prisma.SortOrder = searchParams.get("dir") === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10) || 10));

    // Search matches the three fields the input's placeholder promises.
    const searchWhere: Prisma.UserWhereInput = { role: "CUSTOMER" };
    if (search) {
      searchWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Registration window. `to` covers the whole day the merchant picked.
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    if (from || to) {
      searchWhere.createdAt = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: new Date(to.getTime() + DAY_MS - 1) } : {}),
      };
    }

    // The status tab narrows the table only; the tab counts and the KPI row
    // both describe the search result as a whole, which is what their
    // labels claim.
    const statusWhere: Prisma.UserWhereInput = { ...searchWhere };
    if (status === "active") statusWhere.isActive = true;
    else if (status === "inactive") statusWhere.isActive = false;
    else if (status === "buyers") statusWhere.orders = { some: {} };

    const [all, active, buyers, spentAgg, total] = await Promise.all([
      prisma.user.count({ where: searchWhere }),
      prisma.user.count({ where: { ...searchWhere, isActive: true } }),
      prisma.user.count({ where: { ...searchWhere, orders: { some: {} } } }),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { in: PAID_STATUSES }, user: searchWhere },
      }),
      prisma.user.count({ where: statusWhere }),
    ]);

    let rows: Row[];
    let spend: Map<string, number> | null = null;

    // Spend and last-order-date both live in the orders table as aggregates,
    // and Prisma cannot `orderBy` those. Rank the matching ids in memory, then
    // read back only the rows for this page — ids are loaded, never whole rows.
    if (sort === "totalSpent" || sort === "lastOrderAt") {
      const ids = (
        await prisma.user.findMany({ where: statusWhere, select: { id: true }, orderBy: { id: "asc" } })
      ).map((u) => u.id);

      let rank: Map<string, number>;
      if (sort === "totalSpent") {
        spend = await spendByUser(ids);
        rank = spend;
      } else {
        const dates = await lastOrderByUser(ids);
        // Never-ordered customers rank below everyone with a real date.
        rank = new Map();
        dates.forEach((d, id) => rank.set(id, d ? d.getTime() : 0));
      }

      // Ranked from a fixed base order, and `Array#sort` is stable, so ties keep
      // a fixed position — otherwise page 2 could repeat or skip a row page 1
      // already showed.
      const ordered = ids
        .sort((a, b) => {
          const diff = (rank.get(a) ?? 0) - (rank.get(b) ?? 0);
          return dir === "asc" ? diff : -diff;
        })
        .slice((page - 1) * pageSize, page * pageSize);

      const found = await prisma.user.findMany({ where: { id: { in: ordered } }, select: ROW_SELECT });
      const byId = new Map(found.map((u) => [u.id, u]));
      rows = ordered.map((id) => byId.get(id)).filter((u): u is Row => Boolean(u));
    } else {
      const orderBy: Prisma.UserOrderByWithRelationInput =
        sort === "name" ? { name: dir }
        : sort === "orders" ? { orders: { _count: dir } }
        : { createdAt: dir };

      rows = await prisma.user.findMany({
        where: statusWhere,
        select: ROW_SELECT,
        // `id` breaks ties so paging is deterministic; without it two customers
        // with the same name or timestamp can shift between pages.
        orderBy: [orderBy, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
    }

    // Sorting by spend already built the full map; otherwise only this page's
    // customers need a figure attached.
    const ids = rows.map((r) => r.id);
    const [pageSpend, lastOrders] = await Promise.all([
      spend ? Promise.resolve(spend) : spendByUser(ids),
      lastOrderByUser(ids),
    ]);

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        ...r,
        totalSpent: pageSpend.get(r.id) ?? 0,
        lastOrderAt: lastOrders.get(r.id) ?? null,
      })),
      total,
      page,
      pageSize,
      counts: { all, active, inactive: all - active, buyers },
      stats: { total: all, active, withOrders: buyers, spent: Number(spentAgg._sum.total ?? 0) },
    });
  } catch (err) {
    return serverError("GET /api/admin/customers", err);
  }
}
