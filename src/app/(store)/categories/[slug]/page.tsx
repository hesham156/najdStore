import { prisma } from "@/lib/prisma";
import { getSeoConfig } from "@/lib/seo";
import { ProductCard } from "@/components/store/ProductCard";
import type { ProductWithCategory } from "@/types";
import { getCategoryWithProducts } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { pickText } from "@/lib/i18n-content";
import { isLocale, localeOpenGraph, localeHtmlLang, defaultLocale, type Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";


interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cfg = await getSeoConfig();
  const { siteUrl } = cfg;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("categoryPage");
  const cat = await prisma.category.findUnique({ where: { slug: params.slug } });
  if (!cat) return { title: t("notFound") };

  const catName = pickText(locale, cat.name, cat.nameAr);
  const catDesc = pickText(locale, cat.description, cat.descriptionAr);
  const ogLocale = isLocale(locale) ? localeOpenGraph[locale] : localeOpenGraph[defaultLocale];
  const htmlLang = isLocale(locale) ? localeHtmlLang[locale] : localeHtmlLang[defaultLocale];

  const title = catName;
  const description = catDesc || t("metaDesc", { name: catName });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: `${siteUrl}/categories/${cat.slug}`,
    inLanguage: htmlLang,
  };

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/categories/${cat.slug}`,
      locale: ogLocale,
      images: [{ url: cat.image || cfg.ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `${siteUrl}/categories/${cat.slug}` },
    other: { "application/ld+json": JSON.stringify(jsonLd) },
  };
}

export default async function CategoryPage({ params }: Props) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("categoryPage");
  const tn = await getTranslations("nav");
  const tp = await getTranslations("productsPage");
  const category = await getCategoryWithProducts(params.slug);

  if (!category) notFound();

  const products = (category as { products: ProductWithCategory[] }).products;
  const catName = pickText(locale, category.name, category.nameAr);
  const catDesc = pickText(locale, category.description, category.descriptionAr);

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        <nav className="flex items-center gap-2 text-sm text-fg-subtle mb-6">
          <Link href="/" className="hover:text-primary-600 dark:hover:text-primary-400">{tn("home")}</Link>
          <ArrowRight className="h-4 w-4" />
          <Link href="/products" className="hover:text-primary-600 dark:hover:text-primary-400">{tn("products")}</Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-fg">{catName}</span>
        </nav>

        <div
          className="rounded-2xl p-8 mb-8 text-white"
          style={{ background: `linear-gradient(135deg, ${category.color}99, ${category.color}66)` }}
        >
          <div className="flex items-center gap-4">
            <div className="text-5xl">{category.icon}</div>
            <div>
              <h1 className="text-3xl font-black">{catName}</h1>
              {catDesc && (
                <p className="mt-1 text-white/80">{catDesc}</p>
              )}
              <p className="mt-2 text-white/60 text-sm">{tp("countAvailable", { count: products.length })}</p>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-fg mb-2">{t("noProducts")}</h2>
            <p className="text-fg-subtle">{t("comingSoon")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
