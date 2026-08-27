"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/cart";

/** Reuse the same anonymous id the visit tracker stores. */
function getSessionId(): string {
  try {
    let id = localStorage.getItem("visitor_id");
    if (!id) {
      id = crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("visitor_id", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/**
 * Persists the customer's cart to the server (debounced) so abandoned carts
 * show up in the admin. An emptied cart removes the snapshot.
 */
export function CartTracker() {
  const items = useCartStore((s) => s.items);
  const { data: session } = useSession();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    // Skip the initial mount so we don't immediately re-post the hydrated cart.
    if (first.current) { first.current = false; return; }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const payload = {
        sessionId: getSessionId(),
        items: items.map((i) => ({
          id: i.id, nameAr: i.nameAr, name: i.name, image: i.image,
          price: i.price, quantity: i.quantity, variantLabel: i.variantLabel,
          customFields: i.customFields,
        })),
        userId: (session?.user as { id?: string } | undefined)?.id ?? null,
        customerName: session?.user?.name ?? null,
        customerEmail: session?.user?.email ?? null,
      };
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        if (navigator.sendBeacon) navigator.sendBeacon("/api/track/cart", blob);
        else fetch("/api/track/cart", { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }, keepalive: true });
      } catch {
        /* ignore */
      }
    }, 2500);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [items, session]);

  return null;
}
