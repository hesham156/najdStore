"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Check, Zap, Clock, ArrowRight, Star, Package, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PaymentBadges } from "@/components/store/PaymentBadges";
import { useCartStore } from "@/store/cart";
import { parseProductVariants } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import { useUpsell } from "@/components/store/UpsellModal";
import { useConversion } from "@/context/ConversionContext";
import { FlashSaleTimer } from "@/components/store/FlashSaleTimer";
import { LiveViewers } from "@/components/store/LiveViewers";
import { StickyCTA } from "@/components/store/StickyCTA";
import toast from "react-hot-toast";
import DOMPurify from "isomorphic-dompurify";
import type { ProductWithCategory, ProductVariant, ProductOptionData, MatrixVariant } from "@/types";
import { ProductCustomFields, type CustomFieldsState } from "@/components/store/ProductCustomFields";
import type { ProductFieldData } from "@/lib/product-fields";
import { useLocale, useTranslations } from "next-intl";
import { pickText, pickList } from "@/lib/i18n-content";
import type { Locale } from "@/i18n/config";

interface PublicSettings {
  tabby_enabled?: boolean;
  tabby_installments?: string;
  tamara_enabled?: boolean;
  tamara_installments?: string;
}

interface BundleProduct {
  id: string;
  nameAr: string;
  slug: string;
  price: number;
  image: string | null;
  icon: string | null;
}

interface Props {
  product: ProductWithCategory & { variants?: ProductVariant[] };
  publicSettings: PublicSettings;
  /* Multi-option (matrix pricing) — when present, replaces the legacy tag-variant grid */
  options?: ProductOptionData[];
  optionVariants?: MatrixVariant[];
  /* Salla-style custom fields (parallel to the matrix system) */
  customFields?: ProductFieldData[];
  /* "كمّل طلبك" — complementary products chosen by the merchant */
  bundleProducts?: BundleProduct[];
  /* Optional discount applied when buying the bundle together */
  bundleDiscount?: { type: "PERCENTAGE" | "FIXED"; value: number } | null;
}

export default function ProductClient({ product, publicSettings, options = [], optionVariants = [], customFields = [], bundleProducts = [], bundleDiscount = null }: Props) {
  const { formatAmount } = useCurrency();
  const t = useTranslations("productPage");
  const tn = useTranslations("nav");
  const tp = useTranslations("product");
  const th = useTranslations("home");
  const tcart = useTranslations("cart");
  const locale = useLocale() as Locale;
  const displayName = pickText(locale, product.name, product.nameAr);
  const displayCategory = pickText(locale, product.category.name, product.category.nameAr);
  const displayDescription = pickText(locale, product.description, product.descriptionAr);
  const displayFeatures = pickList(locale, product.features, product.featuresAr);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );

  const hasOptions = options.length > 0 && optionVariants.length > 0;
  // optionId → selected valueId
  const [selection, setSelection] = useState<Record<string, string>>({});

  // Salla-style custom fields: the child component reports its derived state.
  const hasCustomFields = customFields.length > 0;
  const [cf, setCf] = useState<CustomFieldsState | null>(null);
  const customFieldsIncomplete = hasCustomFields && (!cf || !cf.valid);

  const activeMatrixVariants = useMemo(
    () => optionVariants.filter((v) => v.isActive),
    [optionVariants],
  );

  // The fully-resolved variant for the current selection (all options chosen)
  const resolvedVariant = useMemo<MatrixVariant | null>(() => {
    if (!hasOptions) return null;
    if (options.some((o) => o.required && !selection[o.id])) return null;
    const chosen = options.map((o) => selection[o.id]).filter(Boolean).sort();
    if (chosen.length === 0) return null;
    return (
      activeMatrixVariants.find((v) => {
        const ids = [...v.optionValueIds].sort();
        return ids.length === chosen.length && ids.every((id, i) => id === chosen[i]);
      }) || null
    );
  }, [hasOptions, options, selection, activeMatrixVariants]);

  // A value is selectable if some active variant contains it AND is consistent
  // with the values already chosen in the OTHER options (Salla-style dependency).
  const isValueAvailable = (optionId: string, valueId: string): boolean => {
    const others = Object.entries(selection).filter(([oid]) => oid !== optionId).map(([, vid]) => vid);
    return activeMatrixVariants.some(
      (v) => v.optionValueIds.includes(valueId) && others.every((vid) => v.optionValueIds.includes(vid)),
    );
  };

  const minMatrixPrice = useMemo(
    () => (activeMatrixVariants.length ? Math.min(...activeMatrixVariants.map((v) => v.price)) : 0),
    [activeMatrixVariants],
  );
  const [related, setRelated] = useState<ProductWithCategory[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  // "كمّل طلبك" — all complementary products start checked, like the reference.
  const [bundleSelected, setBundleSelected] = useState<Set<string>>(
    () => new Set(bundleProducts.map((p) => p.id)),
  );
  const { addItem } = useCartStore();
  const { showUpsell } = useUpsell();
  const conversion = useConversion();
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (product.category?.slug) {
      fetch(`/api/products?category=${product.category.slug}&limit=5`)
        .then((r) => r.json())
        .then((rel) => {
          if (rel.success) {
            const others = (rel.data as ProductWithCategory[])
              .filter((x) => x.slug !== product.slug)
              .slice(0, 4);
            others.forEach((x) => { x.variants = parseProductVariants((x as any).tags || []); });
            setRelated(others);
          }
        })
        // Related products are a bonus strip — a failed fetch must stay silent
        // rather than surfacing as an unhandled rejection in the console.
        .catch(() => {});
    }
  }, [product.slug, product.category?.slug]);

  // Label for the current combination, e.g. "الكمية: 100 حبة · التصميم: بتصميمكم"
  const selectionLabel = useMemo(() => {
    if (!hasOptions) return undefined;
    return options
      .map((o) => {
        const val = o.values.find((v) => v.id === selection[o.id]);
        return val ? `${o.nameAr}: ${val.labelAr}` : null;
      })
      .filter(Boolean)
      .join(" · ") || undefined;
  }, [hasOptions, options, selection]);

  const basePrice = hasOptions
    ? (resolvedVariant ? resolvedVariant.price : minMatrixPrice || parseFloat(String(product.price)))
    : (selectedVariant ? selectedVariant.price : parseFloat(String(product.price)));
  // Custom-field selections add to the price on top of the base/variant price.
  const activePrice = basePrice + (cf?.priceAdd || 0);

  const activeComparePrice = hasOptions
    ? (resolvedVariant?.comparePrice ?? null)
    : (selectedVariant?.comparePrice ?? (product.comparePrice ? parseFloat(String(product.comparePrice)) : null));

  const discount = activeComparePrice
    ? Math.round(((activeComparePrice - activePrice) / activeComparePrice) * 100)
    : 0;

  const variants = product.variants || [];
  const hasVariants = !hasOptions && variants.length > 0;
  // block add-to-cart until every required option resolves to an active variant
  const selectionIncomplete = hasOptions && !resolvedVariant;

  const handleAddToCart = () => {
    if (selectionIncomplete) {
      toast.error(t("selectAllOptions"));
      return;
    }
    if (customFieldsIncomplete) {
      toast.error("يرجى تعبئة الحقول المطلوبة");
      return;
    }
    // The cart line label combines the variant/option label with the custom
    // fields summary so different custom orders stay distinct lines.
    const baseLabel = hasOptions ? selectionLabel : selectedVariant?.label;
    const combinedLabel = [baseLabel, cf?.summary].filter(Boolean).join(" · ") || undefined;
    addItem({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: activePrice,
      image: product.image || undefined,
      quantity,
      slug: product.slug,
      variantLabel: combinedLabel,
      variantId: hasOptions ? resolvedVariant?.id : undefined,
      customFields: cf?.items && cf.items.length > 0 ? cf.items : undefined,
    });
    setAdded(true);
    const label = hasOptions
      ? (selectionLabel ? ` (${selectionLabel})` : "")
      : (selectedVariant ? ` (${selectedVariant.label})` : "");
    toast.success(t("addedToast", { name: `${displayName}${label}` }));
    setTimeout(() => setAdded(false), 3000);

    // Trigger upsell modal after adding to cart
    showUpsell({
      cartProductIds: [product.id],
      trigger: "ADD_TO_CART",
      onAccept: (upsell) => {
        const upsellVariants = upsell.offerProduct.variants ?? [];
        const upsellPrice =
          upsellVariants.length > 0
            ? upsellVariants[0].price
            : upsell.offerProduct.price;
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
        toast.success(tcart("addedCelebrate", { name: upsell.offerProduct.nameAr }));
      },
    });
  };

  const toggleBundle = (id: string) =>
    setBundleSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const bundleTotal = useMemo(
    () => bundleProducts.filter((p) => bundleSelected.has(p.id)).reduce((sum, p) => sum + p.price, 0),
    [bundleProducts, bundleSelected],
  );

  // Discount on the selected complementary products, clamped to the total.
  const bundleDiscountAmount = useMemo(() => {
    if (!bundleDiscount || bundleTotal <= 0) return 0;
    const raw = bundleDiscount.type === "PERCENTAGE"
      ? bundleTotal * (Math.min(bundleDiscount.value, 100) / 100)
      : bundleDiscount.value;
    return Math.min(Math.round(raw * 100) / 100, bundleTotal);
  }, [bundleDiscount, bundleTotal]);

  const bundleFinal = Math.max(0, Math.round((bundleTotal - bundleDiscountAmount) * 100) / 100);

  const handleAddBundle = () => {
    const chosen = bundleProducts.filter((p) => bundleSelected.has(p.id));
    if (chosen.length === 0) {
      toast.error(t("selectOneProduct"));
      return;
    }
    // Spread the discount across the chosen items so the cart subtotal (a plain
    // sum of item prices) reflects the discounted bundle price through checkout.
    const factor = bundleTotal > 0 ? bundleFinal / bundleTotal : 1;
    chosen.forEach((p) => {
      const price = bundleDiscountAmount > 0
        ? Math.round(p.price * factor * 100) / 100
        : p.price;
      addItem({
        id: p.id,
        name: p.nameAr,
        nameAr: p.nameAr,
        price,
        image: p.image || undefined,
        quantity: 1,
        slug: p.slug,
        variantLabel: bundleDiscountAmount > 0 ? t("bundleLabel") : undefined,
      });
    });
    toast.success(t("bundleAdded", { count: chosen.length }));
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-fg-subtle mb-8">
          <Link href="/" className="hover:text-primary-600 dark:hover:text-primary-400">{tn("home")}</Link>
          <ArrowRight className="h-4 w-4" />
          <Link href="/products" className="hover:text-primary-600 dark:hover:text-primary-400">{tn("products")}</Link>
          <ArrowRight className="h-4 w-4" />
          <Link href={`/categories/${product.category.slug}`} className="hover:text-primary-600 dark:hover:text-primary-400">{displayCategory}</Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-fg font-medium">{displayName}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image — sticks below the navbar so it stays in view while the
              long info column scrolls past it. */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="relative aspect-square rounded-2xl bg-surface-sunken border border-line overflow-hidden flex items-center justify-center">
              {product.image ? (
                <Image src={product.image} alt={displayName} fill className="object-contain p-12" unoptimized />
              ) : (
                <span className="text-8xl">{product.category.icon || "📦"}</span>
              )}
              {discount > 0 && (
                <div className="absolute top-4 start-4">
                  <Badge variant="danger" className="text-base font-bold px-3 py-1">-{discount}% {t("discountOff")}</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <Link
                href={`/categories/${product.category.slug}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline mb-2"
              >
                <span>{product.category.icon}</span>
                {displayCategory}
              </Link>
              <h1 className="text-3xl font-black text-fg">{displayName}</h1>

              {/* Delivery badge */}
              <div className="flex items-center gap-2 mt-3">
                <Badge variant={product.deliveryMethod === "AUTOMATIC" ? "success" : "warning"} dot>
                  {product.deliveryMethod === "AUTOMATIC" ? (
                    <><Zap className="h-3 w-3" />{t("deliveryAuto")}</>
                  ) : (
                    <><Clock className="h-3 w-3" />{t("deliveryManual")}</>
                  )}
                </Badge>
                {product.isFeatured && (
                  <Badge variant="default" dot><Star className="h-3 w-3" />{tp("featured")}</Badge>
                )}
              </div>
            </div>

            {/* Description — renders sanitized HTML (e.g. imported from Salla) or plain text */}
            {displayDescription && (
              /<[a-z][\s\S]*>/i.test(displayDescription) ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-fg-muted prose-headings:text-fg dark:prose-headings:text-white prose-strong:text-fg dark:prose-strong:text-white prose-a:text-primary-600"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayDescription) }}
                />
              ) : (
                <p className="text-fg-muted leading-relaxed whitespace-pre-line">{displayDescription}</p>
              )
            )}

            {/* Features */}
            {displayFeatures.length > 0 && (
              <div className="bg-surface-sunken rounded-2xl p-5">
                <h3 className="font-bold text-fg mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary-600" />
                  {t("whatIncluded")}
                </h3>
                <ul className="space-y-2">
                  {displayFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-fg-muted">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Option selectors (matrix pricing) */}
            {hasOptions && (
              <div className="space-y-4">
                {options.map((opt) => (
                  <div key={opt.id} className="space-y-1.5">
                    <label className="flex items-center gap-1 text-sm font-semibold text-fg-muted">
                      {opt.nameAr}
                      {opt.required && <span className="text-danger">*</span>}
                    </label>
                    <div className="relative">
                      <select
                        value={selection[opt.id] || ""}
                        onChange={(e) => setSelection((s) => ({ ...s, [opt.id]: e.target.value }))}
                        className={cn(
                          "w-full appearance-none rounded-xl border-2 bg-surface px-4 py-3 pe-10 text-sm font-medium text-fg transition-colors",
                          "focus:outline-none focus:border-primary-500",
                          selection[opt.id]
                            ? "border-primary-400 dark:border-primary-700"
                            : "border-line",
                        )}
                      >
                        <option value="" disabled>{t("selectPlaceholder")}</option>
                        {opt.values.map((val) => {
                          const available = isValueAvailable(opt.id, val.id);
                          return (
                            <option key={val.id} value={val.id} disabled={!available}>
                              {val.labelAr}{!available ? ` — ${t("notAvailable")}` : ""}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
                    </div>
                  </div>
                ))}
                {selectionIncomplete && (
                  <p className="text-xs text-warning">{t("selectAllForPrice")}</p>
                )}
              </div>
            )}

            {/* Salla-style custom fields (parallel system) */}
            {hasCustomFields && (
              <div className="space-y-4">
                <ProductCustomFields fields={customFields} onChange={setCf} />
              </div>
            )}

            {/* Variants selector (legacy tag-based) */}
            {hasVariants && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-fg-muted">{t("chooseOption")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {variants.map((v) => {
                    const isSelected = selectedVariant?.label === v.label;
                    const varDiscount = v.comparePrice
                      ? Math.round(((v.comparePrice - v.price) / v.comparePrice) * 100)
                      : 0;
                    return (
                      <button
                        key={v.label}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={cn(
                          "relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all duration-150",
                          isSelected
                            ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20 shadow-md shadow-primary-500/10"
                            : "border-line hover:border-primary-300 dark:hover:border-primary-700"
                        )}
                      >
                        {varDiscount > 0 && (
                          <span className="absolute -top-2 -start-2 bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            -{varDiscount}%
                          </span>
                        )}
                        <span className={cn(
                          "text-sm font-bold",
                          isSelected ? "text-primary-700 dark:text-primary-300" : "text-fg-muted"
                        )}>
                          {v.label}
                        </span>
                        <span className={cn(
                          "text-base font-black",
                          isSelected ? "text-primary-600 dark:text-primary-400" : "text-fg"
                        )}>
                          {formatAmount(v.price)}
                        </span>
                        {v.comparePrice && (
                          <span className="text-xs text-fg-subtle line-through">
                            {formatAmount(v.comparePrice)}
                          </span>
                        )}
                        {isSelected && (
                          <span className="absolute top-1.5 end-1.5 w-4 h-4 bg-primary-600 rounded-full flex items-center justify-center">
                            <Check className="h-2.5 w-2.5 text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conversion widgets */}
            {conversion.flash_sale_enabled && conversion.flash_sale_ends_at && (
              <FlashSaleTimer endsAt={conversion.flash_sale_ends_at} label={conversion.flash_sale_label} />
            )}
            {conversion.live_viewers_enabled && (
              <LiveViewers min={conversion.live_viewers_min} max={conversion.live_viewers_max} />
            )}
            {conversion.scarcity_enabled && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-surface-sunken rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-warning"
                    style={{ width: `${Math.min(100, (3 / conversion.scarcity_max) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-danger shrink-0">
                  {t("scarcity", { count: 3 })}
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-end gap-4">
              <div>
                {hasOptions && !resolvedVariant && (
                  <p className="text-xs text-fg-subtle mb-0.5">{t("startingFrom")}</p>
                )}
                <p className="text-4xl font-black text-fg transition-all duration-200">
                  {formatAmount(activePrice)}
                </p>
                {activeComparePrice && (
                  <p className="text-lg text-fg-subtle line-through">{formatAmount(activeComparePrice)}</p>
                )}
              </div>
              {discount > 0 && (
                <div className="mb-1 px-3 py-1 bg-danger/10 text-danger rounded-xl font-bold text-sm">
                  {t("save", { amount: formatAmount(activeComparePrice! - activePrice) })}
                </div>
              )}
            </div>

            {/* Payment Badges (Tabby / Tamara) */}
            <PaymentBadges
              price={activePrice}
              tabbyEnabled={!!publicSettings.tabby_enabled}
              tamaraEnabled={!!publicSettings.tamara_enabled}
              tabbyInstallments={publicSettings.tabby_installments ? parseInt(publicSettings.tabby_installments) : 4}
              tamaraInstallments={publicSettings.tamara_installments ? parseInt(publicSettings.tamara_installments) : 3}
            />

            {/* Quantity & Add to Cart */}
            <div className="space-y-3" ref={ctaRef}>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-fg-muted">{t("quantityLabel")}</span>
                <div className="flex items-center gap-2 bg-surface-sunken rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center font-bold text-fg-muted hover:bg-surface-sunken transition-colors shadow-sm"
                  >-</button>
                  <span className="w-8 text-center font-bold text-fg">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center font-bold text-fg-muted hover:bg-surface-sunken transition-colors shadow-sm"
                  >+</button>
                </div>
              </div>

              <Button
                onClick={handleAddToCart}
                fullWidth
                size="lg"
                className="text-base"
                variant={added ? "success" : "primary"}
                disabled={(hasVariants && !selectedVariant) || selectionIncomplete || customFieldsIncomplete}
              >
                {added ? (
                  <><Check className="h-5 w-5" />{t("addedToCart")}</>
                ) : (
                  <><ShoppingCart className="h-5 w-5" />
                    {selectionIncomplete || customFieldsIncomplete
                      ? t("chooseOptionsFirst")
                      : hasVariants && selectedVariant
                      ? t("addVariant", { label: selectedVariant.label })
                      : t("addToCart")
                    }
                  </>
                )}
              </Button>

              <Link href="/checkout">
                <Button fullWidth size="lg" variant="outline" className="text-base">
                  {t("buyNow")}
                </Button>
              </Link>
            </div>

            {/* كمّل طلبك — complementary products, right under the CTA */}
            {bundleProducts.length > 0 && (
              <div className="rounded-2xl border border-line bg-surface-sunken/40 p-4">
                <h2 className="text-base font-black text-fg">{t("completeOrder")}</h2>
                <p className="mb-3 text-xs text-fg-muted">{t("completeOrderDesc")}</p>

                <div className="divide-y divide-line">
                  {bundleProducts.map((bp) => {
                    const checked = bundleSelected.has(bp.id);
                    return (
                      <div key={bp.id} className="flex items-center gap-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleBundle(bp.id)}
                          aria-pressed={checked}
                          aria-label={checked ? t("removeItem", { name: bp.nameAr }) : t("addItem", { name: bp.nameAr })}
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                            checked
                              ? "border-primary-600 bg-primary-600 text-white"
                              : "border-line hover:border-primary-400",
                          )}
                        >
                          {checked && <Check className="h-4 w-4" />}
                        </button>

                        <Link href={`/products/${bp.slug}`} className="min-w-0 flex-1 group">
                          <span className="line-clamp-2 text-sm font-medium text-fg group-hover:text-primary-600 transition-colors">
                            {bp.nameAr}
                          </span>
                        </Link>

                        <span className="shrink-0 font-bold text-fg tnum">{formatAmount(bp.price)}</span>

                        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
                          {bp.image ? (
                            <Image src={bp.image} alt={bp.nameAr} width={44} height={44} className="h-full w-full object-contain p-1" unoptimized />
                          ) : (
                            <span className="text-2xl">{bp.icon || "📦"}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {bundleDiscountAmount > 0 && bundleSelected.size > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-success/10 px-3 py-2">
                    <span className="text-[13px] font-medium text-success">
                      {t("saveWhenTogether", { amount: formatAmount(bundleDiscountAmount) })}
                    </span>
                    <span className="text-[13px] text-fg-subtle line-through">{formatAmount(bundleTotal)}</span>
                  </div>
                )}

                <Button
                  onClick={handleAddBundle}
                  fullWidth
                  size="lg"
                  className="mt-3 text-base"
                  disabled={bundleSelected.size === 0}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {t("buyTogether", { amount: formatAmount(bundleFinal) })}
                </Button>
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: "🔒", label: t("trustSecure") },
                { icon: "✅", label: t("trustOriginal") },
                { icon: "🎧", label: t("trustSupport") },
              ].map((badge) => (
                <div key={badge.label} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-surface-sunken text-center">
                  <span className="text-xl">{badge.icon}</span>
                  <span className="text-xs font-medium text-fg-muted">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Guarantee */}
            {conversion.guarantee_enabled && conversion.guarantee_text && (
              <p className="text-xs text-center text-fg-subtle font-medium py-1">
                {conversion.guarantee_text}
              </p>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 border-t border-line pt-12">
          <h2 className="text-xl font-black text-fg mb-6">{t("faqTitle")}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[
              { q: t("faq.q1"), a: t("faq.a1") },
              { q: t("faq.q2"), a: t("faq.a2") },
              { q: t("faq.q3"), a: t("faq.a3") },
              { q: t("faq.q4"), a: t("faq.a4") },
              { q: t("faq.q5"), a: t("faq.a5") },
              { q: t("faq.q6"), a: product.deliveryMethod === "AUTOMATIC" ? t("faq.a6Auto") : t("faq.a6Manual") },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl border border-line overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-start bg-surface hover:bg-surface-sunken transition-colors"
                >
                  <span className="font-semibold text-sm text-fg">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-primary-500 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-fg-subtle shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 py-4 text-sm text-fg-muted bg-surface-sunken border-t border-line leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-16 border-t border-line pt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-fg">{t("relatedTitle")}</h2>
              <Link href={`/categories/${product.category.slug}`} className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium">
                {th("viewAll")} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((rp) => {
                const rpPrice = rp.variants && rp.variants.length > 0 ? rp.variants[0].price : parseFloat(String(rp.price));
                const rpCompare = rp.variants && rp.variants.length > 0 ? rp.variants[0].comparePrice : (rp.comparePrice ? parseFloat(String(rp.comparePrice)) : null);
                const rpDiscount = rpCompare ? Math.round(((rpCompare - rpPrice) / rpCompare) * 100) : 0;
                return (
                  <Link key={rp.id} href={`/products/${rp.slug}`} className="group">
                    <div className="rounded-2xl border border-line bg-surface overflow-hidden hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all">
                      <div className="relative aspect-video bg-surface-sunken flex items-center justify-center overflow-hidden">
                        {rp.image
                          ? <Image src={rp.image} alt={pickText(locale, rp.name, rp.nameAr)} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-300" unoptimized />
                          : <span className="text-4xl">{rp.category?.icon || "📦"}</span>}
                        {rpDiscount > 0 && (
                          <span className="absolute top-2 start-2 bg-danger text-white text-xs font-bold px-2 py-0.5 rounded-lg">-{rpDiscount}%</span>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mb-1">{rp.category ? pickText(locale, rp.category.name, rp.category.nameAr) : ""}</p>
                        <h3 className="font-bold text-fg text-sm line-clamp-1 group-hover:text-primary-600 transition-colors">{pickText(locale, rp.name, rp.nameAr)}</h3>
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <p className="font-black text-fg">{formatAmount(rpPrice)}</p>
                            {rpCompare && <p className="text-xs text-fg-subtle line-through">{formatAmount(rpCompare)}</p>}
                          </div>
                          <span className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-lg font-medium">{t("addToCartShort")}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Sticky CTA */}
        {conversion.sticky_cta_enabled && (
          <StickyCTA
            productName={displayName}
            price={activePrice}
            variantLabel={selectedVariant?.label}
            onAddToCart={handleAddToCart}
            anchorRef={ctaRef}
          />
        )}
      </div>
    </div>
  );
}
