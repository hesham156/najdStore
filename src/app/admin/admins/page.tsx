"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Shield, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Column, DataTable, Pagination } from "@/components/ui/DataTable";
import { Alert, EmptyState } from "@/components/ui/States";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatDate } from "@/lib/utils";

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const EMPTY_FORM = { name: "", email: "", password: "", role: "STAFF" };

export default function AdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/admins");
      const data = await res.json();
      if (data.success) setAdmins(data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم إنشاء حساب المشرف");
        setAddOpen(false);
        setForm(EMPTY_FORM);
        fetchAdmins();
      } else {
        toast.error(data.error || "تعذّر إنشاء الحساب");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setAddLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/admins/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حذف المشرف");
        fetchAdmins();
      } else {
        toast.error(data.error || "تعذّر حذف المشرف");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const stats = useMemo(() => {
    const owners = admins.filter((a) => a.role === "ADMIN").length;
    return { total: admins.length, owners, staff: admins.length - owners, active: admins.filter((a) => a.isActive).length };
  }, [admins]);

  const targetAdmin = admins.find((a) => a.id === deleteId);

  const columns: Column<Admin>[] = [
    {
      key: "name",
      title: "المشرف",
      primary: true,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-violet-600 text-[13px] font-bold text-white"
            aria-hidden
          >
            {row.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-fg">{row.name}</p>
            <p className="truncate text-[11px] text-fg-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      title: "الدور",
      render: (val) => (
        <Badge variant={val === "ADMIN" ? "primary" : "purple"}>{val === "ADMIN" ? "مدير عام" : "موظف"}</Badge>
      ),
    },
    {
      key: "isActive",
      title: "الحالة",
      render: (val) => (
        <Badge variant={val ? "success" : "danger"} dot>
          {val ? "نشط" : "معطل"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      title: "تاريخ الإضافة",
      hideOnMobile: true,
      render: (val) => <span className="whitespace-nowrap text-xs text-fg-muted">{formatDate(String(val))}</span>,
    },
    {
      key: "actions",
      title: "",
      align: "end",
      cardHidden: true,
      render: (_, row) => (
        <IconButton
          label={`حذف ${row.name}`}
          variant="soft-danger"
          onClick={() => setDeleteId(row.id)}
          icon={<Trash2 className="h-3.5 w-3.5" />}
        />
      ),
    },
  ];

  const totalPages = Math.ceil(admins.length / pageSize);
  const paginated = admins.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="المشرفون والموظفون"
        description="من يملك صلاحية الدخول إلى لوحة الإدارة"
        actions={
          <Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>
            مشرف جديد
          </Button>
        }
      />

      <AdminStats
        items={[
          { label: "إجمالي الحسابات", value: stats.total, icon: Shield, color: statColors.blue },
          { label: "مديرون", value: stats.owners, icon: ShieldCheck, color: statColors.primary },
          { label: "موظفون", value: stats.staff, icon: UserCog, color: statColors.purple },
          { label: "حسابات نشطة", value: stats.active, icon: ShieldCheck, color: statColors.green },
        ]}
      />

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        error={error}
        onRetry={fetchAdmins}
        empty={
          <EmptyState
            icon={Shield}
            title="لا يوجد مشرفون"
            description="أضف حساباً لمنح شخص من فريقك صلاحية الدخول إلى لوحة الإدارة."
            action={
              <Button onClick={() => setAddOpen(true)} icon={<Plus className="h-4 w-4" />}>
                إضافة مشرف
              </Button>
            }
          />
        }
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={admins.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
      />

      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="إضافة مشرف جديد"
        description="سيتمكّن هذا الحساب من الدخول إلى لوحة الإدارة فوراً."
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="الاسم" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            label="البريد الإلكتروني"
            required
            type="email"
            autoComplete="off"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="كلمة المرور"
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint="8 أحرف على الأقل — شاركها مع صاحب الحساب بطريقة آمنة."
          />
          <Select
            label="الدور"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={[
              { value: "STAFF", label: "موظف — صلاحيات تشغيلية" },
              { value: "ADMIN", label: "مدير عام — كل الصلاحيات" },
            ]}
          />
          {form.role === "ADMIN" && (
            <Alert tone="warning">المدير العام يملك صلاحية كاملة على المتجر، بما في ذلك الإعدادات وحذف البيانات.</Alert>
          )}
          <div className="flex justify-end gap-2.5 pt-1">
            <Button variant="secondary" type="button" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" loading={addLoading}>
              إضافة المشرف
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="حذف المشرف"
        message={
          targetAdmin
            ? `سيفقد «${targetAdmin.name}» صلاحية الدخول إلى لوحة الإدارة نهائياً.`
            : "سيفقد هذا المشرف صلاحية الدخول إلى لوحة الإدارة نهائياً."
        }
        confirmLabel="نعم، احذف"
        loading={deleting}
      />
    </div>
  );
}
