import { WaitlistHero } from "@/components/ui/waitlist-hero";
import type { Metadata } from "next";

// The root layout's title template already appends the store name, so this
// title carried it twice — and hardcoded the placeholder while doing it.
export const metadata: Metadata = {
  title: "قائمة الانتظار",
  description: "انضم إلى قائمة الانتظار وكن أول من يعلم عند الإطلاق.",
};

export default function WaitlistPage() {
  return <WaitlistHero />;
}
