"use client";

import { useState, useEffect, useCallback } from "react";
import { Eye, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface VisitItem { path: string; title: string; count: number }

export function LastHourVisitsCard() {
  const [items, setItems] = useState<VisitItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard/visits");
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setTotal(json.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60_000); // auto-refresh each minute
    return () => clearInterval(t);
  }, [fetchData]);

  const maxCount = Math.max(1, ...items.map((i) => i.count));

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-fg flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary-500" />
          الزيارات في آخر ساعة
          {total > 0 && <span className="text-xs font-medium text-fg-subtle">({total})</span>}
        </h2>
        <button onClick={fetchData} className="p-1.5 rounded-lg text-fg-subtle hover:text-primary-600 hover:bg-surface-sunken">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8">
          <Eye className="h-8 w-8 text-fg-subtle mx-auto mb-2" />
          <p className="text-sm text-fg-subtle">لا توجد زيارات في آخر ساعة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {items.map((it) => (
            <div key={it.path} className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm text-fg truncate" title={it.title}>{it.title}</p>
                <span className="text-sm font-bold text-primary-600 shrink-0">{it.count}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                <div className="h-full rounded-full bg-primary-500/80" style={{ width: `${(it.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
