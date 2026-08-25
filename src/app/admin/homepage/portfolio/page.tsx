"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, Save, Upload, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Switch } from "@/components/ui/Input";
import { PageHeader } from "@/components/admin/PageHeader";
import { Skeleton } from "@/components/ui/States";
import toast from "react-hot-toast";
import { PORTFOLIO_DEFAULTS, type PortfolioContent, type PortfolioItem, type PortfolioFilter } from "@/lib/portfolio";

const uid = () => Math.random().toString(36).slice(2, 9);

export default function PortfolioAdminPage() {
  const [content, setContent] = useState<PortfolioContent>(PORTFOLIO_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/homepage/portfolio");
      const data = await res.json();
      if (data.success) setContent(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const mutate = (fn: (c: PortfolioContent) => PortfolioContent) => {
    setContent((c) => fn(c));
    setDirty(true);
  };

  /* ── Items ── */
  const patchItem = (id: string, p: Partial<PortfolioItem>) =>
    mutate((c) => ({ ...c, items: c.items.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const removeItem = (id: string) => mutate((c) => ({ ...c, items: c.items.filter((x) => x.id !== id) }));
  const moveItem = (i: number, dir: -1 | 1) =>
    mutate((c) => {
      const j = i + dir;
      if (j < 0 || j >= c.items.length) return c;
      const items = [...c.items];
      [items[i], items[j]] = [items[j], items[i]];
      return { ...c, items };
    });
  const addItem = () =>
    mutate((c) => {
      const firstCat = c.filters.find((f) => f.value !== "all")?.value || "";
      return {
        ...c,
        items: [...c.items, { id: uid(), category: firstCat, img: "", tag: "", tagColor: "#ec205f", title: "" }],
      };
    });

  /* ── Filters (categories) ── */
  const patchFilter = (i: number, p: Partial<PortfolioFilter>) =>
    mutate((c) => ({ ...c, filters: c.filters.map((f, idx) => (idx === i ? { ...f, ...p } : f)) }));
  const removeFilter = (value: string) =>
    mutate((c) => ({
      ...c,
      filters: c.filters.filter((f) => f.value !== value),
    }));
  const addFilter = () =>
    mutate((c) => ({ ...c, filters: [...c.filters, { value: `cat-${uid()}`, label: "تصنيف جديد" }] }));

  /* ── Image upload ── */
  const uploadFor = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        patchItem(id, { img: data.url });
        toast.success("تم رفع الصورة");
      } else {
        toast.error(data.error || "تعذّر رفع الصورة");
      }
    } catch {
      toast.error("تعذّر رفع الصورة");
    } finally {
      setUploadingId(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/homepage/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = await res.json();
      if (data.success) {
        setContent(data.data);
        setDirty(false);
        toast.success("تم حفظ معرض الأعمال");
      } else {
        toast.error(data.error || "تعذّر الحفظ");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  };

  const catOptions = content.filters
    .filter((f) => f.value !== "all")
    .map((f) => ({ value: f.value, label: f.label }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="معرض الأعمال"
        description="تحكّم كامل في قسم «معرض الأعمال» على الصفحة الرئيسية — التصنيفات والأعمال والصور."
        actions={
          <Button onClick={save} loading={saving} disabled={!dirty}>
            <Save className="h-4 w-4" /> حفظ
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <>
          {/* Section settings */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-fg">إظهار القسم</h2>
                <p className="text-sm text-fg-subtle">عند الإطفاء يختفي معرض الأعمال من الصفحة الرئيسية.</p>
              </div>
              <Switch
                checked={content.enabled}
                onChange={(v) => mutate((c) => ({ ...c, enabled: v }))}
                aria-label="إظهار معرض الأعمال"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="العنوان العلوي" value={content.titleTop} onChange={(e) => mutate((c) => ({ ...c, titleTop: e.target.value }))} />
              <Input label="العنوان الرئيسي" value={content.titleMain} onChange={(e) => mutate((c) => ({ ...c, titleMain: e.target.value }))} />
              <Input label="الكلمة المميّزة (ملوّنة)" value={content.titleHighlight} onChange={(e) => mutate((c) => ({ ...c, titleHighlight: e.target.value }))} />
            </div>
          </Card>

          {/* Filters / categories */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-fg">التصنيفات (أزرار الفلترة)</h2>
              <Button variant="outline" size="sm" onClick={addFilter}>
                <Plus className="h-4 w-4" /> تصنيف
              </Button>
            </div>
            <p className="text-sm text-fg-subtle">تصنيف «الكل» ثابت ولا يمكن حذفه. تأكّد أن رمز التصنيف فريد.</p>
            <div className="space-y-2">
              {content.filters.map((f, i) => (
                <div key={f.value + i} className="flex items-end gap-2">
                  <Input
                    label="الاسم الظاهر"
                    value={f.label}
                    onChange={(e) => patchFilter(i, { label: e.target.value })}
                    wrapperClassName="flex-1"
                    disabled={f.value === "all"}
                  />
                  <Input
                    label="الرمز (بالإنجليزية)"
                    value={f.value}
                    onChange={(e) => patchFilter(i, { value: e.target.value })}
                    wrapperClassName="flex-1"
                    disabled={f.value === "all"}
                    dir="ltr"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFilter(f.value)}
                    disabled={f.value === "all"}
                    aria-label="حذف التصنيف"
                    className="text-danger mb-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Items */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-fg">الأعمال ({content.items.length})</h2>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4" /> عمل جديد
              </Button>
            </div>

            {content.items.length === 0 ? (
              <p className="text-sm text-fg-subtle py-8 text-center">لا توجد أعمال بعد. أضف أول عمل.</p>
            ) : (
              <div className="space-y-4">
                {content.items.map((item, i) => (
                  <div key={item.id} className="rounded-xl border border-line p-4 flex flex-col sm:flex-row gap-4">
                    {/* Preview */}
                    <div className="w-full sm:w-40 shrink-0">
                      <div className="aspect-[4/3] rounded-lg bg-surface-sunken border border-line overflow-hidden flex items-center justify-center">
                        {item.img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-fg-subtle" />
                        )}
                      </div>
                      <label className="mt-2 flex items-center justify-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingId === item.id ? "جارٍ الرفع…" : "رفع صورة"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadFor(item.id, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {/* Fields */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="عنوان العمل" value={item.title} onChange={(e) => patchItem(item.id, { title: e.target.value })} wrapperClassName="sm:col-span-2" />
                      <Input label="رابط الصورة" value={item.img} onChange={(e) => patchItem(item.id, { img: e.target.value })} wrapperClassName="sm:col-span-2" dir="ltr" placeholder="https://…" />
                      <Select
                        label="التصنيف"
                        value={item.category}
                        onChange={(e) => patchItem(item.id, { category: e.target.value })}
                        options={catOptions.length ? catOptions : [{ value: "", label: "أضف تصنيفاً أولاً" }]}
                      />
                      <Input label="الوسم (Tag)" value={item.tag} onChange={(e) => patchItem(item.id, { tag: e.target.value })} />
                      <div className="flex items-end gap-2">
                        <Input
                          label="لون الوسم"
                          value={item.tagColor}
                          onChange={(e) => patchItem(item.id, { tagColor: e.target.value })}
                          wrapperClassName="flex-1"
                          dir="ltr"
                        />
                        <input
                          type="color"
                          value={/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(item.tagColor) ? item.tagColor : "#ec205f"}
                          onChange={(e) => patchItem(item.id, { tagColor: e.target.value })}
                          className="h-10 w-12 rounded-lg border border-line cursor-pointer mb-0.5"
                          aria-label="اختيار اللون"
                        />
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex sm:flex-col gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label="لأعلى">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => moveItem(i, 1)} disabled={i === content.items.length - 1} aria-label="لأسفل">
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} aria-label="حذف" className="text-danger">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button onClick={save} loading={saving} disabled={!dirty}>
              <Save className="h-4 w-4" /> حفظ التغييرات
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
