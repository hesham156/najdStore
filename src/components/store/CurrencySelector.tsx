"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCurrency, CURRENCIES } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-fg-muted hover:bg-surface-sunken transition-colors"
        aria-label="اختر العملة"
      >
        <span className="text-xs font-bold">{currency.symbol}</span>
        <span className="hidden sm:inline text-xs">{currency.code}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3.5 w-3.5" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute start-0 top-full mt-1.5 w-48 rounded-xl border border-line bg-surface shadow-xl z-20 overflow-hidden"
            >
              <div className="py-1">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => { setCurrency(c); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2 text-sm transition-colors",
                      c.code === currency.code
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-semibold"
                        : "text-fg-muted hover:bg-surface-sunken"
                    )}
                  >
                    <span>{c.nameAr}</span>
                    <span className="text-xs font-bold text-fg-subtle">{c.symbol}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
