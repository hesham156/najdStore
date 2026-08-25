import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return unauthorized();

  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id: params.id },
      select: { id: true, _count: { select: { orders: true } } },
    });
    if (!coupon) return notFound("الكوبون غير موجود");

    // Order.couponId references this row (no cascade), so a coupon used on real
    // orders cannot be hard-deleted — deactivate it instead of throwing a raw
    // 500, which keeps order history intact.
    if (coupon._count.orders > 0) {
      await prisma.coupon.update({ where: { id: params.id }, data: { isActive: false } });
      return NextResponse.json({ success: true, deactivated: true });
    }

    await prisma.coupon.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("DELETE /api/admin/coupons/[id]", err);
  }
}
