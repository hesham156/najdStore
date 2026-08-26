import type { Metadata } from "next";
import { getSeoConfig } from "@/lib/seo";
import { HomeSections } from "@/components/store/HomeSections";
import { getActiveCategories, getFeaturedProducts, getRecentProducts } from "@/lib/queries";
import { getBranding } from "@/lib/settings";
import { getHomeSections } from "@/lib/home-layout";
import { getLocale } from "next-intl/server";
import { isLocale, localeOpenGraph, defaultLocale, type Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";


/** Copy shipped with the app; used until the merchant fills in SEO settings. */
const FALLBACK_TITLE = "نجد برنت | متخصصون في التغليف والطباعة الفاخرة";
const FALLBACK_DESC =
  "من الصناديق الفاخرة إلى المطبوعات التجارية الدقيقة — نجد برنت تقدم حلول طباعة وتغليف متكاملة بأعلى معايير الجودة. طباعة أوفست، ديجيتال، إندور وأوت دور.";
const FALLBACK_KEYWORDS = [
  "نجد برنت", "طباعة", "تغليف", "طباعة ديجيتال", "استيكرات", "مطبوعات", "السعودية",
];

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSeoConfig();
  const locale = (await getLocale()) as Locale;
  const ogLocale = isLocale(locale) ? localeOpenGraph[locale] : localeOpenGraph[defaultLocale];

  // Settings win when set; the hand-written copy above is the floor.
  const title = cfg.title !== cfg.siteName ? cfg.title : FALLBACK_TITLE;
  const description = cfg.description || FALLBACK_DESC;

  return {
    title,
    description,
    keywords: cfg.keywords.length ? cfg.keywords : FALLBACK_KEYWORDS,
    alternates: { canonical: cfg.siteUrl },
    openGraph: {
      title: cfg.ogTitle || title,
      description: cfg.ogDescription || description,
      url: cfg.siteUrl,
      siteName: cfg.siteName,
      locale: ogLocale,
      type: "website",
      ...(cfg.ogImage
        ? { images: [{ url: cfg.ogImage, width: 1200, height: 630, alt: cfg.siteName }] }
        : {}),
    },
  };
}

export default async function HomePage() {
  const [sections, categories, featured, recent, branding] = await Promise.all([
    getHomeSections(),
    getActiveCategories(),
    getFeaturedProducts(),
    getRecentProducts(),
    getBranding(),
  ]);

  return (
    <div className="min-h-screen">
      <HomeSections
        sections={sections}
        data={{ categories: categories as never, featured, recent, branding: branding as unknown as Record<string, string> }}
      />
    </div>
  );
}
