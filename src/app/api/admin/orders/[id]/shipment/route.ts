import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, badRequest, serverError } from "@/lib/api";
import {
  getRedboxConfig, createShipment, getShipmentStatus, getShipmentLabel, getTrackingPage,
  RedboxError,
} from "@/lib/redbox";

export const dynamic = "force-dynamic";

/** Create a RedBox shipment for this order. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { user: true, shipment: true, payment: true },
    });
    if (!order) return notFound("الطلب غير موجود");
    if (order.shipment) return badRequest("توجد شحنة مسبقاً لهذا الطلب");

    const config = await getRedboxConfig();
    if (!config.enabled) return badRequest("شركة الشحن RedBox غير مفعّلة. فعّلها من الإعدادات → الشحن");
    if (!config.token) return badRequest("توكن RedBox غير مضبوط في الإعدادات");

    const body = await req.json().catch(() => ({}));

    // Persist any address fields sent from the admin form onto the order.
    const shipName = (body.shipName ?? order.shipName ?? order.user.name)?.trim();
    const shipPhone = (body.shipPhone ?? order.shipPhone ?? order.user.phone ?? "")?.trim();
    const shipCity = (body.shipCity ?? order.shipCity ?? "")?.trim();
    const shipAddress = (body.shipAddress ?? order.shipAddress ?? "")?.trim();

    if (!shipName) return badRequest("اسم المستلم مطلوب");
    if (!shipPhone) return badRequest("جوال المستلم مطلوب");

    await prisma.order.update({
      where: { id: order.id },
      data: { shipName, shipPhone, shipCity: shipCity || null, shipAddress: shipAddress || null },
    });

    // COD: collect the total only when the order was not paid online.
    const paidOnline = order.payment?.status === "APPROVED";
    const codAmount = body.codAmount !== undefined ? Number(body.codAmount) : (paidOnline ? 0 : Number(order.total));

    const parsed = await createShipment(config, {
      reference: order.orderNumber,
      customerName: shipName,
      customerPhone: shipPhone,
      customerEmail: order.user.email || undefined,
      customerCity: shipCity || undefined,
      customerAddress: shipAddress || undefined,
      customerCountry: order.shipCountry || "SA",
      codAmount: Number.isFinite(codAmount) ? codAmount : 0,
      codCurrency: "SAR",
    });

    // Best-effort enrich with label + tracking page URLs.
    let labelUrl = parsed.labelUrl;
    let trackingUrl = parsed.trackingUrl;
    if (parsed.carrierId) {
      if (!labelUrl) labelUrl = await getShipmentLabel(config, parsed.carrierId).catch(() => null);
      if (!trackingUrl) trackingUrl = await getTrackingPage(config, parsed.carrierId).catch(() => null);
    }

    const shipment = await prisma.shipment.create({
      data: {
        orderId: order.id,
        carrier: "REDBOX",
        carrierId: parsed.carrierId,
        trackingNumber: parsed.trackingNumber,
        labelUrl,
        trackingUrl,
        status: parsed.status || "CREATED",
        codAmount: Number.isFinite(codAmount) ? codAmount : 0,
        raw: parsed.raw as object,
      },
    });

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_SHIPMENT",
        entity: "Shipment",
        entityId: shipment.id,
        details: { orderNumber: order.orderNumber, carrierId: parsed.carrierId, tracking: parsed.trackingNumber },
      },
    });

    return NextResponse.json({ success: true, data: shipment });
  } catch (err) {
    if (err instanceof RedboxError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 502 });
    }
    return serverError("POST /api/admin/orders/[id]/shipment", err);
  }
}

/** Refresh the shipment status from RedBox. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return unauthorized();

  try {
    const shipment = await prisma.shipment.findUnique({ where: { orderId: params.id } });
    if (!shipment) return notFound("لا توجد شحنة لهذا الطلب");
    if (!shipment.carrierId) return NextResponse.json({ success: true, data: shipment });

    const config = await getRedboxConfig();
    const { status } = await getShipmentStatus(config, shipment.carrierId);

    const updated = status && status !== shipment.status
      ? await prisma.shipment.update({ where: { id: shipment.id }, data: { status } })
      : shipment;

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof RedboxError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 502 });
    }
    return serverError("GET /api/admin/orders/[id]/shipment", err);
  }
}
