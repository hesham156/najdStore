"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Switch } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  Settings, Save, CreditCard, BarChart2, ShoppingBag,
  Globe, AlertCircle, TrendingUp, Bell, Clock, Eye,
  ShoppingCart, Gift, Shield, Flame, Calculator, Code2, Truck, Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/admin/PageHeader";
import { ImageSettingField } from "@/components/admin/ImageSettingField";

interface Setting {
  key: string;
  value: string;
  label?: string;
  labelAr?: string;
  description?: string;
  type: string;
  group: string;
}

/**
 * Groups are told apart by their label and icon — never by colour.
 * In this dashboard colour means state, not identity.
 */
const GROUP_META: Record<string, {
  label: string;
  icon: React.ReactNode;
  description: string;
}> = {
  general: {
    label: "عام",
    icon: <Globe className="h-4 w-4" />,
    description: "اسم المتجر، العملة، ومعلومات التواصل الأساسية",
  },
  branding: {
    label: "الواجهة والهيرو",
    icon: <Globe className="h-4 w-4" />,
    description: "نصوص الترويسة (Hero) والإحصائيات ووصف التذييل التي تظهر في المتجر.",
  },
  payment: {
    label: "الدفع البنكي",
    icon: <CreditCard className="h-4 w-4" />,
    description: "بيانات الحساب البنكي التي تظهر للعملاء عند الدفع بالتحويل",
  },
  payments: {
    label: "Tabby / Tamara",
    icon: <CreditCard className="h-4 w-4" />,
    description: "فعّل خيارات التقسيط لعرض شارات الدفع تلقائياً على صفحات المنتجات",
  },
  orders: {
    label: "الطلبات",
    icon: <ShoppingBag className="h-4 w-4" />,
    description: "إعدادات معالجة الطلبات والتسليم التلقائي",
  },
  tracking: {
    label: "التتبع والإعلانات",
    icon: <BarChart2 className="h-4 w-4" />,
    description: "بكسلات فيسبوك، جوجل تاج ماناجر وغيرها — تُحقن تلقائياً في جميع الصفحات",
  },
  conversion: {
    label: "تحسين التحويل",
    icon: <TrendingUp className="h-4 w-4" />,
    description: "أدوات FOMO والإلحاح لتشجيع العملاء على اتخاذ قرار الشراء بسرعة",
  },
  accounting: {
    label: "المحاسبة والضريبة",
    icon: <Calculator className="h-4 w-4" />,
    description: "إعدادات ضريبة القيمة المضافة، الرقم الضريبي، وبيانات الشركة للفواتير",
  },
  custom_code: {
    label: "أكواد مخصّصة (CSS/JS)",
    icon: <Code2 className="h-4 w-4" />,
    description: "أضِف CSS وJavaScript خاصاً بك يُحقن في جميع صفحات المتجر. أدخل أكواد JS بدون وسم <script>. الأكواد تُنفَّذ كما هي — أدخل مصادر تثق بها فقط.",
  },
  shipping: {
    label: "الشحن — RedBox",
    icon: <Truck className="h-4 w-4" />,
    description: "ربط شركة الشحن RedBox: أدخل التوكن وبيانات المرسِل، ثم أنشئ الشحنات من صفحة الطلب. استخدم بيئة sandbox للتجربة قبل التفعيل الفعلي (live).",
  },
  shipping_dhl: {
    label: "الشحن — DHL",
    icon: <Truck className="h-4 w-4" />,
    description: "ربط شركة الشحن DHL Express (MyDHL API): أدخل مفتاح/سر الـ API ورقم الحساب وبيانات المرسِل. استخدم بيئة test للتجربة قبل التفعيل الفعلي (live).",
  },
  email: {
    label: "البريد الإلكتروني (SMTP)",
    icon: <Mail className="h-4 w-4" />,
    description: "إعداد إرسال رسائل البريد (تأكيد الطلب، استعادة كلمة المرور) عبر SMTP. يعمل مع أي مزوّد: Gmail، بريد النطاق، SendGrid… لجيميل استخدم App Password.",
  },
  shipping_rates: {
    label: "رسوم الشحن",
    icon: <Truck className="h-4 w-4" />,
    description: "حدّد رسوم شحن ثابتة تُضاف في صفحة الدفع، مع خيار شحن مجاني عند تجاوز مبلغ معيّن. اترك الرسوم 0 لجعل الشحن مجانياً دائماً.",
  },
};

// Conversion features definition — each card groups related keys.
// No per-feature colour: an enabled card is brand-tinted, everything else neutral.
const CONVERSION_FEATURES = [
  {
    id: "live_activity",
    icon: <Bell className="h-4 w-4" />,
    label: "إشعارات النشاط المباشر",
    desc: "يعرض إشعارات شراء تلقائية في الزاوية السفلية لإثبات الشعبية (Social Proof)",
    enableKey: "live_activity_enabled",
    keys: ["live_activity_enabled", "live_activity_interval", "live_activity_names", "live_activity_cities"],
  },
  {
    id: "flash_sale",
    icon: <Clock className="h-4 w-4" />,
    label: "عداد العرض المحدود",
    desc: "عداد تنازلي على صفحة المنتج يخلق إحساساً بالإلحاح ويقلل التردد",
    enableKey: "flash_sale_enabled",
    keys: ["flash_sale_enabled", "flash_sale_ends_at", "flash_sale_label"],
  },
  {
    id: "scarcity",
    icon: <Flame className="h-4 w-4" />,
    label: "مؤشر الندرة",
    desc: "يعرض شريط المخزون المتبقي على صفحة المنتج لتحفيز الشراء السريع",
    enableKey: "scarcity_enabled",
    keys: ["scarcity_enabled", "scarcity_max"],
  },
  {
    id: "live_viewers",
    icon: <Eye className="h-4 w-4" />,
    label: "عداد المشاهدين الحاليين",
    desc: "يعرض عدد الأشخاص المتواجدين على صفحة المنتج — يرفع الثقة ويخلق التنافس",
    enableKey: "live_viewers_enabled",
    keys: ["live_viewers_enabled", "live_viewers_min", "live_viewers_max"],
  },
  {
    id: "sticky_cta",
    icon: <ShoppingCart className="h-4 w-4" />,
    label: "زر الشراء الثابت",
    desc: "يظهر زر 'أضف للسلة' ثابتاً أسفل الشاشة عند التمرير — يقلل الاحتكاك",
    enableKey: "sticky_cta_enabled",
    keys: ["sticky_cta_enabled"],
  },
  {
    id: "cart_progress",
    icon: <Gift className="h-4 w-4" />,
    label: "شريط تقدم السلة",
    desc: "يعرض شريطاً في السلة يحفز العميل على إضافة منتجات للحصول على مكافأة",
    enableKey: "cart_progress_enabled",
    keys: ["cart_progress_enabled", "cart_progress_target", "cart_progress_reward", "cart_progress_coupon"],
  },
  {
    id: "guarantee",
    icon: <Shield className="h-4 w-4" />,
    label: "رسالة الضمان",
    desc: "نص الضمان الذي يظهر أسفل زر الشراء — يزيد الثقة ويقلل المخاوف",
    enableKey: "guarantee_enabled",
    keys: ["guarantee_enabled", "guarantee_text"],
  },
];

/** Thin wrapper so this file's call sites keep their shape. */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <Switch size="md" checked={checked} onChange={onChange} aria-label={label} />;
}

function SettingRow({
  setting,
  value,
  isChanged,
  onChange,
}: {
  setting: Setting;
  value: string;
  isChanged: boolean;
  onChange: (v: string) => void;
}) {
  const label = setting.labelAr || setting.label || setting.key;
  return (
    <div className={cn("rounded-control px-4 py-3 transition-colors", isChanged && "bg-warning/[0.07] ring-1 ring-warning/25")}>
      {setting.type === "boolean" ? (
        <div className="flex items-center justify-between gap-4">
          <p className="font-medium text-sm text-fg">{label}</p>
          <Toggle checked={value === "true"} onChange={(v) => onChange(String(v))} />
        </div>
      ) : (
        <Input
          label={label}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          hint={setting.description}
        />
      )}
    </div>
  );
}

function ConversionPanel({
  settings,
  values,
  saved,
  set,
}: {
  settings: Setting[];
  values: Record<string, string>;
  saved: Record<string, string>;
  set: (k: string, v: string) => void;
}) {
  const byKey = Object.fromEntries(settings.map((s) => [s.key, s]));

  return (
    <div className="space-y-4">
      {CONVERSION_FEATURES.map((feature) => {
        const isEnabled = values[feature.enableKey] === "true";
        const hasChanges = feature.keys.some((k) => values[k] !== saved[k]);
        const subKeys = feature.keys.filter((k) => k !== feature.enableKey);

        return (
          <div
            key={feature.id}
            className={cn(
              "overflow-hidden rounded-card border transition-colors duration-200",
              // Only two things earn colour here: unsaved edits, and being switched on.
              hasChanges ? "border-warning/40" : isEnabled ? "border-brand/30" : "border-line"
            )}
          >
            {/* Feature header */}
            <div className={cn("flex items-center justify-between gap-4 px-5 py-4", isEnabled ? "bg-brand/[0.06]" : "bg-surface-muted")}>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-control transition-colors",
                    isEnabled ? "bg-brand/10 text-brand" : "bg-surface-sunken text-fg-subtle"
                  )}
                >
                  {feature.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-fg">{feature.label}</p>
                    {hasChanges && <Badge variant="warning" size="sm">تغييرات</Badge>}
                  </div>
                  <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
              {/* Main toggle */}
              {byKey[feature.enableKey] && (
                <Toggle
                  checked={isEnabled}
                  onChange={(v) => set(feature.enableKey, String(v))}
                />
              )}
            </div>

            {/* Sub-settings — only show when feature is enabled AND has sub-keys */}
            {isEnabled && subKeys.length > 0 && (
              <div className="px-4 py-3 space-y-2 bg-surface border-t border-line">
                {subKeys.map((key) => {
                  const s = byKey[key];
                  if (!s) return null;
                  return (
                    <SettingRow
                      key={key}
                      setting={s}
                      value={values[key] ?? ""}
                      isChanged={values[key] !== saved[key]}
                      onChange={(v) => set(key, v)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [activeGroup, setActiveGroup] = useState<string>("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSettings(data.data);
          const vals: Record<string, string> = {};
          data.data.forEach((s: Setting) => { vals[s.key] = s.value; });
          setValues(vals);
          setSaved({ ...vals });
          const firstGroup = data.data[0]?.group ?? "";
          setActiveGroup(firstGroup);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const isDirty = JSON.stringify(values) !== JSON.stringify(saved);

  const set = useCallback((key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: values }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("تم حفظ الإعدادات بنجاح");
      setSaved({ ...values });
    } else {
      toast.error(data.error || "حدث خطأ أثناء الحفظ");
    }
    setSaving(false);
  };

  const handleDiscard = () => {
    setValues({ ...saved });
    toast("تم إلغاء التغييرات", { icon: "↩️" });
  };

  // Groups that have their own dedicated admin pages are hidden from the
  // generic settings tabs to avoid duplication:
  //  - payment/payments/payment_methods → "طرق الدفع"
  //  - shipping_rates                    → "الشحن" (رسوم الشحن)
  //  - homepage                          → "تصميم الصفحة الرئيسية"
  const EXCLUDED_GROUPS = ["payment_methods", "payment", "payments", "shipping_rates", "shipping", "shipping_dhl", "homepage"];
  // Keys owned by dedicated pages (SEO / payment / shipping carriers) must never
  // leak into the generic tabs even if they were saved with a stray group.
  const DEDICATED_PREFIX = /^(seo_|pm_|redbox_|dhl_)/;
  const visibleSettings = settings.filter((s) => !EXCLUDED_GROUPS.includes(s.group) && !DEDICATED_PREFIX.test(s.key));
  // A tab only appears if it actually has visible settings.
  const groups = Array.from(new Set(visibleSettings.map((s) => s.group)));
  // Never land on a hidden group — fall back to the first visible one.
  const effectiveGroup = groups.includes(activeGroup) ? activeGroup : (groups[0] ?? "");
  const activeSettings = visibleSettings.filter((s) => s.group === effectiveGroup);
  const meta = GROUP_META[effectiveGroup];

  if (loading) {
    return (
      <div className="animate-pulse flex gap-6 max-w-5xl">
        <div className="w-52 shrink-0 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded-control skeleton" />
          ))}
        </div>
        <div className="flex-1 space-y-3">
          <div className="h-16 rounded-card skeleton" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-card skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        className="mb-6"
        title="الإعدادات العامة"
        description="إعدادات المتجر والمظهر والتكاملات"
        actions={
          <>
          {isDirty && (
            <>
              <span className="hidden items-center gap-1.5 text-sm font-medium text-warning sm:flex">
                <AlertCircle className="h-4 w-4" />
                تغييرات غير محفوظة
              </span>
              <Button variant="secondary" size="sm" onClick={handleDiscard}>
                إلغاء
              </Button>
            </>
          )}
            <Button onClick={handleSave} loading={saving} disabled={!isDirty} icon={<Save className="h-4 w-4" />}>
              حفظ التغييرات
            </Button>
          </>
        }
      />

      <div className="flex gap-6 items-start">
        {/* Sidebar nav */}
        <nav className="w-52 shrink-0 space-y-1 sticky top-6">
          {groups.map((group) => {
            const m = GROUP_META[group];
            const isActive = group === effectiveGroup;
            return (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-start ${
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm"
                    : "text-fg-muted hover:bg-surface-hover"
                }`}
              >
                <span className={isActive ? "text-primary-600 dark:text-primary-400" : "text-fg-subtle"}>
                  {m?.icon ?? <Settings className="h-4 w-4" />}
                </span>
                {m?.label ?? group}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Group header banner */}
          <div className="flex items-center gap-3 rounded-card border border-line bg-surface-muted px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand/10 text-brand">
              {meta?.icon ?? <Settings className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-fg">{meta?.label ?? activeGroup}</p>
              <p className="mt-0.5 text-xs text-fg-muted">{meta?.description}</p>
            </div>
          </div>

          {/* Conversion group — custom card-based UI */}
          {activeGroup === "conversion" ? (
            <ConversionPanel
              settings={activeSettings}
              values={values}
              saved={saved}
              set={set}
            />
          ) : (
            /* Generic settings list for all other groups */
            <Card className="p-0 overflow-hidden divide-y divide-line/60">
              {activeSettings.length === 0 ? (
                <div className="px-5 py-12 text-center text-fg-subtle text-sm">
                  لا توجد إعدادات في هذا القسم
                </div>
              ) : (
                activeSettings.map((setting) => {
                  const label = setting.labelAr || setting.label || setting.key;
                  const isChanged = values[setting.key] !== saved[setting.key];
                  return (
                    <div key={setting.key} className={cn("px-5 py-4 transition-colors", isChanged && "bg-warning/[0.05]")}>
                      {setting.type === "boolean" ? (
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-sm text-fg">{label}</p>
                            {setting.description && (
                              <p className="text-xs text-fg-muted mt-0.5">{setting.description}</p>
                            )}
                          </div>
                          <Toggle
                            checked={values[setting.key] === "true"}
                            onChange={(v) => set(setting.key, String(v))}
                          />
                        </div>
                      ) : setting.type === "image" ? (
                        <ImageSettingField
                          label={label}
                          value={values[setting.key] || ""}
                          onChange={(url) => set(setting.key, url)}
                          hint={setting.description}
                        />
                      ) : setting.type === "code" ? (
                        <div>
                          <label className="block font-medium text-sm text-fg mb-1.5">{label}</label>
                          <textarea
                            dir="ltr"
                            spellCheck={false}
                            rows={10}
                            value={values[setting.key] || ""}
                            onChange={(e) => set(setting.key, e.target.value)}
                            placeholder={setting.key === "custom_css" ? "/* مثال */\n.header { background: #7c3aed; }" : "// مثال\nconsole.log('مرحباً');"}
                            className="w-full resize-y rounded-card border border-line bg-primary-950 p-3 font-mono text-xs leading-relaxed text-primary-100 placeholder:text-primary-400/50 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                          />
                        </div>
                      ) : (
                        <Input
                          label={label}
                          value={values[setting.key] || ""}
                          onChange={(e) => set(setting.key, e.target.value)}
                          hint={setting.description}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </Card>
          )}

          {/* Sticky bottom save bar */}
          {isDirty && (
            <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-card border border-warning/30 bg-surface px-5 py-3 shadow-overlay">
              <div className="flex items-center gap-2 text-sm text-fg">
                <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                <span>لديك تغييرات غير محفوظة</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDiscard}
                  className="px-3 py-1 text-sm text-fg-muted transition-colors hover:text-fg"
                >
                  إلغاء
                </button>
                <Button size="sm" onClick={handleSave} loading={saving}>
                  <Save className="h-3.5 w-3.5" />
                  حفظ الآن
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
