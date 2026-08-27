import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Public cart snapshot ingestion. The storefront posts the current cart on
 * change; an empty cart removes the snapshot (cleared or converted to an order),
 * a non-empty cart upserts it so the admin can see abandoned carts.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : "";
    if (!sessionId) return NextResponse.json({ success: true });

    const items = Array.isArray(body.items) ? body.items : [];

    // Empty cart → drop any stored snapshot for this session.
    if (items.length === 0) {
      await prisma.abandonedCart.deleteMany({ where: { sessionId } });
      return NextResponse.json({ success: true });
    }

    const cleanItems = items.slice(0, 100).map((it: any) => ({
      id: String(it.id ?? ""),
      nameAr: String(it.nameAr ?? it.name ?? "").slice(0, 200),
      image: it.image ? String(it.image).slice(0, 500) : null,
      price: Number(it.price) || 0,
      quantity: Math.max(1, parseInt(String(it.quantity)) || 1),
      variantLabel: it.variantLabel ? String(it.variantLabel).slice(0, 200) : null,
      // Salla-style custom field selections, kept for the abandoned-cart view.
      customFields: Array.isArray(it.customFields)
        ? it.customFields.slice(0, 30).map((cf: any) => ({
            label: String(cf.label ?? "").slice(0, 120),
            type: String(cf.type ?? "").slice(0, 30),
            value: String(cf.value ?? "").slice(0, 500),
            priceAdd: Number(cf.priceAdd) || 0,
          }))
        : undefined,
    }));

    const itemCount = cleanItems.reduce((n: number, it: any) => n + it.quantity, 0);
    const total = cleanItems.reduce((s: number, it: any) => s + it.price * it.quantity, 0);

    const customerName = typeof body.customerName === "string" ? body.customerName.slice(0, 200) : null;
    const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.slice(0, 200).toLowerCase() : null;
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.slice(0, 40) : null;
    const userId = typeof body.userId === "string" ? body.userId.slice(0, 64) : null;

    await prisma.abandonedCart.upsert({
      where: { sessionId },
      create: { sessionId, userId, customerName, customerEmail, customerPhone, items: cleanItems, itemCount, total, status: "ACTIVE" },
      update: {
        items: cleanItems, itemCount, total, status: "ACTIVE",
        // only overwrite identity fields when the client actually provides them
        ...(userId ? { userId } : {}),
        ...(customerName ? { customerName } : {}),
        ...(customerEmail ? { customerEmail } : {}),
        ...(customerPhone ? { customerPhone } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
