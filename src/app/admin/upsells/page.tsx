"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Switch } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/admin/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  image: string | null;
}

interface Upsell {
  id: string;
  headlineAr: string;
  descriptionAr: string | null;
  triggerType: string;
  triggerProductIds: string[];
  offerProductId: string;
  offerProduct: Product;
  discountType: string;
  discountValue: number;
  isActive: boolean;
  createdAt: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  ADD_TO_CART: "عند الإضافة للسلة",
  CHECKOUT:    "عند إتمام الطلب",
};

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  NONE:       "بدون خصم",
  PERCENTAGE: "نسبة مئوية (%)",
  FIXED:      "مبلغ ثابت",
};

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyForm = () => ({
  headlineAr:       "",
  descriptionAr:    "",
  triggerType:      "ADD_TO_CART",
  offerProductId:   "",
  discountType:     "NONE",
  discountValue:    0,
  isActive:         true,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminUpsellsPage() {
  const [upsells, setUpsells]       = useState<Upsell[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(emptyForm());
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]           = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUpsells = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/upsells");
      const data = await res.json();
      if (data.success) setUpsells(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    const res = await fetch("/api/admin/products?active=true");
    const data = await res.json();
    if (data.success) setProducts(data.data);
  }, []);

  useEffect(() => {
    fetchUpsells();
    fetchProducts();
  }, [fetchUpsells, fetchProducts]);

  // ── Form helpers ───────────────────────────────────────────────────────────

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.headlineAr.trim())    { setError("العنوان التسويقي مطلوب"); return; }
    if (!form.offerProductId)       { setError("يرجى اختيار المنتج المعروض"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/upsells", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          discountValue: Number(form.discountValue),
          descriptionAr: form.descriptionAr || null,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "حدث خطأ"); return; }
      setShowForm(false);
      setForm(emptyForm());
      fetchUpsells();
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle isActive ────────────────────────────────────────────────────────

  async function toggleActive(upsell: Upsell) {
    await fetch(`/api/admin/upsells/${upsell.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !upsell.isActive }),
    });
    setUpsells((prev) =>
      prev.map((u) => (u.id === upsell.id ? { ...u, isActive: !u.isActive } : u))
    );
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا العرض الترقوي؟")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/admin/upsells/${id}`, { method: "DELETE" });
      setUpsells((prev) => prev.filter((u) => u.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function formatDiscount(upsell: Upsell) {
    if (!upsell.discountType) return "—";
    if (upsell.discountType === "PERCENTAGE") return `${upsell.discountValue}%`;
    return `${upsell.discountValue} ر.س`;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <PageHeader
        title="عروض Upsell"
        description="عروض ترقية تُعرض على العميل لزيادة متوسط قيمة الطلب"
        actions={
          <Button
            onClick={() => {
              setShowForm(true);
              setForm(emptyForm());
              setError("");
            }}
            icon={<Plus className="h-4 w-4" />}
          >
            إضافة عرض
          </Button>
        }
      />

      {/* Create Form */}
      {showForm && (
        <Card className="border-2 border-primary-200 dark:border-primary-800">
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-fg">
                إنشاء عرض ترقوي جديد
              </h2>
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
              {/* Headline */}
              <div className="md:col-span-2">
                <Input
                  label="العنوان التسويقي *"
                  value={form.headlineAr}
                  onChange={(e) => setField("headlineAr", e.target.value)}
                  placeholder="مثال: أضف هذا المنتج بسعر مخفض!"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <Textarea
                  label="الوصف (اختياري)"
                  value={form.descriptionAr}
                  onChange={(e) => setField("descriptionAr", e.target.value)}
                  placeholder="وصف تفصيلي للعرض..."
                  rows={2}
                />
              </div>

              {/* Trigger type */}
              <Select
                label="وقت ظهور العرض"
                value={form.triggerType}
                onChange={(e) => setField("triggerType", e.target.value)}
                options={[
                  { value: "ADD_TO_CART", label: "عند الإضافة للسلة" },
                  { value: "CHECKOUT",    label: "عند إتمام الطلب" },
                ]}
              />

              {/* Offer product */}
              <Select
                label="المنتج المعروض *"
                value={form.offerProductId}
                onChange={(e) => setField("offerProductId", e.target.value)}
                options={[
                  { value: "", label: "— اختر منتجاً —" },
                  ...products.map((p) => ({
                    value: p.id,
                    label: `${p.nameAr} (${p.name})`,
                  })),
                ]}
              />

              {/* Discount type */}
              <Select
                label="نوع الخصم"
                value={form.discountType}
                onChange={(e) => setField("discountType", e.target.value)}
                options={[
                  { value: "NONE",       label: "بدون خصم" },
                  { value: "PERCENTAGE", label: "نسبة مئوية (%)" },
                  { value: "FIXED",      label: "مبلغ ثابت" },
                ]}
              />

              {/* Discount value */}
              {form.discountType !== "NONE" && (
                <Input
                  label={
                    form.discountType === "PERCENTAGE"
                      ? "قيمة الخصم (%)"
                      : "قيمة الخصم (ر.س)"
                  }
                  type="number"
                  min={0}
                  step={form.discountType === "PERCENTAGE" ? 1 : 0.01}
                  max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                  value={form.discountValue}
                  onChange={(e) => setField("discountValue", Number(e.target.value))}
                />
              )}
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
                className="w-4 h-4 rounded accent-primary-600"
              />
              <span className="text-sm text-fg">نشط</span>
            </label>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-line">
              <Button type="submit" loading={saving}>
                حفظ العرض
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
        ) : upsells.length === 0 ? (
          <div className="py-16 text-center text-fg-subtle space-y-2">
            <p className="text-lg font-medium">لا توجد عروض ترقوية حتى الآن</p>
            <p className="text-sm">اضغط على "إضافة عرض" للبدء</p>
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
                    نوع التفعيل
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-fg-muted">
                    المنتج المعروض
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-fg-muted">
                    الخصم
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-fg-muted">
                    الحالة
                  </th>
                  <th className="text-right px-5 py-3.5 font-semibold text-fg-muted">
                    إجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {upsells.map((upsell) => (
                  <tr
                    key={upsell.id}
                    className="hover:bg-surface-hover/30 transition-colors"
                  >
                    {/* Headline */}
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-fg">
                          {upsell.headlineAr}
                        </p>
                        {upsell.descriptionAr && (
                          <p className="text-xs text-fg-muted mt-0.5 line-clamp-1">
                            {upsell.descriptionAr}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Trigger */}
                    <td className="px-5 py-4">
                      <Badge variant={upsell.triggerType === "ADD_TO_CART" ? "info" : "purple"}>
                        {TRIGGER_LABELS[upsell.triggerType] || upsell.triggerType}
                      </Badge>
                    </td>

                    {/* Offer product */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {upsell.offerProduct?.image && (
                          <img
                            src={upsell.offerProduct.image}
                            alt={upsell.offerProduct.nameAr}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-fg text-xs">
                            {upsell.offerProduct?.nameAr}
                          </p>
                          <p className="text-xs text-fg-muted">
                            {upsell.offerProduct?.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Discount */}
                    <td className="px-5 py-4">
                      {!upsell.discountType ? (
                        <span className="text-fg-subtle">—</span>
                      ) : (
                        <Badge variant="success">{formatDiscount(upsell)}</Badge>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="px-5 py-4">
                      <Switch
                        size="md"
                        checked={upsell.isActive}
                        onChange={() => toggleActive(upsell)}
                        title={upsell.isActive ? "إيقاف" : "تفعيل"}
                        aria-label={`${upsell.isActive ? "إيقاف" : "تفعيل"} ${upsell.headlineAr}`}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleDelete(upsell.id)}
                        disabled={deletingId === upsell.id}
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
