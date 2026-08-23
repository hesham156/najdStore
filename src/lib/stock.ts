import { prisma } from "@/lib/prisma";

export interface StockLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

/**
 * Reserve stock for products/variants that opt into stock tracking
 * (`Product.trackStock`). Uses guarded atomic decrements so concurrent orders
 * cannot oversell. If any line is short, already-decremented lines are rolled
 * back and an error is thrown. Untracked products are ignored (unlimited).
 */
export async function reserveStock(lines: StockLine[]): Promise<void> {
  const productIds = Array.from(new Set(lines.map((l) => l.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, trackStock: true, nameAr: true },
  });
  const meta = new Map(products.map((p) => [p.id, p]));

  const done: StockLine[] = [];
  const rollback = async () => {
    for (const l of done) {
      if (l.variantId) {
        await prisma.productVariant.updateMany({ where: { id: l.variantId }, data: { stockCount: { increment: l.quantity } } });
      } else {
        await prisma.product.updateMany({ where: { id: l.productId }, data: { stockCount: { increment: l.quantity } } });
      }
    }
  };

  for (const line of lines) {
    const p = meta.get(line.productId);
    if (!p || !p.trackStock) continue; // untracked → unlimited

    const res = line.variantId
      ? await prisma.productVariant.updateMany({
          where: { id: line.variantId, stockCount: { gte: line.quantity } },
          data: { stockCount: { decrement: line.quantity } },
        })
      : await prisma.product.updateMany({
          where: { id: line.productId, stockCount: { gte: line.quantity } },
          data: { stockCount: { decrement: line.quantity } },
        });

    if (res.count === 0) {
      await rollback();
      throw new Error(`الكمية المطلوبة من "${p.nameAr}" غير متوفرة في المخزون`);
    }
    done.push(line);
  }
}

/** Return reserved stock to tracked products/variants (order cancelled/refunded/failed). */
export async function restoreStock(lines: StockLine[]): Promise<void> {
  const productIds = Array.from(new Set(lines.map((l) => l.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, trackStock: true },
  });
  const tracked = new Map(products.map((p) => [p.id, p.trackStock]));

  for (const line of lines) {
    if (!tracked.get(line.productId)) continue;
    if (line.variantId) {
      await prisma.productVariant.updateMany({ where: { id: line.variantId }, data: { stockCount: { increment: line.quantity } } });
    } else {
      await prisma.product.updateMany({ where: { id: line.productId }, data: { stockCount: { increment: line.quantity } } });
    }
  }
}
