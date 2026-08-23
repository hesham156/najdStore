import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, serverError } from "@/lib/api";
import { getRedboxConfig, cancelShipment, RedboxError } from "@/lib/redbox";

export const dynamic = "force-dynamic";

/** Cancel the RedBox shipment for this order. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const shipment = await prisma.shipment.findUnique({ where: { orderId: params.id } });
    if (!shipment) return notFound("لا توجد شحنة لهذا الطلب");

    const config = await getRedboxConfig();
    if (shipment.carrierId) {
      await cancelShipment(config, shipment.carrierId);
    }

    const updated = await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: "CANCELLED" },
    });

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "CANCEL_SHIPMENT",
        entity: "Shipment",
        entityId: shipment.id,
        details: { carrierId: shipment.carrierId },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof RedboxError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 502 });
    }
    return serverError("POST /api/admin/orders/[id]/shipment/cancel", err);
  }
}
