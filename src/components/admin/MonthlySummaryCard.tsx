"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BarChart3, RefreshCw, Users, ShoppingBag, Wallet, Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

interface Point { label: string; sales: number; orders: number; date: string }
interface Summary {
  range: "monthly" | "daily";
  month: number;
  year: number;
  series: Point[];
  totals: { visits: number; orders: number; netSales: number };
  goal: { target: number; progress: number } | null;
}

export function MonthlySummaryCard() {
  const [range, setRange] = useState<"monthly" | "daily">("monthly");
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalValue, setGoalValue] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dashboard/summary?range=${range}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveGoal = async () => {
    setSavingGoal(true);
    try {
      const res = await fetch("/api/admin/dashboard/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: parseFloat(goalValue) || 0 }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("تم حفظ هدف الشهر ✓");
        setGoalOpen(false);
        setGoalValue("");
        fetchData();
      } else {
        toast.error(json.error || "تعذّر الحفظ");
      }
    } finally {
      setSavingGoal(false);
    }
  };

  const maxSales = Math.max(1, ...(data?.series.map((p) => p.sales) || [1]));
  const todayIdx = data
    ? data.range === "daily"
      ? new Date().getHours()
      : new Date().getDate() - 1
    : -1;

  const title = data ? `ملخص ${AR_MONTHS[data.month - 1]} ${data.year}` : "ملخص الشهر";

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="font-bold text-fg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary-500" />
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface-sunken rounded-lg p-0.5 text-xs font-medium">
              <button
                onClick={() => setRange("daily")}
                className={cn("px-3 py-1 rounded-md transition-all", range === "daily" ? "bg-surface text-primary-600 shadow-sm" : "text-fg-subtle")}
              >يومي</button>
              <button
                onClick={() => setRange("monthly")}
                className={cn("px-3 py-1 rounded-md transition-all", range === "monthly" ? "bg-surface text-primary-600 shadow-sm" : "text-fg-subtle")}
              >شهري</button>
            </div>
            <button onClick={fetchData} className="p-1.5 rounded-lg text-fg-subtle hover:text-primary-600 hover:bg-surface-sunken">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="relative h-40">
              {/* Tooltip */}
              {hover !== null && data?.series[hover] && (
                <div className="absolute -top-2 z-10 pointer-events-none -translate-x-1/2 rounded-xl bg-surface-sunken text-white text-xs px-3 py-2 shadow-xl whitespace-nowrap"
                  style={{ insetInlineStart: `${((hover + 0.5) / data.series.length) * 100}%` }}>
                  <p className="font-bold mb-0.5">
                    {data.range === "daily" ? `الساعة ${data.series[hover].date}` : `${data.series[hover].date} ${AR_MONTHS[data.month - 1]}`}
                  </p>
                  <p>صافي المبيعات: {data.series[hover].sales.toFixed(2)}</p>
                  <p>إجمالي الطلبات: {data.series[hover].orders}</p>
                </div>
              )}
              <div className="absolute inset-0 flex items-end justify-between gap-0.5">
                {(data?.series || []).map((p, i) => {
                  const h = 6 + (p.sales / maxSales) * 94;
                  const isToday = i === todayIdx;
                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      className="flex-1 flex items-end h-full cursor-pointer group"
                    >
                      <div
                        className={cn(
                          "w-full rounded-t transition-colors",
                          isToday ? "bg-primary-600" : p.sales > 0 ? "bg-primary-300 group-hover:bg-primary-500" : "bg-surface-sunken group-hover:bg-primary-300",
                          hover === i && "bg-primary-600",
                        )}
                        style={{ height: `${p.sales > 0 || isToday ? h : 8}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="order-1 lg:order-2 grid grid-cols-2 lg:grid-cols-1 gap-3">
            <Stat icon={<Users className="h-4 w-4" />} label="الزيارات" value={String(data?.totals.visits ?? 0)} color="text-warning bg-warning/10" />
            <Stat icon={<ShoppingBag className="h-4 w-4" />} label="الطلبات" value={String(data?.totals.orders ?? 0)} color="text-info bg-info/10" />
            <Stat icon={<Wallet className="h-4 w-4" />} label="صافي المبيعات" value={formatCurrency(data?.totals.netSales ?? 0)} color="text-danger bg-danger/10" />
            <Link href="/admin/accounting" className="lg:mt-1">
              <Button variant="outline" size="sm" fullWidth>استعرض كل التقارير</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Goal footer */}
      <div className="border-t border-line bg-surface-sunken/60 px-5 py-4">
        {data?.goal ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-fg flex items-center gap-2">
                <Target className="h-4 w-4 text-primary-500" />
                هدف الشهر: {formatCurrency(data.goal.target)}
              </p>
              <button onClick={() => { setGoalValue(String(data.goal!.target)); setGoalOpen(true); }} className="text-xs text-primary-600 hover:underline">تعديل</button>
            </div>
            <div className="h-2.5 rounded-full bg-surface-sunken overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-700 transition-all" style={{ width: `${data.goal.progress * 100}%` }} />
            </div>
            <p className="text-xs text-fg-subtle mt-1.5">
              {Math.round(data.goal.progress * 100)}% مكتمل — {formatCurrency(data.totals.netSales)} من {formatCurrency(data.goal.target)}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-fg">أضف هدفًا يحفّز شغفك</p>
              <p className="text-xs text-fg-subtle">الأهداف الواضحة تساعدك على تركيز جهدك ومتابعة نمو متجرك بسهولة.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setGoalValue(""); setGoalOpen(true); }}>
              <Target className="h-4 w-4" />أضف هدف الشهر
            </Button>
          </div>
        )}
      </div>

      {/* Goal modal */}
      <Modal isOpen={goalOpen} onClose={() => setGoalOpen(false)} title="هدف مبيعات الشهر" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-fg-subtle">حدّد قيمة صافي المبيعات التي تطمح لتحقيقها هذا الشهر (بالريال). اترك القيمة 0 لإلغاء الهدف.</p>
          <Input
            type="number"
            min={0}
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value)}
            placeholder="مثال: 5000"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setGoalOpen(false)}>إلغاء</Button>
            <Button size="sm" onClick={saveGoal} loading={savingGoal} disabled={goalValue === ""}>حفظ الهدف</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-fg-subtle">{label}</p>
        <p className="font-bold text-fg text-sm truncate">{value}</p>
      </div>
      <span className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", color)}>{icon}</span>
    </div>
  );
}
