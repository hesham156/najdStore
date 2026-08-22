"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollText } from "lucide-react";
import { Column, DataTable, Pagination } from "@/components/ui/DataTable";
import { EmptyState, NoResultsState } from "@/components/ui/States";
import { PageHeader } from "@/components/admin/PageHeader";
import { FilterSelect, SearchInput, Toolbar } from "@/components/admin/Toolbar";
import { formatDateTime } from "@/lib/utils";

interface Log {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
  user: { name: string; email: string };
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/logs");
      const data = await res.json();
      if (data.success) setLogs(data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const entities = useMemo(() => {
    const set = new Set(logs.map((l) => l.entity).filter(Boolean));
    return Array.from(set, (value) => ({ value, label: value }));
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (entity !== "all" && l.entity !== entity) return false;
      if (!q) return true;
      return (
        l.action?.toLowerCase().includes(q) ||
        l.entity?.toLowerCase().includes(q) ||
        l.user?.name?.toLowerCase().includes(q) ||
        l.user?.email?.toLowerCase().includes(q)
      );
    });
  }, [logs, search, entity]);

  useEffect(() => setPage(1), [search, entity]);

  const filtersActive = search !== "" || entity !== "all";
  const clearFilters = () => {
    setSearch("");
    setEntity("all");
  };

  const columns: Column<Log>[] = [
    {
      key: "user",
      title: "المستخدم",
      primary: true,
      render: (_, row) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-fg">{row.user?.name}</p>
          <p className="truncate text-[11px] text-fg-muted">{row.user?.email}</p>
        </div>
      ),
    },
    {
      key: "action",
      title: "الإجراء",
      render: (val) => (
        <code className="rounded bg-surface-sunken px-2 py-0.5 font-mono text-[11px] text-fg-muted">{String(val)}</code>
      ),
    },
    {
      key: "entity",
      title: "الكيان",
      render: (val) => <span className="text-[13px] font-medium text-fg">{String(val)}</span>,
    },
    {
      key: "entityId",
      title: "المعرّف",
      hideOnMobile: true,
      render: (val) => (
        <span className="font-mono text-[11px] text-fg-subtle">{val ? `${String(val).slice(0, 8)}…` : "—"}</span>
      ),
    },
    {
      key: "ipAddress",
      title: "عنوان IP",
      hideOnMobile: true,
      render: (val) => (
        <span className="text-[11px] text-fg-muted" dir="ltr">
          {String(val || "—")}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "التاريخ والوقت",
      render: (val) => <span className="whitespace-nowrap text-xs text-fg-muted">{formatDateTime(String(val))}</span>,
    },
  ];

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="سجل النشاطات" description="كل إجراء قام به المشرفون داخل لوحة الإدارة" />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث بالإجراء أو المستخدم..." label="بحث في السجل" />
        {entities.length > 1 && (
          <FilterSelect
            label="تصفية حسب الكيان"
            value={entity}
            onChange={setEntity}
            options={[{ value: "all", label: "كل الكيانات" }, ...entities]}
          />
        )}
      </Toolbar>

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        error={error}
        onRetry={loadLogs}
        empty={
          filtersActive ? (
            <NoResultsState query={search} onClear={clearFilters} />
          ) : (
            <EmptyState
              icon={ScrollText}
              title="لا توجد سجلات بعد"
              description="ستظهر هنا كل التغييرات التي يجريها المشرفون على المتجر."
            />
          )
        }
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={pageSize}
        pageSizeOptions={[20, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />
    </div>
  );
}
