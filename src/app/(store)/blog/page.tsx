import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Clock, Eye, ChevronLeft } from "lucide-react";

// Rendered on demand — the database is not available at build time
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "المدونة — مقالات ونصائح حول المنتجات والخدمات",
  description: "اقرأ أحدث المقالات والنصائح حول المنتجات والخدمات، أدوات الذكاء الاصطناعي، خدمات البث، والبرمجيات.",
  openGraph: {
    type: "website",
    title: "المدونة",
    description: "مقالات ونصائح حول المنتجات والخدمات",
  },
};

export const revalidate = 60;

async function getPosts(categorySlug?: string) {
  return prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      ...(categorySlug && { category: { slug: categorySlug } }),
    },
    select: {
      id: true,
      slug: true,
      titleAr: true,
      excerptAr: true,
      coverImage: true,
      readingTime: true,
      viewCount: true,
      publishedAt: true,
      tags: true,
      author: { select: { name: true } },
      category: { select: { nameAr: true, slug: true, color: true } },
    },
    orderBy: { publishedAt: "desc" },
    take: 24,
  });
}

async function getCategories() {
  return prisma.postCategory.findMany({
    where: { posts: { some: { status: "PUBLISHED" } } },
    select: { nameAr: true, slug: true, color: true, _count: { select: { posts: { where: { status: "PUBLISHED" } } } } },
    orderBy: { sortOrder: "asc" },
  });
}

export default async function BlogPage({ searchParams }: { searchParams: { category?: string } }) {
  const [posts, categories] = await Promise.all([
    getPosts(searchParams.category),
    getCategories(),
  ]);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="min-h-screen bg-surface" dir="rtl">
      {/* Hero */}
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border-b border-line py-14">
        <div className="container-custom text-center">
          <h1 className="text-4xl md:text-5xl font-black text-fg mb-4">المدونة</h1>
          <p className="text-lg text-fg-subtle max-w-xl mx-auto">
            نصائح ومقالات حول المنتجات والخدمات، الذكاء الاصطناعي، وخدمات البث
          </p>
        </div>
      </div>

      <div className="container-custom py-10">
        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <Link
              href="/blog"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !searchParams.category ? "bg-primary-600 text-white" : "bg-surface-sunken text-fg-muted hover:bg-surface-hover"
              }`}
            >
              الكل
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/blog?category=${cat.slug}`}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  searchParams.category === cat.slug
                    ? "text-white"
                    : "bg-surface-sunken text-fg-muted hover:bg-surface-hover"
                }`}
                style={searchParams.category === cat.slug ? { backgroundColor: cat.color || "#6366f1" } : {}}
              >
                {cat.nameAr}
                <span className="ms-1.5 text-xs opacity-70">({cat._count.posts})</span>
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="py-20 text-center text-fg-subtle">
            <p className="text-lg">لا توجد مقالات بعد</p>
          </div>
        ) : (
          <>
            {/* Featured post */}
            {featured && !searchParams.category && (
              <Link href={`/blog/${featured.slug}`} className="group block mb-10">
                <div className="grid md:grid-cols-2 gap-6 bg-surface-sunken rounded-3xl overflow-hidden border border-line hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                  {featured.coverImage && (
                    <div className="aspect-video md:aspect-auto">
                      <img src={featured.coverImage} alt={featured.titleAr} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-7 flex flex-col justify-center">
                    {featured.category && (
                      <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 text-white w-fit" style={{ backgroundColor: featured.category.color || "#6366f1" }}>
                        {featured.category.nameAr}
                      </span>
                    )}
                    <h2 className="text-2xl font-black text-fg group-hover:text-primary-600 transition-colors mb-3 leading-tight">
                      {featured.titleAr}
                    </h2>
                    {featured.excerptAr && (
                      <p className="text-fg-subtle line-clamp-3 mb-4">{featured.excerptAr}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-fg-subtle">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {featured.readingTime} دقيقة</span>
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {featured.viewCount.toLocaleString("ar")}</span>
                      {featured.publishedAt && (
                        <span>{formatDistanceToNow(new Date(featured.publishedAt), { addSuffix: true, locale: ar })}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(searchParams.category ? posts : rest).map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                  <article className="bg-surface rounded-2xl border border-line overflow-hidden hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-lg transition-all h-full flex flex-col">
                    {post.coverImage ? (
                      <div className="aspect-video overflow-hidden">
                        <img src={post.coverImage} alt={post.titleAr} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
                        <span className="text-4xl">📝</span>
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      {post.category && (
                        <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-3 text-white w-fit" style={{ backgroundColor: post.category.color || "#6366f1" }}>
                          {post.category.nameAr}
                        </span>
                      )}
                      <h2 className="font-black text-fg group-hover:text-primary-600 transition-colors mb-2 leading-snug line-clamp-2">
                        {post.titleAr}
                      </h2>
                      {post.excerptAr && (
                        <p className="text-sm text-fg-subtle line-clamp-2 flex-1 mb-4">{post.excerptAr}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-fg-subtle pt-3 border-t border-line">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readingTime} دقيقة</span>
                        <span className="flex items-center gap-1 text-primary-500">
                          اقرأ المزيد <ChevronLeft className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
