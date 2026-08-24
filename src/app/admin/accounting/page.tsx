"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard, ArrowUpRight, Package, RefreshCw, Wallet, PiggyBank, Percent } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";

interface Summary {
  revenue: number;
  discounts: number;
  refunds: number;
  expenses: number;
  taxAmount: number;
  taxRate: number;
  profit: number;
  orderCount: number;
  expensesByCategory: { category: string; _sum: { amount: number | null } }[];
  monthlyChart: { month: string; revenue: number; expenses: number }[];
}

const PERIOD_LABELS: Record<string, string> = {
  month: "هذا الشهر",
  quarter: "هذا الربع",
  year: "هذا العام",
  all: "كل الوقت",
};

const CATEGORY_AR: Record<string, string> = {
  HOSTING: "استضافة وخوادم",
  MARKETING: "تسويق وإعلانات",
  SALARY: "رواتب",
  TOOLS: "برامج وأدوات",
  PURCHASE: "مشتريات",
  TAX: "ضرائب ورسوم",
  OTHER: "أخرى",
};

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend === "up" && <TrendingUp className="h-4 w-4 text-success" />}
        {trend === "down" && <TrendingDown className="h-4 w-4 text-danger" />}
      </div>
      <div>
        <p className="text-2xl font-black text-fg">{value}</p>
        <p className="text-sm text-fg-muted mt-0.5">{label}</p>
        {sub && <p className="text-xs text-fg-subtle mt-1">{sub}</p>}
      </div>
    </Card>
  );
}

function MiniChart({ data }: { data: { month: string; revenue: number; expenses: number }[] }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, d.expenses)), 1);
  const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return (
    <div className="flex items-end gap-1 h-28 w-full">
      {data.map((d, i) => {
        const month = parseInt(d.month.split("-")[1]) - 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex gap-0.5 items-end" style={{ height: "80px" }}>
              <div
                className="flex-1 bg-primary-500 rounded-t opacity-90 min-h-[2px]"
                style={{ height: `${(d.revenue / maxVal) * 80}px` }}
                title={`إيراد: ${d.revenue.toFixed(0)}`}
              />
              <div
                className="flex-1 bg-danger rounded-t opacity-80 min-h-[2px]"
                style={{ height: `${(d.expenses / maxVal) * 80}px` }}
                title={`مصاريف: ${d.expenses.toFixed(0)}`}
              />
            </div>
            <span className="text-[9px] text-fg-subtle truncate">
              {MONTHS_AR[month]?.slice(0, 3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AccountingDashboard() {
  const [period, setPeriod] = useState("month");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/accounting/summary?period=${period}`);
    const data = await res.json();
    if (data.success) setSummary(data.data);
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const fmt = (n: number) => `${n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="المحاسبة والتقارير المالية"
        description="نظرة شاملة على الإيرادات والمصاريف والأرباح"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(PERIOD_LABELS).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setPeriod(k)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                period === k
                  ? "bg-primary-600 text-white shadow-md"
                  : "bg-surface-sunken text-fg-muted hover:bg-surface-hover"
              }`}
            >
              {v}
            </button>
          ))}
            <button
              onClick={fetchSummary}
              aria-label="تحديث البيانات"
              title="تحديث البيانات"
              className="p-2 rounded-control bg-surface-sunken text-fg-muted hover:bg-surface-hover transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            </button>
          </div>
        }
      />

      {loading && !summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-surface-sunken rounded-2xl animate-pulse" />)}
        </div>
      ) : summary ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Only net profit earns a colour, because only its sign is good or bad.
                Expenses and VAT are normal facts of running a store, not errors. */}
            <KPICard icon={DollarSign}  label="إجمالي الإيراد"     value={fmt(summary.revenue)}   sub={`${summary.orderCount} طلب`} color="bg-brand-solid" trend="up" />
            <KPICard icon={PiggyBank}   label="صافي الربح"          value={fmt(summary.profit)}    sub={summary.profit >= 0 ? "ربح" : "خسارة"} color={summary.profit >= 0 ? "bg-success-solid" : "bg-danger-solid"} trend={summary.profit >= 0 ? "up" : "down"} />
            <KPICard icon={TrendingDown} label="إجمالي المصاريف"   value={fmt(summary.expenses)}  color="bg-brand-solid" />
            <KPICard icon={Percent}     label={`ضريبة القيمة المضافة (${summary.taxRate}%)`} value={fmt(summary.taxAmount)} sub="مستحقة للهيئة" color="bg-brand-solid" />
          </div>

          {/* Second row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart */}
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-fg">الإيرادات والمصاريف — آخر 12 شهر</h3>
                <div className="flex items-center gap-3 text-xs text-fg-muted">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary-500 inline-block" />إيراد</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-danger inline-block" />مصاريف</span>
                </div>
              </div>
              <MiniChart data={summary.monthlyChart} />
            </Card>

            {/* Expense breakdown */}
            <Card className="p-5">
              <h3 className="font-bold text-fg mb-4">توزيع المصاريف</h3>
              {summary.expensesByCategory.length === 0 ? (
                <p className="text-sm text-fg-subtle text-center py-6">لا توجد مصاريف</p>
              ) : (
                <div className="space-y-3">
                  {summary.expensesByCategory.map((e) => {
                    const amt = Number(e._sum.amount ?? 0);
                    const pct = summary.expenses > 0 ? (amt / summary.expenses) * 100 : 0;
                    return (
                      <div key={e.category}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-fg">{CATEGORY_AR[e.category] ?? e.category}</span>
                          <span className="text-fg-muted">{fmt(amt)}</span>
                        </div>
                        <div className="h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                          {/* Each bar is already labelled, so it does not need its own hue. */}
                          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-lg font-black text-fg">{fmt(summary.discounts)}</p>
                <p className="text-xs text-fg-muted">خصومات ممنوحة</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-danger/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-danger" />
              </div>
              <div>
                <p className="text-lg font-black text-fg">{fmt(summary.refunds)}</p>
                <p className="text-xs text-fg-muted">مبالغ مستردة</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-lg font-black text-fg">{fmt(summary.revenue - summary.refunds)}</p>
                <p className="text-xs text-fg-muted">صافي الإيراد</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-lg font-black text-fg">
                  {summary.orderCount > 0 ? fmt((summary.revenue - summary.refunds) / summary.orderCount) : "0"}
                </p>
                <p className="text-xs text-fg-muted">متوسط قيمة الطلب</p>
              </div>
            </Card>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/admin/accounting/expenses">
              <Card className="p-5 hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-danger" />
                    </div>
                    <div>
                      <p className="font-bold text-fg">إدارة المصاريف</p>
                      <p className="text-xs text-fg-muted">تسجيل وتتبع جميع التكاليف</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-fg-subtle group-hover:text-primary-500 transition-colors" />
                </div>
              </Card>
            </Link>
            <Link href="/admin/accounting/invoices">
              <Card className="p-5 hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-info" />
                    </div>
                    <div>
                      <p className="font-bold text-fg">الفواتير الضريبية</p>
                      <p className="text-xs text-fg-muted">إصدار وطباعة الفواتير</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-fg-subtle group-hover:text-primary-500 transition-colors" />
                </div>
              </Card>
            </Link>
          </div>
        </>
      ) : (
        <p className="text-fg-muted text-center py-12">حدث خطأ في تحميل البيانات</p>
      )}
    </div>
  );
}
