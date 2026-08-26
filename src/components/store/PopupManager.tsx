"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { X, Copy, Check, Tag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Popup {
  id: string;
  titleAr: string;
  contentAr: string;
  type: "ON_LOAD" | "TIMED" | "EXIT_INTENT" | "SCROLL";
  delay: number;
  scrollDepth: number;
  image: string | null;
  buttonTextAr: string;
  buttonLink: string | null;
  couponCode: string | null;
  bgColor: string;
  textColor: string;
  targetPages: string[];
  showOnce: boolean;
  sortOrder: number;
}

type PageKey =
  | "HOME"
  | "PRODUCTS"
  | "PRODUCT_DETAIL"
  | "CART"
  | "CHECKOUT"
  | "ALL";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolvePageKey(pathname: string): PageKey {
  if (pathname === "/") return "HOME";
  if (pathname === "/products") return "PRODUCTS";
  if (/^\/products\/.+/.test(pathname)) return "PRODUCT_DETAIL";
  if (pathname === "/cart") return "CART";
  if (pathname === "/checkout") return "CHECKOUT";
  return "HOME";
}

function wasShown(id: string): boolean {
  try {
    return localStorage.getItem(`popup_shown_${id}`) === "1";
  } catch {
    return false;
  }
}

function markShown(id: string): void {
  try {
    localStorage.setItem(`popup_shown_${id}`, "1");
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Single popup modal
// ---------------------------------------------------------------------------

interface PopupModalProps {
  popup: Popup;
  onClose: () => void;
}

function PopupModal({ popup, onClose }: PopupModalProps) {
  const router = useRouter();
  const t = useTranslations("popup");
  const tc = useTranslations("common");
  const ta = useTranslations("announcement");
  const [copied, setCopied] = useState(false);

  const handleCopyCoupon = () => {
    if (!popup.couponCode) return;
    navigator.clipboard.writeText(popup.couponCode).then(() => {
      setCopied(true);
      toast.success(ta("codeCopied", { code: popup.couponCode }));
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleCta = () => {
    if (popup.buttonLink) {
      router.push(popup.buttonLink);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`popup-title-${popup.id}`}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: popup.bgColor, color: popup.textColor }}
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 24 }}
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 end-3 z-20 p-1.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors"
          aria-label={tc("close")}
        >
          <X className="h-4 w-4" style={{ color: popup.textColor }} />
        </button>

        {/* Optional image */}
        {popup.image && (
          <div className="relative w-full aspect-video">
            <Image
              src={popup.image}
              alt={popup.titleAr}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-4">
          <h2
            id={`popup-title-${popup.id}`}
            className="text-xl font-bold leading-snug"
            style={{ color: popup.textColor }}
          >
            {popup.titleAr}
          </h2>

          <p
            className="text-sm leading-relaxed opacity-90"
            style={{ color: popup.textColor }}
          >
            {popup.contentAr}
          </p>

          {/* Coupon code */}
          {popup.couponCode && (
            <div
              className="flex items-center gap-2 rounded-xl border-2 border-white/30 bg-white/10 px-4 py-2.5"
            >
              <Tag className="h-4 w-4 shrink-0 opacity-80" />
              <span className="flex-1 font-mono font-bold tracking-widest text-sm">
                {popup.couponCode}
              </span>
              <button
                onClick={handleCopyCoupon}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                aria-label={t("copyCode")}
              >
                {copied ? (
                  <><Check className="h-3.5 w-3.5" />{t("copied")}</>
                ) : (
                  <><Copy className="h-3.5 w-3.5" />{t("copy")}</>
                )}
              </button>
            </div>
          )}

          {/* CTA button */}
          {popup.buttonTextAr && (
            <Button
              onClick={handleCta}
              fullWidth
              className="!bg-white/20 hover:!bg-white/30 border border-white/30 text-inherit font-bold shadow-none"
              style={{ color: popup.textColor }}
            >
              {popup.buttonTextAr}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manager (fetches + orchestrates trigger logic)
// ---------------------------------------------------------------------------

export function PopupManager() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [activePopup, setActivePopup] = useState<Popup | null>(null);
  const [queue, setQueue] = useState<Popup[]>([]);
  const shownRef = useRef<Set<string>>(new Set());
  const cleanupRef = useRef<(() => void) | null>(null);

  // ---------- mount guard (hydration safety) ----------
  useEffect(() => {
    setMounted(true);
  }, []);

  // ---------- fetch & filter ----------
  useEffect(() => {
    if (!mounted) return;

    const pageKey = resolvePageKey(pathname);

    fetch(`/api/popups?page=${pageKey}`)
      .then((r) => r.json())
      .then((data: { success: boolean; data: Popup[] }) => {
        if (!data.success || !data.data?.length) return;

        const eligible = data.data
          .filter(
            (p) =>
              p.targetPages.includes(pageKey) || p.targetPages.includes("ALL")
          )
          .filter((p) => !(p.showOnce && wasShown(p.id)))
          .sort((a, b) => a.sortOrder - b.sortOrder);

        setQueue(eligible);
      })
      .catch(() => {});
  }, [mounted, pathname]);

  // ---------- close handler ----------
  const closePopup = useCallback(() => {
    if (activePopup?.showOnce) {
      markShown(activePopup.id);
    }
    // remove from queue and advance
    setQueue((prev) => prev.slice(1));
    setActivePopup(null);
  }, [activePopup]);

  // ---------- trigger logic: fires for each popup in queue ----------
  useEffect(() => {
    if (!mounted || queue.length === 0) return;

    // Clean up previous listener before setting up new one
    cleanupRef.current?.();
    cleanupRef.current = null;

    const popup = queue[0];

    // Already shown or active — skip
    if (shownRef.current.has(popup.id) || activePopup?.id === popup.id) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const show = () => {
      if (shownRef.current.has(popup.id)) return;
      shownRef.current.add(popup.id);
      setActivePopup(popup);
      cleanupRef.current?.();
    };

    if (popup.type === "ON_LOAD") {
      timer = setTimeout(show, 500);
      cleanupRef.current = () => {
        if (timer) clearTimeout(timer);
      };
    } else if (popup.type === "TIMED") {
      timer = setTimeout(show, popup.delay * 1000);
      cleanupRef.current = () => {
        if (timer) clearTimeout(timer);
      };
    } else if (popup.type === "EXIT_INTENT") {
      const handler = (e: MouseEvent) => {
        if (e.clientY <= 5) show();
      };
      document.addEventListener("mouseleave", handler);
      cleanupRef.current = () => {
        document.removeEventListener("mouseleave", handler);
      };
    } else if (popup.type === "SCROLL") {
      const handler = () => {
        const docH =
          document.documentElement.scrollHeight - window.innerHeight;
        if (docH <= 0) return;
        const pct = (window.scrollY / docH) * 100;
        if (pct >= popup.scrollDepth) show();
      };
      window.addEventListener("scroll", handler, { passive: true });
      cleanupRef.current = () => {
        window.removeEventListener("scroll", handler);
      };
    }

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, queue]);

  if (!mounted || !activePopup) return null;

  return (
    <AnimatePresence>
      <PopupModal key={activePopup.id} popup={activePopup} onClose={closePopup} />
    </AnimatePresence>
  );
}
