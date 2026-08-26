"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Zap } from "lucide-react";
import { SiteLogo } from "@/components/ui/site-logo";
import { useTranslations } from "next-intl";

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

export interface HeroContentProps {
  badge?: string;
  title?: string;
  titleHighlight?: string;
  subtitle?: string;
  stats?: Array<{ label: string; value: string }>;
}

export default function HeroContent({
  badge,
  title,
  titleHighlight,
  subtitle,
  stats,
}: HeroContentProps) {
  const reduced = useReducedMotion();
  const t = useTranslations("hero");

  // Props win when the merchant has filled in the hero settings; otherwise the
  // translated defaults render in the active language.
  const badgeText = badge || t("badge");
  const titleText = title || t("title");
  const titleHighlightText = titleHighlight || t("titleHighlight");
  const subtitleText = subtitle || t("subtitle");
  const statList = stats ?? [
    { label: t("statCustomers"), value: "+5000" },
    { label: t("statProducts"), value: "+50" },
    { label: t("statOrders"), value: "+10K" },
  ];

  const container = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduced ? 0 : 0.13,
        delayChildren: 0.2,
      },
    },
  };

  const item = {
    hidden:  { opacity: 0, y: reduced ? 0 : 32 },
    visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0.1 : 0.55, ease: EASE } },
  };

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden flex flex-col items-center justify-end pb-20"
      style={{ backgroundColor: "#09090b" }}
    >
      {/* ── Rotating rings (purple-tinted) ───────────────────── */}
      <style>{`
        @keyframes hero-spin    { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
        @keyframes hero-spin-rv { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
        .hero-ring-cw  { animation: hero-spin    60s linear infinite; }
        .hero-ring-ccw { animation: hero-spin-rv 60s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-ring-cw, .hero-ring-ccw { animation: none; }
        }
      `}</style>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          perspective: "1200px",
          transform: "perspective(1200px) rotateX(14deg)",
          transformOrigin: "center bottom",
        }}
      >
        {/* Back ring */}
        <div className="absolute inset-0 hero-ring-cw">
          <div
            className="absolute top-1/2 left-1/2"
            style={{ width: 2000, height: 2000, transform: "translate(-50%,-50%) rotate(279deg)" }}
          >
            <img
              src="https://framerusercontent.com/images/oqZEqzDEgSLygmUDuZAYNh2XQ9U.png?scale-down-to=2048"
              alt=""
              className="w-full h-full object-cover"
              style={{ opacity: 0.35, filter: "hue-rotate(240deg) saturate(1.8) brightness(0.7)" }}
            />
          </div>
        </div>

        {/* Middle ring */}
        <div className="absolute inset-0 hero-ring-ccw">
          <div
            className="absolute top-1/2 left-1/2"
            style={{ width: 1100, height: 1100, transform: "translate(-50%,-50%) rotate(304deg)" }}
          >
            <img
              src="https://framerusercontent.com/images/UbucGYsHDAUHfaGZNjwyCzViw8.png?scale-down-to=1024"
              alt=""
              className="w-full h-full object-cover"
              style={{ opacity: 0.45, filter: "hue-rotate(260deg) saturate(2) brightness(0.6)" }}
            />
          </div>
        </div>

        {/* Front ring */}
        <div className="absolute inset-0 hero-ring-cw">
          <div
            className="absolute top-1/2 left-1/2"
            style={{ width: 780, height: 780, transform: "translate(-50%,-50%) rotate(48deg)" }}
          >
            <img
              src="https://framerusercontent.com/images/Ans5PAxtJfg3CwxlrPMSshx2Pqc.png"
              alt=""
              className="w-full h-full object-cover"
              style={{ opacity: 0.55, filter: "hue-rotate(250deg) saturate(1.6) brightness(0.75)" }}
            />
          </div>
        </div>
      </div>

      {/* ── Gradient overlay (dark purple → transparent) ─────── */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "linear-gradient(to top, #09090b 0%, rgba(30,27,75,0.85) 35%, rgba(30,27,75,0.3) 65%, transparent 100%)",
        }}
      />

      {/* ── Purple glow blobs ─────────────────────────────────── */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)" }}
      />

      {/* ── Content ──────────────────────────────────────────── */}
      <motion.div
        className="relative z-20 w-full max-w-3xl mx-auto px-4 text-center flex flex-col items-center gap-5"
        initial="hidden"
        animate="visible"
        variants={container}
      >
        {/* Brand mark */}
        <motion.div variants={item}>
          <SiteLogo size="lg" className="shadow-2xl shadow-primary-900/60 mb-1" />
        </motion.div>

        {/* Badge */}
        <motion.div variants={item}>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm text-white/80 border border-white/15">
            <Zap className="h-3.5 w-3.5 text-warning shrink-0" />
            {badgeText}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={item}
          className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight"
        >
          {titleText}
          <br />
          <span className="mt-2 bg-gradient-to-l from-primary-300 via-primary-200 to-white bg-clip-text text-transparent">
            {titleHighlightText}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={item}
          className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed"
        >
          {subtitleText}
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={item}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md"
        >
          <motion.div
            whileHover={reduced ? {} : { scale: 1.04 }}
            whileTap={reduced  ? {} : { scale: 0.96 }}
            className="w-full sm:w-auto"
          >
            <Link
              href="/products"
              className="flex items-center justify-center gap-2 bg-white text-primary-700 font-bold px-8 py-3.5 rounded-full hover:bg-surface-sunken transition-all shadow-xl shadow-black/30 text-base w-full sm:w-auto"
            >
              {t("browseProducts")}
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </motion.div>

          <motion.div
            whileHover={reduced ? {} : { scale: 1.04 }}
            whileTap={reduced  ? {} : { scale: 0.96 }}
            className="w-full sm:w-auto"
          >
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm text-white font-semibold px-8 py-3.5 rounded-full border border-white/20 hover:bg-white/20 transition-all text-base w-full sm:w-auto"
            >
              {t("freeAccount")}
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={item}
          className="flex items-center justify-center gap-10 pt-2"
        >
          {statList.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : 0.75 + i * 0.1, duration: 0.4, ease: EASE }}
            >
              <p className="text-2xl font-black text-white">{stat.value}</p>
              <p className="text-xs text-white/50 mt-0.5">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
