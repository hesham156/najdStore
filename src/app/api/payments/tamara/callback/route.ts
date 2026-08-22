import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authoriseTamaraOrder, captureTamaraPayment } from "@/lib/tamara";
import { notifyOrderStatusUpdated } from "@/lib/hayyak";

export const dynamic = "force-dynamic";

/**
 * Tamara redirects the customer back here after checkout.
 * We authorise the Tamara order, capture the payment, then mark the order paid.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status"); // success | failure | cancel

  if (!orderId) {
    return NextResponse.redirect(new URL(`/dashboard/orders?error=missing_parameters`, req.url));
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
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

    // Customer cancelled or payment failed at Tamara
    if (status === "cancel" || status === "failure") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED", payment: { update: { status: "REJECTED" } } },
      });
      return NextResponse.redirect(
        new URL(`/dashboard/orders/${order.id}?payment=${status}`, req.url),
      );
    }

    const tamaraOrderId = order.payment.transactionId;
    if (!tamaraOrderId) {
      return NextResponse.redirect(new URL(`/dashboard/orders/${order.id}?error=missing_tamara_id`, req.url));
    }

    const currencySetting = await prisma.setting.findUnique({ where: { key: "currency" } });
    const currency = currencySetting?.value || "SAR";
    const total = parseFloat(String(order.total));

    // 1) Authorise, then 2) capture
    await authoriseTamaraOrder(tamaraOrderId);
    const capture = await captureTamaraPayment(tamaraOrderId, total, currency);

    const captureId =
      capture?.capture_id || capture?.payment_id || tamaraOrderId;

    await prisma.$transaction([
      prisma.payment.update({
        where: { orderId: order.id },
        data: { status: "APPROVED", transactionId: captureId },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: { status: "PAYMENT_APPROVED" },
      }),
    ]);

    // Notify Hayyak of the status change
    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      select: { id: true, orderNumber: true, status: true, total: true, user: { select: { name: true, phone: true } } },
    });
    if (updated) await notifyOrderStatusUpdated(updated);

    return NextResponse.redirect(
      new URL(`/thank-you?order=${order.id}&num=${encodeURIComponent(order.orderNumber)}&payment=success`, req.url),
    );
  } catch (error) {
    console.error("Tamara Callback Error:", error);
    return NextResponse.redirect(new URL(`/dashboard/orders/${orderId}?error=capture_failed`, req.url));
  }
}
