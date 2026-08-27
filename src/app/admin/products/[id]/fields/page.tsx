"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import {
  Plus, Trash2, Save, ChevronUp, ChevronDown, X,
  Type, AlignLeft, Hash, ListChecks, List, ImagePlus, Paperclip,
  Calendar, Clock, CalendarClock, MapPin, Palette, Minus,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductCustomFields } from "@/components/store/ProductCustomFields";
import { Eye } from "lucide-react";
import {
  FIELD_TYPES, fieldMeta, isSelectType, isPresentational, hasExtensions,
  DEFAULT_EXTENSIONS, type FieldType, type ProductFieldData, type FieldOption, type FieldCondition,
} from "@/lib/product-fields";

/* eslint-disable @typescript-eslint/no-explicit-any */

const ICONS: Record<string, any> = {
  Type, AlignLeft, Hash, ListChecks, List, ImagePlus, Paperclip,
  Calendar, Clock, CalendarClock, MapPin, Palette, Minus,
};

const newKey = () => `f_${Math.random().toString(36).slice(2, 9)}`;

function makeField(type: FieldType): ProductFieldData {
  const meta = fieldMeta(type);
  return {
    key: newKey(),
    type,
    label: "",
    description: "",
    required: !meta.presentational,
    sortOrder: 0,
    values: meta.hasValues ? [{ label: "", price: 0 }] : undefined,
    config: meta.hasExtensions ? { extensions: DEFAULT_EXTENSIONS[type] || [] } : undefined,
    condFieldKey: null,
    condValue: null,
  };
}

export default function ProductFieldsPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState("");
  const [fields, setFields] = useState<ProductFieldData[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products/${params.id}/fields`).then((r) => r.json()),
      fetch(`/api/admin/products/${params.id}`).then((r) => r.json()).catch(() => null),
    ]).then(([res, prod]) => {
      if (prod?.success && prod.data) setProductName(prod.data.nameAr || prod.data.name || "");
      if (res?.success && Array.isArray(res.data)) {
        setFields(
          res.data.map((f: any) => ({
            ...f,
            description: f.description || "",
            values: isSelectType(f.type) ? (Array.isArray(f.values) ? f.values : []) : undefined,
            config: f.config || (hasExtensions(f.type) ? { extensions: DEFAULT_EXTENSIONS[f.type] || [] } : undefined),
          }))
        );
      }
    }).finally(() => setLoading(false));
  }, [params.id]);

  const update = (i: number, patch: Partial<ProductFieldData>) =>
    setFields((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  const addField = (type: FieldType) => setFields((fs) => [...fs, makeField(type)]);
  const removeField = (i: number) => setFields((fs) => fs.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setFields((fs) => {
      const j = i + dir;
      if (j < 0 || j >= fs.length) return fs;
      const copy = [...fs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  /* ── Value editing (select types) ── */
  const setValue = (i: number, vi: number, patch: Partial<FieldOption>) =>
    update(i, { values: fields[i].values!.map((v, idx) => (idx === vi ? { ...v, ...patch } : v)) });
  const addValue = (i: number) => update(i, { values: [...(fields[i].values || []), { label: "", price: 0 }] });
  const removeValue = (i: number, vi: number) =>
    update(i, { values: fields[i].values!.filter((_, idx) => idx !== vi) });

  const addFieldItems = FIELD_TYPES.map((ft) => {
    const Icon = ICONS[ft.icon] || Type;
    return { label: ft.labelAr, icon: <Icon />, onSelect: () => addField(ft.type) };
  });

  const handleSave = async () => {
    // Local validation mirrors the API for instant feedback.
    for (const f of fields) {
      if (!isPresentational(f.type) && !f.label.trim()) { toast.error("كل حقل يحتاج اسماً"); return; }
      if (isSelectType(f.type)) {
        const labels = (f.values || []).map((v) => v.label.trim());
        if (labels.length === 0 || labels.some((l) => !l)) { toast.error(`قيم الحقل "${f.label}" ناقصة`); return; }
        if (new Set(labels).size !== labels.length) { toast.error(`قيم الحقل "${f.label}" مكررة`); return; }
      }
    }
    setSaving(true);
    const payload = {
      fields: fields.map((f, i) => ({
        key: f.key,
        type: f.type,
        label: f.label.trim(),
        description: f.description?.trim() || null,
        required: !isPresentational(f.type) && f.required,
        sortOrder: i,
        values: isSelectType(f.type) ? (f.values || []).map((v) => ({ label: v.label.trim(), price: Number(v.price) || 0 })) : undefined,
        config: hasExtensions(f.type) ? { extensions: f.config?.extensions || [] } : undefined,
        condFieldKey: f.condFieldKey || null,
        condValue: f.condFieldKey ? (f.condValue ?? "") : null,
        condLogic: f.condLogic === "or" ? "or" : "and",
        conditions: Array.isArray(f.conditions) && f.conditions.length > 0 ? f.conditions : undefined,
      })),
    };
    const res = await fetch(`/api/admin/products/${params.id}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) toast.success("تم حفظ الحقول ✓");
    else toast.error(data.error || "حدث خطأ");
    setSaving(false);
  };

  if (loading) {
    return <div className="animate-pulse space-y-4 max-w-3xl">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-card skeleton" />)}</div>;
  }

  const AddButton = (
    <Dropdown
      align="start"
      items={addFieldItems}
      trigger={
        <span className="inline-flex items-center gap-2 rounded-control bg-primary-600 px-4 h-10 text-sm font-medium text-white hover:bg-primary-700 transition-colors">
          <Plus className="h-4 w-4" /> إضافة حقل جديد
        </span>
      }
    />
  );

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/admin" },
          { label: "المنتجات", href: "/admin/products" },
          { label: productName || "المنتج", href: `/admin/products/${params.id}` },
          { label: "الحقول المخصّصة" },
        ]}
        title="الحقول المخصّصة"
        description={productName || undefined}
        actions={<Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>حفظ</Button>}
      />

      {/* Builder (start) + live customer preview (end) fill the width together. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px] items-start">
        {/* ── Builder column ── */}
        <div className="space-y-5 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-fg-muted">
              {fields.length > 0 ? `${fields.length} حقل` : "ابدأ ببناء نموذج الطلب"}
            </p>
            {AddButton}
          </div>

          {fields.length === 0 && (
            <Card className="border-dashed p-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <ListChecks className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-fg">لا توجد حقول بعد</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
                اضغط «إضافة حقل جديد» لبناء نموذج الطلب — اختيارات بسعر إضافي، رفع ملف التصميم،
                شرط ظهور الحقل، والمزيد.
              </p>
            </Card>
          )}

          {fields.map((f, i) => (
            <FieldCard
              key={f.key}
              field={f}
              index={i}
              total={fields.length}
              collapsed={!!collapsed[f.key]}
              priorFields={fields.slice(0, i)}
              onToggleCollapse={() => setCollapsed((c) => ({ ...c, [f.key]: !c[f.key] }))}
              onUpdate={(patch) => update(i, patch)}
              onRemove={() => removeField(i)}
              onMove={(dir) => move(i, dir)}
              onSetValue={(vi, patch) => setValue(i, vi, patch)}
              onAddValue={() => addValue(i)}
              onRemoveValue={(vi) => removeValue(i, vi)}
            />
          ))}

          {fields.length > 0 && (
            <div className="flex items-center justify-between gap-3 pb-8">
              {AddButton}
              <Button onClick={handleSave} loading={saving} size="lg"><Save className="h-4 w-4" /> حفظ الحقول</Button>
            </div>
          )}
        </div>

        {/* ── Live preview column ── */}
        <aside className="xl:sticky xl:top-6">
          <PreviewPanel fields={fields} productName={productName} />
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────── Live customer preview ─────────────────────── */

function PreviewPanel({ fields, productName }: { fields: ProductFieldData[]; productName: string }) {
  // Only render fields the customer would actually see: named, and selects with
  // at least one named value. Draft/empty rows are skipped so the preview stays clean.
  const clean = useMemo(
    () =>
      fields
        .filter((f) => f.type === "separator" || f.label.trim())
        .map((f) => ({
          ...f,
          values: isSelectType(f.type) ? (f.values || []).filter((v) => v.label.trim()) : f.values,
        }))
        .filter((f) => !isSelectType(f.type) || (f.values && f.values.length > 0)),
    [fields]
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-line bg-surface-muted px-4 py-3">
        <Eye className="h-4 w-4 text-primary-600" />
        <span className="text-sm font-bold text-fg">معاينة مباشرة</span>
        <span className="ms-auto text-[11px] text-fg-subtle">كما يراها العميل</span>
      </div>
      <div className="p-4">
        {/* A little product framing so the preview reads like the real page. */}
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-muted p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600 text-lg">🏷️</div>
          <p className="text-sm font-semibold text-fg truncate">{productName || "المنتج"}</p>
        </div>
        {clean.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-subtle">أضف حقلاً لتظهر معاينته هنا.</p>
        ) : (
          <ProductCustomFields key={clean.map((f) => f.key + f.type).join()} fields={clean} onChange={() => {}} />
        )}
      </div>
    </Card>
  );
}

/* ─────────────────────────── Field card ─────────────────────────── */

function FieldCard({
  field: f, index, total, collapsed, priorFields,
  onToggleCollapse, onUpdate, onRemove, onMove, onSetValue, onAddValue, onRemoveValue,
}: {
  field: ProductFieldData;
  index: number;
  total: number;
  collapsed: boolean;
  priorFields: ProductFieldData[];
  onToggleCollapse: () => void;
  onUpdate: (patch: Partial<ProductFieldData>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onSetValue: (vi: number, patch: Partial<FieldOption>) => void;
  onAddValue: () => void;
  onRemoveValue: (vi: number) => void;
}) {
  const meta = fieldMeta(f.type);
  const Icon = ICONS[meta.icon] || Type;
  // Only select-type fields defined BEFORE this one can drive its visibility
  // (keeps the dependency graph acyclic).
  const condCandidates = priorFields.filter((p) => isSelectType(p.type));

  return (
    <Card className="p-0 overflow-hidden ring-1 ring-transparent transition-shadow hover:shadow-sm">
      {/* Header — distinct from Salla: an accent rail, a tinted icon chip, and a
          two-line title (field name + its type) with grouped, subtle actions. */}
      <div className="relative flex items-center gap-3 border-b border-line bg-gradient-to-l from-surface-muted/60 to-transparent px-4 py-3">
        <span className="absolute inset-y-0 start-0 w-1 bg-primary-500/70" aria-hidden />
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-fg">{f.label?.trim() || meta.labelAr}</p>
          <p className="text-[11px] text-fg-subtle">{meta.labelAr}</p>
        </div>

        {!meta.presentational && (
          <button
            type="button"
            onClick={() => onUpdate({ required: !f.required })}
            className={cn(
              "inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold transition-colors shrink-0",
              f.required ? "bg-primary-100 text-primary-700" : "bg-surface-muted text-fg-muted hover:text-fg"
            )}
            title="تبديل الإلزامية"
          >
            {f.required ? "مطلوب" : "اختياري"}
          </button>
        )}

        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg disabled:opacity-30" title="أعلى"><ChevronUp className="h-4 w-4" /></button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg disabled:opacity-30" title="أسفل"><ChevronDown className="h-4 w-4" /></button>
          <button onClick={onToggleCollapse} className="rounded-lg p-1.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg" title={collapsed ? "توسيع" : "طي"}>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button onClick={onRemove} className="rounded-lg p-1.5 text-danger transition-colors hover:bg-danger/10" title="حذف الحقل"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* Label + description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={meta.presentational ? "عنوان الفاصل" : "اسم الحقل"}
              value={f.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              placeholder={meta.labelAr}
            />
            {!meta.presentational && (
              <Input
                label="وصف توضيحي (اختياري)"
                value={f.description || ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="نص مساعد للعميل"
              />
            )}
          </div>

          {/* Select values with additive price */}
          {isSelectType(f.type) && (
            <div className="rounded-xl border border-line bg-surface-muted/40 p-3 space-y-2">
              <div className="flex items-center gap-2 px-1 text-[11px] font-semibold text-fg-subtle">
                <span className="w-7 shrink-0" />
                <span className="flex-1">القيمة</span>
                <span className="w-32 shrink-0">السعر الإضافي</span>
              </div>
              {(f.values || []).map((v, vi) => (
                <div key={vi} className="flex items-center gap-2">
                  <button onClick={() => onRemoveValue(vi)} className="flex h-7 w-7 items-center justify-center rounded-full text-danger hover:bg-danger/10 shrink-0" title="حذف القيمة"><X className="h-4 w-4" /></button>
                  <input
                    value={v.label}
                    onChange={(e) => onSetValue(vi, { label: e.target.value })}
                    placeholder={`القيمة ${vi + 1}`}
                    className="flex-1 rounded-control border border-line bg-surface px-3 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                  <div className="relative w-32 shrink-0">
                    <input
                      type="number"
                      value={v.price || ""}
                      onChange={(e) => onSetValue(vi, { price: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full rounded-control border border-line bg-surface ps-3 pe-11 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    />
                    <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[11px] text-fg-subtle">ر.س</span>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={onAddValue}><Plus className="h-3.5 w-3.5" /> إضافة قيمة جديدة</Button>
            </div>
          )}

          {/* Upload extensions */}
          {hasExtensions(f.type) && (
            <Input
              label="الامتدادات المسموح بها"
              value={(f.config?.extensions || []).join(", ")}
              onChange={(e) => onUpdate({ config: { extensions: e.target.value.split(",").map((s) => s.trim().replace(/^\./, "").toLowerCase()).filter(Boolean) } })}
              placeholder="pdf, png, jpg"
              hint="افصل بينها بفاصلة. تنبيه: رفع الملفات يعمل مع الباقات المدفوعة/الاستضافة الدائمة."
              dir="ltr"
            />
          )}

          {/* Conditional visibility — one or more rules combined with AND/OR */}
          {condCandidates.length > 0 && !meta.presentational && (
            <ConditionEditor field={f} candidates={condCandidates} onUpdate={onUpdate} />
          )}
        </div>
      )}
    </Card>
  );
}

/* ────────────────────── Conditional visibility editor ────────────────────── */

function ConditionEditor({
  field: f, candidates, onUpdate,
}: {
  field: ProductFieldData;
  candidates: ProductFieldData[];
  onUpdate: (patch: Partial<ProductFieldData>) => void;
}) {
  // Normalise: prefer the multi-rule array, fall back to the legacy single pair.
  const conds: FieldCondition[] =
    f.conditions && f.conditions.length > 0
      ? f.conditions
      : f.condFieldKey
      ? [{ fieldKey: f.condFieldKey, op: "eq", value: f.condValue || "" }]
      : [];
  const enabled = conds.length > 0;
  const logic = f.condLogic === "or" ? "or" : "and";
  const valuesOf = (key: string) => candidates.find((c) => c.key === key)?.values || [];
  const newRule = (): FieldCondition => ({
    fieldKey: candidates[0].key,
    op: "eq",
    value: candidates[0].values?.[0]?.label || "",
  });

  // Writing `conditions` clears the legacy pair so the two never disagree.
  const write = (next: FieldCondition[]) => onUpdate({ conditions: next, condFieldKey: null, condValue: null });
  const toggle = (on: boolean) =>
    on ? write([newRule()]) : onUpdate({ conditions: null, condLogic: null, condFieldKey: null, condValue: null });
  const setRule = (i: number, patch: Partial<FieldCondition>) =>
    write(conds.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeRule = (i: number) => {
    const next = conds.filter((_, idx) => idx !== i);
    next.length ? write(next) : toggle(false);
  };

  return (
    <div className="rounded-xl border border-line bg-surface-muted/40 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-fg">
          <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} className="h-4 w-4 rounded" />
          شرط ظهور الحقل
        </label>
        {enabled && conds.length > 1 && (
          <div className="inline-flex overflow-hidden rounded-lg border border-line text-xs">
            <button
              type="button"
              onClick={() => onUpdate({ condLogic: "and" })}
              className={cn("px-3 h-7 font-medium transition-colors", logic === "and" ? "bg-primary-600 text-white" : "bg-surface text-fg-muted hover:text-fg")}
              title="يجب تحقّق كل الشروط"
            >
              كل الشروط (AND)
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ condLogic: "or" })}
              className={cn("px-3 h-7 font-medium transition-colors border-s border-line", logic === "or" ? "bg-primary-600 text-white" : "bg-surface text-fg-muted hover:text-fg")}
              title="يكفي تحقّق أي شرط"
            >
              أي شرط (OR)
            </button>
          </div>
        )}
      </div>

      {enabled && (
        <div className="space-y-2">
          {conds.map((c, i) => {
            const opts = valuesOf(c.fieldKey);
            return (
              <div key={i} className="space-y-1.5">
                {i > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="h-px flex-1 bg-line" />
                    <span className="text-[11px] font-bold text-primary-600">{logic === "or" ? "أو" : "و"}</span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}
                <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                  <select
                    value={c.fieldKey}
                    onChange={(e) => {
                      const src = candidates.find((x) => x.key === e.target.value);
                      setRule(i, { fieldKey: e.target.value, value: src?.values?.[0]?.label || "" });
                    }}
                    className="min-w-0 rounded-control border border-line bg-surface px-2.5 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  >
                    {candidates.map((x) => <option key={x.key} value={x.key}>{x.label || fieldMeta(x.type).labelAr}</option>)}
                  </select>
                  <select
                    value={c.op}
                    onChange={(e) => setRule(i, { op: e.target.value === "neq" ? "neq" : "eq" })}
                    className="rounded-control border border-line bg-surface px-2 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                    title="المُعامل"
                  >
                    <option value="eq">=</option>
                    <option value="neq">≠</option>
                  </select>
                  <select
                    value={c.value}
                    onChange={(e) => setRule(i, { value: e.target.value })}
                    className="min-w-0 rounded-control border border-line bg-surface px-2.5 h-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  >
                    {opts.map((v) => <option key={v.label} value={v.label}>{v.label}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRule(i)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger/10 shrink-0"
                    title="حذف الشرط"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          <Button variant="ghost" size="sm" onClick={() => write([...conds, newRule()])}>
            <Plus className="h-3.5 w-3.5" /> إضافة شرط
          </Button>
        </div>
      )}
    </div>
  );
}
