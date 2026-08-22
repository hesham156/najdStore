"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", icon: Sun, label: "فاتح" },
  { value: "system", icon: Monitor, label: "تلقائي" },
  { value: "dark", icon: Moon, label: "داكن" },
] as const;

/**
 * `compact` cycles through the three modes with one button — used in the
 * admin header where horizontal space is tight.
 */
export function ThemeToggle({ className, compact }: { className?: string; compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Theme is unknown during SSR; render the neutral state until mounted.
  useEffect(() => setMounted(true), []);

  if (compact) {
    // Before mount the theme is unknown, so both the icon and the label must
    // describe the same neutral "system" state or hydration mismatches.
    const idx = mounted ? Math.max(0, OPTIONS.findIndex((o) => o.value === theme)) : 1;
    const current = OPTIONS[idx];
    const next = OPTIONS[(idx + 1) % OPTIONS.length];
    const Icon = current.icon;
    return (
      <button
        type="button"
        onClick={() => setTheme(next.value)}
        aria-label={`المظهر: ${current.label} — التبديل إلى ${next.label}`}
        title={`المظهر: ${current.label}`}
        className={cn(
          "rounded-lg p-2 text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg",
          className
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="مظهر الواجهة"
      className={cn("flex items-center gap-0.5 rounded-xl bg-surface-sunken p-1", className)}
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              active ? "bg-surface text-primary-600 shadow-xs dark:text-primary-400" : "text-fg-muted hover:text-fg"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
