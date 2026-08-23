/**
 * Shared import/export utilities for products, customers, and orders.
 *
 * Reads spreadsheets (.xlsx / .xls / .csv) using SheetJS and maps their columns
 * to our data model. Column matching is alias-based and case/whitespace
 * insensitive, so the same importer accepts both our own exported files and
 * the Excel files exported from Salla (سلة), whose headers are in Arabic.
 */
import * as XLSX from "xlsx";

/* ── Reading ──────────────────────────────────────────────────────────────── */

/** Parse an uploaded spreadsheet buffer into an array of row objects keyed by header. */
export function parseSpreadsheet(buffer: Buffer): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  // defval keeps empty cells as "" so column keys stay stable across rows
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return rows;
}

/** Build an .xlsx file as a Uint8Array from an array of plain objects. */
export function rowsToXlsx(rows: Record<string, unknown>[], sheetName = "Sheet1"): Uint8Array {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

/** Build a UTF-8 CSV string (with BOM so Excel opens Arabic correctly). */
export function rowsToCsv(rows: Record<string, unknown>[]): string {
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  return "﻿" + csv; // BOM
}

/* ── Cell helpers ─────────────────────────────────────────────────────────── */

const normHeader = (s: string) => s.toString().trim().toLowerCase().replace(/\s+/g, " ");

/** Return the first non-empty cell value whose header matches any of the aliases. */
export function pick(row: Record<string, unknown>, aliases: string[]): string | undefined {
  const wanted = aliases.map(normHeader);
  for (const key of Object.keys(row)) {
    if (wanted.includes(normHeader(key))) {
      const val = row[key];
      if (val !== null && val !== undefined && String(val).trim() !== "") {
        return String(val).trim();
      }
    }
  }
  return undefined;
}

/**
 * Turn a value from a slug/permalink column into a safe single-segment slug.
 * Salla exports often put a full product URL (e.g.
 * "https://najd.sa/1434990639/علب-فشار...") or a percent-encoded permalink here.
 * We decode it, keep only the path, drop slashes/query, normalize (NFC) and trim
 * — so the stored slug always matches what the router later resolves.
 */
export function sanitizeSlug(val: string | undefined): string | undefined {
  if (!val) return undefined;
  let s = val.trim();
  try { s = decodeURIComponent(s); } catch { /* keep as-is if malformed */ }
  s = s.replace(/^https?:\/\/[^/]+/i, ""); // strip protocol + domain
  s = s.split("?")[0].split("#")[0];        // drop query/hash
  s = s.replace(/^\/+|\/+$/g, "");          // trim leading/trailing slashes
  s = s.replace(/\//g, "-");                // any remaining slash → dash
  s = s.replace(/\s+/g, "-");               // spaces → dash
  try { s = s.normalize("NFC"); } catch { /* ignore */ }
  s = s.replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
  return s || undefined;
}

/** Convert Arabic-Indic digits to Latin and parse a number, tolerating commas/currency text. */
export function parseNumber(val: string | undefined): number | undefined {
  if (val === undefined) return undefined;
  const latin = val
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/٫/g, ".")       // Arabic decimal separator → dot
    .replace(/[٬،,]/g, "");   // Arabic/Latin thousands & list separators → drop
  const cleaned = latin.replace(/[^\d.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return undefined;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/** Interpret a cell as a boolean (Arabic + English truthy words). */
export function parseBool(val: string | undefined, fallback = true): boolean {
  if (val === undefined) return fallback;
  const v = val.trim().toLowerCase();
  if (["1", "true", "yes", "y", "نعم", "مفعل", "نشط", "فعال", "متاح", "مفعّل"].includes(v)) return true;
  if (["0", "false", "no", "n", "لا", "معطل", "غير نشط", "غير متاح", "مخفي"].includes(v)) return false;
  return fallback;
}

/** Normalize a phone number: convert Arabic digits, strip spaces/dashes. */
export function normalizePhone(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const latin = val.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const cleaned = latin.replace(/[^\d+]/g, "");
  return cleaned || undefined;
}

/* ── Header alias maps (our headers + Salla Arabic headers) ───────────────── */

export const PRODUCT_ALIASES = {
  name: ["name", "الاسم", "اسم المنتج", "المنتج", "product name", "product", "title", "العنوان"],
  nameAr: ["nameAr", "الاسم العربي", "الاسم بالعربية", "اسم المنتج بالعربية"],
  slug: ["slug", "الرابط", "المعرف", "handle"],
  description: ["description", "الوصف", "وصف المنتج", "التفاصيل"],
  price: ["price", "السعر", "سعر البيع", "السعر بعد الخصم", "sale price", "amount"],
  comparePrice: ["comparePrice", "compare price", "سعر المقارنة", "السعر قبل الخصم", "regular price", "السعر الأصلي"],
  sku: ["sku", "رقم المنتج", "رمز المنتج", "الرمز", "mpn", "barcode", "الباركود"],
  stock: ["stock", "stockCount", "الكمية", "المخزون", "الكمية المتوفرة", "quantity", "qty", "الكميه"],
  category: ["category", "categoryName", "التصنيف", "التصنيفات", "الفئة", "القسم", "categories"],
  image: ["image", "الصورة", "صورة المنتج", "رابط الصورة", "image url", "images"],
  active: ["active", "isActive", "الحالة", "الحاله", "status", "متاح", "الظهور"],
  featured: ["featured", "isFeatured", "مميز", "منتج مميز"],
};

export const CUSTOMER_ALIASES = {
  name: ["name", "الاسم", "اسم العميل", "الاسم الكامل", "customer name", "full name"],
  firstName: ["first name", "firstName", "الاسم الأول", "الاسم الاول"],
  lastName: ["last name", "lastName", "الاسم الأخير", "الاسم الاخير", "اسم العائلة"],
  email: ["email", "البريد الإلكتروني", "البريد الالكتروني", "الايميل", "البريد", "e-mail"],
  phone: ["phone", "mobile", "الجوال", "رقم الجوال", "الهاتف", "رقم الهاتف", "الموبايل", "mobile number"],
  active: ["active", "isActive", "الحالة", "status", "مفعل"],
  createdAt: ["createdAt", "تاريخ التسجيل", "تاريخ الإنشاء", "تاريخ الانضمام", "registered at", "join date"],
};

export const ORDER_ALIASES = {
  orderNumber: ["orderNumber", "رقم الطلب", "order number", "order id", "رقم الفاتورة", "رقم"],
  customerName: ["customer", "customerName", "العميل", "اسم العميل", "customer name"],
  customerEmail: ["email", "customerEmail", "البريد الإلكتروني", "البريد الالكتروني", "بريد العميل"],
  customerPhone: ["phone", "customerPhone", "الجوال", "رقم الجوال", "جوال العميل", "الهاتف"],
  total: ["total", "الإجمالي", "الاجمالي", "المجموع", "المبلغ", "الإجمالي الكلي", "grand total", "amount"],
  subtotal: ["subtotal", "المجموع الفرعي", "الإجمالي الفرعي", "قبل الخصم"],
  discount: ["discount", "الخصم", "قيمة الخصم"],
  status: ["status", "الحالة", "الحاله", "حالة الطلب", "order status"],
  createdAt: ["createdAt", "date", "تاريخ الطلب", "التاريخ", "تاريخ الإنشاء", "order date"],
  notes: ["notes", "الملاحظات", "ملاحظات", "note"],
};

/* ── Order status mapping (Salla Arabic → our OrderStatus enum) ───────────── */

const ORDER_STATUS_MAP: Record<string, string> = {
  // our own English values pass through
  pending: "PENDING",
  pending_payment_review: "PENDING_PAYMENT_REVIEW",
  payment_approved: "PAYMENT_APPROVED",
  processing: "PROCESSING",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
  refunded: "REFUNDED",
  // Salla / Arabic labels
  "بانتظار المراجعة": "PENDING_PAYMENT_REVIEW",
  "بانتظار مراجعة الدفع": "PENDING_PAYMENT_REVIEW",
  "بانتظار الدفع": "PENDING",
  "بانتظار الدفع اليدوي": "PENDING",
  "قيد المراجعة": "PENDING_PAYMENT_REVIEW",
  "جديد": "PENDING",
  "قيد التنفيذ": "PROCESSING",
  "قيد المعالجة": "PROCESSING",
  "جاري التجهيز": "PROCESSING",
  "قيد الشحن": "PROCESSING",
  "تم الشحن": "PROCESSING",
  "تم التنفيذ": "DELIVERED",
  "تم التوصيل": "DELIVERED",
  "تم التسليم": "DELIVERED",
  "مكتمل": "DELIVERED",
  "منفذ": "DELIVERED",
  "ملغي": "CANCELLED",
  "ملغى": "CANCELLED",
  "تم الإلغاء": "CANCELLED",
  "مسترجع": "REFUNDED",
  "تم الاسترجاع": "REFUNDED",
  "مسترد": "REFUNDED",
};

export function mapOrderStatus(val: string | undefined): string {
  if (!val) return "PENDING";
  const key = val.trim().toLowerCase();
  return ORDER_STATUS_MAP[key] || ORDER_STATUS_MAP[val.trim()] || "PENDING";
}

/* ── Blank templates (header row + one example) ───────────────────────────── */

export const TEMPLATES: Record<"products" | "customers" | "orders", Record<string, unknown>[]> = {
  products: [{
    "الاسم": "اشتراك نتفلكس شهر",
    "الوصف": "اشتراك مميز لمدة شهر",
    "السعر": 45,
    "سعر المقارنة": 60,
    "التصنيف": "اشتراكات",
    "الكمية": 100,
    "الصورة": "https://example.com/image.jpg",
    "مميز": "لا",
    "الحالة": "نشط",
  }],
  customers: [{
    "الاسم": "محمد أحمد",
    "البريد الإلكتروني": "customer@example.com",
    "الجوال": "0555555555",
    "الحالة": "نشط",
  }],
  orders: [{
    "رقم الطلب": "ORD-1001",
    "العميل": "محمد أحمد",
    "البريد الإلكتروني": "customer@example.com",
    "الجوال": "0555555555",
    "المجموع الفرعي": 100,
    "الخصم": 10,
    "الإجمالي": 90,
    "الحالة": "تم التنفيذ",
    "الملاحظات": "",
    "تاريخ الطلب": "2026-01-01",
  }],
};

/* ── Result shape shared by all importers ─────────────────────────────────── */

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export const emptyResult = (): ImportResult => ({ total: 0, created: 0, updated: 0, skipped: 0, errors: [] });
