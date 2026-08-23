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
      ? TEMPLATES.products
      : (await prisma.product.findMany({
          where: { isDeleted: false },
          include: { category: { select: { nameAr: true } } },
          orderBy: { createdAt: "desc" },
        })).map((p) => ({
          "الاسم": p.nameAr || p.name,
          name: p.name,
          slug: p.slug,
          "الوصف": p.descriptionAr || p.description || "",
          "السعر": Number(p.price),
          "سعر المقارنة": p.comparePrice ? Number(p.comparePrice) : "",
          "التصنيف": p.category?.nameAr || "",
          "الكمية": p.stockCount,
          "الصورة": p.image || "",
          "مميز": p.isFeatured ? "نعم" : "لا",
          "الحالة": p.isActive ? "نشط" : "معطل",
        }));

    const filename = isTemplate ? "products-template" : `products-${new Date().toISOString().slice(0, 10)}`;

    if (format === "csv") {
      return new NextResponse(rowsToCsv(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    const body = rowsToXlsx(rows, "المنتجات") as unknown as BodyInit;
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (err) {
    return serverError("GET /api/admin/products/export", err);
  }
}
