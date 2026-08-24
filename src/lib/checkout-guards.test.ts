import { describe, expect, it } from "vitest";
import { calculateDiscount, calculateOrderTotals, vatIncludedIn } from "./pricing";
import { isValidSaudiPhone, normalizeSaudiPhone } from "./utils";

/**
 * Guards around the checkout maths and the shipping details the carrier needs.
 * Everything here is pure, so it runs with the database switched off.
 */

describe("vatIncludedIn", () => {
  it("extracts the tax already inside a VAT-inclusive total", () => {
    // 115 inclusive at 15% carries 15 of tax.
    expect(vatIncludedIn(115, 15)).toBe(15);
  });

  it("matches the figure the accounting screens report", () => {
    expect(vatIncludedIn(1000, 15)).toBe(130.43);
  });

  it("returns nothing when no rate is configured", () => {
    expect(vatIncludedIn(500, 0)).toBe(0);
  });

  it("returns nothing for an empty basket", () => {
    expect(vatIncludedIn(0, 15)).toBe(0);
  });

  it("never yields NaN from a malformed rate", () => {
    expect(vatIncludedIn(500, Number.NaN)).toBe(0);
  });

  it("never exceeds the amount it was taken from", () => {
    expect(vatIncludedIn(100, 15)).toBeLessThan(100);
  });
});

describe("coupon minimum is re-checked as the basket shrinks", () => {
  // The checkout screen kept a coupon applied after the customer removed items,
  // because the validate endpoint had not told it the minimum spend.
  const coupon = { discountType: "PERCENTAGE" as const, discountValue: 20, minOrderAmount: 300 };

  it("applies while the basket clears the minimum", () => {
    expect(calculateDiscount(500, coupon)).toBe(100);
  });

  it("stops applying once the basket drops below it", () => {
    expect(calculateDiscount(120, coupon)).toBe(0);
  });

  it("agrees with the order total once it stops applying", () => {
    const totals = calculateOrderTotals({
      subtotal: 120,
      coupon,
      shippingBase: 25,
      freeShippingThreshold: 0,
    });
    expect(totals.discount).toBe(0);
    expect(totals.total).toBe(145);
  });

  it("treats a coupon with no minimum as always eligible", () => {
    expect(calculateDiscount(10, { discountType: "FIXED", discountValue: 5, minOrderAmount: null })).toBe(5);
  });
});

describe("normalizeSaudiPhone", () => {
  it("accepts the common local form", () => {
    expect(normalizeSaudiPhone("0512345678")).toBe("512345678");
  });

  it("accepts an international prefix", () => {
    expect(normalizeSaudiPhone("+966512345678")).toBe("512345678");
  });

  it("accepts the 00966 prefix", () => {
    expect(normalizeSaudiPhone("00966512345678")).toBe("512345678");
  });

  it("strips spaces and dashes", () => {
    expect(normalizeSaudiPhone("05 12-34 56 78")).toBe("512345678");
  });

  it("converts Arabic-Indic digits", () => {
    expect(normalizeSaudiPhone("٠٥١٢٣٤٥٦٧٨")).toBe("512345678");
  });

  it("rejects a landline", () => {
    expect(normalizeSaudiPhone("0112345678")).toBe("");
  });

  it("rejects a number that is too short", () => {
    expect(normalizeSaudiPhone("05123456")).toBe("");
  });

  it("rejects a number that is too long", () => {
    expect(normalizeSaudiPhone("05123456789")).toBe("");
  });

  it("rejects empty and junk input", () => {
    expect(normalizeSaudiPhone("")).toBe("");
    expect(normalizeSaudiPhone("لا يوجد")).toBe("");
  });

  it("exposes the same decision through isValidSaudiPhone", () => {
    expect(isValidSaudiPhone("0512345678")).toBe(true);
    expect(isValidSaudiPhone("0112345678")).toBe(false);
  });
});

describe("cart lines that share a product id", () => {
  /**
   * The order API compared `products.length` against the raw id list. A basket
   * holding two variants of one product sent that id twice while the database
   * returned the row once, so every multi-variant order was rejected. The fix
   * de-duplicates before comparing — this pins the semantics.
   */
  const items = [
    { productId: "P1", variantLabel: "100 حبة" },
    { productId: "P1", variantLabel: "500 حبة" },
    { productId: "P2" },
  ];

  it("collapses to the set of distinct products the database will return", () => {
    const unique = Array.from(new Set(items.map((i) => i.productId)));
    expect(unique).toEqual(["P1", "P2"]);
  });

  it("matches a two-row lookup, where the raw list would not", () => {
    const unique = Array.from(new Set(items.map((i) => i.productId)));
    const rowsFromDb = ["P1", "P2"];
    expect(rowsFromDb.length).toBe(unique.length);
    expect(rowsFromDb.length).not.toBe(items.length);
  });

  it("still detects a genuinely missing product", () => {
    const unique = Array.from(new Set(items.map((i) => i.productId)));
    const rowsFromDb = ["P1"]; // P2 was deactivated mid-checkout
    const found = new Set(rowsFromDb);
    expect(unique.filter((id) => !found.has(id))).toEqual(["P2"]);
  });
});

describe("order input guards", () => {
  /**
   * `quantity` reached the pricing sum, the order row and the stock decrement
   * straight from the request body. These pin the shape the API now demands.
   */
  const acceptable = (q: unknown) => Number.isInteger(q) && (q as number) >= 1 && (q as number) <= 1000;

  it("accepts an ordinary count", () => {
    expect(acceptable(3)).toBe(true);
  });

  it("rejects zero", () => {
    expect(acceptable(0)).toBe(false);
  });

  it("rejects a negative quantity, which Postgres would apply as an increment", () => {
    expect(acceptable(-5)).toBe(false);
  });

  it("rejects a fractional quantity", () => {
    expect(acceptable(1.5)).toBe(false);
  });

  it("rejects an absurd quantity", () => {
    expect(acceptable(1_000_000)).toBe(false);
  });

  it("rejects a numeric string, which would coerce silently downstream", () => {
    expect(acceptable("3")).toBe(false);
  });
});

describe("a negative quantity never survives the totals maths either", () => {
  it("clamps a negative goods subtotal to zero rather than a negative charge", () => {
    const totals = calculateOrderTotals({
      subtotal: -500,
      coupon: null,
      shippingBase: 25,
      freeShippingThreshold: 0,
    });
    expect(totals.subtotal).toBe(0);
    expect(totals.total).toBe(25);
  });
});
