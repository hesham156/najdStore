"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/context/CurrencyContext";
import { useLocale, useTranslations } from "next-intl";
import { pickText } from "@/lib/i18n-content";
import type { Locale } from "@/i18n/config";

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const { formatAmount } = useCurrency();
  const t = useTranslations("cart");
  const tp = useTranslations("cartPage");
  const locale = useLocale() as Locale;
  const total = getTotalPrice();

  if (items.length === 0) {
    return (
      <div className="min-h-screen py-20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 rounded-3xl bg-surface-sunken flex items-center justify-center mx-auto">
            <ShoppingBag className="h-12 w-12 text-fg-subtle" />
          </div>
          <h1 className="text-2xl font-bold text-fg">{t("empty")}</h1>
          <p className="text-fg-muted">{tp("notAddedYet")}</p>
          <Link href="/products">
            <Button>
              <ArrowLeft className="h-4 w-4" />
              {t("browseProducts")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-fg">{t("cartTitle")}</h1>
          <button
            onClick={() => { if (window.confirm(tp("clearConfirm"))) clearCart(); }}
            className="text-sm text-danger hover:text-danger hover:underline"
          >
            {t("clearAll")}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              // The cart keys a line by product AND variant, so the React key
              // and every mutation below must carry the variant too — passing
              // the id alone silently targeted a different line, or none.
              <div
                key={`${item.id}-${item.variantLabel || ""}`}
                className="flex items-center gap-4 p-4 bg-surface rounded-2xl border border-line"
              >
                <div className="w-20 h-20 rounded-xl bg-surface-sunken border border-line overflow-hidden flex items-center justify-center shrink-0">
                  {item.image ? (
                    <Image src={item.image} alt={pickText(locale, item.name, item.nameAr)} width={80} height={80} className="object-contain p-2" unoptimized />
                  ) : (
                    <span className="text-3xl">📦</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.slug}`}>
                    <h3 className="font-bold text-fg hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                      {pickText(locale, item.name, item.nameAr)}
                    </h3>
                  </Link>
                  {item.variantLabel && (
                    <p className="text-xs text-fg-muted mt-0.5 truncate">{item.variantLabel}</p>
                  )}
                  <p className="text-primary-600 dark:text-primary-400 font-bold text-lg mt-1">
                    {formatAmount(item.price * item.quantity)}
                  </p>
                  <p className="text-xs text-fg-muted">{formatAmount(item.price)} × {item.quantity}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-surface-sunken rounded-xl p-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantLabel)}
                      disabled={item.quantity <= 1}
                      aria-label={t("decreaseQty")}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface shadow-sm transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantLabel)}
                      aria-label={t("increaseQty")}
                      className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center hover:bg-surface-sunken transition-colors shadow-sm"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id, item.variantLabel)}
                    aria-label={t("removeItemAria", { name: pickText(locale, item.name, item.nameAr) })}
                    className="p-2 text-fg-subtle hover:text-danger hover:bg-danger/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-2xl border border-line p-6 sticky top-20">
              <h2 className="font-bold text-fg text-lg mb-4">{tp("orderSummary")}</h2>

              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={`${item.id}-${item.variantLabel || ""}`} className="flex justify-between text-sm">
                    <span className="text-fg-muted truncate pe-2">
                      {pickText(locale, item.name, item.nameAr)}{item.variantLabel ? ` — ${item.variantLabel}` : ""} × {item.quantity}
                    </span>
                    <span className="font-medium text-fg shrink-0">
                      {formatAmount(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-line pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-fg text-lg">{t("total")}</span>
                  <span className="font-black text-primary-600 dark:text-primary-400 text-2xl">
                    {formatAmount(total)}
                  </span>
                </div>
              </div>

              <Link href="/checkout">
                <Button fullWidth size="lg">
                  {t("checkout")}
                </Button>
              </Link>
              <Link href="/products">
                <Button fullWidth variant="ghost" size="md" className="mt-2">
                  {t("continueShopping")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
