import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTabbyPayment, captureTabbyPayment } from "@/lib/tabby";
import { notifyOrderStatusUpdated } from "@/lib/hayyak";
import { restoreStock } from "@/lib/stock";

export const dynamic = "force-dynamic";

/**
 * Tabby redirects the customer back here after checkout (success/cancel/failure).
 * We retrieve the payment from Tabby's authenticated API — never trust the query
 * string for the amount or status — confirm it is AUTHORIZED, capture it, then
 * mark the order paid.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status"); // success | cancel | failure
  // Tabby appends payment_id to the merchant URLs; fall back to the id we stored.
  const paymentIdParam = searchParams.get("payment_id");

  if (!orderId) {
    return NextResponse.redirect(new URL(`/dashboard/orders?error=missing_parameters`, req.url));
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, items: true },
    });

    if (!order || !order.payment) {
      return NextResponse.redirect(new URL(`/dashboard/orders?error=order_not_found`, req.url));
    }

    // Already captured — go straight to the thank-you page
    if (order.payment.status === "APPROVED") {
      return NextResponse.redirect(
        new URL(`/thank-you?order=${order.id}&num=${encodeURIComponent(order.orderNumber)}`, req.url),
      );
    }

    // Customer cancelled or payment failed at Tabby → cancel and release the
    // reserved stock (race-safe: only restore if THIS request cancelled it).
    if (status === "cancel" || status === "failure") {
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
      return NextResponse.redirect(
        new URL(`/dashboard/orders/${order.id}?payment=${status}`, req.url),
      );
    }

    const paymentId = paymentIdParam || order.payment.transactionId;
    if (!paymentId) {
      return NextResponse.redirect(new URL(`/dashboard/orders/${order.id}?error=missing_tabby_id`, req.url));
    }

    const currencySetting = await prisma.setting.findUnique({ where: { key: "currency" } });
    const currency = currencySetting?.value || "SAR";
    const total = parseFloat(String(order.total));

    // The money is confirmed server-side: retrieve the payment, verify it is
    // AUTHORIZED, then capture. A tampered redirect can never approve an order.
    const payment = await getTabbyPayment(paymentId, currency);
    if (payment?.status !== "AUTHORIZED" && payment?.status !== "CLOSED") {
      // Not authorised (e.g. customer abandoned) → cancel and release stock.
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
      return NextResponse.redirect(new URL(`/dashboard/orders/${order.id}?payment=failure`, req.url));
    }

    // Capture unless Tabby already auto-closed a full capture on its side.
    let captureId = paymentId;
    if (payment.status === "AUTHORIZED") {
      const capture = await captureTabbyPayment(paymentId, total, currency);
      captureId = capture?.id || capture?.captures?.[0]?.id || paymentId;
    }

    // Race-safe, idempotent approval so a concurrent request cannot double-fire
    // the status-change notification.
    const changed = await prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({
        where: {
          id: order.id,
          status: { notIn: ["PAYMENT_APPROVED", "PROCESSING", "DELIVERED", "CANCELLED", "REFUNDED"] },
        },
        data: { status: "PAYMENT_APPROVED" },
      });
      if (res.count === 0) return false;
      await tx.payment.update({
        where: { orderId: order.id },
        data: { status: "APPROVED", transactionId: captureId },
      });
      return true;
    });

    if (changed) {
      const updated = await prisma.order.findUnique({
        where: { id: order.id },
        select: { id: true, orderNumber: true, status: true, total: true, user: { select: { name: true, phone: true } } },
      });
      if (updated) await notifyOrderStatusUpdated(updated).catch(() => {});
    }

    return NextResponse.redirect(
      new URL(`/thank-you?order=${order.id}&num=${encodeURIComponent(order.orderNumber)}&payment=success`, req.url),
    );
  } catch (error) {
    console.error("Tabby Callback Error:", error);
    return NextResponse.redirect(new URL(`/dashboard/orders/${orderId}?error=capture_failed`, req.url));
  }
}
