import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { sendDueAbandonedCartReminders, DEFAULT_CART_REMINDER_MINUTES } from "@/lib/hayyak";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/**
 * Scheduled job: push `cart.abandoned` events to Hayyak for carts that have sat
 * idle longer than the reminder window, so Hayyak can send the WhatsApp reminder
 * and notify the merchant. Each cart is notified once (stamped hayyakNotifiedAt).
 *
 * Trigger it from a scheduler (Vercel Cron, GitHub Actions, cron-job.org, …).
 * Protected by CRON_SECRET — refuses to run if the secret is not configured.
 *
 *   Authorization: Bearer <CRON_SECRET>   (Vercel Cron sends this automatically)
 *   or  ?secret=<CRON_SECRET>
 *
 * The idle window is the `hayyak_cart_reminder_minutes` setting (default 60).
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
    const { hayyak_cart_reminder_minutes } = await getSettings({
      hayyak_cart_reminder_minutes: String(DEFAULT_CART_REMINDER_MINUTES),
    });
    const minutes = parseInt(hayyak_cart_reminder_minutes, 10) || DEFAULT_CART_REMINDER_MINUTES;
    const result = await sendDueAbandonedCartReminders(minutes);
    return NextResponse.json({ success: true, ...result, thresholdMinutes: minutes });
  } catch (err) {
    console.error("[cron abandoned-carts]", err);
    return NextResponse.json({ success: false, error: "حدث خطأ" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
