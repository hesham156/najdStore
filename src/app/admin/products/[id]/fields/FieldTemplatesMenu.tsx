"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { LayoutTemplate, Save, Trash2, Download, Loader2, X } from "lucide-react";
import { cloneFields, type ProductFieldData } from "@/lib/product-fields";

interface TemplateRow {
  id: string;
  name: string;
  count: number;
  fields: ProductFieldData[];
}

const newKey = () => `f_${Math.random().toString(36).slice(2, 9)}`;

/**
 * Save the builder's current fields as a reusable template, or apply an existing
 * template. Applying CLONES the fields with fresh keys (via cloneFields), so the
 * product's copy and the template never affect each other afterwards.
 */
export function FieldTemplatesMenu({
  currentFields,
  onApply,
}: {
  currentFields: ProductFieldData[];
  onApply: (fields: ProductFieldData[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/field-templates");
      const data = await res.json();
      if (data.success) setRows(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const save = async () => {
    const n = name.trim();
    if (!n) { toast.error("أدخل اسماً للقالب"); return; }
    if (currentFields.length === 0) { toast.error("لا توجد حقول لحفظها"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/field-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n, fields: currentFields }),
      });
      const data = await res.json();
      if (data.success) { toast.success(data.message || "تم حفظ القالب"); setName(""); load(); }
      else toast.error(data.error || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const apply = (row: TemplateRow) => {
    const cloned = cloneFields(row.fields, newKey);
    onApply(cloned);
    setOpen(false);
    toast.success(`تمت إضافة حقول «${row.name}»`);
  };

  const remove = async (row: TemplateRow) => {
    if (!confirm(`حذف القالب «${row.name}»؟`)) return;
    const res = await fetch(`/api/admin/field-templates/${row.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { setRows((r) => r.filter((x) => x.id !== row.id)); toast.success("تم حذف القالب"); }
    else toast.error(data.error || "فشل الحذف");
  };

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen((v) => !v)} icon={<LayoutTemplate className="h-4 w-4" />}>
        القوالب
      </Button>

      {open && (
        <div className="absolute z-popover mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface shadow-pop end-0 animate-pop-in">
          {/* Save current */}
          <div className="border-b border-line p-3">
            <p className="mb-2 text-xs font-semibold text-fg-subtle">حفظ الحقول الحالية كقالب</p>
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="اسم القالب"
                className="h-9 flex-1 rounded-control border border-line bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
              <Button size="sm" onClick={save} loading={saving} icon={<Save className="h-3.5 w-3.5" />}>حفظ</Button>
            </div>
          </div>

          {/* Existing templates */}
          <div className="max-h-72 overflow-y-auto p-2">
            <p className="px-1 pb-1 text-xs font-semibold text-fg-subtle">تطبيق قالب محفوظ</p>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-fg-muted">
                <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل…
              </div>
            ) : rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-subtle">لا توجد قوالب محفوظة بعد.</p>
            ) : (
              <ul className="space-y-1">
                {rows.map((row) => (
                  <li key={row.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-hover">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-fg">{row.name}</p>
                      <p className="text-[11px] text-fg-subtle">{row.count} حقل</p>
                    </div>
                    <button onClick={() => apply(row)} className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2 h-7 text-xs font-medium text-primary-700 hover:bg-primary-100" title="تطبيق على هذا المنتج">
                      <Download className="h-3.5 w-3.5" /> تطبيق
                    </button>
                    <button onClick={() => remove(row)} className="rounded-lg p-1.5 text-fg-subtle hover:bg-danger/10 hover:text-danger" title="حذف القالب">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end border-t border-line p-2">
            <button onClick={() => setOpen(false)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-fg-muted hover:text-fg">
              <X className="h-3.5 w-3.5" /> إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
