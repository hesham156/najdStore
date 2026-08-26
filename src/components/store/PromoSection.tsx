"use client";

import { useState, useEffect } from "react";
import { Tag, Percent, Copy, Check, ExternalLink, Megaphone, Zap, Clock } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import { AnimatedSection, StaggerContainer, StaggerItem } from "@/components/store/AnimatedSection";
import { useTranslations } from "next-intl";

interface Announcement {
  id: string;
  titleAr: string;
  type: string;
  link?: string | null;
  couponCode?: string | null;
  bgColor: string;
  textColor: string;
  expiresAt?: string | null;
}

// Same five types as the admin announcements screen, and the same five tones,
// so what the merchant picks there is what the customer sees here.
// `fill` carries a white icon, hence the fixed `-solid` step.
const TYPE_CONFIG: Record<string, { icon: React.ElementType; labelKey: string; fill: string; border: string }> = {
  COUPON:  { icon: Tag,      labelKey: "typeCoupon",  fill: "bg-brand-solid",   border: "border-brand/25" },
  SALE:    { icon: Percent,  labelKey: "typeSale",    fill: "bg-danger-solid",  border: "border-danger/25" },
  INFO:    { icon: Megaphone,labelKey: "typeInfo",     fill: "bg-info-solid",    border: "border-info/25" },
  SUCCESS: { icon: Zap,      labelKey: "typeSuccess", fill: "bg-success-solid", border: "border-success/25" },
  WARNING: { icon: Clock,    labelKey: "typeWarning", fill: "bg-warning-solid", border: "border-warning/25" },
};

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const t = useTranslations("promo");
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining(t("offerEnded")); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) {
        const d = Math.floor(h / 24);
        setRemaining(t("endsInDays", { days: d }));
      } else {
        setRemaining(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      }
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [expiresAt, t]);

  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
      <Clock className="h-3 w-3" />{remaining}
    </span>
  );
}

export function PromoSection() {
  const t = useTranslations("promo");
  const [items, setItems] = useState<Announcement[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => { if (d.success) setItems(d.data); })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success(t("couponCopied", { code }));
    setTimeout(() => setCopied(null), 3000);
  };

  return (
    <section className="bg-canvas py-14">
      <div className="container-custom">
        <AnimatedSection className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-bold mb-3">
            <Zap className="h-4 w-4" />
            {t("exclusiveOffers")}
          </div>
          <h2 className="text-2xl font-black text-fg">{t("title")}</h2>
          <p className="text-fg-subtle mt-2 text-sm">{t("subtitle")}</p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.INFO;
            const Icon = cfg.icon;

            return (
              <StaggerItem key={item.id}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: "0 16px 40px rgba(0,0,0,0.10)" }}
                  transition={{ duration: 0.22 }}
                  className={`relative overflow-hidden rounded-2xl border ${cfg.border} bg-surface`}
                >
                  {/* Top gradient band */}
                  <div className={`h-1.5 w-full ${cfg.fill}`} />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control shadow-sm ${cfg.fill}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${cfg.fill}`}>
                        {t(cfg.labelKey)}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="font-bold text-fg text-base leading-snug mb-3">
                      {item.titleAr}
                    </p>

                    {/* Coupon code */}
                    {item.couponCode && (
                      <button
                        onClick={() => copyCoupon(item.couponCode!)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-line hover:border-primary-400 dark:hover:border-primary-500 bg-surface-sunken hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all group mb-3"
                      >
                        <span className="font-mono font-black text-lg tracking-widest text-primary-700 dark:text-primary-300 group-hover:scale-105 transition-transform">
                          {item.couponCode}
                        </span>
                        <span className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                          copied === item.couponCode
                            ? "bg-success/10 text-success"
                            : "bg-surface-sunken text-fg-muted group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 group-hover:text-primary-700"
                        }`}>
                          {copied === item.couponCode
                            ? <><Check className="h-3 w-3" />{t("copied")}</>
                            : <><Copy className="h-3 w-3" />{t("copy")}</>
                          }
                        </span>
                      </button>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-2">
                      {item.expiresAt && <CountdownBadge expiresAt={item.expiresAt} />}
                      {item.link && (
                        <Link
                          href={item.link}
                          className={`ms-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${cfg.fill}`}
                        >
                          {t("discoverNow")} <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
