import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/ProductCard";
import type { ProductWithCategory } from "@/types";
import { getCategoryWithProducts } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXTAUTH_URL || "https://yourstore.com";

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cat = await prisma.category.findUnique({ where: { slug: params.slug } });
  if (!cat) return { title: "الفئة غير موجودة" };

  const title = `${cat.nameAr}`;
  const description = cat.descriptionAr || `تصفح أفضل منتجات ${cat.nameAr} بأسعار تنافسية مع تسليم فوري.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: `${siteUrl}/categories/${cat.slug}`,
    inLanguage: "ar",
  };

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/categories/${cat.slug}`,
      locale: "ar_SA",
      images: [{ url: cat.image || `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `${siteUrl}/categories/${cat.slug}` },
    other: { "application/ld+json": JSON.stringify(jsonLd) },
  };
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategoryWithProducts(params.slug);

  if (!category) notFound();

  const products = (category as { products: ProductWithCategory[] }).products;

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-primary-600 dark:hover:text-primary-400">الرئيسية</Link>
          <ArrowRight className="h-4 w-4" />
          <Link href="/products" className="hover:text-primary-600 dark:hover:text-primary-400">المنتجات</Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-white">{category.nameAr}</span>
        </nav>

        <div
          className="rounded-2xl p-8 mb-8 text-white"
          style={{ background: `linear-gradient(135deg, ${category.color}99, ${category.color}66)` }}
        >
          <div className="flex items-center gap-4">
            <div className="text-5xl">{category.icon}</div>
            <div>
              <h1 className="text-3xl font-black">{category.nameAr}</h1>
              {category.descriptionAr && (
                <p className="mt-1 text-white/80">{category.descriptionAr}</p>
              )}
              <p className="mt-2 text-white/60 text-sm">{products.length} منتج متاح</p>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا توجد منتجات حالياً</h2>
            <p className="text-gray-500 dark:text-gray-400">نعمل على إضافة منتجات جديدة قريباً</p>
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
