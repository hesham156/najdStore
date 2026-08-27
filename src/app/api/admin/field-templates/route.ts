import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";
import type { ProductFieldData } from "@/lib/product-fields";

export const dynamic = "force-dynamic";

/**
 * Reusable custom-field templates.
 *   GET  → list all templates (newest first)
 *   POST → save a new template { name, fields }
 */
export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  const templates = await prisma.fieldTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({
    success: true,
    data: templates.map((t) => ({
      id: t.id,
      name: t.name,
      fields: t.fields,
      count: Array.isArray(t.fields) ? t.fields.length : 0,
      updatedAt: t.updatedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const body = (await req.json()) as { name?: string; fields?: ProductFieldData[] };
    const name = (body.name || "").trim();
    const fields = Array.isArray(body.fields) ? body.fields : [];
    if (!name) return badRequest("اسم القالب مطلوب");
    if (fields.length === 0) return badRequest("لا توجد حقول لحفظها كقالب");

    // Store a clean snapshot without product-specific ids.
    const snapshot = fields.map((f) => ({ ...f, id: undefined }));

    const created = await prisma.fieldTemplate.create({
      data: { name, fields: snapshot as object },
    });
    return NextResponse.json({ success: true, id: created.id, message: "تم حفظ القالب" });
  } catch (err) {
    return serverError("POST /api/admin/field-templates", err);
  }
}
