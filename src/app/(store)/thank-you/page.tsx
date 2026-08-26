"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2, Package, Mail, Clock, ArrowRight,
  ShoppingBag, Headphones, Star, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import confetti from "canvas-confetti";
import { useTranslations } from "next-intl";

/* ─── Confetti helper ─── */
function fireConfetti() {
  const count = 180;
  const defaults = { origin: { y: 0.6 }, zIndex: 9999 };
  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
  }
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2,  { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1,  { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1,  { spread: 120, startVelocity: 45 });
}

/* ─── Floating particle ─── */
function Particle({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full opacity-0 pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: "10%",
        background: `hsl(${Math.random() * 60 + 250}, 80%, 65%)`,
      }}
      animate={{
        y: [0, -300, -600],
        x: [0, (Math.random() - 0.5) * 80],
        opacity: [0, 0.8, 0],
        rotate: [0, 360],
        scale: [1, 1.3, 0.5],
      }}
      transition={{
        duration: 2.5,
        delay,
        ease: "easeOut",
        repeat: Infinity,
        repeatDelay: Math.random() * 3 + 2,
      }}
    />
  );
}

/* ─── Steps timeline (icons/colors here; copy comes from translations) ─── */
const STEP_META = [
  { icon: Mail,         color: "bg-info/10 text-info",       key: "step1", done: true },
  { icon: Package,      color: "bg-warning/10 text-warning", key: "step2", done: false },
  { icon: CheckCircle2, color: "bg-success/10 text-success", key: "step3", done: false },
];

/* ─── Copy button ─── */
function CopyButton({ text }: { text: string }) {
  const t = useTranslations("thankYou");
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? t("copied") : t("copy")}
    </button>
  );
}

export default function ThankYouPage() {
  const t = useTranslations("thankYou");
  const params = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const steps = STEP_META.map((m) => ({
    icon: m.icon,
    color: m.color,
    done: m.done,
    label: t(`${m.key}Label`),
    desc: t(`${m.key}Desc`),
  }));
  const orderId  = params.get("order") ?? "";
  const orderNum = params.get("num")   ?? "";
  const firedRef = useRef(false);

  /* Fire confetti once on mount */
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const t = setTimeout(fireConfetti, 400);
    return () => clearTimeout(t);
  }, []);

  /* If no order in URL, redirect home */
  useEffect(() => {
    if (!orderId && !orderNum) router.replace("/");
  }, [orderId, orderNum, router]);

  /* Floating particles */
  const particles = Array.from({ length: 12 }, (_, i) => ({
    delay: i * 0.3,
    x: Math.random() * 90 + 5,
    size: Math.random() * 8 + 4,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950/20 flex items-center justify-center py-16 px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Success checkmark */}
        <div className="flex justify-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="relative"
          >
            {/* Outer ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="absolute inset-0 scale-150 animate-pulse rounded-full bg-success/20"
            />
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-success-solid shadow-2xl shadow-success/30">
              <motion.div
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <CheckCircle2 className="h-14 w-14 text-white" strokeWidth={1.8} />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Card body */}
        <div className="bg-surface rounded-3xl shadow-2xl shadow-gray-200/60 dark:shadow-gray-900/60 overflow-hidden border border-line">

          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-line">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex justify-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                  >
                    <Star className="h-4 w-4 fill-warning text-warning" />
                  </motion.div>
                ))}
              </div>
              <h1 className="text-2xl font-black text-fg mb-1">
                {t("title")}
              </h1>
              <p className="text-fg-subtle text-sm leading-relaxed">
                {t("subtitle")}
              </p>
            </motion.div>
          </div>

          {/* Order number */}
          {orderNum && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mx-6 my-5 flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800"
            >
              <div>
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{t("orderNumber")}</p>
                <p className="font-black text-primary-800 dark:text-primary-200 text-lg tracking-wide font-mono">
                  #{orderNum}
                </p>
              </div>
              <CopyButton text={orderNum} />
            </motion.div>
          )}

          {/* Steps timeline */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="px-6 pb-6 space-y-3"
          >
            <p className="text-xs font-bold text-fg-subtle uppercase tracking-wider mb-4">
              {t("whatNow")}
            </p>
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.75 + i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${step.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-fg">{step.label}</p>
                      {step.done && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-success/10 text-success">
                          {t("doneBadge")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-fg-subtle mt-0.5">{step.desc}</p>
                  </div>
                  {/* Connector */}
                  {i < steps.length - 1 && (
                    <div className="absolute translate-x-[17px] translate-y-9 w-px h-6 bg-surface-sunken" />
                  )}
                </motion.div>
              );
            })}
          </motion.div>

          {/* Info row */}
          <div className="mx-6 mb-6 flex items-center gap-2 rounded-control border border-warning/25 bg-warning/10 p-3">
            <Clock className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs text-warning leading-relaxed">
              {t.rich("deliveryInfo", { b: (chunks) => <span className="font-bold">{chunks}</span> })}
            </p>
          </div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="px-6 pb-8 space-y-3"
          >
            {session && orderId ? (
              <Link href={`/dashboard/orders/${orderId}`}>
                <Button fullWidth size="lg" className="gap-2">
                  <Package className="h-4 w-4" />
                  {t("trackOrder")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/dashboard/orders">
                <Button fullWidth size="lg" className="gap-2">
                  <Package className="h-4 w-4" />
                  {t("viewOrders")}
                </Button>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Link href="/products">
                <Button fullWidth variant="outline" size="md" className="gap-1.5">
                  <ShoppingBag className="h-4 w-4" />
                  {t("shopMore")}
                </Button>
              </Link>
              <Link href="/dashboard/tickets">
                <Button fullWidth variant="outline" size="md" className="gap-1.5">
                  <Headphones className="h-4 w-4" />
                  {t("support")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="text-center text-xs text-fg-subtle mt-5"
        >
          {t("hadProblem")}{" "}
          <Link href="/contact" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
            {t("contactUs")}
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
