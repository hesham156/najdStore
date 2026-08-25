import { describe, expect, it } from "vitest";
import { planRefund, AUTO_REFUND_METHODS } from "./refunds";

/**
 * The refund maths decide how much money leaves the store and whether a payment
 * is now fully cleared. Pure, so it runs with the database and gateway off.
 */
describe("planRefund", () => {
  it("defaults to the full remaining balance", () => {
    const p = planRefund(100, 0, null);
    expect(p.amount).toBe(100);
    expect(p.isFull).toBe(true);
    expect(p.newRefundedTotal).toBe(100);
  });

  it("handles a partial refund without clearing the payment", () => {
    const p = planRefund(100, 0, 30);
    expect(p.amount).toBe(30);
    expect(p.isFull).toBe(false);
    expect(p.newRefundedTotal).toBe(30);
  });

  it("accounts for a prior partial refund", () => {
    const p = planRefund(100, 30, 70);
    expect(p.amount).toBe(70);
    expect(p.isFull).toBe(true);
    expect(p.newRefundedTotal).toBe(100);
  });

  it("defaulting after a partial refund returns only the remainder", () => {
    const p = planRefund(100, 40, null);
    expect(p.amount).toBe(60);
    expect(p.isFull).toBe(true);
  });

  it("rejects a refund once the payment is fully refunded", () => {
    expect(() => planRefund(100, 100, null)).toThrow();
    expect(() => planRefund(100, 100, 10)).toThrow();
  });

  it("rejects an amount larger than what remains", () => {
    expect(() => planRefund(100, 80, 30)).toThrow();
  });

  it("rejects zero and negative amounts", () => {
    expect(() => planRefund(100, 0, 0)).toThrow();
    expect(() => planRefund(100, 0, -5)).toThrow();
  });

  it("rejects a refund with nothing paid", () => {
    expect(() => planRefund(0, 0, null)).toThrow();
  });

  it("clamps a full request expressed with rounding drift", () => {
    // Requesting a hair over the balance (rounding) is treated as a full refund.
    const p = planRefund(100, 0, 100.004);
    expect(p.amount).toBe(100);
    expect(p.isFull).toBe(true);
  });

  it("treats a sub-halala remainder as fully refunded", () => {
    const p = planRefund(99.99, 99.98, null);
    expect(p.isFull).toBe(true);
  });
});

describe("auto vs manual refund routing", () => {
  // Only the gateways we can drive by API refund automatically; the rest are
  // recorded and completed by an admin in the provider portal. A regression here
  // would either move real money for an unsupported method or silently skip a
  // gateway call for a supported one.
  it("drives Moyasar (card) and PayPal automatically", () => {
    expect(AUTO_REFUND_METHODS).toContain("CREDIT_CARD");
    expect(AUTO_REFUND_METHODS).toContain("PAYPAL");
  });

  it("does NOT auto-refund Tamara, bank transfer, crypto, or tabby", () => {
    expect(AUTO_REFUND_METHODS).not.toContain("TAMARA");
    expect(AUTO_REFUND_METHODS).not.toContain("BANK_TRANSFER");
    expect(AUTO_REFUND_METHODS).not.toContain("CRYPTO");
    expect(AUTO_REFUND_METHODS).not.toContain("TABBY");
  });
});
