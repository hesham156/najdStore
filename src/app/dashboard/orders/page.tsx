import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge, getStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: {
      items: { include: { product: true } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">طلباتي</h1>
          <p className="text-fg-subtle text-sm mt-1">{orders.length} طلب</p>
        </div>
        <Link href="/products" className="btn-primary text-sm px-4 py-2">
          طلب جديد
        </Link>
      </div>

      {orders.length === 0 ? (
        <Card className="text-center py-16">
          <ShoppingBag className="h-14 w-14 text-fg-subtle mx-auto mb-4" />
          <h2 className="font-bold text-fg mb-2">لا توجد طلبات</h2>
          <p className="text-fg-subtle text-sm mb-6">لم تقم بأي طلبات بعد</p>
          <Link href="/products" className="btn-primary inline-flex">تصفح المنتجات</Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const { variant, label } = getStatusBadge(order.status);
            const paymentStatus = order.payment ? getStatusBadge(order.payment.status) : null;
            return (
              <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
                <Card hover className="group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                        <ShoppingBag className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-fg">{order.orderNumber}</p>
                          <Badge variant={variant}>{label}</Badge>
                        </div>
                        <p className="text-sm text-fg-subtle">
                          {order.items.length} منتج • {formatDate(order.createdAt)}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {order.items.slice(0, 3).map((item) => (
                            <span key={item.id} className="text-xs px-2 py-0.5 rounded-full bg-surface-sunken text-fg-muted">
                              {item.product.nameAr}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="font-black text-lg text-fg">{formatCurrency(parseFloat(String(order.total)))}</p>
                      {paymentStatus && (
                        <Badge variant={paymentStatus.variant} className="mt-1 text-xs">
                          {paymentStatus.label}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 justify-end mt-2 text-primary-600 dark:text-primary-400 group-hover:gap-2 transition-all">
                        <span className="text-xs font-medium">التفاصيل</span>
                        <ArrowLeft className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
