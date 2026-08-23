import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail, passwordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const TOKEN_TTL_MINUTES = 30;
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const siteUrl = () => (process.env.NEXTAUTH_URL || "https://najdstore-production.up.railway.app").replace(/\/$/, "");

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

    const user = await prisma.user.findUnique({ where: { email: clean }, select: { id: true, name: true, email: true } });
    if (!user) return ok; // do not leak account existence

    // Invalidate any previous tokens, then issue a fresh one.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    const rawToken = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        token: sha256(rawToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
      },
    });

    const resetUrl = `${siteUrl()}/reset-password?token=${rawToken}`;
    const mail = passwordResetEmail({ name: user.name || "عميلنا", resetUrl, minutes: TOKEN_TTL_MINUTES });
    await sendEmail({ to: user.email, subject: mail.subject, html: mail.html });

    return ok;
  } catch (err) {
    console.error("[forgot-password]", err);
    // Still return success to avoid leaking anything.
    return NextResponse.json({ success: true });
  }
}
