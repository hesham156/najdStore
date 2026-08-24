import { MetadataRoute } from "next";
import { getSeoConfig } from "@/lib/seo";
import { aiRobotRules } from "@/lib/ai-crawlers";

// Reads the AI policy from settings, so it cannot be statically cached.
export const dynamic = "force-dynamic";

/** Never crawlable by anyone: private, transactional or API surface. */
const PRIVATE_PATHS = [
  "/admin/",
  "/api/",
  "/checkout",
  "/cart",
  "/dashboard/",
  "/login",
  "/register",
  "/reset-password",
  "/forgot-password",
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const cfg = await getSeoConfig();

  // The merchant switched indexing off — say so plainly to everyone.
  if (!cfg.indexable) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${cfg.siteUrl}/sitemap.xml`,
      host: cfg.siteUrl,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      ...aiRobotRules(cfg.aiPolicy, PRIVATE_PATHS),
    ],
    sitemap: `${cfg.siteUrl}/sitemap.xml`,
    host: cfg.siteUrl,
  };
}
