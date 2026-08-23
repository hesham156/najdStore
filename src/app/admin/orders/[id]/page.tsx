"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Mail,
  Package,
  Phone,
  Printer,
  Send,
  ShoppingBag,
  Truck,
  User,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Card, Section } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Alert, ErrorState, Skeleton } from "@/components/ui/States";
import { PageHeader } from "@/components/admin/PageHeader";
import { ShipmentCard } from "@/components/admin/ShipmentCard";
import { formatCurrency, formatDate, formatDateTime, getPaymentMethodLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { OrderWithDetails } from "@/types";

interface DeliveryForm {
  data: string;
  startDate: string;
  endDate: string;
  variantLabel: string;
}

function defaultStartEnd() {
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] };
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | false>(false);
  const [deliveryForms, setDeliveryForms] = useState<Record<string, DeliveryForm>>({});
  const [adminNotes, setAdminNotes] = useState("");
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/orders/${params.id}`);
      const data = await res.json();
      if (!data.success) {
        setError(true);
        return;
      }
      setOrder(data.data);
      const forms: Record<string, DeliveryForm> = {};
      data.data.items?.forEach((item: { id: string }) => {
        forms[item.id] = { data: "", variantLabel: "", ...defaultStartEnd() };
      });
      setDeliveryForms(forms);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const updateForm = (itemId: string, field: keyof DeliveryForm, value: string) =>
    setDeliveryForms((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));

  const handlePaymentAction = async (action: "approve" | "reject") => {
    setActionLoading("payment");
    try {
      const res = await fetch(`/api/admin/orders/${params.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, adminNotes }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === "approve" ? "تم قبول الدفع" : "تم رفض الدفع");
        setOrder(data.data);
      } else {
        toast.error(data.error || "تعذّر تنفيذ الإجراء");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverItem = async (itemId: string) => {
    const form = deliveryForms[itemId];
    if (!form?.data.trim()) {
      toast.error("أدخل بيانات الاشتراك قبل التسليم");
      return;
    }
    setActionLoading(itemId);
    try {
      const res = await fetch(`/api/admin/orders/${params.id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          deliveredData: form.data,
          subscriptionStartDate: form.startDate,
          subscriptionEndDate: form.endDate,
          variantLabel: form.variantLabel,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("تم تسليم الاشتراك للعميل");
        setOrder(result.data);
      } else {
        toast.error(result.error || "تعذّر إتمام التسليم");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setActionLoading(false);
    }
  };

  /* ── States ── */
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Skeleton className="h-80 rounded-card xl:col-span-2" />
          <div className="space-y-4">
            <Skeleton className="h-32 rounded-card" />
            <Skeleton className="h-40 rounded-card" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card padding="none">
        <ErrorState
          title="تعذّر عرض الطلب"
          description="قد يكون الطلب محذوفاً أو أن الاتصال بالخادم فشل. عد إلى قائمة الطلبات أو أعد المحاولة."
          onRetry={loadOrder}
        />
        <div className="flex justify-center pb-6">
          <Link href="/admin/orders">
            <Button variant="secondary" size="sm">
              العودة إلى الطلبات
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const { variant, label } = getStatusBadge(order.status);
  const payBadge = order.payment ? getStatusBadge(order.payment.status) : null;
  const canDeliver = order.status === "PAYMENT_APPROVED" || order.status === "PROCESSING";
  const deliveredCount = order.items?.filter((i) => !!i.deliveredData).length ?? 0;
  const totalItems = order.items?.length ?? 0;

  /* Timeline is derived from the order's own data — no new fields needed. */
  const timeline = [
    { icon: ShoppingBag, label: "تم إنشاء الطلب", at: order.createdAt, done: true },
    {
      icon: CreditCard,
      label:
        order.payment?.status === "APPROVED"
          ? "تم قبول الدفع"
          : order.payment?.status === "REJECTED"
            ? "تم رفض الدفع"
            : order.payment?.status === "UPLOADED"
              ? "بانتظار مراجعة إثبات الدفع"
              : "بانتظار الدفع",
      at: order.payment?.status === "APPROVED" ? order.updatedAt : null,
      done: order.payment?.status === "APPROVED",
      failed: order.payment?.status === "REJECTED",
    },
    {
      icon: Truck,
      label:
        deliveredCount === 0
          ? "بانتظار التسليم"
          : deliveredCount < totalItems
            ? `تم تسليم ${deliveredCount} من ${totalItems}`
            : "تم تسليم كل الأصناف",
      at: order.items?.find((i) => i.deliveredAt)?.deliveredAt ?? null,
      done: totalItems > 0 && deliveredCount === totalItems,
    },
    {
      icon: CheckCircle2,
      label: order.status === "CANCELLED" ? "تم إلغاء الطلب" : "اكتمل الطلب",
      at: order.status === "DELIVERED" ? order.updatedAt : null,
      done: order.status === "DELIVERED",
      failed: order.status === "CANCELLED" || order.status === "REFUNDED",
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/admin" },
          { label: "الطلبات", href: "/admin/orders" },
          { label: order.orderNumber },
        ]}
        title={<span className="font-mono">{order.orderNumber}</span>}
        description={formatDateTime(order.createdAt)}
        badge={<Badge variant={variant} dot>{label}</Badge>}
        actions={
          <Button
            variant="secondary"
            className="no-print"
            onClick={() => window.print()}
            icon={<Printer className="h-4 w-4" />}
          >
            طباعة
          </Button>
        }
      />

      {/* Payment review — the one action that blocks everything else */}
      {order.payment?.status === "UPLOADED" && (
        <Card className="border-blue-200 bg-blue-50/60 dark:border-blue-500/25 dark:bg-blue-500/[0.07]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden />
                <h2 className="text-sm font-bold text-blue-900 dark:text-blue-200">بانتظار مراجعة إثبات الدفع</h2>
              </div>
              <p className="text-[13px] text-blue-800/80 dark:text-blue-200/70">
                راجع إثبات الدفع المرفوع من العميل ثم اقبله لتتمكّن من تسليم الاشتراك، أو ارفضه مع توضيح السبب.
              </p>
              {order.payment.proofImage && (
                <a
                  href={order.payment.proofImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-700 hover:underline dark:text-blue-300"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  عرض إثبات الدفع
                </a>
              )}
              <Textarea
                label="ملاحظة للعميل"
                hint="تظهر للعميل — استخدمها لتوضيح سبب الرفض أو أي تعليمات إضافية."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="مثال: صورة التحويل غير واضحة، يرجى إعادة الرفع"
                rows={2}
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                onClick={() => handlePaymentAction("approve")}
                loading={actionLoading === "payment"}
                variant="success"
                icon={<Check className="h-4 w-4" />}
              >
                قبول الدفع
              </Button>
              <Button
                onClick={() => handlePaymentAction("reject")}
                loading={actionLoading === "payment"}
                variant="danger"
                icon={<X className="h-4 w-4" />}
              >
                رفض
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* ── Items & delivery ── */}
        <div className="space-y-5 xl:col-span-2">
          <Section
            title="المنتجات والتسليم"
            description={totalItems > 0 ? `${deliveredCount} من ${totalItems} تم تسليمها` : undefined}
            contentClassName="space-y-4"
          >
            {order.items?.map((item) => {
              const form = deliveryForms[item.id] || ({} as DeliveryForm);
              const isDelivered = !!item.deliveredData;
              const daysLeft = item.subscriptionEndDate
                ? Math.ceil((new Date(item.subscriptionEndDate).getTime() - Date.now()) / 86_400_000)
                : null;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-control border p-4",
                    isDelivered
                      ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/25 dark:bg-emerald-500/[0.06]"
                      : "border-line"
                  )}
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
                      {item.product.image ? (
                        <Image
                          src={item.product.image}
                          alt=""
                          width={48}
                          height={48}
                          className="h-full w-full object-contain p-1"
                          unoptimized
                        />
                      ) : (
                        <Package className="h-5 w-5 text-fg-subtle" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-fg">{item.product.nameAr}</p>
                      <p className="mt-0.5 text-xs text-fg-muted">
                        الكمية: {item.quantity} · {formatCurrency(item.price)}
                      </p>
                      {item.variantLabel && (
                        <Badge variant="primary" size="sm" className="mt-1.5">
                          {item.variantLabel}
                        </Badge>
                      )}
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-fg-muted">
                      {item.product.deliveryMethod === "AUTOMATIC" ? (
                        <>
                          <Zap className="h-3.5 w-3.5 text-amber-500" aria-hidden /> تلقائي
                        </>
                      ) : (
                        <>
                          <Clock className="h-3.5 w-3.5" aria-hidden /> يدوي
                        </>
                      )}
                    </span>
                  </div>

                  {isDelivered ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <Check className="h-4 w-4" aria-hidden /> تم التسليم في {formatDate(item.deliveredAt!)}
                        </span>
                        {daysLeft !== null && (
                          <Badge variant={daysLeft < 0 ? "danger" : daysLeft <= 7 ? "warning" : "success"}>
                            {daysLeft < 0 ? `انتهى منذ ${Math.abs(daysLeft)} يوم` : `باقي ${daysLeft} يوم`}
                          </Badge>
                        )}
                      </div>

                      {(item.subscriptionStartDate || item.subscriptionEndDate) && (
                        <div className="flex flex-wrap gap-4 text-[11px] text-fg-muted">
                          {item.subscriptionStartDate && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" aria-hidden /> بدأ: {formatDate(item.subscriptionStartDate)}
                            </span>
                          )}
                          {item.subscriptionEndDate && (
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" aria-hidden /> ينتهي: {formatDate(item.subscriptionEndDate)}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="rounded-control border border-line bg-surface p-3">
                        <button
                          type="button"
                          onClick={() => setShowCredentials((p) => ({ ...p, [item.id]: !p[item.id] }))}
                          aria-expanded={!!showCredentials[item.id]}
                          className="flex items-center gap-1.5 text-xs font-medium text-fg-muted transition-colors hover:text-fg"
                        >
                          {showCredentials[item.id] ? (
                            <EyeOff className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {showCredentials[item.id] ? "إخفاء بيانات الاشتراك" : "عرض بيانات الاشتراك"}
                        </button>
                        {showCredentials[item.id] && (
                          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-sunken p-2.5 font-mono text-xs text-fg" dir="ltr">
                            {item.deliveredData}
                          </pre>
                        )}
                      </div>
                    </div>
                  ) : canDeliver ? (
                    <div className="space-y-3 rounded-control bg-surface-muted p-3.5">
                      <h3 className="text-[13px] font-semibold text-fg">تسليم الاشتراك</h3>
                      <Textarea
                        label="بيانات الاشتراك"
                        required
                        hint="البريد وكلمة المرور أو كود التفعيل — تُرسل للعميل كما هي."
                        value={form.data || ""}
                        onChange={(e) => updateForm(item.id, "data", e.target.value)}
                        placeholder={"email: user@example.com\npassword: pass123"}
                        rows={3}
                      />
                      <Input
                        label="اسم الباقة"
                        hint="اختياري — يظهر للعميل بجانب الاشتراك."
                        value={form.variantLabel || ""}
                        onChange={(e) => updateForm(item.id, "variantLabel", e.target.value)}
                        placeholder="مثال: شهر واحد"
                      />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="تاريخ البدء"
                          type="date"
                          value={form.startDate || ""}
                          onChange={(e) => updateForm(item.id, "startDate", e.target.value)}
                        />
                        <Input
                          label="تاريخ الانتهاء"
                          type="date"
                          value={form.endDate || ""}
                          onChange={(e) => updateForm(item.id, "endDate", e.target.value)}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleDeliverItem(item.id)}
                        loading={actionLoading === item.id}
                        icon={<Send className="h-3.5 w-3.5" />}
                      >
                        تسليم الاشتراك
                      </Button>
                    </div>
                  ) : (
                    <Alert tone="warning" icon={Clock}>
                      لا يمكن التسليم قبل قبول الدفع. راجع إثبات الدفع أولاً.
                    </Alert>
                  )}
                </div>
              );
            })}
          </Section>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">
          <Section title="مسار الطلب" contentClassName="pt-0">
            <ol className="space-y-0">
              {timeline.map((step, i) => {
                const Icon = step.icon;
                const last = i === timeline.length - 1;
                return (
                  <li key={step.label} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                          step.failed
                            ? "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
                            : step.done
                              ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "border-line bg-surface-sunken text-fg-subtle"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      {!last && (
                        <span
                          className={cn("w-px flex-1", step.done ? "bg-emerald-200 dark:bg-emerald-500/30" : "bg-line")}
                        />
                      )}
                    </div>
                    <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-4")}>
                      <p className={cn("text-[13px] font-medium", step.done || step.failed ? "text-fg" : "text-fg-muted")}>
                        {step.label}
                      </p>
                      {step.at && <p className="mt-0.5 text-[11px] text-fg-subtle">{formatDateTime(step.at)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>

          <Section title="ملخص الطلب" contentClassName="pt-0">
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-fg-muted">المجموع الفرعي</dt>
                <dd className="tnum text-fg">{formatCurrency(order.subtotal)}</dd>
              </div>
              {parseFloat(String(order.discount)) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <dt>الخصم</dt>
                  <dd className="tnum">−{formatCurrency(order.discount)}</dd>
                </div>
              )}
              {parseFloat(String((order as { shippingCost?: number }).shippingCost ?? 0)) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-fg-muted">الشحن</dt>
                  <dd className="tnum text-fg">{formatCurrency((order as { shippingCost?: number }).shippingCost ?? 0)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                <dt>الإجمالي</dt>
                <dd className="tnum text-primary-600 dark:text-primary-400">{formatCurrency(order.total)}</dd>
              </div>
            </dl>
          </Section>

          <Section title="العميل" contentClassName="pt-0">
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex items-center gap-2.5">
                <User className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                <dd className="truncate font-medium text-fg">{order.user?.name}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                <dd className="truncate text-fg-muted">
                  <a href={`mailto:${order.user?.email}`} className="hover:text-primary-600 hover:underline">
                    {order.user?.email}
                  </a>
                </dd>
              </div>
              {order.user?.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                  <dd className="truncate text-fg-muted" dir="ltr">
                    <a href={`tel:${order.user.phone}`} className="hover:text-primary-600 hover:underline">
                      {order.user.phone}
                    </a>
                  </dd>
                </div>
              )}
              <Link
                href={`/admin/customers/${order.user?.id}`}
                className="mt-1 inline-block text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                عرض ملف العميل
              </Link>
            </dl>
          </Section>

          {order.payment && (
            <Section title="الدفع" contentClassName="pt-0">
              <dl className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-fg-muted">الطريقة</dt>
                  <dd className="text-fg">{getPaymentMethodLabel(order.payment.method)}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-fg-muted">الحالة</dt>
                  <dd>{payBadge && <Badge variant={payBadge.variant}>{payBadge.label}</Badge>}</dd>
                </div>
                {order.payment.transactionId && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-fg-muted">رقم المعاملة</dt>
                    <dd className="truncate font-mono text-[11px] text-fg">{order.payment.transactionId}</dd>
                  </div>
                )}
                {order.payment.proofImage && (
                  <a
                    href={order.payment.proofImage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    <Eye className="h-3 w-3" aria-hidden /> عرض إثبات الدفع
                  </a>
                )}
              </dl>
            </Section>
          )}

          <ShipmentCard
            order={order as unknown as Parameters<typeof ShipmentCard>[0]["order"]}
            onChange={loadOrder}
          />

          {order.notes && (
            <Section title="ملاحظات العميل" contentClassName="pt-0">
              <p className="flex items-start gap-2 text-[13px] leading-relaxed text-fg-muted">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
                {order.notes}
              </p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
