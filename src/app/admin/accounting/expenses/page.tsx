"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Pencil, X, Check, TrendingDown, Filter } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/admin/PageHeader";

interface Expense {
  id: string;
  titleAr: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
}

const CATEGORIES = [
  { value: "HOSTING",   label: "🖥 استضافة وخوادم" },
  { value: "MARKETING", label: "📣 تسويق وإعلانات" },
  { value: "SALARY",    label: "👤 رواتب" },
  { value: "TOOLS",     label: "🛠 برامج وأدوات" },
  { value: "PURCHASE",  label: "📦 مشتريات" },
  { value: "TAX",       label: "🏛 ضرائب ورسوم" },
  { value: "OTHER",     label: "📁 أخرى" },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

const emptyForm = { titleAr: "", amount: "", category: "OTHER", date: new Date().toISOString().split("T")[0], notes: "" };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCat, setFilterCat] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const qs = filterCat ? `?category=${filterCat}` : "";
    const res = await fetch(`/api/admin/accounting/expenses${qs}`);
    const data = await res.json();
    if (data.success) setExpenses(data.data);
    setLoading(false);
  }, [filterCat]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const handleSave = async () => {
    if (!form.titleAr.trim() || !form.amount) return toast.error("يرجى ملء الحقول المطلوبة");
    setSaving(true);
    const url = editId ? `/api/admin/accounting/expenses/${editId}` : "/api/admin/accounting/expenses";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) {
      toast.success(editId ? "تم تعديل المصروف" : "تم إضافة المصروف");
      setShowForm(false); setEditId(null); setForm(emptyForm);
      fetchExpenses();
    } else {
      toast.error(data.error || "حدث خطأ");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/accounting/expenses/${id}`, { method: "DELETE" });
    if ((await res.json()).success) { toast.success("تم حذف المصروف"); fetchExpenses(); }
    setDeleteId(null);
  };

  const startEdit = (e: Expense) => {
    setForm({ titleAr: e.titleAr, amount: String(e.amount), category: e.category, date: e.date.split("T")[0], notes: e.notes || "" });
    setEditId(e.id); setShowForm(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/admin" },
          { label: "المحاسبة", href: "/admin/accounting" },
          { label: "المصاريف" },
        ]}
        title="المصاريف والتكاليف"
        description="تسجيل ومتابعة جميع مصاريف العمل"
        actions={
          <Button
            onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
            icon={<Plus className="h-4 w-4" />}
          >
            إضافة مصروف
          </Button>
        }
      />

      {/* Summary + Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="p-4 flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
            <TrendingDown className="h-5 w-5 text-danger" />
          </div>
          <div>
            <p className="text-xl font-black text-fg">
              {totalExpenses.toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
            </p>
            <p className="text-xs text-fg-muted">إجمالي المصاريف المعروضة</p>
          </div>
        </Card>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-fg-subtle shrink-0" />
          <button onClick={() => setFilterCat("")} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${!filterCat ? "bg-primary-600 text-white" : "bg-surface-sunken text-fg-muted"}`}>الكل</button>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setFilterCat(c.value)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filterCat === c.value ? "bg-primary-600 text-white" : "bg-surface-sunken text-fg-muted"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="p-5 border-2 border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-fg">{editId ? "تعديل المصروف" : "إضافة مصروف جديد"}</h3>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="p-1.5 rounded-lg text-fg-subtle hover:bg-surface-hover transition-colors"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="وصف المصروف *" value={form.titleAr} onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))} placeholder="مثال: استضافة VPS شهر يناير" />
            <Input label="المبلغ (ريال) *" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            <div>
              <label className="block text-sm font-medium text-fg mb-1.5">الفئة</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-line-strong bg-surface text-fg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <Input label="التاريخ" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <div className="sm:col-span-2">
              <Input label="ملاحظات (اختياري)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="تفاصيل إضافية..." />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={handleSave} loading={saving} className="gap-2"><Check className="h-4 w-4" />{editId ? "حفظ التعديلات" : "إضافة"}</Button>
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditId(null); }}>إلغاء</Button>
          </div>
        </Card>
      )}

      {/* Expenses Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-fg-subtle animate-pulse">جاري التحميل...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-5xl mb-3">📂</div>
            <p className="font-semibold text-fg-muted">لا توجد مصاريف</p>
            <p className="text-sm text-fg-subtle mt-1">أضف أول مصروف للبدء في تتبع التكاليف</p>
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {/* Table head */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-surface-muted text-xs font-bold text-fg-muted uppercase tracking-wider">
              <div className="col-span-4">الوصف</div>
              <div className="col-span-2">الفئة</div>
              <div className="col-span-2">التاريخ</div>
              <div className="col-span-2 text-end">المبلغ</div>
              <div className="col-span-2 text-center">إجراءات</div>
            </div>
            {expenses.map(expense => (
              <div key={expense.id} className="grid grid-cols-12 gap-3 px-5 py-4 items-center hover:bg-surface-hover transition-colors">
                <div className="col-span-4">
                  <p className="font-semibold text-sm text-fg">{expense.titleAr}</p>
                  {expense.notes && <p className="text-xs text-fg-subtle mt-0.5 truncate">{expense.notes}</p>}
                </div>
                <div className="col-span-2">
                  {/* Expense categories are neutral: a tax line is not an error,
                      and hosting is not "info". The label carries the meaning. */}
                  <span className="inline-flex rounded-lg bg-surface-sunken px-2 py-0.5 text-xs font-medium text-fg-muted">
                    {CATEGORY_MAP[expense.category] ?? expense.category}
                  </span>
                </div>
                <div className="col-span-2 text-sm text-fg-muted">
                  {new Date(expense.date).toLocaleDateString("ar-SA")}
                </div>
                <div className="col-span-2 text-end font-bold text-fg">
                  {Number(expense.amount).toLocaleString("ar-SA", { minimumFractionDigits: 2 })} ر.س
                </div>
                <div className="col-span-2 flex items-center justify-center gap-2">
                  <button onClick={() => startEdit(expense)} className="p-1.5 rounded-lg text-fg-subtle hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                  {deleteId === expense.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(expense.id)} className="p-1.5 rounded-lg text-danger hover:bg-danger/10"><Check className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteId(null)} className="p-1.5 rounded-lg text-fg-subtle hover:bg-surface-hover"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(expense.id)} className="p-1.5 rounded-lg text-fg-subtle hover:text-danger hover:bg-danger/10 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
