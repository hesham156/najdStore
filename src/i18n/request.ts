import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";

/**
 * Resolves the active locale for every server request from the `NEXT_LOCALE`
 * cookie, falling back to Arabic (the store's original language). This runs for
 * Server Components via next-intl; the matching `<html dir>` is set in the root
 * layout from the same cookie.
 */
export default getRequestConfig(async () => {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
