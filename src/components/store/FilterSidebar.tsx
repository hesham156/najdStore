"use client";

import { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";

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
        {/* Search */}
        <form method="get" className="mb-5">
          <input
            type="text"
            name="search"
            defaultValue={searchParams.search}
            placeholder="ابحث عن منتج..."
            className="input-base text-sm"
          />
          {searchParams.category && (
            <input type="hidden" name="category" value={searchParams.category} />
          )}
          <button type="submit" className="btn-primary w-full mt-2 text-sm py-2">
            بحث
          </button>
        </form>

        {/* Category Filter */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-fg-muted mb-2">الفئة</p>
          <div className="space-y-1">
            <a
              href="/products"
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
                href={`/products?category=${cat.slug}`}
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
                href={`/products?${searchParams.category ? `category=${searchParams.category}&` : ""}sort=${opt.value}`}
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
