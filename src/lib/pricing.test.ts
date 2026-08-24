import { describe, expect, it } from "vitest";
import { calculateDiscount, calculateOrderTotals } from "./pricing";

describe("calculateDiscount", () => {
  it("takes a percentage off the subtotal", () => {
    expect(calculateDiscount(200, { discountType: "PERCENTAGE", discountValue: 10 })).toBe(20);
  });

  it("takes a fixed amount off the subtotal", () => {
    expect(calculateDiscount(200, { discountType: "FIXED", discountValue: 30 })).toBe(30);
  });

  it("never discounts more than the basket is worth", () => {
    // The old inline version returned the full 200, so the summary could show
    // a bigger discount than the order total.
    expect(calculateDiscount(50, { discountType: "FIXED", discountValue: 200 })).toBe(50);
  });

  it("caps a misconfigured percentage at 100%", () => {
    expect(calculateDiscount(80, { discountType: "PERCENTAGE", discountValue: 150 })).toBe(80);
  });

  it("does not apply below the coupon's minimum spend", () => {
    const coupon = { discountType: "FIXED" as const, discountValue: 25, minOrderAmount: 100 };
    expect(calculateDiscount(99.99, coupon)).toBe(0);
    expect(calculateDiscount(100, coupon)).toBe(25);
  });

  it("ignores a missing, zero or negative coupon", () => {
    expect(calculateDiscount(100, null)).toBe(0);
    expect(calculateDiscount(100, undefined)).toBe(0);
    expect(calculateDiscount(100, { discountType: "FIXED", discountValue: 0 })).toBe(0);
    expect(calculateDiscount(100, { discountType: "FIXED", discountValue: -50 })).toBe(0);
  });

  it("returns nothing for an empty basket", () => {
    expect(calculateDiscount(0, { discountType: "PERCENTAGE", discountValue: 50 })).toBe(0);
  });

  it("rounds to two decimals rather than leaking float error", () => {
    // 0.1 + 0.2 territory: 33.33 * 0.15 = 4.9995
    expect(calculateDiscount(33.33, { discountType: "PERCENTAGE", discountValue: 15 })).toBe(5);
  });
});

describe("calculateOrderTotals", () => {
  const base = { shippingBase: 25, freeShippingThreshold: 300 };

  it("adds shipping to a plain order", () => {
    expect(calculateOrderTotals({ subtotal: 100, ...base })).toEqual({
      subtotal: 100,
      discount: 0,
      shippingCost: 25,
      total: 125,
    });
  });

  it("waives shipping once the threshold is met", () => {
    expect(calculateOrderTotals({ subtotal: 300, ...base })).toMatchObject({
      shippingCost: 0,
      total: 300,
    });
  });

  it("charges no shipping when no fee is configured", () => {
    expect(
      calculateOrderTotals({ subtotal: 100, shippingBase: 0, freeShippingThreshold: 0 })
    ).toMatchObject({ shippingCost: 0, total: 100 });
  });

  it("keeps free shipping earned before the coupon was applied", () => {
    // A 350 basket has already earned free delivery. A 100 coupon must not
    // drag it under the threshold and re-introduce a shipping charge.
    expect(
      calculateOrderTotals({
        subtotal: 350,
        coupon: { discountType: "FIXED", discountValue: 100 },
        ...base,
      })
    ).toEqual({ subtotal: 350, discount: 100, shippingCost: 0, total: 250 });
  });

  it("never returns a negative total", () => {
    expect(
      calculateOrderTotals({
        subtotal: 40,
        coupon: { discountType: "FIXED", discountValue: 500 },
        shippingBase: 0,
        freeShippingThreshold: 0,
      })
    ).toEqual({ subtotal: 40, discount: 40, shippingCost: 0, total: 0 });
  });

  it("still charges shipping when a coupon zeroes the goods", () => {
    expect(
      calculateOrderTotals({
        subtotal: 40,
        coupon: { discountType: "PERCENTAGE", discountValue: 100 },
        ...base,
      })
    ).toEqual({ subtotal: 40, discount: 40, shippingCost: 25, total: 25 });
  });

  it("treats a malformed subtotal as an empty basket", () => {
    expect(calculateOrderTotals({ subtotal: NaN, ...base }).total).toBe(25);
    expect(calculateOrderTotals({ subtotal: -10, ...base }).subtotal).toBe(0);
  });

  it("produces a total that is exact to the halala", () => {
    const { total } = calculateOrderTotals({
      subtotal: 19.99,
      coupon: { discountType: "PERCENTAGE", discountValue: 33 },
      shippingBase: 15,
      freeShippingThreshold: 0,
    });
    // 19.99 - 6.60 + 15 — must not come back as 28.389999999999997
    expect(total).toBe(28.39);
    expect(Number.isInteger(total * 100)).toBe(true);
  });
});
