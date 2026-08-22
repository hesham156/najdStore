"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Archive, CheckCircle2, Eye, EyeOff, PackageCheck, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/Input";
import { Column, DataTable, Pagination } from "@/components/ui/DataTable";
import { EmptyState, NoResultsState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { FilterSelect, SearchInput, Toolbar } from "@/components/admin/Toolbar";
import { formatDate } from "@/lib/utils";

interface StockItem {
  id: string;
  productId: string;
  data: string;
  isDelivered: boolean;
  createdAt: string;
  product: { nameAr: string };
}

interface Product {
  id: string;
  nameAr: string;
}

type StatusFilter = "all" | "available" | "delivered";

export default function AdminStockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [showData, setShowData] = useState<Record<string, boolean>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ productId: "", data: "" });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [productFilter, setProductFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [stockRes, prodRes] = await Promise.all([fetch("/api/admin/stock"), fetch("/api/products?limit=100")]);
      const stockData = await stockRes.json();
      const prodData = await prodRes.json();
      if (stockData.success) setStock(stockData.data);
      else setError(true);
      if (prodData.success) setProducts(prodData.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.data.trim()) {
      toast.error("اختر المنتج وأدخل بيانات الاشتراك");
      return;
    }
    setAddLoading(true);
    const lines = form.data.split("\n---\n").filter((l) => l.trim());
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: form.productId, items: lines }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`تمت إضافة ${lines.length} عنصر للمخزون`);
        setAddOpen(false);
        setForm({ productId: "", data: "" });
        fetchStock();
      } else {
        toast.error(data.error || "تعذّرت إضافة المخزون");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/stock/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حذف عنصر المخزون");
        fetchStock();
      } else {
        toast.error(data.error || "تعذّر الحذف");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  /* ── Derived ── */
  const available = stock.filter((s) => !s.isDelivered).length;
  const delivered = stock.length - available;

  const productOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stock) if (s.product?.nameAr) map.set(s.productId, s.product.nameAr);
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [stock]);

  /** Products whose available stock has run low — surfaced so it is actionable. */
  const lowStockProducts = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const s of stock) {
      const entry = counts.get(s.productId) ?? { name: s.product?.nameAr ?? "", count: 0 };
      if (!s.isDelivered) entry.count += 1;
      counts.set(s.productId, entry);
    }
    return Array.from(counts.values()).filter((p) => p.count < 5).length;
  }, [stock]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stock.filter((s) => {
      if (status === "available" && s.isDelivered) return false;
      if (status === "delivered" && !s.isDelivered) return false;
      if (productFilter !== "all" && s.productId !== productFilter) return false;
      if (!q) return true;
      return s.product?.nameAr?.toLowerCase().includes(q) || s.data?.toLowerCase().includes(q);
    });
  }, [stock, status, productFilter, search]);

  useEffect(() => setPage(1), [status, productFilter, search]);

  const filtersActive = search !== "" || status !== "all" || productFilter !== "all";
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setProductFilter("all");
  };

  const columns: Column<StockItem>[] = [
    {
      key: "product",
      title: "المنتج",
      primary: true,
      render: (_, row) => <span className="text-[13px] font-semibold text-fg">{row.product?.nameAr}</span>,
    },
    {
      key: "data",
      title: "بيانات الاشتراك",
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span className="max-w-[16rem] truncate font-mono text-xs text-fg-muted" dir="ltr">
            {showData[row.id] ? String(val) : "••••••••••••"}
          </span>
          <IconButton
            label={showData[row.id] ? "إخفاء البيانات" : "عرض البيانات"}
            onClick={() => setShowData((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
            icon={showData[row.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          />
        </div>
      ),
    },
    {
      key: "isDelivered",
      title: "الحالة",
      render: (val) => (
        <Badge variant={val ? "gray" : "success"} dot>
          {val ? "مُسلَّم" : "متاح"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      title: "تاريخ الإضافة",
      hideOnMobile: true,
      render: (val) => <span className="whitespace-nowrap text-xs text-fg-muted">{formatDate(String(val))}</span>,
    },
    {
      key: "actions",
      title: "",
      align: "end",
      cardHidden: true,
      render: (_, row) =>
        row.isDelivered ? (
          <span className="text-xs text-fg-subtle">—</span>
        ) : (
          <IconButton
            label="حذف عنصر المخزون"
            variant="soft-danger"
            onClick={() => setDeleteId(row.id)}
            icon={<Trash2 className="h-3.5 w-3.5" />}
          />
        ),
    },
  ];

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="مخزون الاشتراكات"
        description="بيانات الاشتراكات الجاهزة للتسليم التلقائي عند الشراء"
        actions={
          <Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>
            إضافة مخزون
          </Button>
        }
      />

      <AdminStats
        items={[
          { label: "إجمالي العناصر", value: stock.length, icon: Archive, color: statColors.blue },
          { label: "متاح للتسليم", value: available, icon: CheckCircle2, color: statColors.green },
          { label: "تم تسليمه", value: delivered, icon: PackageCheck, color: statColors.gray },
          { label: "منتجات مخزونها منخفض", value: lowStockProducts, icon: Archive, color: statColors.amber },
        ]}
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث باسم المنتج..." label="بحث في المخزون" />
        <Tabs
          ariaLabel="تصفية المخزون"
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          items={[
            { value: "all", label: "الكل", count: stock.length },
            { value: "available", label: "متاح", count: available },
            { value: "delivered", label: "مُسلَّم", count: delivered },
          ]}
        />
        {productOptions.length > 1 && (
          <FilterSelect
            label="تصفية حسب المنتج"
            value={productFilter}
            onChange={setProductFilter}
            options={[{ value: "all", label: "كل المنتجات" }, ...productOptions]}
          />
        )}
      </Toolbar>

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        error={error}
        onRetry={fetchStock}
        empty={
          filtersActive ? (
            <NoResultsState query={search} onClear={clearFilters} />
          ) : (
            <EmptyState
              icon={Archive}
              title="المخزون فارغ"
              description="أضف بيانات الاشتراكات ليتم تسليمها تلقائياً للعملاء فور الشراء."
              action={
                <Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>
                  إضافة مخزون
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

      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة مخزون جديد"
        description="ستُسلَّم هذه البيانات تلقائياً للعملاء عند شراء المنتج."
        size="md"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Select
            label="المنتج"
            required
            value={form.productId}
            onChange={(e) => setForm({ ...form, productId: e.target.value })}
            options={[{ value: "", label: "اختر منتجاً..." }, ...products.map((p) => ({ value: p.id, label: p.nameAr }))]}
          />
          <Textarea
            label="بيانات الاشتراكات"
            required
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
            placeholder={"بيانات الاشتراك الأول\n---\nبيانات الاشتراك الثاني"}
            hint="افصل بين كل اشتراك بسطر يحتوي على --- لإضافة عدة عناصر دفعة واحدة."
            rows={8}
          />
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" type="button" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={addLoading}>
              إضافة
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="حذف عنصر المخزون"
        message="سيُحذف هذا الاشتراك نهائياً ولن يكون متاحاً للتسليم."
        confirmLabel="نعم، احذف"
        loading={deleting}
      />
    </div>
  );
}
