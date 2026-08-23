import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return unauthorized();

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      payment: true,
      shipment: true,
      items: { include: { product: { include: { category: true } } } },
    },
  });

  if (!order) return notFound("الطلب غير موجود");

  return NextResponse.json({ success: true, data: order });
}
