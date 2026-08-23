import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public endpoint — returns which payment gateways are enabled
 * and their non-sensitive config (bank details for display).
 * Cached for 60s.
 */
export async function GET() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "pm_bank_transfer_enabled",
          "pm_bank_transfer_account_name",
          "pm_bank_transfer_bank_name",
          "pm_bank_transfer_account_number",
          "pm_bank_transfer_iban",
          "pm_paypal_enabled",
          "pm_paypal_mode",
          "pm_paypal_client_id",
          "pm_paypal_client_secret",
          "pm_tabby_enabled",
          "pm_tabby_public_key",
          "pm_tabby_merchant_code",
          "pm_tamara_enabled",
          "pm_tamara_api_token",
          "pm_tamara_installments",
          "pm_tamara_merchant_url",
          "pm_moyasar_enabled",
          "pm_moyasar_secret_key",
        ],
      },
    },
    select: { key: true, value: true },
  });

  const map: Record<string, string> = {};
  settings.forEach((s) => { map[s.key] = s.value; });

  const data = {
    bankTransfer: {
      enabled: map["pm_bank_transfer_enabled"] === "true",
      accountName:   map["pm_bank_transfer_account_name"]   || "",
      bankName:      map["pm_bank_transfer_bank_name"]      || "",
      accountNumber: map["pm_bank_transfer_account_number"] || "",
      iban:          map["pm_bank_transfer_iban"]           || "",
    },
    paypal: {
      // Only expose as enabled if credentials are actually configured
      enabled: map["pm_paypal_enabled"] === "true"
        && !!map["pm_paypal_client_id"]
        && !!map["pm_paypal_client_secret"],
      mode: map["pm_paypal_mode"] || "sandbox",
    },
    tabby: {
      enabled:      map["pm_tabby_enabled"] === "true",
      publicKey:    map["pm_tabby_public_key"]    || "",
      merchantCode: map["pm_tabby_merchant_code"] || "",
    },
    tamara: {
      // Only expose as enabled if the API token is actually configured
      enabled:      map["pm_tamara_enabled"] === "true" && !!map["pm_tamara_api_token"],
      installments: parseInt(map["pm_tamara_installments"] || "3", 10) || 3,
      merchantUrl:  map["pm_tamara_merchant_url"] || "",
    },
    creditCard: {
      // Moyasar — Mada / Visa / Mastercard
      enabled: map["pm_moyasar_enabled"] === "true" && !!map["pm_moyasar_secret_key"],
    },
  };

  return NextResponse.json(
    { success: true, data },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
