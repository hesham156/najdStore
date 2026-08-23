import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Public — active per-city shipping rates for the checkout city selector. */
export async function GET() {
  try {
    const rates = await prisma.shippingRate.findMany({
      where: { isActive: true },
      select: { city: true, cost: true },
      orderBy: [{ sortOrder: "asc" }, { city: "asc" }],
    });
    return NextResponse.json(
      { success: true, data: rates.map((r) => ({ city: r.city, cost: Number(r.cost) })) },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } },
    );
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
