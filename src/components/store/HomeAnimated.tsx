"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import type { BannerSlide } from "@/lib/home-layout";
import type { ProductWithCategory } from "@/types";

/* eslint-disable @next/next/no-img-element */

// ─── Auto-scrolling product carousel (CSS marquee) ─────────────────────────
// A continuous horizontal loop of product cards. The track is two identical
// halves and the animation shifts it by exactly one half, so the loop is
// seamless; it pauses on hover/focus and holds still under reduced motion
// (see globals.css).
const CARD_W = 256; // w-64
const GAP = 20;     // ms-5 between cards — kept as a margin, not flex `gap`, so
                    // the repeating unit is exactly CARD_W + GAP and half the
                    // track lines up perfectly with one copy of the list.

export function ProductSlider({
  title,
  subtitle,
  products,
  speed = 40,
}: {
  title?: string;
  subtitle?: string;
  products: ProductWithCategory[];
  speed?: number;
}) {
  if (!products.length) return null;

  // A half has to be at least as wide as the widest viewport, otherwise the
  // shift outruns the content and bare space shows up at the trailing edge.
  const perHalf = Math.max(1, Math.ceil(1920 / ((CARD_W + GAP) * products.length)));
  const half = Array.from({ length: perHalf }, () => products).flat();
  const loop = [...half, ...half]; // seamless loop needs two identical halves
  // One pass of the product list keeps taking `speed` seconds regardless of
  // how many times the list had to be repeated to fill the track.
  const duration = Math.max(10, speed) * perHalf;

  return (
    <section className="py-16 bg-surface overflow-hidden">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-fg">{title || "منتجات"}</h2>
            {subtitle && <p className="text-fg-subtle mt-1 text-sm">{subtitle}</p>}
          </div>
          <Link href="/products" className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:gap-2 transition-all font-medium">
            عرض الكل <ChevronLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="marquee-pausable overflow-hidden">
        <div
          className="marquee-track flex w-max"
          style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
        >
          {loop.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              className="w-64 shrink-0 ms-5"
              aria-hidden={i >= half.length || undefined}
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Rotating banner carousel ───────────────────────────────────────────────
export function BannerSlider({
  slides,
  autoplay = true,
  interval = 5,
}: {
  slides: BannerSlide[];
  autoplay?: boolean;
  interval?: number;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (!autoplay || reduced || count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), Math.max(2, interval) * 1000);
    return () => clearInterval(id);
  }, [autoplay, reduced, count, interval]);

  if (!count) return null;
  const slide = slides[Math.min(index, count - 1)];

  const Img = <img src={slide.image} alt={slide.alt || ""} className="w-full h-full object-cover" />;

  return (
    <section className="py-8">
      <div className="container-custom">
        <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] rounded-2xl overflow-hidden bg-surface-sunken">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: reduced ? 1 : 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.15 : 0.6, ease: "easeOut" }}
              className="absolute inset-0"
            >
              {slide.link ? <Link href={slide.link} className="block w-full h-full">{Img}</Link> : Img}
            </motion.div>
          </AnimatePresence>

          {count > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`الشريحة ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Scrolling announcement ticker (CSS marquee) ────────────────────────────
export function Marquee({ text, speed = 20 }: { text: string; speed?: number }) {
  if (!text.trim()) return null;

  // Repeat the text enough to span a wide viewport (~8px per character at the
  // ticker's size, plus the 48px of padding each copy carries), then mirror the
  // group so the track is two identical halves.
  const perHalf = Math.max(2, Math.ceil(1920 / (text.trim().length * 8 + 48)));
  const group = Array.from({ length: perHalf }, () => text);

  return (
    <div className="marquee-pausable bg-primary-600 text-white overflow-hidden py-2.5">
      <div
        className="marquee-track flex w-max"
        style={{ "--marquee-duration": `${Math.max(8, speed)}s` } as React.CSSProperties}
      >
        {[...group, ...group].map((t, i) => (
          <span key={i} className="text-sm font-medium px-6 whitespace-nowrap" aria-hidden={i >= group.length || undefined}>{t}</span>
        ))}
      </div>
    </div>
  );
}
