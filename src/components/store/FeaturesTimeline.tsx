"use client";

import { Zap, Shield, Star, HeadphonesIcon, CreditCard, RefreshCw, Globe } from "lucide-react";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import type { TimelineItem } from "@/components/ui/radial-orbital-timeline";

const timelineData: TimelineItem[] = [
  {
    id: 1,
    title: "تنفيذ وتسليم سريع",
    date: "أسرع وقت",
    content: "معظم المنتجات تُسلَّم تلقائياً فور اعتماد الدفع، والطلبات الأخرى تُنفَّذ بجدولة زمنية دقيقة.",
    category: "delivery",
    icon: Zap,
    relatedIds: [2, 5],
    status: "completed",
    energy: 100,
  },
  {
    id: 2,
    title: "آمان تام",
    date: "AES-256",
    content: "بياناتك محمية بأحدث معايير التشفير. لا نحتفظ بمعلومات الدفع الحساسة على خوادمنا.",
    category: "security",
    icon: Shield,
    relatedIds: [1, 5],
    status: "completed",
    energy: 95,
  },
  {
    id: 3,
    title: "أسعار تنافسية",
    date: "وفر 70%",
    content: "أفضل الأسعار في السوق مقارنةً بالمتاجر الأخرى مع عروض دائمة للتوفير الأقصى.",
    category: "pricing",
    icon: Star,
    relatedIds: [4, 7],
    status: "completed",
    energy: 90,
  },
  {
    id: 4,
    title: "دعم 24/7",
    date: "< 5 دقائق",
    content: "فريق دعم متخصص على مدار الساعة لحل أي مشكلة عبر الواتساب والبريد الإلكتروني.",
    category: "support",
    icon: HeadphonesIcon,
    relatedIds: [3, 1],
    status: "completed",
    energy: 98,
  },
  {
    id: 5,
    title: "دفع مرن",
    date: "+10 طرق",
    content: "بطاقات بنكية، فودافون كاش، إنستاباي، وتحويل بنكي — بدون رسوم خفية.",
    category: "payment",
    icon: CreditCard,
    relatedIds: [1, 2],
    status: "completed",
    energy: 85,
  },
  {
    id: 6,
    title: "خدمة ما بعد البيع",
    date: "مستمر",
    content: "نقدم الدعم الفني والمتابعة بعد الشراء لضمان رضاك التام وراحة بالك.",
    category: "renewal",
    icon: RefreshCw,
    relatedIds: [1, 5],
    status: "in-progress",
    energy: 75,
  },
  {
    id: 7,
    title: "تشكيلة واسعة",
    date: "متكاملة",
    content: "تشكيلة متنوعة من المنتجات والخدمات تغطي احتياجاتك المختلفة في مكان واحد.",
    category: "catalog",
    icon: Globe,
    relatedIds: [3, 4],
    status: "completed",
    energy: 92,
  },
];

export function FeaturesTimeline() {
  return <RadialOrbitalTimeline timelineData={timelineData} />;
}
