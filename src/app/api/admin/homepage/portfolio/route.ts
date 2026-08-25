import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, unauthorized, serverError } from "@/lib/api";
import { getPortfolio, parsePortfolio, SETTING_KEY } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

/** Load the current gallery content for editing. */
export async function GET() {
  if (!(await requireAdmin())) return unauthorized();
  try {
    return NextResponse.json({ success: true, data: await getPortfolio() });
  } catch (err) {
    return serverError("GET /api/admin/homepage/portfolio", err);
  }
}

/** Save the gallery content (validated/normalized through the shared parser). */
export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return unauthorized();
  try {
    const body = await req.json();
    const clean = parsePortfolio(body);
    const value = JSON.stringify(clean);

    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      update: { value },
      create: { key: SETTING_KEY, value, type: "json", labelAr: "معرض الأعمال", group: "homepage" },
    });

    await prisma.adminLog.create({
      data: { userId: session.user.id, action: "UPDATE_PORTFOLIO", entity: "Setting", details: { items: clean.items.length } },
    });

    return NextResponse.json({ success: true, data: clean });
  } catch (err) {
    return serverError("PUT /api/admin/homepage/portfolio", err);
  }
}
