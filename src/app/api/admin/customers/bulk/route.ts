import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

const ACTIONS = ["activate", "deactivate"] as const;
type Action = (typeof ACTIONS)[number];

/** Caps one request so a runaway selection cannot lock the users table. */
const MAX_IDS = 500;

/**
 * Activates or deactivates several customers at once.
 *
 * ADMIN-only, matching the single-customer rule — bulk is not a way around a
 * permission. The `role: "CUSTOMER"` filter is deliberate: it makes it
 * impossible to disable an admin account by passing its id in the list.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "تفعيل أو تعطيل حسابات العملاء متاح للمدير العام فقط" },
      { status: 403 }
    );
  }

  try {
    const { ids, action } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) return badRequest("لم يتم تحديد أي عميل");
    if (ids.length > MAX_IDS) return badRequest(`لا يمكن تعديل أكثر من ${MAX_IDS} عميل في مرة واحدة`);
    if (!ACTIONS.includes(action as Action)) return badRequest("إجراء غير معروف");

    const cleanIds = ids.filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
    if (cleanIds.length === 0) return badRequest("لم يتم تحديد أي عميل");

    const { count } = await prisma.user.updateMany({
      where: { id: { in: cleanIds }, role: "CUSTOMER" },
      data: { isActive: action === "activate" },
    });

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: action === "activate" ? "BULK_ACTIVATE_CUSTOMERS" : "BULK_DEACTIVATE_CUSTOMERS",
        entity: "User",
        details: { requested: cleanIds.length, updated: count },
      },
    });

    return NextResponse.json({ success: true, data: { updated: count } });
  } catch (err) {
    return serverError("POST /api/admin/customers/bulk", err);
  }
}
