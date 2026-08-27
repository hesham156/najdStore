import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import Script from "next/script";

export const dynamic = "force-dynamic";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { DbKeepAlive } from "@/components/providers/DbKeepAlive";
import { PixelInjector } from "@/components/providers/PixelInjector";
import { Toaster } from "react-hot-toast";
import { Suspense } from "react";
import { getSeoConfig, organizationJsonLd, webSiteJsonLd } from "@/lib/seo";
import { getHayyakConfig } from "@/lib/hayyak";
import { BrandingProvider, DEFAULT_BRANDING } from "@/components/providers/BrandingProvider";
import { getSettings, BRANDING_DEFAULTS } from "@/lib/settings";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { getDirection, isLocale, localeHtmlLang, localeOpenGraph, defaultLocale } from "@/i18n/config";

// Load font via Next.js optimizer — bundled locally, zero external round-trip
// Only the weights the UI actually uses are loaded. 300 (font-light) and 800
// (font-extrabold) have zero references, so shipping them was two extra Arabic
// font files — a large payload — downloaded on every visit for nothing.
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
  variable: "--font-cairo",
  preload: true,
});

/**
 * Metadata is generated per request so the SEO settings screen actually
 * drives it. It used to be a hardcoded constant, which meant every share
 * card and search snippet advertised a placeholder store name.
 */
export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSeoConfig();
  // The browser-tab icon follows the store's own logo. There is no
  // favicon.ico shipped in /public, so hardcoding one left every tab showing
  // the browser's default globe. site_logo is either the bundled /logo.jpg or
  // the merchant's uploaded /uploads/… file. A missing DB must never take the
  // whole page's metadata down, so we fall back to the shipped default.
  let site_logo = BRANDING_DEFAULTS.site_logo;
  try {
    ({ site_logo } = await getSettings({ site_logo: BRANDING_DEFAULTS.site_logo }));
  } catch {
    /* keep the default */
  }
  const locale = await getLocale();
  const ogLocale = isLocale(locale) ? localeOpenGraph[locale] : localeOpenGraph[defaultLocale];

  const verification: Record<string, string> = {};
  if (cfg.googleVerification) verification.google = cfg.googleVerification;
  if (cfg.bingVerification) verification.other = cfg.bingVerification;

  return {
    metadataBase: new URL(cfg.siteUrl),
    title: { default: cfg.title, template: `%s | ${cfg.siteName}` },
    description: cfg.description,
    ...(cfg.keywords.length ? { keywords: cfg.keywords } : {}),
    authors: [{ name: cfg.siteName, url: cfg.siteUrl }],
    creator: cfg.siteName,
    publisher: cfg.siteName,
    robots: cfg.indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: ogLocale,
      url: cfg.siteUrl,
      siteName: cfg.siteName,
      title: cfg.ogTitle,
      description: cfg.ogDescription,
      ...(cfg.ogImage
        ? { images: [{ url: cfg.ogImage, width: 1200, height: 630, alt: cfg.siteName }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: cfg.ogTitle,
      description: cfg.ogDescription,
      ...(cfg.twitterHandle ? { site: cfg.twitterHandle, creator: cfg.twitterHandle } : {}),
      ...(cfg.ogImage ? { images: [cfg.ogImage] } : {}),
    },
    alternates: { canonical: cfg.siteUrl },
    ...(Object.keys(verification).length ? { verification } : {}),
    icons: { icon: site_logo, apple: site_logo },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = await getSeoConfig();

  // Locale + its matching text direction drive the <html> attributes, and the
  // messages feed every Client Component through NextIntlClientProvider.
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = getDirection(locale);
  const htmlLang = isLocale(locale) ? localeHtmlLang[locale] : localeHtmlLang[defaultLocale];

  // Read once here and share via context: `SiteLogo` appears in eight places
  // across both server and client trees.
  const brandingKeys = {
    site_name: BRANDING_DEFAULTS.site_name,
    site_logo: BRANDING_DEFAULTS.site_logo,
    site_tagline: BRANDING_DEFAULTS.site_tagline,
  };
  const branding = await getSettings(brandingKeys).catch(() => brandingKeys);

  // The on-site chat bubble is driven by the SAME Hayyak settings as the data
  // push, so the storeId/endpoint can never drift out of sync (a hardcoded
  // storeId is exactly what made the widget report "not connected"). The bubble
  // only renders while the integration is enabled.
  const hayyak = await getHayyakConfig();

  // One @graph rather than two loose blocks: it lets the WebSite reference the
  // Organization by @id, so a crawler reads one connected entity instead of
  // two strangers that happen to share a name.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(cfg), webSiteJsonLd(cfg)],
  };

  return (
    <html lang={htmlLang} dir={dir} suppressHydrationWarning className={cairo.variable}>
      <head>
        <meta name="theme-color" content="#7c3aed" />
        <meta name="color-scheme" content="light dark" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}>
        <NextIntlClientProvider locale={locale} messages={messages}>
        <SessionProvider>
          <BrandingProvider
            value={{
              logoUrl: branding.site_logo || DEFAULT_BRANDING.logoUrl,
              siteName: branding.site_name || DEFAULT_BRANDING.siteName,
              tagline: branding.site_tagline || "",
            }}
          >
          <ThemeProvider>
            <DbKeepAlive />
            <Suspense fallback={null}><PixelInjector /></Suspense>
            {children}
            {/* حياك — فقاعة المحادثة على الموقع (بنفس إعداد التكامل) */}
            {hayyak.enabled && hayyak.storeId && (
              <>
                <Script id="hayyak-config" strategy="afterInteractive">
                  {`window.SallaChatConfig = ${JSON.stringify({
                    storeId: hayyak.storeId,
                    apiUrl: hayyak.baseUrl,
                    primaryColor: "#7c3aed",
                    storeName: cfg.siteName,
                  })};`}
                </Script>
                <Script src={`${hayyak.baseUrl}/widget.js`} strategy="afterInteractive" />
              </>
            )}
            <Toaster
              // Top, not bottom: a bottom toast sat on top of the cart drawer's
              // fixed footer (total + "إتمام الشراء") on mobile, where the drawer
              // is full-width — covering the most important CTA. Anchoring at the
              // top keeps the checkout button always tappable.
              position="top-center"
              containerStyle={{ top: 72 }}
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: "var(--font-cairo), 'Cairo', sans-serif",
                  direction: dir,
                  borderRadius: "12px",
                  maxWidth: "92vw",
                },
                success: { style: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" } },
                error: { style: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" } },
              }}
            />
          </ThemeProvider>
          </BrandingProvider>
        </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
