import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, badRequest, serverError } from "@/lib/api";
import { notifyOrderStatusUpdated } from "@/lib/hayyak";
import { SAFE_USER_SELECT } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const { itemId, deliveredData, subscriptionStartDate, subscriptionEndDate, variantLabel } = await req.json();

    // Server-side guard: only allow delivery when payment is confirmed
    const order = await prisma.order.findUnique({ where: { id: params.id }, select: { status: true } });
    if (!order) return notFound("الطلب غير موجود");
    if (order.status !== "PAYMENT_APPROVED" && order.status !== "PROCESSING") {
      return badRequest("لا يمكن التسليم قبل الموافقة على الدفع");
    }

    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        deliveredData,
        deliveredAt: new Date(),
        variantLabel: variantLabel || null,
        subscriptionStartDate: subscriptionStartDate ? new Date(subscriptionStartDate) : new Date(),
        subscriptionEndDate: subscriptionEndDate ? new Date(subscriptionEndDate) : null,
      },
    });

    // Check if all items are delivered
    const allItems = await prisma.orderItem.findMany({ where: { orderId: params.id } });
    const allDelivered = allItems.every((item) => item.deliveredData);

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: allDelivered ? { status: "DELIVERED" } : { status: "PROCESSING" },
      include: {
        user: { select: SAFE_USER_SELECT },
        payment: true,
        items: { include: { product: { include: { category: true } } } },
      },
    });

    if (allDelivered) {
      await prisma.notification.create({
        data: {
          userId: updatedOrder.userId,
          title: "تم تسليم طلبك! 🎉",
          body: `تم تسليم طلبك ${updatedOrder.orderNumber} بنجاح. يمكنك الاطلاع على بيانات الاشتراك من لوحة التحكم.`,
          type: "ORDER_UPDATE",
          orderId: params.id,
        },
      });
    }

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "DELIVER_ORDER_ITEM",
        entity: "OrderItem",
        entityId: itemId,
        details: { orderId: params.id, subscriptionEndDate },
      },
    });

    // إشعار حياك بتغيّر حالة الطلب (PROCESSING / DELIVERED)
    await notifyOrderStatusUpdated(updatedOrder);

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (err) {
    return serverError("POST /api/admin/orders/[id]/deliver", err);
  }
}
