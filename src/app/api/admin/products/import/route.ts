import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";
import { slugify } from "@/lib/utils";
import {
  parseSpreadsheet, pick, parseNumber, parseBool, sanitizeSlug,
  PRODUCT_ALIASES, emptyResult, type ImportResult,
} from "@/lib/import-export";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("لم يتم إرفاق ملف");

    const buffer = Buffer.from(await file.arrayBuffer());
    let rows: Record<string, unknown>[];
    try {
      rows = parseSpreadsheet(buffer);
    } catch {
      return badRequest("تعذّر قراءة الملف. تأكد أنه Excel أو CSV صالح");
    }
    if (rows.length === 0) return badRequest("الملف فارغ");

    const result: ImportResult = emptyResult();
    result.total = rows.length;

    // Category cache: name(lower) → id. Resolve/create categories as needed.
    const catCache = new Map<string, string>();
    const existingCats = await prisma.category.findMany({ select: { id: true, name: true, nameAr: true } });
    for (const c of existingCats) {
      if (c.name) catCache.set(c.name.trim().toLowerCase(), c.id);
      if (c.nameAr) catCache.set(c.nameAr.trim().toLowerCase(), c.id);
    }

    const resolveCategory = async (catName: string | undefined): Promise<string> => {
      const label = (catName || "منتجات مستوردة").trim();
      const key = label.toLowerCase();
      const cached = catCache.get(key);
      if (cached) return cached;
      const created = await prisma.category.create({
        data: {
          name: label,
          nameAr: label,
          slug: `${slugify(label) || "cat"}-${Date.now().toString(36)}`,
        },
      });
      catCache.set(key, created.id);
      return created.id;
    };

    // Ensure generated slugs stay unique within this batch + DB.
    const uniqueSlug = async (base: string): Promise<string> => {
      let candidate = base || `product-${Date.now().toString(36)}`;
      let i = 1;
      // small loop; product count per import is bounded
      while (await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } })) {
        candidate = `${base}-${i++}`;
      }
      return candidate;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNo = i + 2; // header is row 1
      try {
        const name = pick(row, PRODUCT_ALIASES.name);
        const price = parseNumber(pick(row, PRODUCT_ALIASES.price));
        if (!name) { result.skipped++; result.errors.push({ row: rowNo, message: "اسم المنتج مفقود" }); continue; }
        if (price === undefined) { result.skipped++; result.errors.push({ row: rowNo, message: "السعر مفقود أو غير صالح" }); continue; }

        const nameAr = pick(row, PRODUCT_ALIASES.nameAr) || name;
        const providedSlug = sanitizeSlug(pick(row, PRODUCT_ALIASES.slug));
        const description = pick(row, PRODUCT_ALIASES.description);
        const comparePrice = parseNumber(pick(row, PRODUCT_ALIASES.comparePrice));
        const stock = parseNumber(pick(row, PRODUCT_ALIASES.stock));
        const image = pick(row, PRODUCT_ALIASES.image);
        const isActive = parseBool(pick(row, PRODUCT_ALIASES.active), true);
        const isFeatured = parseBool(pick(row, PRODUCT_ALIASES.featured), false);
        const categoryId = await resolveCategory(pick(row, PRODUCT_ALIASES.category));

        // Match existing product by slug (if provided) else by name.
        const existing = providedSlug
          ? await prisma.product.findUnique({ where: { slug: providedSlug } })
          : await prisma.product.findFirst({ where: { OR: [{ name }, { nameAr }] } });

        const dataCommon = {
          name, nameAr,
          description: description ?? undefined,
          descriptionAr: description ?? undefined,
          price, comparePrice: comparePrice ?? null,
          categoryId,
          image: image ?? undefined,
          stockCount: stock ?? undefined,
          isActive, isFeatured,
        };

        if (existing) {
          await prisma.product.update({ where: { id: existing.id }, data: dataCommon });
          result.updated++;
        } else {
          const slug = await uniqueSlug(providedSlug || slugify(name));
          await prisma.product.create({
            data: {
              ...dataCommon,
              slug,
              stockCount: stock ?? 0,
              deliveryMethod: "MANUAL",
            },
          });
          result.created++;
        }
      } catch (e) {
        result.skipped++;
        result.errors.push({ row: rowNo, message: e instanceof Error ? e.message : "خطأ غير معروف" });
      }
    }

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "IMPORT_PRODUCTS",
        entity: "Product",
        details: { created: result.created, updated: result.updated, skipped: result.skipped, total: result.total },
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return serverError("POST /api/admin/products/import", err);
  }
}
