"use client";

import { useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet, FileText, ChevronDown, CheckCircle2, AlertTriangle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Entity = "products" | "customers" | "orders";

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

const LABELS: Record<Entity, string> = {
  products: "المنتجات",
  customers: "العملاء",
  orders: "الطلبات",
};

interface Props {
  entity: Entity;
  /** Extra query params for export (e.g. `status=DELIVERED`). */
  exportQuery?: string;
  /** Called after a successful import so the parent can refresh its list. */
  onImported?: () => void;
}

export function ImportExportBar({ entity, exportQuery, onImported }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const label = LABELS[entity];

  const download = (format: "xlsx" | "csv") => {
    setMenuOpen(false);
    const qs = new URLSearchParams();
    qs.set("format", format);
    if (exportQuery) new URLSearchParams(exportQuery).forEach((v, k) => qs.set(k, v));
    const a = document.createElement("a");
    a.href = `/api/admin/${entity}/export?${qs.toString()}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("جارٍ تنزيل الملف…");
  };

  const downloadTemplate = () => {
    const a = document.createElement("a");
    a.href = `/api/admin/${entity}/export?format=xlsx&template=1`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("جارٍ تنزيل القالب…");
  };

  const openImport = () => {
    setFile(null);
    setResult(null);
    setModalOpen(true);
  };

  const onPickFile = (f: File | null) => {
    setResult(null);
    setFile(f);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/${entity}/import`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "فشل الاستيراد");
        return;
      }
      setResult(data.data as ImportResult);
      const r = data.data as ImportResult;
      toast.success(`تم الاستيراد: ${r.created} جديد، ${r.updated} محدّث`);
      onImported?.();
    } catch {
      toast.error("حدث خطأ أثناء رفع الملف");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Export dropdown */}
      <div className="relative">
        <Button variant="secondary" size="sm" onClick={() => setMenuOpen((o) => !o)}>
          <Download className="h-4 w-4" />
          تصدير
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute z-20 mt-1 end-0 w-44 rounded-xl border border-line bg-surface shadow-xl overflow-hidden">
              <button
                onClick={() => download("xlsx")}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-sunken text-start"
              >
                <FileSpreadsheet className="h-4 w-4 text-success" />
                ملف Excel
              </button>
              <button
                onClick={() => download("csv")}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-sunken text-start"
              >
                <FileText className="h-4 w-4 text-info" />
                ملف CSV
              </button>
            </div>
          </>
        )}
      </div>

      {/* Import button */}
      <Button variant="outline" size="sm" onClick={openImport}>
        <Upload className="h-4 w-4" />
        استيراد
      </Button>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={`استيراد ${label}`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-fg-subtle leading-relaxed">
            ارفع ملف Excel أو CSV. يدعم النظام الملفات المُصدَّرة من <span className="font-semibold text-primary-600">سلة</span> تلقائياً،
            بالإضافة إلى الملفات المُصدَّرة من هذه اللوحة.
          </p>

          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            <Download className="h-4 w-4" />
            تنزيل قالب فارغ ({label})
          </button>

          {/* File picker */}
          <div
            onClick={() => inputRef.current?.click()}
            className={cn(
              "cursor-pointer rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
              file
                ? "border-primary-400 bg-primary-50 dark:bg-primary-950/30"
                : "border-line hover:border-primary-400"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <FileSpreadsheet className="h-5 w-5 text-primary-600" />
                <span className="font-medium">{file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onPickFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                  className="text-fg-subtle hover:text-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-fg-subtle">
                <Upload className="h-8 w-8" />
                <span className="text-sm">اضغط لاختيار ملف <span className="text-fg-subtle">(.xlsx, .xls, .csv)</span></span>
              </div>
            )}
          </div>

          {/* Result summary */}
          {result && (
            <div className="rounded-xl border border-line p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-5 w-5 text-success" />
                اكتمل الاستيراد
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="الإجمالي" value={result.total} />
                <Stat label="جديد" value={result.created} color="text-success" />
                <Stat label="محدّث" value={result.updated} color="text-info" />
                <Stat label="متجاهَل" value={result.skipped} color="text-warning" />
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2 max-h-40 overflow-auto rounded-lg bg-warning/10 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    صفوف متجاهَلة ({result.errors.length})
                  </div>
                  {result.errors.slice(0, 20).map((er, idx) => (
                    <p key={idx} className="text-xs text-warning">
                      صف {er.row}: {er.message}
                    </p>
                  ))}
                  {result.errors.length > 20 && (
                    <p className="text-xs text-warning">…و {result.errors.length - 20} أخرى</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              {result ? "إغلاق" : "إلغاء"}
            </Button>
            {!result && (
              <Button size="sm" onClick={upload} disabled={!file || uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "جارٍ الاستيراد…" : "بدء الاستيراد"}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg bg-surface-sunken py-2">
      <p className={cn("text-lg font-bold", color || "text-fg")}>{value}</p>
      <p className="text-[11px] text-fg-subtle">{label}</p>
    </div>
  );
}
