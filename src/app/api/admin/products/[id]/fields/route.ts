import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";
import { FIELD_TYPES, isSelectType, isPresentational, type FieldType, type ProductFieldData } from "@/lib/product-fields";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(FIELD_TYPES.map((f) => f.type));

/**
 * GET → the product's Salla-style custom fields (ordered).
 * PUT → full replace of the product's custom fields.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return unauthorized();

  const fields = await prisma.productField.findMany({
    where: { productId: params.id },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({
    success: true,
    data: fields.map((f) => ({
      id: f.id,
      key: f.key,
      type: f.type as FieldType,
      label: f.label,
      description: f.description,
      required: f.required,
      sortOrder: f.sortOrder,
      values: f.values ?? undefined,
      config: f.config ?? undefined,
      condFieldKey: f.condFieldKey,
      condValue: f.condValue,
      condLogic: (f.condLogic as "and" | "or" | null) ?? undefined,
      conditions: f.conditions ?? undefined,
    })),
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const body = (await req.json()) as { fields: ProductFieldData[] };
    const fields = Array.isArray(body.fields) ? body.fields : [];

    // ── Validation ──
    const keys = new Set<string>();
    for (const f of fields) {
      if (!VALID_TYPES.has(f.type)) return badRequest(`نوع حقل غير معروف: ${f.type}`);
      if (!f.key?.trim()) return badRequest("مفتاح الحقل مفقود");
      if (keys.has(f.key)) return badRequest("مفاتيح الحقول مكررة");
      keys.add(f.key);
      if (!isPresentational(f.type) && !f.label?.trim()) return badRequest("اسم الحقل مطلوب");
      if (isSelectType(f.type)) {
        const values = Array.isArray(f.values) ? f.values : [];
        const labels = values.map((v) => v.label?.trim());
        if (labels.length === 0) return badRequest(`الحقل "${f.label}" يجب أن يحتوي على قيمة واحدة على الأقل`);
        if (labels.some((l) => !l)) return badRequest(`قيم الحقل "${f.label}" لا يمكن أن تكون فارغة`);
        if (new Set(labels).size !== labels.length) return badRequest(`قيم الحقل "${f.label}" مكررة`);
      }
    }
    // Conditional refs must point at an existing OTHER field.
    for (const f of fields) {
      const rules = Array.isArray(f.conditions) && f.conditions.length > 0
        ? f.conditions
        : (f.condFieldKey ? [{ fieldKey: f.condFieldKey, op: "eq" as const, value: f.condValue ?? "" }] : []);
      for (const c of rules) {
        if (!c.fieldKey) return badRequest("شرط الظهور ناقص");
        if (c.fieldKey === f.key) return badRequest("لا يمكن أن يعتمد الحقل على نفسه");
        if (!keys.has(c.fieldKey)) return badRequest("شرط الظهور يشير إلى حقل غير موجود");
      }
    }

    const product = await prisma.product.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!product) return badRequest("المنتج غير موجود");

    await prisma.$transaction(async (tx) => {
      await tx.productField.deleteMany({ where: { productId: params.id } });
      if (fields.length === 0) return;
      await tx.productField.createMany({
        data: fields.map((f, i) => ({
          productId: params.id,
          key: f.key.trim(),
          type: f.type,
          label: (f.label || "").trim(),
          description: f.description?.trim() || null,
          required: !isPresentational(f.type) && f.required === true,
          sortOrder: i,
          values: isSelectType(f.type)
            ? (f.values || []).map((v) => ({ label: v.label.trim(), price: Number(v.price) || 0 }))
            : undefined,
          config: f.config ?? undefined,
          condFieldKey: f.condFieldKey?.trim() || null,
          condValue: f.condFieldKey ? (f.condValue ?? "").toString() : null,
          condLogic: f.condLogic === "or" ? "or" : "and",
          conditions: Array.isArray(f.conditions) && f.conditions.length > 0
            ? f.conditions
                .filter((c) => c && c.fieldKey)
                .map((c) => ({ fieldKey: c.fieldKey, op: c.op === "neq" ? "neq" : "eq", value: (c.value ?? "").toString() }))
            : undefined,
        })),
      });
    });

    await prisma.adminLog
      .create({
        data: {
          userId: session.user.id,
          action: "UPDATE_PRODUCT_FIELDS",
          entity: "Product",
          entityId: params.id,
          details: { fields: fields.length },
        },
      })
      .catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("PUT /api/admin/products/[id]/fields", err);
  }
}
