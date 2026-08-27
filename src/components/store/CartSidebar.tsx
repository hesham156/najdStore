"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingBag, Trash2, Plus, Minus } from "lucide-react";
import { useCartStore, cartLineKey } from "@/store/cart";
import { CartFieldSummary } from "@/components/store/CartFieldSummary";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/context/CurrencyContext";
import { useUpsell } from "@/components/store/UpsellModal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { CartProgressBar } from "@/components/store/CartProgressBar";
import { useConversion } from "@/context/ConversionContext";
import { useLocale, useTranslations } from "next-intl";
import { pickText } from "@/lib/i18n-content";
import type { Locale } from "@/i18n/config";

export function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getTotalPrice, clearCart, addItem } = useCartStore();
  const { formatAmount } = useCurrency();
  const { showUpsell } = useUpsell();
  const router = useRouter();
  const total = getTotalPrice();
  const conversion = useConversion();
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;

  function CartProgressBarWrapper({ total }: { total: number }) {
    if (!conversion.cart_progress_enabled) return null;
    return (
      <CartProgressBar
        currentTotal={total}
        target={conversion.cart_progress_target}
        reward={conversion.cart_progress_reward}
        coupon={conversion.cart_progress_coupon}
      />
    );
  }

  const handleCheckout = () => {
    closeCart();
    // Navigate to checkout immediately — the upsell renders as a full-screen overlay on top
    router.push("/checkout");
    // Show CHECKOUT upsell (overlay will appear on the checkout page)
    const cartProductIds = items.map((i) => i.id);
    showUpsell({
      cartProductIds,
      trigger: "CHECKOUT",
      onAccept: (upsell) => {
        const upsellVariants = upsell.offerProduct.variants ?? [];
        const upsellPrice =
          upsellVariants.length > 0 ? upsellVariants[0].price : upsell.offerProduct.price;
        const upsellLabel = upsellVariants.length > 0 ? upsellVariants[0].label : undefined;
        addItem({
          id: upsell.offerProduct.id,
          name: upsell.offerProduct.nameAr,
          nameAr: upsell.offerProduct.nameAr,
          price: upsellPrice,
          image: upsell.offerProduct.image || undefined,
          quantity: 1,
          slug: upsell.offerProduct.slug,
          variantLabel: upsellLabel,
        });
        toast.success(t("addedCelebrate", { name: upsell.offerProduct.nameAr }));
      },
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeCart}
      />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 start-0 z-50 w-full max-w-md bg-surface shadow-2xl transition-transform duration-300 flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary-600" />
            <h2 className="font-bold text-fg text-lg">{t("cartTitle")}</h2>
            {items.length > 0 && (
              <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold px-2 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-danger hover:text-danger hover:underline"
              >
                {t("clearAll")}
              </button>
            )}
            <button
              onClick={closeCart}
              className="p-1.5 rounded-lg text-fg-subtle hover:bg-surface-sunken transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
              <div className="w-20 h-20 rounded-2xl bg-surface-sunken flex items-center justify-center">
                <ShoppingBag className="h-10 w-10 text-fg-subtle" />
              </div>
              <div>
                <p className="font-semibold text-fg-muted">{t("empty")}</p>
                <p className="text-sm text-fg-subtle mt-1">{t("emptyHint")}</p>
              </div>
              <Button onClick={closeCart} variant="outline" size="sm">
                <Link href="/products">{t("browseProducts")}</Link>
              </Button>
            </div>
          ) : (
            items.map((item) => {
              const key = cartLineKey(item);
              return (
              <div
                key={key}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-sunken border border-line"
              >
                {/* Image */}
                <div className="w-16 h-16 rounded-xl bg-surface border border-line overflow-hidden flex items-center justify-center shrink-0">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={pickText(locale, item.name, item.nameAr)}
                      width={64}
                      height={64}
                      className="object-contain p-1"
                      unoptimized
                    />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-fg text-sm truncate">
                    {pickText(locale, item.name, item.nameAr)}
                  </p>
                  {item.variantLabel && (
                    <p className="text-xs text-fg-muted leading-snug break-words line-clamp-2">{item.variantLabel}</p>
                  )}
                  <CartFieldSummary fields={item.customFields} className="line-clamp-4" />
                  <p className="text-sm text-primary-600 dark:text-primary-400 font-bold mt-0.5">
                    {formatAmount(item.price)}
                  </p>

                  {/* Quantity */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => updateQuantity(key, item.quantity - 1)}
                      aria-label={t("decreaseQty")}
                      className="w-6 h-6 rounded-full bg-surface border border-line flex items-center justify-center hover:bg-surface-hover transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(key, item.quantity + 1)}
                      aria-label={t("increaseQty")}
                      className="w-6 h-6 rounded-full bg-surface border border-line flex items-center justify-center hover:bg-surface-hover transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeItem(key)}
                  aria-label={t("removeItemAria", { name: pickText(locale, item.name, item.nameAr) })}
                  className="p-1.5 text-fg-subtle hover:text-danger hover:bg-danger/10 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-line pt-3 space-y-3">
            <CartProgressBarWrapper total={total} />
            <div className="px-6 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-fg-muted font-medium">{t("total")}</span>
                <span className="text-xl font-bold text-fg">
                  {formatAmount(total)}
                </span>
              </div>
              <Button fullWidth size="lg" className="text-base" onClick={handleCheckout}>
                {t("checkout")}
              </Button>
              <Link href="/cart" onClick={closeCart}>
                <Button fullWidth variant="outline" size="md">
                  {t("viewCart")}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
