import { computeShipping } from "@/lib/utils";

/**
 * ══════════════════════════════════════════════════════════════
 *  Order pricing — one implementation, used by both sides.
 * ══════════════════════════════════════════════════════════════
 *
 *  The checkout screen and the order API each used to compute the discount
 *  and the total with their own copy of the same arithmetic. They agreed by
 *  luck, not by construction: change one rule — cap a discount, exclude
 *  shipping from a percentage — and the customer sees one price while the
 *  server charges another.
 *
 *  Everything here is pure, so it runs identically in the browser and on the
 *  server, and it is covered by tests that need no database.
 */

export type DiscountType = "PERCENTAGE" | "FIXED";

export interface CouponLike {
  discountType: DiscountType | string;
  discountValue: number;
  minOrderAmount?: number | null;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
}

/** Money is rounded to two decimals; floating point must never reach a charge. */
const money = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * The VAT already contained in a tax-inclusive amount.
 *
 * Catalogue prices in this store include VAT — the accounting screens extract
 * it with `total × rate / (100 + rate)` rather than adding it on top. The
 * checkout summary shows the same figure so the customer can see the tax they
 * are paying before they pay it, without the total moving.
 *
 * Returns 0 for a non-positive amount or an unusable rate, so a missing
 * `tax_rate` setting hides the line instead of printing NaN.
 */
export function vatIncludedIn(totalInclusive: number, ratePercent: number): number {
  const amount = Number(totalInclusive);
  const rate = Number(ratePercent);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return money((amount * rate) / (100 + rate));
}

/**
 * Discount a coupon grants on a given subtotal.
 *
 * Returns 0 when the coupon does not apply. The result is clamped to the
 * subtotal: a 200 ر.س fixed coupon on a 50 ر.س basket discounts 50, not 200,
 * so the summary line can never claim more was taken off than was owed.
 */
export function calculateDiscount(subtotal: number, coupon?: CouponLike | null): number {
  if (!coupon || subtotal <= 0) return 0;

  const value = Number(coupon.discountValue);
  if (!Number.isFinite(value) || value <= 0) return 0;

  // Below the coupon's minimum spend it simply does not apply.
  const min = coupon.minOrderAmount == null ? 0 : Number(coupon.minOrderAmount);
  if (min > 0 && subtotal < min) return 0;

  const raw =
    coupon.discountType === "PERCENTAGE"
      ? subtotal * (Math.min(value, 100) / 100)
      : value;

  return money(Math.min(raw, subtotal));
}

/**
 * The full breakdown for an order.
 *
 * Shipping is charged on the ORIGINAL subtotal, not the discounted one — a
 * coupon reduces what the customer pays for goods, it does not quietly earn
 * them free delivery by dropping the basket under the free-shipping threshold.
 */
export function calculateOrderTotals(input: {
  subtotal: number;
  coupon?: CouponLike | null;
  shippingBase: number;
  freeShippingThreshold: number;
}): OrderTotals {
  const subtotal = money(Math.max(0, Number(input.subtotal) || 0));
  const discount = calculateDiscount(subtotal, input.coupon);
  const shippingCost = money(
    computeShipping(subtotal, Number(input.shippingBase) || 0, Number(input.freeShippingThreshold) || 0)
  );

  return {
    subtotal,
    discount,
    shippingCost,
    total: money(Math.max(0, subtotal - discount) + shippingCost),
  };
}
