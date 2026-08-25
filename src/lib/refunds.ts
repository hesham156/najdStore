/**
 * Pure refund maths — no database, no gateway. Kept separate so the money rules
 * (how much is still refundable, whether a refund fully clears the payment) can
 * be unit-tested with the network switched off.
 */

/** Payment methods we can refund automatically through the gateway API. */
export const AUTO_REFUND_METHODS = ["CREDIT_CARD", "PAYPAL"] as const;

export interface RefundPlan {
  /** Amount to refund now, rounded to 2 decimals. */
  amount: number;
  /** Cumulative refunded amount after this refund. */
  newRefundedTotal: number;
  /** True when the payment is now fully refunded. */
  isFull: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Validate a refund request against what has already been refunded.
 *
 * @param paidAmount        the payment's total amount
 * @param alreadyRefunded   cumulative amount refunded so far
 * @param requested         requested refund amount; omit / null for the full remaining balance
 * @throws Error (Arabic message) when the request is invalid
 */
export function planRefund(
  paidAmount: number,
  alreadyRefunded: number,
  requested?: number | null,
): RefundPlan {
  const paid = round2(Number(paidAmount) || 0);
  const done = round2(Number(alreadyRefunded) || 0);
  const refundable = round2(paid - done);

  if (paid <= 0) throw new Error("لا يوجد مبلغ مدفوع قابل للاسترجاع");
  if (refundable <= 0) throw new Error("تم استرجاع كامل مبلغ هذا الطلب مسبقاً");

  let amount: number;
  if (requested == null) {
    amount = refundable; // default: full remaining balance
  } else {
    amount = round2(Number(requested));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("مبلغ الاسترجاع غير صحيح");
    }
    // Small tolerance so a full-balance request expressed as a rounded decimal
    // is not rejected by sub-halala drift.
    if (amount > refundable + 0.01) {
      throw new Error(`مبلغ الاسترجاع يتجاوز المتبقّي القابل للاسترجاع (${refundable})`);
    }
    if (amount > refundable) amount = refundable; // clamp within tolerance
  }

  const newRefundedTotal = round2(done + amount);
  const isFull = newRefundedTotal >= paid - 0.01;
  return { amount, newRefundedTotal, isFull };
}
