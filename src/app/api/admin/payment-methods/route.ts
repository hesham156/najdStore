import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Keys we manage for payment methods
const PAYMENT_KEYS = [
  // General toggles
  "pm_bank_transfer_enabled",
  "pm_paypal_enabled",
  "pm_tabby_enabled",
  "pm_tamara_enabled",

  // Bank Transfer
  "pm_bank_transfer_account_name",
  "pm_bank_transfer_account_number",
  "pm_bank_transfer_bank_name",
  "pm_bank_transfer_iban",

  // PayPal
  "pm_paypal_client_id",
  "pm_paypal_client_secret",
  "pm_paypal_mode",
  "pm_paypal_currency",
  "pm_paypal_exchange_rate",

  // Tabby
  "pm_tabby_public_key",
  "pm_tabby_secret_key",
  "pm_tabby_merchant_code",
  "pm_tabby_installments_enabled",
  "pm_tabby_agreement",
  // Product-page installment badge (shared with settings → "payments" group)
  "tabby_enabled",
  "tabby_installments",

  // Tamara
  "pm_tamara_api_token",
  "pm_tamara_public_key",
  "pm_tamara_notification_key",
  "pm_tamara_merchant_url",
  "pm_tamara_mode",
  "pm_tamara_installments",
  "pm_tamara_agreement",
  // Product-page installment badge (shared with settings → "payments" group)
  "tamara_enabled",

  // Moyasar (Saudi card gateway — Mada/Visa/Mastercard)
  "pm_moyasar_enabled",
  "pm_moyasar_secret_key",
  "pm_moyasar_publishable_key",
];

const DEFAULT_LABELS: Record<string, { labelAr: string; type: string }> = {
  pm_bank_transfer_enabled:      { labelAr: "تفعيل التحويل البنكي", type: "boolean" },
  pm_paypal_enabled:             { labelAr: "تفعيل PayPal", type: "boolean" },
  pm_tabby_enabled:              { labelAr: "تفعيل Tabby", type: "boolean" },
  pm_tamara_enabled:             { labelAr: "تفعيل Tamara", type: "boolean" },
  pm_bank_transfer_account_name: { labelAr: "اسم صاحب الحساب", type: "text" },
  pm_bank_transfer_account_number:{ labelAr: "رقم الحساب", type: "text" },
  pm_bank_transfer_bank_name:    { labelAr: "اسم البنك", type: "text" },
  pm_bank_transfer_iban:         { labelAr: "رقم الآيبان (IBAN)", type: "text" },
  pm_paypal_client_id:           { labelAr: "Client ID", type: "text" },
  pm_paypal_client_secret:       { labelAr: "Client Secret", type: "password" },
  pm_paypal_mode:                { labelAr: "بيئة التشغيل", type: "select" },
  pm_paypal_currency:            { labelAr: "عملة PayPal", type: "text" },
  pm_paypal_exchange_rate:       { labelAr: "سعر التحويل", type: "text" },
  pm_tabby_public_key:           { labelAr: "Public Key", type: "text" },
  pm_tabby_secret_key:           { labelAr: "Secret Key", type: "password" },
  pm_tabby_merchant_code:        { labelAr: "Merchant Code", type: "text" },
  pm_tabby_installments_enabled: { labelAr: "إتاحة الدفع بالأقساط الشهرية", type: "boolean" },
  pm_tabby_agreement:            { labelAr: "الموافقة على اتفاقية استخدام تابي", type: "boolean" },
  tabby_enabled:                 { labelAr: "إظهار شعار تابي في صفحة المنتج", type: "boolean" },
  tabby_installments:            { labelAr: "عدد الدفعات", type: "text" },
  pm_tamara_api_token:           { labelAr: "Merchant Key", type: "password" },
  pm_tamara_public_key:          { labelAr: "Public Key", type: "text" },
  pm_tamara_notification_key:    { labelAr: "Notification Key", type: "password" },
  pm_tamara_merchant_url:        { labelAr: "Merchant URL", type: "text" },
  pm_tamara_mode:                { labelAr: "بيئة التشغيل", type: "select" },
  pm_tamara_installments:        { labelAr: "عدد الدفعات", type: "text" },
  pm_tamara_agreement:           { labelAr: "الموافقة على اتفاقية استخدام تمارا", type: "boolean" },
  tamara_enabled:                { labelAr: "إظهار شعار تمارا في صفحة المنتج", type: "boolean" },
  pm_moyasar_enabled:            { labelAr: "تفعيل الدفع بالبطاقة (Moyasar)", type: "boolean" },
  pm_moyasar_secret_key:         { labelAr: "Secret Key (المفتاح السري)", type: "password" },
  pm_moyasar_publishable_key:    { labelAr: "Publishable Key (المفتاح العام)", type: "text" },
};

export async function GET() {
  if (!await requireAdmin()) return unauthorized();

  // Ensure all keys exist in DB (upsert defaults)
  await Promise.all(
    PAYMENT_KEYS.map((key) =>
      prisma.setting.upsert({
        where: { key },
        update: {},
        create: {
          key,
          value: DEFAULT_LABELS[key]?.type === "boolean" ? "false" : "",
          type: DEFAULT_LABELS[key]?.type || "text",
          labelAr: DEFAULT_LABELS[key]?.labelAr || key,
          group: "payment_methods",
        },
      })
    )
  );

  const settings = await prisma.setting.findMany({
    where: { key: { in: PAYMENT_KEYS } },
  });

  return NextResponse.json({ success: true, data: settings });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  // Only ADMIN (not STAFF) can update payment methods
  if (session.user.role !== "ADMIN") return unauthorized();

  try {
    const { settings } = await req.json() as { settings: Record<string, string> };

    const updates = Object.entries(settings)
      .filter(([key]) => PAYMENT_KEYS.includes(key))
      .map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: {
            key,
            value: String(value),
            type: DEFAULT_LABELS[key]?.type || "text",
            labelAr: DEFAULT_LABELS[key]?.labelAr || key,
            group: "payment_methods",
          },
        })
      );

    await Promise.all(updates);

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_PAYMENT_METHODS",
        entity: "Setting",
        details: settings,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("PATCH /api/admin/payment-methods", err);
  }
}
