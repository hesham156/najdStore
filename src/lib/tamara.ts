import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Tamara Checkout API integration (v2)
 * Docs: https://docs.tamara.co
 *
 * Flow:
 *  1. createTamaraCheckoutSession → returns { checkoutUrl, tamaraOrderId }
 *  2. redirect the customer to checkoutUrl
 *  3. Tamara redirects back to the success URL with ?orderId&paymentStatus
 *  4. authoriseTamaraOrder → captureTamaraPayment → mark order paid
 */

const TAMARA_API_SANDBOX = "https://api-sandbox.tamara.co";
const TAMARA_API_LIVE = "https://api.tamara.co";

// Tamara only supports these markets/currencies
const SUPPORTED_CURRENCIES = ["SAR", "AED", "KWD", "BHD", "QAR", "OMR"];
const CURRENCY_TO_COUNTRY: Record<string, string> = {
  SAR: "SA", AED: "AE", KWD: "KW", BHD: "BH", QAR: "QA", OMR: "OM",
};

export interface TamaraConfig {
  enabled: boolean;
  apiToken: string;
  publicKey: string;
  notificationKey: string;
  mode: "sandbox" | "live";
  installments: number;
}

export async function getTamaraConfig(): Promise<TamaraConfig> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "pm_tamara_enabled",
          "pm_tamara_api_token",
          "pm_tamara_public_key",
          "pm_tamara_notification_key",
          "pm_tamara_mode",
          "pm_tamara_installments",
        ],
      },
    },
  });

  const c: Record<string, string> = {};
  settings.forEach((s) => { c[s.key] = s.value; });

  return {
    enabled:         c["pm_tamara_enabled"] === "true",
    apiToken:        c["pm_tamara_api_token"] || "",
    publicKey:       c["pm_tamara_public_key"] || "",
    notificationKey: c["pm_tamara_notification_key"] || "",
    mode:            c["pm_tamara_mode"] === "live" ? "live" : "sandbox",
    installments:    parseInt(c["pm_tamara_installments"] || "3", 10) || 3,
  };
}

function baseUrl(mode: string) {
  return mode === "live" ? TAMARA_API_LIVE : TAMARA_API_SANDBOX;
}

/** Round to 2 decimals as a Number — Tamara rejects long floats */
const money = (n: number) => Math.round(n * 100) / 100;

async function tamaraFetch(
  config: TamaraConfig,
  path: string,
  init: { method: string; body?: unknown },
) {
  const res = await fetch(`${baseUrl(config.mode)}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    console.error(`[Tamara] ${init.method} ${path} → HTTP ${res.status}:`, text.slice(0, 500));
    const msg =
      data?.message ||
      data?.errors?.[0]?.error_code ||
      `HTTP ${res.status}`;
    throw new Error(`Tamara: ${msg}`);
  }

  return data;
}

interface CheckoutInput {
  orderNumber: string;
  amount: number;     // final total (after discount)
  subtotal: number;   // sum of item line totals (before discount)
  discount: number;
  currency: string;
  description: string;
  consumer: { firstName: string; lastName: string; phone: string; email: string };
  items: Array<{ id: string; name: string; sku: string; quantity: number; unitPrice: number }>;
  urls: { success: string; failure: string; cancel: string; notification: string };
}

/**
 * Create a Tamara checkout session.
 * @returns { checkoutUrl, tamaraOrderId }
 */
export async function createTamaraCheckoutSession(input: CheckoutInput) {
  const config = await getTamaraConfig();
  if (!config.enabled || !config.apiToken) {
    throw new Error("Tamara is not fully configured or enabled");
  }

  const currency = input.currency.toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(
      `Tamara لا يدعم العملة ${currency}. العملات المدعومة: ${SUPPORTED_CURRENCIES.join(", ")}`,
    );
  }
  const countryCode = CURRENCY_TO_COUNTRY[currency] || "SA";

  const amount = (n: number) => ({ amount: money(n), currency });

  const body = {
    order_reference_id: input.orderNumber,
    total_amount: amount(input.amount),
    description: input.description,
    country_code: countryCode,
    payment_type: "PAY_BY_INSTALMENTS",
    instalments: config.installments,
    locale: "ar_SA",
    items: input.items.map((it) => ({
      reference_id: it.id,
      type: "Digital",
      name: it.name,
      sku: it.sku,
      quantity: it.quantity,
      unit_price: amount(it.unitPrice),
      discount_amount: amount(0),
      tax_amount: amount(0),
      total_amount: amount(it.unitPrice * it.quantity),
    })),
    consumer: {
      first_name: input.consumer.firstName || "Customer",
      last_name: input.consumer.lastName || "-",
      phone_number: input.consumer.phone || "500000000",
      email: input.consumer.email,
    },
    shipping_address: {
      first_name: input.consumer.firstName || "Customer",
      last_name: input.consumer.lastName || "-",
      line1: "Digital delivery",
      city: "-",
      country_code: countryCode,
    },
    tax_amount: amount(0),
    shipping_amount: amount(0),
    discount: input.discount > 0
      ? { name: "خصم", amount: amount(input.discount) }
      : undefined,
    merchant_url: {
      success: input.urls.success,
      failure: input.urls.failure,
      cancel: input.urls.cancel,
      notification: input.urls.notification,
    },
  };

  const data = await tamaraFetch(config, "/checkout", { method: "POST", body });

  return {
    tamaraOrderId: data.order_id as string,
    checkoutId: data.checkout_id as string,
    checkoutUrl: data.checkout_url as string,
  };
}

/** Authorise a Tamara order after the customer approves it */
export async function authoriseTamaraOrder(tamaraOrderId: string) {
  const config = await getTamaraConfig();
  return tamaraFetch(config, `/orders/${tamaraOrderId}/authorise`, { method: "POST" });
}

/** Capture the payment for an authorised Tamara order */
export async function captureTamaraPayment(
  tamaraOrderId: string,
  totalAmount: number,
  currency: string,
) {
  const config = await getTamaraConfig();
  const cur = currency.toUpperCase();
  const amount = (n: number) => ({ amount: money(n), currency: cur });

  return tamaraFetch(config, "/payments/capture", {
    method: "POST",
    body: {
      order_id: tamaraOrderId,
      total_amount: amount(totalAmount),
      shipping_info: {
        shipped_at: new Date().toISOString(),
        shipping_company: "Digital",
      },
    },
  });
}

/**
 * Verify a Tamara webhook notification token.
 *
 * Tamara sends a JWT in the `tamaraToken` header, signed HS256 with the
 * merchant's Notification Token (the value stored as `pm_tamara_notification_key`).
 * We MUST verify that signature: the webhook can flip an order to PAYMENT_APPROVED
 * without any money moving, so accepting an unverified token lets anyone who knows
 * their own order number self-confirm a free order.
 *
 * Returns true only when the token is a well-formed HS256 JWT whose signature
 * checks out against the configured key (constant-time compare).
 */
export function isValidTamaraNotification(token: string | null, notificationKey: string): boolean {
  if (!notificationKey || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) return false;

  // Only accept the algorithm Tamara actually uses — never trust `alg` blindly
  // (guards against the "alg: none" / algorithm-confusion class of JWT attacks).
  let header: { alg?: string };
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (header.alg !== "HS256") return false;

  let provided: Buffer;
  try {
    provided = Buffer.from(signatureB64, "base64url");
  } catch {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", notificationKey)
    .update(`${headerB64}.${payloadB64}`)
    .digest();

  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}
