"use client";

import { useLocale } from "next-intl";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";
import { cn } from "@/lib/utils";

/**
 * Language picker for the storefront header. Writes the choice to the locale
 * cookie via a server action, then refreshes so Server Components re-render in
 * the new language and the root layout flips `<html dir>` (RTL ⇄ LTR).
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function choose(locale: Locale) {
    setOpen(false);
    if (locale === active) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-sm font-medium text-fg-muted hover:bg-surface-sunken transition-colors disabled:opacity-60"
        aria-label={localeNames[active]}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:block">{localeNames[active]}</span>
        <ChevronDown className="h-3.5 w-3.5 text-fg-subtle" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute end-0 top-full mt-2 w-40 rounded-xl border border-line bg-surface shadow-xl z-20 overflow-hidden py-1"
            >
              {locales.map((locale) => (
                <li key={locale}>
                  <button
                    type="button"
                    onClick={() => choose(locale)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-surface-sunken",
                      locale === active ? "text-primary-600 dark:text-primary-400 font-semibold" : "text-fg-muted"
                    )}
                  >
                    {localeNames[locale]}
                    {locale === active && <Check className="h-4 w-4" />}
                  </button>
                </li>
              ))}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
