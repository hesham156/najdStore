import type { Locale } from "@/i18n/config";
import { defaultLocale } from "@/i18n/config";

/**
 * Resolves database-stored content to the active language.
 *
 * Products and categories already ship two columns per translatable field —
 * an Arabic one (`nameAr`, `descriptionAr`, `featuresAr`) and a base one
 * (`name`, `description`, `features`) that holds the English/original value.
 * These helpers pick the right side for the current locale and fall back to the
 * other when the target is empty, so a half-translated record never renders a
 * blank title.
 *
 * When a third language is added later, this is the single seam to change:
 * swap the two-column lookup for a JSON `translations` column keyed by locale
 * and every storefront/admin call site keeps working unchanged.
 */

/** Pick a scalar field: Arabic value for `ar`, base value otherwise. */
export function pickText(
  locale: Locale,
  base: string | null | undefined,
  ar: string | null | undefined
): string {
  const arabic = (ar ?? "").trim();
  const other = (base ?? "").trim();
  if (locale === "ar") return arabic || other;
  return other || arabic;
}

/** Pick a string-array field (e.g. product features) by locale, with fallback. */
export function pickList(
  locale: Locale,
  base: string[] | null | undefined,
  ar: string[] | null | undefined
): string[] {
  const arabic = ar ?? [];
  const other = base ?? [];
  if (locale === "ar") return arabic.length ? arabic : other;
  return other.length ? other : arabic;
}

type ProductLike = {
  name: string;
  nameAr: string;
  description?: string | null;
  descriptionAr?: string | null;
  features?: string[] | null;
  featuresAr?: string[] | null;
};

/**
 * Returns a product with `displayName` / `displayDescription` / `displayFeatures`
 * resolved for the locale. The original columns are preserved so callers that
 * still need a specific language (e.g. admin editing both) keep working.
 */
export function localizeProduct<T extends ProductLike>(product: T, locale: Locale) {
  return {
    ...product,
    displayName: pickText(locale, product.name, product.nameAr),
    displayDescription: pickText(locale, product.description, product.descriptionAr),
    displayFeatures: pickList(locale, product.features, product.featuresAr),
  };
}

type CategoryLike = {
  name: string;
  nameAr: string;
  description?: string | null;
  descriptionAr?: string | null;
};

export function localizeCategory<T extends CategoryLike>(category: T, locale: Locale) {
  return {
    ...category,
    displayName: pickText(locale, category.name, category.nameAr),
    displayDescription: pickText(locale, category.description, category.descriptionAr),
  };
}

export { defaultLocale };
