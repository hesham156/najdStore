"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/Modal";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/admin/PageHeader";

interface PostCategory {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  color: string | null;
  _count: { posts: number };
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6"];

function CategoryForm({ initial, onSave, onCancel }: {
  initial?: Partial<PostCategory>;
  onSave: (data: { name: string; nameAr: string; slug: string; color: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [nameAr, setNameAr] = useState(initial?.nameAr || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [color, setColor] = useState(initial?.color || COLORS[0]);
  const [saving, setSaving] = useState(false);

  const autoSlug = (t: string) => t.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  return (
    <div className="bg-surface-muted border border-line rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-fg-muted mb-1">الاسم (عربي)</label>
          <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مثال: تقنية" dir="rtl" />
        </div>
        <div>
          <label className="block text-xs font-medium text-fg-muted mb-1">Name (English)</label>
          <Input value={name} onChange={(e) => { setName(e.target.value); if (!initial?.slug) setSlug(autoSlug(e.target.value)); }} placeholder="e.g. technology" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-fg-muted mb-1">الرابط (Slug)</label>
        <Input value={slug} onChange={(e) => setSlug(autoSlug(e.target.value))} placeholder="technology" dir="ltr" />
      </div>
      <div>
        <label className="block text-xs font-medium text-fg-muted mb-2">اللون</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-transform"
              style={{ backgroundColor: c, borderColor: color === c ? "white" : "transparent", transform: color === c ? "scale(1.25)" : "scale(1)" }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>إلغاء</Button>
        <Button size="sm" disabled={saving} onClick={async () => {
          if (!nameAr || !name) { toast.error("الاسم مطلوب"); return; }
          setSaving(true);
          await onSave({ name, nameAr, slug, color });
          setSaving(false);
        }}>
          حفظ
        </Button>
      </div>
    </div>
  );
}

export default function BlogCategoriesPage() {
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/blog/categories");
    const d = await res.json();
    if (d.success) setCategories(d.data);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const handleCreate = async (data: { name: string; nameAr: string; slug: string; color: string }) => {
    const res = await fetch("/api/admin/blog/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await res.json();
    if (d.success) { toast.success("تم إنشاء الفئة"); setShowNew(false); fetch_(); }
    else toast.error(d.error || "حدث خطأ");
  };

  const handleUpdate = async (id: string, data: { name: string; nameAr: string; slug: string; color: string }) => {
    const res = await fetch(`/api/admin/blog/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const d = await res.json();
    if (d.success) { toast.success("تم التحديث"); setEditId(null); fetch_(); }
    else toast.error(d.error || "حدث خطأ");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/admin/blog/categories/${deleteId}`, { method: "DELETE" });
    const d = await res.json();
    if (d.success) { toast.success("تم الحذف"); fetch_(); }
    else toast.error(d.error || "حدث خطأ");
    setDeleteLoading(false);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/admin" },
          { label: "المقالات", href: "/admin/blog" },
          { label: "التصنيفات" },
        ]}
        title="تصنيفات المقالات"
        description="تنظيم المقالات في تصنيفات تظهر في المدونة"
        actions={
          <Button onClick={() => setShowNew(true)} icon={<Plus className="h-4 w-4" />}>
            تصنيف جديد
          </Button>
        }
      />

      {showNew && (
        <CategoryForm onSave={handleCreate} onCancel={() => setShowNew(false)} />
      )}

      <div className="bg-surface rounded-2xl border border-line overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-fg-subtle">جار التحميل...</div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="h-10 w-10 mx-auto text-fg-subtle mb-3" />
            <p className="text-fg-muted">لا توجد فئات بعد</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {categories.map((cat) => (
              <div key={cat.id}>
                {editId === cat.id ? (
                  <div className="p-4">
                    <CategoryForm
                      initial={cat}
                      onSave={(data) => handleUpdate(cat.id, data)}
                      onCancel={() => setEditId(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-surface-hover/30 transition-colors">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: cat.color || "#6366f1" }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-fg">{cat.nameAr}</p>
                      <p className="text-xs text-fg-subtle">{cat.name} · /{cat.slug}</p>
                    </div>
                    <span className="text-sm text-fg-muted">{cat._count.posts} مقال</span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditId(cat.id)} className="p-1.5 text-fg-subtle hover:text-primary-500 transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => setDeleteId(cat.id)} className="p-1.5 text-fg-subtle hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="حذف الفئة"
        message="هل أنت متأكد من حذف هذه الفئة؟"
        confirmLabel="حذف"
        variant="danger"
      />
    </div>
  );
}
