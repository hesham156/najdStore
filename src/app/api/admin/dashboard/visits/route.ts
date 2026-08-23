import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** "Visits in the last hour" — page views grouped by path, most-visited first. */
export async function GET() {
  if (!(await requireAdmin())) return unauthorized();

  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const rows = await prisma.pageVisit.findMany({
      where: { createdAt: { gte: hourAgo } },
      select: { path: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 3000,
    });

    const map = new Map<string, { path: string; title: string; count: number }>();
    for (const r of rows) {
      const key = r.path;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.title && r.title) existing.title = r.title;
      } else {
        map.set(key, { path: r.path, title: r.title || r.path, count: 1 });
      }
    }

    const items = Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return NextResponse.json({ success: true, data: { total: rows.length, items } });
  } catch (err) {
    return serverError("GET /api/admin/dashboard/visits", err);
  }
}
