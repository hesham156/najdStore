import { NextResponse } from "next/server";
import { getPortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

/** Public: the storefront gallery reads this to render "معرض الأعمال". */
export async function GET() {
  const data = await getPortfolio();
  const res = NextResponse.json({ success: true, data });
  res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  return res;
}
