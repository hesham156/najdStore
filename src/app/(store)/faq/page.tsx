"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// Structure only; the copy lives in the `faqPage` message namespace.
const FAQ_META = [
  { cat: "cat1", count: 3 },
  { cat: "cat2", count: 3 },
  { cat: "cat3", count: 3 },
  { cat: "cat4", count: 2 },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-line rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-4 text-start hover:bg-surface-sunken transition-colors"
      >
        <span className="font-semibold text-fg">{q}</span>
        <ChevronDown className={cn("h-5 w-5 text-fg-subtle shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-fg-muted leading-relaxed border-t border-line pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const t = useTranslations("faqPage");
  const faqs = FAQ_META.map((section) => ({
    category: t(section.cat),
    items: Array.from({ length: section.count }, (_, i) => ({
      q: t(`${section.cat}q${i + 1}`),
      a: t(`${section.cat}a${i + 1}`),
    })),
  }));

  return (
    <div className="min-h-screen py-12">
      <div className="container-custom max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black text-fg mb-3">{t("title")}</h1>
          <p className="text-fg-subtle text-lg">{t("subtitle")}</p>
        </div>

        <div className="space-y-8">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="text-lg font-bold text-fg mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-primary-600 dark:bg-primary-400" />
                </span>
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-8">
          <h3 className="font-bold text-fg text-lg mb-2">{t("notFoundTitle")}</h3>
          <p className="text-fg-muted mb-4">{t("notFoundDesc")}</p>
          <a href="/contact" className="btn-primary inline-flex">{t("contactUs")}</a>
        </div>
      </div>
    </div>
  );
}
