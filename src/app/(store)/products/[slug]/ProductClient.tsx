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

interface PublicSettings {
  tabby_enabled?: boolean;
  tabby_installments?: string;
  tamara_enabled?: boolean;
  tamara_installments?: string;
}

interface Props {
  product: ProductWithCategory & { variants?: ProductVariant[] };
  publicSettings: PublicSettings;
  /* Multi-option (matrix pricing) — when present, replaces the legacy tag-variant grid */
  options?: ProductOptionData[];
  optionVariants?: MatrixVariant[];
}

export default function ProductClient({ product, publicSettings, options = [], optionVariants = [] }: Props) {
  const { formatAmount } = useCurrency();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );

  const hasOptions = options.length > 0 && optionVariants.length > 0;
  // optionId → selected valueId
  const [selection, setSelection] = useState<Record<string, string>>({});

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
        });
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

  const activePrice = hasOptions
    ? (resolvedVariant ? resolvedVariant.price : minMatrixPrice || parseFloat(String(product.price)))
    : (selectedVariant ? selectedVariant.price : parseFloat(String(product.price)));

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
      toast.error("اختر كل الخيارات أولاً");
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: activePrice,
      image: product.image || undefined,
      quantity,
      slug: product.slug,
      variantLabel: hasOptions ? selectionLabel : selectedVariant?.label,
      variantId: hasOptions ? resolvedVariant?.id : undefined,
    });
    setAdded(true);
    const label = hasOptions
      ? (selectionLabel ? ` (${selectionLabel})` : "")
      : (selectedVariant ? ` (${selectedVariant.label})` : "");
    toast.success(`تم إضافة ${product.nameAr}${label} إلى السلة`);
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
        toast.success(`تم إضافة ${upsell.offerProduct.nameAr} إلى السلة 🎉`);
      },
    });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container-custom">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-fg-subtle mb-8">
          <Link href="/" className="hover:text-primary-600 dark:hover:text-primary-400">الرئيسية</Link>
          <ArrowRight className="h-4 w-4" />
          <Link href="/products" className="hover:text-primary-600 dark:hover:text-primary-400">المنتجات</Link>
          <ArrowRight className="h-4 w-4" />
          <Link href={`/categories/${product.category.slug}`} className="hover:text-primary-600 dark:hover:text-primary-400">{product.category.nameAr}</Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-fg font-medium">{product.nameAr}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl bg-surface-sunken border border-line overflow-hidden flex items-center justify-center">
              {product.image ? (
                <Image src={product.image} alt={product.nameAr} fill className="object-contain p-12" unoptimized />
              ) : (
                <span className="text-8xl">{product.category.icon || "📦"}</span>
              )}
              {discount > 0 && (
                <div className="absolute top-4 start-4">
                  <Badge variant="danger" className="text-base font-bold px-3 py-1">-{discount}% خصم</Badge>
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
                {product.category.nameAr}
              </Link>
              <h1 className="text-3xl font-black text-fg">{product.nameAr}</h1>

              {/* Delivery badge */}
              <div className="flex items-center gap-2 mt-3">
                <Badge variant={product.deliveryMethod === "AUTOMATIC" ? "success" : "warning"} dot>
                  {product.deliveryMethod === "AUTOMATIC" ? (
                    <><Zap className="h-3 w-3" />تسليم فوري تلقائي</>
                  ) : (
                    <><Clock className="h-3 w-3" />تسليم يدوي (1-24 ساعة)</>
                  )}
                </Badge>
                {product.isFeatured && (
                  <Badge variant="default" dot><Star className="h-3 w-3" />مميز</Badge>
                )}
              </div>
            </div>

            {/* Description — renders sanitized HTML (e.g. imported from Salla) or plain text */}
            {product.descriptionAr && (
              /<[a-z][\s\S]*>/i.test(product.descriptionAr) ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-fg-muted prose-headings:text-fg dark:prose-headings:text-white prose-strong:text-fg dark:prose-strong:text-white prose-a:text-primary-600"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.descriptionAr) }}
                />
              ) : (
                <p className="text-fg-muted leading-relaxed whitespace-pre-line">{product.descriptionAr}</p>
              )
            )}

            {/* Features */}
            {product.featuresAr && product.featuresAr.length > 0 && (
              <div className="bg-surface-sunken rounded-2xl p-5">
                <h3 className="font-bold text-fg mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary-600" />
                  ما يتضمنه المنتج
                </h3>
                <ul className="space-y-2">
                  {product.featuresAr.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-fg-muted">
                      <Check className="h-4 w-4 text-success shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(!product.featuresAr || product.featuresAr.length === 0) && product.features && product.features.length > 0 && (
              <div className="bg-surface-sunken rounded-2xl p-5">
                <h3 className="font-bold text-fg mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary-600" />
                  ما يتضمنه المنتج
                </h3>
                <ul className="space-y-2">
                  {product.features.map((feature) => (
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
                        <option value="" disabled>اختر</option>
                        {opt.values.map((val) => {
                          const available = isValueAvailable(opt.id, val.id);
                          return (
                            <option key={val.id} value={val.id} disabled={!available}>
                              {val.labelAr}{!available ? " — غير متاح" : ""}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
                    </div>
                  </div>
                ))}
                {selectionIncomplete && (
                  <p className="text-xs text-warning">اختر كل الخيارات لعرض السعر النهائي.</p>
                )}
              </div>
            )}

            {/* Variants selector (legacy tag-based) */}
            {hasVariants && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-fg-muted">اختر أحد الخيارات</p>
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
                  🔥 متبقي 3 فقط!
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-end gap-4">
              <div>
                {hasOptions && !resolvedVariant && (
                  <p className="text-xs text-fg-subtle mb-0.5">ابتداءً من</p>
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
                  وفر {formatAmount(activeComparePrice! - activePrice)}
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
                <span className="text-sm font-medium text-fg-muted">الكمية:</span>
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
                disabled={(hasVariants && !selectedVariant) || selectionIncomplete}
              >
                {added ? (
                  <><Check className="h-5 w-5" />تم الإضافة إلى السلة</>
                ) : (
                  <><ShoppingCart className="h-5 w-5" />
                    {selectionIncomplete
                      ? "اختر الخيارات أولاً"
                      : hasVariants && selectedVariant
                      ? `أضف (${selectedVariant.label}) إلى السلة`
                      : "أضف إلى السلة"
                    }
                  </>
                )}
              </Button>

              <Link href="/checkout">
                <Button fullWidth size="lg" variant="outline" className="text-base">
                  اشتر الآن
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: "🔒", label: "دفع آمن" },
                { icon: "✅", label: "منتجات أصلية" },
                { icon: "🎧", label: "دعم 24/7" },
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
          <h2 className="text-xl font-black text-fg mb-6">الأسئلة الشائعة</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-4xl">
            {[
              { q: "كيف أستلم طلبي بعد الدفع؟", a: "بعد تأكيد الدفع تصلك تفاصيل طلبك مباشرة في صفحة الطلب وعبر البريد الإلكتروني. التسليم التلقائي فوري، واليدوي خلال 1-24 ساعة." },
              { q: "هل يمكنني الاسترداد إذا واجهت مشكلة؟", a: "نعم، نضمن جودة جميع منتجاتنا. إذا واجهت أي مشكلة افتح تذكرة دعم فني وسنحلها أو نسترد مبلغك." },
              { q: "هل تفاصيل المنتج دقيقة؟", a: "نعم، جميع التفاصيل مذكورة في قسم المميزات أعلاه. للمزيد تواصل مع الدعم." },
              { q: "هل يمكنني الشراء مرة أخرى لاحقاً؟", a: "بالطبع، يمكنك شراء نفس المنتج مرة أخرى في أي وقت بنفس السعر أو باستخدام كوبون خصم." },
              { q: "ما طرق الدفع المتاحة؟", a: "نقبل التحويل البنكي، بطاقات الائتمان، والعملات المشفرة. جميع طرق الدفع آمنة ومشفرة." },
              { q: "كم يستغرق التوصيل؟", a: product.deliveryMethod === "AUTOMATIC" ? "التسليم فوري تلقائي — ستحصل على بياناتك مباشرة بعد تأكيد الدفع." : "التسليم يدوي ويستغرق من 1 إلى 24 ساعة بعد تأكيد الدفع." },
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
              <h2 className="text-xl font-black text-fg">منتجات من نفس الفئة</h2>
              <Link href={`/categories/${product.category.slug}`} className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-medium">
                عرض الكل <ArrowRight className="h-4 w-4" />
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
                          ? <Image src={rp.image} alt={rp.nameAr} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-300" unoptimized />
                          : <span className="text-4xl">{rp.category?.icon || "📦"}</span>}
                        {rpDiscount > 0 && (
                          <span className="absolute top-2 start-2 bg-danger text-white text-xs font-bold px-2 py-0.5 rounded-lg">-{rpDiscount}%</span>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mb-1">{rp.category?.nameAr}</p>
                        <h3 className="font-bold text-fg text-sm line-clamp-1 group-hover:text-primary-600 transition-colors">{rp.nameAr}</h3>
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <p className="font-black text-fg">{formatAmount(rpPrice)}</p>
                            {rpCompare && <p className="text-xs text-fg-subtle line-through">{formatAmount(rpCompare)}</p>}
                          </div>
                          <span className="text-xs bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-lg font-medium">أضف للسلة</span>
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
            productName={product.nameAr}
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
