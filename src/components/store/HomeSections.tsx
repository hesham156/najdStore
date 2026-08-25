import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { NajdLanding, NAJD_CSS } from "@/components/store/NajdLanding";
import HeroContent from "@/components/store/HeroContent";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/store/AnimatedSection";
import { ProductSlider, BannerSlider, Marquee } from "@/components/store/HomeAnimated";
import type { HomeSection } from "@/lib/home-layout";
import { isNajdType, renderNajdBlockHtml } from "@/lib/najd-blocks";
import type { ProductWithCategory } from "@/types";

/* eslint-disable @next/next/no-img-element */

// The shared Najd styles re-scoped so an individually-placed Najd block styles
// its own `.najd-scope` wrapper — injected once when any Najd block is present.
const NAJD_SCOPED_CSS = NAJD_CSS.replace(/#najd-landing-block/g, ".najd-scope");

interface Category {
  id: string; nameAr: string; slug: string; icon?: string | null; color?: string | null;
  _count: { products: number };
}

export interface HomeData {
  categories: Category[];
  featured: ProductWithCategory[];
  recent: ProductWithCategory[];
  branding: Record<string, string>;
}

function ProductGrid({ title, subtitle, products }: { title?: string; subtitle?: string; products: ProductWithCategory[] }) {
  if (!products.length) return null;
  return (
    <section className="py-16 bg-surface-sunken">
      <div className="container-custom">
        <AnimatedSection className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-fg">{title || "منتجات"}</h2>
            {subtitle && <p className="text-fg-subtle mt-1 text-sm">{subtitle}</p>}
          </div>
          <Link href="/products" className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:gap-2 transition-all font-medium">
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </Link>
        </AnimatedSection>
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((p) => (
            <StaggerItem key={p.id}><ProductCard product={p} /></StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function renderSection(s: HomeSection, data: HomeData) {
  switch (s.type) {
    case "landing":
      return <NajdLanding featured={data.featured} recent={data.recent} />;

    case "hero":
      // Single source of truth: hero content lives in Settings → "الواجهة والهيرو".
      return (
        <HeroContent
          badge={data.branding.hero_badge}
          title={data.branding.hero_title}
          titleHighlight={data.branding.hero_title_highlight}
          subtitle={data.branding.hero_subtitle}
          stats={[
            { value: data.branding.hero_stat_1_value, label: data.branding.hero_stat_1_label },
            { value: data.branding.hero_stat_2_value, label: data.branding.hero_stat_2_label },
            { value: data.branding.hero_stat_3_value, label: data.branding.hero_stat_3_label },
          ]}
        />
      );

    case "categories":
      if (!data.categories.length) return null;
      return (
        <section className="py-16 bg-surface">
          <div className="container-custom">
            <AnimatedSection className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-fg">{s.title || "الفئات"}</h2>
                {s.subtitle && <p className="text-fg-subtle mt-1 text-sm">{s.subtitle}</p>}
              </div>
              <Link href="/products" className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:gap-2 transition-all font-medium">
                عرض الكل <ChevronLeft className="h-4 w-4" />
              </Link>
            </AnimatedSection>
            <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {data.categories.map((cat) => (
                <StaggerItem key={cat.id}>
                  <Link href={`/categories/${cat.slug}`} className="group flex flex-col items-center gap-3 p-4 rounded-2xl border border-line bg-surface hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110" style={{ background: `${cat.color || "#7c3aed"}20` }}>
                      {cat.icon}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-fg group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{cat.nameAr}</p>
                      <p className="text-xs text-fg-subtle mt-0.5">{cat._count.products} منتج</p>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      );

    case "featured":
      return <ProductGrid title={s.title || "المنتجات المميزة"} subtitle={s.subtitle} products={data.featured.slice(0, s.limit || 8)} />;

    case "recent":
      return <ProductGrid title={s.title || "أحدث المنتجات"} subtitle={s.subtitle} products={data.recent.slice(0, s.limit || 8)} />;

    case "banner":
      if (!s.image) return null;
      return (
        <section className="py-8">
          <div className="container-custom">
            {s.link ? (
              <Link href={s.link}><img src={s.image} alt={s.alt || ""} className="w-full rounded-2xl object-cover" /></Link>
            ) : (
              <img src={s.image} alt={s.alt || ""} className="w-full rounded-2xl object-cover" />
            )}
          </div>
        </section>
      );

    case "product_slider": {
      const src = s.source === "recent" ? data.recent : data.featured;
      return <ProductSlider title={s.title || "منتجات مختارة"} subtitle={s.subtitle} products={src.slice(0, s.limit || 12)} speed={s.speed} />;
    }

    case "banner_slider":
      if (!s.slides?.length) return null;
      return <BannerSlider slides={s.slides} autoplay={s.autoplay !== false} interval={s.speed} />;

    case "marquee":
      if (!s.text) return null;
      return <Marquee text={s.text} speed={s.speed} />;

    case "richtext":
      if (!s.html && !s.title) return null;
      return (
        <section className="py-14">
          <div className="container-custom max-w-3xl text-center">
            {s.title && <h2 className="text-2xl font-bold text-fg mb-4">{s.title}</h2>}
            {s.html && <div className="prose prose-lg dark:prose-invert mx-auto" dangerouslySetInnerHTML={{ __html: s.html }} />}
          </div>
        </section>
      );

    case "custom_html":
      if (!s.html) return null;
      return <div dangerouslySetInnerHTML={{ __html: s.html }} />;

    default:
      // Individually-placed Najd design sections.
      if (isNajdType(s.type)) {
        return (
          <div className="najd-scope">
            <div dangerouslySetInnerHTML={{ __html: renderNajdBlockHtml(s.type, s.najd) }} />
          </div>
        );
      }
      return null;
  }
}

export function HomeSections({ sections, data }: { sections: HomeSection[]; data: HomeData }) {
  const active = sections.filter((s) => s.enabled);
  const hasNajdBlock = active.some((s) => isNajdType(s.type));
  return (
    <>
      {hasNajdBlock && <style dangerouslySetInnerHTML={{ __html: NAJD_SCOPED_CSS }} />}
      {active.map((s) => (
        <div key={s.id}>{renderSection(s, data)}</div>
      ))}
    </>
  );
}
