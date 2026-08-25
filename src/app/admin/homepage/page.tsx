"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, Save, GripVertical, Eye, EyeOff, LayoutTemplate } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Switch } from "@/components/ui/Input";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/ui/States";
import toast from "react-hot-toast";
import type { HomeSection, HomeSectionType, BannerSlide } from "@/lib/home-layout";
import { NAJD_LABELS, NAJD_TYPES, isNajdType, defaultNajdConfig } from "@/lib/najd-blocks";
import { NajdBlockEditor } from "@/components/admin/NajdBlockEditor";

const LABELS: Record<HomeSectionType, string> = {
  landing: "تصميم نجد (جاهز)",
  hero: "الترويسة (Hero)",
  categories: "شبكة الفئات",
  featured: "المنتجات المميزة",
  recent: "أحدث المنتجات",
  banner: "بانر صورة",
  product_slider: "سلايدر منتجات متحرك",
  banner_slider: "سلايدر بنرات متحرك",
  marquee: "شريط إعلاني متحرك",
  richtext: "نص/عنوان منسّق",
  custom_html: "HTML مخصّص",
  ...NAJD_LABELS,
};

const ADDABLE: HomeSectionType[] = ["hero", "categories", "featured", "recent", "product_slider", "banner", "banner_slider", "marquee", "richtext", "custom_html", "landing", ...NAJD_TYPES];
const uid = () => Math.random().toString(36).slice(2, 9);

export default function HomepageBuilderPage() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addType, setAddType] = useState<HomeSectionType>("hero");
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/homepage");
      const data = await res.json();
      if (data.success) setSections(data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const mutate = (fn: (s: HomeSection[]) => HomeSection[]) => { setSections((s) => fn(s)); setDirty(true); };
  const patch = (id: string, p: Partial<HomeSection>) => mutate((s) => s.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const remove = (id: string) => mutate((s) => s.filter((x) => x.id !== id));
  const move = (i: number, dir: -1 | 1) => mutate((s) => {
    const j = i + dir;
    if (j < 0 || j >= s.length) return s;
    const copy = [...s];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });
  const add = () => mutate((s) => [
    ...s,
    { id: uid(), type: addType, enabled: true, ...(isNajdType(addType) ? { najd: defaultNajdConfig(addType) } : {}) },
  ]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections }),
      });
      const data = await res.json();
      if (data.success) { toast.success("تم حفظ تصميم الصفحة الرئيسية ✓"); setSections(data.data); setDirty(false); }
      else toast.error(data.error || "تعذّر الحفظ");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="تصميم الصفحة الرئيسية"
        description="تحكّم في أقسام صفحتك الرئيسية: فعّل، رتّب، عدّل المحتوى، أو أضِف قسم HTML مخصّصاً لتصميمك الخاص."
        actions={
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noreferrer"><Button variant="secondary" size="sm"><Eye className="h-4 w-4" /> معاينة</Button></a>
            <Button size="sm" onClick={save} loading={saving} disabled={!dirty}><Save className="h-4 w-4" /> حفظ</Button>
          </div>
        }
      />

      {/* Add section */}
      <Card>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <Select
              label="أضِف قسماً جديداً"
              value={addType}
              onChange={(e) => setAddType(e.target.value as HomeSectionType)}
              options={ADDABLE.map((t) => ({ value: t, label: LABELS[t] }))}
            />
          </div>
          <Button onClick={add}><Plus className="h-4 w-4" /> إضافة</Button>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : sections.length === 0 ? (
        <Card className="text-center py-10 text-fg-muted text-sm">
          <LayoutTemplate className="h-8 w-8 mx-auto mb-2 text-fg-subtle" />
          لا توجد أقسام. أضِف قسماً من الأعلى.
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((s, i) => (
            <Card key={s.id} padding="none" className={s.enabled ? "" : "opacity-60"}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-line/60">
                <GripVertical className="h-4 w-4 text-fg-subtle shrink-0" />
                <span className="font-semibold text-sm flex-1">{LABELS[s.type]}</span>
                <button onClick={() => patch(s.id, { enabled: !s.enabled })} className="p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-sunken" title={s.enabled ? "إخفاء" : "إظهار"}>
                  {s.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg text-fg-subtle hover:text-fg disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="p-1.5 rounded-lg text-fg-subtle hover:text-fg disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></button>
              </div>

              <div className="p-4">
                <SectionEditor section={s} onChange={(p) => patch(s.id, p)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {dirty && (
        <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-card border border-warning/30 bg-surface px-5 py-3 shadow-overlay">
          <span className="text-sm text-fg">لديك تغييرات غير محفوظة</span>
          <Button size="sm" onClick={save} loading={saving}><Save className="h-3.5 w-3.5" /> حفظ الآن</Button>
        </div>
      )}
    </div>
  );
}

function SectionEditor({ section: s, onChange }: { section: HomeSection; onChange: (p: Partial<HomeSection>) => void }) {
  switch (s.type) {
    case "landing":
      return <p className="text-[13px] text-fg-muted">تصميم نجد الجاهز (الترويسة، الخدمات، سلايدرات المنتجات، المعرض…). لا يحتاج إعداداً.</p>;

    case "hero":
      return (
        <p className="text-[13px] text-fg-muted leading-relaxed">
          يُدار محتوى الترويسة (العنوان، النص، الإحصائيات) من مكان واحد:{" "}
          <a href="/admin/settings" className="font-semibold text-primary-600 hover:underline">الإعدادات ← الواجهة والهيرو</a>.
          هنا تتحكّم فقط في <span className="font-medium text-fg">إظهاره وترتيبه</span> ضمن الصفحة.
        </p>
      );

    case "categories":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="العنوان" value={s.title || ""} onChange={(e) => onChange({ title: e.target.value })} placeholder="الفئات" />
          <Input label="النص الفرعي" value={s.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })} />
        </div>
      );

    case "featured":
    case "recent":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="العنوان" value={s.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
          <Input label="النص الفرعي" value={s.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })} />
          <Input label="عدد المنتجات" type="number" min={1} value={String(s.limit ?? 8)} onChange={(e) => onChange({ limit: parseInt(e.target.value) || 8 })} />
        </div>
      );

    case "banner":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input label="رابط الصورة" value={s.image || ""} onChange={(e) => onChange({ image: e.target.value })} placeholder="https://…" />
          <Input label="الرابط عند الضغط" value={s.link || ""} onChange={(e) => onChange({ link: e.target.value })} placeholder="/products" />
          <Input label="النص البديل" value={s.alt || ""} onChange={(e) => onChange({ alt: e.target.value })} />
        </div>
      );

    case "product_slider":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select
            label="مصدر المنتجات"
            value={s.source || "featured"}
            onChange={(e) => onChange({ source: e.target.value as "featured" | "recent" })}
            options={[{ value: "featured", label: "المنتجات المميزة" }, { value: "recent", label: "أحدث المنتجات" }]}
          />
          <Input label="العنوان" value={s.title || ""} onChange={(e) => onChange({ title: e.target.value })} placeholder="منتجات مختارة" />
          <Input label="عدد المنتجات" type="number" min={2} value={String(s.limit ?? 12)} onChange={(e) => onChange({ limit: parseInt(e.target.value) || 12 })} />
          <Input label="مدة الدورة (ثانية)" type="number" min={10} value={String(s.speed ?? 40)} onChange={(e) => onChange({ speed: parseInt(e.target.value) || 40 })} />
          <p className="sm:col-span-2 lg:col-span-4 text-xs text-fg-muted">كلما قلّت المدة زادت سرعة التمرير. يتوقف الشريط عند مرور المؤشر فوقه.</p>
        </div>
      );

    case "marquee":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input wrapperClassName="sm:col-span-2" label="النص المتحرك" value={s.text || ""} onChange={(e) => onChange({ text: e.target.value })} placeholder="🔥 شحن مجاني للطلبات فوق 200 ريال" />
          <Input label="مدة الدورة (ثانية)" type="number" min={8} value={String(s.speed ?? 20)} onChange={(e) => onChange({ speed: parseInt(e.target.value) || 20 })} />
        </div>
      );

    case "banner_slider":
      return <BannerSliderEditor slides={s.slides || []} autoplay={s.autoplay !== false} interval={s.speed ?? 5} onChange={onChange} />;

    case "richtext":
      return (
        <div className="space-y-3">
          <Input label="العنوان" value={s.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
          <Textarea label="المحتوى (HTML)" rows={5} value={s.html || ""} onChange={(e) => onChange({ html: e.target.value })} />
        </div>
      );

    case "custom_html":
      return (
        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">HTML مخصّص</label>
          <textarea
            dir="ltr" spellCheck={false} rows={10}
            value={s.html || ""}
            onChange={(e) => onChange({ html: e.target.value })}
            placeholder="<section>…تصميمك الخاص…</section>"
            className="w-full resize-y rounded-card border border-line bg-primary-950 p-3 font-mono text-xs leading-relaxed text-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
          <p className="text-xs text-fg-muted mt-1">نصيحة: نسّق تصميمك عبر «الإعدادات ← أكواد مخصّصة (CSS)».</p>
        </div>
      );

    default:
      if (isNajdType(s.type)) {
        return <NajdBlockEditor type={s.type} value={s.najd} onChange={(najd) => onChange({ najd })} />;
      }
      return null;
  }
}

function BannerSliderEditor({
  slides,
  autoplay,
  interval,
  onChange,
}: {
  slides: BannerSlide[];
  autoplay: boolean;
  interval: number;
  onChange: (p: Partial<HomeSection>) => void;
}) {
  const setSlide = (i: number, p: Partial<BannerSlide>) =>
    onChange({ slides: slides.map((s, idx) => (idx === i ? { ...s, ...p } : s)) });
  const addSlide = () => onChange({ slides: [...slides, { image: "", link: "", alt: "" }] });
  const removeSlide = (i: number) => onChange({ slides: slides.filter((_, idx) => idx !== i) });
  const moveSlide = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const copy = [...slides];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange({ slides: copy });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Switch label="تشغيل تلقائي" checked={autoplay} onChange={(v) => onChange({ autoplay: v })} />
        <Input
          wrapperClassName="w-40"
          label="مدة كل شريحة (ثانية)"
          type="number"
          min={2}
          value={String(interval)}
          onChange={(e) => onChange({ speed: parseInt(e.target.value) || 5 })}
        />
      </div>

      {slides.length === 0 ? (
        <p className="text-[13px] text-fg-muted">لا توجد شرائح بعد. أضِف شريحة لبدء السلايدر.</p>
      ) : (
        <div className="space-y-3">
          {slides.map((sl, i) => (
            <div key={i} className="rounded-card border border-line/70 p-3 space-y-3 bg-surface-sunken/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-fg-muted flex-1">شريحة {i + 1}</span>
                <button type="button" onClick={() => moveSlide(i, -1)} disabled={i === 0} className="p-1.5 rounded-lg text-fg-subtle hover:text-fg disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1} className="p-1.5 rounded-lg text-fg-subtle hover:text-fg disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => removeSlide(i)} className="p-1.5 rounded-lg text-danger hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input label="رابط الصورة" value={sl.image} onChange={(e) => setSlide(i, { image: e.target.value })} placeholder="https://…" />
                <Input label="الرابط عند الضغط" value={sl.link || ""} onChange={(e) => setSlide(i, { link: e.target.value })} placeholder="/products" />
                <Input label="النص البديل" value={sl.alt || ""} onChange={(e) => setSlide(i, { alt: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="secondary" size="sm" onClick={addSlide}><Plus className="h-3.5 w-3.5" /> إضافة شريحة</Button>
    </div>
  );
}
