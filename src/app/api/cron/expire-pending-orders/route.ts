import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { expireStalePendingOrders } from "@/lib/order-expiry";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Scheduled job: cancel abandoned unpaid orders and release their stock.
 *
 * Trigger it from a scheduler (Vercel Cron, GitHub Actions, cron-job.org, …).
 * Protected by CRON_SECRET — the endpoint refuses to run if the secret is not
 * configured, so it can never be left open by accident.
 *
 *   Authorization: Bearer <CRON_SECRET>   (Vercel Cron sends this automatically)
 *   or  ?secret=<CRON_SECRET>
 *
 * The expiry window is the `pending_order_expiry_hours` setting (default 24h).
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed — never run unprotected

  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const qs = new URL(req.url).searchParams.get("secret") || "";
  const provided = bearer || qs;
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function run(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
  }
  try {
    const { pending_order_expiry_hours } = await getSettings({ pending_order_expiry_hours: "24" });
    const hours = parseInt(pending_order_expiry_hours, 10) || 24;
    const result = await expireStalePendingOrders(hours);
    return NextResponse.json({ success: true, ...result, thresholdHours: hours });
  } catch (err) {
    console.error("[cron expire-pending-orders]", err);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
