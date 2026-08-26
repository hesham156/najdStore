import { WaitlistHero } from "@/components/ui/waitlist-hero";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

// The root layout's title template already appends the store name, so this
// title carried it twice — and hardcoded the placeholder while doing it.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("waitlist");
  return {
    title: t("metaTitle"),
    description: t("metaDesc"),
  };
}

export default function WaitlistPage() {
  return <WaitlistHero />;
}
