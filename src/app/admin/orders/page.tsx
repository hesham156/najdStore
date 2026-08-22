"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, DollarSign, Eye, ShoppingBag, ShoppingCart } from "lucide-react";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Column, DataTable, Pagination } from "@/components/ui/DataTable";
import { EmptyState, NoResultsState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { FilterSelect, SearchInput, Toolbar, ToolbarSpacer } from "@/components/admin/Toolbar";
import { formatCurrency, formatDate } from "@/lib/utils";
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

const OPEN_STATUSES = ["PENDING", "PENDING_PAYMENT_REVIEW", "PAYMENT_APPROVED", "PROCESSING"];

const PAYMENT_FILTERS = [
  { value: "all", label: "كل حالات الدفع" },
  { value: "APPROVED", label: "دفع مقبول" },
  { value: "UPLOADED", label: "بانتظار المراجعة" },
  { value: "PENDING", label: "لم يُدفع" },
  { value: "REJECTED", label: "دفع مرفوض" },
];

type SortKey = "total" | "createdAt";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      if (data.success) setOrders(data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ── Stats over everything loaded ── */
  const stats = useMemo(() => {
    let revenue = 0;
    let pending = 0;
    let delivered = 0;
    for (const o of orders) {
      if (o.payment?.status === "APPROVED") revenue += parseFloat(String(o.total)) || 0;
      if (OPEN_STATUSES.includes(String(o.status))) pending++;
      if (o.status === "DELIVERED") delivered++;
    }
    return { total: orders.length, revenue, pending, delivered };
  }, [orders]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of orders) m[String(o.status)] = (m[String(o.status)] || 0) + 1;
    return m;
  }, [orders]);

  /* ── Filter + sort ── */
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = orders.filter((o) => {
      if (statusFilter && String(o.status) !== statusFilter) return false;
      if (paymentFilter !== "all") {
        if (paymentFilter === "PENDING" && o.payment && o.payment.status !== "PENDING") return false;
        if (paymentFilter !== "PENDING" && o.payment?.status !== paymentFilter) return false;
      }
      if (!q) return true;
      return (
        o.orderNumber?.toLowerCase().includes(q) ||
        o.user?.name?.toLowerCase().includes(q) ||
        o.user?.email?.toLowerCase().includes(q) ||
        o.user?.phone?.toLowerCase().includes(q)
      );
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) =>
      sortKey === "total"
        ? ((parseFloat(String(a.total)) || 0) - (parseFloat(String(b.total)) || 0)) * dir
        : (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
    );
  }, [orders, statusFilter, paymentFilter, search, sortKey, sortDir]);

  useEffect(() => setPage(1), [statusFilter, paymentFilter, search]);

  const filtersActive = search !== "" || statusFilter !== "" || paymentFilter !== "all";
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPaymentFilter("all");
  };

  const columns: Column<OrderWithDetails>[] = [
    {
      key: "orderNumber",
      title: "رقم الطلب",
      primary: true,
      render: (_, row) => (
        <div className="min-w-0">
          <Link
            href={`/admin/orders/${row.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-xs font-bold text-primary-600 hover:underline dark:text-primary-400"
          >
            {row.orderNumber}
          </Link>
          <p className="mt-0.5 truncate text-[11px] text-fg-subtle md:hidden">{row.user?.name}</p>
        </div>
      ),
    },
    {
      key: "user",
      title: "العميل",
      render: (_, row) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-fg">{row.user?.name}</p>
          <p className="truncate text-[11px] text-fg-muted">{row.user?.phone || row.user?.email}</p>
        </div>
      ),
    },
    {
      key: "items",
      title: "الأصناف",
      align: "center",
      hideOnMobile: true,
      render: (_, row) => <span className="text-[13px] tnum text-fg-muted">{row.items?.length ?? 0}</span>,
    },
    {
      key: "total",
      title: "الإجمالي",
      sortable: true,
      render: (val) => <span className="whitespace-nowrap text-[13px] font-bold tnum text-fg">{formatCurrency(String(val))}</span>,
    },
    {
      key: "status",
      title: "حالة الطلب",
      render: (val) => {
        const b = getStatusBadge(String(val));
        return <Badge variant={b.variant} dot>{b.label}</Badge>;
      },
    },
    {
      key: "payment",
      title: "الدفع",
      render: (_, row) => {
        if (!row.payment) return <span className="text-[11px] text-fg-subtle">—</span>;
        const b = getStatusBadge(row.payment.status);
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: "createdAt",
      title: "التاريخ",
      sortable: true,
      hideOnMobile: true,
      render: (val) => <span className="whitespace-nowrap text-xs text-fg-muted">{formatDate(String(val))}</span>,
    },
    {
      key: "actions",
      title: "",
      align: "end",
      cardHidden: true,
      render: (_, row) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/orders/${row.id}`);
          }}
          icon={<Eye className="h-3.5 w-3.5" />}
        >
          عرض
        </Button>
      ),
    },
  ];

  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="الطلبات"
        description={`${filteredOrders.length} طلب ${filtersActive ? "بعد التصفية" : ""}`.trim()}
      />

      <AdminStats
        items={[
          { label: "إجمالي الطلبات", value: stats.total, icon: ShoppingBag, color: statColors.blue },
          { label: "الإيرادات المحصّلة", value: formatCurrency(stats.revenue), icon: DollarSign, color: statColors.green },
          { label: "قيد التنفيذ", value: stats.pending, icon: Clock, color: statColors.amber },
          { label: "مكتملة", value: stats.delivered, icon: CheckCircle2, color: statColors.primary },
        ]}
      />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="رقم الطلب، العميل، الجوال..."
          label="بحث في الطلبات"
        />
        <FilterSelect
          label="تصفية حسب حالة الدفع"
          value={paymentFilter}
          onChange={setPaymentFilter}
          options={PAYMENT_FILTERS}
        />
        <ToolbarSpacer />
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            مسح التصفية
          </Button>
        )}
      </Toolbar>

      <Tabs
        ariaLabel="تصفية حسب حالة الطلب"
        value={statusFilter}
        onChange={setStatusFilter}
        items={[
          { value: "", label: "الكل", count: orders.length },
          ...STATUSES.filter((s) => statusCounts[s.value]).map((s) => ({
            value: s.value,
            label: s.label,
            count: statusCounts[s.value],
          })),
        ]}
      />

      <DataTable
        columns={columns}
        data={paginatedOrders}
        loading={loading}
        error={error}
        onRetry={fetchOrders}
        onRowClick={(row) => router.push(`/admin/orders/${row.id}`)}
        sortKey={sortKey}
        sortDirection={sortDir}
        onSort={(key, dir) => {
          setSortKey(key as SortKey);
          setSortDir(dir);
        }}
        empty={
          filtersActive ? (
            <NoResultsState query={search} onClear={clearFilters} />
          ) : (
            <EmptyState
              icon={ShoppingCart}
              title="لا توجد طلبات بعد"
              description="ستظهر الطلبات هنا فور قيام أول عميل بالشراء من متجرك."
            />
          )
        }
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={filteredOrders.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />
    </div>
  );
}
