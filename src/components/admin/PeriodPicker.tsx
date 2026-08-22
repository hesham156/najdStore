"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Tabs } from "@/components/ui/Tabs";

export const RANGE_OPTIONS = [
  { value: "7", label: "آخر 7 أيام", short: "7 أيام", compareLabel: "مقارنة بالأسبوع السابق" },
  { value: "30", label: "آخر 30 يوماً", short: "30 يوماً", compareLabel: "مقارنة بالفترة السابقة" },
  { value: "90", label: "آخر 90 يوماً", short: "90 يوماً", compareLabel: "مقارنة بالفترة السابقة" },
] as const;

export type RangeKey = (typeof RANGE_OPTIONS)[number]["value"];

/**
 * Writes the selected period into the URL so the server component can
 * re-query — the choice survives a refresh and can be shared as a link.
 */
export function PeriodPicker({ value }: { value: RangeKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const select = (next: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("range", next);
    startTransition(() => router.push(`?${params.toString()}`, { scroll: false }));
  };

  return (
    <div className={pending ? "pointer-events-none opacity-60 transition-opacity" : "transition-opacity"}>
      <Tabs
        variant="segmented"
        ariaLabel="الفترة الزمنية"
        value={value}
        onChange={select}
        items={RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.short }))}
      />
    </div>
  );
}
