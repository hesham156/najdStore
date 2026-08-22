import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/ProductCard";
import { FilterSidebar } from "@/components/store/FilterSidebar";
import type { ProductWithCategory } from "@/types";
import type { Metadata } from "next";

const siteUrl = process.env.NEXTAUTH_URL || "https://yourstore.com";

// Rendered on demand — the database is not available at build time
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const title = searchParams.search
    ? `نتائج البحث عن "${searchParams.search}" | جميع المنتجات`
    : searchParams.category
    ? `تصفح فئة ${searchParams.category}`
    : "جميع المنتجات بأفضل الأسعار";
  const description = "تصفح مجموعة واسعة من المنتجات والخدمات بأسعار تنافسية وتسليم سريع";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/products`,
      locale: "ar_SA",
      images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: title }],
    },
    alternates: { canonical: `${siteUrl}/products` },
    robots: { index: true, follow: true },
  };
}

interface SearchParams {
  category?: string;
  search?: string;
  sort?: string;
  page?: string;
}

async function getProducts(params: SearchParams) {
  const page = parseInt(params.page || "1");
  const perPage = 12;
  const skip = (page - 1) * perPage;

  const where: Record<string, unknown> = { isActive: true };

  if (params.category) {
    where.category = { slug: params.category };
  }
  if (params.search) {
    where.OR = [
      { nameAr: { contains: params.search, mode: "insensitive" } },
      { name: { contains: params.search, mode: "insensitive" } },
      { tags: { has: params.search } },
    ];
  }

  const orderBy: Record<string, string> = {};
  switch (params.sort) {
    case "price_asc": orderBy.price = "asc"; break;
    case "price_desc": orderBy.price = "desc"; break;
    case "newest": orderBy.createdAt = "desc"; break;
    default: orderBy.sortOrder = "asc";
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy,
      skip,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return { products: products as unknown as ProductWithCategory[], total, page, perPage };
}

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ products, total, page, perPage }, categories] = await Promise.all([
    getProducts(searchParams),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">جميع المنتجات</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{total} منتج متاح</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <FilterSidebar categories={categories} searchParams={searchParams} />

          {/* Products Grid */}
          <div className="flex-1">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لم يتم العثور على منتجات</h3>
                <p className="text-gray-500 dark:text-gray-400">جرب تغيير معايير البحث أو الفئة</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
                    {(() => {
                      const baseHref = `/products?${searchParams.category ? `category=${searchParams.category}&` : ""}${searchParams.sort ? `sort=${searchParams.sort}&` : ""}`;
                      const pages: (number | "...")[] = [];
                      if (totalPages <= 7) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        pages.push(1);
                        if (page > 3) pages.push("...");
                        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
                        if (page < totalPages - 2) pages.push("...");
                        pages.push(totalPages);
                      }
                      return pages.map((p, i) =>
                        p === "..." ? (
                          <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
                        ) : (
                          <a
                            key={p}
                            href={`${baseHref}page=${p}`}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                              p === page
                                ? "bg-primary-600 text-white"
                                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary-300"
                            }`}
                          >
                            {p}
                          </a>
                        )
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
