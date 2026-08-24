"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DollarSign, Eye, ShoppingBag, UserCheck, Users, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Column, DataTable, Pagination } from "@/components/ui/DataTable";
import { EmptyState, NoResultsState } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { ImportExportBar } from "@/components/admin/ImportExportBar";
import { SearchInput, Toolbar, ToolbarSpacer } from "@/components/admin/Toolbar";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  role: string;
  createdAt: string;
  _count: { orders: number };
  totalSpent?: number;
}

type StatusFilter = "all" | "active" | "inactive" | "buyers";
type SortKey = "name" | "orders" | "totalSpent" | "createdAt";

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) setCustomers(data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchCustomers();
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  const counts = useMemo(
    () => ({
      all: customers.length,
      active: customers.filter((c) => c.isActive).length,
      inactive: customers.filter((c) => !c.isActive).length,
      buyers: customers.filter((c) => (c._count?.orders ?? 0) > 0).length,
    }),
    [customers]
  );

  const stats = useMemo(() => {
    const spent = customers.reduce((s, c) => s + (Number(c.totalSpent) || 0), 0);
    return { total: customers.length, active: counts.active, withOrders: counts.buyers, spent };
  }, [customers, counts]);

  const filtered = useMemo(() => {
    const rows = customers.filter((c) => {
      if (status === "active") return c.isActive;
      if (status === "inactive") return !c.isActive;
      if (status === "buyers") return (c._count?.orders ?? 0) > 0;
      return true;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "ar") * dir;
        case "orders":
          return ((a._count?.orders ?? 0) - (b._count?.orders ?? 0)) * dir;
        case "totalSpent":
          return ((Number(a.totalSpent) || 0) - (Number(b.totalSpent) || 0)) * dir;
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });
  }, [customers, status, sortKey, sortDir]);

  useEffect(() => setPage(1), [status]);

  const filtersActive = search !== "" || status !== "all";
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
  };

  const columns: Column<Customer>[] = [
    {
      key: "name",
      title: "العميل",
      sortable: true,
      primary: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-[13px] font-bold text-white"
            aria-hidden
          >
            {row.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-fg">{row.name}</p>
            <p className="truncate text-[11px] text-fg-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      title: "الهاتف",
      hideOnMobile: true,
      render: (val) => (
        <span className="text-[13px] text-fg-muted" dir="ltr">
          {String(val || "—")}
        </span>
      ),
    },
    {
      key: "orders",
      title: "الطلبات",
      sortable: true,
      align: "center",
      render: (_, row) => <span className="text-[13px] font-semibold tnum text-fg">{row._count?.orders ?? 0}</span>,
    },
    {
      key: "totalSpent",
      title: "إجمالي الإنفاق",
      sortable: true,
      render: (val) => (
        <span className="whitespace-nowrap text-[13px] font-bold tnum text-fg">
          {val != null ? formatCurrency(Number(val)) : "—"}
        </span>
      ),
    },
    {
      key: "isActive",
      title: "الحالة",
      render: (val) => (
        <Badge variant={val ? "success" : "danger"} dot>
          {val ? "نشط" : "معطل"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      title: "تاريخ التسجيل",
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
        <Link href={`/admin/customers/${row.id}`} onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="secondary" icon={<Eye className="h-3.5 w-3.5" />}>
            عرض
          </Button>
        </Link>
      ),
    },
  ];

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="العملاء"
        description={`${filtered.length} عميل${filtersActive ? " بعد التصفية" : ""}`}
        actions={<ImportExportBar entity="customers" onImported={fetchCustomers} />}
      />

      <AdminStats
        items={[
          { label: "إجمالي العملاء", value: stats.total, icon: Users, color: statColors.blue },
          { label: "حسابات نشطة", value: stats.active, icon: UserCheck, color: statColors.green },
          { label: "لديهم طلبات", value: stats.withOrders, icon: ShoppingBag, color: statColors.amber },
          { label: "إجمالي الإنفاق", value: formatCurrency(stats.spent), icon: DollarSign, color: statColors.primary },
        ]}
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="الاسم، البريد، الجوال..." label="بحث عن عميل" />
        <Tabs
          ariaLabel="تصفية العملاء"
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          items={[
            { value: "all", label: "الكل", count: counts.all },
            { value: "buyers", label: "لديهم طلبات", count: counts.buyers },
            { value: "active", label: "نشط", count: counts.active },
            { value: "inactive", label: "معطل", count: counts.inactive },
          ]}
        />
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
        onRetry={fetchCustomers}
        onRowClick={(row) => router.push(`/admin/customers/${row.id}`)}
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
              icon={UsersRound}
              title="لا يوجد عملاء بعد"
              description="سيظهر العملاء هنا بمجرد تسجيل أول حساب في المتجر."
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
