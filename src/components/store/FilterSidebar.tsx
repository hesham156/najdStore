"use client";

import { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  nameAr: string;
  icon?: string | null;
}

interface FilterSidebarProps {
  categories: Category[];
  searchParams: { category?: string; search?: string; sort?: string };
}

export function FilterSidebar({ categories, searchParams }: FilterSidebarProps) {
  const [open, setOpen] = useState(false);

  /**
   * Every filter link carries the OTHER active filters forward.
   *
   * Each control used to build its own href from scratch: picking a category
   * threw away the search term, sorting threw it away again, and the search
   * form forgot the sort. Changing one thing silently reset the rest.
   */
  const hrefWith = (override: Partial<typeof searchParams>) => {
    const merged = { ...searchParams, ...override };
    const qs = new URLSearchParams();
    if (merged.search) qs.set("search", merged.search);
    if (merged.category) qs.set("category", merged.category);
    if (merged.sort) qs.set("sort", merged.sort);
    const s = qs.toString();
    return s ? `/products?${s}` : "/products";
  };

  const hasFilters = Boolean(searchParams.search || searchParams.category || searchParams.sort);

  const content = (
    <div className="bg-surface rounded-2xl border border-line p-5 sticky top-20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full lg:cursor-default lg:pointer-events-none mb-4"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-fg-subtle" />
          <h3 className="font-bold text-fg">التصفية</h3>
        </div>
        <span className="lg:hidden text-fg-subtle">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      <div className={`${open ? "block" : "hidden"} lg:block`}>
        {/* Search — hidden fields keep the current category and sort applied */}
        <form method="get" action="/products" className="mb-5">
          <input
            type="search"
            name="search"
            defaultValue={searchParams.search}
            placeholder="ابحث عن منتج..."
            aria-label="ابحث عن منتج"
            className="input-base text-sm"
          />
          {searchParams.category && (
            <input type="hidden" name="category" value={searchParams.category} />
          )}
          {searchParams.sort && (
            <input type="hidden" name="sort" value={searchParams.sort} />
          )}
          <button type="submit" className="btn-primary w-full mt-2 text-sm py-2">
            بحث
          </button>
        </form>

        {hasFilters && (
          <a
            href="/products"
            className="mb-5 flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm text-fg-muted transition-colors hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400"
          >
            <X className="h-3.5 w-3.5" />
            مسح كل الفلاتر
          </a>
        )}

        {/* Category Filter */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-fg-muted mb-2">الفئة</p>
          <div className="space-y-1">
            <a
              href={hrefWith({ category: undefined })}
              className={`block px-3 py-2 rounded-xl text-sm transition-colors ${
                !searchParams.category
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-medium"
                  : "text-fg-muted hover:bg-surface-sunken"
              }`}
            >
              جميع الفئات
            </a>
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={hrefWith({ category: cat.slug })}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
                  searchParams.category === cat.slug
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-medium"
                    : "text-fg-muted hover:bg-surface-sunken"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.nameAr}
              </a>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <p className="text-sm font-semibold text-fg-muted mb-2">الترتيب</p>
          <div className="space-y-1">
            {[
              { value: "", label: "الأفضل مطابقةً" },
              { value: "newest", label: "الأحدث" },
              { value: "price_asc", label: "السعر: الأقل أولاً" },
              { value: "price_desc", label: "السعر: الأعلى أولاً" },
            ].map((opt) => (
              <a
                key={opt.value}
                href={hrefWith({ sort: opt.value || undefined })}
                className={`block px-3 py-2 rounded-xl text-sm transition-colors ${
                  (searchParams.sort || "") === opt.value
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-medium"
                    : "text-fg-muted hover:bg-surface-sunken"
                }`}
              >
                {opt.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return <aside className="w-full lg:w-64 shrink-0">{content}</aside>;
}
