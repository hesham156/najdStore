import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, badRequest, serverError } from "@/lib/api";
import { getHomeSections, parseSections } from "@/lib/home-layout";

export const dynamic = "force-dynamic";

/** Load the homepage layout. */
export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  try {
    const sections = await getHomeSections();
    return NextResponse.json({ success: true, data: sections });
  } catch (err) {
    return serverError("GET /api/admin/homepage", err);
  }
}

/** Save the homepage layout. */
export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  try {
    const body = await req.json();
    if (!Array.isArray(body.sections)) return badRequest("تنسيق غير صالح");

    // Validate/normalize through the shared parser, then persist.
    const clean = parseSections(JSON.stringify(body.sections));
    const value = JSON.stringify(clean);

    await prisma.setting.upsert({
      where: { key: "home_sections" },
      update: { value },
      create: { key: "home_sections", value, type: "json", labelAr: "أقسام الصفحة الرئيسية", group: "homepage" },
    });

    await prisma.adminLog.create({
      data: { userId: session.user.id, action: "UPDATE_HOMEPAGE", entity: "Setting", details: { count: clean.length } },
    });

    return NextResponse.json({ success: true, data: clean });
  } catch (err) {
    return serverError("PUT /api/admin/homepage", err);
  }
}
