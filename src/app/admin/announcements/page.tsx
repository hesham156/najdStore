"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, Megaphone, Tag, Percent, CheckCircle, AlertTriangle, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";

interface Announcement {
  id: string;
  titleAr: string;
  type: string;
  link?: string | null;
  couponCode?: string | null;
  bgColor: string;
  textColor: string;
  isActive: boolean;
  expiresAt?: string | null;
  sortOrder: number;
  createdAt: string;
}

const TYPE_OPTIONS = [
  // The announcement type IS the meaning here, so each one keeps its tone.
  // `-solid` because these fills carry white text and must stay dark in both themes.
  { value: "INFO",    label: "إعلان عام",    icon: Megaphone,     color: "bg-info-solid" },
  { value: "COUPON",  label: "كوبون خصم",    icon: Tag,           color: "bg-brand-solid" },
  { value: "SALE",    label: "عرض وخصم",     icon: Percent,       color: "bg-danger-solid" },
  { value: "SUCCESS", label: "خبر سار",      icon: CheckCircle,   color: "bg-success-solid" },
  { value: "WARNING", label: "عرض محدود",    icon: AlertTriangle, color: "bg-warning-solid" },
];

const PRESET_COLORS = [
  "#7c3aed", "#2563eb", "#dc2626", "#059669", "#d97706",
  "#db2777", "#0891b2", "#16a34a", "#9333ea", "#000000",
];

const emptyForm = {
  titleAr: "", type: "INFO", link: "", couponCode: "",
  bgColor: "#7c3aed", textColor: "#ffffff",
  isActive: true, expiresAt: "", sortOrder: 0,
};

export default function AnnouncementsPage() {
  const [rows, setRows]         = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [addOpen, setAddOpen]   = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ ...emptyForm });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/admin/announcements");
    const data = await res.json();
    if (data.success) setRows(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const openAdd = () => { setForm({ ...emptyForm }); setAddOpen(true); };

  const openEdit = (item: Announcement) => {
    setEditItem(item);
    setForm({
      titleAr:    item.titleAr,
      type:       item.type,
      link:       item.link        || "",
      couponCode: item.couponCode  || "",
      bgColor:    item.bgColor,
      textColor:  item.textColor,
      isActive:   item.isActive,
      expiresAt:  item.expiresAt ? item.expiresAt.split("T")[0] : "",
      sortOrder:  item.sortOrder,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titleAr.trim()) { toast.error("أدخل نص الإعلان"); return; }
    setSaving(true);
    try {
      const payload = {
        titleAr:    form.titleAr.trim(),
        type:       form.type,
        link:       form.link.trim()       || null,
        couponCode: form.couponCode.trim().toUpperCase() || null,
        bgColor:    form.bgColor,
        textColor:  form.textColor,
        isActive:   form.isActive,
        expiresAt:  form.expiresAt || null,
        sortOrder:  Number(form.sortOrder) || 0,
      };

      const url    = editItem ? `/api/admin/announcements/${editItem.id}` : "/api/admin/announcements";
      const method = editItem ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data   = await res.json();

      if (data.success) {
        toast.success(editItem ? "تم تحديث الإعلان" : "تم إضافة الإعلان");
        setAddOpen(false); setEditItem(null);
        fetchRows();
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res  = await fetch(`/api/admin/announcements/${deleteId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("تم حذف الإعلان"); fetchRows(); }
    else toast.error("حدث خطأ");
    setDeleteId(null);
  };

  const toggleActive = async (item: Announcement) => {
    const res  = await fetch(`/api/admin/announcements/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    const data = await res.json();
    if (data.success) fetchRows();
  };

  const typeCfg = (t: string) => TYPE_OPTIONS.find((x) => x.value === t) || TYPE_OPTIONS[0];

  const FormModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={editItem ? "تعديل الإعلان" : "إضافة إعلان جديد"}
      size="lg"
    >
      <form onSubmit={handleSave} className="space-y-4">

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-fg mb-1">نص الإعلان *</label>
          <Input
            value={form.titleAr}
            onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))}
            placeholder="مثال: استخدم الكود SAVE20 واحصل على خصم 20%"
            required
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-fg mb-2">نوع الإعلان</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TYPE_OPTIONS.map((t) => {
              const TIcon = t.icon;
              return (
                <button
                  key={t.value} type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-sm font-medium ${
                    form.type === t.value
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                      : "border-line hover:border-line-strong"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg ${t.color} flex items-center justify-center shrink-0`}>
                    <TIcon className="h-3.5 w-3.5 text-white" />
                  </span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Coupon Code */}
        <div>
          <label className="block text-sm font-medium text-fg mb-1">كود الكوبون (اختياري)</label>
          <Input
            value={form.couponCode}
            onChange={(e) => setForm((f) => ({ ...f, couponCode: e.target.value.toUpperCase() }))}
            placeholder="مثال: SAVE20"
            className="font-mono tracking-widest"
          />
          <p className="text-xs text-fg-subtle mt-1">سيظهر للزوار مع زر نسخ تلقائي</p>
        </div>

        {/* Link */}
        <div>
          <label className="block text-sm font-medium text-fg mb-1">رابط (اختياري)</label>
          <Input
            value={form.link}
            onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            placeholder="/products أو https://..."
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-fg mb-2">لون الخلفية</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, bgColor: c }))}
                  className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: form.bgColor === c ? "#fff" : "transparent", boxShadow: form.bgColor === c ? `0 0 0 2px ${c}` : "none" }}
                />
              ))}
            </div>
            <input type="color" value={form.bgColor} onChange={(e) => setForm((f) => ({ ...f, bgColor: e.target.value }))}
              className="w-full h-9 rounded-lg cursor-pointer border border-line"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-2">لون النص</label>
            <div className="flex gap-2 mb-2">
              {["#ffffff", "#000000", "#fef08a"].map((c) => (
                <button key={c} type="button" onClick={() => setForm((f) => ({ ...f, textColor: c }))}
                  className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: form.textColor === c ? form.bgColor : "#e5e7eb" }}
                />
              ))}
            </div>
            <input type="color" value={form.textColor} onChange={(e) => setForm((f) => ({ ...f, textColor: e.target.value }))}
              className="w-full h-9 rounded-lg cursor-pointer border border-line"
            />
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-fg mb-1">معاينة</label>
          <div
            className="w-full py-2.5 px-4 rounded-xl text-center text-sm font-semibold"
            style={{ backgroundColor: form.bgColor, color: form.textColor }}
          >
            {form.titleAr || "نص الإعلان"}{form.couponCode && ` — ${form.couponCode}`}
          </div>
        </div>

        {/* Expiry + Sort */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-fg mb-1">تاريخ الانتهاء (اختياري)</label>
            <Input type="date" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1">الترتيب</label>
            <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} min={0} />
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-muted">
          <span className="text-sm font-medium text-fg">تفعيل الإعلان</span>
          <button type="button" onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))} className="transition-colors">
            {form.isActive
              ? <ToggleRight className="h-8 w-8 text-primary-600" />
              : <ToggleLeft  className="h-8 w-8 text-fg-subtle" />
            }
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={saving} className="flex-1">
            {editItem ? "حفظ التعديلات" : "إضافة الإعلان"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
        </div>
      </form>
    </Modal>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="الإعلانات والعروض"
        description="إدارة الإعلانات وكوبونات الخصم والعروض المعروضة في الموقع"
        actions={
          <Button onClick={openAdd} icon={<Plus className="h-4 w-4" />}>
            إضافة إعلان
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          // Counts are just counts — the label says which. Only "نشط" is a state.
          { label: "إجمالي الإعلانات", value: rows.length,                          color: "text-fg" },
          { label: "نشط",              value: rows.filter((r) => r.isActive).length,  color: "text-success" },
          { label: "كوبونات",          value: rows.filter((r) => r.couponCode).length,color: "text-fg" },
          { label: "عروض وخصومات",    value: rows.filter((r) => r.type === "SALE").length, color: "text-fg" },
        ].map((s) => (
          <div key={s.label} className="bg-surface rounded-2xl border border-line p-4 text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-fg-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-fg-subtle">جاري التحميل...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Megaphone className="h-12 w-12 text-fg-subtle mx-auto mb-3" />
            <p className="font-semibold text-fg-muted">لا توجد إعلانات بعد</p>
            <p className="text-sm text-fg-subtle mt-1">أضف أول إعلان لعرضه في الموقع</p>
            <Button onClick={openAdd} className="mt-4">
              <Plus className="h-4 w-4" /> إضافة أول إعلان
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-muted text-fg-muted border-b border-line">
                  <th className="text-start px-4 py-3 font-semibold">الإعلان</th>
                  <th className="text-start px-4 py-3 font-semibold">النوع</th>
                  <th className="text-start px-4 py-3 font-semibold">الكوبون</th>
                  <th className="text-start px-4 py-3 font-semibold">ينتهي في</th>
                  <th className="text-start px-4 py-3 font-semibold">الحالة</th>
                  <th className="text-start px-4 py-3 font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => {
                  const cfg = typeCfg(row.type);
                  const TIcon = cfg.icon;
                  return (
                    <tr key={row.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg shrink-0" style={{ backgroundColor: row.bgColor }}>
                            <div className="w-full h-full flex items-center justify-center">
                              <TIcon className="h-4 w-4 text-white" />
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-fg line-clamp-1">{row.titleAr}</p>
                            {row.link && <p className="text-xs text-fg-subtle truncate max-w-[160px]">{row.link}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white ${cfg.color}`}>
                          <TIcon className="h-3 w-3" />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.couponCode
                          ? <span className="font-mono font-bold text-primary-600 dark:text-primary-400 tracking-wider bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded">{row.couponCode}</span>
                          : <span className="text-fg-subtle">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-fg-muted text-xs">
                        {row.expiresAt ? formatDate(row.expiresAt) : <span className="text-fg-subtle">غير محدد</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(row)} className="transition-colors" title={row.isActive ? "إيقاف" : "تفعيل"}>
                          {row.isActive
                            ? <ToggleRight className="h-7 w-7 text-success" />
                            : <ToggleLeft  className="h-7 w-7 text-fg-subtle" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(row)}
                            className="p-1.5 rounded-lg text-fg-subtle hover:text-info hover:bg-info/10 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(row.id)}
                            className="p-1.5 rounded-lg text-fg-subtle hover:text-danger hover:bg-danger/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <FormModal open={addOpen}    onClose={() => setAddOpen(false)} />
      <FormModal open={!!editItem} onClose={() => setEditItem(null)} />

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { void handleDelete(); }}
        title="حذف الإعلان"
        message="هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        variant="danger"
      />
    </div>
  );
}
