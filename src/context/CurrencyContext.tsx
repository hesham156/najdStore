"use client";

import { createContext, useContext, useState, useEffect } from "react";

export interface Currency {
  code: string;
  nameAr: string;
  symbol: string;
  rate: number; // relative to SAR
}

export const CURRENCIES: Currency[] = [
  { code: "SAR", nameAr: "ريال سعودي",    symbol: "ر.س",  rate: 1 },
  { code: "AED", nameAr: "درهم إماراتي",  symbol: "د.إ",  rate: 1.02 },
  { code: "KWD", nameAr: "دينار كويتي",   symbol: "د.ك",  rate: 0.12 },
  { code: "BHD", nameAr: "دينار بحريني",  symbol: "د.ب",  rate: 0.14 },
  { code: "QAR", nameAr: "ريال قطري",     symbol: "ر.ق",  rate: 1.37 },
  { code: "OMR", nameAr: "ريال عُماني",   symbol: "ر.ع",  rate: 0.14 },
  { code: "EGP", nameAr: "جنيه مصري",    symbol: "ج.م",  rate: 13.5 },
  { code: "USD", nameAr: "دولار أمريكي",  symbol: "$",    rate: 0.27 },
];

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  formatAmount: (amount: number | string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: CURRENCIES[0],
  setCurrency: () => {},
  formatAmount: (a) => {
    const n = parseFloat(String(a));
    return `${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
  },
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("selected_currency");
    if (saved) {
      const found = CURRENCIES.find((c) => c.code === saved);
      if (found) setCurrencyState(found);
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("selected_currency", c.code);
  };

  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    // A malformed price must not print "NaN ر.س" next to an Add-to-cart button.
    const safe = Number.isFinite(num) ? num : 0;
    const converted = safe * currency.rate;
    const decimals = currency.code === "KWD" || currency.code === "BHD" || currency.code === "OMR" ? 3 : 2;
    return `${converted.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} ${currency.symbol}`;
  };

  if (!mounted) {
    const defaultFormat = (amount: number | string) => {
      const num = typeof amount === "string" ? parseFloat(amount) : amount;
      const safe = Number.isFinite(num) ? num : 0;
      return `${safe.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
    };
    return (
      <CurrencyContext.Provider value={{ currency: CURRENCIES[0], setCurrency, formatAmount: defaultFormat }}>
        {children}
      </CurrencyContext.Provider>
    );
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
