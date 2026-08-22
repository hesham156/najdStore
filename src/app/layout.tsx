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

// Load font via Next.js optimizer — bundled locally, zero external round-trip
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-cairo",
  preload: true,
});

const rawUrl = process.env.NEXTAUTH_URL || "https://yourstore.com";
const siteUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
const siteName = "متجرك الإلكتروني";
const siteDesc = "متجرك الموثوق لأفضل المنتجات والخدمات بأسعار مناسبة، تسليم سريع، وتجربة شراء سلسة وآمنة في السعودية والخليج";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDesc,
  keywords: [
    "متجر إلكتروني", "تسوق أونلاين", "منتجات",
    "خدمات", "أفضل الأسعار", "تسليم سريع",
    "متجر السعودية", "تسوق الخليج",
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: siteUrl,
    siteName,
    title: siteName,
    description: siteDesc,
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: siteName }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDesc,
    images: [`${siteUrl}/og-image.png`],
  },
  alternates: { canonical: siteUrl },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: siteUrl,
    description: siteDesc,
    inLanguage: "ar",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/products?search={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
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
    storeName: "${siteName}"
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
        </SessionProvider>
      </body>
    </html>
  );
}
