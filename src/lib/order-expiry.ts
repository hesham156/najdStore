import { prisma } from "@/lib/prisma";
import { restoreStock } from "@/lib/stock";

/**
 * Cancel orders that were started but never paid, and return their reserved
 * stock to the catalogue.
 *
 * We only touch orders that are unambiguously abandoned:
 *   - status = PENDING (a gateway/bank order awaiting the customer)
 *   - payment.status = PENDING (no proof uploaded, no gateway confirmation)
 *   - created before the cutoff
 *
 * PENDING_PAYMENT_REVIEW orders and any payment marked UPLOADED are left alone —
 * those are the admin's to review. Each cancellation is guarded so a concurrent
 * gateway callback that just confirmed the payment wins, and stock is restored
 * at most once.
 */
export async function expireStalePendingOrders(
  thresholdHours: number,
  limit = 200,
): Promise<{ scanned: number; expired: number }> {
  const hours = Number.isFinite(thresholdHours) && thresholdHours >= 1 ? thresholdHours : 24;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const candidates = await prisma.order.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff },
      payment: { is: { status: "PENDING" } },
    },
    include: { items: true },
    take: limit,
    orderBy: { createdAt: "asc" },
  });

  let expired = 0;
  for (const order of candidates) {
    // Race-safe: only cancel if it is still PENDING at write time.
    const res = await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    if (res.count !== 1) continue; // a callback confirmed it first — leave it

    await prisma.payment
      .updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "REJECTED" } })
      .catch(() => {});

    await restoreStock(
      order.items.map((it) => ({ productId: it.productId, variantId: it.variantId, quantity: it.quantity })),
    ).catch(() => {});

    await prisma.notification
      .create({
        data: {
          userId: order.userId,
          title: "تم إلغاء طلبك",
          body: `تم إلغاء طلبك ${order.orderNumber} تلقائياً لعدم إتمام الدفع. يمكنك إعادة الطلب في أي وقت.`,
          type: "ORDER_UPDATE",
          orderId: order.id,
        },
      })
      .catch(() => {});

    expired += 1;
  }

  return { scanned: candidates.length, expired };
}
