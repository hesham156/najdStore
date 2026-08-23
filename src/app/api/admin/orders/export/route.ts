import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";
import { rowsToXlsx, rowsToCsv, TEMPLATES } from "@/lib/import-export";
import { getOrderStatusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
    const status = searchParams.get("status");
    const isTemplate = searchParams.get("template") === "1";

    const rows = isTemplate
      ? TEMPLATES.orders
      : (await prisma.order.findMany({
          where: status ? { status: status as never } : {},
          include: {
            user: { select: { name: true, email: true, phone: true } },
            items: { include: { product: { select: { nameAr: true, name: true } } } },
          },
          orderBy: { createdAt: "desc" },
        })).map((o) => ({
          "رقم الطلب": o.orderNumber,
          "العميل": o.user?.name || "",
          "البريد الإلكتروني": o.user?.email || "",
          "الجوال": o.user?.phone || "",
          "المنتجات": o.items.map((it) => `${it.product?.nameAr || it.product?.name} ×${it.quantity}`).join(" | "),
          "المجموع الفرعي": Number(o.subtotal),
          "الخصم": Number(o.discount),
          "الإجمالي": Number(o.total),
          "الحالة": getOrderStatusLabel(o.status),
          "الملاحظات": o.notes || "",
          "تاريخ الطلب": o.createdAt.toISOString().slice(0, 10),
        }));

    const filename = isTemplate ? "orders-template" : `orders-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      return new NextResponse(rowsToCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    const body = rowsToXlsx(rows, "الطلبات") as unknown as BodyInit;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (err) {
    return serverError("GET /api/admin/orders/export", err);
  }
}
