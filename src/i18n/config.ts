/**
 * Central i18n configuration.
 *
 * The store started life fully Arabic (RTL). Multi-language support is built on
 * a cookie-based locale (no `/en/...` URL segment), so existing routes stay put
 * and nothing has to move into an `[locale]/` folder. Adding a new language is a
 * two-step job: append its code here and drop a `messages/<code>.json` file.
 */

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

/** The store's original language — used whenever no valid cookie is present. */
export const defaultLocale: Locale = "ar";

/** Cookie that carries the shopper's language choice across requests. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Text direction per locale. Arabic is RTL, everything else LTR for now. */
export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

/** Native language names for the language switcher. */
export const localeNames: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
};

/** BCP-47 tag for the `<html lang>` attribute and Open Graph `locale`. */
export const localeHtmlLang: Record<Locale, string> = {
  ar: "ar",
  en: "en",
};

export const localeOpenGraph: Record<Locale, string> = {
  ar: "ar_SA",
  en: "en_US",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function getDirection(locale: string): "rtl" | "ltr" {
  return isLocale(locale) ? localeDirection[locale] : localeDirection[defaultLocale];
}
