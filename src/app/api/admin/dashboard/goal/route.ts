import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";

export const dynamic = "force-dynamic";

const currentMonth = () => {
  // KSA time (UTC+3) so the month key matches the dashboard summary.
  const ksa = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return `${ksa.getUTCFullYear()}-${String(ksa.getUTCMonth() + 1).padStart(2, "0")}`;
};

/** Set (or clear) the sales goal for the current month. */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const body = await req.json();
    const target = Number(body.target);
    const month = currentMonth();

    if (!Number.isFinite(target) || target < 0) return badRequest("قيمة الهدف غير صالحة");

    if (target === 0) {
      await prisma.storeGoal.deleteMany({ where: { month } });
      return NextResponse.json({ success: true, data: null });
    }

    const goal = await prisma.storeGoal.upsert({
      where: { month },
      create: { month, target },
      update: { target },
    });

    return NextResponse.json({ success: true, data: { target: Number(goal.target) } });
  } catch (err) {
    return serverError("POST /api/admin/dashboard/goal", err);
  }
}
