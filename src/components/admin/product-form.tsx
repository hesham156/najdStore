"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AlertCircle, CheckCircle2, Clock, GripVertical, Package, Plus, Star, Trash2, Zap } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, Section } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { cn, formatCurrency } from "@/lib/utils";

/* Shared pieces between "new product" and "edit product" so both screens
   stay identical in behaviour and appearance. */

export interface Variant {
  label: string;
  price: string;
  comparePrice: string;
}

export interface ProductCategory {
  id: string;
  nameAr: string;
  icon?: string;
}

/* ── Variants editor ───────────────────────────────────────── */

export function VariantsEditor({
  variants,
  onAdd,
  onRemove,
  onUpdate,
}: {
  variants: Variant[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof Variant, value: string) => void;
}) {
  return (
    <Section
      title="خيارات الاشتراك"
      description="مثال: شهر / 3 شهور / سنة — لكل خيار سعره الخاص"
      action={
        <Button type="button" size="sm" variant="secondary" onClick={onAdd} icon={<Plus className="h-3.5 w-3.5" />}>
          إضافة خيار
        </Button>
      }
      contentClassName="space-y-3 pt-0"
    >
      {variants.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong p-6 text-center">
          <p className="text-[13px] text-fg-muted">لا توجد خيارات بعد</p>
          <p className="mt-1 text-xs text-fg-subtle">
            أضف خياراً لتحديد مدد اشتراك بأسعار مختلفة، أو اترك الحقل فارغاً لمنتج بسعر موحد.
          </p>
        </div>
      ) : (
        variants.map((v, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-control border border-line bg-surface-muted p-3.5">
            <GripVertical className="mt-8 h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="اسم الخيار"
                required
                value={v.label}
                onChange={(e) => onUpdate(i, "label", e.target.value)}
                placeholder="شهر واحد"
              />
              <Input
                label="السعر (ر.س)"
                required
                type="number"
                step="0.01"
                min="0"
                value={v.price}
                onChange={(e) => onUpdate(i, "price", e.target.value)}
                placeholder="29.99"
              />
              <Input
                label="السعر قبل الخصم"
                type="number"
                step="0.01"
                min="0"
                value={v.comparePrice}
                onChange={(e) => onUpdate(i, "comparePrice", e.target.value)}
                placeholder="49.99"
              />
            </div>
            <IconButton
              label={`حذف الخيار ${v.label || i + 1}`}
              variant="soft-danger"
              className="mt-7"
              onClick={() => onRemove(i)}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            />
          </div>
        ))
      )}
    </Section>
  );
}

/* ── Completeness checklist ────────────────────────────────── */

export interface Check {
  done: boolean;
  label: string;
}

export function CompletenessCard({ checks }: { checks: Check[] }) {
  const completeness = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  const tone = completeness === 100 ? "success" : completeness >= 60 ? "warning" : "danger";

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-fg">اكتمال بيانات المنتج</h3>
        <span
          className={cn(
            "text-[13px] font-bold tnum",
            tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-danger"
          )}
        >
          {completeness}%
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuenow={completeness}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="نسبة اكتمال بيانات المنتج"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-danger"
          )}
          style={{ width: `${completeness}%` }}
        />
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {checks.map((c) => (
          <li
            key={c.label}
            className={cn("flex items-center gap-1.5 text-[11px]", c.done ? "text-success" : "text-fg-subtle")}
          >
            {c.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span className="truncate">{c.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ── Storefront card preview ───────────────────────────────── */

export function ProductPreviewCard({
  nameAr,
  image,
  category,
  deliveryMethod,
  isFeatured,
  price,
  comparePrice,
  features,
  variants,
  selectedVariantIdx,
  onSelectVariant,
}: {
  nameAr: string;
  image: string;
  category?: ProductCategory;
  deliveryMethod: string;
  isFeatured: boolean;
  price: number;
  comparePrice: number;
  features: string[];
  variants: Variant[];
  selectedVariantIdx: number;
  onSelectVariant: (index: number) => void;
}) {
  const discount = comparePrice > price && comparePrice > 0 ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-line bg-surface-muted px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-danger" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-warning" aria-hidden />
        <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
        <span className="ms-2 text-[11px] text-fg-subtle">معاينة بطاقة المنتج</span>
      </div>

      <div className="p-4">
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-surface-sunken">
            {image ? (
              <Image src={image} alt="" fill className="object-contain p-4" unoptimized />
            ) : (
              <span className="text-4xl" aria-hidden>
                {category?.icon || "📦"}
              </span>
            )}
            {discount > 0 && (
              <span className="absolute start-2 top-2 rounded-lg bg-danger-solid px-2 py-0.5 text-[11px] font-bold text-white">
                −{discount}%
              </span>
            )}
            <span
              className={cn(
                "absolute end-2 top-2 flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium",
                deliveryMethod === "AUTOMATIC"
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              )}
            >
              {deliveryMethod === "AUTOMATIC" ? (
                <>
                  <Zap className="h-2.5 w-2.5" aria-hidden />
                  فوري
                </>
              ) : (
                <>
                  <Clock className="h-2.5 w-2.5" aria-hidden />
                  يدوي
                </>
              )}
            </span>
            {isFeatured && (
              <span className="absolute end-2 top-9 flex items-center gap-1 rounded-lg bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">
                <Star className="h-2.5 w-2.5" aria-hidden />
                مميز
              </span>
            )}
          </div>

          <div className="space-y-2 p-3">
            <p className="text-[11px] font-medium text-primary-600 dark:text-primary-400">{category?.nameAr || "الفئة"}</p>
            <h3 className="line-clamp-1 text-[13px] font-bold text-fg">{nameAr || "اسم المنتج"}</h3>

            {variants.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {variants.slice(0, 3).map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onSelectVariant(i)}
                    className={cn(
                      "rounded-lg border px-2 py-0.5 text-[11px] transition-colors",
                      selectedVariantIdx === i
                        ? "border-primary-500 bg-primary-50 font-medium text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                        : "border-line text-fg-muted"
                    )}
                  >
                    {v.label || `خيار ${i + 1}`}
                  </button>
                ))}
                {variants.length > 3 && <span className="self-center text-[11px] text-fg-subtle">+{variants.length - 3}</span>}
              </div>
            )}

            {features.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {features.slice(0, 2).map((f) => (
                  <span key={f} className="rounded-full bg-surface-sunken px-1.5 py-0.5 text-[11px] text-fg-muted">
                    {f}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-line pt-2">
              <div>
                <p className="text-sm font-bold tnum text-fg">{price > 0 ? formatCurrency(price) : "—"}</p>
                {comparePrice > price && comparePrice > 0 && (
                  <p className="text-[11px] tnum text-fg-subtle line-through">{formatCurrency(comparePrice)}</p>
                )}
              </div>
              <span className="flex items-center gap-1 rounded-xl bg-primary-600 px-2.5 py-1.5 text-[11px] text-white">
                <Package className="h-3 w-3" aria-hidden />
                أضف
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── Google result preview ─────────────────────────────────── */

export function SerpPreview({
  slug,
  title,
  description,
  showCounters,
}: {
  slug: string;
  title: string;
  description: string;
  showCounters?: boolean;
}) {
  const titleLong = title.length > 60;
  const descLong = description.length > 160;
  // Read after mount: the real host, not a placeholder, without risking an
  // SSR/client text mismatch on first paint.
  const [host, setHost] = useState("");
  useEffect(() => setHost(window.location.host), []);

  return (
    <div className="space-y-1 rounded-control border border-line bg-surface p-3" dir="ltr">
      <p className="truncate text-[11px] text-success">{host || "…"} › products › {slug || "..."}</p>
      <p className={cn("truncate text-[13px] font-medium", titleLong ? "text-warning" : "text-info")}>
        {title || "عنوان المنتج"}
      </p>
      <p className={cn("line-clamp-2 text-[11px]", descLong ? "text-warning" : "text-fg-muted")}>
        {description || "وصف المنتج يظهر هنا..."}
      </p>
      {showCounters && (
        <div className="flex gap-3 pt-1 text-[11px] text-fg-subtle" dir="rtl">
          <span className={titleLong ? "font-bold text-warning" : undefined}>العنوان: {title.length}/60</span>
          <span className={descLong ? "font-bold text-warning" : undefined}>الوصف: {description.length}/160</span>
        </div>
      )}
    </div>
  );
}

/* ── Sticky save bar for long forms ────────────────────────── */

export function FormActions({
  formId,
  loading,
  onCancel,
  submitLabel,
  className,
}: {
  formId: string;
  loading?: boolean;
  onCancel: () => void;
  submitLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-2.5 border-t border-line bg-surface/90 px-4 py-3 backdrop-blur",
        "sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6",
        className
      )}
    >
      <Button variant="secondary" type="button" onClick={onCancel} disabled={loading}>
        إلغاء
      </Button>
      <Button type="submit" form={formId} loading={loading}>
        {submitLabel}
      </Button>
    </div>
  );
}
