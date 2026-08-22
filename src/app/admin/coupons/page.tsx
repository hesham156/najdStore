"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { BadgePercent, CheckCircle2, Plus, TicketPercent, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Column, DataTable, Pagination } from "@/components/ui/DataTable";
import { EmptyState, NoResultsState } from "@/components/ui/States";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { SearchInput, Toolbar } from "@/components/admin/Toolbar";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

const EMPTY_FORM = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minOrderAmount: "",
  maxUses: "",
  expiresAt: "",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (data.success) setCoupons(data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          discountType: form.discountType,
          discountValue: parseFloat(form.discountValue),
          minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : undefined,
          maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
          expiresAt: form.expiresAt || undefined,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم إنشاء الكوبون");
        setAddOpen(false);
        setForm(EMPTY_FORM);
        fetchCoupons();
      } else {
        toast.error(data.error || "تعذّر إنشاء الكوبون");
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
      const res = await fetch(`/api/admin/coupons/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حذف الكوبون");
        fetchCoupons();
      } else {
        toast.error(data.error || "تعذّر حذف الكوبون");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const isExpired = (c: Coupon) => !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();

  const stats = useMemo(() => {
    const active = coupons.filter((c) => c.isActive && !isExpired(c)).length;
    const uses = coupons.reduce((s, c) => s + (c.usedCount || 0), 0);
    const expired = coupons.filter(isExpired).length;
    return { total: coupons.length, active, uses, expired };
  }, [coupons]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return coupons;
    return coupons.filter((c) => c.code.toLowerCase().includes(q));
  }, [coupons, search]);

  useEffect(() => setPage(1), [search]);

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      title: "الكود",
      primary: true,
      render: (val, row) => (
        <div className="min-w-0">
          <span className="font-mono text-[13px] font-bold text-primary-600 dark:text-primary-400">{String(val)}</span>
          {row.minOrderAmount ? (
            <p className="text-[11px] text-fg-subtle">حد أدنى {formatCurrency(row.minOrderAmount)}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "discountType",
      title: "الخصم",
      render: (val, row) => (
        <span className="whitespace-nowrap text-[13px] font-bold tnum text-fg">
          {val === "PERCENTAGE" ? `${row.discountValue}%` : formatCurrency(row.discountValue)}
        </span>
      ),
    },
    {
      key: "usedCount",
      title: "الاستخدام",
      render: (val, row) => {
        const used = Number(val);
        const max = row.maxUses;
        return (
          <div className="min-w-[5rem]">
            <span className="text-[13px] tnum text-fg">
              {used} / {max ?? "∞"}
            </span>
            {max ? (
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{ width: `${Math.min(100, (used / max) * 100)}%` }}
                />
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "isActive",
      title: "الحالة",
      render: (val, row) => {
        if (isExpired(row)) return <Badge variant="danger" dot>منتهي</Badge>;
        return (
          <Badge variant={val ? "success" : "gray"} dot>
            {val ? "نشط" : "معطل"}
          </Badge>
        );
      },
    },
    {
      key: "expiresAt",
      title: "انتهاء الصلاحية",
      hideOnMobile: true,
      render: (val) => (
        <span className="whitespace-nowrap text-xs text-fg-muted">{val ? formatDate(String(val)) : "بدون انتهاء"}</span>
      ),
    },
    {
      key: "actions",
      title: "",
      align: "end",
      cardHidden: true,
      render: (_, row) => (
        <IconButton
          label={`حذف الكوبون ${row.code}`}
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
        title="الكوبونات"
        description={`${filtered.length} كوبون خصم`}
        actions={
          <Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>
            كوبون جديد
          </Button>
        }
      />

      <AdminStats
        items={[
          { label: "إجمالي الكوبونات", value: stats.total, icon: TicketPercent, color: statColors.blue },
          { label: "كوبونات فعّالة", value: stats.active, icon: CheckCircle2, color: statColors.green },
          { label: "مرات الاستخدام", value: stats.uses, icon: Users, color: statColors.primary },
          { label: "منتهية الصلاحية", value: stats.expired, icon: BadgePercent, color: statColors.amber },
        ]}
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بكود الكوبون..." label="بحث عن كوبون" />
      </Toolbar>

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        error={error}
        onRetry={fetchCoupons}
        empty={
          search ? (
            <NoResultsState query={search} onClear={() => setSearch("")} />
          ) : (
            <EmptyState
              icon={TicketPercent}
              title="لا توجد كوبونات بعد"
              description="أنشئ كوبون خصم لتشجيع العملاء على إتمام الشراء."
              action={
                <Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>
                  إنشاء كوبون
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
        title="إنشاء كوبون جديد"
        description="يستخدمه العميل عند إتمام الطلب للحصول على الخصم."
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="كود الكوبون"
            required
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="SAVE20"
            hint="حروف إنجليزية وأرقام — يُكتب تلقائياً بحروف كبيرة."
          />
          <Select
            label="نوع الخصم"
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
            options={[
              { value: "PERCENTAGE", label: "نسبة مئوية %" },
              { value: "FIXED", label: "مبلغ ثابت" },
            ]}
          />
          <Input
            label={form.discountType === "PERCENTAGE" ? "قيمة الخصم (%)" : "قيمة الخصم (ر.س)"}
            required
            type="number"
            min="0"
            step="0.01"
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            placeholder="20"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="الحد الأدنى للطلب"
              type="number"
              min="0"
              value={form.minOrderAmount}
              onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
              placeholder="100"
              hint="اختياري"
            />
            <Input
              label="الحد الأقصى للاستخدام"
              type="number"
              min="1"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              placeholder="50"
              hint="اتركه فارغاً لعدد غير محدود"
            />
          </div>
          <Input
            label="تاريخ الانتهاء"
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            hint="اختياري — بدونه يبقى الكوبون فعّالاً."
          />
          <div className="flex justify-end gap-2.5 pt-1">
            <Button variant="secondary" type="button" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={addLoading}>
              إنشاء الكوبون
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="حذف الكوبون"
        message="سيُحذف الكوبون نهائياً ولن يعمل مع أي طلب جديد."
        confirmLabel="نعم، احذف"
        loading={deleting}
      />
    </div>
  );
}
