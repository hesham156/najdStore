import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return unauthorized();

  const [categories, archived] = await Promise.all([
    prisma.category.findMany({
      // Only products the merchant can actually see. Counting soft-deleted ones
      // too made a category report "1 منتج" for a product absent from the
      // products screen — and then refuse to be deleted because of it.
      include: { _count: { select: { products: { where: { isDeleted: false } } } } },
      orderBy: { sortOrder: "asc" },
    }),
    // Soft-deleted products still hold their category, and the database will
    // not let that link break. One grouped query rather than a count per row.
    prisma.product.groupBy({
      by: ["categoryId"],
      where: { isDeleted: true },
      _count: { _all: true },
    }),
  ]);

  const archivedByCategory = new Map(archived.map((a) => [a.categoryId, a._count._all]));

  return NextResponse.json({
    success: true,
    data: categories.map((c) => ({ ...c, archivedProducts: archivedByCategory.get(c.id) ?? 0 })),
  });
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return unauthorized();

  try {
    const body = await req.json();
    const existing = await prisma.category.findUnique({ where: { slug: body.slug } });
    if (existing) return NextResponse.json({ success: false, error: "الرابط مستخدم بالفعل" }, { status: 409 });

    const category = await prisma.category.create({
      data: {
        name: body.name,
        nameAr: body.nameAr,
        slug: body.slug,
        description: body.description,
        descriptionAr: body.descriptionAr,
        icon: body.icon,
        color: body.color,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder || 0,
      },
    });

    return NextResponse.json({ success: true, data: category });
  } catch (err) {
    return serverError("POST /api/admin/categories", err);
  }
}
