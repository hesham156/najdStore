import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Lock, Copy, CheckCircle, Clock, Upload } from "lucide-react";
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from "@/lib/utils";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PaymentUploadForm } from "./PaymentUploadForm";
import { SAFE_USER_SELECT } from "@/lib/users";

interface Props { params: { id: string } }

export default async function OrderDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      payment: true,
      user: { select: SAFE_USER_SELECT },
    },
  });

  if (!order) notFound();

  const { variant: statusVariant, label: statusLabel } = getStatusBadge(order.status);
  const paymentBadge = order.payment ? getStatusBadge(order.payment.status) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-fg-subtle">
        <Link href="/dashboard" className="hover:text-primary-600 dark:hover:text-primary-400">لوحة التحكم</Link>
        <ArrowRight className="h-4 w-4" />
        <Link href="/dashboard/orders" className="hover:text-primary-600 dark:hover:text-primary-400">الطلبات</Link>
        <ArrowRight className="h-4 w-4" />
        <span className="text-fg">{order.orderNumber}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">{order.orderNumber}</h1>
          <p className="text-fg-subtle text-sm mt-1">{formatDateTime(order.createdAt)}</p>
        </div>
        <Badge variant={statusVariant} className="text-sm px-3 py-1">{statusLabel}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Products */}
          <Card>
            <h2 className="font-bold text-fg mb-4">المنتجات</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-surface-sunken border border-line flex items-center justify-center shrink-0">
                    {item.product.image ? (
                      <Image src={item.product.image} alt={item.product.nameAr} width={56} height={56} className="object-contain p-1" unoptimized />
                    ) : (
                      <span className="text-2xl">{item.product.category.icon || "📦"}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg">{item.product.nameAr}</p>
                    <p className="text-sm text-fg-subtle">الكمية: {item.quantity}</p>
                    <p className="text-sm font-bold text-primary-600 dark:text-primary-400 mt-1">
                      {formatCurrency(parseFloat(String(item.price)) * item.quantity)}
                    </p>
                  </div>

                  {/* Delivered Subscription Data */}
                  {item.deliveredData && (
                    <div className="mt-3 p-4 bg-success/10 border border-success/25 rounded-xl w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <p className="font-bold text-success text-sm">بيانات الاشتراك</p>
                        {item.deliveredAt && (
                          <span className="text-xs text-success me-auto">سُلِّم {formatDateTime(item.deliveredAt)}</span>
                        )}
                      </div>
                      <div className="bg-surface rounded-lg p-3 border border-success/25">
                        <pre className="text-sm text-fg-muted whitespace-pre-wrap font-mono leading-relaxed">
                          {item.deliveredData}
                        </pre>
                      </div>
                      <p className="text-xs text-success mt-2 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        هذه البيانات مرئية لك فقط. احتفظ بها في مكان آمن.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Payment Proof Upload (if pending) */}
          {order.payment?.status === "PENDING" && order.status !== "CANCELLED" && (
            <PaymentUploadForm orderId={order.id} />
          )}

          {/* Notes */}
          {order.notes && (
            <Card>
              <h2 className="font-bold text-fg mb-2">ملاحظات الطلب</h2>
              <p className="text-fg-muted text-sm">{order.notes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Order Summary */}
          <Card>
            <h2 className="font-bold text-fg mb-4">ملخص الطلب</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-fg-subtle">المجموع الفرعي</span>
                <span className="font-medium">{formatCurrency(parseFloat(String(order.subtotal)))}</span>
              </div>
              {parseFloat(String(order.discount)) > 0 && (
                <div className="flex justify-between text-success">
                  <span>الخصم</span>
                  <span>- {formatCurrency(parseFloat(String(order.discount)))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-line pt-2 mt-2">
                <span>الإجمالي</span>
                <span className="text-primary-600 dark:text-primary-400">{formatCurrency(parseFloat(String(order.total)))}</span>
              </div>
            </div>
          </Card>

          {/* Payment Info */}
          {order.payment && (
            <Card>
              <h2 className="font-bold text-fg mb-4">معلومات الدفع</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-fg-subtle">طريقة الدفع</span>
                  <span className="font-medium">{getPaymentMethodLabel(order.payment.method)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-fg-subtle">حالة الدفع</span>
                  {paymentBadge && <Badge variant={paymentBadge.variant}>{paymentBadge.label}</Badge>}
                </div>
                {order.payment.transactionId && (
                  <div className="flex justify-between items-center">
                    <span className="text-fg-subtle">رقم المعاملة</span>
                    <span className="font-mono text-xs">{order.payment.transactionId}</span>
                  </div>
                )}
                {order.payment.proofImage && (
                  <div>
                    <p className="text-fg-subtle mb-1">إثبات الدفع</p>
                    <a href={order.payment.proofImage} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 text-xs hover:underline flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      عرض الإثبات
                    </a>
                  </div>
                )}
                {order.payment.adminNotes && (
                  <div className="bg-warning/10 border border-warning/25 rounded-lg p-3">
                    <p className="text-xs font-bold text-warning mb-1">ملاحظة من الإدارة:</p>
                    <p className="text-xs text-warning">{order.payment.adminNotes}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <h2 className="font-bold text-fg mb-4">حالة الطلب</h2>
            <div className="space-y-3">
              {[
                { status: "PENDING", label: "تم إنشاء الطلب", done: true },
                { status: "PENDING_PAYMENT_REVIEW", label: "بانتظار مراجعة الدفع", done: ["PENDING_PAYMENT_REVIEW", "PAYMENT_APPROVED", "PROCESSING", "DELIVERED"].includes(order.status) },
                { status: "PAYMENT_APPROVED", label: "تم الموافقة على الدفع", done: ["PAYMENT_APPROVED", "PROCESSING", "DELIVERED"].includes(order.status) },
                { status: "DELIVERED", label: "تم التسليم", done: order.status === "DELIVERED" },
              ].map((step, i) => (
                <div key={step.status} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-success-solid" : "bg-surface-sunken"}`}>
                    {step.done ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-fg-subtle" />
                    )}
                  </div>
                  <span className={`text-sm ${step.done ? "text-fg font-medium" : "text-fg-subtle"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Support */}
          <Link href={`/dashboard/tickets?orderId=${order.id}`}>
            <Card hover className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
              <p className="font-bold text-primary-700 dark:text-primary-300 text-sm">مشكلة في الطلب؟</p>
              <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">افتح تذكرة دعم فني</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
