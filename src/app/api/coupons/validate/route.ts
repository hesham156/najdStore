import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { code, total } = await req.json();

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!coupon) {
      return NextResponse.json({ success: false, error: "الكوبون غير صالح أو منتهي الصلاحية" });
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ success: false, error: "الكوبون استُخدم بالحد الأقصى" });
    }

    if (coupon.minOrderAmount && total < parseFloat(String(coupon.minOrderAmount))) {
      return NextResponse.json({
        success: false,
        error: `الحد الأدنى للطلب ${coupon.minOrderAmount} ر.س`,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: parseFloat(String(coupon.discountValue)),
        // The checkout screen recalculates the discount whenever the basket
        // changes. Without the minimum it kept showing a discount the order API
        // would then refuse, so the displayed total undercut the charged one.
        minOrderAmount: coupon.minOrderAmount == null ? null : parseFloat(String(coupon.minOrderAmount)),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}
