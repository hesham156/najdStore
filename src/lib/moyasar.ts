import { prisma } from "@/lib/prisma";

/**
 * Moyasar payments (Saudi card gateway — Mada, Visa, Mastercard, Apple Pay).
 * Docs: https://docs.moyasar.com
 *
 * We use the hosted Invoice flow (redirect), mirroring the Tamara/PayPal flows:
 *   1. createInvoice → returns { id, url }
 *   2. redirect the customer to `url`
 *   3. Moyasar redirects back to callback_url with the result
 *   4. getInvoice(id) → verify status === "paid"
 *
 * Auth: HTTP Basic with the secret API key as the username (empty password).
 */

const MOYASAR_API = "https://api.moyasar.com/v1";

export interface MoyasarConfig {
  enabled: boolean;
  secretKey: string;
  publishableKey: string;
}

export async function getMoyasarConfig(): Promise<MoyasarConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["pm_moyasar_enabled", "pm_moyasar_secret_key", "pm_moyasar_publishable_key"] } },
    select: { key: true, value: true },
  });
  const c: Record<string, string> = {};
  rows.forEach((r) => { c[r.key] = r.value; });
  return {
    enabled: c["pm_moyasar_enabled"] === "true" && !!c["pm_moyasar_secret_key"],
    secretKey: c["pm_moyasar_secret_key"] || "",
    publishableKey: c["pm_moyasar_publishable_key"] || "",
  };
}

export class MoyasarError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function moyasarFetch(config: MoyasarConfig, path: string, init: { method: string; body?: unknown } = { method: "GET" }) {
  if (!config.secretKey) throw new MoyasarError("مفتاح Moyasar السري غير مضبوط", 400, null);
  const auth = Buffer.from(`${config.secretKey}:`).toString("base64");

  const res = await fetch(`${MOYASAR_API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = data?.message || (data?.errors ? JSON.stringify(data.errors) : null) || `فشل طلب Moyasar (${res.status})`;
    throw new MoyasarError(msg, res.status, data);
  }
  return data;
}

export interface CreateInvoiceInput {
  amountSar: number;      // amount in SAR (converted to halalas)
  description: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}

/** Create a hosted-payment invoice; returns the id and the payment page URL. */
export async function createInvoice(config: MoyasarConfig, input: CreateInvoiceInput): Promise<{ id: string; url: string }> {
  const body = {
    amount: Math.round(input.amountSar * 100), // halalas
    currency: "SAR",
    description: input.description,
    callback_url: input.callbackUrl,
    metadata: input.metadata || {},
  };
  const data = await moyasarFetch(config, "/invoices", { method: "POST", body });
  return { id: String(data?.id ?? ""), url: String(data?.url ?? "") };
}

export interface MoyasarInvoice {
  id: string;
  status: string; // initiated | paid | failed | ...
  amount: number;
  raw: unknown;
}

export async function getInvoice(config: MoyasarConfig, id: string): Promise<MoyasarInvoice> {
  const data = await moyasarFetch(config, `/invoices/${encodeURIComponent(id)}`);
  return { id: String(data?.id ?? id), status: String(data?.status ?? ""), amount: Number(data?.amount ?? 0), raw: data };
}

/**
 * Refund a Moyasar payment.
 *
 * Moyasar refunds operate on the underlying *payment*, not the invoice, so we
 * read the invoice, find its paid payment, then issue the refund against it.
 *
 * @param invoiceId  the invoice id we stored on the order's Payment.transactionId
 * @param amountSar  amount to refund in SAR; omit for a full refund
 */
export async function refundMoyasarPayment(
  config: MoyasarConfig,
  invoiceId: string,
  amountSar?: number,
): Promise<{ refundId: string; paymentId: string }> {
  const invoice = await moyasarFetch(config, `/invoices/${encodeURIComponent(invoiceId)}`);
  const payments: any[] = Array.isArray(invoice?.payments) ? invoice.payments : [];
  const paid = payments.find((p) => p?.status === "paid") || payments[0];
  const paymentId: string | undefined = paid?.id;
  if (!paymentId) {
    throw new MoyasarError("لا يوجد دفع قابل للاسترجاع على هذه الفاتورة", 400, invoice);
  }

  const body =
    amountSar != null ? { amount: Math.round(amountSar * 100) } : undefined; // halalas; omit → full
  const data = await moyasarFetch(config, `/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    body,
  });
  return { refundId: String(data?.id ?? paymentId), paymentId };
}
