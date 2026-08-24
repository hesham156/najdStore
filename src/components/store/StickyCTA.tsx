"use client";

import { useEffect, useState, RefObject } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

interface Props {
  productName: string;
  price: number;
  variantLabel?: string;
  onAddToCart: () => void;
  anchorRef: RefObject<HTMLElement | null>;
}

export function StickyCTA({ productName, price, variantLabel, onAddToCart, anchorRef }: Props) {
  const { formatAmount } = useCurrency();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [anchorRef]);

  return (
    <div
      className={cn(
        "fixed bottom-0 inset-x-0 z-[9980] bg-surface border-t border-line shadow-2xl px-4 py-3 flex items-center gap-3 transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-fg truncate">{productName}</p>
        {variantLabel && (
          <p className="text-xs text-fg-subtle">{variantLabel}</p>
        )}
      </div>
      <p className="text-base font-black text-primary-600 dark:text-primary-400 shrink-0">
        {formatAmount(price)}
      </p>
      <Button onClick={onAddToCart} size="md" className="shrink-0 gap-1.5">
        <ShoppingCart className="h-4 w-4" />
        أضف للسلة
      </Button>
    </div>
  );
}
