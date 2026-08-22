/**
 * Import historical ORDERS exported from Salla into this store.
 *
 * Usage:
 *   npx tsx prisma/import-salla-orders.ts [path-to-csv] [--dry]
 *   (defaults to prisma/data/najd-orders.csv)
 *
 * Each CSV row is a line item; rows sharing "رقم الطلب" form one order.
 * Idempotent: an order whose orderNumber already exists is skipped.
 */
import { PrismaClient, OrderStatus, PaymentMethod, PaymentStatus, DeliveryMethod } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

/* ── CSV parser (quotes, "" escapes, embedded commas/newlines) ── */
function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQ = false, i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const clean = (v: string | undefined): string => {
  const s = (v ?? "").trim().replace(/^'+|'+$/g, "");
  return s === "\\N" ? "" : s;
};
const num = (v: string | undefined): number => {
  const n = parseFloat(clean(v));
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

function slugify(input: string): string {
  return input.toString().trim().toLowerCase()
    .replace(/[\s/\\]+/g, "-")
    .replace(/["'’“”.,،؛:!؟?()\[\]{}<>|@#$%^&*+=~`×–—…]/g, "")
    .replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function mapStatus(s: string): OrderStatus {
  if (s.includes("ملغي") || s.includes("إلغاء")) return OrderStatus.CANCELLED;
  if (s.includes("مسترجع") || s.includes("استرجاع") || s.includes("مسترد")) return OrderStatus.REFUNDED;
  if (s.includes("توصيل") || s.includes("تسليم")) return OrderStatus.DELIVERED;
  if (s.includes("تنفيذ") || s.includes("جاري") || s.includes("شحن")) return OrderStatus.PROCESSING;
  if (s.includes("مراجعة") || s.includes("انتظار") || s.includes("بإنتظار")) return OrderStatus.PENDING_PAYMENT_REVIEW;
  return OrderStatus.PENDING;
}

function mapMethod(m: string): PaymentMethod {
  const s = m.toLowerCase();
  if (m.includes("تمارا") || s.includes("tamara")) return PaymentMethod.TAMARA;
  if (m.includes("تابي") || s.includes("tabby")) return PaymentMethod.TABBY;
  if (m.includes("حوالة") || m.includes("بنك") || s.includes("bank")) return PaymentMethod.BANK_TRANSFER;
  if (s.includes("paypal")) return PaymentMethod.PAYPAL;
  return PaymentMethod.CREDIT_CARD; // مدى / Apple Pay / STC Pay / COD → closest
}

function mapPayStatus(s: string): PaymentStatus {
  const v = s.toLowerCase();
  if (v === "paid" || v.includes("مدفوع")) return PaymentStatus.APPROVED;
  return PaymentStatus.PENDING;
}

async function main() {
  const csvPath = process.argv.find((a) => a.endsWith(".csv")) || join(__dirname, "data", "najd-orders.csv");
  console.log(`📄 Reading: ${csvPath}${DRY ? "  (DRY RUN)" : ""}`);
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  if (rows.length < 2) { console.error("❌ No data rows"); process.exit(1); }

  const header = rows[0].map((h) => h.trim());
  const idx: Record<string, number> = {};
  header.forEach((h, i) => { idx[h] = i; });
  const col = (r: string[], name: string) => clean(r[idx[name]]);

  // Group line rows by order number
  const groups = new Map<string, string[][]>();
  for (const r of rows.slice(1)) {
    const on = col(r, "رقم الطلب");
    if (!on) continue;
    if (!groups.has(on)) groups.set(on, []);
    groups.get(on)!.push(r);
  }
  console.log(`🧾 ${groups.size} orders / ${rows.length - 1} line items`);

  // ── Product & user resolution caches (live only) ──
  const nameToProduct = new Map<string, string>();
  const skuToProduct = new Map<string, string>();
  const usedSlugs = new Set<string>();
  let importedCategoryId = "";

  if (!DRY) {
    const products = await prisma.product.findMany({ select: { id: true, nameAr: true, name: true, slug: true, tags: true } });
    for (const p of products) {
      nameToProduct.set(p.nameAr, p.id);
      nameToProduct.set(p.name, p.id);
      usedSlugs.add(p.slug);
      for (const t of p.tags) if (t.startsWith("sku:")) skuToProduct.set(t.slice(4), p.id);
    }
    const cat = await prisma.category.upsert({
      where: { slug: "imported" },
      update: {},
      create: { name: "Imported", nameAr: "منتجات مستوردة", slug: "imported", icon: "📥", color: "#64748b", isActive: false, sortOrder: 999 },
    });
    importedCategoryId = cat.id;
  }

  async function resolveProduct(name: string, sku: string, price: number): Promise<string> {
    if (nameToProduct.has(name)) return nameToProduct.get(name)!;
    if (sku && skuToProduct.has(sku)) return skuToProduct.get(sku)!;
    // create a hidden placeholder so the historical order can reference it
    let base = sku ? `imp-${slugify(sku)}` : `imp-${slugify(name).slice(0, 40)}`;
    let slug = base, n = 1;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);
    const p = await prisma.product.create({
      data: {
        name: name || "منتج مستورد",
        nameAr: name || "منتج مستورد",
        slug,
        price: price || 0,
        categoryId: importedCategoryId,
        deliveryMethod: DeliveryMethod.MANUAL,
        isActive: false,
        stockCount: 0,
        tags: sku ? [`sku:${sku}`, "imported"] : ["imported"],
      },
    });
    nameToProduct.set(name, p.id);
    if (sku) skuToProduct.set(sku, p.id);
    return p.id;
  }

  async function resolveUser(name: string, phone: string, orderNo: string): Promise<string> {
    const digits = phone.replace(/\D/g, "");
    const email = digits ? `c${digits}@imported.najd` : `salla-order-${orderNo}@imported.najd`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { name: name || undefined },
      create: {
        name: name || "عميل",
        email,
        password: randomBytes(16).toString("hex"),
        role: "CUSTOMER",
        phone: phone || null,
      },
    });
    return user.id;
  }

  let created = 0, skipped = 0;

  for (const [orderNo, lines] of Array.from(groups.entries())) {
    const first = lines[0];
    const statusRaw = col(first, "حالة الطلب");
    const methodRaw = col(first, "طريقة الدفع");
    const payRaw = col(first, "حالة الدفع");
    const city = col(first, "المدينة") || col(first, "مدينة الشحن");
    const address = col(first, "عنوان الشحن");
    const carrier = col(first, "طريقة الشحن");
    const tracking = col(first, "رابط تتبع الطلب");
    const customer = col(first, "اسم العميل");
    const phone = col(first, "رقم الجوال");
    const dateStr = col(first, "تاريخ الطلب");
    const currency = col(first, "العملة") || "SAR";

    // NOTE: "سعر المنتج" is the LINE total (quantity already included), not the unit price.
    const subtotal = round2(lines.reduce((s: number, r: string[]) => s + num(col(r, "سعر المنتج")), 0));
    const discount = round2(lines.reduce((s: number, r: string[]) => s + num(col(r, "الخصم (على مستوى المنتج)")), 0));
    const tax = num(col(first, "الضريبة"));
    const shipping = round2(lines.reduce((s: number, r: string[]) => s + num(col(r, "تكلفة الشحن (على مستوى المنتج)")), 0));
    const total = round2(subtotal - discount + tax + shipping);

    const status = mapStatus(statusRaw);
    const method = mapMethod(methodRaw);
    const payStatus = mapPayStatus(payRaw);
    const createdAt = dateStr ? new Date(dateStr.replace(" ", "T")) : new Date();

    const notes = [
      "استيراد من سلة",
      `الحالة الأصلية: ${statusRaw}`,
      methodRaw && `الدفع: ${methodRaw}`,
      city && `المدينة: ${city}`,
      address && `العنوان: ${address}`,
      carrier && `الشحن: ${carrier}`,
      tracking && `تتبع: ${tracking}`,
      `ضريبة: ${tax} | شحن: ${shipping}`,
    ].filter(Boolean).join(" — ");

    if (DRY) {
      created++;
      console.log(`  #${orderNo}  ${statusRaw}→${status}  ${method}/${payStatus}  ${lines.length} بند  = ${total} ${currency}  (${customer || "—"})`);
      continue;
    }

    const exists = await prisma.order.findUnique({ where: { orderNumber: orderNo }, select: { id: true } });
    if (exists) { skipped++; continue; }

    const userId = await resolveUser(customer, phone, orderNo);

    const items = [];
    for (const r of lines) {
      const pName = col(r, "اسم المنتج");
      const sku = col(r, "SKU");
      const lineTotal = num(col(r, "سعر المنتج")); // line total (qty included)
      const qty = Math.max(1, Math.round(num(col(r, "الكمية")) || 1));
      const unitPrice = round2(lineTotal / qty);
      const productId = await resolveProduct(pName, sku, unitPrice);
      items.push({ productId, quantity: qty, price: unitPrice, variantLabel: pName || null });
    }

    await prisma.order.create({
      data: {
        orderNumber: orderNo,
        userId,
        status,
        subtotal,
        discount,
        total,
        notes,
        createdAt,
        items: { create: items },
        payment: {
          create: {
            method,
            status: payStatus,
            amount: total,
            notes: methodRaw || null,
          },
        },
      },
    });
    created++;
    console.log(`  ＋ #${orderNo}  ${status}  ${items.length} بند  = ${total} ${currency}`);
  }

  console.log("");
  console.log(`✅ Done. Orders created: ${created}, skipped(existing): ${skipped}`);
}

main()
  .catch((e) => { console.error("❌ Import failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
