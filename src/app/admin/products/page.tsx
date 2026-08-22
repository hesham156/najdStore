"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Edit, Trash2, Search, ToggleLeft, ToggleRight, Filter, Layers, Package, CheckCircle, Star, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/Modal";
import { DataTable, Column, Pagination } from "@/components/ui/DataTable";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import type { ProductWithCategory } from "@/types";

type FilterMode = "all" | "active" | "inactive";

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/products?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    if (data.success) setProducts(data.data);
    else toast.error("تعذّر تحميل المنتجات");
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => { fetchProducts(); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  /* ── Toggle active status ── */
  const toggleActive = async (product: ProductWithCategory) => {
    setTogglingId(product.id);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !product.isActive }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(product.isActive ? "تم تعطيل المنتج" : "تم تفعيل المنتج ✓");
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, isActive: !p.isActive } : p
      ));
    } else {
      toast.error("حدث خطأ أثناء التغيير");
    }
    setTogglingId(null);
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/admin/products/${deleteId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("تم حذف المنتج"); fetchProducts(); }
    else toast.error(data.error || "حدث خطأ");
    setDeleteLoading(false);
    setDeleteId(null);
  };

  /* ── Stats ── */
  const stats = useMemo(() => {
    const active = products.filter(p => p.isActive).length;
    const featured = products.filter(p => p.isFeatured).length;
    const value = products.reduce((s, p) => s + (parseFloat(String(p.price)) || 0), 0);
    return { total: products.length, active, featured, value };
  }, [products]);

  /* ── Client-side filter ── */
  const filtered = products.filter(p => {
    if (filterMode === "active")   return p.isActive;
    if (filterMode === "inactive") return !p.isActive;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const columns: Column<ProductWithCategory>[] = [
    {
      key: "nameAr",
      title: "المنتج",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg shrink-0">
            {row.category?.icon || "📦"}
          </div>
          <div>
            <p className={cn("font-semibold text-sm", row.isActive ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500 line-through")}>
              {row.nameAr}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{row.category?.nameAr}</p>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      title: "السعر",
      render: (val, row) => (
        <div>
          <p className="font-bold text-sm">{formatCurrency(parseFloat(String(val)))}</p>
          {row.comparePrice && (
            <p className="text-xs text-gray-400 line-through">{formatCurrency(parseFloat(String(row.comparePrice)))}</p>
          )}
        </div>
      ),
    },
    {
      key: "deliveryMethod",
      title: "التسليم",
      render: (val) => (
        <Badge variant={val === "AUTOMATIC" ? "success" : "warning"}>
          {val === "AUTOMATIC" ? "تلقائي" : "يدوي"}
        </Badge>
      ),
    },
    {
      key: "stockCount",
      title: "المخزون",
      render: (val) => {
        const count = Number(val);
        return (
          <span className={`font-bold text-sm ${count === 0 ? "text-red-600" : count < 5 ? "text-orange-500" : "text-green-600"}`}>
            {count}
          </span>
        );
      },
    },
    {
      key: "isActive",
      title: "الحالة",
      render: (val, row) => (
        <button
          onClick={() => toggleActive(row)}
          disabled={togglingId === row.id}
          className="flex items-center gap-1.5 group"
        >
          {val
            ? <ToggleRight className="h-5 w-5 text-green-500 group-hover:text-green-600 transition-colors" />
            : <ToggleLeft  className="h-5 w-5 text-gray-400 group-hover:text-gray-500 transition-colors" />
          }
          <Badge variant={val ? "success" : "gray"} className="text-xs">
            {val ? "نشط" : "معطل"}
          </Badge>
        </button>
      ),
    },
    {
      key: "isFeatured",
      title: "مميز",
      render: (val) => val
        ? <Badge variant="default">⭐ مميز</Badge>
        : <span className="text-gray-400 text-xs">—</span>,
    },
    {
      key: "id",
      title: "الإجراءات",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => router.push(`/admin/products/${row.id}`)}>
            <Edit className="h-3.5 w-3.5" />تعديل
          </Button>
          <Button size="sm" variant="ghost" onClick={() => router.push(`/admin/products/${row.id}/options`)} title="الخيارات والأسعار">
            <Layers className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteId(row.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const filterBtns: { mode: FilterMode; label: string; count: number }[] = [
    { mode: "all",      label: "الكل",    count: products.length },
    { mode: "active",   label: "نشط",     count: products.filter(p => p.isActive).length },
    { mode: "inactive", label: "معطل",    count: products.filter(p => !p.isActive).length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">المنتجات</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {filtered.length} منتج {filterMode !== "all" && `(${filterMode === "active" ? "نشط" : "معطل"})`}
          </p>
        </div>
        <Button onClick={() => router.push("/admin/products/new")}>
          <Plus className="h-4 w-4" />منتج جديد
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المنتجات", value: stats.total, icon: Package, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" },
          { label: "نشطة", value: stats.active, icon: CheckCircle, color: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400" },
          { label: "مميزة", value: stats.featured, icon: Star, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400" },
          { label: "قيمة الكتالوج", value: formatCurrency(stats.value), icon: DollarSign, color: "text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400" },
        ].map((s) => (
          <Card key={s.label}>
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.color)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-black text-gray-900 dark:text-white truncate">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث عن منتج..."
            className="ps-10"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <Filter className="h-3.5 w-3.5 text-gray-400 ms-2 shrink-0" />
          {filterBtns.map(({ mode, label, count }) => (
            <button
              key={mode}
              onClick={() => { setFilterMode(mode); setPage(1); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                filterMode === mode
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {label}
              <span className={cn(
                "ms-1.5 px-1.5 py-0.5 rounded-full text-[10px]",
                filterMode === mode ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600" : "bg-gray-200 dark:bg-gray-600 text-gray-500"
              )}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Inactive warning */}
      {products.filter(p => !p.isActive).length > 0 && filterMode === "all" && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
          <span className="font-bold">⚠️</span>
          يوجد {products.filter(p => !p.isActive).length} منتج معطل — اضغط على الزر في عمود "الحالة" لتفعيله
        </div>
      )}

      <DataTable columns={columns} data={paginated} loading={loading} emptyMessage="لا توجد منتجات" />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      />

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="حذف المنتج"
        message="هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء."
        loading={deleteLoading}
      />
    </div>
  );
}
