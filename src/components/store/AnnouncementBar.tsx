"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Tag, Megaphone, Percent, CheckCircle, AlertTriangle, Copy, Check, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";
import { useTranslations } from "next-intl";

interface Announcement {
  id: string;
  titleAr: string;
  type: string;
  link?: string | null;
  couponCode?: string | null;
  bgColor: string;
  textColor: string;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  INFO:    Megaphone,
  COUPON:  Tag,
  SALE:    Percent,
  SUCCESS: CheckCircle,
  WARNING: AlertTriangle,
};

export function AnnouncementBar() {
  const t = useTranslations("announcement");
  const [items, setItems]       = useState<Announcement[]>([]);
  const [current, setCurrent]   = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied]     = useState<string | null>(null);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    setMounted(true);
    const key = "announcements_dismissed";
    if (sessionStorage.getItem(key)) { setDismissed(true); return; }

    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => { if (d.success && d.data.length) setItems(d.data); })
      .catch(() => {});
  }, []);

  /* Auto-rotate every 5 s */
  const next = useCallback(() => setCurrent((c) => (c + 1) % items.length), [items.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + items.length) % items.length), [items.length]);

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(next, 5000);
    return () => clearInterval(id);
  }, [items.length, next]);

  const dismiss = () => {
    sessionStorage.setItem("announcements_dismissed", "1");
    setDismissed(true);
  };

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success(t("codeCopied", { code }));
    setTimeout(() => setCopied(null), 2500);
  };

  if (!mounted || dismissed || items.length === 0) return null;

  const item = items[current];
  const Icon = TYPE_ICON[item.type] || Megaphone;

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ backgroundColor: item.bgColor, color: item.textColor }}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between gap-2 py-2.5 min-h-[40px]">

          {/* Prev arrow — only when multiple */}
          {items.length > 1 && (
            <button onClick={prev} className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-center gap-2 flex-wrap text-center"
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                <span className="text-sm font-semibold leading-tight">{item.titleAr}</span>

                {/* Coupon badge */}
                {item.couponCode && (
                  <button
                    onClick={() => copyCoupon(item.couponCode!)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 border-white/40 bg-white/15 hover:bg-white/30 transition-colors text-xs font-bold tracking-wider"
                  >
                    {copied === item.couponCode
                      ? <><Check className="h-3 w-3" />{t("copied")}</>
                      : <><Copy className="h-3 w-3" />{item.couponCode}</>
                    }
                  </button>
                )}

                {/* Link */}
                {item.link && (
                  <Link
                    href={item.link}
                    className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    {t("discoverNow")} <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Next arrow */}
            {items.length > 1 && (
              <button onClick={next} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {/* Dismiss */}
            <button onClick={dismiss} className="p-1 rounded-full hover:bg-white/20 transition-colors opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dots indicator */}
        {items.length > 1 && (
          <div className="flex justify-center gap-1.5 pb-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="rounded-full transition-all"
                style={{
                  width:  i === current ? 16 : 6,
                  height: 6,
                  backgroundColor: i === current ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
