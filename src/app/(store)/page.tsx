import type { Metadata } from "next";
import { HomeSections } from "@/components/store/HomeSections";
import { getActiveCategories, getFeaturedProducts, getRecentProducts } from "@/lib/queries";
import { getBranding } from "@/lib/settings";
import { getHomeSections } from "@/lib/home-layout";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXTAUTH_URL || "https://yourstore.com";
const siteName = "نجد برنت";

export const metadata: Metadata = {
  title: `نجد برنت | متخصصون في التغليف والطباعة الفاخرة`,
  description:
    "من الصناديق الفاخرة إلى المطبوعات التجارية الدقيقة — نجد برنت تقدم حلول طباعة وتغليف متكاملة بأعلى معايير الجودة. طباعة أوفست، ديجيتال، إندور وأوت دور.",
  keywords: ["نجد برنت", "طباعة", "تغليف", "طباعة ديجيتال", "استيكرات", "مطبوعات", "السعودية"],
  alternates: { canonical: siteUrl },
  openGraph: {
    title: siteName,
    description: "حلول الطباعة والتغليف الفاخر بأعلى معايير الجودة.",
    url: siteUrl,
    locale: "ar_SA",
    type: "website",
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: siteName }],
  },
};

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
