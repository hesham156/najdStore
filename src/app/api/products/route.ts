import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeData } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const featured = searchParams.get("featured");
    // Clamp so a crafted `limit`/`page` can't trigger a huge scan or a NaN that
    // Prisma rejects with a 500.
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

    const where: Record<string, unknown> = { isActive: true };

    if (search) {
      where.OR = [
        { nameAr: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category) where.category = { slug: category };
    if (featured === "true") where.isFeatured = true;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { sortOrder: "asc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.product.count({ where }),
    ]);

    const res = NextResponse.json({
      success: true,
      data: serializeData(products),
      total,
      page,
    });

    // Cache non-search requests for 60 seconds
    if (!search) {
      res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    }

    return res;
  } catch {
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
