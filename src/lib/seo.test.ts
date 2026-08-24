import { describe, expect, it } from "vitest";
import { normalizeUrl, organizationJsonLd, webSiteJsonLd, type SeoConfig } from "./seo";

describe("normalizeUrl", () => {
  it("adds a scheme when the merchant typed a bare domain", () => {
    expect(normalizeUrl("najdprint.com")).toBe("https://najdprint.com");
  });

  it("strips paths, queries and trailing slashes down to the origin", () => {
    expect(normalizeUrl("https://shop.example.com/products?a=1")).toBe("https://shop.example.com");
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com");
  });

  it("keeps a non-default port", () => {
    expect(normalizeUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("returns empty for blank or unusable input rather than a broken URL", () => {
    expect(normalizeUrl("")).toBe("");
    expect(normalizeUrl("   ")).toBe("");
    expect(normalizeUrl("http://")).toBe("");
  });
});

const cfg = (over: Partial<SeoConfig> = {}): SeoConfig => ({
  siteName: "نجد برنت",
  siteUrl: "https://najdprint.com",
  title: "نجد برنت",
  description: "طباعة وتغليف",
  keywords: [],
  ogTitle: "نجد برنت",
  ogDescription: "طباعة وتغليف",
  ogImage: "",
  twitterHandle: "",
  googleVerification: "",
  bingVerification: "",
  indexable: true,
  aiPolicy: "answers",
  aiSummary: "",
  legalName: "",
  phone: "",
  email: "",
  address: { street: "", city: "", region: "", postal: "", country: "SA" },
  hasAddress: false,
  founded: "",
  sameAs: [],
  returnDays: null,
  ...over,
});

describe("organizationJsonLd", () => {
  it("omits optional fields rather than emitting them empty", () => {
    // A half-filled entity is worse than a small correct one: an empty
    // telephone or address actively misleads a crawler.
    const node = organizationJsonLd(cfg());
    for (const key of ["legalName", "logo", "foundingDate", "sameAs", "contactPoint", "address"]) {
      expect(node).not.toHaveProperty(key);
    }
    expect(node).toMatchObject({ "@type": "OnlineStore", name: "نجد برنت" });
  });

  it("includes contact details once they exist", () => {
    const node = organizationJsonLd(cfg({ phone: "+966500000000", email: "a@b.co" }));
    expect(node.contactPoint).toMatchObject({
      "@type": "ContactPoint",
      telephone: "+966500000000",
      email: "a@b.co",
    });
  });

  it("builds a postal address only when there is one", () => {
    const node = organizationJsonLd(
      cfg({ hasAddress: true, address: { street: "", city: "الرياض", region: "", postal: "", country: "SA" } })
    );
    expect(node.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "الرياض",
      addressCountry: "SA",
    });
  });

  it("carries no @context of its own, since it lives inside an @graph", () => {
    expect(organizationJsonLd(cfg())).not.toHaveProperty("@context");
    expect(webSiteJsonLd(cfg())).not.toHaveProperty("@context");
  });

  it("links the website to the organization by @id", () => {
    const org = organizationJsonLd(cfg());
    const site = webSiteJsonLd(cfg());
    expect(site.publisher).toEqual({ "@id": org["@id"] });
  });
});
