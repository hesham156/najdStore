import { prisma } from "@/lib/prisma";

/**
 * "معرض الأعمال" (portfolio / work gallery) content — merchant-managed.
 *
 * Stored as a single JSON row in the Setting table (key `portfolio_content`),
 * mirroring how the homepage layout is persisted. No dedicated table, so no
 * migration. Falls back to the shipped defaults when unset or malformed, which
 * means the section keeps rendering on a fresh database.
 */

export interface PortfolioItem {
  id: string;
  category: string; // must match a filter value (other than "all")
  img: string;
  tag: string;
  tagColor: string;
  title: string;
}

export interface PortfolioFilter {
  value: string;
  label: string;
}

export interface PortfolioContent {
  enabled: boolean;
  titleTop: string;
  titleMain: string;
  titleHighlight: string;
  filters: PortfolioFilter[];
  items: PortfolioItem[];
}

export const SETTING_KEY = "portfolio_content";

/** The current hard-coded gallery, kept as the default so nothing changes visually until edited. */
export const PORTFOLIO_DEFAULTS: PortfolioContent = {
  enabled: true,
  titleTop: "إبداعاتنا",
  titleMain: "معرض",
  titleHighlight: "الأعمال",
  filters: [
    { value: "all", label: "الكل" },
    { value: "packaging", label: "استاندات" },
    { value: "identity", label: "هويات تجارية" },
    { value: "digital", label: "مطبوعات ديجيتال" },
  ],
  items: [
    { id: "p1", category: "packaging", img: "https://i.ibb.co/BHZ0YL65/IMG-0069.jpg", tag: "استاند بوب اب", tagColor: "#ec205f", title: "استاندات بوب اب فاخره" },
    { id: "p2", category: "identity", img: "https://i.ibb.co/whDKGPLk/Chat-GPT-Image-28-2025-02-25-40.png", tag: "هوية بصرية", tagColor: "#244da0", title: "مجموعة الأعمال الشاملة" },
    { id: "p3", category: "digital", img: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80", tag: "مطبوعات ديجيتال", tagColor: "#ec205f", title: "بوسترات المعارض" },
  ],
};

const str = (v: unknown, max: number, fallback = "") =>
  (typeof v === "string" ? v : fallback).trim().slice(0, max);

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const uid = () => Math.random().toString(36).slice(2, 9);

/**
 * Validate/normalize arbitrary input into a safe PortfolioContent for storage.
 * Never throws — clamps lengths, drops junk, guarantees a valid shape.
 */
export function parsePortfolio(raw: unknown): PortfolioContent {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const filtersInput = Array.isArray(obj.filters) ? obj.filters : PORTFOLIO_DEFAULTS.filters;
  const filters: PortfolioFilter[] = filtersInput
    .slice(0, 12)
    .map((f) => {
      const o = (f && typeof f === "object" ? f : {}) as Record<string, unknown>;
      return { value: str(o.value, 40), label: str(o.label, 60) };
    })
    .filter((f) => f.value && f.label);

  // Always guarantee an "all" filter at the front.
  if (!filters.some((f) => f.value === "all")) {
    filters.unshift({ value: "all", label: "الكل" });
  }
  const validCats = new Set(filters.map((f) => f.value).filter((v) => v !== "all"));

  const itemsInput = Array.isArray(obj.items) ? obj.items : [];
  const items: PortfolioItem[] = itemsInput
    .slice(0, 60)
    .map((it) => {
      const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
      const tagColor = str(o.tagColor, 7);
      let category = str(o.category, 40);
      // Fall back to the first real category if the item points at a removed one.
      if (!validCats.has(category)) category = Array.from(validCats)[0] || "";
      return {
        id: str(o.id, 20) || uid(),
        category,
        img: str(o.img, 500),
        tag: str(o.tag, 60),
        tagColor: HEX.test(tagColor) ? tagColor : "#ec205f",
        title: str(o.title, 120),
      };
    })
    .filter((it) => it.img && it.category);

  return {
    enabled: obj.enabled !== false,
    titleTop: str(obj.titleTop, 60) || PORTFOLIO_DEFAULTS.titleTop,
    titleMain: str(obj.titleMain, 60) || PORTFOLIO_DEFAULTS.titleMain,
    titleHighlight: str(obj.titleHighlight, 60) || PORTFOLIO_DEFAULTS.titleHighlight,
    filters,
    items,
  };
}

/** Read the merchant's gallery, falling back to defaults when unset/malformed. */
export async function getPortfolio(): Promise<PortfolioContent> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SETTING_KEY }, select: { value: true } });
    if (!row?.value) return PORTFOLIO_DEFAULTS;
    return parsePortfolio(JSON.parse(row.value));
  } catch {
    return PORTFOLIO_DEFAULTS;
  }
}
