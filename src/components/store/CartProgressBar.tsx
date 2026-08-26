"use client";

import { Gift, Check } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { useTranslations } from "next-intl";

interface Props {
  currentTotal: number;
  target: number;
  reward: string;
  coupon?: string;
}

export function CartProgressBar({ currentTotal, target, reward, coupon }: Props) {
  const { formatAmount } = useCurrency();
  const t = useTranslations("cartProgress");
  const progress = Math.min(100, (currentTotal / target) * 100);
  const remaining = Math.max(0, target - currentTotal);
  const achieved = remaining === 0;

  return (
    <div className="mx-4 mb-3 rounded-control border border-primary-100 bg-gradient-to-r from-primary-50 to-primary-100/60 p-3 dark:border-primary-800 dark:from-primary-900/20 dark:to-primary-800/20">
      <div className="flex items-start gap-2 mb-2">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${achieved ? "bg-success-solid" : "bg-primary-100 dark:bg-primary-800"}`}>
          {achieved ? (
            <Check className="h-3 w-3 text-white" />
          ) : (
            <Gift className="h-3 w-3 text-primary-600 dark:text-primary-400" />
          )}
        </div>
        {achieved ? (
          <div>
            <p className="text-xs font-bold text-success">
              {t("congrats", { reward })}
            </p>
            {coupon && (
              <p className="text-xs text-success mt-0.5">
                {t("discountCode")}{" "}
                <span className="font-mono font-bold bg-success/10 px-1.5 py-0.5 rounded">
                  {coupon}
                </span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs font-medium text-primary-700 dark:text-primary-300 leading-relaxed">
            {t.rich("addMore", {
              amount: formatAmount(remaining),
              reward,
              b: (chunks) => <span className="font-bold">{chunks}</span>,
            })}
          </p>
        )}
      </div>
      <div className="h-1.5 bg-primary-100 dark:bg-primary-900/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-500 to-primary-700 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
