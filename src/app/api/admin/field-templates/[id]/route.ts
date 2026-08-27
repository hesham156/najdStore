import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";
import type { ProductFieldData } from "@/lib/product-fields";

export const dynamic = "force-dynamic";

/**
 * A single field template.
 *   PUT    → rename and/or overwrite its fields { name?, fields? }
 *   DELETE → remove the template (does not touch products that used it)
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  try {
    const body = (await req.json()) as { name?: string; fields?: ProductFieldData[] };
    const data: { name?: string; fields?: object } = {};
    if (typeof body.name === "string") {
      if (!body.name.trim()) return badRequest("اسم القالب مطلوب");
      data.name = body.name.trim();
    }
    if (Array.isArray(body.fields)) {
      data.fields = body.fields.map((f) => ({ ...f, id: undefined })) as object;
    }
    await prisma.fieldTemplate.update({ where: { id: params.id }, data });
    return NextResponse.json({ success: true, message: "تم تحديث القالب" });
  } catch (err) {
    return serverError("PUT /api/admin/field-templates/[id]", err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  try {
    await prisma.fieldTemplate.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: "تم حذف القالب" });
  } catch (err) {
    return serverError("DELETE /api/admin/field-templates/[id]", err);
  }
}
