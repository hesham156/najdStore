import { prisma } from "@/lib/prisma";

/**
 * RedBox API V3 integration — https://docs.api.redboxsa.com
 *
 * Auth: Bearer token (obtained from RedBox support), sent as
 *   Authorization: Bearer <token>
 * Base: https://api.redboxsa.com (production) / https://stage.api.redboxsa.com (sandbox)
 */

const REDBOX_LIVE = "https://api.redboxsa.com";
const REDBOX_SANDBOX = "https://stage.api.redboxsa.com";

export interface RedboxConfig {
  enabled: boolean;
  token: string;
  mode: "sandbox" | "live";
  senderName: string;
  senderPhone: string;
  senderCity: string;
  senderAddress: string;
}

export const REDBOX_SETTING_KEYS = [
  "redbox_enabled",
  "redbox_mode",
  "redbox_token",
  "redbox_sender_name",
  "redbox_sender_phone",
  "redbox_sender_city",
  "redbox_sender_address",
];

export async function getRedboxConfig(): Promise<RedboxConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: REDBOX_SETTING_KEYS } },
    select: { key: true, value: true },
  });
  const c: Record<string, string> = {};
  rows.forEach((r) => { c[r.key] = r.value; });

  return {
    enabled: c["redbox_enabled"] === "true",
    token: c["redbox_token"] || "",
    mode: c["redbox_mode"] === "live" ? "live" : "sandbox",
    senderName: c["redbox_sender_name"] || "",
    senderPhone: c["redbox_sender_phone"] || "",
    senderCity: c["redbox_sender_city"] || "",
    senderAddress: c["redbox_sender_address"] || "",
  };
}

const baseUrl = (mode: string) => (mode === "live" ? REDBOX_LIVE : REDBOX_SANDBOX);

export class RedboxError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function redboxFetch(config: RedboxConfig, path: string, init: { method: string; body?: unknown } = { method: "GET" }) {
  if (!config.token) throw new RedboxError("لم يتم ضبط توكن RedBox في الإعدادات", 400, null);

  const res = await fetch(`${baseUrl(config.mode)}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Language": "AR",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg = extractMessage(data) || `فشل طلب RedBox (${res.status})`;
    throw new RedboxError(msg, res.status, data);
  }
  return data;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function extractMessage(data: any): string | null {
  if (!data || typeof data !== "object") return null;
  return data.message || data.error || data.detail || (Array.isArray(data.errors) ? data.errors.join(", ") : null) || null;
}

/** Pull the shipment payload out regardless of whether the API wraps it in `data`. */
function unwrap(data: any): any {
  return data && typeof data === "object" && data.data ? data.data : data;
}

export interface CreateShipmentInput {
  reference: string;              // our order number
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerCity?: string;
  customerAddress?: string;
  customerCountry?: string;       // ISO-2, default SA
  codAmount: number;              // 0 for prepaid orders
  codCurrency?: string;           // default SAR
  weightValue?: number;
  numberOfPieces?: number;
}

export interface ParsedShipment {
  carrierId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  trackingUrl: string | null;
  status: string | null;
  raw: unknown;
}

function parseShipment(raw: any): ParsedShipment {
  const d = unwrap(raw);
  return {
    carrierId: String(d?.id ?? d?.shipment_id ?? d?.uuid ?? "") || null,
    trackingNumber: d?.tracking_number ?? d?.awb ?? d?.reference_number ?? null,
    labelUrl: d?.label_url ?? d?.label ?? d?.awb_url ?? null,
    trackingUrl: d?.tracking_page_url ?? d?.tracking_url ?? d?.tracking_page ?? null,
    status: d?.status ?? d?.state ?? null,
    raw,
  };
}

export async function createShipment(config: RedboxConfig, input: CreateShipmentInput): Promise<ParsedShipment> {
  const body: Record<string, unknown> = {
    reference: input.reference,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    cod_amount: Math.round((input.codAmount || 0) * 100) / 100,
    cod_currency: input.codCurrency || "SAR",
    customer_country: input.customerCountry || "SA",
    from_platform: "najd-store",
  };
  if (input.customerEmail) body.customer_email = input.customerEmail;
  if (input.customerCity) body.customer_city = input.customerCity;
  if (input.customerAddress) body.customer_address = input.customerAddress;
  if (input.weightValue) { body.weight_value = input.weightValue; body.weight_unit = "kg"; }
  if (input.numberOfPieces) body.number_of_pieces = input.numberOfPieces;
  // Sender defaults from settings
  if (config.senderName) body.sender_name = config.senderName;
  if (config.senderPhone) body.sender_phone = config.senderPhone;
  if (config.senderCity) body.sender_city = config.senderCity;
  if (config.senderAddress) body.sender_address = config.senderAddress;

  const data = await redboxFetch(config, "/v3/shipments", { method: "POST", body });
  return parseShipment(data);
}

export async function getShipmentStatus(config: RedboxConfig, id: string): Promise<{ status: string | null; raw: unknown }> {
  const data = await redboxFetch(config, `/v3/shipments/${id}/status`);
  const d = unwrap(data);
  return { status: (typeof d === "string" ? d : d?.status ?? d?.state) ?? null, raw: data };
}

export async function getShipmentLabel(config: RedboxConfig, id: string): Promise<string | null> {
  const data = await redboxFetch(config, `/v3/shipments/${id}/label`);
  const d = unwrap(data);
  return (typeof d === "string" ? d : d?.url ?? d?.label_url ?? d?.label) ?? null;
}

export async function getTrackingPage(config: RedboxConfig, id: string): Promise<string | null> {
  const data = await redboxFetch(config, `/v3/shipments/${id}/tracking-page`);
  const d = unwrap(data);
  return (typeof d === "string" ? d : d?.url ?? d?.tracking_page_url ?? d?.tracking_url) ?? null;
}

export async function cancelShipment(config: RedboxConfig, id: string): Promise<unknown> {
  return redboxFetch(config, `/v3/shipments/${id}/cancel`, { method: "POST", body: {} });
}
