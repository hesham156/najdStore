import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, serverError, badRequest } from "@/lib/api";
import { notifyProductUpserted, notifyProductDeleted } from "@/lib/hayyak";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return unauthorized();

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { category: true },
  });

  if (!product) return notFound("المنتج غير موجود");
  return NextResponse.json({ success: true, data: product });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const body = await req.json();

    // Build update data dynamically – only include fields that are present in the request body
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    if (body.name        !== undefined) data.name         = body.name;
    if (body.nameAr      !== undefined) data.nameAr       = body.nameAr;
    if (body.slug        !== undefined) data.slug         = body.slug;
    if (body.description !== undefined) data.description  = body.description;
    if (body.descriptionAr !== undefined) data.descriptionAr = body.descriptionAr;
    if (body.price       !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) return badRequest("سعر المنتج غير صحيح");
      data.price = price;
    }
    if (body.comparePrice !== undefined) data.comparePrice = body.comparePrice || null;
    if (body.categoryId  !== undefined) data.categoryId   = body.categoryId;
    if (body.deliveryMethod !== undefined) data.deliveryMethod = body.deliveryMethod;
    if (body.isActive    !== undefined) data.isActive     = body.isActive;
    if (body.isFeatured  !== undefined) data.isFeatured   = body.isFeatured;
    if (body.features    !== undefined) data.features     = body.features    || [];
    if (body.featuresAr  !== undefined) data.featuresAr   = body.featuresAr  || [];
    if (body.tags        !== undefined) data.tags         = body.tags        || [];
    if (body.image       !== undefined) data.image        = body.image || null;
    if (body.sortOrder   !== undefined) data.sortOrder    = body.sortOrder ?? 0;
    if (body.trackStock  !== undefined) data.trackStock   = !!body.trackStock;
    if (body.stockCount  !== undefined) data.stockCount   = Math.max(0, parseInt(String(body.stockCount)) || 0);

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
      include: { category: true },
    });

    await prisma.adminLog.create({
      data: { userId: session.user.id, action: "UPDATE_PRODUCT", entity: "Product", entityId: params.id },
    });

    // إشعار حياك: تحديث المنتج → مزامنة الكتالوج فوراً
    await notifyProductUpserted(product, false);

    return NextResponse.json({ success: true, data: product });
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      return badRequest("الرابط (slug) مستخدم لمنتج آخر. اختر رابطاً مختلفاً.");
    }
    return serverError("PATCH /api/admin/products/[id]", err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { orderItems: true }
    });

    if (!product) return notFound("المنتج غير موجود");

    if (product.orderItems.length > 0) {
      // Soft delete product if it has orders
      await prisma.product.update({
        where: { id: params.id },
        data: { isActive: false, isDeleted: true }
      });
    } else {
      // Hard delete product
      await prisma.subscriptionStock.deleteMany({
        where: { productId: params.id }
      });
      await prisma.product.delete({
        where: { id: params.id }
      });
    }

    await prisma.adminLog.create({
      data: { userId: session.user.id, action: "DELETE_PRODUCT", entity: "Product", entityId: params.id },
    });

    // إشعار حياك: حذف المنتج → إزالته من الكتالوج
    await notifyProductDeleted(params.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("DELETE /api/admin/products/[id]", err);
  }
}
