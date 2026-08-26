import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, badRequest, serverError } from "@/lib/api";
import { getTreekConfig, calculateRates, TreekError } from "@/lib/treek";

export const dynamic = "force-dynamic";

/**
 * Live Treek courier prices for an order's destination, so the admin can pick a
 * courier before booking the shipment. Read-only — books nothing.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return unauthorized();

  try {
    const config = await getTreekConfig();
    if (!config.enabled) return badRequest("شركة الشحن Treek غير مفعّلة");

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      select: { shipCity: true },
    });
    if (!order) return notFound("الطلب غير موجود");

    const toCity = (order.shipCity || "").trim();
    if (!toCity) return badRequest("لا توجد مدينة للمستلم في هذا الطلب — أضِفها أولاً لحساب الأسعار");

    const rates = await calculateRates(config, { toCity });
    return NextResponse.json({ success: true, data: rates });
  } catch (err) {
    if (err instanceof TreekError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 502 });
    }
    return serverError("GET /api/admin/orders/[id]/treek-rates", err);
  }
}
