"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DataTable, Column, Pagination } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Search, ShoppingBag, DollarSign, Clock, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { OrderWithDetails } from "@/types";

const STATUSES = [
  { value: "PENDING", label: "في الانتظار" },
  { value: "PENDING_PAYMENT_REVIEW", label: "مراجعة الدفع" },
  { value: "PAYMENT_APPROVED", label: "تم الدفع" },
  { value: "PROCESSING", label: "جاري المعالجة" },
  { value: "DELIVERED", label: "تم التسليم" },
  { value: "CANCELLED", label: "ملغي" },
  { value: "REFUNDED", label: "مسترد" },
];
const PENDING_SET = ["PENDING", "PENDING_PAYMENT_REVIEW", "PAYMENT_APPROVED", "PROCESSING"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/orders`);
    const data = await res.json();
    if (data.success) setOrders(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  /* ── Stats (from all loaded orders) ── */
  const stats = useMemo(() => {
    let revenue = 0, pending = 0, delivered = 0;
    for (const o of orders) {
      if (o.payment?.status === "APPROVED") revenue += parseFloat(String(o.total)) || 0;
      if (PENDING_SET.includes(String(o.status))) pending++;
      if (o.status === "DELIVERED") delivered++;
    }
    return { total: orders.length, revenue, pending, delivered };
  }, [orders]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of orders) m[String(o.status)] = (m[String(o.status)] || 0) + 1;
    return m;
  }, [orders]);

  /* ── Filter ── */
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter && String(o.status) !== statusFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber?.toLowerCase().includes(q) ||
        o.user?.name?.toLowerCase().includes(q) ||
        o.user?.email?.toLowerCase().includes(q) ||
        o.user?.phone?.toLowerCase().includes(q)
      );
    });
  }, [orders, statusFilter, search]);

  useEffect(() => { setPage(1); }, [statusFilter, search]);

  const columns: Column<OrderWithDetails>[] = [
    {
      key: "orderNumber",
      title: "رقم الطلب",
      render: (_, row) => (
        <Link href={`/admin/orders/${row.id}`} className="font-mono text-primary-600 dark:text-primary-400 hover:underline text-xs font-bold">
          {row.orderNumber}
        </Link>
      ),
    },
    {
      key: "user",
      title: "العميل",
      render: (_, row) => (
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{row.user?.name}</p>
          <p className="text-xs text-gray-500 truncate">{row.user?.phone || row.user?.email}</p>
        </div>
      ),
    },
    {
      key: "items",
      title: "الأصناف",
      render: (_, row) => <span className="text-sm text-gray-600 dark:text-gray-300">{row.items?.length ?? 0}</span>,
    },
    {
      key: "total",
      title: "الإجمالي",
      render: (val) => <span className="font-bold">{formatCurrency(String(val))}</span>,
    },
    {
      key: "status",
      title: "الحالة",
      render: (val) => { const b = getStatusBadge(String(val)); return <Badge variant={b.variant}>{b.label}</Badge>; },
    },
    {
      key: "payment",
      title: "الدفع",
      render: (_, row) => {
        if (!row.payment) return <span className="text-gray-400 text-xs">—</span>;
        const b = getStatusBadge(row.payment.status);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: "createdAt",
      title: "التاريخ",
      render: (val) => <span className="text-xs text-gray-500">{formatDate(String(val))}</span>,
    },
    {
      key: "id",
      title: "إجراءات",
      render: (_, row) => (
        <Link href={`/admin/orders/${row.id}`} className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
          عرض
        </Link>
      ),
    },
  ];

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  const statCards = [
    { label: "إجمالي الطلبات", value: stats.total, icon: ShoppingBag, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" },
    { label: "الإيرادات المحصّلة", value: formatCurrency(stats.revenue), icon: DollarSign, color: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400" },
    { label: "قيد التنفيذ", value: stats.pending, icon: Clock, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400" },
    { label: "مكتملة", value: stats.delivered, icon: CheckCircle, color: "text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">الطلبات</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{orders.length} طلب</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث برقم الطلب أو العميل أو الجوال..."
          className="ps-10"
        />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <StatusTab label="الكل" count={orders.length} active={statusFilter === ""} onClick={() => setStatusFilter("")} />
        {STATUSES.filter((s) => statusCounts[s.value]).map((s) => (
          <StatusTab
            key={s.value}
            label={s.label}
            count={statusCounts[s.value]}
            active={statusFilter === s.value}
            onClick={() => setStatusFilter(s.value)}
          />
        ))}
      </div>

      <DataTable columns={columns} data={paginatedOrders} loading={loading} emptyMessage="لا توجد طلبات" />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={filteredOrders.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      />
    </div>
  );
}

function StatusTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0",
        active
          ? "bg-primary-600 text-white shadow-sm"
          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
      )}
    >
      {label}
      <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", active ? "bg-white/20" : "bg-gray-200 dark:bg-gray-600")}>
        {count}
      </span>
    </button>
  );
}
