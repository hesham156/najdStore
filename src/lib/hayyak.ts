/**
 * تكامل منصة "حياك" (Hayyak) — متجر مبرمَج خاص
 * ----------------------------------------------------------------------------
 * يدفع هذا المتجر بياناته إلى حياك عبر طلبات HTTP موقّعة بـ HMAC-SHA256:
 *   - الكتالوج الكامل  → POST /webhooks/custom/{store_id}/catalog
 *   - الأحداث اللحظية  → POST /webhooks/custom/{store_id}/events
 *
 * الإعداد من لوحة الإدارة (التكاملات) ويُخزَّن في جدول الإعدادات:
 *   hayyak_enabled          تفعيل/إيقاف التكامل ("true" | "false")
 *   hayyak_signing_secret   مفتاح التوقيع (whsec_...) — إلزامي لتفعيل الإرسال
 *   hayyak_store_id         معرّف المتجر في حياك
 *   hayyak_base_url         عنوان حياك
 *
 * ولأجل التوافق مع النشرات القديمة، تُستخدَم متغيّرات البيئة كقيَم افتراضية
 * احتياطية عند غياب الإعداد في قاعدة البيانات:
 *   HAYYAK_SIGNING_SECRET / HAYYAK_STORE_ID / HAYYAK_BASE_URL
 *
 * كل دوال الإشعار "أطلق وانسَ" (fire-and-forget): تلتقط أي خطأ داخلياً ولا
 * توقف المسار الأساسي للطلب أبداً، حتى لو كان حياك معطّلاً أو غير متاح.
 */
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// ── مفاتيح الإعداد في جدول الإعدادات ─────────────────────────────────────────
export const HAYYAK_SETTING_KEYS = {
  enabled: "hayyak_enabled",
  secret: "hayyak_signing_secret",
  storeId: "hayyak_store_id",
  baseUrl: "hayyak_base_url",
} as const;

const DEFAULT_STORE_ID = process.env.HAYYAK_STORE_ID || "pexelco";
const DEFAULT_BASE_URL = (process.env.HAYYAK_BASE_URL || "https://7ayak.app").replace(/\/+$/, "");
const ENV_SECRET = process.env.HAYYAK_SIGNING_SECRET || "";

export type HayyakConfig = {
  /** هل التكامل مفعّل فعلياً (المفتاح موجود + لم يُوقَف يدوياً)؟ */
  enabled: boolean;
  signingSecret: string;
  storeId: string;
  baseUrl: string;
};

/**
 * تحميل إعداد حياك من قاعدة البيانات مع الرجوع لمتغيّرات البيئة.
 * لا يرمي أبداً — قاعدة بيانات غير متاحة تُعيد إعداداً معطّلاً.
 */
export async function getHayyakConfig(): Promise<HayyakConfig> {
  const map: Record<string, string> = {};
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: Object.values(HAYYAK_SETTING_KEYS) } },
      select: { key: true, value: true },
    });
    for (const r of rows) map[r.key] = r.value ?? "";
  } catch {
    // قاعدة بيانات غير متاحة — نكمل بالقيم الافتراضية من البيئة.
  }

  const signingSecret = (map[HAYYAK_SETTING_KEYS.secret] || ENV_SECRET).trim();
  const storeId = (map[HAYYAK_SETTING_KEYS.storeId] || DEFAULT_STORE_ID).trim();
  const baseUrl = (map[HAYYAK_SETTING_KEYS.baseUrl] || DEFAULT_BASE_URL).replace(/\/+$/, "").trim();

  // لو لم يُضبَط المفتاح المخزَّن قط، نعتمد على وجود متغيّر البيئة للتوافق الخلفي.
  const enabledFlag = map[HAYYAK_SETTING_KEYS.enabled];
  const enabledByFlag = enabledFlag != null ? enabledFlag === "true" : Boolean(ENV_SECRET);

  return {
    enabled: enabledByFlag && signingSecret.length > 0,
    signingSecret,
    storeId,
    baseUrl,
  };
}

/** هل التكامل مفعّل؟ */
export async function isHayyakEnabled(): Promise<boolean> {
  return (await getHayyakConfig()).enabled;
}

/** حالة التكامل للعرض في لوحة الإدارة — لا يكشف المفتاح السري إطلاقاً */
export async function getHayyakStatus() {
  const cfg = await getHayyakConfig();
  return {
    enabled: cfg.enabled,
    hasSecret: cfg.signingSecret.length > 0,
    storeId: cfg.storeId,
    baseUrl: cfg.baseUrl,
    catalogUrl: `${cfg.baseUrl}${catalogPath(cfg.storeId)}`,
    eventsUrl: `${cfg.baseUrl}${eventsPath(cfg.storeId)}`,
  };
}

/** توقيع البايتات الخام تماماً كما تُرسَل بـ HMAC-SHA256 */
function sign(rawBody: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

/**
 * إرسال طلب POST موقّع إلى حياك. لا يرمي استثناءً أبداً — يعيد نجاح/فشل فقط.
 * نوقّع نفس السلسلة النصية التي نرسلها بالضبط (لا إعادة تنسيق بعد التوقيع).
 */
async function post(path: string, payload: unknown, cfg: HayyakConfig): Promise<boolean> {
  if (!cfg.enabled) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[hayyak] التكامل غير مفعّل — تم تجاهل الإرسال.");
    }
    return false;
  }

  try {
    const rawBody = JSON.stringify(payload);
    const signature = sign(rawBody, cfg.signingSecret);

    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hayyak-Signature": `sha256=${signature}`,
      },
      body: rawBody,
      // لا نريد لانتظار حياك أن يعلّق طلب المتجر
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[hayyak] فشل ${path} → ${res.status} ${text.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[hayyak] خطأ أثناء الإرسال إلى ${path}:`, err);
    return false;
  }
}

const eventsPath = (storeId: string) => `/webhooks/custom/${storeId}/events`;
const catalogPath = (storeId: string) => `/webhooks/custom/${storeId}/catalog`;

// ── أنواع الأحداث ────────────────────────────────────────────────────────────

export type HayyakEvent =
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "order.created"
  | "order.status_updated"
  | "cart.abandoned";

/**
 * إرسال حدث لحظي واحد إلى حياك بالشكل { event, data }.
 * الأحداث تُعالَج لا-تزامنياً مع منع التكرار، فإعادة الإرسال آمنة.
 */
export async function sendHayyakEvent(event: HayyakEvent, data: unknown): Promise<boolean> {
  const cfg = await getHayyakConfig();
  return post(eventsPath(cfg.storeId), { event, data }, cfg);
}

// ── محوّلات البيانات (Mappers) ───────────────────────────────────────────────

/** خريطة حالة الطلب الداخلية → نص عربي مفهوم للعميل */
const ORDER_STATUS_AR: Record<string, string> = {
  PENDING: "بانتظار الدفع",
  PENDING_PAYMENT_REVIEW: "قيد مراجعة الدفع",
  PAYMENT_APPROVED: "تمت الموافقة على الدفع",
  PROCESSING: "قيد المعالجة",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
  REFUNDED: "مُسترجَع",
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_AR[status] || status;
}

/** الحد الأدنى لشكل الطلب المطلوب لبناء حمولة الحدث */
type OrderForEvent = {
  id: string;
  orderNumber: string;
  status: string;
  total: unknown; // Prisma.Decimal | number | string
  user?: { name?: string | null; phone?: string | null } | null;
};

function buildOrderData(order: OrderForEvent, currency: string) {
  return {
    id: order.id,
    reference_id: order.orderNumber,
    total: Number(order.total),
    currency,
    status: orderStatusLabel(order.status),
    customer_name: order.user?.name || "",
    customer_phone: order.user?.phone || "",
  };
}

/** تحويل منتج Prisma إلى عنصر كتالوج/حدث بصيغة حياك */
function buildProductData(
  product: {
    id: string;
    name: string;
    nameAr: string;
    slug: string;
    descriptionAr?: string | null;
    description?: string | null;
    price: unknown;
    comparePrice?: unknown;
    image?: string | null;
    images?: string[];
    stockCount?: number;
    tags?: string[];
    category?: { nameAr?: string | null; name?: string | null } | null;
  },
  domain: string
) {
  // الفاريانتات مخزّنة داخل tags بالشكل "variant:<label>:<price>"
  const variantValues = (product.tags || [])
    .filter((t) => t.startsWith("variant:"))
    .map((t) => t.split(":")[1])
    .filter(Boolean);

  const data: Record<string, unknown> = {
    id: product.id,
    name: product.nameAr || product.name,
    description: product.descriptionAr || product.description || "",
    price: Number(product.price),
    sku: product.slug,
    quantity: product.stockCount ?? 0,
    image: product.image || (product.images && product.images[0]) || undefined,
    url: domain ? `${domain}/products/${product.slug}` : undefined,
  };

  if (product.comparePrice != null) {
    data.regular_price = Number(product.comparePrice);
  }
  if (product.category?.nameAr || product.category?.name) {
    data.categories = [product.category.nameAr || product.category.name];
  }
  if (variantValues.length > 0) {
    data.options = [{ option: "الخيار", values: variantValues }];
  }

  return data;
}

// ── معلومات المتجر (من الإعدادات) ────────────────────────────────────────────

async function getStoreInfo() {
  const keys = ["site_name", "currency", "site_email"];
  const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const get = (k: string) => settings.find((s) => s.key === k)?.value;

  const domain = (process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
  return {
    name: get("site_name") || "المتجر",
    currency: get("currency") || "SAR",
    email: get("site_email") || undefined,
    domain,
  };
}

// ── واجهات عامة لإطلاق الأحداث ────────────────────────────────────────────────

/** حدث: تم إنشاء طلب → رسالة تأكيد واتساب للعميل */
export async function notifyOrderCreated(order: OrderForEvent): Promise<void> {
  const { currency } = await getStoreInfo();
  await sendHayyakEvent("order.created", buildOrderData(order, currency));
}

/** حدث: تغيّرت حالة الطلب → إشعار واتساب بالحالة الجديدة */
export async function notifyOrderStatusUpdated(order: OrderForEvent): Promise<void> {
  const { currency } = await getStoreInfo();
  await sendHayyakEvent("order.status_updated", buildOrderData(order, currency));
}

/** حدث: إنشاء/تحديث منتج → تحديث الكتالوج فوراً في حياك */
export async function notifyProductUpserted(
  product: Parameters<typeof buildProductData>[0],
  isNew: boolean
): Promise<void> {
  const { domain } = await getStoreInfo();
  await sendHayyakEvent(
    isNew ? "product.created" : "product.updated",
    buildProductData(product, domain)
  );
}

/** حدث: حذف منتج → إزالته من الكتالوج في حياك */
export async function notifyProductDeleted(productId: string): Promise<void> {
  await sendHayyakEvent("product.deleted", { id: productId });
}

/** حدث: سلة متروكة → تسجيلها + تذكير واتساب + إشعار التاجر. يعيد نجاح/فشل. */
export async function notifyCartAbandoned(data: {
  id?: string;
  customer_name?: string;
  customer_phone: string;
  total?: number;
  currency?: string;
  items?: Array<{ id: string; name: string; quantity: number; price: number }>;
}): Promise<boolean> {
  const { currency } = await getStoreInfo();
  return sendHayyakEvent("cart.abandoned", { currency, ...data });
}

// ── مزامنة كاملة: كتالوج + طلبات أخيرة + سلات نشطة ────────────────────────────

/** حدود الاسترجاع في المزامنة الكاملة — تكفي لتعريف حياك بالعملاء الحاليين */
const BACKFILL_ORDER_DAYS = 60; // الطلبات خلال آخر شهرين
const BACKFILL_ORDER_LIMIT = 200; // بحدٍّ أقصى معقول
const BACKFILL_CART_LIMIT = 200;

export type FullSyncResult = {
  ok: boolean;
  products: number;
  orders: number;
  carts: number;
};

/**
 * بناء ورفع الكتالوج الكامل ثم إعادة تشغيل الطلبات الأخيرة والسلات النشطة كأحداث،
 * حتى يتعرّف حياك على العملاء الحاليين (لا يوجد endpoint مخصّص للعملاء).
 * يُستدعى عند الربط أول مرة، ثم دورياً أو عند أي تغيير كبير.
 */
export async function pushFullCatalog(): Promise<FullSyncResult> {
  const cfg = await getHayyakConfig();
  if (!cfg.enabled) return { ok: false, products: 0, orders: 0, carts: 0 };

  const store = await getStoreInfo();

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, isDeleted: false },
      include: { category: { select: { nameAr: true, name: true } } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, nameAr: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const payload = {
    store: {
      name: store.name,
      domain: store.domain,
      currency: store.currency,
      email: store.email,
    },
    products: products.map((p) => buildProductData(p, store.domain)),
    categories: categories.map((c) => ({ id: c.id, name: c.nameAr || c.name })),
  };

  const ok = await post(catalogPath(cfg.storeId), payload, cfg);
  if (!ok) return { ok: false, products: products.length, orders: 0, carts: 0 };

  // ── الطلبات الأخيرة (يحمل بياناتها اسم/جوال العميل) ──
  const since = new Date(Date.now() - BACKFILL_ORDER_DAYS * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    include: { user: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: BACKFILL_ORDER_LIMIT,
  });
  const orderCount = await sendBatched(orders, (o) =>
    post(eventsPath(cfg.storeId), { event: "order.created", data: buildOrderData(o, store.currency) }, cfg)
  );

  // ── السلات النشطة (تُعرِّف حياك بعملاء لم يُكملوا الشراء) ──
  const carts = await prisma.abandonedCart.findMany({
    where: { status: "ACTIVE", itemCount: { gt: 0 } },
    orderBy: { updatedAt: "desc" },
    take: BACKFILL_CART_LIMIT,
  });
  const cartCount = await sendBatched(
    carts.filter((c) => (c.customerPhone || "").trim().length > 0),
    (c) =>
      post(
        eventsPath(cfg.storeId),
        { event: "cart.abandoned", data: buildCartData(c, store.currency) },
        cfg
      )
  );

  return { ok: true, products: products.length, orders: orderCount, carts: cartCount };
}

/** بناء حمولة سلة متروكة من صف قاعدة البيانات */
function buildCartData(
  cart: {
    id: string;
    customerName: string | null;
    customerPhone: string | null;
    total: unknown;
    items: unknown;
  },
  currency: string
) {
  const items = Array.isArray(cart.items)
    ? (cart.items as Array<Record<string, unknown>>).map((it) => ({
        id: String(it.id ?? ""),
        name: String(it.nameAr ?? it.name ?? ""),
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
      }))
    : [];
  return {
    id: cart.id,
    customer_name: cart.customerName || "",
    customer_phone: cart.customerPhone || "",
    total: Number(cart.total),
    currency,
    items,
  };
}

/**
 * إرسال دفعة من الأحداث بتزامن محدود (5 في وقت واحد) حتى لا نُغرق حياك ولا
 * نُطيل زمن الطلب. يعيد عدد ما نجح إرساله.
 */
async function sendBatched<T>(items: T[], send: (item: T) => Promise<boolean>): Promise<number> {
  let sent = 0;
  const BATCH = 5;
  for (let i = 0; i < items.length; i += BATCH) {
    const slice = items.slice(i, i + BATCH);
    const results = await Promise.allSettled(slice.map(send));
    sent += results.filter((r) => r.status === "fulfilled" && r.value).length;
  }
  return sent;
}

// ── تذكير السلات المتروكة (يُشغَّل من كرون) ───────────────────────────────────

/** المهلة الافتراضية قبل اعتبار السلة متروكة (بالدقائق) */
export const DEFAULT_CART_REMINDER_MINUTES = 60;

/**
 * إيجاد السلات النشطة التي مضى على آخر تحديث لها أكثر من المهلة ولم يسبق
 * إشعار حياك بها، وإرسال حدث cart.abandoned لكلٍّ منها ثم ختمها بوقت الإشعار
 * حتى لا تُذكَّر مرتين. يعيد عدد ما تم إشعاره فعلاً.
 *
 * تُستدعى من مسار الكرون /api/cron/abandoned-carts.
 */
export async function sendDueAbandonedCartReminders(
  minutes = DEFAULT_CART_REMINDER_MINUTES
): Promise<{ enabled: boolean; due: number; notified: number }> {
  const cfg = await getHayyakConfig();
  if (!cfg.enabled) return { enabled: false, due: 0, notified: 0 };

  const threshold = new Date(Date.now() - minutes * 60 * 1000);
  const carts = await prisma.abandonedCart.findMany({
    where: {
      status: "ACTIVE",
      itemCount: { gt: 0 },
      hayyakNotifiedAt: null,
      updatedAt: { lt: threshold },
    },
    orderBy: { updatedAt: "asc" },
    take: 100,
  });

  const due = carts.filter((c) => (c.customerPhone || "").trim().length > 0);
  const { currency } = await getStoreInfo();

  let notified = 0;
  for (const cart of due) {
    const ok = await post(
      eventsPath(cfg.storeId),
      { event: "cart.abandoned", data: buildCartData(cart, currency) },
      cfg
    );
    if (ok) {
      await prisma.abandonedCart
        .update({ where: { id: cart.id }, data: { hayyakNotifiedAt: new Date() } })
        .catch(() => {});
      notified++;
    }
  }

  return { enabled: true, due: due.length, notified };
}

// ── حفظ / مسح إعداد التكامل (من لوحة الإدارة) ─────────────────────────────────

/** كتابة قيمة إعداد واحدة (upsert) بمجموعة "integrations" */
async function upsertSetting(key: string, value: string, labelAr: string, type = "text") {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value, type, labelAr, group: "integrations" },
  });
}

/**
 * حفظ إعداد حياك من لوحة الإدارة. المفتاح السري لا يُلمَس إلا إذا أُرسلت قيمة
 * جديدة غير فارغة (حتى لا يُمحى بالخطأ عند تعديل بقية الحقول).
 */
export async function saveHayyakConfig(input: {
  enabled?: boolean;
  storeId?: string;
  baseUrl?: string;
  signingSecret?: string;
}): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (input.enabled != null) {
    tasks.push(upsertSetting(HAYYAK_SETTING_KEYS.enabled, input.enabled ? "true" : "false", "تفعيل تكامل حياك", "boolean"));
  }
  if (input.storeId != null) {
    tasks.push(upsertSetting(HAYYAK_SETTING_KEYS.storeId, input.storeId.trim(), "معرّف المتجر في حياك"));
  }
  if (input.baseUrl != null) {
    tasks.push(upsertSetting(HAYYAK_SETTING_KEYS.baseUrl, input.baseUrl.trim().replace(/\/+$/, ""), "عنوان حياك"));
  }
  const secret = (input.signingSecret || "").trim();
  if (secret.length > 0) {
    tasks.push(upsertSetting(HAYYAK_SETTING_KEYS.secret, secret, "مفتاح توقيع حياك", "password"));
  }

  await Promise.all(tasks);
}

/** إلغاء الربط: إيقاف التكامل ومسح المفتاح السري ومعرّف المتجر المخزَّنين. */
export async function disconnectHayyak(): Promise<void> {
  await prisma.setting.updateMany({
    where: {
      key: {
        in: [HAYYAK_SETTING_KEYS.enabled, HAYYAK_SETTING_KEYS.secret, HAYYAK_SETTING_KEYS.storeId, HAYYAK_SETTING_KEYS.baseUrl],
      },
    },
    data: { value: "" },
  });
  // نضمن أن علم التفعيل صار "false" صراحةً (لا يعتمد على متغيّر البيئة).
  await upsertSetting(HAYYAK_SETTING_KEYS.enabled, "false", "تفعيل تكامل حياك", "boolean");
}
