import { prisma } from "@/lib/prisma";
import { NAJD_TYPES, NAJD_LABELS, isNajdType, parseNajdConfig, type NajdType, type NajdBlockConfig } from "@/lib/najd-blocks";

/**
 * Merchant-controlled homepage layout. The layout is an ordered list of
 * sections stored as JSON in the `home_sections` setting. Each section has a
 * type, an enabled flag, and type-specific config. A `custom_html` section lets
 * the merchant drop in their own design.
 */

export type HomeSectionType =
  | "landing"        // the built-in Najd landing preset (featured + recent inside)
  | "hero"           // headline + subtitle + stats (from branding or overridden)
  | "categories"     // category grid
  | "featured"       // featured products grid
  | "recent"         // recent products grid
  | "banner"         // single image banner with a link
  | "product_slider" // auto-scrolling (marquee) product carousel
  | "banner_slider"  // rotating multi-slide banner carousel
  | "marquee"        // scrolling announcement text ticker
  | "richtext"       // heading + rich HTML in a centered container
  | "custom_html"    // full-width raw HTML (merchant's own design)
  | NajdType;        // individually-placeable Najd design sections

/** A single slide inside a `banner_slider` section. */
export interface BannerSlide {
  image: string;
  link?: string;
  alt?: string;
}

export interface HomeSection {
  id: string;
  type: HomeSectionType;
  enabled: boolean;
  // shared/optional config (per type)
  title?: string;
  subtitle?: string;
  badge?: string;
  titleHighlight?: string;
  limit?: number;
  image?: string;
  link?: string;
  alt?: string;
  html?: string;
  // animated sections
  source?: "featured" | "recent"; // product_slider: which product set to pull from
  speed?: number;                 // product_slider/marquee: seconds per loop (lower = faster)
  autoplay?: boolean;             // banner_slider: auto-advance slides
  text?: string;                  // marquee: the scrolling text
  slides?: BannerSlide[];         // banner_slider: the rotating slides
  najd?: NajdBlockConfig;         // najd_*: per-section editable content
}

export const SECTION_LABELS: Record<HomeSectionType, string> = {
  landing: "تصميم نجد (جاهز)",
  hero: "الترويسة (Hero)",
  categories: "شبكة الفئات",
  featured: "المنتجات المميزة",
  recent: "أحدث المنتجات",
  banner: "بانر صورة",
  product_slider: "سلايدر منتجات متحرك",
  banner_slider: "سلايدر بنرات متحرك",
  marquee: "شريط إعلاني متحرك",
  richtext: "نص/عنوان منسّق",
  custom_html: "HTML مخصّص",
  ...NAJD_LABELS,
};

const uid = () => Math.random().toString(36).slice(2, 9);

/** Default layout — the current homepage, so nothing changes until customized. */
export function defaultSections(): HomeSection[] {
  return [{ id: uid(), type: "landing", enabled: true }];
}

/** A sensible starter set the merchant can switch to from the builder. */
export function starterSections(): HomeSection[] {
  return [
    { id: uid(), type: "hero", enabled: true },
    { id: uid(), type: "categories", enabled: true, title: "الفئات", subtitle: "تصفح منتجاتنا حسب الفئة" },
    { id: uid(), type: "featured", enabled: true, title: "المنتجات المميزة", limit: 8 },
    { id: uid(), type: "recent", enabled: true, title: "أحدث المنتجات", limit: 8 },
  ];
}

const VALID_TYPES: HomeSectionType[] = ["landing", "hero", "categories", "featured", "recent", "banner", "product_slider", "banner_slider", "marquee", "richtext", "custom_html", ...NAJD_TYPES];

/** Validate/normalize the slides array of a banner_slider section. */
function cleanSlides(raw: unknown): BannerSlide[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const slides = raw
    .filter((x) => x && typeof x === "object" && typeof (x as BannerSlide).image === "string" && (x as BannerSlide).image)
    .slice(0, 12)
    .map((x) => {
      const s = x as BannerSlide;
      return {
        image: s.image,
        link: typeof s.link === "string" ? s.link : undefined,
        alt: typeof s.alt === "string" ? s.alt : undefined,
      };
    });
  return slides.length ? slides : undefined;
}

/** Parse a stored layout string into a validated section array. */
export function parseSections(raw: string | null | undefined): HomeSection[] {
  if (!raw) return defaultSections();
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return defaultSections();
    const cleaned = arr
      .filter((s) => s && typeof s === "object" && VALID_TYPES.includes(s.type))
      .map((s) => ({
        id: String(s.id || uid()),
        type: s.type as HomeSectionType,
        enabled: s.enabled !== false,
        title: typeof s.title === "string" ? s.title : undefined,
        subtitle: typeof s.subtitle === "string" ? s.subtitle : undefined,
        badge: typeof s.badge === "string" ? s.badge : undefined,
        titleHighlight: typeof s.titleHighlight === "string" ? s.titleHighlight : undefined,
        limit: typeof s.limit === "number" ? s.limit : undefined,
        image: typeof s.image === "string" ? s.image : undefined,
        link: typeof s.link === "string" ? s.link : undefined,
        alt: typeof s.alt === "string" ? s.alt : undefined,
        html: typeof s.html === "string" ? s.html : undefined,
        source: (s.source === "recent" ? "recent" : s.source === "featured" ? "featured" : undefined) as HomeSection["source"],
        speed: typeof s.speed === "number" && s.speed > 0 ? s.speed : undefined,
        autoplay: typeof s.autoplay === "boolean" ? s.autoplay : undefined,
        text: typeof s.text === "string" ? s.text : undefined,
        slides: cleanSlides(s.slides),
        najd: isNajdType(s.type) ? parseNajdConfig(s.type, s.najd) : undefined,
      }));
    return cleaned.length ? cleaned : defaultSections();
  } catch {
    return defaultSections();
  }
}

/** Server-side: read the merchant's homepage layout. */
export async function getHomeSections(): Promise<HomeSection[]> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: "home_sections" }, select: { value: true } });
    return parseSections(row?.value);
  } catch {
    return defaultSections();
  }
}

export { uid as newSectionId };
