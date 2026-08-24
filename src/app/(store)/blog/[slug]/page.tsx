import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import { Clock, Eye, Calendar, Tag, ChevronLeft, User } from "lucide-react";

export const revalidate = 60;

async function getPost(slug: string) {
  return prisma.post.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      author: { select: { name: true, avatar: true } },
      category: { select: { nameAr: true, name: true, slug: true, color: true } },
    },
  });
}

async function getRelated(postId: string, categoryId: string | null) {
  return prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: postId },
      ...(categoryId && { categoryId }),
    },
    select: { id: true, slug: true, titleAr: true, coverImage: true, readingTime: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "مقال غير موجود" };

  const title = post.metaTitleAr || post.titleAr;
  const description = post.metaDescriptionAr || post.excerptAr || "";
  const siteUrl = process.env.NEXTAUTH_URL || "https://yourstore.com";

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.author.name],
      ...(post.coverImage && { images: [{ url: post.coverImage, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(post.coverImage && { images: [post.coverImage] }),
    },
    alternates: {
      canonical: `${siteUrl}/blog/${post.slug}`,
    },
  };
}


const renderer = new marked.Renderer();
renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
  const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};
marked.setOptions({ breaks: true });

function extractHeadings(markdown: string) {
  const headings: { id: string; text: string; level: number }[] = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
      headings.push({ id, text, level });
    }
  }
  return headings;
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  // Increment view count
  prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  const [related] = await Promise.all([
    getRelated(post.id, post.categoryId),
  ]);

  const htmlContent = DOMPurify.sanitize(await marked(post.contentAr, { renderer }));
  const headings = extractHeadings(post.contentAr);
  const siteUrl = process.env.NEXTAUTH_URL || "https://yourstore.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.metaTitleAr || post.titleAr,
    description: post.metaDescriptionAr || post.excerptAr || "",
    image: post.coverImage || `${siteUrl}/logo.jpg`,
    author: { "@type": "Person", name: post.author.name },
    publisher: {
      "@type": "Organization",
      name: "متجر رقمي",
      logo: { "@type": "ImageObject", url: `${siteUrl}/logo.jpg` },
    },
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/blog/${post.slug}` },
    wordCount: post.contentAr.split(/\s+/).length,
    timeRequired: `PT${post.readingTime}M`,
    inLanguage: "ar",
    ...(post.category && { articleSection: post.category.nameAr }),
    ...(post.tags.length > 0 && { keywords: post.tags.join(", ") }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen bg-surface" dir="rtl">
        {/* Breadcrumb */}
        <div className="border-b border-line bg-surface-sunken">
          <div className="container-custom py-3">
            <nav className="flex items-center gap-2 text-sm text-fg-subtle">
              <Link href="/" className="hover:text-primary-600 transition-colors">الرئيسية</Link>
              <ChevronLeft className="h-3.5 w-3.5" />
              <Link href="/blog" className="hover:text-primary-600 transition-colors">المدونة</Link>
              {post.category && (
                <>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <Link href={`/blog?category=${post.category.slug}`} className="hover:text-primary-600 transition-colors">
                    {post.category.nameAr}
                  </Link>
                </>
              )}
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="text-fg truncate max-w-[200px]">{post.titleAr}</span>
            </nav>
          </div>
        </div>

        {/* Cover */}
        {post.coverImage && (
          <div className="w-full max-h-[460px] overflow-hidden">
            <img src={post.coverImage} alt={post.titleAr} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="container-custom py-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-10 max-w-5xl">
            {/* Article */}
            <article>
              {/* Header */}
              <header className="mb-8">
                {post.category && (
                  <Link
                    href={`/blog?category=${post.category.slug}`}
                    className="inline-block text-sm font-bold px-3 py-1.5 rounded-full mb-4 text-white"
                    style={{ backgroundColor: post.category.color || "#6366f1" }}
                  >
                    {post.category.nameAr}
                  </Link>
                )}
                <h1 className="text-3xl md:text-4xl font-black text-fg leading-tight mb-5">
                  {post.titleAr}
                </h1>
                {post.excerptAr && (
                  <p className="text-lg text-fg-subtle leading-relaxed mb-5">{post.excerptAr}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-fg-subtle pb-6 border-b border-line">
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" /> {post.author.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" /> {post.readingTime} دقائق قراءة
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" /> {post.viewCount.toLocaleString("ar")} مشاهدة
                  </span>
                  {post.publishedAt && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <time dateTime={post.publishedAt.toISOString()}>
                        {format(new Date(post.publishedAt), "d MMMM yyyy", { locale: ar })}
                      </time>
                    </span>
                  )}
                </div>
              </header>

              {/* Markdown content */}
              <div
                className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-black prose-headings:text-fg dark:prose-headings:text-white prose-a:text-primary-600 prose-code:text-primary-700 dark:prose-code:text-primary-400 prose-pre:bg-surface-sunken dark:prose-pre:bg-surface-sunken prose-blockquote:border-primary-500"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="mt-8 pt-6 border-t border-line">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag className="h-4 w-4 text-fg-subtle" />
                    {post.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1.5 rounded-full bg-surface-sunken text-sm text-fg-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Table of contents */}
              {headings.length > 0 && (
                <div className="bg-surface-sunken rounded-2xl p-5 border border-line sticky top-24">
                  <h3 className="font-bold text-fg mb-3 text-sm">محتويات المقال</h3>
                  <nav className="space-y-1.5">
                    {headings.map((h) => (
                      <a
                        key={h.id}
                        href={`#${h.id}`}
                        className="block text-sm text-fg-subtle hover:text-primary-600 dark:hover:text-primary-400 transition-colors leading-snug"
                        style={{ paddingRight: `${(h.level - 1) * 12}px` }}
                      >
                        {h.text}
                      </a>
                    ))}
                  </nav>
                </div>
              )}
            </aside>
          </div>

          {/* Related posts */}
          {related.length > 0 && (
            <div className="mt-14 pt-10 border-t border-line">
              <h2 className="text-xl font-black text-fg mb-6">مقالات ذات صلة</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {related.map((rp) => (
                  <Link key={rp.id} href={`/blog/${rp.slug}`} className="group">
                    <div className="bg-surface-sunken rounded-2xl overflow-hidden border border-line hover:border-primary-300 dark:hover:border-primary-700 transition-all">
                      {rp.coverImage ? (
                        <div className="aspect-video overflow-hidden">
                          <img src={rp.coverImage} alt={rp.titleAr} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      ) : (
                        <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
                          <span className="text-3xl">📝</span>
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-bold text-fg group-hover:text-primary-600 transition-colors line-clamp-2 text-sm">{rp.titleAr}</h3>
                        <p className="text-xs text-fg-subtle mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {rp.readingTime} دقيقة
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
