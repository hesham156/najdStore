"use client";

import { useState, useEffect, useCallback } from "react";
import { Receipt, Plus, Printer, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/admin/PageHeader";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  issuedAt: string;
  total: number;
  taxAmount: number;
  taxRate: number;
  subtotal: number;
  discountAmount: number;
  order: {
    orderNumber: string;
    user: { name: string; email: string };
  };
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/accounting/invoices");
    const data = await res.json();
    if (data.success) setInvoices(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const generateInvoice = async () => {
    if (!orderIdInput.trim()) return toast.error("أدخل رقم الطلب أو ID الطلب");
    setGenerating(true);
    const res = await fetch("/api/admin/accounting/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: orderIdInput.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`تم إصدار الفاتورة ${data.data.invoiceNumber}`);
      setOrderIdInput("");
      fetchInvoices();
    } else {
      toast.error(data.error || "حدث خطأ");
    }
    setGenerating(false);
  };

  const filtered = search.trim()
    ? invoices.filter(i =>
        i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        i.order?.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        i.order?.user?.name?.toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  const totalRevenue = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalTax     = invoices.reduce((s, i) => s + Number(i.taxAmount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/admin" },
          { label: "المحاسبة", href: "/admin/accounting" },
          { label: "الفواتير الضريبية" },
        ]}
        title="الفواتير الضريبية"
        description="إصدار وإدارة فواتير ضريبة القيمة المضافة"
      />

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
            <Receipt className="h-5 w-5 text-info" />
          </div>
          <div>
            <p className="text-xl font-black text-fg">{invoices.length}</p>
            <p className="text-xs text-fg-muted">إجمالي الفواتير</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="text-xl font-black text-fg">{totalRevenue.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</p>
            <p className="text-xs text-fg-muted">إجمالي الإيراد المفوتر</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-xl font-black text-fg">{totalTax.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س</p>
            <p className="text-xs text-fg-muted">إجمالي ضريبة القيمة المضافة</p>
          </div>
        </Card>
      </div>

      {/* Generate new invoice */}
      <Card className="p-5 border-2 border-dashed border-line">
        <h3 className="font-bold text-fg mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4" /> إصدار فاتورة لطلب
        </h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="أدخل ID الطلب (من صفحة الطلبات)"
              value={orderIdInput}
              onChange={e => setOrderIdInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generateInvoice()}
            />
          </div>
          <Button onClick={generateInvoice} loading={generating} className="gap-2 shrink-0">
            <Receipt className="h-4 w-4" /> إصدار
          </Button>
        </div>
        <p className="text-xs text-fg-subtle mt-2">💡 انسخ الـ ID من قائمة الطلبات أو من URL صفحة الطلب</p>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث برقم الفاتورة أو الطلب أو العميل..."
          className="w-full ps-4 pe-10 py-2.5 rounded-xl border border-line bg-surface text-sm text-fg placeholder:text-fg-subtle focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Invoices table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-fg-subtle animate-pulse">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">🧾</div>
            <p className="font-semibold text-fg-muted">لا توجد فواتير</p>
            <p className="text-sm text-fg-subtle mt-1">أصدر أول فاتورة باستخدام النموذج أعلاه</p>
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-surface-muted text-xs font-bold text-fg-muted uppercase tracking-wider">
              <div className="col-span-2">رقم الفاتورة</div>
              <div className="col-span-2">رقم الطلب</div>
              <div className="col-span-3">العميل</div>
              <div className="col-span-2">التاريخ</div>
              <div className="col-span-1 text-end">الضريبة</div>
              <div className="col-span-1 text-end">الإجمالي</div>
              <div className="col-span-1 text-center">طباعة</div>
            </div>
            {filtered.map(inv => (
              <div key={inv.id} className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-surface-hover transition-colors">
                <div className="col-span-2">
                  <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">{inv.invoiceNumber}</span>
                </div>
                <div className="col-span-2 font-mono text-xs text-fg-muted">{inv.order?.orderNumber}</div>
                <div className="col-span-3">
                  <p className="text-sm font-medium text-fg truncate">{inv.order?.user?.name}</p>
                  <p className="text-xs text-fg-subtle truncate">{inv.order?.user?.email}</p>
                </div>
                <div className="col-span-2 text-sm text-fg-muted">{new Date(inv.issuedAt).toLocaleDateString("ar-SA")}</div>
                <div className="col-span-1 text-end text-sm font-semibold text-warning">
                  {Number(inv.taxAmount).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                </div>
                <div className="col-span-1 text-end text-sm font-black text-fg">
                  {Number(inv.total).toLocaleString("ar-SA", { minimumFractionDigits: 2 })}
                </div>
                <div className="col-span-1 flex justify-center">
                  <a
                    href={`/api/admin/accounting/invoices/${inv.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-fg-subtle hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    title="عرض وطباعة"
                  >
                    <Printer className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
