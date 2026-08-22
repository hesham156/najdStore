"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, DollarSign, ExternalLink, Wallet } from "lucide-react";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Column, DataTable, Pagination } from "@/components/ui/DataTable";
import { EmptyState, NoResultsState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { SearchInput, Toolbar } from "@/components/admin/Toolbar";
import { formatCurrency, formatDate, getPaymentMethodLabel } from "@/lib/utils";

interface Payment {
  id: string;
  method: string;
  status: string;
  amount: number;
  proofImage?: string;
  transactionId?: string;
  reviewedAt?: string;
  createdAt: string;
  order: { id: string; orderNumber: string; user: { name: string; email: string } };
}

const STATUS_TABS = [
  { value: "", label: "الكل" },
  { value: "UPLOADED", label: "بانتظار المراجعة" },
  { value: "APPROVED", label: "موافق عليه" },
  { value: "PENDING", label: "في الانتظار" },
  { value: "REJECTED", label: "مرفوض" },
];

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/payments${qs}`);
      const data = await res.json();
      if (data.success) setPayments(data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const stats = useMemo(() => {
    let approved = 0;
    let pendingReview = 0;
    let rejected = 0;
    for (const p of payments) {
      if (p.status === "APPROVED") approved += Number(p.amount) || 0;
      if (p.status === "UPLOADED") pendingReview++;
      if (p.status === "REJECTED") rejected++;
    }
    return { total: payments.length, approved, pendingReview, rejected };
  }, [payments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(
      (p) =>
        p.order?.orderNumber?.toLowerCase().includes(q) ||
        p.order?.user?.name?.toLowerCase().includes(q) ||
        p.order?.user?.email?.toLowerCase().includes(q) ||
        p.transactionId?.toLowerCase().includes(q)
    );
  }, [payments, search]);

  useEffect(() => setPage(1), [search, statusFilter]);

  const columns: Column<Payment>[] = [
    {
      key: "orderNumber",
      title: "الطلب",
      primary: true,
      render: (_, row) => (
        <Link
          href={`/admin/orders/${row.order?.id}`}
          className="font-mono text-xs font-bold text-primary-600 hover:underline dark:text-primary-400"
        >
          {row.order?.orderNumber}
        </Link>
      ),
    },
    {
      key: "customer",
      title: "العميل",
      render: (_, row) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-fg">{row.order?.user?.name}</p>
          <p className="truncate text-[11px] text-fg-muted">{row.order?.user?.email}</p>
        </div>
      ),
    },
    {
      key: "amount",
      title: "المبلغ",
      render: (val) => <span className="whitespace-nowrap text-[13px] font-bold tnum text-fg">{formatCurrency(String(val))}</span>,
    },
    {
      key: "method",
      title: "الطريقة",
      hideOnMobile: true,
      render: (val) => <span className="text-[13px] text-fg-muted">{getPaymentMethodLabel(String(val))}</span>,
    },
    {
      key: "status",
      title: "الحالة",
      render: (val) => {
        const b = getStatusBadge(String(val));
        return (
          <Badge variant={b.variant} dot>
            {b.label}
          </Badge>
        );
      },
    },
    {
      key: "proofImage",
      title: "الإثبات",
      hideOnMobile: true,
      render: (val) =>
        val ? (
          <a
            href={String(val)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            عرض
          </a>
        ) : (
          <span className="text-xs text-fg-subtle">—</span>
        ),
    },
    {
      key: "createdAt",
      title: "التاريخ",
      hideOnMobile: true,
      render: (val) => <span className="whitespace-nowrap text-xs text-fg-muted">{formatDate(String(val))}</span>,
    },
    {
      key: "actions",
      title: "",
      align: "end",
      cardHidden: true,
      render: (_, row) =>
        row.status === "UPLOADED" ? (
          <Link href={`/admin/orders/${row.order?.id}`}>
            <Button size="sm" variant="secondary">
              مراجعة
            </Button>
          </Link>
        ) : (
          <span className="text-xs text-fg-subtle">—</span>
        ),
    },
  ];

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="المدفوعات" description={`${filtered.length} عملية دفع`} />

      <AdminStats
        items={[
          { label: "إجمالي العمليات", value: stats.total, icon: CreditCard, color: statColors.blue },
          { label: "المبالغ المقبولة", value: formatCurrency(stats.approved), icon: DollarSign, color: statColors.green },
          { label: "بانتظار المراجعة", value: stats.pendingReview, icon: Clock, color: statColors.amber },
          { label: "مرفوضة", value: stats.rejected, icon: CheckCircle2, color: statColors.red },
        ]}
      />

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="رقم الطلب، العميل، رقم المعاملة..."
          label="بحث في المدفوعات"
        />
        <Tabs ariaLabel="تصفية حسب حالة الدفع" value={statusFilter} onChange={setStatusFilter} items={STATUS_TABS} />
      </Toolbar>

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        error={error}
        onRetry={loadPayments}
        empty={
          search || statusFilter ? (
            <NoResultsState
              query={search}
              onClear={() => {
                setSearch("");
                setStatusFilter("");
              }}
            />
          ) : (
            <EmptyState
              icon={Wallet}
              title="لا توجد مدفوعات بعد"
              description="ستظهر عمليات الدفع هنا فور قيام العملاء بالشراء."
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
    </div>
  );
}
