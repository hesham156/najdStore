import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  if (session.user.role !== "ADMIN") return unauthorized();

  if (session.user.id === params.id) {
    return badRequest("لا يمكن حذف حسابك الخاص");
  }

  // Deliberately a deactivation, not a row delete: orders and logs reference
  // this user, and revoking access is what the confirm dialog promises.
  await prisma.user.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
