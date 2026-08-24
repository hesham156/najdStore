import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { issuePasswordReset } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

/**
 * Start a password reset. Always returns success (never reveals whether an
 * account exists) — the email is only sent when a matching account is found.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const clean = typeof email === "string" ? email.trim().toLowerCase() : "";

    const ok = NextResponse.json({ success: true });
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return ok;

    const user = await prisma.user.findUnique({
      where: { email: clean },
      select: { id: true, name: true, email: true },
    });
    if (!user) return ok; // do not leak account existence

    // Delivery result deliberately ignored, for the same reason.
    await issuePasswordReset(user);

    return ok;
  } catch (err) {
    console.error("[forgot-password]", err);
    // Still return success to avoid leaking anything.
    return NextResponse.json({ success: true });
  }
}
