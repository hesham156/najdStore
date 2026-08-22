"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Plus, Trash2, Save, Table2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/admin/PageHeader";

interface OptionDraft { nameAr: string; required: boolean; values: string[] }
interface VariantCell { price: string; comparePrice: string; sku: string; stockCount: string; isActive: boolean }

const emptyCell = (): VariantCell => ({ price: "", comparePrice: "", sku: "", stockCount: "", isActive: true });

/** Cartesian product of value indices across options */
function cartesian(sizes: number[]): number[][] {
  return sizes.reduce<number[][]>(
    (acc, size) => {
      const res: number[][] = [];
      for (const combo of acc) for (let i = 0; i < size; i++) res.push([...combo, i]);
      return res;
    },
    [[]],
  );
}

export default function ProductOptionsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productName, setProductName] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>([]);
  // key = combo value-labels joined by "|"
  const [priceMap, setPriceMap] = useState<Record<string, VariantCell>>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products/${params.id}/options`).then((r) => r.json()),
      fetch(`/api/admin/products/${params.id}`).then((r) => r.json()).catch(() => null),
    ]).then(([res, prod]) => {
      if (prod?.success && prod.data) setProductName(prod.data.nameAr || prod.data.name || "");
      if (res?.success && res.data) {
        const opts: OptionDraft[] = res.data.options.map((o: any) => ({
          nameAr: o.nameAr,
          required: o.required,
          values: o.values.map((v: any) => v.labelAr),
        }));
        setOptions(opts);

        // Rebuild priceMap from stored variants
        const labelOfValue: Record<string, string> = {};
        const optionOfValue: Record<string, number> = {};
        res.data.options.forEach((o: any, oi: number) => {
          o.values.forEach((v: any) => { labelOfValue[v.id] = v.labelAr; optionOfValue[v.id] = oi; });
        });
        const map: Record<string, VariantCell> = {};
        for (const v of res.data.variants as any[]) {
          const perOption: string[] = new Array(opts.length).fill("");
          for (const id of v.optionValueIds) {
            const oi = optionOfValue[id];
            if (oi !== undefined) perOption[oi] = labelOfValue[id];
          }
          if (perOption.every(Boolean)) {
            map[perOption.join("|")] = {
              price: v.price != null ? String(v.price) : "",
              comparePrice: v.comparePrice != null ? String(v.comparePrice) : "",
              sku: v.sku || "",
              stockCount: v.stockCount != null ? String(v.stockCount) : "",
              isActive: v.isActive !== false,
            };
          }
        }
        setPriceMap(map);
      }
    }).finally(() => setLoading(false));
  }, [params.id]);

  /* ── Option editing ── */
  const addOption = () => setOptions((o) => [...o, { nameAr: "", required: true, values: [""] }]);
  const removeOption = (i: number) => setOptions((o) => o.filter((_, idx) => idx !== i));
  const setOption = (i: number, patch: Partial<OptionDraft>) =>
    setOptions((o) => o.map((opt, idx) => (idx === i ? { ...opt, ...patch } : opt)));
  const addValue = (i: number) => setOption(i, { values: [...options[i].values, ""] });
  const setValue = (i: number, vi: number, val: string) =>
    setOption(i, { values: options[i].values.map((v, idx) => (idx === vi ? val : v)) });
  const removeValue = (i: number, vi: number) =>
    setOption(i, { values: options[i].values.filter((_, idx) => idx !== vi) });

  /* ── Matrix ── */
  const cleanOptions = useMemo(
    () => options.map((o) => ({ ...o, values: o.values.map((v) => v.trim()).filter(Boolean) }))
      .filter((o) => o.nameAr.trim() && o.values.length > 0),
    [options],
  );

  const combos = useMemo(() => {
    if (cleanOptions.length === 0) return [];
    return cartesian(cleanOptions.map((o) => o.values.length));
  }, [cleanOptions]);

  const keyOf = useCallback(
    (combo: number[]) => combo.map((vi, oi) => cleanOptions[oi].values[vi]).join("|"),
    [cleanOptions],
  );

  const cellOf = (combo: number[]): VariantCell => priceMap[keyOf(combo)] || emptyCell();
  const setCell = (combo: number[], patch: Partial<VariantCell>) => {
    const k = keyOf(combo);
    setPriceMap((m) => ({ ...m, [k]: { ...(m[k] || emptyCell()), ...patch } }));
  };

  const tooMany = combos.length > 300;

  /* ── Save ── */
  const handleSave = async () => {
    for (const o of cleanOptions) {
      if (new Set(o.values).size !== o.values.length) {
        toast.error(`قيم الخيار "${o.nameAr}" مكررة`);
        return;
      }
    }
    if (tooMany) { toast.error("عدد التركيبات كبير جداً — قلّل الخيارات"); return; }

    setSaving(true);
    const payload = {
      options: cleanOptions.map((o) => ({
        nameAr: o.nameAr.trim(),
        required: o.required,
        values: o.values.map((labelAr) => ({ labelAr })),
      })),
      variants: combos.map((combo) => {
        const c = cellOf(combo);
        return {
          valueIdx: combo,
          price: parseFloat(c.price) || 0,
          comparePrice: c.comparePrice ? parseFloat(c.comparePrice) : null,
          sku: c.sku || null,
          stockCount: c.stockCount ? parseInt(c.stockCount, 10) : 0,
          isActive: c.isActive,
        };
      }),
    };

    const res = await fetch(`/api/admin/products/${params.id}/options`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) toast.success("تم حفظ الخيارات والأسعار ✓");
    else toast.error(data.error || "حدث خطأ");
    setSaving(false);
  };

  if (loading) {
    return <div className="animate-pulse space-y-4 max-w-4xl">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-card skeleton" />)}</div>;
  }

  return (
    <div className="animate-fade-in max-w-5xl space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/admin" },
          { label: "المنتجات", href: "/admin/products" },
          { label: productName || "المنتج", href: `/admin/products/${params.id}` },
          { label: "الخيارات والأسعار" },
        ]}
        title="الخيارات والأسعار"
        description={productName || undefined}
        actions={
          <Button onClick={handleSave} loading={saving} icon={<Save className="h-4 w-4" />}>
            حفظ
          </Button>
        }
      />

      {/* Options builder */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-fg">الخيارات</h2>
          <Button variant="outline" size="sm" onClick={addOption}><Plus className="h-4 w-4" />إضافة خيار</Button>
        </div>

        {options.length === 0 && (
          <p className="text-sm text-fg-muted py-6 text-center">
            لا توجد خيارات بعد. أضف خيارات مثل "الكمية" و"التصميم" وكل خيار له قيم متعددة.
          </p>
        )}

        {options.map((opt, i) => (
          <div key={i} className="rounded-2xl border border-line p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Input
                label="اسم الخيار"
                value={opt.nameAr}
                onChange={(e) => setOption(i, { nameAr: e.target.value })}
                placeholder="مثال: الكمية"
                className="flex-1"
              />
              <label className="flex items-center gap-2 text-sm text-fg-muted mt-6 shrink-0">
                <input type="checkbox" checked={opt.required} onChange={(e) => setOption(i, { required: e.target.checked })} className="h-4 w-4 rounded" />
                إلزامي
              </label>
              <button onClick={() => removeOption(i)} className="mt-6 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0" title="حذف الخيار">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-fg-muted">القيم</p>
              {opt.values.map((val, vi) => (
                <div key={vi} className="flex items-center gap-2">
                  <input
                    value={val}
                    onChange={(e) => setValue(i, vi, e.target.value)}
                    placeholder={`قيمة ${vi + 1} (مثال: 100 حبة)`}
                    className="flex-1 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button onClick={() => removeValue(i, vi)} className="p-2 text-fg-subtle hover:text-red-500 shrink-0" title="حذف القيمة">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => addValue(i)}><Plus className="h-3.5 w-3.5" />إضافة قيمة</Button>
            </div>
          </div>
        ))}
      </Card>

      {/* Variants matrix */}
      {combos.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold text-fg flex items-center gap-2">
              <Table2 className="h-5 w-5 text-primary-600" /> مصفوفة الأسعار
              <span className="text-xs font-normal text-fg-subtle">({combos.length} تركيبة)</span>
            </h2>
          </div>

          {tooMany ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0" /> عدد التركيبات ({combos.length}) كبير جداً. قلّل عدد الخيارات أو القيم.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-start text-xs text-fg-muted border-b border-line">
                    {cleanOptions.map((o) => <th key={o.nameAr} className="p-2 text-start font-semibold">{o.nameAr}</th>)}
                    <th className="p-2 text-start font-semibold">السعر *</th>
                    <th className="p-2 text-start font-semibold">قبل الخصم</th>
                    <th className="p-2 text-start font-semibold">SKU</th>
                    <th className="p-2 text-start font-semibold">المخزون</th>
                    <th className="p-2 text-center font-semibold">مفعّل</th>
                  </tr>
                </thead>
                <tbody>
                  {combos.map((combo, ri) => {
                    const cell = cellOf(combo);
                    return (
                      <tr key={ri} className="border-b border-line">
                        {combo.map((vi, oi) => (
                          <td key={oi} className="p-2 font-medium text-fg whitespace-nowrap">{cleanOptions[oi].values[vi]}</td>
                        ))}
                        <td className="p-1"><input type="number" value={cell.price} onChange={(e) => setCell(combo, { price: e.target.value })} placeholder="0" className="w-24 rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></td>
                        <td className="p-1"><input type="number" value={cell.comparePrice} onChange={(e) => setCell(combo, { comparePrice: e.target.value })} placeholder="—" className="w-24 rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></td>
                        <td className="p-1"><input value={cell.sku} onChange={(e) => setCell(combo, { sku: e.target.value })} placeholder="—" className="w-24 rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></td>
                        <td className="p-1"><input type="number" value={cell.stockCount} onChange={(e) => setCell(combo, { stockCount: e.target.value })} placeholder="0" className="w-20 rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></td>
                        <td className="p-1 text-center"><input type="checkbox" checked={cell.isActive} onChange={(e) => setCell(combo, { isActive: e.target.checked })} className="h-4 w-4 rounded" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-fg-subtle">السعر النهائي للعميل يتحدد حسب التركيبة المختارة. التركيبات غير المفعّلة لا تظهر للعميل.</p>
        </Card>
      )}

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} loading={saving} size="lg"><Save className="h-4 w-4" />حفظ الخيارات والأسعار</Button>
      </div>
    </div>
  );
}
