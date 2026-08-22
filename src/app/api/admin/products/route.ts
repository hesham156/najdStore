import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";
import { notifyProductUpserted } from "@/lib/hayyak";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return unauthorized();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const onlyActive = searchParams.get("active"); // if null = all, "true" = active only

  const where: Record<string, unknown> = { isDeleted: false };
  if (onlyActive === "true") where.isActive = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { nameAr: { contains: search, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: { select: { nameAr: true, icon: true } },
      // Sales count powers the "المبيعات" column in the admin list.
      _count: { select: { orderItems: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: products });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const body = await req.json();
    const product = await prisma.product.create({
      data: {
        name: body.name,
        nameAr: body.nameAr,
        slug: body.slug,
        description: body.description,
        descriptionAr: body.descriptionAr,
        price: body.price,
        comparePrice: body.comparePrice || null,
        categoryId: body.categoryId,
        image: body.image || null,
        features: body.features || [],
        tags: body.tags || [],
        deliveryMethod: body.deliveryMethod || "MANUAL",
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        sortOrder: body.sortOrder || 0,
      },
    });

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_PRODUCT",
        entity: "Product",
        entityId: product.id,
        details: { name: product.nameAr },
      },
    });

    // إشعار حياك: منتج جديد → تحديث الكتالوج فوراً
    await notifyProductUpserted(product, true);

    return NextResponse.json({ success: true, data: product });
  } catch (err) {
    return serverError("POST /api/admin/products", err);
  }
}
