/**
 * Import products exported from Salla (منصة سلة) into this store.
 *
 * Usage:
 *   npx tsx prisma/import-salla.ts [path-to-csv]
 *   (defaults to prisma/data/najd-products.csv)
 *
 * Idempotent: products are upserted by slug, categories by slug — safe to re-run.
 */
import { PrismaClient, DeliveryMethod } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

/* ─────────── CSV parser (RFC 4180: quotes, "" escapes, embedded commas/newlines) ─────────── */
function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, ""); // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  // Drop fully-empty rows
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

/* ─────────── helpers ─────────── */
const clean = (v: string | undefined): string => {
  const s = (v ?? "").trim();
  return s === "\\N" ? "" : s;
};

const parseNum = (v: string | undefined): number | null => {
  const s = clean(v);
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s/\\]+/g, "-")
    // Remove punctuation/symbols (keeps Arabic letters & alphanumerics)
    .replace(/["'’“”.,،؛:!؟?()\[\]{}<>|@#$%^&*+=~`×–—…]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Leaf of a Salla category path like "تصاميمك مطبوعه > طباعة حراريه" → "طباعة حراريه" */
const leafCategory = (path: string): string => {
  const parts = path.split(">").map((p) => p.trim());
  return parts[parts.length - 1] || path.trim();
};

const CATEGORY_EMOJI = "🖨️";
const CATEGORY_COLORS = ["#7c3aed", "#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#6366f1", "#14b8a6"];
const SKIP_CATEGORIES = new Set(["جميع المنتجات"]);
// Seasonal collections — kept out of "primary category" selection (still real categories)
const DEPRIORITIZE_CATEGORIES = new Set(["اليوم الوطني"]);

const DRY = process.argv.includes("--dry");

async function main() {
  const csvPath = process.argv.find((a) => a.endsWith(".csv")) || join(__dirname, "data", "najd-products.csv");
  console.log(`📄 Reading: ${csvPath}`);
  const raw = readFileSync(csvPath, "utf8");
  const rows = parseCsv(raw);

  if (rows.length < 2) {
    console.error("❌ No data rows found in CSV");
    process.exit(1);
  }

  // Build header → index map (trim header names)
  const header = rows[0].map((h) => h.trim());
  const idx: Record<string, number> = {};
  header.forEach((h, i) => { idx[h] = i; });

  const col = (r: string[], name: string): string => {
    const i = idx[name];
    return i === undefined ? "" : clean(r[i]);
  };

  // ── Categories: collect unique leaves, upsert, cache slug→id ──
  const categoryCache = new Map<string, string>(); // nameAr → id
  let categorySort = 100;

  async function ensureCategory(nameAr: string): Promise<string> {
    if (categoryCache.has(nameAr)) return categoryCache.get(nameAr)!;
    const slug = slugify(nameAr) || `cat-${categorySort}`;
    const color = CATEGORY_COLORS[categoryCache.size % CATEGORY_COLORS.length];
    if (DRY) { categorySort++; categoryCache.set(nameAr, `dry-${slug}`); return `dry-${slug}`; }
    const cat = await prisma.category.upsert({
      where: { slug },
      update: { nameAr, name: nameAr },
      create: {
        name: nameAr,
        nameAr,
        slug,
        icon: CATEGORY_EMOJI,
        color,
        sortOrder: categorySort++,
        isActive: true,
      },
    });
    categoryCache.set(nameAr, cat.id);
    return cat.id;
  }

  const dataRows = rows.slice(1);
  let created = 0, updated = 0, skipped = 0;

  for (const r of dataRows) {
    const name = col(r, "أسم المنتج");
    if (!name) { skipped++; continue; }

    const no = col(r, "No.") || String(Date.now());

    // Categories → primary = first meaningful leaf
    const catLeaves = col(r, "تصنيف المنتج")
      .split(",")
      .map((c) => leafCategory(c))
      .filter((c) => c && !SKIP_CATEGORIES.has(c));
    const primaryName =
      catLeaves.find((c) => !DEPRIORITIZE_CATEGORIES.has(c)) || catLeaves[0] || "منتجات عامة";
    const categoryId = await ensureCategory(primaryName);

    // Price / discount
    let price = parseNum(col(r, "سعر المنتج")) ?? 0;
    const discounted = parseNum(col(r, "السعر المخفض"));
    let comparePrice: number | null = null;
    if (discounted && discounted > 0 && discounted < price) {
      comparePrice = price;
      price = discounted;
    }

    // Images
    const images = col(r, "صورة المنتج")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^https?:\/\//i.test(s));

    // Stock / availability
    const unlimited = ["نعم", "1", "true"].includes(col(r, "غير محدود الكمية"));
    const qty = parseNum(col(r, "الكمية المتوفرة"));
    const stockCount = unlimited ? 999999 : (qty && qty > 0 ? Math.floor(qty) : 999999);

    const isActive = col(r, "حالة المنتج") === "متاح";
    const isFeatured = col(r, "تثبيت المنتج") === "نعم";

    // Slug: prefer a clean ascii custom slug, else slugified arabic name + salla id
    const custom = col(r, "رابط مخصص للمنتج");
    const slug = /^[a-z0-9-]+$/i.test(custom) ? custom.toLowerCase() : `${slugify(name) || "product"}-${no}`;

    // Tags: carry Salla id + SKU + SEO title (used by product layout's custom-SEO system)
    const tags: string[] = [`salla:${no}`];
    const sku = col(r, "رمز المنتج sku");
    if (sku) tags.push(`sku:${sku}`);
    const seoTitle = col(r, "عنوان صفحة المنتج");
    if (seoTitle && seoTitle !== "{Name}") tags.push(`seo_title:${seoTitle}`);

    const description = col(r, "الوصف"); // rich HTML

    const data = {
      name,
      nameAr: name,
      slug,
      description: description || null,
      descriptionAr: description || null,
      price,
      comparePrice,
      image: images[0] || null,
      images,
      categoryId,
      deliveryMethod: DeliveryMethod.MANUAL, // printing = made to order
      isActive,
      isFeatured,
      features: [] as string[],
      featuresAr: [] as string[],
      tags,
      stockCount,
      isDeleted: false,
    };

    if (DRY) {
      created++;
      console.log(`  ＋ ${name}\n     slug=${slug} | cat=${primaryName} | ${price} SAR${comparePrice ? ` (كان ${comparePrice})` : ""} | imgs=${images.length} | stock=${stockCount} | ${isActive ? "متاح" : "مخفي"}${isFeatured ? " ★" : ""} | tags=[${tags.join(", ")}]`);
      continue;
    }

    const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    await prisma.product.upsert({
      where: { slug },
      update: data,
      create: data,
    });
    if (existing) { updated++; } else { created++; }
    console.log(`  ${existing ? "↻" : "＋"} ${name}  →  [${primaryName}]  ${price} SAR  ${isActive ? "" : "(مخفي)"}`);
  }

  console.log("");
  console.log(`✅ Done. Categories: ${categoryCache.size} | Products created: ${created}, updated: ${updated}, skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error("❌ Import failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
