import Link from "next/link";
import { ProductCard } from "@/components/store/ProductCard";
import {
  AnimatedSection,
  StaggerContainer,
  StaggerItem,
} from "@/components/store/AnimatedSection";
import HeroContent from "@/components/store/HeroContent";
import { FeaturesTimeline } from "@/components/store/FeaturesTimeline";
import { ChevronLeft } from "lucide-react";
import type { ProductWithCategory } from "@/types";
import { getActiveCategories, getFeaturedProducts, getRecentProducts } from "@/lib/queries";
import { getBranding } from "@/lib/settings";
import { PromoSection } from "@/components/store/PromoSection";
import AdBanner from "@/components/store/AdBanner";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXTAUTH_URL || "https://yourstore.com";
const siteName = "متجرك الإلكتروني المتكامل";

export const metadata: Metadata = {
  title: `تسوّق أفضل المنتجات والخدمات بأفضل الأسعار | ${siteName}`,
  description: "متجرك الموثوق لأفضل المنتجات والخدمات بأسعار مناسبة، تسليم سريع، وتجربة شراء سلسة وآمنة.",
  keywords: ["متجر إلكتروني", "تسوق", "منتجات", "خدمات", "أفضل الأسعار", "تسليم سريع"],
  alternates: { canonical: siteUrl },
  openGraph: {
    title: siteName,
    description: "متجرك الموثوق لأفضل المنتجات والخدمات بأسعار مناسبة وتسليم سريع.",
    url: siteUrl, locale: "ar_SA", type: "website",
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: siteName }],
  },
};


export default async function HomePage() {
  const [featured, categories, recent, branding] = await Promise.all([
    getFeaturedProducts(),
    getActiveCategories(),
    getRecentProducts(),
    getBranding(),
  ]);

  return (
    <div className="min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <HeroContent
        badge={branding.hero_badge}
        title={branding.hero_title}
        titleHighlight={branding.hero_title_highlight}
        subtitle={branding.hero_subtitle}
        stats={[
          { value: branding.hero_stat_1_value, label: branding.hero_stat_1_label },
          { value: branding.hero_stat_2_value, label: branding.hero_stat_2_label },
          { value: branding.hero_stat_3_value, label: branding.hero_stat_3_label },
        ]}
      />

      {/* ── Top Ads ──────────────────────────────────────────────────── */}
      <AdBanner placement="STORE_HOME_TOP" />

      {/* ── Categories ───────────────────────────────────────────────── */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container-custom">
          <AnimatedSection className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">الفئات</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">تصفح منتجاتنا حسب الفئة</p>
            </div>
            <Link href="/products" className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:gap-2 transition-all font-medium">
              عرض الكل
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </AnimatedSection>

          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <StaggerItem key={cat.id}>
                <Link
                  href={`/categories/${cat.slug}`}
                  className="group flex flex-col items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                    style={{ background: `${cat.color}20` }}
                  >
                    {cat.icon}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {cat.nameAr}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {cat._count.products} منتج
                    </p>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ── Promos & Coupons ──────────────────────────────────────────── */}
      <PromoSection />

      {/* ── Featured Products ─────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="py-16 bg-gray-50 dark:bg-gray-950">
          <div className="container-custom">
            <AnimatedSection className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">المنتجات المميزة</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">اختارها فريقنا خصيصاً لك</p>
              </div>
              <Link href="/products" className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:gap-2 transition-all font-medium">
                عرض الكل
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </AnimatedSection>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((product) => (
                <StaggerItem key={product.id}>
                  <ProductCard product={product} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* ── Why Us ───────────────────────────────────────────────────── */}
      <section className="bg-black">
        <AnimatedSection className="text-center pt-16 pb-4">
          <h2 className="text-2xl font-bold text-white">لماذا تختارنا؟</h2>
          <p className="text-white/50 mt-2">اضغط على أي عقدة لمعرفة التفاصيل</p>
        </AnimatedSection>
        <FeaturesTimeline />
      </section>

      {/* ── Recent Products ───────────────────────────────────────────── */}
      {recent.length > 0 && (
        <section className="py-16 bg-gray-50 dark:bg-gray-950">
          <div className="container-custom">
            <AnimatedSection className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">أحدث المنتجات</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">آخر ما أضفناه لمتجرنا</p>
              </div>
            </AnimatedSection>

            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {recent.map((product) => (
                <StaggerItem key={product.id}>
                  <ProductCard product={product} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* ── Bottom Ads ────────────────────────────────────────────────── */}
      <AdBanner placement="STORE_HOME_BOTTOM" />

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-primary-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="container-custom text-center relative z-10">
          <AnimatedSection>
            <h2 className="text-3xl font-black text-white mb-4">جاهز للبدء؟</h2>
            <p className="text-white/80 mb-8 text-lg max-w-xl mx-auto">
              سجل حساباً مجانياً الآن واستفد من أفضل عروضنا ومنتجاتنا المميزة
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-3.5 rounded-xl hover:bg-gray-50 transition-all shadow-lg text-base hover:-translate-y-0.5 duration-200"
              >
                إنشاء حساب مجاني
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-white border-2 border-white/30 font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all text-base"
              >
                تواصل معنا
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
