import { describe, expect, it } from "vitest";
import {
  esc,
  parseNajdConfig,
  defaultNajdConfig,
  renderNajdBlockHtml,
  isNajdType,
  NAJD_TYPES,
} from "./najd-blocks";

describe("esc", () => {
  it("escapes HTML-significant characters", () => {
    expect(esc(`<img src=x onerror=alert(1)>`)).toBe("&lt;img src=x onerror=alert(1)&gt;");
    expect(esc(`a & "b" 'c'`)).toBe("a &amp; &quot;b&quot; &#39;c&#39;");
  });
});

describe("isNajdType", () => {
  it("recognizes najd types and rejects others", () => {
    expect(isNajdType("najd_hero")).toBe(true);
    expect(isNajdType("custom_html")).toBe(false);
  });
});

describe("parseNajdConfig", () => {
  it("returns defaults for empty input on every type", () => {
    for (const t of NAJD_TYPES) {
      const c = parseNajdConfig(t, undefined);
      expect(c).toBeTruthy();
      const d = defaultNajdConfig(t);
      // A default parse should preserve the default card count.
      expect((c.cards || []).length).toBe((d.cards || []).length);
    }
  });

  it("sanitizes a malicious color to the fallback", () => {
    const c = parseNajdConfig("najd_services", {
      cards: [{ id: "1", title: "x", iconColor: "url(javascript:alert(1))" }],
    });
    expect(c.cards?.[0].iconColor).toBe("#ec205f");
  });

  it("keeps a valid hex/rgba color", () => {
    const c = parseNajdConfig("najd_hero", { cards: [{ id: "1", text: "t", tagColor: "#123abc" }] });
    expect(c.cards?.[0].tagColor).toBe("#123abc");
  });

  it("clamps overly long text", () => {
    const c = parseNajdConfig("najd_hero", { title: "x".repeat(500) });
    expect((c.title || "").length).toBeLessThanOrEqual(120);
  });
});

describe("renderNajdBlockHtml", () => {
  it("never emits an unescaped script from user text (XSS)", () => {
    const cfg = parseNajdConfig("najd_hero", {
      title: `<script>alert(1)</script>`,
      cards: [{ id: "1", text: `<img src=x onerror=alert(1)>`, tagColor: "#fff" }],
    });
    const html = renderNajdBlockHtml("najd_hero", cfg);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("onerror=alert(1)>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("rejects a javascript: href, replacing it with '#'", () => {
    const cfg = parseNajdConfig("najd_hero", { cta: { label: "go", link: "javascript:alert(1)" } });
    const html = renderNajdBlockHtml("najd_hero", cfg);
    expect(html).not.toContain("javascript:alert(1)");
    expect(html).toContain('href="#"');
  });

  it("allows a wa.me / https link through", () => {
    const cfg = parseNajdConfig("najd_services", { cta: { title: "t", label: "go", link: "https://wa.me/123" } });
    const html = renderNajdBlockHtml("najd_services", cfg);
    expect(html).toContain("https://wa.me/123");
  });

  it("renders a section element for each type", () => {
    for (const t of NAJD_TYPES) {
      expect(renderNajdBlockHtml(t)).toContain("<section");
    }
  });
});
