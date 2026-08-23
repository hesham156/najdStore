import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Delete one abandoned cart snapshot. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    await prisma.abandonedCart.deleteMany({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return serverError("DELETE /api/admin/abandoned-carts/[id]", err);
  }
}
