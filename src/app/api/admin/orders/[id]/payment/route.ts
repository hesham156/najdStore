import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, badRequest, serverError } from "@/lib/api";
import { notifyOrderStatusUpdated } from "@/lib/hayyak";
import { restoreStock } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const { action, adminNotes } = await req.json();
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { payment: true, items: { include: { product: true } }, user: true },
    });

    if (!order) return notFound("الطلب غير موجود");

    if (action === "approve") {
      // Update payment
      await prisma.payment.update({
        where: { orderId: params.id },
        data: {
          status: "APPROVED",
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          adminNotes,
        },
      });

      // Check if all products have automatic delivery
      const hasAutoDelivery = order.items.some((item) => item.product.deliveryMethod === "AUTOMATIC");

      let newStatus: "PAYMENT_APPROVED" | "DELIVERED" = "PAYMENT_APPROVED";

      if (hasAutoDelivery) {
        // Try automatic delivery
        for (const item of order.items) {
          if (item.product.deliveryMethod === "AUTOMATIC") {
            const stockItems = await prisma.subscriptionStock.findMany({
              where: { productId: item.productId, isDelivered: false },
              take: item.quantity,
            });

            if (stockItems.length >= item.quantity) {
              const deliveredData = stockItems.map((s) => s.data).join("\n---\n");
              await prisma.orderItem.update({
                where: { id: item.id },
                data: { deliveredData, deliveredAt: new Date() },
              });
              await prisma.subscriptionStock.updateMany({
                where: { id: { in: stockItems.map((s) => s.id) } },
                data: { isDelivered: true, orderItemId: item.id },
              });
              // Update product stock count
              await prisma.product.update({
                where: { id: item.productId },
                data: { stockCount: { decrement: item.quantity } },
              });
            }
          }
        }

        // Check if all items delivered
        const updatedItems = await prisma.orderItem.findMany({ where: { orderId: params.id } });
        if (updatedItems.every((i) => i.deliveredData)) {
          newStatus = "DELIVERED";
        }
      }

      const updatedOrder = await prisma.order.update({
        where: { id: params.id },
        data: { status: newStatus },
        include: { user: true, payment: true, items: { include: { product: true } } },
      });

      // Notify customer
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: newStatus === "DELIVERED" ? "تم تسليم طلبك!" : "تم الموافقة على دفعك",
          body: newStatus === "DELIVERED"
            ? `تم تسليم طلبك ${order.orderNumber}. يمكنك الاطلاع على بيانات الاشتراك من لوحة التحكم.`
            : `تم الموافقة على دفع طلبك ${order.orderNumber}. سيتم التسليم قريباً.`,
          type: "ORDER_UPDATE",
          orderId: params.id,
        },
      });

      // Log admin action
      await prisma.adminLog.create({
        data: {
          userId: session.user.id,
          action: "APPROVE_PAYMENT",
          entity: "Order",
          entityId: params.id,
          details: { orderNumber: order.orderNumber },
        },
      });

      // إشعار حياك بتغيّر حالة الطلب
      await notifyOrderStatusUpdated(updatedOrder);

      return NextResponse.json({ success: true, data: updatedOrder });
    }

    if (action === "reject") {
      await prisma.payment.update({
        where: { orderId: params.id },
        data: { status: "REJECTED", reviewedBy: session.user.id, reviewedAt: new Date(), adminNotes },
      });
      const updatedOrder = await prisma.order.update({
        where: { id: params.id },
        data: { status: "CANCELLED" },
        include: { user: true, payment: true, items: { include: { product: true } } },
      });

      // Return reserved stock to the catalog (guard against double-restore)
      if (order.status !== "CANCELLED") {
        await restoreStock(
          order.items.map((it) => ({ productId: it.productId, variantId: it.variantId, quantity: it.quantity })),
        ).catch(() => {});
      }

      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: "تم رفض دفعك",
          body: `تم رفض دفع طلبك ${order.orderNumber}. ${adminNotes || "يرجى التواصل مع الدعم."}`,
          type: "ORDER_UPDATE",
          orderId: params.id,
        },
      });

      await prisma.adminLog.create({
        data: { userId: session.user.id, action: "REJECT_PAYMENT", entity: "Order", entityId: params.id },
      });

      // إشعار حياك بتغيّر حالة الطلب
      await notifyOrderStatusUpdated(updatedOrder);

      return NextResponse.json({ success: true, data: updatedOrder });
    }

    return badRequest("إجراء غير صالح");
  } catch (err) {
    return serverError("PATCH /api/admin/orders/[id]/payment", err);
  }
}
