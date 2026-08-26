"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ShoppingCart, Star, Zap, Clock, AlertTriangle } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/Button";
import { useCurrency } from "@/context/CurrencyContext";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";
import type { ProductWithCategory } from "@/types";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { pickText, pickList } from "@/lib/i18n-content";
import type { Locale } from "@/i18n/config";

interface ProductCardProps {
  product: ProductWithCategory;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addItem } = useCartStore();
  const { formatAmount } = useCurrency();
  const reduced = useReducedMotion();
  const t = useTranslations("product");
  const locale = useLocale() as Locale;

  // Resolve the shopper-facing text from the product's bilingual columns.
  const displayName = pickText(locale, product.name, product.nameAr);
  const displayCategory = pickText(locale, product.category.name, product.category.nameAr);
  const displayFeatures = pickList(locale, product.features, product.featuresAr);

  const price = typeof product.price === "string" ? parseFloat(product.price) : product.price;
  const comparePrice = product.comparePrice
    ? typeof product.comparePrice === "string"
      ? parseFloat(product.comparePrice)
      : product.comparePrice
    : null;

  const discount = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  // `stockCount` only carries meaning when the product opts into tracking.
  // Without this guard every untracked product (the default, count 0) rendered
  // the full-card "sold out" overlay and the whole catalogue looked empty.
  const tracksStock = product.trackStock === true;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price,
      image: product.image || undefined,
      quantity: 1,
      slug: product.slug,
    });
    toast.success(t("addedToCart", { name: displayName }));
  };

  return (
    <Link href={`/products/${product.slug}`}>
      <motion.div
        className={cn(
          "group relative rounded-2xl bg-surface border border-line",
          "overflow-hidden cursor-pointer",
          className
        )}
        whileHover={reduced ? {} : { y: -6, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
        whileTap={reduced ? {} : { scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Badges */}
        <div className="absolute top-3 start-3 z-10 flex flex-col gap-1.5">
          {product.isFeatured && (
            <Badge variant="default" className="text-xs">
              <Star className="h-3 w-3" />
              {t("featured")}
            </Badge>
          )}
          {discount > 0 && (
            <Badge variant="danger" className="text-xs font-bold">
              -{discount}%
            </Badge>
          )}
        </div>

        {/* Delivery Badge */}
        <div className="absolute top-3 end-3 z-10">
          <Badge
            variant={product.deliveryMethod === "AUTOMATIC" ? "success" : "warning"}
            className="text-xs"
            dot
          >
            {product.deliveryMethod === "AUTOMATIC" ? (
              <><Zap className="h-3 w-3" />{t("instantDelivery")}</>
            ) : (
              <><Clock className="h-3 w-3" />{t("manualDelivery")}</>
            )}
          </Badge>
        </div>

        {/* Image */}
        <div className="relative aspect-video bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
          {product.image ? (
            <motion.div
              className="absolute inset-0"
              whileHover={reduced ? {} : { scale: 1.06 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Image
                src={product.image}
                alt={displayName}
                fill
                className="object-contain p-6"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                unoptimized
              />
            </motion.div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl">{product.category.icon || "📦"}</span>
            </div>
          )}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 0.08 }}
            transition={{ duration: 0.2 }}
            style={{ background: product.category.color || "#7c3aed" }}
          />
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
            {displayCategory}
          </p>
          <h3 className="font-bold text-fg mb-2 line-clamp-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-200">
            {displayName}
          </h3>

          {displayFeatures.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {displayFeatures.slice(0, 3).map((feature) => (
                <span
                  key={feature}
                  className="text-xs px-2 py-0.5 rounded-full bg-surface-sunken text-fg-muted"
                >
                  {feature}
                </span>
              ))}
            </div>
          )}

          {/* Price + CTA */}
          <div className="flex items-end justify-between mt-3">
            <div>
              <div className="text-xl font-bold text-fg">
                {formatAmount(price)}
              </div>
              {comparePrice && (
                <div className="text-sm text-fg-subtle line-through">
                  {formatAmount(comparePrice)}
                </div>
              )}
            </div>
            <motion.div whileTap={reduced ? {} : { scale: 0.93 }}>
              <Button size="sm" onClick={handleAddToCart} className="gap-1.5">
                <ShoppingCart className="h-4 w-4" />
                {t("addShort")}
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Low stock */}
        {tracksStock && product.stockCount < 5 && product.stockCount > 0 && (
          <div className="px-4 pb-3 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <p className="text-xs text-warning font-medium">
              {t("onlyLeft", { count: product.stockCount })}
            </p>
          </div>
        )}

        {/* Out of stock overlay */}
        {tracksStock && product.stockCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-fg/60 backdrop-blur-[1px]">
            <span className="rounded-control bg-fg px-4 py-2 text-sm font-bold text-canvas">
              {t("soldOut")}
            </span>
          </div>
        )}
      </motion.div>
    </Link>
  );
}
