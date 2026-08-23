import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Update a city rate (cost / active / city name). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.city !== undefined) {
      const city = String(body.city).trim();
      if (!city) return badRequest("اسم المدينة مطلوب");
      data.city = city;
    }
    if (body.cost !== undefined) {
      const cost = Number(body.cost);
      if (!Number.isFinite(cost) || cost < 0) return badRequest("قيمة الرسوم غير صالحة");
      data.cost = cost;
    }
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

    const rate = await prisma.shippingRate.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, data: rate });
  } catch (err) {
    return serverError("PATCH /api/admin/shipping-rates/[id]", err);
  }
}

/** Delete a city rate. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  try {
    await prisma.shippingRate.deleteMany({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("DELETE /api/admin/shipping-rates/[id]", err);
  }
}
