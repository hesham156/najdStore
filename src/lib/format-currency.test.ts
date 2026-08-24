import { describe, expect, it } from "vitest";
import { formatCurrency } from "./utils";

/**
 * Money on screen. The formatter used to be a bare `toFixed(2)`, which printed
 * a six-figure order as "1234567.89 ر.س" and turned a malformed price into the
 * literal text "NaN ر.س" beside an Add-to-cart button.
 */
describe("formatCurrency", () => {
  it("groups thousands so a large total stays readable", () => {
    expect(formatCurrency(1234567.89)).toBe("1,234,567.89 ر.س");
  });

  it("keeps two decimals on a whole number", () => {
    expect(formatCurrency(50)).toBe("50.00 ر.س");
  });

  it("leaves small amounts ungrouped", () => {
    expect(formatCurrency(999.5)).toBe("999.50 ر.س");
  });

  it("accepts the string prices Prisma Decimals serialize into", () => {
    expect(formatCurrency("1500.5")).toBe("1,500.50 ر.س");
  });

  it("renders zero rather than NaN for an unparseable price", () => {
    expect(formatCurrency("not-a-price")).toBe("0.00 ر.س");
  });

  it("honours a custom symbol", () => {
    expect(formatCurrency(20, "USD", "$")).toBe("20.00 $");
  });

  it("supports three-decimal currencies", () => {
    expect(formatCurrency(12.3456, "KWD", "د.ك", 3)).toBe("12.346 د.ك");
  });

  it("rounds to the requested precision instead of truncating", () => {
    expect(formatCurrency(0.005)).toBe("0.01 ر.س");
  });
});
