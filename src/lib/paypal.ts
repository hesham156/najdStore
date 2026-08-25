import { prisma } from "@/lib/prisma";

const PAYPAL_API_BASE_SANDBOX = "https://api-m.sandbox.paypal.com";
const PAYPAL_API_BASE_LIVE = "https://api-m.paypal.com";

/**
 * Get PayPal configuration from settings
 */
export async function getPayPalConfig() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "pm_paypal_client_id",
          "pm_paypal_client_secret",
          "pm_paypal_mode",
          "pm_paypal_enabled",
          "pm_paypal_currency",
          "pm_paypal_exchange_rate",
        ],
      },
    },
  });

  const config: Record<string, string> = {};
  settings.forEach((s) => {
    config[s.key] = s.value;
  });

  return {
    enabled:      config["pm_paypal_enabled"] === "true",
    clientId:     config["pm_paypal_client_id"] || "",
    clientSecret: config["pm_paypal_client_secret"] || "",
    mode:         config["pm_paypal_mode"] === "live" ? "live" : "sandbox",
    currency:     config["pm_paypal_currency"] || "USD",
    exchangeRate: parseFloat(config["pm_paypal_exchange_rate"] || "1"),
  };
}

/**
 * Generate PayPal Access Token
 */
async function generateAccessToken(clientId: string, clientSecret: string, mode: string) {
  const baseURL = mode === "live" ? PAYPAL_API_BASE_LIVE : PAYPAL_API_BASE_SANDBOX;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${baseURL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[PayPal Auth] HTTP ${response.status} (mode=${mode}):`, errorBody);
    if (response.status === 401) {
      throw new Error(`PayPal: بيانات الاعتماد غير صحيحة أو الـ Mode غير متطابق (sandbox/live) — ${response.status}`);
    }
    throw new Error(`PayPal: فشل الحصول على Access Token — ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Create a PayPal Order
 * @returns { id, approveLink }
 */
export async function createPayPalOrder(amount: number, returnUrl: string, cancelUrl: string) {
  const config = await getPayPalConfig();
  if (!config.enabled || !config.clientId || !config.clientSecret) {
    throw new Error("PayPal is not fully configured or enabled");
  }

  const accessToken = await generateAccessToken(config.clientId, config.clientSecret, config.mode);
  const baseURL = config.mode === "live" ? PAYPAL_API_BASE_LIVE : PAYPAL_API_BASE_SANDBOX;

  // Convert store amount to PayPal currency using exchange rate
  const convertedAmount = (amount * config.exchangeRate).toFixed(2);

  const response = await fetch(`${baseURL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: config.currency,
            value: convertedAmount,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: "UNRESTRICTED",
            brand_name: "Digital Subscriptions Store",
            locale: "ar-SA",
            landing_page: "BILLING",
            user_action: "PAY_NOW",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("PayPal Create Order Error:", errorBody);
    throw new Error("Failed to create PayPal order");
  }

  const data = await response.json();
  
  // Find the approve link
  const approveLink = data.links?.find((link: any) => link.rel === "approve" || link.rel === "payer-action")?.href;

  return {
    id: data.id,
    approveLink,
  };
}

/**
 * Capture a PayPal Order
 */
export async function capturePayPalOrder(paypalOrderId: string) {
  const config = await getPayPalConfig();
  if (!config.enabled || !config.clientId || !config.clientSecret) {
    throw new Error("PayPal is not fully configured or enabled");
  }

  const accessToken = await generateAccessToken(config.clientId, config.clientSecret, config.mode);
  const baseURL = config.mode === "live" ? PAYPAL_API_BASE_LIVE : PAYPAL_API_BASE_SANDBOX;

  const response = await fetch(`${baseURL}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("PayPal Capture Error:", errorBody);
    throw new Error("Failed to capture PayPal payment");
  }

  const data = await response.json();
  return data;
}

/**
 * Refund a captured PayPal payment.
 *
 * @param captureId  the capture id we stored on Payment.transactionId after a
 *                   successful capture
 * @param amountSar  amount to refund in the STORE currency (SAR); omit for a
 *                   full refund. Converted to the PayPal currency with the same
 *                   exchange rate used at checkout.
 * @returns { id, status } — status is "COMPLETED" on success
 */
export async function refundPayPalCapture(captureId: string, amountSar?: number) {
  const config = await getPayPalConfig();
  if (!config.enabled || !config.clientId || !config.clientSecret) {
    throw new Error("PayPal is not fully configured or enabled");
  }

  const accessToken = await generateAccessToken(config.clientId, config.clientSecret, config.mode);
  const baseURL = config.mode === "live" ? PAYPAL_API_BASE_LIVE : PAYPAL_API_BASE_SANDBOX;

  // Full refund → empty body; partial → converted amount in the PayPal currency.
  const body =
    amountSar != null
      ? JSON.stringify({
          amount: {
            value: (amountSar * config.exchangeRate).toFixed(2),
            currency_code: config.currency,
          },
        })
      : undefined;

  const response = await fetch(`${baseURL}/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("PayPal Refund Error:", errorBody);
    throw new Error("Failed to refund PayPal payment");
  }

  const data = await response.json();
  return { id: data?.id as string, status: data?.status as string };
}
