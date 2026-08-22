import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTamaraConfig, isValidTamaraNotification } from "@/lib/tamara";
import { notifyOrderStatusUpdated } from "@/lib/hayyak";

export const dynamic = "force-dynamic";

/**
 * Tamara server-to-server notifications.
 * Configure this URL in the Tamara dashboard as the Notification URL:
 *   {your-domain}/api/payments/tamara/webhook
 */
export async function POST(req: NextRequest) {
  try {
    const config = await getTamaraConfig();
    const token = req.headers.get("tamaratoken") || req.headers.get("tamaraToken");

    if (!isValidTamaraNotification(token, config.notificationKey)) {
      return NextResponse.json({ success: false, error: "invalid token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    // Tamara sends order_reference_id (our orderNumber) and event/order_status
    const orderReferenceId: string | undefined = body.order_reference_id;
    const eventType: string | undefined = body.event_type || body.order_status;

    if (!orderReferenceId) {
      return NextResponse.json({ success: true, ignored: "no order_reference_id" });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: orderReferenceId },
      include: { payment: true },
    });
    if (!order) {
      return NextResponse.json({ success: true, ignored: "order not found" });
    }

    const event = (eventType || "").toLowerCase();

    if (event.includes("approved") || event.includes("authorised") || event.includes("fully_captured")) {
      if (order.payment?.status !== "APPROVED") {
        await prisma.$transaction([
          prisma.payment.update({ where: { orderId: order.id }, data: { status: "APPROVED" } }),
          prisma.order.update({ where: { id: order.id }, data: { status: "PAYMENT_APPROVED" } }),
        ]);
        const updated = await prisma.order.findUnique({
          where: { id: order.id },
          select: { id: true, orderNumber: true, status: true, total: true, user: { select: { name: true, phone: true } } },
        });
        if (updated) await notifyOrderStatusUpdated(updated);
      }
    } else if (event.includes("declined") || event.includes("canceled") || event.includes("cancelled") || event.includes("expired")) {
      if (order.status !== "PAYMENT_APPROVED" && order.status !== "DELIVERED") {
        await prisma.$transaction([
          prisma.payment.update({ where: { orderId: order.id }, data: { status: "REJECTED" } }),
          prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } }),
        ]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tamara Webhook Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
