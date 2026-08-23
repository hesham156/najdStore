"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** Stable anonymous visitor id kept in localStorage. */
function getVisitorId(): string {
  try {
    let id = localStorage.getItem("visitor_id");
    if (!id) {
      id = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36));
      localStorage.setItem("visitor_id", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/**
 * Fires one page-view beacon per storefront navigation. Mounted in the store
 * layout so every customer-facing route is recorded for the admin analytics.
 */
export function VisitTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;

    // Wait a tick so document.title reflects the new page.
    const t = setTimeout(() => {
      const payload = JSON.stringify({
        path: pathname,
        title: document.title,
        referrer: document.referrer || null,
        visitorId: getVisitorId(),
      });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/track/visit", new Blob([payload], { type: "application/json" }));
        } else {
          fetch("/api/track/visit", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
        }
      } catch {
        /* ignore */
      }
    }, 400);

    return () => clearTimeout(t);
  }, [pathname]);

  return null;
}
