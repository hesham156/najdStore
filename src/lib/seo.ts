import { cache as reactCache } from "react";
import { getSettings } from "@/lib/settings";

// React's `cache` exists only in the Server Components runtime. Fall back to a
// pass-through in plain Node (unit tests) so this module still loads there.
const perRequestCache: <A extends unknown[], R>(fn: (...args: A) => R) => (...args: A) => R =
  typeof reactCache === "function" ? reactCache : (fn) => fn;

/**
 * ══════════════════════════════════════════════════════════════
 *  SEO / AI-discoverability configuration.
 * ══════════════════════════════════════════════════════════════
 *
 *  One place resolves every SEO value from the database, so the SEO
 *  settings screen actually drives the site instead of writing rows
 *  nothing reads.
 *
 *  Everything falls back to a sane default, which means an empty
 *  settings table still produces a valid, indexable site.
 */

export const SEO_DEFAULTS = {
  seo_site_name: "",
  seo_site_url: "",
  seo_meta_title: "",
  seo_meta_description: "",
  seo_meta_keywords: "",

  seo_og_title: "",
  seo_og_description: "",
  seo_og_image: "",
  seo_twitter_handle: "",

  seo_google_verification: "",
  seo_bing_verification: "",

  /** "true" lets search engines index the site; anything else blocks them. */
  seo_robots_index: "true",

  /**
   * How AI crawlers are treated:
   *   open     – everything allowed, including model training
   *   answers  – answer engines and user-initiated fetches only, no training
   *   blocked  – no AI crawler may read the site
   */
  seo_ai_policy: "answers",

  /** Free-text summary written FOR an AI to read. Drives /llms.txt. */
  seo_ai_summary: "",

  /* ── Business identity: what an answer engine needs to name and trust you ── */
  seo_business_legal_name: "",
  seo_business_phone: "",
  seo_business_email: "",
  seo_business_street: "",
  seo_business_city: "",
  seo_business_region: "",
  seo_business_postal: "",
  seo_business_country: "SA",
  seo_business_founded: "",
  /** One profile URL per line — becomes schema.org `sameAs`. */
  seo_social_profiles: "",
  /** Days a customer may return an item; drives the product return policy. */
  seo_return_days: "",
} as const;

export type SeoSettings = { [K in keyof typeof SEO_DEFAULTS]: string };

export type AiPolicy = "open" | "answers" | "blocked";

export interface SeoConfig {
  siteName: string;
  siteUrl: string;
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterHandle: string;
  googleVerification: string;
  bingVerification: string;
  indexable: boolean;
  aiPolicy: AiPolicy;
  aiSummary: string;
  legalName: string;
  phone: string;
  email: string;
  address: { street: string; city: string; region: string; postal: string; country: string };
  hasAddress: boolean;
  founded: string;
  sameAs: string[];
  returnDays: number | null;
}

const FALLBACK_NAME = "متجرك الإلكتروني";
const FALLBACK_DESC =
  "متجر إلكتروني يقدّم منتجات وخدمات بأسعار مناسبة وتسليم سريع وتجربة شراء سلسة وآمنة.";

/** Normalises whatever the merchant typed into an absolute origin, no trailing slash. */
export function normalizeUrl(raw: string): string {
  const value = (raw || "").trim();
  if (!value) return "";
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return "";
  }
}

/** Shipped with the app, so it always resolves. */
const FALLBACK_OG_IMAGE = "/logo.jpg";

/** Leaves absolute URLs alone; roots relative ones at the site origin. */
function absoluteUrl(path: string, origin: string): string {
  const value = (path || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${origin}${value.startsWith("/") ? "" : "/"}${value}`;
}

function envSiteUrl(): string {
  return normalizeUrl(process.env.NEXTAUTH_URL || "") || "https://yourstore.com";
}

const splitLines = (raw: string) =>
  (raw || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);

const asPolicy = (raw: string): AiPolicy =>
  raw === "open" || raw === "blocked" || raw === "answers" ? raw : "answers";

/** Resolves the settings table into a complete, always-valid config. */
// Wrapped in React `cache()` so the many callers in one render — the root
// layout's generateMetadata AND body, each product/category page's metadata AND
// its JSON-LD builder — collapse to a single settings read per request instead
// of a fresh DB round-trip every time.
export const getSeoConfig = perRequestCache(async function getSeoConfig(): Promise<SeoConfig> {
  let s: SeoSettings;
  try {
    s = await getSettings({ ...SEO_DEFAULTS });
  } catch {
    // A missing database must never take the whole site down.
    s = { ...SEO_DEFAULTS };
  }

  // The store's own name is the better fallback than a placeholder.
  let storeName = s.seo_site_name.trim();
  if (!storeName) {
    try {
      const { site_name } = await getSettings({ site_name: FALLBACK_NAME });
      storeName = site_name;
    } catch {
      storeName = FALLBACK_NAME;
    }
  }

  const siteUrl = normalizeUrl(s.seo_site_url) || envSiteUrl();
  const description = s.seo_meta_description.trim() || FALLBACK_DESC;
  const title = s.seo_meta_title.trim() || storeName;

  const address = {
    street: s.seo_business_street.trim(),
    city: s.seo_business_city.trim(),
    region: s.seo_business_region.trim(),
    postal: s.seo_business_postal.trim(),
    country: s.seo_business_country.trim() || "SA",
  };

  const returnDays = parseInt(s.seo_return_days, 10);

  return {
    siteName: storeName,
    siteUrl,
    title,
    description,
    keywords: splitLines(s.seo_meta_keywords),
    ogTitle: s.seo_og_title.trim() || title,
    ogDescription: s.seo_og_description.trim() || description,
    // Crawlers ignore relative OG images, so everything is resolved to an
    // absolute URL. Falling back to the shipped logo keeps share cards from
    // pointing at a 404 before the merchant uploads a proper 1200x630 image.
    ogImage: absoluteUrl(s.seo_og_image.trim() || FALLBACK_OG_IMAGE, siteUrl),
    twitterHandle: s.seo_twitter_handle.trim(),
    googleVerification: s.seo_google_verification.trim(),
    bingVerification: s.seo_bing_verification.trim(),
    indexable: s.seo_robots_index !== "false",
    aiPolicy: asPolicy(s.seo_ai_policy),
    aiSummary: s.seo_ai_summary.trim(),
    legalName: s.seo_business_legal_name.trim(),
    phone: s.seo_business_phone.trim(),
    email: s.seo_business_email.trim(),
    address,
    hasAddress: Boolean(address.street || address.city),
    founded: s.seo_business_founded.trim(),
    sameAs: splitLines(s.seo_social_profiles).filter((u) => /^https?:\/\//i.test(u)),
    returnDays: Number.isFinite(returnDays) && returnDays > 0 ? returnDays : null,
  };
});

/**
 * The store as a schema.org entity. Returned WITHOUT `@context` — these are
 * meant to sit inside an `@graph` that carries the context once.
 *
 * This is the block that lets an answer engine say "X sells Y, here is how to
 * reach them" instead of guessing. Optional fields are omitted rather than
 * emitted empty — a half-filled entity is worse than a small correct one.
 */
export function organizationJsonLd(cfg: SeoConfig) {
  const node: Record<string, unknown> = {
    "@type": "OnlineStore",
    "@id": `${cfg.siteUrl}/#organization`,
    name: cfg.siteName,
    url: cfg.siteUrl,
    description: cfg.description,
    inLanguage: "ar",
  };

  if (cfg.legalName) node.legalName = cfg.legalName;
  if (cfg.ogImage) node.logo = cfg.ogImage;
  if (cfg.ogImage) node.image = cfg.ogImage;
  if (cfg.founded) node.foundingDate = cfg.founded;
  if (cfg.sameAs.length) node.sameAs = cfg.sameAs;

  if (cfg.phone || cfg.email) {
    node.contactPoint = {
      "@type": "ContactPoint",
      contactType: "customer support",
      ...(cfg.phone ? { telephone: cfg.phone } : {}),
      ...(cfg.email ? { email: cfg.email } : {}),
      availableLanguage: ["ar", "en"],
    };
  }

  if (cfg.hasAddress) {
    node.address = {
      "@type": "PostalAddress",
      ...(cfg.address.street ? { streetAddress: cfg.address.street } : {}),
      ...(cfg.address.city ? { addressLocality: cfg.address.city } : {}),
      ...(cfg.address.region ? { addressRegion: cfg.address.region } : {}),
      ...(cfg.address.postal ? { postalCode: cfg.address.postal } : {}),
      addressCountry: cfg.address.country,
    };
  }

  return node;
}

/** The site itself, with the search action answer engines use to query it. */
export function webSiteJsonLd(cfg: SeoConfig) {
  return {
    "@type": "WebSite",
    "@id": `${cfg.siteUrl}/#website`,
    name: cfg.siteName,
    url: cfg.siteUrl,
    description: cfg.description,
    inLanguage: "ar",
    publisher: { "@id": `${cfg.siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${cfg.siteUrl}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
