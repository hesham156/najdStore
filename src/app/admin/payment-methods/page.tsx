"use client";

import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, CheckCircle2, XCircle, Building2, ShieldCheck, Zap, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/admin/PageHeader";

interface Setting { key: string; value: string }

/* ─── Toggle ─── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none",
        checked ? "bg-primary-600" : "bg-line-strong"
      )}
    >
      <span className={cn(
        "inline-block h-4 w-4 rounded-full bg-white shadow-md transform transition-transform duration-200",
        checked ? "-translate-x-1 rtl:translate-x-6" : "translate-x-1 rtl:translate-x-1"
      )} />
    </button>
  );
}

/* ─── Password Input ─── */
function PasswordInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-fg">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "••••••••••••"}
          className={cn(
            "w-full rounded-control border border-line bg-surface px-4 py-2.5 text-sm font-mono text-fg",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            "transition-colors"
          )}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ─── Payment Card ─── */
function PaymentCard({ title, subtitle, logo, color, enabled, onToggle, children }: {
  title: string; subtitle: string; logo: React.ReactNode;
  color: string; enabled: boolean; onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className={cn("flex items-center justify-between px-5 py-4 border-b dark:border-line", color)}>
        <div className="flex items-center gap-3">
          <div className="text-2xl">{logo}</div>
          <div>
            <h3 className="font-bold text-fg">{title}</h3>
            <p className="text-xs text-fg-muted">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3" dir="ltr">
          {enabled
            ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><CheckCircle2 className="h-4 w-4" />مفعّل</span>
            : <span className="flex items-center gap-1 text-xs font-semibold text-fg-subtle"><XCircle className="h-4 w-4" />معطّل</span>
          }
          <Toggle checked={enabled} onChange={onToggle} />
        </div>
      </div>
      {enabled && children && (
        <div className="px-5 py-4 space-y-4 animate-fade-in">{children}</div>
      )}
    </Card>
  );
}

/* ══════════════ PAGE ══════════════ */
export default function PaymentMethodsPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/payment-methods")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const v: Record<string, string> = {};
          (data.data as Setting[]).forEach((s) => { v[s.key] = s.value; });
          setValues(v);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set    = (key: string, val: string) => setValues((p) => ({ ...p, [key]: val }));
  const bool   = (key: string) => values[key] === "true";
  const toggle = (key: string) => set(key, bool(key) ? "false" : "true");

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/payment-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: values }),
    });
    const data = await res.json();
    if (data.success) toast.success("تم حفظ إعدادات طرق الدفع ✓");
    else toast.error(data.error || "حدث خطأ");
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 animate-pulse">
        <div className="space-y-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-card skeleton" />)}</div>
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 rounded-card skeleton" />)}</div>
      </div>
    );
  }

  const methods = [
    { key: "pm_bank_transfer_enabled", label: "تحويل بنكي", icon: "🏦", color: "blue" },
    { key: "pm_paypal_enabled",        label: "PayPal",     icon: "🅿️", color: "indigo" },
    { key: "pm_tabby_enabled",         label: "Tabby",      icon: "💳", color: "teal" },
    { key: "pm_tamara_enabled",        label: "Tamara",     icon: "💰", color: "cyan" },
  ];
  const enabledCount = methods.filter(m => bool(m.key)).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        className="mb-6"
        title="طرق الدفع"
        description="تحكم في بوابات الدفع وإعداداتها"
        actions={
          <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
            حفظ التغييرات
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">

        {/* ════ MAIN CONTENT: Payment Cards ════ */}
        <div className="space-y-4">

          {/* Bank Transfer */}
          <PaymentCard
            title="التحويل البنكي" subtitle="يدوي – العميل يرفع إثبات التحويل"
            logo={<Building2 className="h-7 w-7 text-blue-600" />}
            color="bg-blue-50 dark:bg-blue-900/10"
            enabled={bool("pm_bank_transfer_enabled")}
            onToggle={() => toggle("pm_bank_transfer_enabled")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="اسم صاحب الحساب" value={values["pm_bank_transfer_account_name"] || ""} onChange={e => set("pm_bank_transfer_account_name", e.target.value)} placeholder="محمد أحمد" />
              <Input label="اسم البنك" value={values["pm_bank_transfer_bank_name"] || ""} onChange={e => set("pm_bank_transfer_bank_name", e.target.value)} placeholder="بنك الراجحي" />
              <Input label="رقم الحساب" value={values["pm_bank_transfer_account_number"] || ""} onChange={e => set("pm_bank_transfer_account_number", e.target.value)} placeholder="SA000000000000000000" />
              <Input label="رقم الآيبان (IBAN)" value={values["pm_bank_transfer_iban"] || ""} onChange={e => set("pm_bank_transfer_iban", e.target.value)} placeholder="SA04 6000 0000 1234 5678" />
            </div>
          </PaymentCard>

          {/* PayPal */}
          <PaymentCard
            title="PayPal" subtitle="بطاقات ائتمانية ودفع دولي"
            logo="🅿️" color="bg-indigo-50 dark:bg-indigo-900/10"
            enabled={bool("pm_paypal_enabled")} onToggle={() => toggle("pm_paypal_enabled")}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Client ID" value={values["pm_paypal_client_id"] || ""} onChange={e => set("pm_paypal_client_id", e.target.value)} placeholder="AYSq3RD..." />
              <PasswordInput label="Client Secret" value={values["pm_paypal_client_secret"] || ""} onChange={v => set("pm_paypal_client_secret", v)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="عملة PayPal — USD / EUR / GBP"
                value={values["pm_paypal_currency"] || "USD"}
                onChange={e => set("pm_paypal_currency", e.target.value.toUpperCase())}
                placeholder="USD"
              />
              <Input
                label="سعر التحويل (عملة المتجر ÷ عملة PayPal)"
                type="number"
                value={values["pm_paypal_exchange_rate"] || "1"}
                onChange={e => set("pm_paypal_exchange_rate", e.target.value)}
                placeholder="0.27"
              />
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
              ⚠️ PayPal لا يدعم SAR أو EGP. استخدم USD مع سعر تحويل مناسب. مثال: 1 USD = 3.75 SAR → اكتب <strong>0.267</strong>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted">
              <span className="text-sm font-medium text-fg">بيئة التشغيل</span>
              <div className="flex gap-2 ms-auto">
                {["sandbox", "live"].map(mode => (
                  <button key={mode} type="button" onClick={() => set("pm_paypal_mode", mode)}
                    className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      values["pm_paypal_mode"] === mode
                        ? mode === "live" ? "bg-green-600 text-white" : "bg-amber-500 text-white"
                        : "bg-surface-sunken text-fg-muted"
                    )}>
                    {mode === "live" ? "🟢 Live" : "🟡 Sandbox"}
                  </button>
                ))}
              </div>
            </div>
          </PaymentCard>

          {/* Tabby */}
          <PaymentCard
            title="Tabby" subtitle="اشتري الآن وادفع لاحقاً – تقسيط بدون فوائد"
            logo={<div className="w-8 h-8 rounded-lg bg-[#3DBEA3] flex items-center justify-center text-white text-xs font-black">T</div>}
            color="bg-teal-50 dark:bg-teal-900/10"
            enabled={bool("pm_tabby_enabled")} onToggle={() => toggle("pm_tabby_enabled")}
          >
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300">
              💡 للحصول على مفاتيح Tabby، سجّل في{" "}
              <a href="https://tabby.ai/en-SA/merchant" target="_blank" rel="noreferrer" className="underline font-semibold">tabby.ai/merchant</a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Public Key" value={values["pm_tabby_public_key"] || ""} onChange={e => set("pm_tabby_public_key", e.target.value)} placeholder="pk_live_..." />
              <PasswordInput label="Secret Key" value={values["pm_tabby_secret_key"] || ""} onChange={v => set("pm_tabby_secret_key", v)} />
              <Input label="Merchant Code" value={values["pm_tabby_merchant_code"] || ""} onChange={e => set("pm_tabby_merchant_code", e.target.value)} placeholder="MERCHANT_CODE" />
            </div>
          </PaymentCard>

          {/* Tamara */}
          <PaymentCard
            title="تمارا — Tamara" subtitle="قسّم مشترياتك – اشتري الآن وادفع لاحقاً"
            logo={<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3AC7B3] to-[#7B5CD6] flex items-center justify-center text-white text-xs font-black">تم</div>}
            color="bg-cyan-50 dark:bg-cyan-900/10"
            enabled={bool("pm_tamara_enabled")} onToggle={() => toggle("pm_tamara_enabled")}
          >
            {/* ── بيانات الربط ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-fg">بيانات الربط</h4>
                <span className="h-px flex-1 bg-surface-sunken" />
              </div>
              <p className="text-xs text-fg-muted leading-relaxed">
                احصل على البيانات التالية من حسابك في بوابة الدفع، ثم انسخها والصقها في الحقول المخصصة. انتقل إلى{" "}
                <a href="https://partners.tamara.co" target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-400 underline font-semibold">حسابك على تمارا</a>.
              </p>
              <PasswordInput
                label="Merchant Key"
                value={values["pm_tamara_api_token"] || ""}
                onChange={v => set("pm_tamara_api_token", v)}
                placeholder="eyJ0eXAiOiJKV1QiLCJhbGci..."
              />
              <Input
                label="Public Key"
                value={values["pm_tamara_public_key"] || ""}
                onChange={e => set("pm_tamara_public_key", e.target.value)}
                placeholder="88eed269-b0f2-4d2b-b302-682fda5120bd"
              />
            </div>

            {/* ── الإعدادات ── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-fg">الإعدادات</h4>
                <span className="h-px flex-1 bg-surface-sunken" />
              </div>

              {/* Show badge on product page */}
              <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-surface-muted/60">
                <span className="text-sm font-medium text-fg">
                  إظهار شعار تمارا في صفحة المنتج
                </span>
                <Toggle checked={bool("tamara_enabled")} onChange={v => set("tamara_enabled", String(v))} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Environment */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted/60">
                  <span className="text-sm font-medium text-fg">البيئة</span>
                  <div className="flex gap-2 ms-auto">
                    {["sandbox", "live"].map(mode => (
                      <button key={mode} type="button" onClick={() => set("pm_tamara_mode", mode)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          (values["pm_tamara_mode"] || "sandbox") === mode
                            ? mode === "live" ? "bg-green-600 text-white" : "bg-amber-500 text-white"
                            : "bg-surface-sunken text-fg-muted"
                        )}>
                        {mode === "live" ? "🟢 Live" : "🟡 Sandbox"}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  label="عدد الدفعات"
                  type="number"
                  value={values["pm_tamara_installments"] || "3"}
                  onChange={e => set("pm_tamara_installments", e.target.value)}
                  placeholder="3"
                />
              </div>

              <PasswordInput
                label="Notification Key (لاستقبال إشعارات تمارا)"
                value={values["pm_tamara_notification_key"] || ""}
                onChange={v => set("pm_tamara_notification_key", v)}
              />
            </div>

            {/* Notification URL hint */}
            <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-800 dark:text-cyan-300 leading-relaxed">
              💡 في لوحة تمارا، اضبط رابط الإشعارات (Notification URL) على:{" "}
              <code className="font-mono bg-cyan-100 dark:bg-cyan-900/40 px-1.5 py-0.5 rounded break-all">
                {values["pm_tamara_merchant_url"] || "https://yourdomain.com"}/api/payments/tamara/webhook
              </code>
            </div>

            {/* ── الموافقة ── */}
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bool("pm_tamara_agreement")}
                onChange={e => set("pm_tamara_agreement", String(e.target.checked))}
                className="mt-0.5 h-4 w-4 rounded border-line-strong text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-fg-muted">
                أوافق على{" "}
                <a href="https://tamara.co/ar/terms-and-conditions" target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-400 underline">
                  اتفاقية استخدام تمارا
                </a>
              </span>
            </label>
          </PaymentCard>

          {/* Save footer */}
          <div className="flex justify-end pt-2 pb-6">
            <Button onClick={handleSave} loading={saving} size="lg">
              <Save className="h-4 w-4" />حفظ جميع الإعدادات
            </Button>
          </div>

        </div>

        {/* ════ SIDEBAR: Info & Status ════ */}
        <div className="space-y-4 xl:sticky xl:top-6">

          {/* Status overview */}
          <Card className="p-5 space-y-4">
            <h2 className="font-bold text-sm text-fg flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary-600" />حالة البوابات
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/10">
                <p className="text-3xl font-black text-green-600 dark:text-green-400">{enabledCount}</p>
                <p className="text-xs text-green-700 dark:text-green-500 mt-0.5">مفعّلة</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-surface-sunken">
                <p className="text-3xl font-black text-fg-muted">{methods.length - enabledCount}</p>
                <p className="text-xs text-fg-muted mt-0.5">معطّلة</p>
              </div>
            </div>

            <div className="space-y-2">
              {methods.map(({ key, label, icon }) => (
                <div
                  key={key}
                  onClick={() => toggle(key)}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all",
                    bool(key)
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                      : "border-line bg-surface-muted opacity-60"
                  )}
                >
                  <span className="text-lg">{icon}</span>
                  <span className={cn("text-sm font-medium flex-1", bool(key) ? "text-green-700 dark:text-green-400" : "text-fg-muted")}>
                    {label}
                  </span>
                  {bool(key)
                    ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    : <XCircle className="h-4 w-4 text-fg-subtle shrink-0" />
                  }
                </div>
              ))}
            </div>
          </Card>

          {/* Security tips */}
          <Card className="p-5 space-y-3">
            <h2 className="font-bold text-sm text-fg flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-500" />نصائح الأمان
            </h2>
            <div className="space-y-2.5 text-xs text-fg-muted">
              {[
                { icon: <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />, text: "لا تشارك مفاتيح API مع أي شخص" },
                { icon: <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />, text: "استخدم بيئة Sandbox للاختبار قبل الإطلاق" },
                { icon: <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />, text: "فعّل فقط بوابات الدفع التي تحتاجها" },
                { icon: <Zap className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />, text: "تأكد من إعداد Webhook URLs في كل بوابة" },
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2">{tip.icon}<p>{tip.text}</p></div>
              ))}
            </div>
          </Card>

          {/* Quick links */}
          <Card className="p-5 space-y-3">
            <h2 className="font-bold text-sm text-fg flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />روابط سريعة
            </h2>
            <div className="space-y-2">
              {[
                { label: "Tabby للتجار", href: "https://tabby.ai/en-SA/merchant", color: "teal" },
                { label: "Tamara للتجار", href: "https://merchants.tamara.co",    color: "cyan" },
                { label: "PayPal Developer", href: "https://developer.paypal.com", color: "indigo" },
              ].map(({ label, href, color }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all",
                    `bg-${color}-50 dark:bg-${color}-900/10 text-${color}-700 dark:text-${color}-400`,
                    `hover:bg-${color}-100 dark:hover:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-800`
                  )}
                >
                  <Globe className="h-3.5 w-3.5" />{label}
                </a>
              ))}
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
}
