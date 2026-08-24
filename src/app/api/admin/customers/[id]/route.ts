import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, badRequest, serverError } from "@/lib/api";
import { PAID_STATUSES } from "@/lib/orders";

export const dynamic = "force-dynamic";

const ORDERS_SHOWN = 20;
const ANONYMIZED_DOMAIN = "@anonymized.invalid";
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return unauthorized();

  try {
    const customer = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, email: true, phone: true,
        isActive: true, role: true, createdAt: true, avatar: true,
        emailVerified: true, adminNotes: true,
        orders: {
          select: {
            id: true, orderNumber: true, total: true, status: true, createdAt: true,
            shipName: true, shipPhone: true, shipCity: true, shipAddress: true, shipCountry: true,
            items: { select: { id: true } },
          },
          orderBy: { createdAt: "desc" },
          take: ORDERS_SHOWN,
        },
        tickets: {
          select: { id: true, ticketNumber: true, subject: true, status: true, priority: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: { select: { orders: true, tickets: true } },
      },
    });

    if (!customer) return notFound("العميل غير موجود");

    // `orders` above is only the most recent page. Spend and completion counts
    // must span every order the customer ever placed, so they are aggregated
    // separately — and with the same status rule the accounting books use.
    const [paid, delivered, lastOrder, carts] = await Promise.all([
      prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: { userId: params.id, status: { in: PAID_STATUSES } },
      }),
      prisma.order.count({ where: { userId: params.id, status: "DELIVERED" } }),
      prisma.order.findFirst({
        where: { userId: params.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      // AbandonedCart has no relation field on User, so it is queried by id.
      prisma.abandonedCart.findMany({
        where: { userId: params.id, status: "ACTIVE" },
        select: { id: true, itemCount: true, total: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    // Addresses are not a table of their own — every order carries the address
    // it shipped to. Collapse the recent ones into a distinct list, newest first.
    const seen = new Set<string>();
    const addresses = customer.orders
      .filter((o) => o.shipAddress || o.shipCity)
      .map((o) => ({
        name: o.shipName,
        phone: o.shipPhone,
        city: o.shipCity,
        address: o.shipAddress,
        country: o.shipCountry,
        lastUsedAt: o.createdAt,
      }))
      .filter((a) => {
        const key = `${a.city ?? ""}|${a.address ?? ""}`.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        addresses,
        abandonedCarts: carts,
        totalSpent: Number(paid._sum.total ?? 0),
        paidOrders: paid._count,
        deliveredOrders: delivered,
        lastOrderAt: lastOrder?.createdAt ?? null,
        ordersShown: ORDERS_SHOWN,
      },
    });
  } catch (err) {
    return serverError("GET /api/admin/customers/[id]", err);
  }
}

/**
 * Edits a customer. Activation is ADMIN-only; STAFF may correct contact
 * details and leave notes, which is what they need to service an account.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};

    if ("isActive" in body) {
      if (session.user.role !== "ADMIN") {
        return NextResponse.json(
          { success: false, error: "تفعيل أو تعطيل حسابات العملاء متاح للمدير العام فقط" },
          { status: 403 }
        );
      }
      if (typeof body.isActive !== "boolean") return badRequest("قيمة الحالة غير صحيحة");
      data.isActive = body.isActive;
    }

    if ("name" in body) {
      const name = String(body.name ?? "").trim();
      if (name.length < 2) return badRequest("الاسم قصير جداً");
      data.name = name;
    }

    if ("email" in body) {
      const email = String(body.email ?? "").trim().toLowerCase();
      if (!isEmail(email)) return badRequest("البريد الإلكتروني غير صحيح");
      const clash = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (clash && clash.id !== params.id) return badRequest("البريد الإلكتروني مستخدم في حساب آخر");
      data.email = email;
    }

    if ("phone" in body) {
      const phone = String(body.phone ?? "").trim();
      data.phone = phone || null;
    }

    if ("adminNotes" in body) {
      const notes = String(body.adminNotes ?? "").trim();
      data.adminNotes = notes || null;
    }

    if (Object.keys(data).length === 0) return badRequest("لا توجد بيانات للتحديث");

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, phone: true, isActive: true, adminNotes: true },
    });

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_CUSTOMER",
        entity: "User",
        entityId: params.id,
        details: { fields: Object.keys(data) },
      },
    });

    return NextResponse.json({ success: true, data: user });
  } catch (err) {
    return serverError("PATCH /api/admin/customers/[id]", err);
  }
}

/**
 * Right-to-erasure, done the way a store legally can: the row stays, its
 * personal data does not.
 *
 * A hard delete is not an option — orders and invoices reference this user and
 * ZATCA requires keeping those records for years. So identifying fields are
 * scrubbed and the account is closed, which satisfies an erasure request while
 * leaving the books intact and auditable.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "إخفاء هوية العميل متاح للمدير العام فقط" },
      { status: 403 }
    );
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, email: true },
    });
    if (!target || target.role !== "CUSTOMER") return notFound("العميل غير موجود");
    if (target.email.endsWith(ANONYMIZED_DOMAIN)) return badRequest("هذا الحساب مُخفى الهوية بالفعل");

    await prisma.$transaction([
      // Any live reset link must die with the identity it belonged to.
      prisma.passwordResetToken.deleteMany({ where: { userId: params.id } }),
      prisma.user.update({
        where: { id: params.id },
        data: {
          name: "عميل مُخفى الهوية",
          email: `deleted-${params.id}${ANONYMIZED_DOMAIN}`,
          phone: null,
          avatar: null,
          adminNotes: null,
          emailVerified: null,
          isActive: false,
        },
      }),
      prisma.adminLog.create({
        data: {
          userId: session.user.id,
          action: "ANONYMIZE_CUSTOMER",
          entity: "User",
          entityId: params.id,
          details: { previousEmail: target.email },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("DELETE /api/admin/customers/[id]", err);
  }
}
