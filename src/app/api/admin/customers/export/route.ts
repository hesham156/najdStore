import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";
import { rowsToXlsx, rowsToCsv, TEMPLATES } from "@/lib/import-export";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") === "csv" ? "csv" : "xlsx";
    const isTemplate = searchParams.get("template") === "1";

    const rows = isTemplate
      ? TEMPLATES.customers
      : (await prisma.user.findMany({
          where: { role: "CUSTOMER" },
          select: {
            name: true, email: true, phone: true, isActive: true, createdAt: true,
            _count: { select: { orders: true } },
          },
          orderBy: { createdAt: "desc" },
        })).map((c) => ({
          "الاسم": c.name,
          "البريد الإلكتروني": c.email,
          "الجوال": c.phone || "",
          "عدد الطلبات": c._count.orders,
          "الحالة": c.isActive ? "نشط" : "معطل",
          "تاريخ التسجيل": c.createdAt.toISOString().slice(0, 10),
        }));

    const filename = isTemplate ? "customers-template" : `customers-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      return new NextResponse(rowsToCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    const body = rowsToXlsx(rows, "العملاء") as unknown as BodyInit;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (err) {
    return serverError("GET /api/admin/customers/export", err);
  }
}
