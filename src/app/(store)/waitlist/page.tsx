import { WaitlistHero } from "@/components/ui/waitlist-hero";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "قائمة الانتظار | متجرك الإلكتروني",
  description: "انضم إلى قائمة الانتظار وكن أول من يعلم عند الإطلاق.",
};

export default function WaitlistPage() {
  return <WaitlistHero />;
}
