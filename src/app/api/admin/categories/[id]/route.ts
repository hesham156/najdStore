import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError, notFound, badRequest } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return unauthorized();

  try {
    // A DELETE may carry no body at all, so parsing must not throw.
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

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

    // Products deleted while they had orders are kept so the order history still
    // renders. They keep their category link and the database will not let it
    // break — but they can be moved. Order views read only the category's icon,
    // so moving one changes a decorative emoji, never a price or a product name.
    const archivedProducts = await prisma.product.count({
      where: { categoryId: params.id, isDeleted: true },
    });

    if (archivedProducts > 0) {
      const reassignTo = typeof body.reassignTo === "string" ? body.reassignTo.trim() : "";

      if (!reassignTo) {
        // Not an error the merchant caused — tell the client a choice is needed
        // so it can ask which category the archived products should move to.
        return NextResponse.json(
          {
            success: false,
            error:
              `"${category.nameAr}" مرتبطة بـ${archivedProducts} منتج محذوف محفوظ لسجل الطلبات. ` +
              `اختر فئة تُنقل إليها هذه المنتجات ليتم حذف الفئة.`,
            requiresReassign: true,
            archivedProducts,
          },
          { status: 409 }
        );
      }

      const target = await prisma.category.findUnique({
        where: { id: reassignTo },
        select: { id: true },
      });
      if (!target || target.id === params.id) return badRequest("اختر فئة أخرى صالحة لنقل المنتجات المحذوفة إليها");

      // Move and delete together: a half-done reassignment would leave the
      // products pointing at a category that no longer exists.
      await prisma.$transaction([
        prisma.product.updateMany({
          where: { categoryId: params.id, isDeleted: true },
          data: { categoryId: reassignTo },
        }),
        prisma.category.delete({ where: { id: params.id } }),
      ]);

      return NextResponse.json({ success: true, data: { reassigned: archivedProducts } });
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

    // Whitelist editable fields — never hand the raw body to Prisma, or a caller
    // could set columns the form never exposes (mass assignment).
    const data: Record<string, unknown> = {};
    for (const key of ["name", "nameAr", "slug", "description", "descriptionAr", "icon", "image", "color"] as const) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.sortOrder !== undefined) data.sortOrder = parseInt(String(body.sortOrder), 10) || 0;

    const category = await prisma.category.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, data: category });
  } catch (err) {
    return serverError("PATCH /api/admin/categories/[id]", err);
  }
}
