import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, badRequest, serverError } from "@/lib/api";
import { PAID_STATUSES } from "@/lib/orders";
import { planRefund } from "@/lib/refunds";
import { restoreStock } from "@/lib/stock";
import { getMoyasarConfig, refundMoyasarPayment } from "@/lib/moyasar";
import { refundPayPalCapture } from "@/lib/paypal";
import { notifyOrderStatusUpdated } from "@/lib/hayyak";
import { SAFE_USER_SELECT } from "@/lib/users";

export const dynamic = "force-dynamic";

/**
 * Refund an order — full or partial.
 *
 * Money moves through the gateway FIRST for the providers we can drive
 * (Moyasar card, PayPal), and is recorded as a manual refund for the rest
 * (Tamara, bank transfer, crypto, tabby) so an admin completes it in the
 * provider portal. The refund is "claimed" in the database with an optimistic
 * guard before the gateway is called, so two admins clicking refund at once
 * cannot double-refund; a gateway failure rolls the claim back.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  // Refunds move real money — restrict to ADMIN, matching payment-methods and
  // settings. STAFF can process orders but not issue refunds.
  if (session.user.role !== "ADMIN") return unauthorized();

  try {
    const body = await req.json().catch(() => ({}));
    const requested: number | null = body?.amount == null ? null : Number(body.amount);
    const reason: string | undefined = typeof body?.reason === "string" ? body.reason : undefined;

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { payment: true, items: true },
    });
    if (!order || !order.payment) return notFound("الطلب غير موجود");

    // Only money the store actually collected can be refunded.
    if (!PAID_STATUSES.includes(order.status)) {
      return badRequest("لا يمكن استرجاع طلب لم يتم تأكيد دفعه");
    }
    if (order.payment.status !== "APPROVED") {
      return badRequest("لا يمكن الاسترجاع إلا بعد اعتماد الدفع");
    }

    // Validate the amount against what is still refundable (throws on invalid).
    let plan;
    try {
      plan = planRefund(Number(order.payment.amount), Number(order.payment.refundedAmount), requested);
    } catch (e) {
      return badRequest(e instanceof Error ? e.message : "مبلغ الاسترجاع غير صحيح");
    }

    const method = order.payment.method;
    const isAuto = method === "CREDIT_CARD" || method === "PAYPAL";
    const done = Number(order.payment.refundedAmount);

    // 1) Claim the refund atomically (optimistic lock on the amount we just read).
    //    A concurrent refund advances refundedAmount and makes this a no-op.
    const claim = await prisma.payment.updateMany({
      where: { id: order.payment.id, refundedAmount: done },
      data: { refundedAmount: plan.newRefundedTotal, refundedAt: new Date() },
    });
    if (claim.count === 0) {
      return NextResponse.json(
        { success: false, error: "تمّت معالجة استرجاع آخر لهذا الطلب للتو. حدّث الصفحة." },
        { status: 409 },
      );
    }

    // 2) Move the money at the gateway (auto methods only). On failure, roll the
    //    claim back so the amount is not recorded as refunded.
    let gatewayRef: string | undefined;
    if (isAuto) {
      const txId = order.payment.transactionId;
      if (!txId) {
        await prisma.payment.updateMany({ where: { id: order.payment.id }, data: { refundedAmount: done } });
        return badRequest("لا يوجد معرّف معاملة لدى بوابة الدفع لإتمام الاسترجاع");
      }
      try {
        if (method === "CREDIT_CARD") {
          const config = await getMoyasarConfig();
          const r = await refundMoyasarPayment(config, txId, plan.amount);
          gatewayRef = r.refundId;
        } else {
          const r = await refundPayPalCapture(txId, plan.amount);
          gatewayRef = r.id;
        }
      } catch (err) {
        console.error("[refund] gateway refund failed", err);
        await prisma.payment.updateMany({ where: { id: order.payment.id }, data: { refundedAmount: done } });
        return NextResponse.json(
          { success: false, error: "فشل تنفيذ الاسترجاع لدى بوابة الدفع. لم يُخصم أي مبلغ." },
          { status: 502 },
        );
      }
    }

    // 3) Apply order-level effects. On a FULL refund move the order to REFUNDED
    //    and — only if nothing was delivered — return the reserved stock.
    if (plan.isFull) {
      await prisma.order.updateMany({
        where: { id: order.id, status: { in: PAID_STATUSES } },
        data: { status: "REFUNDED" },
      });
      const nothingDelivered = order.items.every((it) => it.deliveredAt == null);
      if (nothingDelivered) {
        await restoreStock(
          order.items.map((it) => ({ productId: it.productId, variantId: it.variantId, quantity: it.quantity })),
        ).catch(() => {});
      }
    }

    // Record the reason / gateway reference on the payment for the audit trail.
    const noteParts = [
      order.payment.adminNotes,
      `استرجاع ${plan.amount}${plan.isFull ? " (كامل)" : " (جزئي)"}${reason ? ` — ${reason}` : ""}${gatewayRef ? ` [${gatewayRef}]` : isAuto ? "" : " [يدوي]"}`,
    ].filter(Boolean);
    await prisma.payment.update({
      where: { id: order.payment.id },
      data: { adminNotes: noteParts.join("\n") },
    });

    await prisma.notification.create({
      data: {
        userId: order.userId,
        title: plan.isFull ? "تم استرجاع مبلغ طلبك" : "تم استرجاع جزء من مبلغ طلبك",
        body: `تم استرجاع ${plan.amount} من طلبك ${order.orderNumber}.${reason ? ` السبب: ${reason}` : ""}`,
        type: "ORDER_UPDATE",
        orderId: order.id,
      },
    });

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: plan.isFull ? "REFUND_ORDER" : "PARTIAL_REFUND_ORDER",
        entity: "Order",
        entityId: order.id,
        details: {
          orderNumber: order.orderNumber,
          amount: plan.amount,
          method,
          manual: !isAuto,
          gatewayRef: gatewayRef ?? null,
          reason: reason ?? null,
        },
      },
    });

    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { user: { select: SAFE_USER_SELECT }, payment: true, items: { include: { product: true } } },
    });
    if (updated) await notifyOrderStatusUpdated(updated).catch(() => {});

    return NextResponse.json({
      success: true,
      data: updated,
      refund: {
        amount: plan.amount,
        isFull: plan.isFull,
        refundedTotal: plan.newRefundedTotal,
        manual: !isAuto,
        gatewayRef: gatewayRef ?? null,
      },
    });
  } catch (err) {
    return serverError("POST /api/admin/orders/[id]/refund", err);
  }
}
