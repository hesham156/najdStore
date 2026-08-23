"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ShoppingCart, DollarSign, Users, Trash2, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Column, DataTable, Pagination } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/States";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface CartItem {
  id: string;
  nameAr?: string;
  image?: string | null;
  price: number;
  quantity: number;
  variantLabel?: string | null;
}
interface AbandonedCart {
  id: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: CartItem[];
  itemCount: number;
  total: number | string;
  status: string;
  updatedAt: string;
}

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/abandoned-carts");
      const data = await res.json();
      if (data.success) setCarts(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/abandoned-carts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { setCarts((c) => c.filter((x) => x.id !== id)); toast.success("تم الحذف"); }
      else toast.error("تعذّر الحذف");
    } finally {
      setDeletingId(null);
    }
  };

  const stats = useMemo(() => {
    const totalValue = carts.reduce((s, c) => s + Number(c.total), 0);
    const withCustomer = carts.filter((c) => c.customerName || c.customerEmail).length;
    return { count: carts.length, value: totalValue, withCustomer };
  }, [carts]);

  const columns: Column<AbandonedCart>[] = [
    {
      key: "customerName",
      title: "العميل",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(row.customerName || "؟").charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{row.customerName || "زائر غير مسجّل"}</p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(row.updatedAt), { addSuffix: true, locale: ar })}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "total",
      title: "السعر",
      render: (val) => <span className="font-bold">{formatCurrency(Number(val))}</span>,
    },
    {
      key: "items",
      title: "المنتجات",
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          {row.items.slice(0, 4).map((it, i) => (
            <div key={i} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0 flex items-center justify-center">
              {it.image ? (
                <Image src={it.image} alt={it.nameAr || ""} width={32} height={32} className="w-full h-full object-cover" unoptimized />
              ) : (
                <Package className="h-4 w-4 text-gray-400" />
              )}
            </div>
          ))}
          {row.itemCount > 4 && <span className="text-xs text-gray-500">+{row.itemCount - 4}</span>}
        </div>
      ),
    },
    {
      key: "status",
      title: "الحالة",
      render: () => <Badge variant="info">متروكة</Badge>,
    },
    {
      key: "id",
      title: "إجراءات",
      render: (_, row) => (
        <Button size="sm" variant="soft-danger" onClick={() => remove(row.id)} loading={deletingId === row.id}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  const totalPages = Math.ceil(carts.length / pageSize);
  const paginated = carts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="السلات المتروكة" description={`${carts.length} سلة لم تكتمل`} />

      <AdminStats
        items={[
          { label: "عدد السلات", value: stats.count, icon: ShoppingCart, color: statColors.blue },
          { label: "قيمتها الإجمالية", value: formatCurrency(stats.value), icon: DollarSign, color: statColors.primary },
          { label: "عملاء مسجّلون", value: stats.withCustomer, icon: Users, color: statColors.green },
        ]}
      />

      {!loading && carts.length === 0 ? (
        <EmptyState icon={<ShoppingCart className="h-8 w-8" />} title="لا توجد سلات متروكة" description="ستظهر هنا سلات العملاء التي لم تتحوّل إلى طلبات." />
      ) : (
        <>
          <DataTable columns={columns} data={paginated} loading={loading} emptyMessage="لا توجد سلات متروكة" />
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={carts.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </>
      )}
    </div>
  );
}
