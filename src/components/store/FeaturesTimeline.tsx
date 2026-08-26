"use client";

import { Zap, Shield, Star, HeadphonesIcon, CreditCard, RefreshCw, Globe } from "lucide-react";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import type { TimelineItem } from "@/components/ui/radial-orbital-timeline";
import { useTranslations } from "next-intl";

// Only the visual/relationship metadata lives here; the copy comes from the
// `features` message namespace so it renders in the active language.
const TIMELINE_META = [
  { id: 1, key: "f1", category: "delivery", icon: Zap,           relatedIds: [2, 5], status: "completed" as const,   energy: 100 },
  { id: 2, key: "f2", category: "security", icon: Shield,        relatedIds: [1, 5], status: "completed" as const,   energy: 95  },
  { id: 3, key: "f3", category: "pricing",  icon: Star,          relatedIds: [4, 7], status: "completed" as const,   energy: 90  },
  { id: 4, key: "f4", category: "support",  icon: HeadphonesIcon,relatedIds: [3, 1], status: "completed" as const,   energy: 98  },
  { id: 5, key: "f5", category: "payment",  icon: CreditCard,    relatedIds: [1, 2], status: "completed" as const,   energy: 85  },
  { id: 6, key: "f6", category: "renewal",  icon: RefreshCw,     relatedIds: [1, 5], status: "in-progress" as const, energy: 75  },
  { id: 7, key: "f7", category: "catalog",  icon: Globe,         relatedIds: [3, 4], status: "completed" as const,   energy: 92  },
];

export function FeaturesTimeline() {
  const t = useTranslations("features");
  const timelineData: TimelineItem[] = TIMELINE_META.map((m) => ({
    id: m.id,
    title: t(`${m.key}.title`),
    date: t(`${m.key}.date`),
    content: t(`${m.key}.content`),
    category: m.category,
    icon: m.icon,
    relatedIds: m.relatedIds,
    status: m.status,
    energy: m.energy,
  }));
  return <RadialOrbitalTimeline timelineData={timelineData} />;
}
