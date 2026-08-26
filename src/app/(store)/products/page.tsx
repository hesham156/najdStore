import { prisma } from "@/lib/prisma";
import { getSeoConfig } from "@/lib/seo";
import { ProductCard } from "@/components/store/ProductCard";
import { FilterSidebar } from "@/components/store/FilterSidebar";
import type { ProductWithCategory } from "@/types";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { isLocale, localeOpenGraph, defaultLocale, type Locale } from "@/i18n/config";


// Rendered on demand — the database is not available at build time
export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const cfg = await getSeoConfig();
  const { siteUrl } = cfg;
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("productsPage");
  const ogLocale = isLocale(locale) ? localeOpenGraph[locale] : localeOpenGraph[defaultLocale];
  const title = searchParams.search
    ? t("metaSearchResults", { query: searchParams.search })
    : searchParams.category
    ? t("metaCategory", { category: searchParams.category })
    : t("metaAll");
  const description = t("metaDesc");
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/products`,
      locale: ogLocale,
      images: [{ url: cfg.ogImage, width: 1200, height: 630, alt: title }],
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

/** Query string carrying every active filter, so one control never drops another. */
function filterQuery(params: SearchParams, override: Partial<SearchParams> = {}) {
  const merged = { ...params, ...override };
  const qs = new URLSearchParams();
  if (merged.search) qs.set("search", merged.search);
  if (merged.category) qs.set("category", merged.category);
  if (merged.sort) qs.set("sort", merged.sort);
  if (merged.page) qs.set("page", merged.page);
  return qs.toString();
}

async function getProducts(params: SearchParams) {
  // `page` arrives from the URL, so it can be anything. A NaN or negative value
  // used to reach Prisma as `skip` and throw instead of showing page one.
  const parsed = parseInt(params.page || "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
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
  const t = await getTranslations("productsPage");
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
          <h1 className="text-3xl font-bold text-fg">{t("title")}</h1>
          <p className="text-fg-muted mt-1">{t("countAvailable", { count: total })}</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <FilterSidebar categories={categories} searchParams={searchParams} />

          {/* Products Grid */}
          <div className="flex-1">
            {products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-fg mb-2">
                  {searchParams.search ? t("noResultsFor", { query: searchParams.search }) : t("notFound")}
                </h3>
                <p className="text-fg-muted">{t("tryDifferent")}</p>
                {(searchParams.search || searchParams.category || searchParams.sort) && (
                  <a href="/products" className="btn-primary mt-5 text-sm px-5 py-2.5">
                    {t("showAll")}
                  </a>
                )}
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
                          <span key={`ellipsis-${i}`} className="px-2 text-fg-subtle">…</span>
                        ) : (
                          <a
                            key={p}
                            // Carries `search` too — paging used to silently
                            // drop the search term and show the whole catalogue.
                            href={`/products?${filterQuery(searchParams, { page: String(p) })}`}
                            aria-current={p === page ? "page" : undefined}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                              p === page
                                ? "bg-primary-600 text-white"
                                : "bg-surface text-fg-muted border border-line hover:border-primary-300"
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
