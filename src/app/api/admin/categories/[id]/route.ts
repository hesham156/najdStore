import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError, notFound, badRequest } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return unauthorized();

  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        nameAr: true,
        // Split the count: what the merchant can see, and what is retained
        // only so old orders still render.
        _count: { select: { products: { where: { isDeleted: false } } } },
      },
    });
    if (!category) return notFound("الفئة غير موجودة");

    // Product.categoryId is required with no cascade, so a category holding
    // products cannot be removed — say so instead of failing on a FK error.
    const liveProducts = category._count.products;
    if (liveProducts > 0) {
      return badRequest(
        `لا يمكن حذف "${category.nameAr}" لأنها تحتوي على ${liveProducts} منتج. انقل المنتجات إلى فئة أخرى أولاً، أو عطّل الفئة بدل حذفها.`
      );
    }

    // Products that were deleted while they had orders are kept so the order
    // history still shows what was bought. They keep their category link, which
    // the database will not let us break — so name the real reason rather than
    // pointing at a product the merchant cannot find anywhere.
    const archivedProducts = await prisma.product.count({
      where: { categoryId: params.id, isDeleted: true },
    });
    if (archivedProducts > 0) {
      return badRequest(
        `"${category.nameAr}" لا تحتوي على منتجات معروضة، لكنها مرتبطة بـ${archivedProducts} منتج محذوف محفوظ لسجل الطلبات السابقة. ` +
        `لا يمكن حذف الفئة دون فقدان بيانات تلك الطلبات — عطّلها بدلاً من ذلك لتختفي من المتجر.`
      );
    }

    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("DELETE /api/admin/categories/[id]", err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return unauthorized();

  try {
    const body = await req.json();
    const category = await prisma.category.update({ where: { id: params.id }, data: body });
    return NextResponse.json({ success: true, data: category });
  } catch (err) {
    return serverError("PATCH /api/admin/categories/[id]", err);
  }
}
