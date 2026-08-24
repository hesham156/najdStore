import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public settings that are safe to expose to the storefront
const PUBLIC_KEYS = [
  "site_name",
  "site_phone",
  "currency",
  "currency_symbol",
  "tabby_enabled",
  "tabby_installments",
  "tamara_enabled",
  "tamara_installments",
  "guest_checkout",
  "shipping_fee",
  "shipping_free_threshold",
  // Display only: catalogue prices already include VAT, so the checkout shows
  // how much of the total is tax. Publishing the rate reveals nothing private.
  "tax_rate",
  // Conversion
  "live_activity_enabled",
  "live_activity_interval",
  "live_activity_names",
  "live_activity_cities",
  "flash_sale_enabled",
  "flash_sale_ends_at",
  "flash_sale_label",
  "scarcity_enabled",
  "scarcity_max",
  "live_viewers_enabled",
  "live_viewers_min",
  "live_viewers_max",
  "sticky_cta_enabled",
  "cart_progress_enabled",
  "cart_progress_target",
  "cart_progress_reward",
  "cart_progress_coupon",
  "guarantee_enabled",
  "guarantee_text",
];

export const revalidate = 300; // 5 min ISR cache

export async function GET() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: PUBLIC_KEYS } },
    select: { key: true, value: true, type: true },
  });

  const settings: Record<string, string | boolean | number> = {};
  for (const row of rows) {
    if (row.type === "boolean") {
      settings[row.key] = row.value === "true";
    } else if (row.type === "number") {
      settings[row.key] = parseFloat(row.value);
    } else {
      settings[row.key] = row.value;
    }
  }

  return NextResponse.json(
    { success: true, data: settings },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}
