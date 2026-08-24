import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, badRequest } from "@/lib/api";
import { PAID_STATUSES } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return unauthorized();

  const customer = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, email: true, phone: true,
      isActive: true, role: true, createdAt: true, avatar: true,
      orders: {
        select: {
          id: true, orderNumber: true, total: true, status: true, createdAt: true,
          items: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: { select: { orders: true } },
    },
  });

  if (!customer) return notFound("العميل غير موجود");

  // `orders` above is only the most recent page. Spend and completion counts
  // must span every order the customer ever placed, so they are aggregated
  // separately — and with the same status rule the accounting books use.
  const [paid, delivered] = await Promise.all([
    prisma.order.aggregate({
      _sum: { total: true },
      _count: true,
      where: { userId: params.id, status: { in: PAID_STATUSES } },
    }),
    prisma.order.count({ where: { userId: params.id, status: "DELIVERED" } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      ...customer,
      totalSpent: Number(paid._sum.total ?? 0),
      paidOrders: paid._count,
      deliveredOrders: delivered,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  // Only ADMIN (not STAFF) can toggle a customer account.
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "تفعيل أو تعطيل حسابات العملاء متاح للمدير العام فقط" },
      { status: 403 }
    );
  }

  const { isActive } = await req.json();
  if (typeof isActive !== "boolean") return badRequest("قيمة الحالة غير صحيحة");

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { isActive },
    select: { id: true, isActive: true },
  });

  return NextResponse.json({ success: true, data: user });
}
