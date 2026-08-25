import { describe, expect, it } from "vitest";
import { parsePortfolio, PORTFOLIO_DEFAULTS } from "./portfolio";

/**
 * parsePortfolio is the gate between admin-submitted JSON and what the storefront
 * renders. It must never throw and must always return a valid, safe shape.
 */
describe("parsePortfolio", () => {
  it("returns a valid shape from empty/garbage input", () => {
    for (const bad of [null, undefined, 42, "x", [], {}]) {
      const p = parsePortfolio(bad);
      expect(Array.isArray(p.filters)).toBe(true);
      expect(Array.isArray(p.items)).toBe(true);
      expect(p.filters.some((f) => f.value === "all")).toBe(true); // always has "all"
    }
  });

  it("always guarantees an 'all' filter at the front", () => {
    const p = parsePortfolio({ filters: [{ value: "x", label: "X" }], items: [] });
    expect(p.filters[0].value).toBe("all");
  });

  it("drops items with no image or category", () => {
    const p = parsePortfolio({
      filters: [{ value: "all", label: "الكل" }, { value: "a", label: "A" }],
      items: [
        { id: "1", category: "a", img: "https://x/y.png", tag: "t", tagColor: "#fff", title: "ok" },
        { id: "2", category: "a", img: "", tag: "", tagColor: "#fff", title: "no image" },
      ],
    });
    expect(p.items).toHaveLength(1);
    expect(p.items[0].id).toBe("1");
  });

  it("reassigns an item pointing at a removed category to a valid one", () => {
    const p = parsePortfolio({
      filters: [{ value: "all", label: "الكل" }, { value: "keep", label: "K" }],
      items: [{ id: "1", category: "deleted", img: "https://x/y.png", tag: "t", tagColor: "#fff", title: "t" }],
    });
    expect(p.items[0].category).toBe("keep");
  });

  it("falls back to a safe colour for a malformed hex", () => {
    const p = parsePortfolio({
      filters: [{ value: "all", label: "الكل" }, { value: "a", label: "A" }],
      items: [{ id: "1", category: "a", img: "https://x/y.png", tag: "t", tagColor: "javascript:alert(1)", title: "t" }],
    });
    expect(p.items[0].tagColor).toBe("#ec205f");
  });

  it("treats enabled:false as disabled but anything else as enabled", () => {
    expect(parsePortfolio({ enabled: false }).enabled).toBe(false);
    expect(parsePortfolio({ enabled: true }).enabled).toBe(true);
    expect(parsePortfolio({}).enabled).toBe(true);
  });

  it("round-trips the shipped defaults unchanged", () => {
    const p = parsePortfolio(PORTFOLIO_DEFAULTS);
    expect(p.items).toHaveLength(PORTFOLIO_DEFAULTS.items.length);
    expect(p.filters).toHaveLength(PORTFOLIO_DEFAULTS.filters.length);
    expect(p.titleHighlight).toBe(PORTFOLIO_DEFAULTS.titleHighlight);
  });
});
