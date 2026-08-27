"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload, X, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  isFieldVisible, isSelectType, selectedPrice, isPresentational,
  type ProductFieldData,
} from "@/lib/product-fields";
import type { CartCustomField } from "@/types";

export interface CustomFieldsState {
  /** key → chosen value (string, or string[] for multi-select) */
  values: Record<string, string | string[]>;
  /** total additive price from all visible fields */
  priceAdd: number;
  /** human-readable summary for the cart line label */
  summary: string;
  /** rich values for the order */
  items: CartCustomField[];
  /** are all visible required fields filled? */
  valid: boolean;
}

/** Turn a stored value into a display string. */
function displayValue(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v.join("، ");
  return v ?? "";
}

export function ProductCustomFields({
  fields,
  onChange,
}: {
  fields: ProductFieldData[];
  onChange: (state: CustomFieldsState) => void;
}) {
  const { formatAmount } = useCurrency();
  const [values, setValues] = useState<Record<string, string | string[]>>({});

  const setVal = (key: string, value: string | string[]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const visible = useMemo(
    () => fields.filter((f) => !isPresentational(f.type) && isFieldVisible(f, values)),
    [fields, values]
  );

  // Recompute the derived state whenever values/visibility change and report up.
  useEffect(() => {
    let priceAdd = 0;
    const items: CartCustomField[] = [];
    const summaryParts: string[] = [];
    let valid = true;

    for (const f of visible) {
      const raw = values[f.key];
      const has = Array.isArray(raw) ? raw.length > 0 : !!(raw && String(raw).trim());
      if (f.required && !has) valid = false;
      if (!has) continue;

      const add = isSelectType(f.type) ? selectedPrice(f, raw) : 0;
      priceAdd += add;
      const stored = displayValue(raw); // URL for files — kept for the order
      const isFile = f.type === "file" || f.type === "image";
      const shown = isFile ? (stored.split("/").pop() || "ملف مرفق") : stored;
      items.push({ key: f.key, label: f.label, type: f.type, value: stored, priceAdd: add });
      summaryParts.push(`${f.label}: ${shown}`);
    }

    onChange({ values, priceAdd, summary: summaryParts.join(" · "), items, valid });
    // onChange is stable enough; we intentionally depend on values/visible only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, visible]);

  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        if (f.type === "separator") {
          return (
            <div key={f.key} className="pt-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-fg whitespace-nowrap">{f.label}</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              {f.description && <p className="text-xs text-fg-muted mt-1">{f.description}</p>}
            </div>
          );
        }
        if (!isFieldVisible(f, values)) return null;
        return (
          <FieldInput
            key={f.key}
            field={f}
            value={values[f.key]}
            onChange={(v) => setVal(f.key, v)}
            formatAmount={formatAmount}
          />
        );
      })}
    </div>
  );
}

/* ─────────────────────────── One field ─────────────────────────── */

function FieldInput({
  field: f, value, onChange, formatAmount,
}: {
  field: ProductFieldData;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
  formatAmount: (n: number) => string;
}) {
  const label = (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-sm font-semibold text-fg">{f.label}</span>
      {f.required && <span className="text-danger text-xs">*</span>}
    </div>
  );
  const desc = f.description ? <p className="text-xs text-fg-muted mb-1.5">{f.description}</p> : null;
  const inputCls = "w-full rounded-control border border-line bg-surface px-3.5 h-11 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500";

  switch (f.type) {
    case "single_select":
    case "multi_select": {
      const multi = f.type === "multi_select";
      const selected = multi ? (Array.isArray(value) ? value : []) : value;
      const toggle = (opt: string) => {
        if (multi) {
          const arr = Array.isArray(value) ? value : [];
          onChange(arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]);
        } else {
          onChange(value === opt ? "" : opt);
        }
      };
      return (
        <div>
          {label}{desc}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(f.values || []).map((opt) => {
              const active = multi ? (selected as string[]).includes(opt.label) : selected === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => toggle(opt.label)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-control border px-3.5 h-11 text-sm text-start transition-colors",
                    active
                      ? "border-primary-500 bg-primary-50 text-primary-800 ring-1 ring-primary-500/40"
                      : "border-line bg-surface text-fg hover:border-line-strong"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.price > 0 && (
                    <span className={cn("text-xs shrink-0", active ? "text-primary-700" : "text-fg-muted")}>
                      + {formatAmount(opt.price)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case "long_text":
      return (
        <div>
          {label}{desc}
          <textarea
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            className={cn(inputCls, "h-auto py-2.5 resize-y")}
            placeholder={f.description || ""}
          />
        </div>
      );

    case "number":
      return (
        <div>
          {label}{desc}
          <input type="number" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} className={inputCls} />
        </div>
      );

    case "date":
    case "time":
    case "datetime": {
      const inputType = f.type === "datetime" ? "datetime-local" : f.type;
      return (
        <div>
          {label}{desc}
          <input type={inputType} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} className={inputCls} dir="ltr" />
        </div>
      );
    }

    case "color":
      return (
        <div>
          {label}{desc}
          <div className="flex items-center gap-2">
            <input type="color" value={typeof value === "string" && value ? value : "#7c3aed"} onChange={(e) => onChange(e.target.value)} className="h-11 w-14 rounded-control border border-line bg-surface p-1 cursor-pointer" />
            <input value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder="#RRGGBB" dir="ltr" className={cn(inputCls, "flex-1")} />
          </div>
        </div>
      );

    case "location":
      return (
        <div>
          {label}{desc}
          <div className="flex items-center gap-2">
            <input value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} placeholder="العنوان أو الإحداثيات" className={cn(inputCls, "flex-1")} />
            <button
              type="button"
              onClick={() => {
                if (!navigator.geolocation) { toast.error("المتصفح لا يدعم تحديد الموقع"); return; }
                navigator.geolocation.getCurrentPosition(
                  (pos) => onChange(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`),
                  () => toast.error("تعذّر تحديد الموقع")
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 h-11 text-sm text-fg hover:border-line-strong shrink-0"
              title="استخدم موقعي"
            >
              <MapPin className="h-4 w-4" /> موقعي
            </button>
          </div>
        </div>
      );

    case "image":
    case "file":
      return (
        <div>
          {label}{desc}
          <FileField field={f} value={typeof value === "string" ? value : ""} onChange={onChange} />
        </div>
      );

    case "short_text":
    default:
      return (
        <div>
          {label}{desc}
          <input value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder={f.description || ""} />
        </div>
      );
  }
}

/* ─────────────────────────── File upload ─────────────────────────── */

function FileField({
  field: f, value, onChange,
}: {
  field: ProductFieldData;
  value: string;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const exts = f.config?.extensions || [];
  const accept = f.type === "image" ? "image/*" : exts.map((e) => `.${e}`).join(",");
  // The uploaded URL, and a friendly name for display.
  const filename = value ? value.split("/").pop() || "الملف المرفق" : "";

  const upload = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (exts.length > 0 && !exts.includes(ext)) {
      toast.error(`الامتدادات المسموحة: ${exts.join(", ")}`);
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("purpose", "product_field");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.url) onChange(data.url);
      else toast.error(data.error || "فشل رفع الملف");
    } catch {
      toast.error("تعذّر رفع الملف");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const file = e.target.files?.[0]; if (file) upload(file); }}
      />
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-control border border-primary-500/40 bg-primary-50 px-3.5 h-11 text-sm">
          <span className="truncate text-primary-800" dir="ltr">{filename}</span>
          <button type="button" onClick={() => onChange("")} className="p-1 rounded-full text-danger hover:bg-danger/10 shrink-0" title="إزالة"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-control border border-dashed border-line-strong bg-surface px-3.5 h-11 text-sm text-fg-muted hover:border-primary-500 hover:text-fg transition-colors disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "جارٍ الرفع…" : `رفع ${f.type === "image" ? "صورة" : "ملف"}${exts.length ? ` (${exts.join("/")})` : ""}`}
        </button>
      )}
    </div>
  );
}
