import Link from "next/link";
import { Mail, Phone, MapPin, Twitter, Instagram, Youtube } from "lucide-react";
import { SiteLogo } from "@/components/ui/site-logo";
import { getActiveCategories } from "@/lib/queries";
import { getSettings, BRANDING_DEFAULTS } from "@/lib/settings";
import { getLocale, getTranslations } from "next-intl/server";
import { pickText } from "@/lib/i18n-content";
import type { Locale } from "@/i18n/config";

const quickLinks = [
  { href: "/", key: "nav.home" },
  { href: "/products", key: "footer.allProducts" },
  { href: "/blog", key: "nav.blog" },
  { href: "/faq", key: "nav.faq" },
  { href: "/contact", key: "nav.contact" },
  { href: "/terms", key: "footer.terms" },
] as const;

/** Declared once so the fallback cannot drift from the query that uses it. */
const FOOTER_DEFAULTS = {
  site_name: BRANDING_DEFAULTS.site_name,
  footer_description: BRANDING_DEFAULTS.footer_description,
  site_email: "support@store.com",
  site_phone: "+966 50 123 4567",
  // Social profiles come from Settings. Empty means "no account" — the icon is
  // then hidden rather than rendered as a link to "#", which went nowhere.
  social_twitter: "",
  social_instagram: "",
  social_youtube: "",
};

export async function Footer() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations();
  const [allCategories, s] = await Promise.all([
    getActiveCategories().catch(() => []),
    getSettings(FOOTER_DEFAULTS).catch(() => FOOTER_DEFAULTS),
  ]);

  const categories = (allCategories as Array<{ slug: string; name: string; nameAr: string }>)
    .slice(0, 6)
    .map((c) => ({ href: `/categories/${c.slug}`, label: pickText(locale, c.name, c.nameAr) }));

  const socials = [
    { icon: Twitter, href: s.social_twitter, label: t("footer.twitter") },
    { icon: Instagram, href: s.social_instagram, label: t("footer.instagram") },
    { icon: Youtube, href: s.social_youtube, label: t("footer.youtube") },
  ].filter((x) => x.href.trim());

  return (
    // Headings and body text take their colour from the theme tokens. They used
    // to be `text-white` / `text-fg-subtle` on a light `surface-sunken` ground,
    // which measured 1.1:1 and 2.31:1 — the headings were invisible in light
    // mode and the body text failed WCAG AA.
    <footer className="bg-surface-sunken text-fg-muted mt-16">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <SiteLogo size="sm" />
              <div>
                <p className="font-bold text-fg text-base">{s.site_name}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-fg-muted">
              {s.footer_description}
            </p>
            {socials.length > 0 && (
              <div className="flex items-center gap-3">
                {socials.map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-surface border border-line flex items-center justify-center text-fg-muted hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-colors"
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-bold text-fg mb-4">{t("footer.categories")}</h3>
            <ul className="space-y-2">
              {categories.length === 0 && (
                <li><Link href="/products" className="text-sm text-fg-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors">{t("footer.allProducts")}</Link></li>
              )}
              {categories.map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    className="text-sm text-fg-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-fg mb-4">{t("footer.quickLinks")}</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-fg-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-fg mb-4">{t("footer.contactUs")}</h3>
            <ul className="space-y-3">
              {/* Actionable on a phone: tapping the number should dial it. */}
              <li className="text-sm">
                <a href={`mailto:${s.site_email}`} className="flex items-center gap-3 text-fg-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  <Mail className="h-4 w-4 text-primary-400 shrink-0" />
                  <span className="truncate">{s.site_email}</span>
                </a>
              </li>
              <li className="text-sm">
                <a href={`tel:${s.site_phone.replace(/\s+/g, "")}`} dir="ltr" className="flex items-center gap-3 text-fg-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  <Phone className="h-4 w-4 text-primary-400 shrink-0" />
                  {s.site_phone}
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-fg-muted">
                <MapPin className="h-4 w-4 text-primary-400 shrink-0" />
                {t("footer.location")}
              </li>
            </ul>

            <div className="mt-4 p-3 rounded-xl bg-surface border border-line">
              <p className="text-xs text-fg font-semibold mb-1">{t("footer.supportHours")}</p>
              <p className="text-xs text-fg-muted">{t("footer.hoursWeekdays")}</p>
              <p className="text-xs text-fg-muted">{t("footer.hoursFriday")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-custom py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-fg-muted">
            © {new Date().getFullYear()} {s.site_name}. {t("footer.rights")}.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-xs text-fg-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              {t("footer.terms")}
            </Link>
            <Link href="/terms#refund" className="text-xs text-fg-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              {t("footer.refundPolicy")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
