import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTamaraConfig, isValidTamaraNotification } from "@/lib/tamara";
import { notifyOrderStatusUpdated } from "@/lib/hayyak";
import { restoreStock } from "@/lib/stock";

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
      include: { payment: true, items: true },
    });
    if (!order) {
      return NextResponse.json({ success: true, ignored: "order not found" });
    }

    const event = (eventType || "").toLowerCase();

    if (event.includes("approved") || event.includes("authorised") || event.includes("fully_captured")) {
      // Race-safe, idempotent approval — only the request that actually flips the
      // status runs the notification, so a duplicate webhook is a no-op.
      const changed = await prisma.$transaction(async (tx) => {
        const res = await tx.order.updateMany({
          where: {
            id: order.id,
            status: { notIn: ["PAYMENT_APPROVED", "PROCESSING", "DELIVERED", "CANCELLED", "REFUNDED"] },
          },
          data: { status: "PAYMENT_APPROVED" },
        });
        if (res.count === 0) return false;
        await tx.payment.update({ where: { orderId: order.id }, data: { status: "APPROVED" } });
        return true;
      });
      if (changed) {
        const updated = await prisma.order.findUnique({
          where: { id: order.id },
          select: { id: true, orderNumber: true, status: true, total: true, user: { select: { name: true, phone: true } } },
        });
        if (updated) await notifyOrderStatusUpdated(updated).catch(() => {});
      }
    } else if (event.includes("declined") || event.includes("canceled") || event.includes("cancelled") || event.includes("expired")) {
      // Only cancel + release stock if the order is still open, and only once
      // (guarded update → restore runs a single time even on duplicate webhooks).
      const cancelled = await prisma.order.updateMany({
        where: { id: order.id, status: { notIn: ["CANCELLED", "REFUNDED", "PAYMENT_APPROVED", "PROCESSING", "DELIVERED"] } },
        data: { status: "CANCELLED" },
      });
      if (cancelled.count === 1) {
        await prisma.payment.update({ where: { orderId: order.id }, data: { status: "REJECTED" } }).catch(() => {});
        await restoreStock(
          order.items.map((it) => ({ productId: it.productId, variantId: it.variantId, quantity: it.quantity })),
        ).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tamara Webhook Error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
