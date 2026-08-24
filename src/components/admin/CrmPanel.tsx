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

/**
 * Activity rows are told apart by their icon and their text. Only the two
 * types that carry real urgency — an open ticket and an abandoned cart —
 * are allowed a colour; the rest stay neutral so those two stand out.
 */
const ACT_ICON: Record<string, { icon: typeof ShoppingBag; color: string }> = {
  order: { icon: ShoppingBag, color: "text-fg-muted bg-surface-sunken" },
  customer: { icon: UserPlus, color: "text-fg-muted bg-surface-sunken" },
  payment: { icon: CreditCard, color: "text-success bg-success/10" },
  ticket: { icon: LifeBuoy, color: "text-warning bg-warning/10" },
  cart: { icon: ShoppingCart, color: "text-danger bg-danger/10" },
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

  // A funnel is a sequence, not five unrelated things: one brand ramp that
  // deepens as the customer gets closer to paying.
  const stages = f ? [
    { label: "الزيارات", value: f.visits, icon: Eye, color: "bg-primary-300" },
    { label: "سلات", value: f.carts, icon: ShoppingCart, color: "bg-primary-400" },
    { label: "طلبات", value: f.orders, icon: ShoppingBag, color: "bg-primary-600" },
    { label: "مدفوعة", value: f.paid, icon: CreditCard, color: "bg-primary-800" },
  ] : [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-fg flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary-500" />
          مركز علاقات العملاء (CRM)
        </h2>
        <button onClick={load} className="p-1.5 rounded-lg text-fg-subtle hover:text-primary-600 hover:bg-surface-sunken">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Customer insight tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Six KPIs, one treatment. The number is the signal — the tile is not. */}
        <Tile icon={<Users className="h-4 w-4" />} label="إجمالي العملاء" value={String(ins?.totalCustomers ?? "—")} />
        <Tile icon={<UserPlus className="h-4 w-4" />} label="جدد هذا الشهر" value={String(ins?.newCustomers ?? "—")} />
        <Tile icon={<Repeat className="h-4 w-4" />} label="معدل التكرار" value={ins ? `${ins.repeatRate}%` : "—"} />
        <Tile icon={<Crown className="h-4 w-4" />} label="عملاء اشتروا" value={String(ins?.payingCustomers ?? "—")} />
        <Tile icon={<Wallet className="h-4 w-4" />} label="متوسط الطلب" value={ins ? formatCurrency(ins.aov) : "—"} />
        <Tile icon={<TrendingUp className="h-4 w-4" />} label="قيمة العميل (CLV)" value={ins ? formatCurrency(ins.clv) : "—"} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Funnel */}
        <Card className="xl:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-fg">قمع المبيعات (هذا الشهر)</h3>
            <span className="text-xs text-fg-subtle">تحويل {convRate}%</span>
          </div>
          <div className="space-y-2.5">
            {stages.map((st) => {
              const pct = Math.max(4, (st.value / maxFunnel) * 100);
              return (
                <div key={st.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-fg-muted"><st.icon className="h-3.5 w-3.5" />{st.label}</span>
                    <span className="font-bold text-fg">{st.value.toLocaleString("en")}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-sunken overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", st.color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-fg-subtle mt-3">تحويل السلة إلى طلب: {cartConv}%</p>
        </Card>

        {/* Top customers */}
        <Card className="xl:col-span-1">
          <h3 className="font-semibold text-sm text-fg flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-warning" /> أفضل العملاء
          </h3>
          <div className="space-y-2">
            {(data?.topCustomers || []).map((c, i) => (
              <Link key={c.id} href={`/admin/customers/${c.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-sunken">
                <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                  // Rank is an ordinal scale — one brand ramp, strongest at the top.
                  i === 0 ? "bg-primary-600 text-white" : i === 1 ? "bg-brand/20 text-brand" : i === 2 ? "bg-brand/10 text-brand" : "bg-surface-sunken text-fg-subtle")}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg truncate">{c.name}</p>
                  <p className="text-xs text-fg-subtle">{c.orders} طلب</p>
                </div>
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400 shrink-0">{formatCurrency(c.spent)}</span>
              </Link>
            ))}
            {!loading && (data?.topCustomers.length ?? 0) === 0 && <p className="text-sm text-fg-subtle text-center py-4">لا توجد بيانات بعد</p>}
          </div>
        </Card>

        {/* Activity feed */}
        <Card className="xl:col-span-1">
          <h3 className="font-semibold text-sm text-fg flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary-500" /> النشاط الأخير
          </h3>
          <div className="space-y-3 max-h-80 overflow-auto pe-1">
            {(data?.activity || []).map((a, i) => {
              const meta = ACT_ICON[a.type] || ACT_ICON.order;
              const Inner = (
                <div className="flex items-start gap-3">
                  <span className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", meta.color)}><meta.icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg truncate">{a.title}</p>
                    <p className="text-xs text-fg-subtle truncate">{a.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-fg-subtle shrink-0 whitespace-nowrap">{formatDistanceToNow(new Date(a.at), { addSuffix: true, locale: ar })}</span>
                </div>
              );
              return a.href
                ? <Link key={i} href={a.href} className="block rounded-lg p-1.5 -mx-1.5 hover:bg-surface-sunken">{Inner}</Link>
                : <div key={i} className="p-1.5">{Inner}</div>;
            })}
            {!loading && (data?.activity.length ?? 0) === 0 && <p className="text-sm text-fg-subtle text-center py-4">لا يوجد نشاط بعد</p>}
          </div>
        </Card>
      </div>
    </section>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card padding="sm" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand/10 text-brand">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-fg-subtle truncate">{label}</p>
        <p className="font-bold text-fg text-sm truncate">{value}</p>
      </div>
    </Card>
  );
}
