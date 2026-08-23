import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

// Branding / marketing copy — ensured to exist so the store can be re-themed
// for ANY niche straight from Settings (works on existing databases too).
const BRANDING_KEYS: Array<{ key: string; value: string; labelAr: string; type?: string }> = [
  { key: "hero_badge",            value: "تسليم سريع وجودة موثوقة",                                              labelAr: "الهيرو — الشارة العلوية" },
  { key: "hero_title",            value: "كل ما تحتاجه في مكان واحد",                                            labelAr: "الهيرو — العنوان الرئيسي" },
  { key: "hero_title_highlight",  value: "بأفضل الأسعار وأعلى جودة",                                             labelAr: "الهيرو — العنوان المميّز (ملوّن)" },
  { key: "hero_subtitle",         value: "متجرك الموثوق لأفضل المنتجات والخدمات بأسعار مناسبة وتجربة شراء سلسة.", labelAr: "الهيرو — النص الفرعي" },
  { key: "hero_stat_1_value",     value: "+5000", labelAr: "إحصائية 1 — الرقم" },
  { key: "hero_stat_1_label",     value: "عميل راضٍ", labelAr: "إحصائية 1 — النص" },
  { key: "hero_stat_2_value",     value: "+50",   labelAr: "إحصائية 2 — الرقم" },
  { key: "hero_stat_2_label",     value: "منتج متاح", labelAr: "إحصائية 2 — النص" },
  { key: "hero_stat_3_value",     value: "+10K",  labelAr: "إحصائية 3 — الرقم" },
  { key: "hero_stat_3_label",     value: "طلب مكتمل", labelAr: "إحصائية 3 — النص" },
  { key: "footer_description",    value: "متجرك الموثوق لأفضل المنتجات والخدمات بأسعار مناسبة وتسليم سريع.",      labelAr: "الفوتر — وصف المتجر" },
];

// Custom code injection — CSS/JS the merchant adds to the storefront (group "custom_code").
const CUSTOM_CODE_KEYS: Array<{ key: string; value: string; labelAr: string }> = [
  { key: "custom_css",       value: "", labelAr: "كود CSS مخصّص — يُحقن داخل <style> في كل صفحات المتجر" },
  { key: "custom_header_js", value: "", labelAr: "كود JavaScript (الهيدر) — أدخل الكود بدون وسم <script>" },
  { key: "custom_footer_js", value: "", labelAr: "كود JavaScript (الفوتر) — أدخل الكود بدون وسم <script>" },
];

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return unauthorized();

  // Ensure branding keys exist (create only when missing — never overwrite edits)
  await Promise.all([
    ...BRANDING_KEYS.map((b) =>
      prisma.setting.upsert({
        where: { key: b.key },
        update: {},
        create: { key: b.key, value: b.value, type: b.type || "text", labelAr: b.labelAr, group: "general" },
      })
    ),
    ...CUSTOM_CODE_KEYS.map((c) =>
      prisma.setting.upsert({
        where: { key: c.key },
        update: {},
        create: { key: c.key, value: c.value, type: "code", labelAr: c.labelAr, group: "custom_code" },
      })
    ),
  ]);

  const settings = await prisma.setting.findMany({ orderBy: { group: "asc" } });
  return NextResponse.json({ success: true, data: settings });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  // Only ADMIN (not STAFF) can update settings
  if (session.user.role !== "ADMIN") return unauthorized();

  try {
    const { settings } = await req.json();
    const updates = Object.entries(settings).map(([key, value]) =>
      prisma.setting.update({ where: { key }, data: { value: String(value) } })
    );
    await Promise.all(updates);

    await prisma.adminLog.create({
      data: { userId: session.user.id, action: "UPDATE_SETTINGS", entity: "Setting", details: settings },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("PATCH /api/admin/settings", err);
  }
}
