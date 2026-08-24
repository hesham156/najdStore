"use client";

import { useCurrency } from "@/context/CurrencyContext";

interface PaymentBadgesProps {
  price: number;
  tabbyEnabled: boolean;
  tamaraEnabled: boolean;
  tabbyInstallments?: number;
  tamaraInstallments?: number;
}

// ── Tabby SVG logo (simplified, brand colour #3DBDA7)
function TabbyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <text x="0" y="18" fontSize="18" fontWeight="800" fill="#3DBDA7" fontFamily="Arial,sans-serif">tabby</text>
    </svg>
  );
}

// ── Tamara SVG logo (simplified, brand colour #BC98D5)
function TamaraLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 72 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <text x="0" y="18" fontSize="17" fontWeight="800" fill="#BC98D5" fontFamily="Arial,sans-serif">tamara</text>
    </svg>
  );
}

export function PaymentBadges({
  price,
  tabbyEnabled,
  tamaraEnabled,
  tabbyInstallments = 4,
  tamaraInstallments = 3,
}: PaymentBadgesProps) {
  const { formatAmount } = useCurrency();
  if (!tabbyEnabled && !tamaraEnabled) return null;

  const tabbyInstallmentPrice = price / tabbyInstallments;
  const tamaraInstallmentPrice = price / tamaraInstallments;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wide">
        خيارات التقسيط
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        {/* ── Tabby ── */}
        {tabbyEnabled && (
          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[#3DBDA7]/40 bg-[#3DBDA7]/5 dark:bg-[#3DBDA7]/10 hover:border-[#3DBDA7]/70 transition-colors group">
            <TabbyLogo className="h-5 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-fg leading-tight">
                {tabbyInstallments} دفعات ×{" "}
                <span className="text-[#2eaa94]">{formatAmount(tabbyInstallmentPrice)}</span>
              </p>
              <p className="text-xs text-fg-subtle">بدون فوائد • بدون رسوم</p>
            </div>
            <span className="ms-auto text-[10px] font-semibold text-[#3DBDA7] bg-[#3DBDA7]/10 dark:bg-[#3DBDA7]/20 px-2 py-0.5 rounded-full shrink-0">
              0%
            </span>
          </div>
        )}

        {/* ── Tamara ── */}
        {tamaraEnabled && (
          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[#BC98D5]/40 bg-[#BC98D5]/5 dark:bg-[#BC98D5]/10 hover:border-[#BC98D5]/70 transition-colors group">
            <TamaraLogo className="h-5 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-fg leading-tight">
                {tamaraInstallments} دفعات ×{" "}
                <span className="text-[#9b6dc0]">{formatAmount(tamaraInstallmentPrice)}</span>
              </p>
              <p className="text-xs text-fg-subtle">بدون فوائد • بدون رسوم</p>
            </div>
            <span className="ms-auto text-[10px] font-semibold text-[#BC98D5] bg-[#BC98D5]/10 dark:bg-[#BC98D5]/20 px-2 py-0.5 rounded-full shrink-0">
              0%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
