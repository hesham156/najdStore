"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, FolderTree, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Checkbox, Input, Select } from "@/components/ui/Input";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Column, DataTable } from "@/components/ui/DataTable";
import { EmptyState, NoResultsState } from "@/components/ui/States";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { SearchInput, Toolbar } from "@/components/admin/Toolbar";

interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
  _count?: { products: number };
  /** Deleted products kept for order history — they block removing the category. */
  archivedProducts?: number;
}

type CategoryForm = typeof emptyForm;

const emptyForm = { name: "", nameAr: "", slug: "", icon: "", color: "#7c3aed", sortOrder: 0, isActive: true };

/* Defined at module scope: re-creating it per render would remount the
   inputs on every keystroke and drop focus. */
function CategoryFields({
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
}: {
  form: CategoryForm;
  setForm: (f: CategoryForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="الاسم بالعربي" required value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
        <Input label="الاسم بالإنجليزي" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <Input
        label="الرابط (slug)"
        required
        value={form.slug}
        onChange={(e) => setForm({ ...form, slug: e.target.value })}
        hint="حروف إنجليزية وشرطات — مثال: streaming"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input
          label="الأيقونة"
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
          placeholder="📺"
          hint="رمز تعبيري واحد"
        />
        <Input
          label="اللون"
          type="color"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
          className="h-10 cursor-pointer p-1"
        />
        <Input
          label="الترتيب"
          type="number"
          value={String(form.sortOrder)}
          onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
          hint="الأصغر أولاً"
        />
      </div>
      <Checkbox
        checked={form.isActive}
        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        label="فئة نشطة"
        description="الفئات المعطلة لا تظهر في المتجر."
      />
      <div className="flex justify-end gap-2.5 pt-1">
        <Button variant="secondary" type="button" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Set when the server reports the category still holds archived products.
  const [reassign, setReassign] = useState<{ archived: number; target: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      if (data.success) setCategories(data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const closeForms = () => {
    setAddOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم إنشاء الفئة");
        closeForms();
        loadCategories();
      } else {
        toast.error(data.error || "تعذّر إنشاء الفئة");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSaveLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حفظ التغييرات");
        closeForms();
        loadCategories();
      } else {
        toast.error(data.error || "تعذّر حفظ التغييرات");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (reassignTo?: string) => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${deleteId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reassignTo ? { reassignTo } : {}),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          data.data?.reassigned
            ? `تم حذف الفئة ونقل ${data.data.reassigned} منتج محذوف`
            : "تم حذف الفئة"
        );
        setDeleteId(null);
        setReassign(null);
        loadCategories();
        return;
      }

      // The category holds archived products; ask where they should go rather
      // than dead-ending the merchant.
      if (data.requiresReassign) {
        setReassign({ archived: data.archivedProducts ?? 0, target: "" });
        return;
      }

      toast.error(data.error || "تعذّر حذف الفئة");
      setDeleteId(null);
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (row: Category) => {
    setForm({
      name: row.name,
      nameAr: row.nameAr,
      slug: row.slug,
      icon: row.icon || "",
      color: row.color || "#7c3aed",
      sortOrder: row.sortOrder,
      isActive: row.isActive,
    });
    setEditId(row.id);
  };

  const stats = useMemo(() => {
    const active = categories.filter((c) => c.isActive).length;
    const products = categories.reduce((s, c) => s + (c._count?.products ?? 0), 0);
    const empty = categories.filter((c) => (c._count?.products ?? 0) === 0).length;
    return { total: categories.length, active, products, empty };
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.nameAr.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const columns: Column<Category>[] = [
    {
      key: "nameAr",
      title: "الفئة",
      primary: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ background: `${row.color}1f` }}
            aria-hidden
          >
            {row.icon || "📁"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-fg">{row.nameAr}</p>
            <p className="truncate text-[11px] text-fg-muted">{row.name}</p>
          </div>
        </div>
      ),
    },
    {
      key: "slug",
      title: "الرابط",
      hideOnMobile: true,
      render: (val) => (
        <code className="rounded bg-surface-sunken px-2 py-0.5 font-mono text-[11px] text-fg-muted">{String(val)}</code>
      ),
    },
    {
      key: "_count",
      title: "المنتجات",
      align: "center",
      render: (val) => (
        <span className="text-[13px] font-semibold tnum text-fg">{(val as { products: number })?.products || 0}</span>
      ),
    },
    {
      key: "isActive",
      title: "الحالة",
      render: (val) => (
        <Badge variant={val ? "success" : "gray"} dot>
          {val ? "نشطة" : "معطلة"}
        </Badge>
      ),
    },
    {
      key: "actions",
      title: "",
      align: "end",
      cardHidden: true,
      render: (_, row) => {
        // A category still holding products cannot be deleted (Product.categoryId
        // is required), so say why up front instead of failing on click.
        // `archivedProducts` are soft-deleted ones: invisible on the products
        // screen, but the database still refuses to break their category link.
        const productCount = row._count?.products ?? 0;
        const archived = row.archivedProducts ?? 0;
        // Only products still on sale block the delete outright. Archived ones
        // just need somewhere to go, which the delete flow asks for.
        const blocked = productCount > 0;
        const blockedReason =
          productCount > 0
            ? `لا يمكن حذف "${row.nameAr}" لأنها تحتوي على ${productCount} منتج. انقل المنتجات إلى فئة أخرى أولاً.`
            : archived > 0
              ? `حذف ${row.nameAr} — سيُطلب منك نقل ${archived} منتج محذوف`
              : `حذف ${row.nameAr}`;
        return (
          <div className="flex items-center justify-end gap-1">
            <IconButton label={`تعديل ${row.nameAr}`} onClick={() => openEdit(row)} icon={<Pencil className="h-3.5 w-3.5" />} />
            <IconButton
              label={`حذف ${row.nameAr}`}
              title={blockedReason}
              variant="soft-danger"
              disabled={blocked}
              onClick={() => setDeleteId(row.id)}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="الفئات"
        description="تنظيم المنتجات في مجموعات تظهر للعميل في المتجر"
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setAddOpen(true);
            }}
            icon={<Plus className="h-4 w-4" />}
          >
            فئة جديدة
          </Button>
        }
      />

      <AdminStats
        items={[
          { label: "إجمالي الفئات", value: stats.total, icon: FolderTree, color: statColors.blue },
          { label: "فئات نشطة", value: stats.active, icon: CheckCircle2, color: statColors.green },
          { label: "منتجات مصنّفة", value: stats.products, icon: Package, color: statColors.primary },
          { label: "فئات فارغة", value: stats.empty, icon: FolderTree, color: statColors.amber },
        ]}
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="ابحث باسم الفئة..." label="بحث عن فئة" />
      </Toolbar>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        onRetry={loadCategories}
        empty={
          search ? (
            <NoResultsState query={search} onClear={() => setSearch("")} />
          ) : (
            <EmptyState
              icon={FolderTree}
              title="لا توجد فئات بعد"
              description="أنشئ فئة لتصنيف منتجاتك وتسهيل تصفّح المتجر على العملاء."
              action={
                <Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>
                  إنشاء فئة
                </Button>
              }
            />
          )
        }
      />

      <Modal isOpen={addOpen} onClose={closeForms} title="إنشاء فئة جديدة">
        <CategoryFields
          form={form}
          setForm={setForm}
          onSubmit={handleAdd}
          onCancel={closeForms}
          saving={saveLoading}
          submitLabel="إنشاء الفئة"
        />
      </Modal>

      <Modal isOpen={!!editId} onClose={closeForms} title="تعديل الفئة">
        <CategoryFields
          form={form}
          setForm={setForm}
          onSubmit={handleEdit}
          onCancel={closeForms}
          saving={saveLoading}
          submitLabel="حفظ التغييرات"
        />
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId && !reassign}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete()}
        title="حذف الفئة"
        message="سيتم حذف الفئة نهائياً ولا يمكن التراجع. الفئات التي تحتوي على منتجات معروضة لا يمكن حذفها — انقل منتجاتها أولاً."
        confirmLabel="نعم، احذف"
        loading={deleting}
      />

      {/* The category is empty on screen but still anchors deleted products kept
          for order history. They have to land somewhere before it can go. */}
      <Modal
        isOpen={!!reassign}
        onClose={() => {
          setReassign(null);
          setDeleteId(null);
        }}
        title="نقل المنتجات المحذوفة"
        description={`هذه الفئة مرتبطة بـ${reassign?.archived ?? 0} منتج محذوف محفوظ لسجل الطلبات السابقة.`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setReassign(null);
                setDeleteId(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              disabled={!reassign?.target}
              onClick={() => handleDelete(reassign?.target)}
            >
              انقل واحذف الفئة
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="انقل المنتجات المحذوفة إلى"
            value={reassign?.target || ""}
            onChange={(e) => setReassign((r) => (r ? { ...r, target: e.target.value } : r))}
            options={[
              { value: "", label: "اختر فئة…" },
              ...categories
                .filter((c) => c.id !== deleteId)
                .map((c) => ({ value: c.id, label: c.nameAr })),
            ]}
          />
          <p className="text-xs leading-relaxed text-fg-muted">
            المنتجات المحذوفة لا تظهر في المتجر ولا في شاشة المنتجات. نقلها لا يغيّر أسعار
            الطلبات السابقة ولا أسماء منتجاتها — الأيقونة المعروضة بجانب المنتج في الطلب فقط.
          </p>
        </div>
      </Modal>
    </div>
  );
}
