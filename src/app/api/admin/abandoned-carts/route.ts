import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** List abandoned (non-converted) carts, newest activity first. */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    // Optional: only carts idle for at least N minutes (truly abandoned).
    const minAge = parseInt(searchParams.get("minAgeMinutes") || "0", 10);

    const where: Record<string, unknown> = { status: "ACTIVE", itemCount: { gt: 0 } };
    if (minAge > 0) {
      where.updatedAt = { lte: new Date(Date.now() - minAge * 60 * 1000) };
    }

    const carts = await prisma.abandonedCart.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const totalValue = carts.reduce((s, c) => s + Number(c.total), 0);

    return NextResponse.json({ success: true, data: carts, meta: { count: carts.length, totalValue } });
  } catch (err) {
    return serverError("GET /api/admin/abandoned-carts", err);
  }
}
