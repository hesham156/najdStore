import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";
import { getHayyakStatus, saveHayyakConfig, disconnectHayyak } from "@/lib/hayyak";

export const dynamic = "force-dynamic";

/**
 * إدارة ربط حياك من لوحة الإدارة.
 *   GET    → الحالة الحالية (لا يكشف المفتاح السري إطلاقاً)
 *   PATCH  → حفظ الإعداد (تفعيل/إيقاف، معرّف المتجر، العنوان، المفتاح السري)
 *   DELETE → إلغاء الربط ومسح المفتاح
 * إدارة التكامل مقصورة على ADMIN (وليس STAFF).
 */
export async function GET() {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  try {
    return NextResponse.json({ success: true, data: await getHayyakStatus() });
  } catch (err) {
    return serverError("GET /api/admin/hayyak/config", err);
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  if (session.user.role !== "ADMIN") return unauthorized();

  try {
    const body = (await req.json().catch(() => ({}))) as {
      enabled?: boolean;
      storeId?: string;
      baseUrl?: string;
      signingSecret?: string;
    };

    await saveHayyakConfig({
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      storeId: typeof body.storeId === "string" ? body.storeId : undefined,
      baseUrl: typeof body.baseUrl === "string" ? body.baseUrl : undefined,
      signingSecret: typeof body.signingSecret === "string" ? body.signingSecret : undefined,
    });

    const status = await getHayyakStatus();
    // منع تفعيل بلا مفتاح توقيع — نوضّح السبب للمستخدم.
    if (body.enabled && !status.hasSecret) {
      return NextResponse.json(
        { success: false, error: "لا يمكن التفعيل بدون مفتاح توقيع. أدخل المفتاح أولاً.", data: status },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, data: status, message: "تم حفظ إعداد حياك." });
  } catch (err) {
    return serverError("PATCH /api/admin/hayyak/config", err);
  }
}

export async function DELETE() {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  if (session.user.role !== "ADMIN") return unauthorized();

  try {
    await disconnectHayyak();
    return NextResponse.json({
      success: true,
      data: await getHayyakStatus(),
      message: "تم إلغاء ربط حياك.",
    });
  } catch (err) {
    return serverError("DELETE /api/admin/hayyak/config", err);
  }
}
