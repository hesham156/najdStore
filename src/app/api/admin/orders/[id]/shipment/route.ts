import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, badRequest, serverError } from "@/lib/api";
import { createShipment, refreshStatus, isCarrierEnabled, type Carrier } from "@/lib/shipping";
import { RedboxError } from "@/lib/redbox";
import { DhlError } from "@/lib/dhl";
import { TreekError } from "@/lib/treek";
import { SAFE_USER_SELECT } from "@/lib/users";

export const dynamic = "force-dynamic";

const CARRIERS: Carrier[] = ["REDBOX", "DHL", "TREEK"];

function carrierError(err: unknown) {
  if (err instanceof RedboxError || err instanceof DhlError || err instanceof TreekError) {
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
  return null;
}

/** Create a shipment (RedBox or DHL) for this order. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: SAFE_USER_SELECT },
        shipment: true,
        payment: true,
        // Treek requires the order line items; other carriers ignore them.
        items: { include: { product: { select: { name: true, nameAr: true } } } },
      },
    });
    if (!order) return notFound("الطلب غير موجود");
    if (order.shipment) return badRequest("توجد شحنة مسبقاً لهذا الطلب");
    if (order.status === "CANCELLED" || order.status === "REFUNDED") {
      return badRequest("لا يمكن إنشاء شحنة لطلب ملغى أو مسترجع");
    }

    const body = await req.json().catch(() => ({}));
    const carrier: Carrier = CARRIERS.includes(body.carrier) ? body.carrier : "REDBOX";

    if (!(await isCarrierEnabled(carrier))) {
      return badRequest(`شركة الشحن ${carrier} غير مفعّلة. فعّلها من الإعدادات → الشحن`);
    }

    const shipName = (body.shipName ?? order.shipName ?? order.user.name)?.trim();
    const shipPhone = (body.shipPhone ?? order.shipPhone ?? order.user.phone ?? "")?.trim();
    const shipCity = (body.shipCity ?? order.shipCity ?? "")?.trim();
    const shipAddress = (body.shipAddress ?? order.shipAddress ?? "")?.trim();
    const shipPostal = (body.shipPostal ?? "")?.trim();

    if (!shipName) return badRequest("اسم المستلم مطلوب");
    if (!shipPhone) return badRequest("جوال المستلم مطلوب");

    await prisma.order.update({
      where: { id: order.id },
      data: { shipName, shipPhone, shipCity: shipCity || null, shipAddress: shipAddress || null },
    });

    const paidOnline = order.payment?.status === "APPROVED";
    const codAmount = body.codAmount !== undefined ? Number(body.codAmount) : (paidOnline ? 0 : Number(order.total));
    const safeCod = Number.isFinite(codAmount) ? codAmount : 0;

    // Claim the shipment slot atomically BEFORE calling the carrier. The unique
    // `orderId` constraint means a second concurrent request fails here instead
    // of creating a duplicate real shipment (and a duplicate COD charge) at the
    // carrier. The placeholder is rolled back if the carrier call fails.
    let shipment;
    try {
      shipment = await prisma.shipment.create({
        data: { orderId: order.id, carrier, status: "PENDING", codAmount: safeCod },
      });
    } catch (e) {
      if ((e as { code?: string })?.code === "P2002") {
        return badRequest("توجد شحنة مسبقاً لهذا الطلب");
      }
      throw e;
    }

    let parsed;
    try {
      parsed = await createShipment(carrier, {
        reference: order.orderNumber,
        name: shipName,
        phone: shipPhone,
        email: order.user.email || undefined,
        city: shipCity || undefined,
        address: shipAddress || undefined,
        postalCode: shipPostal || undefined,
        country: order.shipCountry || "SA",
        codAmount: safeCod,
        declaredValue: Number(order.total),
        currency: "SAR",
        paidOnline,
        items: order.items.map((it) => ({
          name: it.product.nameAr || it.product.name,
          quantity: it.quantity,
          price: Number(it.price),
        })),
      });
    } catch (err) {
      // Carrier refused — release the slot so the admin can retry cleanly.
      await prisma.shipment.delete({ where: { id: shipment.id } }).catch(() => {});
      throw err;
    }

    shipment = await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        carrierId: parsed.carrierId,
        trackingNumber: parsed.trackingNumber,
        labelUrl: parsed.labelUrl,
        trackingUrl: parsed.trackingUrl,
        status: parsed.status || "CREATED",
        raw: parsed.raw as object,
      },
    });

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_SHIPMENT",
        entity: "Shipment",
        entityId: shipment.id,
        details: { carrier, orderNumber: order.orderNumber, tracking: parsed.trackingNumber },
      },
    });

    return NextResponse.json({ success: true, data: shipment });
  } catch (err) {
    return carrierError(err) || serverError("POST /api/admin/orders/[id]/shipment", err);
  }
}

/** Refresh the shipment status from the carrier. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return unauthorized();

  try {
    const shipment = await prisma.shipment.findUnique({ where: { orderId: params.id } });
    if (!shipment) return notFound("لا توجد شحنة لهذا الطلب");
    if (!shipment.carrierId) return NextResponse.json({ success: true, data: shipment });

    const status = await refreshStatus(shipment.carrier as Carrier, shipment.carrierId);
    const updated = status && status !== shipment.status
      ? await prisma.shipment.update({ where: { id: shipment.id }, data: { status } })
      : shipment;

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return carrierError(err) || serverError("GET /api/admin/orders/[id]/shipment", err);
  }
}
