"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  KeyRound,
  LifeBuoy,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShoppingBag,
  ShieldOff,
  ShoppingCart,
  StickyNote,
  UserCheck,
  UserX,
} from "lucide-react";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Section } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatCurrency, formatDate, relativeDate } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  total: number | string;
  status: string;
  createdAt: string;
  items: { id: string }[];
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface Address {
  name: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  country: string | null;
  lastUsedAt: string;
}

interface Cart {
  id: string;
  itemCount: number;
  total: number | string;
  updatedAt: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string | null;
  isActive: boolean;
  role: string;
  createdAt: string;
  emailVerified?: string | null;
  adminNotes?: string | null;
  orders: Order[];
  tickets: Ticket[];
  addresses: Address[];
  abandonedCarts: Cart[];
  _count: { orders: number; tickets: number };
  /** Totals computed server-side across ALL orders, not just the listed ones. */
  totalSpent?: number;
  paidOrders?: number;
  deliveredOrders?: number;
  lastOrderAt?: string | null;
  ordersShown?: number;
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  // Toggling a customer account is ADMIN-only on the server. Reflect that here
  // instead of showing STAFF a button that answers with a bare 403.
  const { data: session } = useSession();
  const canToggle = session?.user.role === "ADMIN";

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/customers/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setCustomer(data.data);
        setNotes(data.data.adminNotes ?? "");
      } else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/customers/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const toggleActive = async () => {
    if (!customer) return;
    setToggling(true);
    try {
      const data = await patch({ isActive: !customer.isActive });
      if (data.success) {
        setCustomer((c) => (c ? { ...c, isActive: !c.isActive } : c));
        toast.success(customer.isActive ? "تم تعطيل الحساب" : "تم تفعيل الحساب");
      } else {
        toast.error(data.error || "تعذّر تغيير حالة الحساب");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setToggling(false);
      setConfirmToggle(false);
    }
  };

  const openEdit = () => {
    if (!customer) return;
    setForm({ name: customer.name, email: customer.email, phone: customer.phone || "" });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const data = await patch(form);
      if (data.success) {
        setCustomer((c) => (c ? { ...c, ...data.data } : c));
        toast.success("تم حفظ بيانات العميل");
        setEditOpen(false);
      } else {
        toast.error(data.error || "تعذّر حفظ البيانات");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const data = await patch({ adminNotes: notes });
      if (data.success) {
        setCustomer((c) => (c ? { ...c, adminNotes: data.data.adminNotes } : c));
        toast.success("تم حفظ الملاحظة");
      } else {
        toast.error(data.error || "تعذّر حفظ الملاحظة");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setSavingNotes(false);
    }
  };

  const sendReset = async () => {
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/customers/${params.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`أُرسل رابط إعادة التعيين — صالح ${data.data?.expiresInMinutes ?? 30} دقيقة`);
      } else {
        toast.error(data.error || "تعذّر إرسال الرابط");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setResetting(false);
      setConfirmReset(false);
    }
  };

  const anonymize = async () => {
    setErasing(true);
    try {
      const res = await fetch(`/api/admin/customers/${params.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("تم إخفاء هوية العميل");
        loadCustomer();
      } else {
        toast.error(data.error || "تعذّر إخفاء الهوية");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setErasing(false);
      setConfirmErase(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-card" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <Card padding="none">
        <ErrorState
          title="تعذّر عرض العميل"
          description="قد يكون الحساب محذوفاً أو أن الاتصال بالخادم فشل."
          onRetry={loadCustomer}
        />
        <div className="flex justify-center pb-6">
          <Link href="/admin/customers">
            <Button variant="secondary" size="sm">
              العودة إلى العملاء
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  // Spend comes from the API, which sums EVERY paid order using the same rule
  // as the accounting books. Computing it here from the last 20 orders alone
  // would quietly disagree with the customers list and the ledger.
  const deliveredCount = customer.deliveredOrders ?? 0;
  const totalSpent = Number(customer.totalSpent ?? 0);
  const paidCount = customer.paidOrders ?? 0;
  const avgOrder = paidCount > 0 ? totalSpent / paidCount : 0;
  const shownOrders = customer.orders.length;
  const allOrders = customer._count.orders;
  const openTickets = customer.tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/admin" },
          { label: "العملاء", href: "/admin/customers" },
          { label: customer.name },
        ]}
        title={
          <span className="flex items-center gap-3">
            {customer.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={customer.avatar}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-line"
              />
            ) : (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-[13px] font-bold text-white"
                aria-hidden
              >
                {customer.name.charAt(0)}
              </span>
            )}
            {customer.name}
          </span>
        }
        description={customer.email}
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant={customer.isActive ? "success" : "danger"} dot>
              {customer.isActive ? "حساب نشط" : "حساب معطل"}
            </Badge>
            <Badge variant={customer.emailVerified ? "success" : "gray"}>
              {customer.emailVerified ? "بريد موثّق" : "بريد غير موثّق"}
            </Badge>
            {openTickets > 0 && <Badge variant="warning">{openTickets} تذكرة مفتوحة</Badge>}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" onClick={openEdit} icon={<Pencil className="h-4 w-4" />}>
              تعديل البيانات
            </Button>
            <Button
              variant="secondary"
              loading={resetting}
              onClick={() => setConfirmReset(true)}
              icon={<KeyRound className="h-4 w-4" />}
            >
              إرسال رابط كلمة المرور
            </Button>
            {canToggle && (
              <>
                <Button
                  variant={customer.isActive ? "soft-danger" : "success"}
                  loading={toggling}
                  onClick={() => setConfirmToggle(true)}
                  icon={customer.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                >
                  {customer.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                </Button>
                <Button
                  variant="soft-danger"
                  loading={erasing}
                  onClick={() => setConfirmErase(true)}
                  icon={<ShieldOff className="h-4 w-4" />}
                >
                  إخفاء الهوية
                </Button>
              </>
            )}
          </>
        }
      />

      <AdminStats
        items={[
          { label: "إجمالي الطلبات", value: allOrders, icon: ShoppingBag, color: statColors.blue },
          { label: "طلبات مكتملة", value: deliveredCount, icon: CheckCircle2, color: statColors.green },
          {
            label: "إجمالي الإنفاق",
            value: formatCurrency(totalSpent),
            icon: DollarSign,
            color: statColors.primary,
            hint: "الطلبات المدفوعة وغير الملغاة",
          },
          { label: "متوسط الطلب", value: formatCurrency(avgOrder), icon: DollarSign, color: statColors.amber },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <Section title="معلومات العميل" contentClassName="pt-0">
            <dl className="space-y-3 text-[13px]">
              <div className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                <dd className="min-w-0 truncate">
                  <a href={`mailto:${customer.email}`} className="text-fg-muted hover:text-primary-600 hover:underline">
                    {customer.email}
                  </a>
                </dd>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                {customer.phone ? (
                  <dd className="min-w-0 truncate" dir="ltr">
                    <a href={`tel:${customer.phone}`} className="text-fg-muted hover:text-primary-600 hover:underline">
                      {customer.phone}
                    </a>
                  </dd>
                ) : (
                  <dd className="text-fg-subtle">لا يوجد رقم جوال</dd>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                <dd className="text-fg-muted">مسجَّل منذ {formatDate(customer.createdAt)}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                <dd className="text-fg-muted">
                  {customer.lastOrderAt ? `آخر طلب ${relativeDate(customer.lastOrderAt)}` : "لم يشترِ بعد"}
                </dd>
              </div>
            </dl>
          </Section>

          <Section
            title="ملاحظات إدارية"
            description="يراها فريقك فقط — لا تظهر للعميل أبداً."
            contentClassName="space-y-3 pt-0"
          >
            <Textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: يفضّل التواصل عبر واتساب، أو طلب فاتورة ضريبية باسم الشركة."
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                loading={savingNotes}
                disabled={notes === (customer.adminNotes ?? "")}
                onClick={saveNotes}
                icon={<StickyNote className="h-3.5 w-3.5" />}
              >
                حفظ الملاحظة
              </Button>
            </div>
          </Section>

          <Section
            title="عناوين الشحن"
            description="مأخوذة من طلبات العميل السابقة."
            contentClassName="pt-0"
          >
            {customer.addresses.length === 0 ? (
              <EmptyState size="sm" icon={MapPin} title="لا توجد عناوين" description="سيظهر العنوان بعد أول طلب." />
            ) : (
              <ul className="space-y-2">
                {customer.addresses.map((a, i) => (
                  <li key={i} className="rounded-control border border-line p-3 text-[13px]">
                    <p className="font-semibold text-fg">{a.name || customer.name}</p>
                    <p className="mt-0.5 text-fg-muted">
                      {[a.address, a.city, a.country].filter(Boolean).join("، ") || "—"}
                    </p>
                    {a.phone && (
                      <p className="mt-0.5 text-[11px] text-fg-subtle" dir="ltr">
                        {a.phone}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-fg-subtle">استُخدم {relativeDate(a.lastUsedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Section
            title="سجل الطلبات"
            description={shownOrders < allOrders ? `أحدث ${shownOrders} من ${allOrders} طلب` : `${allOrders} طلب`}
            contentClassName="pt-0"
          >
            {customer.orders.length === 0 ? (
              <EmptyState
                size="sm"
                icon={ShoppingBag}
                title="لم يشترِ هذا العميل بعد"
                description="ستظهر طلباته هنا بمجرد إتمام أول عملية شراء."
              />
            ) : (
              <ul className="space-y-2">
                {customer.orders.map((order) => {
                  const { variant, label } = getStatusBadge(order.status);
                  return (
                    <li key={order.id}>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center justify-between gap-3 rounded-control border border-line p-3 transition-colors hover:bg-surface-hover"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand/10">
                            <ShoppingBag className="h-4 w-4 text-brand" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-bold text-fg">{order.orderNumber}</p>
                            <p className="truncate text-[11px] text-fg-muted">
                              {order.items.length} منتج · {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          <Badge variant={variant}>{label}</Badge>
                          <span className="whitespace-nowrap text-[13px] font-bold tnum text-fg">
                            {formatCurrency(parseFloat(String(order.total)))}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section
            title="تذاكر الدعم"
            description={customer._count.tickets > 0 ? `${customer._count.tickets} تذكرة` : undefined}
            contentClassName="pt-0"
          >
            {customer.tickets.length === 0 ? (
              <EmptyState size="sm" icon={LifeBuoy} title="لا توجد تذاكر" description="لم يتواصل هذا العميل مع الدعم." />
            ) : (
              <ul className="space-y-2">
                {customer.tickets.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/admin/tickets/${t.id}`}
                      className="flex items-center justify-between gap-3 rounded-control border border-line p-3 transition-colors hover:bg-surface-hover"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-fg">{t.subject}</p>
                        <p className="truncate font-mono text-[11px] text-fg-muted">
                          {t.ticketNumber} · {formatDate(t.createdAt)}
                        </p>
                      </div>
                      <Badge variant={getStatusBadge(t.status).variant}>{getStatusBadge(t.status).label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {customer.abandonedCarts.length > 0 && (
            <Section
              title="سلات متروكة"
              description="سلات لم تكتمل — فرصة متابعة."
              contentClassName="pt-0"
            >
              <ul className="space-y-2">
                {customer.abandonedCarts.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-control border border-warning/25 bg-warning/10 p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ShoppingCart className="h-4 w-4 shrink-0 text-warning" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-fg">{c.itemCount} منتج في السلة</p>
                        <p className="text-[11px] text-fg-muted">آخر تحديث {relativeDate(c.updatedAt)}</p>
                      </div>
                    </div>
                    <span className="whitespace-nowrap text-[13px] font-bold tnum text-fg">
                      {formatCurrency(parseFloat(String(c.total)))}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>

      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="تعديل بيانات العميل"
        description="تصحيح الاسم أو البريد أو الجوال. لا يؤثّر على كلمة المرور."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button loading={saving} onClick={saveEdit}>
              حفظ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="الاسم"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="البريد الإلكتروني"
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            hint="تغيير البريد يغيّر اسم الدخول الذي يستخدمه العميل."
          />
          <Input
            label="الجوال"
            dir="ltr"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+9665xxxxxxxx"
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmErase}
        onClose={() => setConfirmErase(false)}
        onConfirm={anonymize}
        variant="danger"
        title="إخفاء هوية العميل"
        message="سيُمحى الاسم والبريد والجوال والملاحظات نهائياً ولا يمكن التراجع. تبقى الطلبات والفواتير كما هي لأن النظام الضريبي يُلزم بحفظها، لكنها لن تحمل أي بيانات شخصية."
        confirmLabel="نعم، امحُ البيانات"
        loading={erasing}
      />

      <ConfirmModal
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={sendReset}
        variant="primary"
        title="إرسال رابط إعادة تعيين كلمة المرور"
        message={`سيصل إلى ${customer.email} رابط صالح لمدة 30 دقيقة يختار من خلاله كلمة مرور جديدة. أنت لا ترى كلمة المرور ولا تحدّدها.`}
        confirmLabel="إرسال الرابط"
        loading={resetting}
      />

      <ConfirmModal
        isOpen={confirmToggle}
        onClose={() => setConfirmToggle(false)}
        onConfirm={toggleActive}
        variant={customer.isActive ? "danger" : "primary"}
        title={customer.isActive ? "تعطيل حساب العميل" : "تفعيل حساب العميل"}
        message={
          customer.isActive
            ? "لن يتمكّن العميل من تسجيل الدخول أو إتمام أي طلب جديد. يمكنك إعادة التفعيل في أي وقت."
            : "سيتمكّن العميل من تسجيل الدخول والشراء مرة أخرى."
        }
        confirmLabel={customer.isActive ? "تعطيل" : "تفعيل"}
        loading={toggling}
      />
    </div>
  );
}
