"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const EMPTY_COUNTS = { all: 0, active: 0, inactive: 0, buyers: 0 };
const EMPTY_STATS = { total: 0, active: 0, withOrders: 0, spent: 0 };

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtering, sorting and paging all happen on the server: the list used to
  // fetch a hard-capped 100 rows and slice them here, which silently truncated
  // every larger store and made the KPI row wrong.
  // Every tab, sort and page change is now a request, so a slow earlier one
  // can land after a faster later one. Only the newest may write to state.
  const requestId = useRef(0);

  const fetchCustomers = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    try {
      const qs = new URLSearchParams({
        search,
        status,
        sort: sortKey,
        dir: sortDir,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/admin/customers?${qs}`);
      const data = await res.json();
      if (id !== requestId.current) return;
      if (data.success) {
        setCustomers(data.data);
        setTotal(data.total ?? 0);
        setCounts(data.counts ?? EMPTY_COUNTS);
        setStats(data.stats ?? EMPTY_STATS);
      } else setError(true);
    } catch {
      if (id === requestId.current) setError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [search, status, sortKey, sortDir, page, pageSize]);

  // Only the search box needs debouncing; the rest fire immediately.
  useEffect(() => {
    const t = setTimeout(fetchCustomers, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchCustomers, search]);

  // Any change to what is being shown sends you back to the first page.
  useEffect(() => setPage(1), [search, status, sortKey, sortDir, pageSize]);

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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="العملاء"
        description={`${total} عميل${filtersActive ? " بعد التصفية" : ""}`}
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
        data={customers}
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
        totalItems={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
