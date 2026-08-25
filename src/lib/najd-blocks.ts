/**
 * Individually-placeable "Najd" homepage blocks.
 *
 * The Najd landing preset is one monolithic block; these are its sections split
 * out so each can be added, reordered, toggled and edited on its own from the
 * homepage builder. Content lives in a normalized config object on the
 * HomeSection (`section.najd`); defaults reproduce the current design exactly, so
 * nothing changes visually until the merchant edits it.
 *
 * All merchant text is injected as HTML (dangerouslySetInnerHTML), so every
 * interpolated value is escaped/sanitized here.
 */

const WHATSAPP_URL = "https://wa.me/966573999056";

export type NajdType =
  | "najd_hero"
  | "najd_services"
  | "najd_stickers"
  | "najd_startups"
  | "najd_why"
  | "najd_digital"
  | "najd_large";

export const NAJD_TYPES: NajdType[] = [
  "najd_hero", "najd_services", "najd_stickers", "najd_startups", "najd_why", "najd_digital", "najd_large",
];

export const NAJD_LABELS: Record<NajdType, string> = {
  najd_hero: "نجد — الترويسة",
  najd_services: "نجد — الخدمات",
  najd_stickers: "نجد — عالم الملصقات",
  najd_startups: "نجد — حلول المشاريع الناشئة",
  najd_why: "نجد — لماذا نحن",
  najd_digital: "نجد — الطباعة الديجيتال",
  najd_large: "نجد — إندور وأوت دور",
};

export function isNajdType(t: string): t is NajdType {
  return (NAJD_TYPES as string[]).includes(t);
}

/* ── Security helpers ── */
export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Allow only safe href schemes; anything else becomes "#". */
function safeUrl(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "#";
  if (/^(https?:\/\/|\/|#|tel:|mailto:|wa\.me\/)/i.test(s)) return esc(s);
  return "#";
}

/**
 * URL safe to drop into a CSS `url('…')`. Rejects anything with whitespace,
 * quotes or parentheses so it cannot break out of the url() and inject CSS.
 */
function cssUrl(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^(https?:\/\/|\/)[^\s"'()]+$/i.test(s) ? s : "";
}

/** Allow hex / rgb / rgba / simple keyword colours only. */
function safeColor(v: unknown, fallback: string): string {
  const s = String(v ?? "").trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return s;
  if (/^rgba?\(\s*[\d.\s,%]+\)$/.test(s)) return s;
  if (/^[a-zA-Z]{3,20}$/.test(s)) return s;
  return fallback;
}

/* ── Config model ── */
export interface NajdCard {
  id: string;
  emoji?: string;
  iconColor?: string;
  image?: string;
  title?: string;
  subtitle?: string;
  subtitleColor?: string;
  text?: string;
  tag?: string;
  tagColor?: string;
  badge?: string;
  badgeColor?: string;
  list?: string[];
  link?: string;
}

export interface NajdCta {
  title?: string;
  text?: string;
  link?: string;
  label?: string;
}

export interface NajdBlockConfig {
  label?: string;
  title?: string;
  titleHighlight?: string;
  desc?: string;
  image?: string;
  image2?: string;   // hero: second visual card
  bgImage?: string;  // hero: section background image
  cards?: NajdCard[];
  cta?: NajdCta;
  // why-us extras
  partners?: string[];
  testimonialText?: string;
  testimonialAuthor?: string;
}

const uid = () => Math.random().toString(36).slice(2, 9);

/* ── Fixed icon sets (not user-editable; referenced by card index) ── */
const SERVICE_ICONS = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
];
const WHY_ICONS = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4a2 2 0 114 0v1a2 2 0 11-4 0V4zM18 8a2 2 0 114 0v1a2 2 0 11-4 0V8zM11 13a2 2 0 114 0v1a2 2 0 11-4 0v-1zM18 17a2 2 0 114 0v1a2 2 0 11-4 0v-1zM5 8a2 2 0 114 0v1a2 2 0 11-4 0V8zM5 17a2 2 0 114 0v1a2 2 0 11-4 0v-1z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
];

/* ── Defaults (reproduce the current design) ── */
const DEFAULTS: Record<NajdType, NajdBlockConfig> = {
  najd_hero: {
    label: "متخصصون في التغليف والطباعة الفاخرة",
    title: "نحول هويتك إلى",
    titleHighlight: "واقع ملموس",
    desc: "من الصناديق الفاخرة الملونة إلى المطبوعات التجارية الدقيقة، نقدم لك في نجد برنت حلولاً متكاملة تبرز قيمة علامتك التجارية بأعلى معايير الجودة العالمية.",
    bgImage: "https://images.unsplash.com/photo-1626785774573-4b799315345d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80",
    image: "https://cdn.salla.sa/EZORvA/972ac16c-8599-4203-96c1-39d995cb9b62-500x500-31Qm8zuDg10SEabdsT10wNsPukwGqWQzkoFqwgeW.jpg",
    image2: "https://cdn.salla.sa/EZORvA/04431389-c6c1-4675-a658-dbac51d4b558-333.06962025316x500-cPqGIfrcMJKGapfMlJbpglUk6SWjHRXQSYGQFpn9.png",
    cta: { label: "ابدأ مشروعك", link: WHATSAPP_URL },
    cards: [
      { id: "f1", text: "طباعة رقمية", tagColor: "#ec205f" },
      { id: "f2", text: "تغليف فاخر", tagColor: "#244da0" },
      { id: "f3", text: "تصميم هويات", tagColor: "#ffffff" },
    ],
  },
  najd_services: {
    label: "ماذا نقدم؟",
    title: "خدماتنا",
    titleHighlight: "المتميزة",
    desc: "نحن في نجد برنت نؤمن بأن كل تفصيلة صغيرة تصنع فارقاً كبيراً، لذا نقدم خدماتنا بدقة متناهية وشغف بالإبداع.",
    cards: [
      { id: "s1", iconColor: "#ec205f", title: "الطباعة الاوفست", text: "حلول طباعة احترافية للكميات الكبيرة بجودة ثابتة وألوان دقيقة، مثالية للبراندات اللي تبحث عن الفخامة والتكلفة المناسبة مع الحفاظ على أعلى مستوى من التفاصيل." },
      { id: "s2", iconColor: "#244da0", title: "الطباعة الديجيتال", text: "طباعة سريعة ومرنة تناسب المشاريع العاجلة والكميات الصغيرة، بألوان حيوية وجودة عالية بدون تعقيد — الحل المثالي لإنجاز شغلك في وقت قياسي." },
      { id: "s3", iconColor: "#ffffff", title: "الاندور", text: "نصمم وننفذ جميع أعمال الطباعة الداخلية مثل اللوحات، الاستيكرات، والديكورات، بشكل يعزز هوية مشروعك داخل المكان ويعطي تجربة بصرية احترافية." },
      { id: "s4", iconColor: "#ec205f", title: "الاوت دور", text: "حلول طباعة خارجية قوية تتحمل العوامل الجوية، من البنرات واللوحات الإعلانية إلى تغليف السيارات، بجودة عالية تضمن وضوح رسالتك في كل مكان." },
    ],
    cta: { title: "هل لديك مشروع طباعة خاص؟", text: "تحدث مع خبراء الطباعة لدينا اليوم للحصول على استشارة مجانية وعرض سعر مخصص لمشروعك القادم.", link: WHATSAPP_URL, label: "استشارة مجانية" },
  },
  najd_stickers: {
    label: "Sticker Universe",
    title: "عالم",
    titleHighlight: "الملصقات",
    desc: "استيكرات نجد ليست مجرد ورق لاصق، إنها واجهة علامتك التجارية على كافة الأسطح. مقاومة، دقيقة، وبخيارات لا حصر لها.",
    cards: [
      { id: "k1", emoji: "✨", title: "Glossy", subtitle: "الاستيكر اللامع", subtitleColor: "#ec205f", text: "يتميز بلمعان قوي يعزز من وضوح الألوان، مثالي للملصقات الدعائية.", tag: "High Shine" },
      { id: "k2", emoji: "🌑", title: "Matte", subtitle: "الاستيكر المطفي", subtitleColor: "#244da0", text: "لمسة مخملية فاخرة بدون انعكاسات ضوئية. يمنح شعارك طابعاً كلاسيكياً.", tag: "No Glare" },
      { id: "k3", emoji: "🫥", title: "Transparent", subtitle: "الاستيكر الشفاف", subtitleColor: "rgba(255,255,255,.5)", text: "يختفي تماماً ليظهر التصميم وكأنه مطبوع مباشرة على السطح.", tag: "Invisible" },
      { id: "k4", emoji: "🛡️", title: "Heavy Duty", subtitle: "المقاوم للعوامل", subtitleColor: "#f97316", text: "استيكرات فينيل جبارة مقاومة للماء، الشمس، والحرارة العالية.", tag: "Weatherproof" },
    ],
  },
  najd_startups: {
    label: "مرونة بلا حدود",
    title: "حلول نجد للمشاريع",
    titleHighlight: "الناشئة",
    desc: "لا تحتاج لطلب الآلاف لتبدأ. نحن نوفر لك جودة المصانع الكبرى في كميات تبدأ من 50 حبة فقط لتجربة منتجك في السوق بكل سهولة.",
    cards: [
      { id: "q1", emoji: "📦", title: "كميات مرنة", text: "ابدأ بـ 50 أو 100 حبة من صناديق التغليف أو المطبوعات الورقية دون الحاجة لميزانيات ضخمة.", badge: "مثالي للمتاجر الجديدة", badgeColor: "#ec205f" },
      { id: "q2", emoji: "✨", title: "جودة فاخرة", text: "نستخدم تقنيات طباعة ديجيتال متطورة تعطي نتائج تضاهي طباعة الأوفست في دقة الألوان والتفاصيل.", badge: "ألوان نابضة بالحياة", badgeColor: "#244da0" },
      { id: "q3", emoji: "🚀", title: "سرعة البرق", text: "نحن نعلم أن وقتك من ذهب؛ لذا نسلم طلبات الكميات الصغيرة خلال 3 إلى 5 أيام عمل فقط.", badge: "توصيل سريع", badgeColor: "#ffffff" },
    ],
    cta: { title: "هل أنت صاحب مشروع منزلي أو متجر إلكتروني؟", text: "احصل على عينات تجريبية مجانية لمنتجك قبل البدء في الطلب الفعلي.", link: WHATSAPP_URL, label: "تواصل مع مستشار المشاريع" },
  },
  najd_why: {
    label: "لماذا نحن؟",
    title: "سر تميزنا في",
    titleHighlight: "نجد برنت",
    desc: "نحن لا نقوم بمجرد الطباعة، بل نصنع تجربة بصرية متكاملة تعزز من قيمة علامتك التجارية في السوق وتجذب جمهورك المستهدف من النظرة الأولى.",
    cards: [
      { id: "w1", iconColor: "#ec205f", title: "ضمان الجودة", text: "نستخدم أفضل أنواع الورق والأحبار العالمية لضمان نتائج مبهرة تدوم طويلاً." },
      { id: "w2", iconColor: "#244da0", title: "سرعة التنفيذ", text: "نحترم مواعيدك بدقة، مع توفير خيارات الطباعة المستعجلة للتسليم في نفس اليوم." },
      { id: "w3", iconColor: "#ffffff", title: "أحدث التقنيات", text: "نمتلك أسطولاً من ماكينات الطباعة الألمانية واليابانية الأكثر تطوراً في المنطقة." },
      { id: "w4", iconColor: "#ec205f", title: "أسعار تنافسية", text: "نقدم موازنة مثالية بين أعلى مستويات الجودة وأفضل الأسعار المدروسة." },
    ],
    partners: ["BRAND_A", "BRAND_B", "BRAND_C", "BRAND_D", "BRAND_E", "BRAND_F"],
    testimonialText: "\"نجد برنت حولت فكرة مشروعنا إلى حقيقة من خلال التغليف الاستثنائي الذي أبهر عملاءنا.\"",
    testimonialAuthor: "مدير التسويق - شركة ريادة",
  },
  najd_digital: {
    title: "الطباعة الديجيتال",
    titleHighlight: "بسرعة الضوء",
    desc: "نحن نستخدم أحدث ماكينات الطباعة الرقمية في العالم لضمان استلام طلبك في زمن قياسي وبأعلى دقة ألوان ممكنة. مثالية للكميات الصغيرة والمتوسطة والمشاريع العاجلة.",
    image: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&w=800&q=80",
    cards: [
      { id: "d1", emoji: "⚡", text: "تسليم خلال 24 ساعة", tagColor: "#244da0" },
      { id: "d2", emoji: "🎯", text: "دقة ألوان 100%", tagColor: "#ec205f" },
    ],
  },
  najd_large: {
    label: "الطباعة العريضة والدعائية",
    title: "حلول الـ",
    titleHighlight: "إندور والأوت دور",
    cards: [
      { id: "l1", image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80", tag: "Indoor | داخلي", tagColor: "#244da0", title: "دقة بصرية مذهلة", text: "نقدم طباعة الإندور عالية الدقة للبوسترات، الرول أب، وورق الجدران المخصص، مع ألوان حيوية تخطف الأنظار في المساحات القريبة.", list: ["Roll Up", "Pop Up", "Vinyl Wall"] },
      { id: "l2", image: "https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80", tag: "Outdoor | خارجي", tagColor: "#ec205f", title: "متانة تقاوم العوامل", text: "طباعة الأوت دور مخصصة للوحات البنرات واليوني بول والملصقات الضخمة، مصممة لتحمل حرارة الشمس القوية والرياح والأمطار لضمان بقاء إعلانك مشرقاً.", list: ["Flex Banner", "Mesh", "3D Signs"] },
    ],
    cta: { title: "هل تحتاج للوحات إعلانية لمشروعك؟", text: "نحن نوفر خدمات القياس، التصميم، والتركيب لجميع أنواع المطبوعات العريضة.", link: WHATSAPP_URL, label: "احصل على استشارة" },
  },
};

export function defaultNajdConfig(type: NajdType): NajdBlockConfig {
  return structuredClone(DEFAULTS[type]);
}

/* ── Validation ── */
const s = (v: unknown, max: number) => (typeof v === "string" ? v : "").slice(0, max);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? v : []);

function parseCard(raw: unknown): NajdCard {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: s(o.id, 20) || uid(),
    emoji: s(o.emoji, 8) || undefined,
    iconColor: o.iconColor != null ? safeColor(o.iconColor, "#ec205f") : undefined,
    image: s(o.image, 500) || undefined,
    title: s(o.title, 120) || undefined,
    subtitle: s(o.subtitle, 120) || undefined,
    subtitleColor: o.subtitleColor != null ? safeColor(o.subtitleColor, "#ec205f") : undefined,
    text: s(o.text, 600) || undefined,
    tag: s(o.tag, 60) || undefined,
    tagColor: o.tagColor != null ? safeColor(o.tagColor, "#ec205f") : undefined,
    badge: s(o.badge, 60) || undefined,
    badgeColor: o.badgeColor != null ? safeColor(o.badgeColor, "#ec205f") : undefined,
    list: arr<unknown>(o.list).slice(0, 8).map((x) => s(x, 40)).filter(Boolean),
    link: s(o.link, 500) || undefined,
  };
}

/** Normalize arbitrary input into a safe config for the given type. Never throws. */
export function parseNajdConfig(type: NajdType, raw: unknown): NajdBlockConfig {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULTS[type];
  const cta = (o.cta && typeof o.cta === "object" ? o.cta : {}) as Record<string, unknown>;
  return {
    label: o.label != null ? s(o.label, 80) : d.label,
    title: o.title != null ? s(o.title, 120) : d.title,
    titleHighlight: o.titleHighlight != null ? s(o.titleHighlight, 120) : d.titleHighlight,
    desc: o.desc != null ? s(o.desc, 600) : d.desc,
    image: o.image != null ? s(o.image, 500) : d.image,
    image2: o.image2 != null ? s(o.image2, 500) : d.image2,
    bgImage: o.bgImage != null ? s(o.bgImage, 500) : d.bgImage,
    cards: o.cards != null ? arr(o.cards).slice(0, 12).map(parseCard) : d.cards,
    cta: o.cta != null
      ? { title: s(cta.title, 160), text: s(cta.text, 300), link: s(cta.link, 500), label: s(cta.label, 60) }
      : d.cta,
    partners: o.partners != null ? arr<unknown>(o.partners).slice(0, 12).map((x) => s(x, 40)).filter(Boolean) : d.partners,
    testimonialText: o.testimonialText != null ? s(o.testimonialText, 400) : d.testimonialText,
    testimonialAuthor: o.testimonialAuthor != null ? s(o.testimonialAuthor, 120) : d.testimonialAuthor,
  };
}

/* ── Rendering (produces the exact current markup for default configs) ── */
const arrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>`;

function heroHtml(c: NajdBlockConfig): string {
  const features = (c.cards || []).map((f) =>
    `<div class="najd-hero-feature"><span style="color:${safeColor(f.tagColor, "#ec205f")};">●</span><span>${esc(f.text)}</span></div>`
  ).join("");

  // Merchant-controllable background + the two visual photo cards. Inline styles
  // override the CSS defaults; empty values fall back to the stylesheet.
  const bg = cssUrl(c.bgImage);
  const heroStyle = bg
    ? ` style="background: radial-gradient(circle at 50% 50%, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.95) 100%), url('${bg}'); background-size: cover; background-position: center;"`
    : "";
  const img1 = cssUrl(c.image);
  const img2 = cssUrl(c.image2);
  const blueStyle = img1 ? ` style="background-image:url('${img1}');background-size:cover;background-position:center;"` : "";
  const pinkStyle = img2 ? ` style="background-image:url('${img2}');background-size:cover;background-position:center;background-repeat:no-repeat;"` : "";

  return `
  <section class="najd-hero"${heroStyle}>
    <div class="najd-hero-blur-1"></div><div class="najd-hero-blur-2"></div>
    <div class="najd-container"><div class="najd-hero-wrap"><div class="najd-hero-content">
      <div class="najd-hero-badge">${esc(c.label)}</div>
      <h1 class="najd-hero-title">${esc(c.title)} <br><span class="najd-gradient-text">${esc(c.titleHighlight)}</span></h1>
      <p class="najd-hero-desc">${esc(c.desc)}</p>
      <div class="najd-hero-buttons">
        <a href="${safeUrl(c.cta?.link)}" class="najd-hero-btn najd-btn-primary">${esc(c.cta?.label)} ${arrowSvg}</a>
        <a href="/all-print-products/c804817736" class="najd-hero-btn najd-glass secondary">تصفح أعمالنا</a>
      </div>
      <div class="najd-hero-features">${features}</div>
    </div>
    <div class="najd-hero-visual"><div class="najd-visual-grid">
      <div class="najd-box-card najd-box-blue"${blueStyle}><div class="overlay"></div>${img1 ? "" : '<span class="najd-box-label">NAJD</span>'}</div>
      <div class="najd-box-card najd-box-pink"${pinkStyle}><div class="overlay"></div>${img2 ? "" : '<span class="najd-box-label">NAJD</span>'}</div>
      <div class="najd-box-white"><div class="najd-white-bars"><div style="background:#244da0;"></div><div style="background:#ec205f;"></div></div><span class="najd-white-title">NAJD</span></div>
    </div><div class="najd-visual-frame"></div></div></div></div>
  </section>`;
}

function headerHtml(c: NajdBlockConfig, labelClass = "najd-section-label", titleClass = "najd-section-title"): string {
  return `<div class="najd-section-header">
    <h2 class="${labelClass}">${esc(c.label)}</h2>
    <div class="${titleClass}">${esc(c.title)} <span>${esc(c.titleHighlight)}</span></div>
    <div class="najd-divider"></div>
    ${c.desc ? `<p class="najd-section-desc">${esc(c.desc)}</p>` : ""}
  </div>`;
}

function ctaBox(c: NajdBlockConfig, cls: string, btnCls: string): string {
  if (!c.cta?.title && !c.cta?.label) return "";
  return `<div class="${cls} najd-glass">
    <h4>${esc(c.cta?.title)}</h4>
    <p>${esc(c.cta?.text)}</p>
    <a href="${safeUrl(c.cta?.link)}" class="${btnCls} najd-btn-primary">${esc(c.cta?.label)}</a>
  </div>`;
}

function servicesHtml(c: NajdBlockConfig): string {
  const cards = (c.cards || []).map((card, i) =>
    `<div class="najd-service-card najd-glass box-${i + 1}">
      <div class="najd-service-icon" style="color:${safeColor(card.iconColor, "#ec205f")};">${SERVICE_ICONS[i % SERVICE_ICONS.length]}</div>
      <h3>${esc(card.title)}</h3><p>${esc(card.text)}</p>
    </div>`
  ).join("");
  return `<section class="najd-services"><div class="najd-services-top-line"></div><div class="najd-container">
    ${headerHtml(c)}<div class="najd-services-grid">${cards}</div>
    ${ctaBox(c, "najd-cta-box", "najd-cta-btn")}
  </div></section>`;
}

function stickersHtml(c: NajdBlockConfig): string {
  const cards = (c.cards || []).map((card) =>
    `<div class="najd-sticker-card"><div class="najd-peel"></div><div class="najd-sticker-body najd-glass">
      <div class="najd-sticker-icon">${esc(card.emoji)}</div>
      <h4 class="najd-sticker-title">${esc(card.title)}</h4>
      <p class="najd-sticker-sub" style="color:${safeColor(card.subtitleColor, "#ec205f")};">${esc(card.subtitle)}</p>
      <p class="najd-sticker-text">${esc(card.text)}</p>
      <div class="najd-sticker-tags"><span class="najd-sticker-tag">${esc(card.tag)}</span></div>
    </div></div>`
  ).join("");
  return `<section class="najd-stickers"><div class="najd-container">
    <div class="najd-stickers-head"><div class="najd-stickers-head-content">
      <h2 class="najd-stickers-label">${esc(c.label)}</h2>
      <h3 class="najd-stickers-title">${esc(c.title)} <span class="najd-gradient-text accent">${esc(c.titleHighlight)}</span></h3>
      <p class="najd-stickers-desc">${esc(c.desc)}</p>
    </div></div>
    <div class="najd-stickers-grid">${cards}</div>
  </div></section>`;
}

function startupsHtml(c: NajdBlockConfig): string {
  const cards = (c.cards || []).map((card) => {
    const col = safeColor(card.badgeColor, "#ec205f");
    return `<div class="najd-small-card najd-glass">
      <div class="najd-small-orb" style="background:${col === "#ffffff" ? "rgba(255,255,255,.05)" : col + "1a"};"></div>
      <div class="najd-small-icon">${esc(card.emoji)}</div>
      <h4>${esc(card.title)}</h4><p>${esc(card.text)}</p>
      <span class="najd-startup-badge" style="color:${col};">${esc(card.badge)}</span>
    </div>`;
  }).join("");
  return `<section class="najd-small-quantities"><div class="najd-small-blur-1"></div><div class="najd-small-blur-2"></div>
    <div class="najd-container">
      <div class="najd-small-header">
        <h2 class="najd-small-label">${esc(c.label)}</h2>
        <h3 class="najd-small-title">${esc(c.title)} <span>${esc(c.titleHighlight)}</span></h3>
        <p class="najd-small-desc">${esc(c.desc)}</p>
      </div>
      <div class="najd-small-grid">${cards}</div>
      ${c.cta?.title ? `<div class="najd-small-highlight"><div class="najd-small-highlight-wrap">
        <div class="najd-small-highlight-icon">💡</div>
        <div><h4>${esc(c.cta.title)}</h4><p>${esc(c.cta.text)}</p></div>
      </div><a href="${safeUrl(c.cta.link)}" class="najd-small-highlight-btn najd-btn-primary">${esc(c.cta.label)}</a></div>` : ""}
    </div></section>`;
}

function whyHtml(c: NajdBlockConfig): string {
  const feats = (c.cards || []).map((card, i) =>
    `<div class="najd-feature-box najd-glass">
      <div class="najd-feature-icon" style="color:${safeColor(card.iconColor, "#ec205f")};">${WHY_ICONS[i % WHY_ICONS.length]}</div>
      <h4>${esc(card.title)}</h4><p>${esc(card.text)}</p>
    </div>`
  ).join("");
  const partners = (c.partners || []).map((p) => `<div class="najd-partner-item">${esc(p)}</div>`).join("");
  return `<section class="najd-why-us"><div class="najd-container"><div class="najd-why-wrap"><div class="najd-why-content">
    <div class="najd-why-head">
      <h2 class="najd-section-label najd-why-label">${esc(c.label)}</h2>
      <h3 class="najd-why-title">${esc(c.title)} <span>${esc(c.titleHighlight)}</span></h3>
      <p class="najd-section-desc">${esc(c.desc)}</p>
    </div>
    <div class="najd-features-grid">${feats}</div>
  </div>
  <div class="najd-why-visual"><div class="najd-partners-card najd-glass"><div class="najd-partners-glow"></div>
    <h4 class="najd-partners-title">شركاء <span>النجاح</span></h4>
    <div class="najd-partners-grid">${partners}</div>
    <div class="najd-testimonial-box"><div class="najd-testimonial-wrap"><div class="najd-quote-badge">"</div>
      <div><p class="najd-testimonial-text">${esc(c.testimonialText)}</p><p class="najd-testimonial-author">${esc(c.testimonialAuthor)}</p></div>
    </div></div>
  </div></div></div></div></section>`;
}

function digitalHtml(c: NajdBlockConfig): string {
  const points = (c.cards || []).map((p) =>
    `<div class="najd-digital-point"><div class="najd-digital-iconbox" style="background:${safeColor(p.tagColor, "#244da0")}33;">${esc(p.emoji)}</div><span>${esc(p.text)}</span></div>`
  ).join("");
  return `<section class="najd-digital-print"><div class="najd-container"><div class="najd-digital-wrap">
    <div class="najd-digital-visual"><div class="najd-digital-image-wrap">
      <div class="najd-digital-image-card najd-glass"><img src="${safeUrl(c.image)}" alt="${esc(c.title)}"></div>
      <div class="najd-fast-badge"><span>FAST</span></div>
    </div></div>
    <div class="najd-digital-content">
      <h2 class="najd-digital-title">${esc(c.title)} <br><span>${esc(c.titleHighlight)}</span></h2>
      <p class="najd-digital-desc">${esc(c.desc)}</p>
      <div class="najd-digital-points" style="margin-top:32px;">${points}</div>
    </div>
  </div></div></section>`;
}

function largeHtml(c: NajdBlockConfig): string {
  const cards = (c.cards || []).map((card) => {
    const li = (card.list || []).map((x) => `<li>${esc(x)}</li>`).join("");
    return `<div class="najd-io-card">
      <img src="${safeUrl(card.image)}" alt="${esc(card.title)}" class="najd-io-img"><div class="najd-io-overlay"></div>
      <div class="najd-io-body">
        <div class="najd-io-tag" style="background:${safeColor(card.tagColor, "#244da0")};">${esc(card.tag)}</div>
        <h4 class="najd-io-title">${esc(card.title)}</h4>
        <p class="najd-io-desc">${esc(card.text)}</p>
        <ul class="najd-io-list">${li}</ul>
      </div></div>`;
  }).join("");
  return `<section class="najd-large-format"><div class="najd-large-bg-shape"></div><div class="najd-container">
    <div class="najd-large-header">
      <h2 class="najd-large-label">${esc(c.label)}</h2>
      <h3 class="najd-large-title">${esc(c.title)} <span style="color:#ec205f;">${esc(c.titleHighlight)}</span></h3>
      <div class="najd-large-divider"></div>
    </div>
    <div class="najd-large-grid">${cards}</div>
    ${c.cta?.title ? `<div class="najd-large-cta-box najd-glass"><div><h4>${esc(c.cta.title)}</h4><p>${esc(c.cta.text)}</p></div>
      <a href="${safeUrl(c.cta.link)}" class="najd-large-cta najd-btn-primary">${esc(c.cta.label)}</a></div>` : ""}
  </div></section>`;
}

const RENDERERS: Record<NajdType, (c: NajdBlockConfig) => string> = {
  najd_hero: heroHtml,
  najd_services: servicesHtml,
  najd_stickers: stickersHtml,
  najd_startups: startupsHtml,
  najd_why: whyHtml,
  najd_digital: digitalHtml,
  najd_large: largeHtml,
};

/** Build the HTML for a Najd block from its (already-parsed) config. */
export function renderNajdBlockHtml(type: NajdType, cfg?: NajdBlockConfig): string {
  const c = cfg && Object.keys(cfg).length ? cfg : DEFAULTS[type];
  return RENDERERS[type](c);
}
