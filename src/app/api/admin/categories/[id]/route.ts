import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError, notFound, badRequest } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return unauthorized();

  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      select: { id: true, nameAr: true, _count: { select: { products: true } } },
    });
    if (!category) return notFound("الفئة غير موجودة");

    // Product.categoryId is required with no cascade, so a category holding
    // products cannot be removed — say so instead of failing on a FK error.
    if (category._count.products > 0) {
      return badRequest(
        `لا يمكن حذف "${category.nameAr}" لأنها تحتوي على ${category._count.products} منتج. انقل المنتجات إلى فئة أخرى أولاً، أو عطّل الفئة بدل حذفها.`
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
