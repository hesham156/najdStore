import * as redbox from "@/lib/redbox";
import * as dhl from "@/lib/dhl";

export type Carrier = "REDBOX" | "DHL";

export interface CarrierInfo { id: Carrier; label: string }

export interface NormalizedShipment {
  carrierId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  trackingUrl: string | null;
  status: string | null;
  raw: unknown;
}

export interface ShipmentRequest {
  reference: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  country?: string;
  codAmount: number;      // used by RedBox (COD)
  declaredValue: number;  // used by DHL
  currency?: string;
}

/** Enabled carriers, in display order. */
export async function getEnabledCarriers(): Promise<CarrierInfo[]> {
  const [rb, dl] = await Promise.all([redbox.getRedboxConfig(), dhl.getDhlConfig()]);
  const list: CarrierInfo[] = [];
  if (rb.enabled) list.push({ id: "REDBOX", label: "RedBox" });
  if (dl.enabled) list.push({ id: "DHL", label: "DHL Express" });
  return list;
}

export async function isCarrierEnabled(carrier: Carrier): Promise<boolean> {
  if (carrier === "DHL") return (await dhl.getDhlConfig()).enabled;
  return (await redbox.getRedboxConfig()).enabled;
}

export async function createShipment(carrier: Carrier, req: ShipmentRequest): Promise<NormalizedShipment> {
  if (carrier === "DHL") {
    const config = await dhl.getDhlConfig();
    const parsed = await dhl.createShipment(config, {
      reference: req.reference,
      receiverName: req.name,
      receiverPhone: req.phone,
      receiverEmail: req.email,
      receiverCity: req.city,
      receiverAddress: req.address,
      receiverPostalCode: req.postalCode,
      receiverCountry: req.country,
      declaredValue: req.declaredValue,
      currency: req.currency,
    });
    return parsed;
  }

  // Default: RedBox
  const config = await redbox.getRedboxConfig();
  const parsed = await redbox.createShipment(config, {
    reference: req.reference,
    customerName: req.name,
    customerPhone: req.phone,
    customerEmail: req.email,
    customerCity: req.city,
    customerAddress: req.address,
    customerCountry: req.country,
    codAmount: req.codAmount,
    codCurrency: req.currency || "SAR",
  });

  // enrich label + tracking page (RedBox exposes them as separate endpoints)
  let labelUrl = parsed.labelUrl;
  let trackingUrl = parsed.trackingUrl;
  if (parsed.carrierId) {
    if (!labelUrl) labelUrl = await redbox.getShipmentLabel(config, parsed.carrierId).catch(() => null);
    if (!trackingUrl) trackingUrl = await redbox.getTrackingPage(config, parsed.carrierId).catch(() => null);
  }
  return { ...parsed, labelUrl, trackingUrl };
}

export async function refreshStatus(carrier: Carrier, carrierId: string): Promise<string | null> {
  if (carrier === "DHL") {
    const config = await dhl.getDhlConfig();
    return (await dhl.getTrackingStatus(config, carrierId)).status;
  }
  const config = await redbox.getRedboxConfig();
  return (await redbox.getShipmentStatus(config, carrierId)).status;
}

export async function cancelShipment(carrier: Carrier, carrierId: string): Promise<void> {
  if (carrier === "DHL") {
    // MyDHL API has no simple shipment-cancel endpoint; cancel the pickup with DHL
    // directly. We only mark it cancelled locally.
    return;
  }
  const config = await redbox.getRedboxConfig();
  await redbox.cancelShipment(config, carrierId);
}

export { redbox, dhl };
