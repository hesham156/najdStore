import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { parseProductVariants, slugCandidates } from "@/lib/utils";
import { getSeoConfig } from "@/lib/seo";
import { getLocale, getTranslations } from "next-intl/server";
import { pickText } from "@/lib/i18n-content";
import { isLocale, localeOpenGraph, localeHtmlLang, defaultLocale, type Locale } from "@/i18n/config";

// Server-rendered on demand — Neon DB not available at build time
export const dynamic = "force-dynamic";



/** Strip HTML tags & collapse whitespace — for meta descriptions built from rich HTML */
function stripHtml(html: string, max = 160): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

interface Props { params: { slug: string } }

/* ─────────────────────────────────────────
   generateMetadata
───────────────────────────────────────── */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("productMeta");
  const [product, cfg] = await Promise.all([
    prisma.product.findFirst({
      where: { slug: { in: slugCandidates(params.slug) }, isActive: true },
      include: { category: true },
    }),
    getSeoConfig(),
  ]);

  if (!product) return { title: t("notFound") };

  const { siteUrl, siteName } = cfg;
  const currency = t("currency");
  const productName = pickText(locale, product.name, product.nameAr);
  const categoryName = pickText(locale, product.category.name, product.category.nameAr);
  const productDesc = pickText(locale, product.description, product.descriptionAr);
  const ogLocale = isLocale(locale) ? localeOpenGraph[locale] : localeOpenGraph[defaultLocale];
  const htmlLang = isLocale(locale) ? localeHtmlLang[locale] : localeHtmlLang[defaultLocale];

  const price = parseFloat(String(product.price));
  const variants = parseProductVariants(product.tags);
  const minPrice = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : price;

  // Custom SEO stored in tags
  const seoTitleTag    = product.tags.find((t) => t.startsWith("seo_title:"));
  const seoDescTag     = product.tags.find((t) => t.startsWith("seo_desc:"));
  const seoKeywordsTag = product.tags.find((t) => t.startsWith("seo_kw:"));

  const customTitle    = seoTitleTag    ? seoTitleTag.replace("seo_title:", "")    : null;
  const customDesc     = seoDescTag     ? seoDescTag.replace("seo_desc:", "")      : null;
  const customKeywords = seoKeywordsTag ? seoKeywordsTag.replace("seo_kw:", "").split(",") : [];

  const title       = customTitle || `${productName} | ${categoryName} – ${siteName}`;
  const description = customDesc  || (productDesc ? stripHtml(productDesc) : "") ||
    t("buyNowDesc", { name: productName, site: siteName, price: minPrice, currency });

  const keywords = [
    productName,
    product.name,
    categoryName,
    t("kwBuy", { name: productName }),
    t("kwCheap", { name: productName }),
    t("kwCountry", { name: productName }),
    ...customKeywords,
    ...variants.map((v) => `${productName} ${v.label}`),
  ].filter(Boolean);

  const productImage = product.image || cfg.ogImage;
  const canonicalUrl = `${siteUrl}/products/${product.slug}`;

  return {
    title,
    description,
    keywords,
    authors: [{ name: siteName, url: siteUrl }],
    creator: siteName,
    publisher: siteName,
    robots: cfg.indexable
      ? {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
        }
      : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      locale: ogLocale,
      siteName,
      images: [{ url: productImage, width: 1200, height: 630, alt: `${productName} - ${siteName}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [productImage],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { [htmlLang]: canonicalUrl },
    },
  };
}

/* ─────────────────────────────────────────
   Build JSON-LD schemas
───────────────────────────────────────── */
async function getSchemas(slug: string) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("productMeta");
  const tnav = await getTranslations("nav");
  const [product, cfg] = await Promise.all([
    prisma.product.findFirst({
      where: { slug: { in: slugCandidates(slug) }, isActive: true },
      include: { category: true },
    }),
    getSeoConfig(),
  ]);
  if (!product) return null;

  const { siteUrl, siteName } = cfg;
  const currency = t("currency");
  const productName = pickText(locale, product.name, product.nameAr);
  const categoryName = pickText(locale, product.category.name, product.category.nameAr);
  const productDesc = pickText(locale, product.description, product.descriptionAr);

  // Availability must tell the truth. It used to be hardcoded to InStock, which
  // advertises sold-out items and is exactly the mismatch Google penalises.
  const inStock = !product.trackStock || product.stockCount > 0;
  const availability = inStock
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  // Return window, when the merchant has published one.
  const returnPolicy = cfg.returnDays
    ? {
        "@type": "MerchantReturnPolicy",
        applicableCountry: cfg.address.country,
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: cfg.returnDays,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      }
    : null;

  const price     = parseFloat(String(product.price));
  const variants  = parseProductVariants(product.tags);
  const minPrice  = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : price;
  const imgUrl    = product.image || cfg.ogImage;
  const canonical = `${siteUrl}/products/${product.slug}`;
  const desc      = (productDesc ? stripHtml(productDesc, 300) : "") || t("buyShortDesc", { name: productName, price: minPrice, currency });
  const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": canonical,
    name: productName,
    alternateName: product.name,
    description: desc,
    image: imgUrl,
    url: canonical,
    sku: product.id,
    brand: { "@type": "Brand", name: categoryName },
    category: categoryName,
    offers: variants.length > 0
      ? variants.map((v) => ({
          "@type": "Offer",
          name: v.label,
          price: v.price.toFixed(2),
          priceCurrency: "SAR",
          priceValidUntil: expiryDate,
          url: canonical,
          availability,
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: siteName, url: siteUrl },
          ...(returnPolicy ? { hasMerchantReturnPolicy: returnPolicy } : {}),
        }))
      : {
          "@type": "Offer",
          price: minPrice.toFixed(2),
          priceCurrency: "SAR",
          priceValidUntil: expiryDate,
          url: canonical,
          availability,
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: siteName, url: siteUrl },
          ...(returnPolicy ? { hasMerchantReturnPolicy: returnPolicy } : {}),
        },
    // Note: no aggregateRating until real customer reviews exist — fabricated
    // ratings violate Google's structured-data policy and risk a manual penalty.
    ...(product.features.length > 0 && {
      additionalProperty: product.features.map((f) => ({
        "@type": "PropertyValue",
        name: t("featureLabel"),
        value: f,
      })),
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: tnav("home"),  item: siteUrl },
      { "@type": "ListItem", position: 2, name: tnav("products"), item: `${siteUrl}/products` },
      { "@type": "ListItem", position: 3, name: categoryName, item: `${siteUrl}/categories/${product.category.slug}` },
      { "@type": "ListItem", position: 4, name: productName, item: canonical },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: t("faqWhat", { name: productName }),
        acceptedAnswer: { "@type": "Answer", text: desc },
      },
      {
        "@type": "Question",
        name: t("faqPrice", { name: productName }),
        acceptedAnswer: {
          "@type": "Answer",
          text: variants.length > 0
            ? t("faqPriceAnsVariants", { name: productName, price: minPrice, currency, options: variants.map((v) => t("optionPrice", { label: v.label, price: v.price, currency })).join("، ") })
            : t("faqPriceAnsSingle", { name: productName, price: minPrice, currency }),
        },
      },
      {
        "@type": "Question",
        name: t("faqInstant", { name: productName }),
        acceptedAnswer: {
          "@type": "Answer",
          text: product.deliveryMethod === "AUTOMATIC"
            ? t("faqInstantAuto", { name: productName })
            : t("faqInstantManual", { name: productName }),
        },
      },
      ...(variants.length > 0
        ? [{
            "@type": "Question",
            name: t("faqOptions", { name: productName }),
            acceptedAnswer: {
              "@type": "Answer",
              text: t("faqOptionsAns", { options: variants.map((v) => t("optionPrice", { label: v.label, price: v.price, currency })).join("، ") }),
            },
          }]
        : []),
    ],
  };

  return { productSchema, breadcrumbSchema, faqSchema };
}

/* ─────────────────────────────────────────
   Layout wrapper – injects JSON-LD scripts
───────────────────────────────────────── */
export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const schemas = await getSchemas(params.slug);

  return (
    <>
      {schemas && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.productSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.breadcrumbSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.faqSchema) }}
          />
        </>
      )}
      {children}
    </>
  );
}
