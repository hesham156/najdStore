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
import { BrandingProvider, DEFAULT_BRANDING } from "@/components/providers/BrandingProvider";
import { getSettings, BRANDING_DEFAULTS } from "@/lib/settings";

// Load font via Next.js optimizer — bundled locally, zero external round-trip
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
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
      locale: "ar_SA",
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
    icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = await getSeoConfig();

  // Read once here and share via context: `SiteLogo` appears in eight places
  // across both server and client trees.
  const brandingKeys = {
    site_name: BRANDING_DEFAULTS.site_name,
    site_logo: BRANDING_DEFAULTS.site_logo,
    site_tagline: BRANDING_DEFAULTS.site_tagline,
  };
  const branding = await getSettings(brandingKeys).catch(() => brandingKeys);

  // One @graph rather than two loose blocks: it lets the WebSite reference the
  // Organization by @id, so a crawler reads one connected entity instead of
  // two strangers that happen to share a name.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [organizationJsonLd(cfg), webSiteJsonLd(cfg)],
  };

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={cairo.variable}>
      <head>
        <meta name="theme-color" content="#7c3aed" />
        <meta name="color-scheme" content="light dark" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}>
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
            {/* حياك — فقاعة المحادثة على الموقع */}
            <Script id="hayyak-config" strategy="afterInteractive">
              {`window.SallaChatConfig = {
    storeId: "pexelco",
    apiUrl: "https://7ayak.app",
    primaryColor: "#7c3aed",
    storeName: "${cfg.siteName}"
  };`}
            </Script>
            <Script src="https://7ayak.app/widget.js" strategy="afterInteractive" />
            <Toaster
              position="bottom-left"
              toastOptions={{
                duration: 4000,
                style: {
                  fontFamily: "var(--font-cairo), 'Cairo', sans-serif",
                  direction: "rtl",
                  borderRadius: "12px",
                },
                success: { style: { background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0" } },
                error: { style: { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" } },
              }}
            />
          </ThemeProvider>
          </BrandingProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
