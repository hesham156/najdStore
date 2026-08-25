import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMoyasarConfig, getInvoice } from "@/lib/moyasar";
import { restoreStock } from "@/lib/stock";
import { notifyOrderStatusUpdated } from "@/lib/hayyak";
import { SAFE_USER_SELECT } from "@/lib/users";

export const dynamic = "force-dynamic";

/**
 * Moyasar redirects the customer here after the hosted payment page.
 * We verify the invoice status server-side (never trust the query string alone),
 * then mark the order paid or cancelled.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  // Moyasar invoice callbacks carry `invoice_id`; prefer it, else fall back to the
  // invoice id we stored on the payment (the query `id` may be a payment id).
  const invoiceId = searchParams.get("invoice_id");

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

    // Already finalized → straight to thank-you
    if (order.payment.status === "APPROVED") {
      return NextResponse.redirect(new URL(`/thank-you?order=${order.id}&num=${encodeURIComponent(order.orderNumber)}`, req.url));
    }

    const id = invoiceId || order.payment.transactionId;
    if (!id) {
      return NextResponse.redirect(new URL(`/dashboard/orders/${order.id}?error=missing_invoice`, req.url));
    }

    const config = await getMoyasarConfig();
    const invoice = await getInvoice(config, id);

    // Verify the gateway actually collected the amount WE booked — never trust the
    // redirect. Moyasar reports the amount in halalas (SAR × 100). If it does not
    // match the order total to the halala, treat it as unverified and do not
    // approve (guards against a tampered/re-pointed invoice id).
    const expectedHalalas = Math.round(Number(order.total) * 100);
    const amountMatches = Number(invoice.amount) === expectedHalalas;

    if (invoice.status === "paid" && amountMatches) {
      // Race-safe, idempotent approval: only the request that actually flips the
      // status out of a non-final state runs the side effects. A duplicate
      // callback (or a concurrent one) sees count === 0 and just redirects.
      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.order.updateMany({
          where: {
            id: order.id,
            status: { notIn: ["PAYMENT_APPROVED", "PROCESSING", "DELIVERED", "CANCELLED", "REFUNDED"] },
          },
          data: { status: "PAYMENT_APPROVED" },
        });
        if (res.count === 0) return null;

        await tx.payment.update({
          where: { orderId: order.id },
          data: { status: "APPROVED", transactionId: id, reviewedAt: new Date() },
        });
        await tx.notification.create({
          data: {
            userId: order.userId,
            title: "تم استلام دفعتك ✅",
            body: `تم تأكيد دفع طلبك ${order.orderNumber} بنجاح. سنبدأ بمعالجته.`,
            type: "ORDER_UPDATE",
            orderId: order.id,
          },
        });
        return tx.order.findUnique({
          where: { id: order.id },
          include: { user: { select: SAFE_USER_SELECT }, payment: true },
        });
      });

      if (updated) await notifyOrderStatusUpdated(updated).catch(() => {});
      return NextResponse.redirect(new URL(`/thank-you?order=${order.id}&num=${encodeURIComponent(order.orderNumber)}`, req.url));
    }

    if (invoice.status === "paid" && !amountMatches) {
      // Paid, but not the amount we expected — leave the order untouched for an
      // admin to reconcile rather than silently fulfilling it.
      console.error(
        `[moyasar callback] amount mismatch for order ${order.orderNumber}: invoice=${invoice.amount} expected=${expectedHalalas}`,
      );
      return NextResponse.redirect(new URL(`/dashboard/orders/${order.id}?error=amount_mismatch`, req.url));
    }

    // Payment failed / not completed → cancel and release stock (race-safe:
    // restore stock only if THIS request is the one that cancelled the order).
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
  } catch (err) {
    console.error("[moyasar callback]", err);
    return NextResponse.redirect(new URL(`/dashboard/orders?error=payment_verify_failed`, req.url));
  }
}
