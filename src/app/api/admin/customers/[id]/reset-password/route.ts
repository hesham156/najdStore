import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, notFound, badRequest, serverError } from "@/lib/api";
import { issuePasswordReset, TOKEN_TTL_MINUTES } from "@/lib/password-reset";

export const dynamic = "force-dynamic";

/**
 * Emails the customer a reset link, on the admin's behalf.
 *
 * The admin never sees or sets the password — the customer chooses it through
 * the same one-time link the public "forgot password" form issues. Unlike that
 * form, this one reports honestly whether the mail went out, since an admin
 * already knows the account exists and needs to know if SMTP is misconfigured.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return unauthorized();

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true, isActive: true, role: true },
    });

    if (!user || user.role !== "CUSTOMER") return notFound("العميل غير موجود");
    if (!user.isActive) return badRequest("الحساب معطّل — فعّله أولاً قبل إرسال رابط إعادة التعيين");

    const sent = await issuePasswordReset(user);
    if (!sent) {
      return NextResponse.json(
        { success: false, error: "تعذّر إرسال البريد. تحقّق من إعدادات SMTP في الإعدادات العامة." },
        { status: 502 }
      );
    }

    await prisma.adminLog.create({
      data: {
        userId: session.user.id,
        action: "SEND_PASSWORD_RESET",
        entity: "User",
        entityId: params.id,
      },
    });

    return NextResponse.json({ success: true, data: { expiresInMinutes: TOKEN_TTL_MINUTES } });
  } catch (err) {
    return serverError("POST /api/admin/customers/[id]/reset-password", err);
  }
}
