import { prisma } from "@/lib/prisma";

/**
 * Tabby Checkout API integration (v2)
 * Docs: https://docs.tabby.ai/api-reference
 *
 * Flow:
 *  1. createTabbyCheckoutSession → returns { checkoutUrl, paymentId }
 *  2. redirect the customer to checkoutUrl
 *  3. Tabby redirects back to the success/cancel/failure URL with ?payment_id
 *  4. getTabbyPayment (must be AUTHORIZED) → captureTabbyPayment → mark order paid
 *
 * Unlike Tamara there is no separate sandbox host — the environment is chosen
 * by the secret key prefix (sk_test_… vs the live key). We only switch the
 * regional base host by currency (KSA vs the rest of the GCC).
 */

// Region hosts — "All API paths and payloads are identical across both domains"
// but Tabby advises pinning to the regional host rather than relying on routing.
const TABBY_API_KSA = "https://api.tabby.sa";
const TABBY_API_DEFAULT = "https://api.tabby.ai";

export interface TabbyConfig {
  enabled: boolean;
  secretKey: string;
  publicKey: string;
  merchantCode: string;
  installmentsEnabled: boolean;
}

export async function getTabbyConfig(): Promise<TabbyConfig> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "pm_tabby_enabled",
          "pm_tabby_secret_key",
          "pm_tabby_public_key",
          "pm_tabby_merchant_code",
          "pm_tabby_installments_enabled",
        ],
      },
    },
  });

  const c: Record<string, string> = {};
  settings.forEach((s) => { c[s.key] = s.value; });

  return {
    enabled:             c["pm_tabby_enabled"] === "true",
    secretKey:           c["pm_tabby_secret_key"] || "",
    publicKey:           c["pm_tabby_public_key"] || "",
    merchantCode:        c["pm_tabby_merchant_code"] || "",
    installmentsEnabled: c["pm_tabby_installments_enabled"] === "true",
  };
}

function baseUrl(currency: string) {
  return currency.toUpperCase() === "SAR" ? TABBY_API_KSA : TABBY_API_DEFAULT;
}

/** Tabby wants money as a plain 2-decimal string ("100.00"). */
const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

async function tabbyFetch(
  config: TabbyConfig,
  host: string,
  path: string,
  init: { method: string; body?: unknown },
) {
  const res = await fetch(`${host}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
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
    console.error(`[Tabby] ${init.method} ${path} → HTTP ${res.status}:`, text.slice(0, 500));
    const msg =
      data?.error ||
      data?.message ||
      data?.errors?.[0]?.description ||
      `HTTP ${res.status}`;
    throw new Error(`Tabby: ${msg}`);
  }

  return data;
}

interface CheckoutInput {
  orderNumber: string;
  amount: number;     // final total (after discount)
  discount: number;
  currency: string;
  description: string;
  consumer: { name: string; phone: string; email: string };
  items: Array<{ id: string; name: string; sku: string; quantity: number; unitPrice: number; category?: string }>;
  urls: { success: string; cancel: string; failure: string };
}

/**
 * Create a Tabby checkout session.
 * @returns { checkoutUrl, paymentId, sessionId }
 * @throws if Tabby rejects the buyer (no installment product available) so the
 *         caller can clean up the pending order and surface the reason.
 */
export async function createTabbyCheckoutSession(input: CheckoutInput) {
  const config = await getTabbyConfig();
  if (!config.enabled || !config.secretKey || !config.merchantCode) {
    throw new Error("Tabby is not fully configured or enabled");
  }

  const currency = input.currency.toUpperCase();
  const host = baseUrl(currency);

  const body = {
    payment: {
      amount: money(input.amount),
      currency,
      description: input.description,
      buyer: {
        name: input.consumer.name || "Customer",
        email: input.consumer.email,
        phone: input.consumer.phone || "500000000",
      },
      order: {
        reference_id: input.orderNumber,
        tax_amount: money(0),
        shipping_amount: money(0),
        discount_amount: money(input.discount > 0 ? input.discount : 0),
        items: input.items.map((it) => ({
          title: it.name,
          quantity: it.quantity,
          unit_price: money(it.unitPrice),
          reference_id: it.id,
          category: it.category || "General",
        })),
      },
    },
    lang: "ar",
    merchant_code: config.merchantCode,
    merchant_urls: {
      success: input.urls.success,
      cancel: input.urls.cancel,
      failure: input.urls.failure,
    },
  };

  const data = await tabbyFetch(config, host, "/api/v2/checkout", { method: "POST", body });

  // Tabby returns 200 even when the buyer is rejected: the installment product
  // is simply absent (no web_url) and a rejection_reason is set. Redirecting to
  // an empty URL would strand the customer, so treat this as a hard failure.
  const installments = data?.configuration?.available_products?.installments;
  const checkoutUrl: string | undefined = Array.isArray(installments) && installments[0]?.web_url
    ? installments[0].web_url
    : undefined;

  if (!checkoutUrl) {
    const reason =
      data?.configuration?.products?.installments?.rejection_reason ||
      data?.status ||
      "not_available";
    throw new Error(`Tabby: ${reason}`);
  }

  return {
    sessionId: data.id as string,
    paymentId: data.payment?.id as string,
    checkoutUrl,
  };
}

/** Retrieve a Tabby payment — the source of truth for its status. */
export async function getTabbyPayment(paymentId: string, currency: string) {
  const config = await getTabbyConfig();
  return tabbyFetch(config, baseUrl(currency), `/api/v2/payments/${paymentId}`, { method: "GET" });
}

/** Capture an AUTHORIZED Tabby payment. Full capture auto-closes the payment. */
export async function captureTabbyPayment(paymentId: string, amount: number, currency: string) {
  const config = await getTabbyConfig();
  return tabbyFetch(config, baseUrl(currency), `/api/v2/payments/${paymentId}/captures`, {
    method: "POST",
    body: { amount: money(amount) },
  });
}
