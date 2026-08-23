import { NextResponse } from "next/server";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";
import { getEnabledCarriers } from "@/lib/shipping";

export const dynamic = "force-dynamic";

/** List the shipping carriers currently enabled in settings. */
export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  try {
    const carriers = await getEnabledCarriers();
    return NextResponse.json({ success: true, data: carriers });
  } catch (err) {
    return serverError("GET /api/admin/shipping/carriers", err);
  }
}
