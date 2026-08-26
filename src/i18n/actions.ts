"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, isLocale } from "./config";

/**
 * Persists the shopper's language choice in the `NEXT_LOCALE` cookie. Read back
 * on every request by `src/i18n/request.ts` and the root layout. Not httpOnly —
 * it carries no secret, only a UI preference — but locked to the site path with
 * a one-year lifetime so the choice survives return visits.
 */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  cookies().set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
