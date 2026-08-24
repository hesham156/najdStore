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

    if (invoice.status === "paid") {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { orderId: order.id },
          data: { status: "APPROVED", transactionId: id, reviewedAt: new Date() },
        });
        const o = await tx.order.update({
          where: { id: order.id },
          data: { status: "PAYMENT_APPROVED" },
          include: { user: { select: SAFE_USER_SELECT }, payment: true },
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
        return o;
      });

      await notifyOrderStatusUpdated(updated).catch(() => {});
      return NextResponse.redirect(new URL(`/thank-you?order=${order.id}&num=${encodeURIComponent(order.orderNumber)}`, req.url));
    }

    // Payment failed / not completed → cancel and release stock
    if (order.status !== "CANCELLED") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", payment: { update: { status: "REJECTED" } } },
      });
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
