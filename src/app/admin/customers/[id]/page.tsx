"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Mail,
  Phone,
  ShoppingBag,
  UserCheck,
  UserX,
} from "lucide-react";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, Section } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Order {
  id: string;
  orderNumber: string;
  total: number | string;
  status: string;
  createdAt: string;
  items: { id: string }[];
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  role: string;
  createdAt: string;
  orders: Order[];
  _count: { orders: number };
  /** Totals computed server-side across ALL orders, not just the listed ones. */
  totalSpent?: number;
  paidOrders?: number;
  deliveredOrders?: number;
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

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/customers/${params.id}`);
      const data = await res.json();
      if (data.success) setCustomer(data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const toggleActive = async () => {
    if (!customer) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/admin/customers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !customer.isActive }),
      });
      const data = await res.json();
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

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/admin" },
          { label: "العملاء", href: "/admin/customers" },
          { label: customer.name },
        ]}
        title={customer.name}
        description={customer.email}
        badge={
          <Badge variant={customer.isActive ? "success" : "danger"} dot>
            {customer.isActive ? "حساب نشط" : "حساب معطل"}
          </Badge>
        }
        actions={
          canToggle && (
            <Button
              variant={customer.isActive ? "soft-danger" : "success"}
              loading={toggling}
              onClick={() => setConfirmToggle(true)}
              icon={customer.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
            >
              {customer.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
            </Button>
          )
        }
      />

      <AdminStats
        items={[
          { label: "إجمالي الطلبات", value: allOrders, icon: ShoppingBag, color: statColors.blue },
          { label: "طلبات مكتملة", value: deliveredCount, icon: CheckCircle2, color: statColors.green },
          { label: "إجمالي الإنفاق", value: formatCurrency(totalSpent), icon: DollarSign, color: statColors.primary, hint: "الطلبات المدفوعة وغير الملغاة" },
          { label: "متوسط الطلب", value: formatCurrency(avgOrder), icon: DollarSign, color: statColors.amber },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Section title="معلومات العميل" className="lg:col-span-1" contentClassName="pt-0">
          <dl className="space-y-3 text-[13px]">
            <div className="flex items-center gap-2.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
              <dd className="min-w-0 truncate">
                <a href={`mailto:${customer.email}`} className="text-fg-muted hover:text-primary-600 hover:underline">
                  {customer.email}
                </a>
              </dd>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                <dd className="min-w-0 truncate" dir="ltr">
                  <a href={`tel:${customer.phone}`} className="text-fg-muted hover:text-primary-600 hover:underline">
                    {customer.phone}
                  </a>
                </dd>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
              <dd className="text-fg-muted">مسجَّل منذ {formatDate(customer.createdAt)}</dd>
            </div>
          </dl>
        </Section>

        <Section
          title="سجل الطلبات"
          description={shownOrders < allOrders ? `أحدث ${shownOrders} من ${allOrders} طلب` : `${allOrders} طلب`}
          className="lg:col-span-2"
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
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-500/10">
                          <ShoppingBag className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden />
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
      </div>

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
