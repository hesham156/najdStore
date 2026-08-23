import type { Metadata } from "next";
import { NajdLanding } from "@/components/store/NajdLanding";
import { getFeaturedProducts, getRecentProducts } from "@/lib/queries";

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
  const [featured, recent] = await Promise.all([
    getFeaturedProducts(),
    getRecentProducts(),
  ]);

  return (
    <div className="min-h-screen">
      <NajdLanding featured={featured} recent={recent} />
    </div>
  );
}
