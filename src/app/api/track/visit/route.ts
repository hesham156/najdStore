import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public, lightweight page-view ingestion. Called from the storefront on each
 * client-side navigation. Records path + title so the admin dashboard can show
 * monthly visit totals and "visits in the last hour".
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let path = typeof body.path === "string" ? body.path.slice(0, 500) : "";
    if (!path) return NextResponse.json({ success: true }); // nothing to record

    // Ignore admin/auth/api paths — we only track storefront traffic.
    if (path.startsWith("/admin") || path.startsWith("/api") || path.startsWith("/login") || path.startsWith("/register")) {
      return NextResponse.json({ success: true });
    }
    // Strip query string for cleaner grouping.
    path = path.split("?")[0];

    const title = typeof body.title === "string" ? body.title.slice(0, 300) : null;
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null;
    const visitorId = typeof body.visitorId === "string" ? body.visitorId.slice(0, 64) : null;

    await prisma.pageVisit.create({
      data: { path, title, referrer, visitorId },
    });

    return NextResponse.json({ success: true });
  } catch {
    // Tracking must never break the storefront — swallow errors.
    return NextResponse.json({ success: true });
  }
}
