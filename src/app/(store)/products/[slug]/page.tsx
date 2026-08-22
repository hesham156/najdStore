import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { serializeData, parseProductVariants } from "@/lib/utils";
import ProductClient from "./ProductClient";
import type { Metadata } from "next";
import type { ProductWithCategory } from "@/types";

interface PublicSettings {
  tabby_enabled?: boolean;
  tabby_installments?: string;
  tamara_enabled?: boolean;
  tamara_installments?: string;
}

const siteUrl = process.env.NEXTAUTH_URL || "https://yourstore.com";

// Rendered on demand — the database is not available at build time
export const dynamic = "force-dynamic";

/** Safely serialize JSON-LD — escapes </script> injection vectors */
function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const product = await prisma.product.findFirst({
    where: { slug: params.slug, isActive: true, isDeleted: false },
    include: { category: true },
  });

  if (!product) return { title: "المنتج غير موجود" };

  const title = `${product.nameAr}`;
  const description = product.descriptionAr
    || `اشترك في ${product.nameAr} بأفضل الأسعار — تسليم فوري آمن`;
  const url = `${siteUrl}/products/${product.slug}`;
  const image = product.image || `${siteUrl}/og-image.png`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: product.nameAr }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: { canonical: url },
  };
}

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [productRaw, settingsRaw] = await Promise.all([
    prisma.product.findFirst({
      where: { slug: params.slug, isActive: true, isDeleted: false },
      include: { category: true },
    }),
    prisma.setting.findMany({
      where: {
        key: { in: ["tabby_enabled", "tabby_installments", "tamara_enabled", "tamara_installments"] },
      },
    }),
  ]);

  if (!productRaw) notFound();

  const product = serializeData(productRaw) as unknown as ProductWithCategory & { variants?: any[] };
  product.variants = parseProductVariants((productRaw.tags || []) as string[]);

  const publicSettings: PublicSettings = {};
  for (const s of settingsRaw) {
    if (s.key === "tabby_enabled") publicSettings.tabby_enabled = s.value === "true";
    if (s.key === "tabby_installments") publicSettings.tabby_installments = s.value;
    if (s.key === "tamara_enabled") publicSettings.tamara_enabled = s.value === "true";
    if (s.key === "tamara_installments") publicSettings.tamara_installments = s.value;
  }

  const price = parseFloat(String(productRaw.price));
  const url = `${siteUrl}/products/${product.slug}`;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameAr,
    ...(product.descriptionAr ? { description: product.descriptionAr } : {}),
    ...(product.image ? { image: product.image } : {}),
    url,
    offers: {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: "SAR",
      availability: productRaw.stockCount > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url,
      seller: { "@type": "Organization", name: "متجرك الإلكتروني" },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "المنتجات", item: `${siteUrl}/products` },
      { "@type": "ListItem", position: 3, name: product.category.nameAr, item: `${siteUrl}/categories/${product.category.slug}` },
      { "@type": "ListItem", position: 4, name: product.nameAr, item: url },
    ],
  };

  const deliveryAnswer = productRaw.deliveryMethod === "AUTOMATIC"
    ? "التسليم فوري تلقائي — ستحصل على بياناتك مباشرة بعد تأكيد الدفع."
    : "التسليم يدوي ويستغرق من 1 إلى 24 ساعة بعد تأكيد الدفع.";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "كيف أستلم طلبي بعد الدفع؟", acceptedAnswer: { "@type": "Answer", text: "بعد تأكيد الدفع تصلك تفاصيل طلبك مباشرة في صفحة الطلب وعبر البريد الإلكتروني. التسليم التلقائي فوري، واليدوي خلال 1-24 ساعة." } },
      { "@type": "Question", name: "هل يمكنني الاسترداد إذا واجهت مشكلة؟", acceptedAnswer: { "@type": "Answer", text: "نعم، نضمن جودة جميع منتجاتنا. إذا واجهت أي مشكلة افتح تذكرة دعم فني وسنحلها أو نسترد مبلغك." } },
      { "@type": "Question", name: "ما طرق الدفع المتاحة؟", acceptedAnswer: { "@type": "Answer", text: "نقبل التحويل البنكي، بطاقات الائتمان، والعملات المشفرة. جميع طرق الدفع آمنة ومشفرة." } },
      { "@type": "Question", name: "كم يستغرق التوصيل؟", acceptedAnswer: { "@type": "Answer", text: deliveryAnswer } },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
      <ProductClient product={product} publicSettings={publicSettings} />
    </>
  );
}
