import { prisma } from "@/lib/prisma";

/**
 * DHL Express — MyDHL API integration.
 * Docs: https://developer.dhl.com/api-reference/dhl-express-mydhl-api
 *
 * Auth: HTTP Basic — Authorization: Basic base64(apiKey:apiSecret)
 * Base: https://express.api.dhl.com/mydhlapi        (production)
 *       https://express.api.dhl.com/mydhlapi/test   (sandbox/test)
 */

const DHL_LIVE = "https://express.api.dhl.com/mydhlapi";
const DHL_TEST = "https://express.api.dhl.com/mydhlapi/test";

export interface DhlConfig {
  enabled: boolean;
  apiKey: string;
  apiSecret: string;
  account: string;        // DHL Express account number
  mode: "test" | "live";
  productCode: string;    // e.g. "N" (domestic express), "P" (worldwide)
  senderName: string;
  senderCompany: string;
  senderPhone: string;
  senderEmail: string;
  senderCity: string;
  senderPostalCode: string;
  senderCountry: string;  // ISO-2
  senderAddress: string;
  defaultWeightKg: number;
}

export const DHL_SETTING_KEYS = [
  "dhl_enabled", "dhl_mode", "dhl_api_key", "dhl_api_secret", "dhl_account", "dhl_product_code",
  "dhl_sender_name", "dhl_sender_company", "dhl_sender_phone", "dhl_sender_email",
  "dhl_sender_city", "dhl_sender_postal", "dhl_sender_country", "dhl_sender_address", "dhl_default_weight",
];

export async function getDhlConfig(): Promise<DhlConfig> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: DHL_SETTING_KEYS } },
    select: { key: true, value: true },
  });
  const c: Record<string, string> = {};
  rows.forEach((r) => { c[r.key] = r.value; });

  return {
    enabled: c["dhl_enabled"] === "true",
    apiKey: c["dhl_api_key"] || "",
    apiSecret: c["dhl_api_secret"] || "",
    account: c["dhl_account"] || "",
    mode: c["dhl_mode"] === "live" ? "live" : "test",
    productCode: c["dhl_product_code"] || "N",
    senderName: c["dhl_sender_name"] || "",
    senderCompany: c["dhl_sender_company"] || c["dhl_sender_name"] || "",
    senderPhone: c["dhl_sender_phone"] || "",
    senderEmail: c["dhl_sender_email"] || "",
    senderCity: c["dhl_sender_city"] || "",
    senderPostalCode: c["dhl_sender_postal"] || "",
    senderCountry: (c["dhl_sender_country"] || "SA").toUpperCase(),
    senderAddress: c["dhl_sender_address"] || "",
    defaultWeightKg: parseFloat(c["dhl_default_weight"] || "1") || 1,
  };
}

const baseUrl = (mode: string) => (mode === "live" ? DHL_LIVE : DHL_TEST);

export class DhlError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function dhlFetch(config: DhlConfig, path: string, init: { method: string; body?: unknown } = { method: "GET" }) {
  if (!config.apiKey || !config.apiSecret) throw new DhlError("بيانات اعتماد DHL غير مضبوطة في الإعدادات", 400, null);
  const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");

  const res = await fetch(`${baseUrl(config.mode)}${path}`, {
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
    const msg = data?.detail || data?.message || (Array.isArray(data?.additionalDetails) ? data.additionalDetails.join("، ") : null) || `فشل طلب DHL (${res.status})`;
    throw new DhlError(msg, res.status, data);
  }
  return data;
}

export interface DhlShipmentInput {
  reference: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail?: string;
  receiverCity?: string;
  receiverAddress?: string;
  receiverPostalCode?: string;
  receiverCountry?: string;
  declaredValue: number;
  currency?: string;
  weightKg?: number;
}

export interface ParsedShipment {
  carrierId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;   // data: URL for the label PDF, if returned
  trackingUrl: string | null;
  status: string | null;
  raw: unknown;
}

/** DHL wants "YYYY-MM-DDTHH:mm:ss GMT+03:00". Ship next business day at 10:00 KSA. */
function plannedShippingDateAndTime(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  // express in KSA local time
  const ksa = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  return `${ksa.getUTCFullYear()}-${pad(ksa.getUTCMonth() + 1)}-${pad(ksa.getUTCDate())}T10:00:00 GMT+03:00`;
}

export async function createShipment(config: DhlConfig, input: DhlShipmentInput): Promise<ParsedShipment> {
  const receiverCountry = (input.receiverCountry || "SA").toUpperCase();
  const isDomestic = receiverCountry === config.senderCountry;

  const body = {
    plannedShippingDateAndTime: plannedShippingDateAndTime(),
    productCode: config.productCode,
    accounts: [{ typeCode: "shipper", number: config.account }],
    customerDetails: {
      shipperDetails: {
        postalAddress: {
          postalCode: config.senderPostalCode || undefined,
          cityName: config.senderCity,
          countryCode: config.senderCountry,
          addressLine1: config.senderAddress,
        },
        contactInformation: {
          phone: config.senderPhone,
          companyName: config.senderCompany || config.senderName,
          fullName: config.senderName,
          email: config.senderEmail || undefined,
        },
      },
      receiverDetails: {
        postalAddress: {
          postalCode: input.receiverPostalCode || undefined,
          cityName: input.receiverCity || config.senderCity,
          countryCode: receiverCountry,
          addressLine1: input.receiverAddress || input.receiverCity || config.senderCity,
        },
        contactInformation: {
          phone: input.receiverPhone,
          companyName: input.receiverName,
          fullName: input.receiverName,
          email: input.receiverEmail || undefined,
        },
      },
    },
    content: {
      packages: [{
        weight: input.weightKg || config.defaultWeightKg || 1,
        dimensions: { length: 20, width: 15, height: 10 },
      }],
      isCustomsDeclarable: !isDomestic,
      description: `Order ${input.reference}`,
      incoterm: "DAP",
      unitOfMeasurement: "metric",
      declaredValue: Math.round((input.declaredValue || 0) * 100) / 100,
      declaredValueCurrency: input.currency || "SAR",
    },
    customerReferences: [{ value: input.reference, typeCode: "CU" }],
    outputImageProperties: {
      imageOptions: [{ typeCode: "label", templateName: "ECOM26_84_001", isRequested: true }],
    },
  };

  const data = await dhlFetch(config, "/shipments", { method: "POST", body });
  return parseShipment(data);
}

function parseShipment(d: any): ParsedShipment {
  const tracking = d?.shipmentTrackingNumber ?? d?.packages?.[0]?.trackingNumber ?? null;
  const doc = Array.isArray(d?.documents) ? d.documents.find((x: any) => x.typeCode === "label") || d.documents[0] : null;
  let labelUrl: string | null = null;
  if (doc?.content) {
    const fmt = (doc.imageFormat || "PDF").toLowerCase();
    const mime = fmt === "pdf" ? "application/pdf" : `image/${fmt}`;
    labelUrl = `data:${mime};base64,${doc.content}`;
  }
  return {
    carrierId: tracking, // DHL identifies shipments by tracking number
    trackingNumber: tracking,
    labelUrl,
    trackingUrl: tracking ? `https://www.dhl.com/sa-en/home/tracking.html?tracking-id=${tracking}` : null,
    status: "CREATED",
    raw: d,
  };
}

export async function getTrackingStatus(config: DhlConfig, trackingNumber: string): Promise<{ status: string | null; raw: unknown }> {
  const data = await dhlFetch(config, `/shipments/${encodeURIComponent(trackingNumber)}/tracking`);
  const status = data?.shipments?.[0]?.status ?? data?.shipments?.[0]?.events?.[0]?.description ?? null;
  return { status, raw: data };
}
