"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Search, Package, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";

interface PickerProduct {
  id: string;
  nameAr: string;
  price: number | string;
  image?: string | null;
  category?: { nameAr?: string | null; icon?: string | null } | null;
}

/**
 * Searchable multi-select of store products, used to choose the "كمّل طلبك"
 * complementary products shown on a product page. Selection is a plain array of
 * product ids — the parent persists them (as `bundle:<id>` tags).
 */
export function BundlePicker({
  value,
  onChange,
  excludeId,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  excludeId?: string;
}) {
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/products?active=true")
      .then((r) => r.json())
      .then((d) => { if (d.success) setProducts(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, PickerProduct>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  const selectable = useMemo(
    () => products.filter((p) => p.id !== excludeId),
    [products, excludeId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return selectable;
    return selectable.filter((p) => p.nameAr.toLowerCase().includes(q));
  }, [selectable, query]);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const p = byId.get(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-lg border border-primary-300 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 dark:border-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
              >
                {p?.nameAr || "منتج محذوف"}
                <button type="button" onClick={() => toggle(id)} aria-label="إزالة">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث عن منتج لإضافته…"
        startIcon={<Search className="h-4 w-4" />}
      />

      <div className="max-h-72 space-y-1 overflow-y-auto rounded-control border border-line p-1.5">
        {loading ? (
          <p className="p-3 text-center text-xs text-fg-muted">جارٍ تحميل المنتجات…</p>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-center text-xs text-fg-muted">لا توجد منتجات مطابقة.</p>
        ) : (
          filtered.map((p) => {
            const checked = value.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-start transition-colors ${
                  checked
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-transparent hover:bg-surface-sunken"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface">
                  {p.image ? (
                    <Image src={p.image} alt="" width={36} height={36} className="h-full w-full object-contain p-0.5" unoptimized />
                  ) : (
                    <Package className="h-4 w-4 text-fg-subtle" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fg">{p.nameAr}</span>
                  <span className="block text-[11px] text-fg-subtle">{formatCurrency(Number(p.price))}</span>
                </span>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    checked ? "border-primary-600 bg-primary-600 text-white" : "border-line"
                  }`}
                >
                  {checked && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
