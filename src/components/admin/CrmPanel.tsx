"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Users, UserPlus, Repeat, Wallet, Crown, RefreshCw, Eye, ShoppingCart, ShoppingBag,
  CreditCard, LifeBuoy, TrendingUp, Activity, Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency, cn } from "@/lib/utils";

interface CrmData {
  insights: {
    totalCustomers: number; newCustomers: number; payingCustomers: number;
    returningCustomers: number; repeatRate: number; aov: number; clv: number;
  };
  topCustomers: { id: string; name: string; email: string; orders: number; spent: number }[];
  funnel: { visits: number; carts: number; orders: number; paid: number };
  activity: { type: string; title: string; subtitle: string; at: string; href?: string }[];
}

const ACT_ICON: Record<string, { icon: typeof ShoppingBag; color: string }> = {
  order: { icon: ShoppingBag, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  customer: { icon: UserPlus, color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
  payment: { icon: CreditCard, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
  ticket: { icon: LifeBuoy, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
  cart: { icon: ShoppingCart, color: "text-red-500 bg-red-50 dark:bg-red-900/20" },
};

export function CrmPanel() {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dashboard/crm");
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ins = data?.insights;
  const f = data?.funnel;
  const maxFunnel = Math.max(1, f?.visits ?? 1);
  const convRate = f && f.visits > 0 ? ((f.orders / f.visits) * 100).toFixed(1) : "0";
  const cartConv = f && f.carts > 0 ? ((f.orders / f.carts) * 100).toFixed(0) : "0";

  const stages = f ? [
    { label: "الزيارات", value: f.visits, icon: Eye, color: "bg-sky-500" },
    { label: "سلات", value: f.carts, icon: ShoppingCart, color: "bg-violet-500" },
    { label: "طلبات", value: f.orders, icon: ShoppingBag, color: "bg-blue-600" },
    { label: "مدفوعة", value: f.paid, icon: CreditCard, color: "bg-emerald-600" },
  ] : [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary-500" />
          مركز علاقات العملاء (CRM)
        </h2>
        <button onClick={load} className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-800">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Customer insight tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Tile icon={<Users className="h-4 w-4" />} label="إجمالي العملاء" value={String(ins?.totalCustomers ?? "—")} color="text-blue-600 bg-blue-50 dark:bg-blue-900/20" />
        <Tile icon={<UserPlus className="h-4 w-4" />} label="جدد هذا الشهر" value={String(ins?.newCustomers ?? "—")} color="text-green-600 bg-green-50 dark:bg-green-900/20" />
        <Tile icon={<Repeat className="h-4 w-4" />} label="معدل التكرار" value={ins ? `${ins.repeatRate}%` : "—"} color="text-purple-600 bg-purple-50 dark:bg-purple-900/20" />
        <Tile icon={<Crown className="h-4 w-4" />} label="عملاء اشتروا" value={String(ins?.payingCustomers ?? "—")} color="text-amber-600 bg-amber-50 dark:bg-amber-900/20" />
        <Tile icon={<Wallet className="h-4 w-4" />} label="متوسط الطلب" value={ins ? formatCurrency(ins.aov) : "—"} color="text-teal-600 bg-teal-50 dark:bg-teal-900/20" />
        <Tile icon={<TrendingUp className="h-4 w-4" />} label="قيمة العميل (CLV)" value={ins ? formatCurrency(ins.clv) : "—"} color="text-rose-600 bg-rose-50 dark:bg-rose-900/20" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Funnel */}
        <Card className="xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white">قمع المبيعات (هذا الشهر)</h3>
            <span className="text-xs text-gray-400">تحويل {convRate}%</span>
          </div>
          <div className="space-y-2.5">
            {stages.map((st) => {
              const pct = Math.max(4, (st.value / maxFunnel) * 100);
              return (
                <div key={st.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300"><st.icon className="h-3.5 w-3.5" />{st.label}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{st.value.toLocaleString("en")}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", st.color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">تحويل السلة إلى طلب: {cartConv}%</p>
        </Card>

        {/* Top customers */}
        <Card className="xl:col-span-1">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-amber-500" /> أفضل العملاء
          </h3>
          <div className="space-y-2">
            {(data?.topCustomers || []).map((c, i) => (
              <Link key={c.id} href={`/admin/customers/${c.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                  i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 dark:bg-gray-700 text-gray-500")}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.orders} طلب</p>
                </div>
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400 shrink-0">{formatCurrency(c.spent)}</span>
              </Link>
            ))}
            {!loading && (data?.topCustomers.length ?? 0) === 0 && <p className="text-sm text-gray-400 text-center py-4">لا توجد بيانات بعد</p>}
          </div>
        </Card>

        {/* Activity feed */}
        <Card className="xl:col-span-1">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary-500" /> النشاط الأخير
          </h3>
          <div className="space-y-3 max-h-80 overflow-auto pe-1">
            {(data?.activity || []).map((a, i) => {
              const meta = ACT_ICON[a.type] || ACT_ICON.order;
              const Inner = (
                <div className="flex items-start gap-3">
                  <span className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", meta.color)}><meta.icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.title}</p>
                    <p className="text-xs text-gray-500 truncate">{a.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap">{formatDistanceToNow(new Date(a.at), { addSuffix: true, locale: ar })}</span>
                </div>
              );
              return a.href
                ? <Link key={i} href={a.href} className="block rounded-lg p-1.5 -mx-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">{Inner}</Link>
                : <div key={i} className="p-1.5">{Inner}</div>;
            })}
            {!loading && (data?.activity.length ?? 0) === 0 && <p className="text-sm text-gray-400 text-center py-4">لا يوجد نشاط بعد</p>}
          </div>
        </Card>
      </div>
    </section>
  );
}

function Tile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <Card padding="sm" className="flex items-center gap-2.5">
      <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color)}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{value}</p>
      </div>
    </Card>
  );
}
