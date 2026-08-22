"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export interface StatItem {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  /** Tailwind classes for the icon chip, e.g. "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400" */
  color: string;
}

/** A responsive row of KPI cards used across admin list pages. */
export function AdminStats({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((s) => (
        <Card key={s.label}>
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.color)}>
              <s.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black text-gray-900 dark:text-white truncate">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
