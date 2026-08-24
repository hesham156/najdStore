"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Switch } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/admin/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Popup {
  id: string;
  titleAr: string;
  contentAr: string | null;
  type: string;
  delay: number;
  scrollDepth: number;
  targetPages: string[];
  buttonTextAr: string | null;
  buttonLink: string | null;
  couponCode: string | null;
  bgColor: string;
  textColor: string;
  showOnce: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const POPUP_TYPE_LABELS: Record<string, string> = {
  ON_LOAD:     "يظهر عند تحميل الصفحة",
  TIMED:       "يظهر بعد ثوانٍ",
  EXIT_INTENT: "عند محاولة المغادرة",
  SCROLL:      "بعد التمرير",
};

const POPUP_TYPE_BADGE: Record<string, "primary" | "info" | "warning" | "purple"> = {
  ON_LOAD:     "primary",
  TIMED:       "info",
  EXIT_INTENT: "warning",
  SCROLL:      "purple",
};

const ALL_TARGET_PAGES = ["ALL", "HOME", "PRODUCTS", "PRODUCT_DETAIL", "CART", "CHECKOUT"] as const;
const TARGET_PAGE_LABELS: Record<string, string> = {
  ALL:            "جميع الصفحات",
  HOME:           "الصفحة الرئيسية",
  PRODUCTS:       "قائمة المنتجات",
  PRODUCT_DETAIL: "صفحة المنتج",
  CART:           "سلة التسوق",
  CHECKOUT:       "إتمام الطلب",
};

// ─── Empty form state ─────────────────────────────────────────────────────────

const emptyForm = () => ({
  titleAr:     "",
  contentAr:   "",
  type:        "ON_LOAD",
  delay:       3,
  scrollDepth: 50,
  targetPages: ["ALL"] as string[],
  buttonTextAr: "",
  buttonLink:  "",
  couponCode:  "",
  bgColor:     "#7c3aed",
  textColor:   "#ffffff",
  showOnce:    true,
  isActive:    true,
  sortOrder:   0,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPopupsPage() {
  const [popups, setPopups]       = useState<Popup[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyForm());
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]         = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPopups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/popups");
      const data = await res.json();
      if (data.success) setPopups(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPopups(); }, [fetchPopups]);

  // ── Form helpers ───────────────────────────────────────────────────────────

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTargetPage(page: string) {
    setForm((prev) => {
      if (page === "ALL") return { ...prev, targetPages: ["ALL"] };
      const without = prev.targetPages.filter((p) => p !== "ALL" && p !== page);
      const next = prev.targetPages.includes(page)
        ? without
        : [...without, page];
      return { ...prev, targetPages: next.length === 0 ? ["ALL"] : next };
    });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.titleAr.trim()) { setError("العنوان مطلوب"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/popups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          delay:       Number(form.delay),
          scrollDepth: Number(form.scrollDepth),
          sortOrder:   Number(form.sortOrder),
          contentAr:   form.contentAr   || null,
          buttonTextAr: form.buttonTextAr || null,
          buttonLink:  form.buttonLink  || null,
          couponCode:  form.couponCode  || null,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "حدث خطأ"); return; }
      setShowForm(false);
      setForm(emptyForm());
      fetchPopups();
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle isActive ────────────────────────────────────────────────────────

  async function toggleActive(popup: Popup) {
    await fetch(`/api/admin/popups/${popup.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !popup.isActive }),
    });
    setPopups((prev) =>
      prev.map((p) => (p.id === popup.id ? { ...p, isActive: !p.isActive } : p))
    );
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا البوب آب؟")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/popups/${id}`, { method: "DELETE" });
      setPopups((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <PageHeader
        title="النوافذ المنبثقة"
        description="إدارة النوافذ المنبثقة والإشعارات التسويقية في المتجر"
        actions={
          <Button
            onClick={() => { setShowForm(true); setForm(emptyForm()); setError(""); }}
            icon={<Plus className="h-4 w-4" />}
          >
            إضافة نافذة
          </Button>
        }
      />

      {/* Create Form (inline drawer) */}
      {showForm && (
        <Card className="border-2 border-primary-200 dark:border-primary-800">
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-fg">إنشاء بوب آب جديد</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-fg-subtle hover:text-fg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-control border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-fg">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Title */}
              <div className="md:col-span-2">
                <Input
                  label="العنوان (بالعربية) *"
                  value={form.titleAr}
                  onChange={(e) => setField("titleAr", e.target.value)}
                  placeholder="مثال: اشترك الآن واحصل على خصم 20%"
                />
              </div>

              {/* Content */}
              <div className="md:col-span-2">
                <Textarea
                  label="المحتوى (اختياري)"
                  value={form.contentAr}
                  onChange={(e) => setField("contentAr", e.target.value)}
                  placeholder="نص تفصيلي يظهر داخل البوب آب..."
                  rows={3}
                />
              </div>

              {/* Type */}
              <Select
                label="نوع البوب آب"
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
                options={[
                  { value: "ON_LOAD",     label: "يظهر عند تحميل الصفحة" },
                  { value: "TIMED",       label: "يظهر بعد N ثانية" },
                  { value: "EXIT_INTENT", label: "عند محاولة المغادرة" },
                  { value: "SCROLL",      label: "بعد التمرير N%" },
                ]}
              />

              {/* Conditional: delay or scrollDepth */}
              {form.type === "TIMED" && (
                <Input
                  label="التأخير (بالثواني)"
                  type="number"
                  min={0}
                  value={form.delay}
                  onChange={(e) => setField("delay", Number(e.target.value))}
                />
              )}
              {form.type === "SCROLL" && (
                <Input
                  label="نسبة التمرير (%)"
                  type="number"
                  min={0}
                  max={100}
                  value={form.scrollDepth}
                  onChange={(e) => setField("scrollDepth", Number(e.target.value))}
                />
              )}

              {/* Button text */}
              <Input
                label="نص الزر (اختياري)"
                value={form.buttonTextAr}
                onChange={(e) => setField("buttonTextAr", e.target.value)}
                placeholder="مثال: تسوق الآن"
              />

              {/* Button link */}
              <Input
                label="رابط الزر (اختياري)"
                value={form.buttonLink}
                onChange={(e) => setField("buttonLink", e.target.value)}
                placeholder="/products"
                dir="ltr"
              />

              {/* Coupon */}
              <Input
                label="كوبون خصم (اختياري)"
                value={form.couponCode}
                onChange={(e) => setField("couponCode", e.target.value)}
                placeholder="SAVE20"
                dir="ltr"
              />

              {/* Sort order */}
              <Input
                label="الترتيب"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setField("sortOrder", Number(e.target.value))}
              />

              {/* Colors */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-fg">
                  لون الخلفية
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.bgColor}
                    onChange={(e) => setField("bgColor", e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-xl border border-line-strong p-1"
                  />
                  <span className="text-sm text-fg-muted font-mono">{form.bgColor}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-fg">
                  لون النص
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.textColor}
                    onChange={(e) => setField("textColor", e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded-xl border border-line-strong p-1"
                  />
                  <span className="text-sm text-fg-muted font-mono">{form.textColor}</span>
                </div>
              </div>
            </div>

            {/* Target pages */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-fg">
                الصفحات المستهدفة
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_TARGET_PAGES.map((page) => {
                  const active = form.targetPages.includes(page);
                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => toggleTargetPage(page)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                        active
                          ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                          : "bg-surface text-fg border-line-strong hover:border-primary-400"
                      }`}
                    >
                      {TARGET_PAGE_LABELS[page]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showOnce}
                  onChange={(e) => setField("showOnce", e.target.checked)}
                  className="w-4 h-4 rounded accent-primary-600"
                />
                <span className="text-sm text-fg">
                  عرض مرة واحدة فقط
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setField("isActive", e.target.checked)}
                  className="w-4 h-4 rounded accent-primary-600"
                />
                <span className="text-sm text-fg">
                  نشط
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-line">
              <Button type="submit" loading={saving}>
                حفظ البوب آب
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                إلغاء
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="py-16 text-center text-fg-subtle">جاري التحميل...</div>
        ) : popups.length === 0 ? (
          <div className="py-16 text-center text-fg-subtle space-y-2">
            <p className="text-lg font-medium">لا توجد بوب آب حتى الآن</p>
            <p className="text-sm">اضغط على "إضافة بوب آب" للبدء</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-muted">
                  <th className="text-right px-5 py-3.5 font-semibold text-fg-muted">
                    العنوان
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-fg-muted">
                    النوع
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-fg-muted">
                    الصفحات المستهدفة
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-fg-muted">
                    الحالة
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-fg-muted">
                    الترتيب
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-fg-muted">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {popups.map((popup) => (
                  <tr
                    key={popup.id}
                    className="hover:bg-surface-hover/30 transition-colors"
                  >
                    {/* Title */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-fg">
                          {popup.titleAr}
                        </p>
                        {popup.couponCode && (
                          <p className="text-xs text-success font-mono mt-0.5">
                            كوبون: {popup.couponCode}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Type badge */}
                    <td className="px-5 py-4">
                      <Badge variant={POPUP_TYPE_BADGE[popup.type] || "gray"}>
                        {POPUP_TYPE_LABELS[popup.type] || popup.type}
                      </Badge>
                    </td>

                    {/* Target pages */}
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {popup.targetPages.map((page) => (
                          <span
                            key={page}
                            className="inline-flex items-center rounded-md bg-surface-sunken px-2 py-0.5 text-xs text-fg-muted"
                          >
                            {TARGET_PAGE_LABELS[page] || page}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Active toggle */}
                    <td className="px-5 py-4">
                      <Switch
                        size="md"
                        checked={popup.isActive}
                        onChange={() => toggleActive(popup)}
                        title={popup.isActive ? "إيقاف" : "تفعيل"}
                        aria-label={`${popup.isActive ? "إيقاف" : "تفعيل"} ${popup.titleAr}`}
                      />
                    </td>

                    {/* Sort order */}
                    <td className="px-5 py-4 text-fg-muted">
                      {popup.sortOrder}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleDelete(popup.id)}
                        disabled={deletingId === popup.id}
                        className="text-danger hover:text-danger transition-colors disabled:opacity-40"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
