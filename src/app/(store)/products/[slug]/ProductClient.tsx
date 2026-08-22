"use client";

import { useState, useEffect, useRef } from "react";
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
import type { ProductWithCategory, ProductVariant } from "@/types";

interface PublicSettings {
  tabby_enabled?: boolean;
  tabby_installments?: string;
  tamara_enabled?: boolean;
  tamara_installments?: string;
}

interface Props {
  product: ProductWithCategory & { variants?: ProductVariant[] };
  publicSettings: PublicSettings;
}

export default function ProductClient({ product, publicSettings }: Props) {
  const { formatAmount } = useCurrency();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
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

  const activePrice = selectedVariant
    ? selectedVariant.price
    : parseFloat(String(product.price));

  const activeComparePrice = selectedVariant?.comparePrice
    ?? (product.comparePrice ? parseFloat(String(product.comparePrice)) : null);

  const discount = activeComparePrice
    ? Math.round(((activeComparePrice - activePrice) / activeComparePrice) * 100)
    : 0;

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: activePrice,
      image: product.image || undefined,
      quantity,
      slug: product.slug,
      variantLabel: selectedVariant?.label,
    });
    setAdded(true);
    const label = selectedVariant ? ` (${selectedVariant.label})` : "";
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
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link href="/" className="hover:text-primary-600 dark:hover:text-primary-400">الرئيسية</Link>
          <ArrowRight className="h-4 w-4" />
          <Link href="/products" className="hover:text-primary-600 dark:hover:text-primary-400">المنتجات</Link>
          <ArrowRight className="h-4 w-4" />
          <Link href={`/categories/${product.category.slug}`} className="hover:text-primary-600 dark:hover:text-primary-400">{product.category.nameAr}</Link>
          <ArrowRight className="h-4 w-4" />
          <span className="text-gray-900 dark:text-white font-medium">{product.nameAr}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
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
              <h1 className="text-3xl font-black text-gray-900 dark:text-white">{product.nameAr}</h1>

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

            {/* Description */}
            {product.descriptionAr && (
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{product.descriptionAr}</p>
            )}

            {/* Features */}
            {product.featuresAr && product.featuresAr.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary-600" />
                  ما يتضمنه المنتج
                </h3>
                <ul className="space-y-2">
                  {product.featuresAr.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(!product.featuresAr || product.featuresAr.length === 0) && product.features && product.features.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary-600" />
                  ما يتضمنه المنتج
                </h3>
                <ul className="space-y-2">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Variants selector */}
            {hasVariants && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">اختر أحد الخيارات</p>
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
                            : "border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700"
                        )}
                      >
                        {varDiscount > 0 && (
                          <span className="absolute -top-2 -start-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            -{varDiscount}%
                          </span>
                        )}
                        <span className={cn(
                          "text-sm font-bold",
                          isSelected ? "text-primary-700 dark:text-primary-300" : "text-gray-700 dark:text-gray-300"
                        )}>
                          {v.label}
                        </span>
                        <span className={cn(
                          "text-base font-black",
                          isSelected ? "text-primary-600 dark:text-primary-400" : "text-gray-900 dark:text-white"
                        )}>
                          {formatAmount(v.price)}
                        </span>
                        {v.comparePrice && (
                          <span className="text-xs text-gray-400 line-through">
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
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
                    style={{ width: `${Math.min(100, (3 / conversion.scarcity_max) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-red-600 dark:text-red-400 shrink-0">
                  🔥 متبقي 3 فقط!
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-end gap-4">
              <div>
                <p className="text-4xl font-black text-gray-900 dark:text-white transition-all duration-200">
                  {formatAmount(activePrice)}
                </p>
                {activeComparePrice && (
                  <p className="text-lg text-gray-400 line-through">{formatAmount(activeComparePrice)}</p>
                )}
              </div>
              {discount > 0 && (
                <div className="mb-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm">
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
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">الكمية:</span>
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                  >-</button>
                  <span className="w-8 text-center font-bold text-gray-900 dark:text-white">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
                  >+</button>
                </div>
              </div>

              <Button
                onClick={handleAddToCart}
                fullWidth
                size="lg"
                className="text-base"
                variant={added ? "success" : "primary"}
                disabled={hasVariants && !selectedVariant}
              >
                {added ? (
                  <><Check className="h-5 w-5" />تم الإضافة إلى السلة</>
                ) : (
                  <><ShoppingCart className="h-5 w-5" />
                    {hasVariants && selectedVariant
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
                <div key={badge.label} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-center">
                  <span className="text-xl">{badge.icon}</span>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{badge.label}</span>
                </div>
              ))}
            </div>

            {/* Guarantee */}
            {conversion.guarantee_enabled && conversion.guarantee_text && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 font-medium py-1">
                {conversion.guarantee_text}
              </p>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 border-t border-gray-100 dark:border-gray-800 pt-12">
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">الأسئلة الشائعة</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-4xl">
            {[
              { q: "كيف أستلم طلبي بعد الدفع؟", a: "بعد تأكيد الدفع تصلك تفاصيل طلبك مباشرة في صفحة الطلب وعبر البريد الإلكتروني. التسليم التلقائي فوري، واليدوي خلال 1-24 ساعة." },
              { q: "هل يمكنني الاسترداد إذا واجهت مشكلة؟", a: "نعم، نضمن جودة جميع منتجاتنا. إذا واجهت أي مشكلة افتح تذكرة دعم فني وسنحلها أو نسترد مبلغك." },
              { q: "هل تفاصيل المنتج دقيقة؟", a: "نعم، جميع التفاصيل مذكورة في قسم المميزات أعلاه. للمزيد تواصل مع الدعم." },
              { q: "هل يمكنني الشراء مرة أخرى لاحقاً؟", a: "بالطبع، يمكنك شراء نفس المنتج مرة أخرى في أي وقت بنفس السعر أو باستخدام كوبون خصم." },
              { q: "ما طرق الدفع المتاحة؟", a: "نقبل التحويل البنكي، بطاقات الائتمان، والعملات المشفرة. جميع طرق الدفع آمنة ومشفرة." },
              { q: "كم يستغرق التوصيل؟", a: product.deliveryMethod === "AUTOMATIC" ? "التسليم فوري تلقائي — ستحصل على بياناتك مباشرة بعد تأكيد الدفع." : "التسليم يدوي ويستغرق من 1 إلى 24 ساعة بعد تأكيد الدفع." },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-start bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-4 w-4 text-primary-500 shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-16 border-t border-gray-100 dark:border-gray-800 pt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">منتجات من نفس الفئة</h2>
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
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700 transition-all">
                      <div className="relative aspect-video bg-gray-50 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                        {rp.image
                          ? <Image src={rp.image} alt={rp.nameAr} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-300" unoptimized />
                          : <span className="text-4xl">{rp.category?.icon || "📦"}</span>}
                        {rpDiscount > 0 && (
                          <span className="absolute top-2 start-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">-{rpDiscount}%</span>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mb-1">{rp.category?.nameAr}</p>
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-primary-600 transition-colors">{rp.nameAr}</h3>
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <p className="font-black text-gray-900 dark:text-white">{formatAmount(rpPrice)}</p>
                            {rpCompare && <p className="text-xs text-gray-400 line-through">{formatAmount(rpCompare)}</p>}
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
