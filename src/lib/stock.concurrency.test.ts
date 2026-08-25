import { beforeEach, describe, expect, it, vi } from "vitest";
import { reserveStock } from "./stock";

/**
 * Overselling test: two customers buy the LAST unit at the same instant.
 *
 * `reserveStock` guards every decrement with `WHERE stockCount >= qty`, which
 * Postgres executes as a single atomic, row-locked UPDATE. This test models that
 * atomicity faithfully: the mocked `updateMany` performs its check-and-decrement
 * synchronously (no await inside), so — exactly like a row lock — only one of two
 * interleaved reservations can win the last unit. The other must be rejected and
 * must roll back any lines it had already taken.
 */

// In-memory catalogue shared by the mocked prisma client.
const store = {
  products: new Map<string, { stockCount: number; trackStock: boolean; nameAr: string }>(),
  variants: new Map<string, { stockCount: number }>(),
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in
          .map((id) => {
            const p = store.products.get(id);
            return p ? { id, trackStock: p.trackStock, nameAr: p.nameAr, stockCount: p.stockCount } : null;
          })
          .filter(Boolean),
      // Atomic conditional decrement / unconditional increment (rollback).
      updateMany: async ({ where, data }: any) => {
        const p = store.products.get(where.id);
        if (!p) return { count: 0 };
        if (data.stockCount?.decrement != null) {
          const need = where.stockCount?.gte ?? data.stockCount.decrement;
          if (p.stockCount >= need) {
            p.stockCount -= data.stockCount.decrement;
            return { count: 1 };
          }
          return { count: 0 };
        }
        if (data.stockCount?.increment != null) {
          p.stockCount += data.stockCount.increment;
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
    productVariant: {
      updateMany: async ({ where, data }: any) => {
        const v = store.variants.get(where.id);
        if (!v) return { count: 0 };
        if (data.stockCount?.decrement != null) {
          const need = where.stockCount?.gte ?? data.stockCount.decrement;
          if (v.stockCount >= need) {
            v.stockCount -= data.stockCount.decrement;
            return { count: 1 };
          }
          return { count: 0 };
        }
        if (data.stockCount?.increment != null) {
          v.stockCount += data.stockCount.increment;
          return { count: 1 };
        }
        return { count: 0 };
      },
    },
  },
}));

describe("overselling — two buyers, one unit left", () => {
  beforeEach(() => {
    store.products.clear();
    store.variants.clear();
  });

  it("lets exactly one buyer take the last product unit", async () => {
    store.products.set("P", { stockCount: 1, trackStock: true, nameAr: "آخر قطعة" });

    const results = await Promise.allSettled([
      reserveStock([{ productId: "P", quantity: 1 }]),
      reserveStock([{ productId: "P", quantity: 1 }]),
    ]);

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    expect(ok).toBe(1);        // one order goes through
    expect(failed).toBe(1);    // the other is refused
    expect(store.products.get("P")!.stockCount).toBe(0); // never negative → no oversell
  });

  it("lets exactly one buyer take the last variant unit", async () => {
    store.products.set("P", { stockCount: 999, trackStock: true, nameAr: "منتج" });
    store.variants.set("V", { stockCount: 1 });

    const results = await Promise.allSettled([
      reserveStock([{ productId: "P", variantId: "V", quantity: 1 }]),
      reserveStock([{ productId: "P", variantId: "V", quantity: 1 }]),
    ]);

    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    expect(results.filter((r) => r.status === "rejected").length).toBe(1);
    expect(store.variants.get("V")!.stockCount).toBe(0);
  });

  it("rolls back an earlier line when a later line in the same order is short", async () => {
    // A order reserves A (plenty) then B (empty). B fails → A must be restored.
    store.products.set("A", { stockCount: 5, trackStock: true, nameAr: "أ" });
    store.products.set("B", { stockCount: 0, trackStock: true, nameAr: "ب" });

    await expect(
      reserveStock([
        { productId: "A", quantity: 2 },
        { productId: "B", quantity: 1 },
      ]),
    ).rejects.toThrow();

    // A's decrement was rolled back — no stock leaked out of the catalogue.
    expect(store.products.get("A")!.stockCount).toBe(5);
    expect(store.products.get("B")!.stockCount).toBe(0);
  });

  it("never touches stock for untracked products (unlimited)", async () => {
    store.products.set("U", { stockCount: 0, trackStock: false, nameAr: "غير محدود" });

    await expect(reserveStock([{ productId: "U", quantity: 100 }])).resolves.toBeUndefined();
    expect(store.products.get("U")!.stockCount).toBe(0); // untracked → not decremented
  });
});
