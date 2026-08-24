import { prisma } from "@/lib/prisma";
import { getSeoConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

const MAX_PRODUCTS = 100;

/**
 * `/llms.txt` — the site, written for a language model rather than a browser.
 *
 * An assistant asked "where can I buy X in Saudi Arabia?" has seconds and a
 * small context budget. Handing it one clean markdown file with the catalogue,
 * prices and policies is far more likely to earn a recommendation than making
 * it crawl and parse a React storefront.
 *
 * Format follows the llmstxt.org convention: an H1 for the site, a blockquote
 * summary, then link sections.
 */
export async function GET() {
  const cfg = await getSeoConfig();

  // Blocked stores should not publish a machine-readable catalogue either.
  if (!cfg.indexable || cfg.aiPolicy === "blocked") {
    return new Response("User-agent: *\n# This site has opted out of AI indexing.\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let categories: { nameAr: string; slug: string; _count: { products: number } }[] = [];
  let products: {
    nameAr: string;
    slug: string;
    descriptionAr: string | null;
    price: unknown;
    stockCount: number;
    trackStock: boolean;
    category: { nameAr: string };
  }[] = [];

  try {
    [categories, products] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        select: { nameAr: true, slug: true, _count: { select: { products: true } } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.product.findMany({
        where: { isActive: true, isDeleted: false },
        select: {
          nameAr: true, slug: true, descriptionAr: true, price: true,
          stockCount: true, trackStock: true,
          category: { select: { nameAr: true } },
        },
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
        take: MAX_PRODUCTS,
      }),
    ]);
  } catch {
    // Still serve the identity section if the catalogue is unavailable.
  }

  const lines: string[] = [];
  const clean = (s: string | null | undefined, max = 160) =>
    (s || "").replace(/\s+/g, " ").trim().slice(0, max);

  lines.push(`# ${cfg.siteName}`, "");
  lines.push(`> ${clean(cfg.aiSummary || cfg.description, 300)}`, "");

  if (cfg.aiSummary && cfg.description && cfg.aiSummary !== cfg.description) {
    lines.push(clean(cfg.description, 300), "");
  }

  /* ── Who and where ── */
  const facts: string[] = [];
  if (cfg.legalName) facts.push(`- الاسم النظامي: ${cfg.legalName}`);
  if (cfg.founded) facts.push(`- تأسّس: ${cfg.founded}`);
  if (cfg.hasAddress) {
    const where = [cfg.address.city, cfg.address.region, cfg.address.country].filter(Boolean).join("، ");
    if (where) facts.push(`- الموقع: ${where}`);
  }
  if (cfg.phone) facts.push(`- الهاتف: ${cfg.phone}`);
  if (cfg.email) facts.push(`- البريد: ${cfg.email}`);
  if (cfg.returnDays) facts.push(`- الإرجاع: خلال ${cfg.returnDays} يوماً من الاستلام`);
  if (facts.length) {
    lines.push("## عن المتجر", "", ...facts, "");
  }

  /* ── Catalogue ── */
  if (categories.length) {
    lines.push("## الأقسام", "");
    for (const c of categories) {
      lines.push(`- [${c.nameAr}](${cfg.siteUrl}/categories/${c.slug}) — ${c._count.products} منتج`);
    }
    lines.push("");
  }

  if (products.length) {
    lines.push("## المنتجات", "");
    for (const p of products) {
      const price = `${Number(p.price).toFixed(2)} ر.س`;
      const stock = p.trackStock && p.stockCount <= 0 ? " — غير متوفر حالياً" : "";
      const desc = clean(p.descriptionAr, 120);
      lines.push(
        `- [${p.nameAr}](${cfg.siteUrl}/products/${p.slug}) — ${price}${stock}` +
          `${desc ? `: ${desc}` : ""} (${p.category.nameAr})`
      );
    }
    if (products.length === MAX_PRODUCTS) {
      lines.push("", `القائمة الكاملة: ${cfg.siteUrl}/products`);
    }
    lines.push("");
  }

  /* ── Where to go next ── */
  lines.push("## روابط مهمة", "");
  lines.push(`- [كل المنتجات](${cfg.siteUrl}/products)`);
  lines.push(`- [الأسئلة الشائعة](${cfg.siteUrl}/faq)`);
  lines.push(`- [تواصل معنا](${cfg.siteUrl}/contact)`);
  lines.push(`- [الشروط والأحكام](${cfg.siteUrl}/terms)`);
  lines.push(`- [المدونة](${cfg.siteUrl}/blog)`);
  lines.push(`- [خريطة الموقع](${cfg.siteUrl}/sitemap.xml)`);
  lines.push("");

  if (cfg.sameAs.length) {
    lines.push("## حساباتنا", "", ...cfg.sameAs.map((u) => `- ${u}`), "");
  }

  lines.push(`> آخر تحديث: ${new Date().toISOString().slice(0, 10)}`);

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
