"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { RANGE_OPTIONS, type RangeKey } from "./period-options";

/**
 * Writes the selected period into the URL so the server component can
 * re-query — the choice survives a refresh and can be shared as a link.
 *
 * The options themselves live in `period-options.ts` (a plain module) because
 * the server component reads them too.
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
