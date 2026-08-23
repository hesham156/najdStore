"use client";
/* TEMPORARY: reproduces the customers table so the sticky header can be measured. */
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Column, DataTable } from "@/components/ui/DataTable";

interface Row { id: string; name: string; phone: string; orders: number; spent: string; active: boolean; created: string }

const ROWS: Row[] = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  name: `عميل رقم ${i + 1}`,
  phone: "0555000" + String(i).padStart(3, "0"),
  orders: i % 7,
  spent: `${(i * 37).toFixed(2)} ر.س`,
  active: i % 4 !== 0,
  created: "12 أغسطس 2026",
}));

export default function TableProbe() {
  const [selected, setSelected] = useState<string[]>([]);
  const columns: Column<Row>[] = [
    {
      key: "name", title: "العميل", primary: true, sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-violet-600 text-[13px] font-bold text-white">
            {row.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-fg">{row.name}</p>
            <p className="truncate text-[11px] text-fg-muted">c{row.id}@example.com</p>
          </div>
        </div>
      ),
    },
    { key: "phone", title: "الهاتف" },
    { key: "orders", title: "الطلبات", sortable: true, align: "center" },
    { key: "spent", title: "إجمالي الإنفاق", sortable: true },
    { key: "active", title: "الحالة", render: (v) => <Badge variant={v ? "success" : "danger"} dot>{v ? "نشط" : "معطل"}</Badge> },
    { key: "created", title: "تاريخ التسجيل", sortable: true },
  ];

  return (
    <div className="admin-scope min-h-screen">
      {/* stand-in for the admin top bar */}
      <header className="sticky top-0 z-header flex h-[var(--header-h)] items-center border-b border-line bg-surface/85 px-5 backdrop-blur">
        <span className="text-sm font-bold text-fg">العملاء</span>
      </header>
      <main className="p-6">
        <DataTable
          columns={columns}
          data={ROWS}
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
          sortKey="name"
          sortDirection="asc"
          onSort={() => {}}
        />
      </main>
    </div>
  );
}
