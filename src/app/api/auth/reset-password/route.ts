import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** Complete a password reset with a valid, unused, unexpired token. */
export async function POST(req: NextRequest) {
  try {
    // Throttle token guessing.
    const rl = rateLimit(`reset:${clientIp(req.headers)}`, 10, 15 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { success: false, error: "محاولات كثيرة. حاول لاحقاً." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
      );
    }

    const { token, password } = await req.json();
    if (typeof token !== "string" || !token) {
      return NextResponse.json({ success: false, error: "رابط غير صالح" }, { status: 400 });
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ success: false, error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, { status: 400 });
    }

    const record = await prisma.passwordResetToken.findUnique({ where: { token: sha256(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: "انتهت صلاحية الرابط أو تم استخدامه. اطلب رابطاً جديداً." }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: hashed } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // invalidate any other outstanding tokens for this user
      prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ success: false, error: "حدث خطأ. حاول مرة أخرى." }, { status: 500 });
  }
}
