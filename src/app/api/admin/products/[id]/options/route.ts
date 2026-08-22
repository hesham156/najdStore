import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET  → the product's options (+values) and variants (matrix pricing)
 * PUT  → full replace of options/values/variants for the product
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return unauthorized();

  const [options, variants] = await Promise.all([
    prisma.productOption.findMany({
      where: { productId: params.id },
      orderBy: { sortOrder: "asc" },
      include: { values: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.productVariant.findMany({ where: { productId: params.id } }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      options: options.map((o) => ({
        id: o.id,
        nameAr: o.nameAr,
        name: o.name,
        required: o.required,
        values: o.values.map((v) => ({ id: v.id, labelAr: v.labelAr, label: v.label })),
      })),
      variants: variants.map((v) => ({
        id: v.id,
        optionValueIds: v.optionValueIds,
        label: v.label,
        sku: v.sku,
        price: parseFloat(String(v.price)),
        comparePrice: v.comparePrice != null ? parseFloat(String(v.comparePrice)) : null,
        stockCount: v.stockCount,
        isActive: v.isActive,
      })),
    },
  });
}

interface PutBody {
  options: Array<{ nameAr: string; name?: string; required?: boolean; values: Array<{ labelAr: string; label?: string }> }>;
  variants: Array<{
    valueIdx: number[]; // valueIdx[optionIndex] = chosen value index within that option
    price: number;
    comparePrice?: number | null;
    sku?: string | null;
    stockCount?: number;
    isActive?: boolean;
  }>;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const body = (await req.json()) as PutBody;
    const options = body.options || [];
    const variants = body.variants || [];

    // Basic validation
    for (const o of options) {
      if (!o.nameAr?.trim()) return badRequest("اسم الخيار مطلوب");
      if (!o.values?.length) return badRequest(`الخيار "${o.nameAr}" يجب أن يحتوي على قيمة واحدة على الأقل`);
      const labels = o.values.map((v) => v.labelAr?.trim());
      if (labels.some((l) => !l)) return badRequest(`قيم الخيار "${o.nameAr}" لا يمكن أن تكون فارغة`);
      if (new Set(labels).size !== labels.length) return badRequest(`قيم الخيار "${o.nameAr}" مكررة`);
    }

    const product = await prisma.product.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!product) return badRequest("المنتج غير موجود");

    await prisma.$transaction(async (tx) => {
      // Full replace — options cascade-delete their values; variants deleted separately
      await tx.productVariant.deleteMany({ where: { productId: params.id } });
      await tx.productOption.deleteMany({ where: { productId: params.id } });

      // Recreate options + values, capturing new value ids as valueIds[optIdx][valIdx]
      const valueIds: string[][] = [];
      for (let oi = 0; oi < options.length; oi++) {
        const o = options[oi];
        const created = await tx.productOption.create({
          data: {
            productId: params.id,
            nameAr: o.nameAr.trim(),
            name: (o.name || o.nameAr).trim(),
            required: o.required !== false,
            sortOrder: oi,
            values: {
              create: o.values.map((v, vi) => ({
                labelAr: v.labelAr.trim(),
                label: (v.label || v.labelAr).trim(),
                sortOrder: vi,
              })),
            },
          },
          include: { values: { orderBy: { sortOrder: "asc" } } },
        });
        valueIds[oi] = created.values.map((v) => v.id);
      }

      // Recreate variants
      let minActivePrice: number | null = null;
      for (const v of variants) {
        if (!Array.isArray(v.valueIdx) || v.valueIdx.length !== options.length) continue;
        const ids = v.valueIdx
          .map((vi, oi) => valueIds[oi]?.[vi])
          .filter((x): x is string => !!x);
        if (ids.length !== options.length) continue;
        const label = v.valueIdx
          .map((vi, oi) => options[oi].values[vi]?.labelAr)
          .filter(Boolean)
          .join(" · ");
        const price = Number.isFinite(v.price) ? v.price : 0;
        const isActive = v.isActive !== false;
        if (isActive && (minActivePrice === null || price < minActivePrice)) minActivePrice = price;
        await tx.productVariant.create({
          data: {
            productId: params.id,
            optionValueIds: [...ids].sort(),
            label,
            sku: v.sku?.trim() || null,
            price,
            comparePrice: v.comparePrice != null && Number.isFinite(v.comparePrice) ? v.comparePrice : null,
            stockCount: Number.isFinite(v.stockCount) ? Number(v.stockCount) : 0,
            isActive,
          },
        });
      }

      // Keep the product's base price in sync with the cheapest active variant
      // so listing cards show a sensible "starting from" price.
      if (minActivePrice !== null) {
        await tx.product.update({ where: { id: params.id }, data: { price: minActivePrice } });
      }
    });

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_PRODUCT_OPTIONS",
        entity: "Product",
        entityId: params.id,
        details: { options: options.length, variants: variants.length },
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("PUT /api/admin/products/[id]/options", err);
  }
}
