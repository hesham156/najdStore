import { prisma } from "@/lib/prisma";

/**
 * Treek (تريك) shipping integration — https://docs.gotreek.com
 *
 * Auth: email + password → Bearer access_token
 *   POST /api/auth/login  { email, password }  →  { access_token, expires_in, ... }
 * Base: https://api.gotreek.com
 *
 * Creating a shipment with Treek is a TWO-STEP flow, which we hide behind a
 * single `createShipment()` so the rest of the app treats Treek like any other
 * carrier (RedBox / DHL):
 *   1. POST /api/orders      → creates the order, returns its numeric `id`
 *   2. POST /api/shipments   → { order_id, courier } books the courier, returns
 *                              the AWB/tracking link and the printable label
 *
 * We store the Treek ORDER id as `carrierId` because that is the identifier the
 * status-refresh (GET /api/orders/{id}) and cancel (Cancel Order) endpoints use.
 */

const TREEK_BASE = "https://api.gotreek.com";

export interface TreekConfig {
  enabled: boolean;
  email: string;
  password: string;
  warehouseId: number;
  countryId: number;         // receiver country id (1 = KSA)
  defaultCityId: number;     // fallback when the order city can't be resolved
  courier: string;           // identifier slug, e.g. "aramex"
  packagingTypeId: number;
  defaultWeightG: number;    // total package weight, in grams
  shortAddress: string;      // fallback Saudi national short address (e.g. "RRRD2929")
}

export const TREEK_SETTING_KEYS = [
  "treek_enabled",
  "treek_email",
  "treek_password",
  "treek_warehouse_id",
  "treek_country_id",
  "treek_city_id",
  "treek_courier",
  "treek_packaging_type_id",
  "treek_default_weight",
  "treek_short_address",
];

export async function getTreekConfig(): Promise<TreekConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: TREEK_SETTING_KEYS } },
    select: { key: true, value: true },
  });
  const c: Record<string, string> = {};
  rows.forEach((r) => { c[r.key] = r.value; });

  return {
    enabled: c["treek_enabled"] === "true",
    email: c["treek_email"] || "",
    password: c["treek_password"] || "",
    warehouseId: parseInt(c["treek_warehouse_id"] || "0", 10) || 0,
    countryId: parseInt(c["treek_country_id"] || "1", 10) || 1,
    defaultCityId: parseInt(c["treek_city_id"] || "0", 10) || 0,
    courier: c["treek_courier"] || "aramex",
    packagingTypeId: parseInt(c["treek_packaging_type_id"] || "1", 10) || 1,
    defaultWeightG: parseInt(c["treek_default_weight"] || "1000", 10) || 1000,
    shortAddress: c["treek_short_address"] || "",
  };
}

export class TreekError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function extractMessage(data: any): string | null {
  if (!data || typeof data !== "object") return null;
  if (data.message) return String(data.message);
  if (data.error) return String(data.error);
  // Laravel-style validation: { errors: { field: ["msg", ...] } }
  if (data.errors && typeof data.errors === "object") {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return null;
}

// ── Access-token cache ────────────────────────────────────────────────────────
// Treek tokens are short-lived; cache one per email in memory and refresh a
// minute before expiry so a burst of shipment calls reuses a single login.
let tokenCache: { email: string; token: string; expiresAt: number } | null = null;

async function login(config: TreekConfig): Promise<string> {
  if (!config.email || !config.password) {
    throw new TreekError("بيانات دخول Treek غير مضبوطة في الإعدادات", 400, null);
  }
  const now = Date.now();
  if (tokenCache && tokenCache.email === config.email && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const res = await fetch(`${TREEK_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: config.email, password: config.password }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new TreekError(extractMessage(data) || `فشل تسجيل الدخول إلى Treek (${res.status})`, res.status, data);
  }
  const token: string | undefined = data?.access_token ?? data?.data?.access_token ?? data?.token;
  if (!token) throw new TreekError("لم يُرجع Treek رمز وصول (access_token)", 502, data);

  const expiresIn = Number(data?.expires_in ?? data?.data?.expires_in ?? 3600);
  tokenCache = { email: config.email, token, expiresAt: now + Math.max(60, expiresIn - 60) * 1000 };
  return token;
}

async function treekFetch(
  config: TreekConfig,
  path: string,
  init: { method: string; body?: unknown; auth?: boolean } = { method: "GET" },
): Promise<any> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.auth !== false) headers.Authorization = `Bearer ${await login(config)}`;

  const res = await fetch(`${TREEK_BASE}${path}`, {
    method: init.method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (res.status === 401 && init.auth !== false) {
    // Token likely expired mid-flight — drop the cache so the next call re-logs in.
    tokenCache = null;
  }
  if (!res.ok) {
    throw new TreekError(extractMessage(data) || `فشل طلب Treek (${res.status})`, res.status, data);
  }
  return data;
}

/** Pull the payload out whether or not the API wraps it in `data`. */
function unwrap(data: any): any {
  return data && typeof data === "object" && "data" in data ? data.data : data;
}

// ── City resolution ───────────────────────────────────────────────────────────
// Orders store the city as free text; Treek wants a numeric city_id. Resolve it
// via the public Cities List (matching Arabic or English name), falling back to
// the configured default city id.
async function resolveCityId(config: TreekConfig, cityName?: string): Promise<number> {
  const fallback = config.defaultCityId;
  const name = (cityName || "").trim();
  if (!name) {
    if (!fallback) throw new TreekError("لا يمكن تحديد مدينة المستلم: أضف مدينة للطلب أو اضبط مدينة افتراضية في إعدادات Treek", 400, null);
    return fallback;
  }
  try {
    const data = await treekFetch(
      config,
      `/api/cities?country_id=${config.countryId}&search=${encodeURIComponent(name)}`,
      { method: "GET", auth: false },
    );
    const cities: any[] = Array.isArray(unwrap(data)) ? unwrap(data) : [];
    const norm = (s: string) => s.trim().toLowerCase();
    const match =
      cities.find((c) => norm(c.name_ar || "") === norm(name) || norm(c.name || "") === norm(name)) ||
      cities.find((c) => norm(c.name_ar || "").includes(norm(name)) || norm(c.name || "").includes(norm(name))) ||
      cities[0];
    if (match?.id) return Number(match.id);
  } catch {
    // fall through to the configured default
  }
  if (!fallback) throw new TreekError(`تعذّر مطابقة مدينة "${name}" مع مدن Treek، ولا توجد مدينة افتراضية مضبوطة`, 400, null);
  return fallback;
}

// ── Public: create a shipment (order + booking) ───────────────────────────────

export interface TreekShipmentInput {
  reference: string;                 // our order number (for reference only)
  receiverName: string;
  receiverPhone: string;
  receiverCity?: string;
  receiverAddress?: string;
  receiverShortAddress?: string;
  grandTotal: number;                // order total (SAR)
  paymentMethod: "paid" | "cod";
  items: Array<{ name: string; quantity: number; price: number }>;
  weightG?: number;                  // total package weight, grams
}

export interface ParsedShipment {
  carrierId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  trackingUrl: string | null;
  status: string | null;
  raw: unknown;
}

/** Treek returns lowercase snake statuses; map the terminal ones to the UI's badges. */
export function normalizeStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  const s = String(status).toLowerCase();
  if (s === "delivered") return "DELIVERED";
  if (s === "cancelled" || s === "canceled") return "CANCELLED";
  if (s === "returned") return "RETURNED";
  if (s === "pending") return "CREATED";
  return status;
}

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export async function createShipment(config: TreekConfig, input: TreekShipmentInput): Promise<ParsedShipment> {
  if (!config.warehouseId) {
    throw new TreekError("لم يتم ضبط معرّف المستودع (warehouse_id) في إعدادات Treek", 400, null);
  }

  const cityId = await resolveCityId(config, input.receiverCity);
  const { first, last } = splitName(input.receiverName);
  const totalWeight = Math.max(1, Math.round(input.weightG || config.defaultWeightG));
  const totalQty = input.items.reduce((n, it) => n + (it.quantity || 1), 0) || 1;
  const perItemWeight = Math.max(1, Math.floor(totalWeight / totalQty));

  // Step 1 — create the order.
  const orderBody = {
    receiver_first_name: first,
    receiver_last_name: last,
    receiver_phone: input.receiverPhone,
    receiver_address_line: input.receiverAddress || input.receiverCity || "-",
    receiver_city_id: cityId,
    receiver_country_id: config.countryId,
    receiver_short_address: input.receiverShortAddress || config.shortAddress || "NA",
    warehouse_id: config.warehouseId,
    order_grand_total: Math.round(input.grandTotal || 0),
    payment_method: input.paymentMethod,
    items: input.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      price: Math.round(it.price),
      weight: perItemWeight,
    })),
    packages: [{
      length: 20,
      width: 15,
      height: 10,
      weight: totalWeight,
      packaging_type_id: config.packagingTypeId,
    }],
  };

  const orderRes = await treekFetch(config, "/api/orders", { method: "POST", body: orderBody });
  const order = unwrap(orderRes);
  const orderId = order?.id ?? order?.order_id;
  if (!orderId) throw new TreekError("لم يُرجع Treek معرّف الطلب بعد الإنشاء", 502, orderRes);

  // Step 2 — book the courier and generate the label.
  const shipmentRes = await treekFetch(config, "/api/shipments", {
    method: "POST",
    body: { order_id: orderId, courier: config.courier },
  });
  const ship = unwrap(shipmentRes);

  return {
    carrierId: String(orderId),
    trackingNumber: ship?.external_id ?? null,
    labelUrl: ship?.shipment_label_url ?? null,
    trackingUrl: ship?.tracking_link ?? null,
    status: normalizeStatus(ship?.order_status) || "CREATED",
    raw: { order: orderRes, shipment: shipmentRes },
  };
}

/** Status refresh — read the current order status from Treek. */
export async function getOrderStatus(config: TreekConfig, orderId: string): Promise<{ status: string | null; raw: unknown }> {
  const data = await treekFetch(config, `/api/orders/${encodeURIComponent(orderId)}`);
  const d = unwrap(data);
  return { status: normalizeStatus(d?.status), raw: data };
}

/** Cancel the Treek order (which cancels its shipment booking). */
export async function cancelShipment(config: TreekConfig, orderId: string): Promise<unknown> {
  return treekFetch(config, `/api/orders/${encodeURIComponent(orderId)}/cancel`, { method: "POST", body: {} });
}
