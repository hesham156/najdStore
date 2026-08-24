import Link from "next/link";
import { Mail, Phone, MapPin, Twitter, Instagram, Youtube } from "lucide-react";
import { SiteLogo } from "@/components/ui/site-logo";
import { getActiveCategories } from "@/lib/queries";
import { getSettings } from "@/lib/settings";

const quickLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "/products", label: "جميع المنتجات" },
  { href: "/blog", label: "المدونة" },
  { href: "/faq", label: "الأسئلة الشائعة" },
  { href: "/contact", label: "اتصل بنا" },
  { href: "/terms", label: "الشروط والأحكام" },
];

export async function Footer() {
  const [allCategories, s] = await Promise.all([
    getActiveCategories().catch(() => []),
    getSettings({
      site_name: "متجرك الإلكتروني",
      footer_description: "متجرك الموثوق لأفضل المنتجات والخدمات بأسعار مناسبة وتسليم سريع.",
      site_email: "support@store.com",
      site_phone: "+966 50 123 4567",
    }).catch(() => ({
      site_name: "متجرك الإلكتروني",
      footer_description: "متجرك الموثوق لأفضل المنتجات والخدمات بأسعار مناسبة وتسليم سريع.",
      site_email: "support@store.com",
      site_phone: "+966 50 123 4567",
    })),
  ]);

  const categories = (allCategories as Array<{ slug: string; nameAr: string }>)
    .slice(0, 6)
    .map((c) => ({ href: `/categories/${c.slug}`, label: c.nameAr }));

  return (
    <footer className="bg-surface-sunken text-fg-subtle mt-16">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <SiteLogo size="sm" />
              <div>
                <p className="font-bold text-white text-base">{s.site_name}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-fg-subtle">
              {s.footer_description}
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: Twitter, href: "#", label: "تويتر" },
                { icon: Instagram, href: "#", label: "انستجرام" },
                { icon: Youtube, href: "#", label: "يوتيوب" },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  className="w-9 h-9 rounded-lg bg-surface-sunken flex items-center justify-center text-fg-subtle hover:bg-primary-600 hover:text-white transition-colors"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-bold text-white mb-4">الفئات</h3>
            <ul className="space-y-2">
              {categories.length === 0 && (
                <li><Link href="/products" className="text-sm text-fg-subtle hover:text-primary-400 transition-colors">جميع المنتجات</Link></li>
              )}
              {categories.map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    className="text-sm text-fg-subtle hover:text-primary-400 transition-colors"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-white mb-4">روابط سريعة</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-fg-subtle hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-white mb-4">تواصل معنا</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-fg-subtle">
                <Mail className="h-4 w-4 text-primary-400 shrink-0" />
                {s.site_email}
              </li>
              <li className="flex items-center gap-3 text-sm text-fg-subtle" dir="ltr">
                <Phone className="h-4 w-4 text-primary-400 shrink-0" />
                {s.site_phone}
              </li>
              <li className="flex items-center gap-3 text-sm text-fg-subtle">
                <MapPin className="h-4 w-4 text-primary-400 shrink-0" />
                المملكة العربية السعودية
              </li>
            </ul>

            <div className="mt-4 p-3 rounded-xl bg-surface-sunken border border-line">
              <p className="text-xs text-fg-subtle font-medium mb-1">ساعات الدعم</p>
              <p className="text-xs text-fg-subtle">السبت - الخميس: 9 ص - 11 م</p>
              <p className="text-xs text-fg-subtle">الجمعة: 2 م - 11 م</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-custom py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-fg-subtle">
            © {new Date().getFullYear()} {s.site_name}. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-xs text-fg-subtle hover:text-fg-subtle transition-colors">
              الشروط والأحكام
            </Link>
            <Link href="/terms#refund" className="text-xs text-fg-subtle hover:text-fg-subtle transition-colors">
              سياسة الاسترداد
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
