"use client";

import { useState, useEffect } from "react";
import { Save, Globe, Search, Share2, Bot, Sparkles, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Switch } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/admin/PageHeader";

// These map to Setting.key in the DB
const SEO_KEYS = [
  "seo_site_name",
  "seo_site_url",
  "seo_meta_title",
  "seo_meta_description",
  "seo_meta_keywords",
  "seo_og_title",
  "seo_og_description",
  "seo_og_image",
  "seo_twitter_handle",
  "seo_google_verification",
  "seo_bing_verification",
  "seo_robots_index",
  "seo_ai_policy",
  "seo_ai_summary",
  "seo_business_legal_name",
  "seo_business_phone",
  "seo_business_email",
  "seo_business_street",
  "seo_business_city",
  "seo_business_region",
  "seo_business_postal",
  "seo_business_country",
  "seo_business_founded",
  "seo_social_profiles",
  "seo_return_days",
];

type FieldConf = {
  labelAr: string;
  type: string;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
};

const SEO_DEFAULTS: Record<string, FieldConf> = {
  seo_site_name:           { labelAr: "اسم الموقع", type: "text", placeholder: "متجر الاشتراكات الرقمية" },
  seo_site_url:            { labelAr: "رابط الموقع الرئيسي", type: "text", placeholder: "https://yourstore.com" },
  seo_meta_title:          { labelAr: "عنوان الصفحة الرئيسية", type: "text", placeholder: "متجر الاشتراكات الرقمية - اشتر بأفضل الأسعار" },
  seo_meta_description:    { labelAr: "وصف الموقع (Meta Description)", type: "textarea", placeholder: "منصتك الموثوقة للاشتراكات الرقمية..." },
  seo_meta_keywords:       { labelAr: "الكلمات المفتاحية", type: "textarea", placeholder: "اشتراكات رقمية، نتفليكس، سبوتيفاي...", hint: "افصل بين الكلمات بفواصل" },
  seo_og_title:            { labelAr: "عنوان Open Graph (OG)", type: "text" },
  seo_og_description:      { labelAr: "وصف Open Graph (OG)", type: "textarea" },
  seo_og_image:            { labelAr: "صورة Open Graph", type: "text", placeholder: "https://yourstore.com/og-image.png", hint: "الحجم المثالي 1200×630 بكسل" },
  seo_twitter_handle:      { labelAr: "حساب تويتر/X", type: "text", placeholder: "@yourstore" },
  seo_google_verification: { labelAr: "كود تحقق Google Search Console", type: "text", placeholder: "abcdef1234567890" },
  seo_bing_verification:   { labelAr: "كود تحقق Bing Webmaster", type: "text" },
  seo_robots_index:        { labelAr: "السماح لمحركات البحث بالفهرسة", type: "boolean" },

  seo_ai_policy: {
    labelAr: "وصول مساعدات الذكاء الاصطناعي",
    type: "select",
    options: [
      { value: "answers", label: "يستشهد بمتجرك دون تدريب (موصى به)" },
      { value: "open", label: "مسموح بالكامل — بما في ذلك التدريب" },
      { value: "blocked", label: "محظور تماماً" },
    ],
    hint: "«يستشهد دون تدريب» يسمح لـChatGPT وPerplexity وClaude بقراءة متجرك وترشيحه مع رابط، ويمنع استخدام الكتالوج في تدريب النماذج.",
  },
  seo_ai_summary: {
    labelAr: "تعريف المتجر للذكاء الاصطناعي",
    type: "textarea",
    placeholder: "نبيع مستلزمات التغليف والطباعة الفاخرة للشركات في السعودية، مع تنفيذ خلال 3 أيام وتوصيل لكل المدن.",
    hint: "جملتان تصفان ما تبيعه ولمن وما يميّزك. تظهر في /llms.txt وهي أول ما يقرأه المساعد قبل أن يرشّحك.",
  },

  seo_business_legal_name: { labelAr: "الاسم النظامي للمنشأة", type: "text", placeholder: "شركة نجد برنت للتجارة" },
  seo_business_phone:      { labelAr: "هاتف التواصل", type: "text", placeholder: "+966500000000" },
  seo_business_email:      { labelAr: "بريد التواصل", type: "text", placeholder: "info@yourstore.com" },
  seo_business_street:     { labelAr: "الشارع", type: "text", placeholder: "طريق الملك فهد" },
  seo_business_city:       { labelAr: "المدينة", type: "text", placeholder: "الرياض" },
  seo_business_region:     { labelAr: "المنطقة", type: "text", placeholder: "منطقة الرياض" },
  seo_business_postal:     { labelAr: "الرمز البريدي", type: "text", placeholder: "12345" },
  seo_business_country:    { labelAr: "رمز الدولة", type: "text", placeholder: "SA", hint: "رمز من حرفين — SA للسعودية، AE للإمارات" },
  seo_business_founded:    { labelAr: "سنة التأسيس", type: "text", placeholder: "2019" },
  seo_social_profiles: {
    labelAr: "روابط حساباتك",
    type: "textarea",
    placeholder: "https://twitter.com/yourstore\nhttps://instagram.com/yourstore",
    hint: "رابط في كل سطر. تربط متجرك بحساباتك رسمياً فيثق بها محرك البحث والمساعد.",
  },
  seo_return_days:         { labelAr: "مدة الإرجاع (أيام)", type: "text", placeholder: "14", hint: "تظهر في بيانات المنتج المهيكلة وفي /llms.txt" },
};

interface Section {
  title: string;
  icon: React.ReactNode;
  color: string;
  keys: string[];
}

const SECTIONS: Section[] = [
  {
    title: "المعلومات الأساسية",
    icon: <Globe className="h-4 w-4" />,
    color: "bg-info/10",
    keys: ["seo_site_name", "seo_site_url"],
  },
  {
    title: "Meta Tags – محركات البحث",
    icon: <Search className="h-4 w-4" />,
    color: "bg-brand/10",
    keys: ["seo_meta_title", "seo_meta_description", "seo_meta_keywords", "seo_robots_index"],
  },
  {
    title: "Open Graph & Social Sharing",
    icon: <Share2 className="h-4 w-4" />,
    color: "bg-brand/10",
    keys: ["seo_og_title", "seo_og_description", "seo_og_image", "seo_twitter_handle"],
  },
  {
    title: "الذكاء الاصطناعي — أن يراك ويرشّحك",
    icon: <Sparkles className="h-4 w-4" />,
    color: "bg-brand/10",
    keys: ["seo_ai_policy", "seo_ai_summary"],
  },
  {
    title: "هوية المنشأة",
    icon: <Building2 className="h-4 w-4" />,
    color: "bg-info/10",
    keys: [
      "seo_business_legal_name", "seo_business_founded",
      "seo_business_phone", "seo_business_email",
      "seo_business_street", "seo_business_city",
      "seo_business_region", "seo_business_postal",
      "seo_business_country", "seo_return_days",
      "seo_social_profiles",
    ],
  },
  {
    title: "التحقق من ملكية الموقع",
    icon: <Bot className="h-4 w-4" />,
    color: "bg-success/10",
    keys: ["seo_google_verification", "seo_bing_verification"],
  },
];

/** Mirrors the fallbacks in `lib/seo.ts` — keep the two in step. */
const INITIAL_VALUES: Record<string, string> = {
  seo_robots_index: "true",
  seo_ai_policy: "answers",
  seo_business_country: "SA",
};

export default function AdminSeoPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch from the general settings API, filtering seo_ keys
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const v: Record<string, string> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (data.data as any[]).forEach((s) => {
            if (SEO_KEYS.includes(s.key)) v[s.key] = s.value;
          });
          // Fill defaults for missing keys. These MUST match the server-side
          // fallbacks in lib/seo.ts, or the toggle shows one thing while the
          // live site does another.
          SEO_KEYS.forEach((k) => {
            if (!(k in v)) v[k] = INITIAL_VALUES[k] ?? "";
          });
          setValues(v);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key: string, val: string) => setValues((p) => ({ ...p, [key]: val }));
  const bool = (key: string) => values[key] === "true";

  const handleSave = async () => {
    setSaving(true);
    // Upsert via settings API
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: values }),
    });
    const data = await res.json();
    if (data.success) toast.success("تم حفظ إعدادات SEO ✓");
    else toast.error(data.error || "حدث خطأ");
    setSaving(false);
  };

  // Character counters for important fields
  const titleLen = (values["seo_meta_title"] || "").length;
  const descLen  = (values["seo_meta_description"] || "").length;

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-40 rounded-card skeleton" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <PageHeader
        title="إعدادات SEO"
        description="محركات البحث، ومشاركة المحتوى، وظهور متجرك في مساعدات الذكاء الاصطناعي"
        actions={
          <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
            حفظ التغييرات
          </Button>
        }
      />

      {/* The three files crawlers and assistants actually read. Linking them
          lets the merchant confirm a setting took effect instead of guessing. */}
      <Card className="p-5 space-y-3">
        <div>
          <p className="text-sm font-bold text-fg">الملفات التي يقرأها الزوّار الآليون</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            افتحها بعد الحفظ للتأكد أن إعداداتك ظهرت فعلاً.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/robots.txt", label: "robots.txt", note: "من يُسمح له بالزحف" },
            { href: "/sitemap.xml", label: "sitemap.xml", note: "كل صفحاتك" },
            { href: "/llms.txt", label: "llms.txt", note: "متجرك بصيغة يفهمها المساعد" },
          ].map((f) => (
            <a
              key={f.href}
              href={f.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-control border border-line bg-surface-muted px-3 py-2 text-xs font-medium text-fg-muted transition-colors hover:border-brand/30 hover:bg-brand/[0.06] hover:text-brand"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono">{f.label}</span>
              <span className="text-fg-subtle">— {f.note}</span>
            </a>
          ))}
        </div>
      </Card>

      {/* Search Preview */}
      <Card className="p-5">
        <p className="text-xs font-bold text-fg-muted uppercase tracking-wide mb-3">معاينة نتيجة Google</p>
        <div className="border border-line rounded-xl p-4 space-y-1 bg-surface">
          <p className="text-xs text-success truncate">
            {values["seo_site_url"] || "https://yourstore.com"} ›
          </p>
          <p className={cn(
            "text-base font-medium truncate",
            titleLen > 60 ? "text-warning" : "text-info"
          )}>
            {values["seo_meta_title"] || "عنوان الصفحة يظهر هنا"}
          </p>
          <p className={cn(
            "text-sm leading-relaxed line-clamp-2",
            descLen > 160 ? "text-warning" : "text-fg-muted"
          )}>
            {values["seo_meta_description"] || "وصف الصفحة يظهر هنا في نتائج Google..."}
          </p>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-fg-subtle">
          <span className={titleLen > 60 ? "text-warning font-bold" : ""}>
            العنوان: {titleLen}/60 حرف {titleLen > 60 ? "⚠️ طويل" : titleLen > 50 ? "✅" : ""}
          </span>
          <span className={descLen > 160 ? "text-warning font-bold" : ""}>
            الوصف: {descLen}/160 حرف {descLen > 160 ? "⚠️ طويل" : descLen > 120 ? "✅" : ""}
          </span>
        </div>
      </Card>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <Card key={section.title} className="overflow-hidden p-0">
          <div className={cn("flex items-center gap-2 px-6 py-4 border-b font-bold text-fg", section.color)}>
            {section.icon}
            {section.title}
          </div>
          <div className="px-6 py-5 space-y-4">
            {section.keys.map((key) => {
              const conf = SEO_DEFAULTS[key];
              if (!conf) return null;

              if (conf.type === "boolean") {
                return (
                  <label key={key} className="flex items-center justify-between p-3 rounded-xl bg-surface-muted cursor-pointer">
                    <div>
                      <p className="font-medium text-sm text-fg">{conf.labelAr}</p>
                      <p className="text-xs text-fg-muted mt-0.5">إيقاف الفهرسة يمنع ظهور موقعك في محركات البحث</p>
                    </div>
                    <Switch
                      size="md"
                      checked={bool(key)}
                      onChange={(v) => set(key, String(v))}
                      aria-label={conf.labelAr}
                    />
                  </label>
                );
              }

              if (conf.type === "select" && conf.options) {
                return (
                  <div key={key} className="space-y-1">
                    <label className="block text-sm font-medium text-fg">{conf.labelAr}</label>
                    <select
                      value={values[key] || conf.options[0].value}
                      onChange={(e) => set(key, e.target.value)}
                      className={cn(
                        "w-full rounded-control border border-line bg-surface px-4 py-2.5 text-sm text-fg",
                        "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500",
                        "transition-colors"
                      )}
                    >
                      {conf.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {conf.hint && <p className="text-xs leading-relaxed text-fg-subtle">{conf.hint}</p>}
                  </div>
                );
              }

              if (conf.type === "textarea") {
                return (
                  <div key={key} className="space-y-1">
                    <label className="block text-sm font-medium text-fg">
                      {conf.labelAr}
                    </label>
                    <textarea
                      value={values[key] || ""}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder={conf.placeholder}
                      rows={3}
                      className={cn(
                        "w-full rounded-control border border-line bg-surface px-4 py-2.5 text-sm text-fg",
                        "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
                        "transition-colors resize-none"
                      )}
                    />
                    {conf.hint && <p className="text-xs text-fg-subtle">{conf.hint}</p>}
                  </div>
                );
              }

              return (
                <Input
                  key={key}
                  label={conf.labelAr}
                  value={values[key] || ""}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={conf.placeholder}
                  hint={conf.hint}
                />
              );
            })}
          </div>
        </Card>
      ))}

      {/* SEO tips */}
      <Card className="p-5 bg-warning/10 border-warning/25">
        <p className="font-bold text-warning mb-3 text-sm">💡 نصائح SEO مهمة</p>
        <ul className="space-y-1.5 text-xs text-warning">
          <li>• عنوان الصفحة بين 50-60 حرف للحصول على أفضل ظهور في Google</li>
          <li>• وصف الصفحة بين 120-160 حرف – يجذب المستخدمين للنقر</li>
          <li>• صورة OG بحجم 1200×630 بكسل للمشاركة المثلى على السوشيال ميديا</li>
          <li>• الكلمات المفتاحية لا تؤثر مباشرة على Google لكنها مفيدة لمحركات أخرى</li>
          <li>• بعد الحفظ، أرسل sitemap.xml إلى Google Search Console</li>
        </ul>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} loading={saving} size="lg">
          <Save className="h-4 w-4" />
          حفظ جميع إعدادات SEO
        </Button>
      </div>
    </div>
  );
}
