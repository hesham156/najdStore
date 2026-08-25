import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError, badRequest } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return unauthorized();

  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ success: true, data: coupons });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const body = await req.json();

    // Validate before writing — a bad discount type/value silently became a 500
    // ("حدث خطأ") and a percentage over 100 could drive an order total negative.
    const code = String(body.code || "").trim();
    if (!code) return badRequest("كود الخصم مطلوب");
    if (body.discountType !== "PERCENTAGE" && body.discountType !== "FIXED") {
      return badRequest("نوع الخصم غير صحيح");
    }
    const discountValue = Number(body.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return badRequest("قيمة الخصم غير صحيحة");
    }
    if (body.discountType === "PERCENTAGE" && discountValue > 100) {
      return badRequest("نسبة الخصم لا يمكن أن تتجاوز 100%");
    }
    const minOrderAmount = body.minOrderAmount != null && body.minOrderAmount !== "" ? Number(body.minOrderAmount) : null;
    if (minOrderAmount != null && (!Number.isFinite(minOrderAmount) || minOrderAmount < 0)) {
      return badRequest("الحد الأدنى للطلب غير صحيح");
    }
    const maxUses = body.maxUses != null && body.maxUses !== "" ? parseInt(String(body.maxUses), 10) : null;
    if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) {
      return badRequest("الحد الأقصى للاستخدام غير صحيح");
    }

    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) return NextResponse.json({ success: false, error: "الكود موجود بالفعل" }, { status: 409 });

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description: body.description,
        discountType: body.discountType,
        discountValue,
        minOrderAmount,
        maxUses,
        isActive: body.isActive ?? true,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    await prisma.adminLog.create({
      data: { userId: session.user.id, action: "CREATE_COUPON", entity: "Coupon", entityId: coupon.id },
    });

    return NextResponse.json({ success: true, data: coupon });
  } catch (err) {
    return serverError("POST /api/admin/coupons", err);
  }
}
