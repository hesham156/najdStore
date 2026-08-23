import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** List all per-city shipping rates. */
export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  try {
    const rates = await prisma.shippingRate.findMany({ orderBy: [{ sortOrder: "asc" }, { city: "asc" }] });
    return NextResponse.json({ success: true, data: rates });
  } catch (err) {
    return serverError("GET /api/admin/shipping-rates", err);
  }
}

/** Create a city rate. */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  try {
    const body = await req.json();
    const city = String(body.city || "").trim();
    const cost = Number(body.cost);
    if (!city) return badRequest("اسم المدينة مطلوب");
    if (!Number.isFinite(cost) || cost < 0) return badRequest("قيمة الرسوم غير صالحة");

    const exists = await prisma.shippingRate.findUnique({ where: { city } });
    if (exists) return badRequest("هذه المدينة مضافة مسبقاً");

    const rate = await prisma.shippingRate.create({
      data: { city, cost, isActive: body.isActive ?? true, sortOrder: Number(body.sortOrder) || 0 },
    });
    return NextResponse.json({ success: true, data: rate });
  } catch (err) {
    return serverError("POST /api/admin/shipping-rates", err);
  }
}
