"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useRef,
} from "react";
import Image from "next/image";
import { X, Zap, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/context/CurrencyContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UpsellProduct {
  id: string;
  headlineAr: string;
  descriptionAr: string | null;
  discountType: string | null;
  discountValue: number | null;
  offerProduct: {
    id: string;
    nameAr: string;
    price: number;
    comparePrice: number | null;
    image: string | null;
    slug: string;
    variants?: { label: string; price: number }[];
  };
}

export interface UpsellModalProps {
  cartProductIds: string[];
  trigger: "ADD_TO_CART" | "CHECKOUT";
  onAccept: (product: UpsellProduct) => void;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Price helpers
// ---------------------------------------------------------------------------

function computeUpsellPrice(product: UpsellProduct): {
  finalPrice: number;
  originalPrice: number;
  hasDiscount: boolean;
} {
  const base = product.offerProduct.price;
  const compare = product.offerProduct.comparePrice;

  let finalPrice = base;

  if (product.discountType && product.discountValue) {
    if (product.discountType === "PERCENTAGE") {
      finalPrice = base * (1 - product.discountValue / 100);
    } else if (product.discountType === "FIXED") {
      finalPrice = Math.max(0, base - product.discountValue);
    }
  }

  const originalPrice = compare ?? base;
  const hasDiscount = finalPrice < originalPrice;

  return { finalPrice, originalPrice, hasDiscount };
}

// ---------------------------------------------------------------------------
// UpsellModal component
// ---------------------------------------------------------------------------

export function UpsellModal({
  cartProductIds,
  trigger,
  onAccept,
  onDismiss,
}: UpsellModalProps) {
  const { formatAmount } = useCurrency();
  const [upsell, setUpsell] = useState<UpsellProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<number>(0);

  // Fetch upsells on mount
  useEffect(() => {
    if (!cartProductIds.length) {
      setLoading(false);
      return;
    }

    const ids = cartProductIds.join(",");
    fetch(`/api/upsells?productIds=${ids}&trigger=${trigger}`)
      .then((r) => r.json())
      .then((data: { success: boolean; data: UpsellProduct[] }) => {
        if (data.success && data.data?.length) {
          setUpsell(data.data[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cartProductIds, trigger]);

  const handleAccept = async () => {
    if (!upsell) return;
    setAccepting(true);
    try {
      await onAccept(upsell);
    } finally {
      setAccepting(false);
    }
  };

  // Don't render if loading or no upsell available
  if (loading || !upsell) return null;

  const { finalPrice, originalPrice, hasDiscount } = computeUpsellPrice(upsell);
  const product = upsell.offerProduct;
  const variants = product.variants ?? [];

  const effectivePrice =
    variants.length > 0
      ? variants[selectedVariant]?.price ?? finalPrice
      : finalPrice;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="عرض خاص"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onDismiss}
        />

        {/* Sheet / modal */}
        <motion.div
          className="relative z-10 w-full sm:max-w-md bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-surface-sunken" />
          </div>

          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-3 end-3 z-10 p-1.5 rounded-full bg-surface-sunken hover:bg-surface-hover transition-colors"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4 text-fg-subtle" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-line">
            <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="font-bold text-fg text-sm leading-tight">
                {upsell.headlineAr || "💡 قد يعجبك أيضاً"}
              </p>
              {upsell.descriptionAr && (
                <p className="text-xs text-fg-subtle mt-0.5 line-clamp-1">
                  {upsell.descriptionAr}
                </p>
              )}
            </div>
          </div>

          {/* Product */}
          <div className="p-5 space-y-4">
            <div className="flex gap-4">
              {/* Image */}
              <div className="w-24 h-24 rounded-xl bg-surface-sunken border border-line overflow-hidden shrink-0 relative">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.nameAr}
                    fill
                    className="object-contain p-2"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl">📦</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-fg leading-snug line-clamp-2">
                  {product.nameAr}
                </h3>

                {/* Price */}
                <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                    {formatAmount(effectivePrice)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-fg-subtle line-through">
                      {formatAmount(originalPrice)}
                    </span>
                  )}
                </div>

                {/* Discount badge */}
                {hasDiscount && upsell.discountType && upsell.discountValue && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-danger/10 text-danger text-xs font-bold">
                    {upsell.discountType === "PERCENTAGE"
                      ? `وفّر ${upsell.discountValue}%`
                      : `خصم ${formatAmount(upsell.discountValue)}`}
                  </span>
                )}
              </div>
            </div>

            {/* Variant selector */}
            {variants.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-fg-muted">اختر الخيار:</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedVariant(i)}
                      className={[
                        "px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-colors",
                        selectedVariant === i
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                          : "border-line text-fg-muted hover:border-primary-300",
                      ].join(" ")}
                    >
                      {v.label}
                      <span className="ms-1 text-xs opacity-70">
                        ({formatAmount(v.price)})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={handleAccept}
                loading={accepting}
                fullWidth
                size="lg"
                className="gap-2"
              >
                <ShoppingCart className="h-5 w-5" />
                أضف للسلة
              </Button>
              <button
                onClick={onDismiss}
                className="text-sm text-fg-subtle hover:text-fg-muted transition-colors py-1 font-medium"
              >
                لا شكراً، تخطّ هذا العرض
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// useUpsell hook / context
// ---------------------------------------------------------------------------

interface UpsellContextValue {
  showUpsell: (opts: {
    cartProductIds: string[];
    trigger: "ADD_TO_CART" | "CHECKOUT";
    onAccept: (product: UpsellProduct) => void;
  }) => void;
  dismissUpsell: () => void;
  isVisible: boolean;
}

const UpsellContext = createContext<UpsellContextValue>({
  showUpsell: () => {},
  dismissUpsell: () => {},
  isVisible: false,
});

interface UpsellState {
  cartProductIds: string[];
  trigger: "ADD_TO_CART" | "CHECKOUT";
  onAccept: (product: UpsellProduct) => void;
}

export function UpsellProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UpsellState | null>(null);

  const showUpsell = useCallback(
    (opts: {
      cartProductIds: string[];
      trigger: "ADD_TO_CART" | "CHECKOUT";
      onAccept: (product: UpsellProduct) => void;
    }) => {
      setState(opts);
    },
    []
  );

  const dismissUpsell = useCallback(() => {
    setState(null);
  }, []);

  return (
    <UpsellContext.Provider
      value={{ showUpsell, dismissUpsell, isVisible: !!state }}
    >
      {children}
      {state && (
        <UpsellModal
          cartProductIds={state.cartProductIds}
          trigger={state.trigger}
          onAccept={async (product) => {
            await state.onAccept(product);
            dismissUpsell();
          }}
          onDismiss={dismissUpsell}
        />
      )}
    </UpsellContext.Provider>
  );
}

export function useUpsell(): UpsellContextValue {
  return useContext(UpsellContext);
}
