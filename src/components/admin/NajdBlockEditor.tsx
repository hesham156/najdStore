"use client";

import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import toast from "react-hot-toast";
import {
  defaultNajdConfig,
  type NajdType,
  type NajdBlockConfig,
  type NajdCard,
} from "@/lib/najd-blocks";

const uid = () => Math.random().toString(36).slice(2, 9);

/* Per-type field spec — what the editor shows for each Najd section. */
type CardKind = "feature" | "service" | "sticker" | "startup" | "why" | "point" | "io" | null;
interface Spec {
  label?: boolean;
  title?: boolean;
  highlight?: boolean;
  desc?: boolean;
  image?: boolean; // section-level image (digital)
  heroVisuals?: boolean; // hero background + 2 photo cards
  card: CardKind;
  cardsTitle?: string;
  cta?: "full" | "button";
  partners?: boolean;
  testimonial?: boolean;
}
const SPECS: Record<NajdType, Spec> = {
  najd_hero: { label: true, title: true, highlight: true, desc: true, heroVisuals: true, card: "feature", cardsTitle: "الوسوم أسفل الترويسة", cta: "button" },
  najd_services: { label: true, title: true, highlight: true, desc: true, card: "service", cardsTitle: "الخدمات", cta: "full" },
  najd_stickers: { label: true, title: true, highlight: true, desc: true, card: "sticker", cardsTitle: "أنواع الملصقات" },
  najd_startups: { label: true, title: true, highlight: true, desc: true, card: "startup", cardsTitle: "المزايا", cta: "full" },
  najd_why: { label: true, title: true, highlight: true, desc: true, card: "why", cardsTitle: "المزايا", partners: true, testimonial: true },
  najd_digital: { title: true, highlight: true, desc: true, image: true, card: "point", cardsTitle: "النقاط" },
  najd_large: { label: true, title: true, highlight: true, card: "io", cardsTitle: "البطاقات (إندور/أوت دور)", cta: "full" },
};

/* Small color field: text + native picker. */
function ColorField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const safe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value || "") ? (value as string) : "#ec205f";
  return (
    <div className="flex items-end gap-2">
      <Input label={label} value={value || ""} onChange={(e) => onChange(e.target.value)} wrapperClassName="flex-1" dir="ltr" />
      <input type="color" value={safe} onChange={(e) => onChange(e.target.value)} className="h-10 w-11 rounded-lg border border-line cursor-pointer mb-0.5" aria-label={label} />
    </div>
  );
}

/* Image field: URL + upload. */
function ImageField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) { onChange(data.url); toast.success("تم رفع الصورة"); }
      else toast.error(data.error || "تعذّر الرفع");
    } catch { toast.error("تعذّر الرفع"); }
    finally { setUploading(false); }
  };
  return (
    <div>
      <Input label={label} value={value || ""} onChange={(e) => onChange(e.target.value)} dir="ltr" placeholder="https://…" />
      <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">
        <Upload className="h-3.5 w-3.5" /> {uploading ? "جارٍ الرفع…" : "رفع صورة"}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </label>
    </div>
  );
}

export function NajdBlockEditor({
  type,
  value,
  onChange,
}: {
  type: NajdType;
  value?: NajdBlockConfig;
  onChange: (cfg: NajdBlockConfig) => void;
}) {
  const cfg: NajdBlockConfig = value && Object.keys(value).length ? value : defaultNajdConfig(type);
  const spec = SPECS[type];

  const set = (p: Partial<NajdBlockConfig>) => onChange({ ...cfg, ...p });
  const setCta = (p: Partial<NonNullable<NajdBlockConfig["cta"]>>) => onChange({ ...cfg, cta: { ...cfg.cta, ...p } });

  const cards = cfg.cards || [];
  const patchCard = (i: number, p: Partial<NajdCard>) => set({ cards: cards.map((c, idx) => (idx === i ? { ...c, ...p } : c)) });
  const removeCard = (i: number) => set({ cards: cards.filter((_, idx) => idx !== i) });
  const moveCard = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= cards.length) return;
    const copy = [...cards];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    set({ cards: copy });
  };
  const addCard = () => set({ cards: [...cards, { id: uid() }] });

  return (
    <div className="space-y-4">
      {/* Header fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {spec.label && <Input label="النص العلوي (Label)" value={cfg.label || ""} onChange={(e) => set({ label: e.target.value })} />}
        {spec.title && <Input label="العنوان" value={cfg.title || ""} onChange={(e) => set({ title: e.target.value })} />}
        {spec.highlight && <Input label="الكلمة المميّزة (ملوّنة)" value={cfg.titleHighlight || ""} onChange={(e) => set({ titleHighlight: e.target.value })} />}
      </div>
      {spec.desc && <Textarea label="الوصف" rows={2} value={cfg.desc || ""} onChange={(e) => set({ desc: e.target.value })} />}
      {spec.image && <ImageField label="صورة القسم" value={cfg.image} onChange={(v) => set({ image: v })} />}

      {/* Hero visuals: background + two photo cards */}
      {spec.heroVisuals && (
        <div className="rounded-xl border border-line p-3 space-y-3">
          <span className="text-sm font-semibold text-fg">صور الترويسة والخلفية</span>
          <ImageField label="صورة الخلفية" value={cfg.bgImage} onChange={(v) => set({ bgImage: v })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ImageField label="الصورة الأولى (البطاقة العلوية)" value={cfg.image} onChange={(v) => set({ image: v })} />
            <ImageField label="الصورة الثانية (البطاقة الجانبية)" value={cfg.image2} onChange={(v) => set({ image2: v })} />
          </div>
          <p className="text-xs text-fg-muted">اترك أي حقل فارغاً للرجوع إلى التصميم الافتراضي.</p>
        </div>
      )}

      {/* Cards */}
      {spec.card && (
        <div className="rounded-xl border border-line p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-fg">{spec.cardsTitle}</span>
            <Button variant="outline" size="sm" onClick={addCard}><Plus className="h-4 w-4" /> إضافة</Button>
          </div>
          {cards.map((c, i) => (
            <div key={c.id} className="rounded-lg border border-line/70 p-3 flex gap-3">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {spec.card === "feature" && (
                  <>
                    <Input label="النص" value={c.text || ""} onChange={(e) => patchCard(i, { text: e.target.value })} />
                    <ColorField label="لون النقطة" value={c.tagColor} onChange={(v) => patchCard(i, { tagColor: v })} />
                  </>
                )}
                {(spec.card === "service" || spec.card === "why") && (
                  <>
                    <Input label="العنوان" value={c.title || ""} onChange={(e) => patchCard(i, { title: e.target.value })} />
                    <ColorField label="لون الأيقونة" value={c.iconColor} onChange={(v) => patchCard(i, { iconColor: v })} />
                    <Textarea wrapperClassName="sm:col-span-2" label="النص" rows={2} value={c.text || ""} onChange={(e) => patchCard(i, { text: e.target.value })} />
                  </>
                )}
                {spec.card === "sticker" && (
                  <>
                    <Input label="الإيموجي" value={c.emoji || ""} onChange={(e) => patchCard(i, { emoji: e.target.value })} />
                    <Input label="العنوان" value={c.title || ""} onChange={(e) => patchCard(i, { title: e.target.value })} />
                    <Input label="العنوان الفرعي" value={c.subtitle || ""} onChange={(e) => patchCard(i, { subtitle: e.target.value })} />
                    <ColorField label="لون العنوان الفرعي" value={c.subtitleColor} onChange={(v) => patchCard(i, { subtitleColor: v })} />
                    <Textarea wrapperClassName="sm:col-span-2" label="النص" rows={2} value={c.text || ""} onChange={(e) => patchCard(i, { text: e.target.value })} />
                    <Input label="الوسم (Tag)" value={c.tag || ""} onChange={(e) => patchCard(i, { tag: e.target.value })} />
                  </>
                )}
                {spec.card === "startup" && (
                  <>
                    <Input label="الإيموجي" value={c.emoji || ""} onChange={(e) => patchCard(i, { emoji: e.target.value })} />
                    <Input label="العنوان" value={c.title || ""} onChange={(e) => patchCard(i, { title: e.target.value })} />
                    <Textarea wrapperClassName="sm:col-span-2" label="النص" rows={2} value={c.text || ""} onChange={(e) => patchCard(i, { text: e.target.value })} />
                    <Input label="الشارة (Badge)" value={c.badge || ""} onChange={(e) => patchCard(i, { badge: e.target.value })} />
                    <ColorField label="لون الشارة" value={c.badgeColor} onChange={(v) => patchCard(i, { badgeColor: v })} />
                  </>
                )}
                {spec.card === "point" && (
                  <>
                    <Input label="الإيموجي" value={c.emoji || ""} onChange={(e) => patchCard(i, { emoji: e.target.value })} />
                    <Input label="النص" value={c.text || ""} onChange={(e) => patchCard(i, { text: e.target.value })} />
                    <ColorField label="اللون" value={c.tagColor} onChange={(v) => patchCard(i, { tagColor: v })} />
                  </>
                )}
                {spec.card === "io" && (
                  <>
                    <div className="sm:col-span-2"><ImageField label="الصورة" value={c.image} onChange={(v) => patchCard(i, { image: v })} /></div>
                    <Input label="العنوان" value={c.title || ""} onChange={(e) => patchCard(i, { title: e.target.value })} />
                    <Input label="الوسم" value={c.tag || ""} onChange={(e) => patchCard(i, { tag: e.target.value })} />
                    <ColorField label="لون الوسم" value={c.tagColor} onChange={(v) => patchCard(i, { tagColor: v })} />
                    <Textarea wrapperClassName="sm:col-span-2" label="النص" rows={2} value={c.text || ""} onChange={(e) => patchCard(i, { text: e.target.value })} />
                    <Input wrapperClassName="sm:col-span-2" label="القائمة (مفصولة بفاصلة)" value={(c.list || []).join("، ")} onChange={(e) => patchCard(i, { list: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })} />
                  </>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="sm" onClick={() => moveCard(i, -1)} disabled={i === 0} aria-label="لأعلى"><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => moveCard(i, 1)} disabled={i === cards.length - 1} aria-label="لأسفل"><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => removeCard(i)} aria-label="حذف" className="text-danger"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {spec.cta && (
        <div className="rounded-xl border border-line p-3 space-y-2">
          <span className="text-sm font-semibold text-fg">زر الدعوة (CTA)</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {spec.cta === "full" && <Input label="عنوان الصندوق" value={cfg.cta?.title || ""} onChange={(e) => setCta({ title: e.target.value })} />}
            {spec.cta === "full" && <Input label="نص الصندوق" value={cfg.cta?.text || ""} onChange={(e) => setCta({ text: e.target.value })} />}
            <Input label="نص الزر" value={cfg.cta?.label || ""} onChange={(e) => setCta({ label: e.target.value })} />
            <Input label="رابط الزر" value={cfg.cta?.link || ""} onChange={(e) => setCta({ link: e.target.value })} dir="ltr" placeholder="https://wa.me/…" />
          </div>
        </div>
      )}

      {/* Partners + testimonial (why-us) */}
      {spec.partners && (
        <Input
          label="شركاء النجاح (مفصولة بفاصلة)"
          value={(cfg.partners || []).join("، ")}
          onChange={(e) => set({ partners: e.target.value.split(/[،,]/).map((x) => x.trim()).filter(Boolean) })}
        />
      )}
      {spec.testimonial && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Textarea wrapperClassName="sm:col-span-2" label="نص الشهادة" rows={2} value={cfg.testimonialText || ""} onChange={(e) => set({ testimonialText: e.target.value })} />
          <Input label="صاحب الشهادة" value={cfg.testimonialAuthor || ""} onChange={(e) => set({ testimonialAuthor: e.target.value })} />
        </div>
      )}
    </div>
  );
}
