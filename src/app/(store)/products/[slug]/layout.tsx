import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { parseProductVariants } from "@/lib/utils";

// Server-rendered on demand — Neon DB not available at build time
export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXTAUTH_URL || "https://yourstore.com";
const siteName = "متجرك الإلكتروني";

interface Props { params: { slug: string } }

/* ─────────────────────────────────────────
   generateMetadata
───────────────────────────────────────── */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug, isActive: true },
    include: { category: true },
  });

  if (!product) return { title: "المنتج غير موجود" };

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

  const title       = customTitle || `${product.nameAr} | ${product.category.nameAr} – ${siteName}`;
  const description = customDesc  || product.descriptionAr ||
    `اشتر ${product.nameAr} الآن من ${siteName} بسعر يبدأ من ${minPrice} ر.س – تسليم فوري وآمن.`;

  const keywords = [
    product.nameAr,
    product.name,
    product.category.nameAr,
    `شراء ${product.nameAr}`,
    `${product.nameAr} رخيص`,
    `${product.nameAr} السعودية`,
    ...customKeywords,
    ...variants.map((v) => `${product.nameAr} ${v.label}`),
  ].filter(Boolean);

  const productImage = product.image || `${siteUrl}/og-image.png`;
  const canonicalUrl = `${siteUrl}/products/${product.slug}`;

  return {
    title,
    description,
    keywords,
    authors: [{ name: siteName, url: siteUrl }],
    creator: siteName,
    publisher: siteName,
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      locale: "ar_SA",
      siteName,
      images: [{ url: productImage, width: 1200, height: 630, alt: `${product.nameAr} - ${siteName}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [productImage],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: { "ar-SA": canonicalUrl },
    },
  };
}

/* ─────────────────────────────────────────
   Build JSON-LD schemas
───────────────────────────────────────── */
async function getSchemas(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: { category: true },
  });
  if (!product) return null;

  const price     = parseFloat(String(product.price));
  const variants  = parseProductVariants(product.tags);
  const minPrice  = variants.length > 0 ? Math.min(...variants.map((v) => v.price)) : price;
  const imgUrl    = product.image || `${siteUrl}/og-image.png`;
  const canonical = `${siteUrl}/products/${product.slug}`;
  const desc      = product.descriptionAr || `اشتر ${product.nameAr} بسعر يبدأ من ${minPrice} ر.س.`;
  const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": canonical,
    name: product.nameAr,
    alternateName: product.name,
    description: desc,
    image: imgUrl,
    url: canonical,
    sku: product.id,
    brand: { "@type": "Brand", name: product.category.nameAr },
    category: product.category.nameAr,
    offers: variants.length > 0
      ? variants.map((v) => ({
          "@type": "Offer",
          name: v.label,
          price: v.price.toFixed(2),
          priceCurrency: "SAR",
          priceValidUntil: expiryDate,
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: siteName, url: siteUrl },
        }))
      : {
          "@type": "Offer",
          price: minPrice.toFixed(2),
          priceCurrency: "SAR",
          priceValidUntil: expiryDate,
          availability: "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: siteName, url: siteUrl },
        },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      bestRating: "5",
      worstRating: "1",
      reviewCount: "124",
    },
    ...(product.features.length > 0 && {
      additionalProperty: product.features.map((f) => ({
        "@type": "PropertyValue",
        name: "ميزة",
        value: f,
      })),
    }),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية",  item: siteUrl },
      { "@type": "ListItem", position: 2, name: "المنتجات", item: `${siteUrl}/products` },
      { "@type": "ListItem", position: 3, name: product.category.nameAr, item: `${siteUrl}/categories/${product.category.slug}` },
      { "@type": "ListItem", position: 4, name: product.nameAr, item: canonical },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `ما هو ${product.nameAr}؟`,
        acceptedAnswer: { "@type": "Answer", text: desc },
      },
      {
        "@type": "Question",
        name: `كم سعر ${product.nameAr}؟`,
        acceptedAnswer: {
          "@type": "Answer",
          text: variants.length > 0
            ? `سعر ${product.nameAr} يبدأ من ${minPrice} ر.س. الخيارات: ${variants.map((v) => `${v.label} بـ ${v.price} ر.س`).join("، ")}.`
            : `سعر ${product.nameAr} هو ${minPrice} ر.س.`,
        },
      },
      {
        "@type": "Question",
        name: `هل التسليم فوري لـ ${product.nameAr}؟`,
        acceptedAnswer: {
          "@type": "Answer",
          text: product.deliveryMethod === "AUTOMATIC"
            ? `نعم، يتم تسليم ${product.nameAr} تلقائياً فور اعتماد الدفع.`
            : `يتم تسليم ${product.nameAr} يدوياً خلال 1–24 ساعة.`,
        },
      },
      ...(variants.length > 0
        ? [{
            "@type": "Question",
            name: `ما الخيارات المتاحة لـ ${product.nameAr}؟`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `الخيارات: ${variants.map((v) => `${v.label} بسعر ${v.price} ر.س`).join("، ")}.`,
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
