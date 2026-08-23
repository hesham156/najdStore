import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = "SAR", symbol = "ر.س") {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${num.toFixed(2)} ${symbol}`;
}

export function formatDate(date: Date | string, locale = "ar-SA") {
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Riyadh", // Prevents hydration mismatch between SSR/CSR
  });
}

export function formatDateTime(date: Date | string, locale = "ar-SA") {
  return new Date(date).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Riyadh", // Prevents hydration mismatch between SSR/CSR
  });
}

export function generateOrderNumber() {
  return `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export function generateTicketNumber() {
  return `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export function getOrderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "في الانتظار",
    PENDING_PAYMENT_REVIEW: "بانتظار مراجعة الدفع",
    PAYMENT_APPROVED: "تم الموافقة على الدفع",
    PROCESSING: "جاري المعالجة",
    DELIVERED: "تم التسليم",
    CANCELLED: "ملغي",
    REFUNDED: "مسترد",
  };
  return labels[status] || status;
}

export function getOrderStatusColor(status: string) {
  const colors: Record<string, string> = {
    PENDING: "yellow",
    PENDING_PAYMENT_REVIEW: "blue",
    PAYMENT_APPROVED: "indigo",
    PROCESSING: "purple",
    DELIVERED: "green",
    CANCELLED: "red",
    REFUNDED: "gray",
  };
  return colors[status] || "gray";
}

export function getPaymentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "في الانتظار",
    UPLOADED: "تم الرفع",
    APPROVED: "موافق عليه",
    REJECTED: "مرفوض",
  };
  return labels[status] || status;
}

export function getPaymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    BANK_TRANSFER: "تحويل بنكي",
    CREDIT_CARD: "بطاقة ائتمانية",
    CRYPTO: "عملة رقمية",
    PAYPAL: "باي بال",
    TABBY: "تابي",
    TAMARA: "تمارا",
  };
  return labels[method] || method;
}

export function getTicketStatusLabel(status: string) {
  const labels: Record<string, string> = {
    OPEN: "مفتوح",
    IN_PROGRESS: "قيد المعالجة",
    RESOLVED: "محلول",
    CLOSED: "مغلق",
  };
  return labels[status] || status;
}

export function getPriorityLabel(priority: string) {
  const labels: Record<string, string> = {
    LOW: "منخفض",
    MEDIUM: "متوسط",
    HIGH: "عالي",
    URGENT: "عاجل",
  };
  return labels[priority] || priority;
}

export function truncate(str: string, maxLength: number) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .trim();
}

/**
 * Non-ASCII (Arabic) slugs can mismatch between the URL param and the stored
 * value because of percent-encoding or Unicode normalization (NFC vs NFD).
 * This returns every equivalent form of a slug so a lookup with
 * `where: { slug: { in: slugCandidates(param) } }` matches regardless of how
 * the slug was stored — e.g. products imported from Salla with encoded slugs.
 */
export function slugCandidates(raw: string): string[] {
  const out = new Set<string>();
  const add = (s?: string) => {
    if (!s) return;
    out.add(s);
    try { out.add(s.normalize("NFC")); } catch { /* ignore */ }
    try { out.add(s.normalize("NFD")); } catch { /* ignore */ }
  };
  add(raw);
  try { add(decodeURIComponent(raw)); } catch { /* malformed encoding */ }
  try { add(encodeURIComponent(raw)); } catch { /* ignore */ }
  return Array.from(out);
}

/**
 * Flat shipping fee with an optional free-shipping threshold (based on subtotal).
 * Kept in one place so the checkout and the server compute the same value.
 */
export function computeShipping(subtotal: number, fee: number, freeThreshold: number): number {
  if (!fee || fee <= 0) return 0;
  if (freeThreshold > 0 && subtotal >= freeThreshold) return 0;
  return fee;
}

/** Resolve the shipping base fee for a city, falling back to the flat fee for unlisted cities. */
export function resolveCityFee(
  city: string | undefined | null,
  rates: { city: string; cost: number }[],
  flatFee: number,
): number {
  if (city && rates.length) {
    const c = city.trim().toLowerCase();
    const match = rates.find((r) => r.city.trim().toLowerCase() === c);
    if (match) return match.cost;
  }
  return flatFee;
}

/**
 * Serialize a Prisma product (or any object) to a plain JSON-safe object.
 * Converts Decimal fields (price, comparePrice) to plain numbers so they
 * can safely be passed from Server Components to Client Components.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/** Parse variants stored as tags in the format "variant:label:price[:comparePrice]" */
export function parseProductVariants(tags: string[]): { label: string; price: number; comparePrice?: number }[] {
  return tags
    .filter((t) => t.startsWith("variant:"))
    .map((t) => {
      const parts = t.split(":");
      // parts[0] = "variant", parts[1] = label, parts[2] = price, parts[3] = comparePrice (optional)
      return {
        label: parts[1] || "",
        price: parseFloat(parts[2]) || 0,
        comparePrice: parts[3] ? parseFloat(parts[3]) : undefined,
      };
    })
    .filter((v) => v.label && v.price > 0);
}
