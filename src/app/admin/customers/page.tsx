"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Users, Search, Eye, UserCheck, ShoppingBag, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { AdminStats } from "@/components/admin/AdminStats";
import { DataTable, Column, Pagination } from "@/components/ui/DataTable";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";

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

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/customers?search=${search}`);
    const data = await res.json();
    if (data.success) setCustomers(data.data);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => { fetchCustomers(); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  const columns: Column<Customer>[] = [
    {
      key: "name",
      title: "العميل",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {row.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-sm">{row.name}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      title: "الهاتف",
      render: (val) => <span className="text-sm">{String(val || "—")}</span>,
    },
    {
      key: "_count",
      title: "الطلبات",
      render: (val) => <span className="font-bold">{(val as { orders: number }).orders}</span>,
    },
    {
      key: "totalSpent",
      title: "الإنفاق",
      render: (val) => <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">{val != null ? formatCurrency(Number(val)) : "—"}</span>,
    },
    {
      key: "isActive",
      title: "الحالة",
      render: (val) => <Badge variant={val ? "success" : "danger"}>{val ? "نشط" : "معطل"}</Badge>,
    },
    {
      key: "createdAt",
      title: "تاريخ التسجيل",
      render: (val) => <span className="text-xs text-gray-500">{formatDate(String(val))}</span>,
    },
    {
      key: "id",
      title: "إجراءات",
      render: (_, row) => (
        <Link href={`/admin/customers/${row.id}`} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          عرض
        </Link>
      ),
    },
  ];

  const stats = useMemo(() => {
    const active = customers.filter(c => c.isActive).length;
    const withOrders = customers.filter(c => (c._count?.orders ?? 0) > 0).length;
    const spent = customers.reduce((s, c) => s + (Number(c.totalSpent) || 0), 0);
    return { total: customers.length, active, withOrders, spent };
  }, [customers]);

  const totalPages = Math.ceil(customers.length / pageSize);
  const paginatedCustomers = customers.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">العملاء</h1>
          <p className="text-gray-500 text-sm mt-1">{customers.length} عميل</p>
        </div>
      </div>

      <AdminStats items={[
        { label: "إجمالي العملاء", value: stats.total, icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" },
        { label: "نشطون", value: stats.active, icon: UserCheck, color: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400" },
        { label: "لديهم طلبات", value: stats.withOrders, icon: ShoppingBag, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400" },
        { label: "إجمالي الإنفاق", value: formatCurrency(stats.spent), icon: DollarSign, color: "text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400" },
      ]} />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو البريد..." className="ps-10" />
        </div>
      </div>

      <DataTable columns={columns} data={paginatedCustomers} loading={loading} emptyMessage="لا توجد عملاء" />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={customers.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
      />
    </div>
  );
}
