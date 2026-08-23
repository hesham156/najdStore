"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  EyeOff,
  Layers,
  Package,
  PackageX,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { ConfirmModal } from "@/components/ui/Modal";
import { Column, DataTable, Pagination } from "@/components/ui/DataTable";
import { EmptyState, NoResultsState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { ImportExportBar } from "@/components/admin/ImportExportBar";
import { FilterSelect, SearchInput, Toolbar, ToolbarSpacer } from "@/components/admin/Toolbar";
import { cn, formatCurrency } from "@/lib/utils";
import type { ProductWithCategory } from "@/types";

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "nameAr" | "price" | "stockCount" | "sales";

interface AdminProduct extends ProductWithCategory {
  _count?: { orderItems: number };
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [category, setCategory] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [selected, setSelected] = useState<string[]>([]);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ── Data ── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) setProducts(data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  /* ── Mutations (unchanged endpoints) ── */
  const setActive = async (product: AdminProduct, isActive: boolean) => {
    const previous = products;
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isActive } : p)));
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(isActive ? "تم تفعيل المنتج" : "تم تعطيل المنتج");
    } catch {
      setProducts(previous);
      toast.error("تعذّر تغيير حالة المنتج، حاول مرة أخرى");
    }
  };

  const bulkSetActive = async (isActive: boolean) => {
    setBusy(true);
    const results = await Promise.allSettled(
      selected.map((id) =>
        fetch(`/api/admin/products/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        })
      )
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    setBusy(false);
    setSelected([]);
    fetchProducts();
    if (failed) toast.error(`تعذّر تحديث ${failed} منتج`);
    else toast.success(`تم ${isActive ? "تفعيل" : "تعطيل"} ${selected.length} منتج`);
  };

  const handleDelete = async () => {
    if (!deleteIds?.length) return;
    setBusy(true);
    const results = await Promise.allSettled(
      deleteIds.map((id) => fetch(`/api/admin/products/${id}`, { method: "DELETE" }).then((r) => r.json()))
    );
    const failed = results.filter((r) => r.status === "rejected" || !(r as PromiseFulfilledResult<{ success: boolean }>).value?.success).length;
    setBusy(false);
    setDeleteIds(null);
    setSelected([]);
    fetchProducts();
    if (failed) toast.error(`تعذّر حذف ${failed} من ${deleteIds.length} منتج`);
    else toast.success(deleteIds.length > 1 ? `تم حذف ${deleteIds.length} منتجات` : "تم حذف المنتج");
  };

  const copySlug = (slug: string) => {
    navigator.clipboard
      ?.writeText(slug)
      .then(() => toast.success("تم نسخ رابط المنتج"))
      .catch(() => toast.error("تعذّر النسخ من المتصفح"));
  };

  /* ── Derived ── */
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) if (p.category?.nameAr) map.set(p.categoryId, p.category.nameAr);
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [products]);

  const statusCounts = useMemo(
    () => ({
      all: products.length,
      active: products.filter((p) => p.isActive).length,
      inactive: products.filter((p) => !p.isActive).length,
    }),
    [products]
  );

  const stats = useMemo(() => {
    const featured = products.filter((p) => p.isFeatured).length;
    const value = products.reduce((s, p) => s + (parseFloat(String(p.price)) || 0), 0);
    const sales = products.reduce((s, p) => s + (p._count?.orderItems ?? 0), 0);
    return { total: products.length, active: statusCounts.active, featured, value, sales };
  }, [products, statusCounts.active]);

  const filtered = useMemo(() => {
    let rows = products.filter((p) => {
      if (status === "active" && !p.isActive) return false;
      if (status === "inactive" && p.isActive) return false;
      if (category !== "all" && p.categoryId !== category) return false;
      return true;
    });

    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const get = (p: AdminProduct) =>
          sortKey === "sales"
            ? p._count?.orderItems ?? 0
            : sortKey === "price"
              ? parseFloat(String(p.price)) || 0
              : sortKey === "stockCount"
                ? Number(p.stockCount) || 0
                : p.nameAr;
        const av = get(a);
        const bv = get(b);
        if (typeof av === "string" || typeof bv === "string") return String(av).localeCompare(String(bv), "ar") * dir;
        return (av - bv) * dir;
      });
    }
    return rows;
  }, [products, status, category, sortKey, sortDir]);

  useEffect(() => setPage(1), [status, category]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const filtersActive = search !== "" || status !== "all" || category !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setCategory("all");
  };

  /* ── Columns ── */
  const columns: Column<AdminProduct>[] = [
    {
      key: "nameAr",
      title: "المنتج",
      sortable: true,
      primary: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface-sunken text-lg">
            {row.image ? (
              <Image src={row.image} alt="" width={40} height={40} className="h-full w-full object-cover" unoptimized />
            ) : (
              <span aria-hidden>{row.category?.icon || "📦"}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className={cn("truncate text-[13px] font-semibold", row.isActive ? "text-fg" : "text-fg-subtle")}>
              {row.nameAr}
              {row.isFeatured && (
                <Star className="ms-1 inline h-3 w-3 fill-amber-400 text-amber-400 align-[-1px]" aria-label="منتج مميز" />
              )}
            </p>
            <p className="truncate font-mono text-[11px] text-fg-subtle">{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "categoryId",
      title: "الفئة",
      hideOnMobile: true,
      render: (_, row) => <span className="text-[13px] text-fg-muted">{row.category?.nameAr ?? "—"}</span>,
    },
    {
      key: "price",
      title: "السعر",
      sortable: true,
      render: (val, row) => (
        <div className="whitespace-nowrap">
          <p className="text-[13px] font-bold tnum text-fg">{formatCurrency(parseFloat(String(val)))}</p>
          {row.comparePrice && (
            <p className="text-[11px] tnum text-fg-subtle line-through">
              {formatCurrency(parseFloat(String(row.comparePrice)))}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "stockCount",
      title: "المخزون",
      sortable: true,
      render: (val, row) => {
        if (row.deliveryMethod !== "AUTOMATIC") return <span className="text-[11px] text-fg-subtle">تسليم يدوي</span>;
        const count = Number(val);
        return (
          <Badge variant={count === 0 ? "danger" : count < 5 ? "warning" : "success"} dot>
            {count === 0 ? "نفد" : `${count} متاح`}
          </Badge>
        );
      },
    },
    {
      key: "sales",
      title: "المبيعات",
      sortable: true,
      hideOnMobile: true,
      render: (_, row) => <span className="text-[13px] font-semibold tnum text-fg">{row._count?.orderItems ?? 0}</span>,
    },
    {
      key: "isActive",
      title: "الحالة",
      render: (val, row) => (
        <Switch
          checked={!!val}
          onChange={(next) => setActive(row, next)}
          label={<span className="text-[11px]">{val ? "نشط" : "معطل"}</span>}
        />
      ),
    },
    {
      key: "actions",
      title: "",
      align: "end",
      cardHidden: true,
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`تعديل ${row.nameAr}`}
            title="تعديل"
            onClick={() => router.push(`/admin/products/${row.id}`)}
            icon={<Pencil className="h-4 w-4" />}
          />
          <Dropdown
            label={`إجراءات ${row.nameAr}`}
            items={[
              {
                label: "الخيارات والأسعار",
                icon: <Layers />,
                onSelect: () => router.push(`/admin/products/${row.id}/options`),
              },
              { label: "عرض في المتجر", icon: <ExternalLink />, href: `/products/${row.slug}` },
              { label: "نسخ الرابط", icon: <Copy />, onSelect: () => copySlug(row.slug) },
              {
                label: row.isActive ? "تعطيل المنتج" : "تفعيل المنتج",
                icon: row.isActive ? <EyeOff /> : <Eye />,
                onSelect: () => setActive(row, !row.isActive),
                separated: true,
              },
              { label: "حذف المنتج", icon: <Trash2 />, danger: true, onSelect: () => setDeleteIds([row.id]) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="المنتجات"
        description={`${filtered.length} منتج ${filtersActive ? "بعد التصفية" : "في الكتالوج"}`}
        actions={
          <div className="flex items-center gap-2">
            <ImportExportBar entity="products" onImported={fetchProducts} />
            <Button onClick={() => router.push("/admin/products/new")} icon={<Plus className="h-4 w-4" />}>
              منتج جديد
            </Button>
          </div>
        }
      />

      <AdminStats
        items={[
          { label: "إجمالي المنتجات", value: stats.total, icon: Package, color: statColors.blue },
          { label: "منتجات نشطة", value: stats.active, icon: CheckCircle2, color: statColors.green },
          { label: "منتجات مميزة", value: stats.featured, icon: Star, color: statColors.amber },
          { label: "قيمة الكتالوج", value: formatCurrency(stats.value), icon: DollarSign, color: statColors.primary },
        ]}
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث باسم المنتج..." label="بحث عن منتج" />
        <Tabs
          ariaLabel="تصفية حسب الحالة"
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          items={[
            { value: "all", label: "الكل", count: statusCounts.all },
            { value: "active", label: "نشط", count: statusCounts.active },
            { value: "inactive", label: "معطل", count: statusCounts.inactive },
          ]}
        />
        {categories.length > 1 && (
          <FilterSelect
            label="تصفية حسب الفئة"
            value={category}
            onChange={setCategory}
            options={[{ value: "all", label: "كل الفئات" }, ...categories]}
          />
        )}
        <ToolbarSpacer />
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            مسح التصفية
          </Button>
        )}
      </Toolbar>

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        error={error}
        onRetry={fetchProducts}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        sortKey={sortKey}
        sortDirection={sortDir}
        onSort={(key, dir) => {
          setSortKey(key as SortKey);
          setSortDir(dir);
        }}
        bulkActions={
          <>
            <Button size="sm" variant="secondary" loading={busy} onClick={() => bulkSetActive(true)}>
              تفعيل
            </Button>
            <Button size="sm" variant="secondary" loading={busy} onClick={() => bulkSetActive(false)}>
              تعطيل
            </Button>
            <Button size="sm" variant="soft-danger" onClick={() => setDeleteIds(selected)}>
              حذف
            </Button>
          </>
        }
        empty={
          filtersActive ? (
            <NoResultsState query={search} onClear={clearFilters} />
          ) : (
            <EmptyState
              icon={PackageX}
              title="لا توجد منتجات بعد"
              description="ابدأ بإضافة أول منتج ليظهر في متجرك ويصبح متاحاً للشراء."
              action={
                <Button onClick={() => router.push("/admin/products/new")} icon={<Plus className="h-4 w-4" />}>
                  إضافة منتج
                </Button>
              }
            />
          )
        }
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      <ConfirmModal
        isOpen={!!deleteIds?.length}
        onClose={() => setDeleteIds(null)}
        onConfirm={handleDelete}
        title={deleteIds && deleteIds.length > 1 ? `حذف ${deleteIds.length} منتجات` : "حذف المنتج"}
        message={
          deleteIds && deleteIds.length > 1
            ? "سيتم حذف المنتجات المحددة نهائياً. لا يمكن التراجع عن هذا الإجراء."
            : "سيتم حذف هذا المنتج نهائياً من الكتالوج. لا يمكن التراجع عن هذا الإجراء."
        }
        confirmLabel="نعم، احذف"
        loading={busy}
      />
    </div>
  );
}
