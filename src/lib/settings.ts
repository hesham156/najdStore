import { prisma } from "@/lib/prisma";

/**
 * Fetch a set of settings as a plain key→value map.
 * Missing keys fall back to the provided defaults.
 */
export async function getSettings<T extends Record<string, string>>(
  defaults: T,
): Promise<T> {
  const keys = Object.keys(defaults);
  const rows = await prisma.setting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  });

  const result = { ...defaults };
  for (const row of rows) {
    if (row.value !== "" && row.value != null) {
      (result as Record<string, string>)[row.key] = row.value;
    }
  }
  return result;
}

/**
 * Store-wide branding / marketing copy.
 * These drive the homepage hero and footer so the store can be re-themed
 * for ANY niche without touching code — just edit them in Settings.
 */
export const BRANDING_DEFAULTS = {
  site_name: "متجرك الإلكتروني",
  hero_badge: "تسليم سريع وجودة موثوقة",
  hero_title: "كل ما تحتاجه في مكان واحد",
  hero_title_highlight: "بأفضل الأسعار وأعلى جودة",
  hero_subtitle: "متجرك الموثوق لأفضل المنتجات والخدمات بأسعار مناسبة وتجربة شراء سلسة.",
  hero_stat_1_value: "+5000",
  hero_stat_1_label: "عميل راضٍ",
  hero_stat_2_value: "+50",
  hero_stat_2_label: "منتج متاح",
  hero_stat_3_value: "+10K",
  hero_stat_3_label: "طلب مكتمل",
  footer_description: "متجرك الموثوق لأفضل المنتجات والخدمات بأسعار مناسبة وتسليم سريع.",
};

export async function getBranding() {
  return getSettings(BRANDING_DEFAULTS);
}
