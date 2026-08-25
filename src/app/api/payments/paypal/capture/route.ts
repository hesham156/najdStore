import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder } from "@/lib/paypal";
import { notifyOrderStatusUpdated } from "@/lib/hayyak";
import { restoreStock } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const token = searchParams.get("token"); // PayPal Order ID

    if (!orderId || !token) {
      return NextResponse.redirect(new URL(`/dashboard/orders?error=missing_parameters`, req.url));
    }

    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: true },
    });

    if (!order || !order.payment) {
      return NextResponse.redirect(new URL(`/dashboard/orders?error=order_not_found`, req.url));
    }

    // Check if it's already captured
    if (order.payment.status === "APPROVED") {
      return NextResponse.redirect(new URL(`/dashboard/orders/${orderId}?payment=success`, req.url));
    }

    // Ensure it's the correct PayPal token. This binds the capture to the exact
    // PayPal order WE created for THIS order at THIS amount — a replayed or
    // swapped token for another order is rejected here.
    if (order.payment.transactionId !== token) {
      return NextResponse.redirect(new URL(`/dashboard/orders/${orderId}?error=invalid_token`, req.url));
    }

    // Capture the payment via PayPal's authenticated API — the money is confirmed
    // server-side, never inferred from the redirect.
    const captureData = await capturePayPalOrder(token);

    if (captureData.status === "COMPLETED") {
      const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || token;

      // Race-safe, idempotent approval so a concurrent/duplicate capture callback
      // does not double-fire the status-change notification.
      const changed = await prisma.$transaction(async (tx) => {
        const res = await tx.order.updateMany({
          where: {
            id: orderId,
            status: { notIn: ["PAYMENT_APPROVED", "PROCESSING", "DELIVERED", "CANCELLED", "REFUNDED"] },
          },
          data: { status: "PAYMENT_APPROVED" },
        });
        if (res.count === 0) return false;
        await tx.payment.update({
          where: { orderId: orderId },
          data: { status: "APPROVED", transactionId: captureId },
        });
        return true;
      });

      if (changed) {
        const updatedOrder = await prisma.order.findUnique({
          where: { id: orderId },
          select: { id: true, orderNumber: true, status: true, total: true, user: { select: { name: true, phone: true } } },
        });
        if (updatedOrder) await notifyOrderStatusUpdated(updatedOrder).catch(() => {});
      }

      return NextResponse.redirect(new URL(`/dashboard/orders/${orderId}?payment=success`, req.url));
    } else {
      // Payment not completed → release the stock reserved at order creation
      // (race-safe: restore only if THIS request cancels the order).
      const cancelled = await prisma.order.updateMany({
        where: { id: orderId, status: { notIn: ["CANCELLED", "REFUNDED", "PAYMENT_APPROVED", "PROCESSING", "DELIVERED"] } },
        data: { status: "CANCELLED" },
      });
      if (cancelled.count === 1) {
        await prisma.payment.update({ where: { orderId }, data: { status: "REJECTED" } }).catch(() => {});
        await restoreStock(
          order.items.map((it) => ({ productId: it.productId, variantId: it.variantId, quantity: it.quantity })),
        ).catch(() => {});
      }
      return NextResponse.redirect(new URL(`/dashboard/orders/${orderId}?payment=failed`, req.url));
    }

  } catch (error) {
    console.error("PayPal Capture Error:", error);
    const orderId = req.nextUrl.searchParams.get("orderId");
    const redirectUrl = orderId ? `/dashboard/orders/${orderId}?error=capture_failed` : `/dashboard/orders?error=capture_failed`;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }
}
