"use client";

import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  min: number;
  max: number;
}

export function LiveViewers({ min, max }: Props) {
  const t = useTranslations("liveViewers");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    // Set initial count on client only (avoids hydration mismatch)
    setCount(Math.floor(Math.random() * (max - min + 1)) + min);

    const t = setInterval(() => {
      setCount((prev) => {
        if (prev === null) return min;
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(min, Math.min(max, prev + delta));
      });
    }, 25_000);
    return () => clearInterval(t);
  }, [min, max]);

  if (count === null) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-fg-subtle">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
      </span>
      <Eye className="h-3.5 w-3.5" />
      <span>
        <strong className="text-fg-muted">{count}</strong> {t("suffix")}
      </span>
    </div>
  );
}
