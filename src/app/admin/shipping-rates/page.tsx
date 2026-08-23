"use client";

import { useCallback, useEffect, useState } from "react";
import { Truck, Plus, Trash2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Switch } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface Rate {
  id: string;
  city: string;
  cost: number | string;
  isActive: boolean;
}

export default function ShippingRatesPage() {
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("");
  const [cost, setCost] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shipping-rates");
      const data = await res.json();
      if (data.success) setRates(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!city.trim()) return toast.error("أدخل اسم المدينة");
    const c = parseFloat(cost);
    if (!Number.isFinite(c) || c < 0) return toast.error("أدخل قيمة رسوم صحيحة");
    setAdding(true);
    try {
      const res = await fetch("/api/admin/shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: city.trim(), cost: c }),
      });
      const data = await res.json();
      if (data.success) { toast.success("تمت الإضافة"); setCity(""); setCost(""); load(); }
      else toast.error(data.error || "تعذّرت الإضافة");
    } finally { setAdding(false); }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/shipping-rates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.success) toast.error(data.error || "تعذّر الحفظ");
    else load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/shipping-rates/${id}`, { method: "DELETE" });
    setRates((r) => r.filter((x) => x.id !== id));
    toast.success("تم الحذف");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="رسوم الشحن حسب المدينة"
        description="حدّد رسوم شحن مختلفة لكل مدينة. المدن غير المُدرجة تُطبَّق عليها الرسوم الثابتة من الإعدادات."
      />

      {/* Add form */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <Input label="المدينة" value={city} onChange={(e) => setCity(e.target.value)} placeholder="مثال: الرياض" />
          </div>
          <div className="w-full sm:w-40">
            <Input label="الرسوم (ر.س)" type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} placeholder="25" />
          </div>
          <Button onClick={add} loading={adding}>
            <Plus className="h-4 w-4" /> إضافة
          </Button>
        </div>
      </Card>

      {/* List */}
      {!loading && rates.length === 0 ? (
        <EmptyState icon={Truck} title="لا توجد رسوم مدن" description="أضِف مدينة أعلاه لتحديد رسوم شحن خاصة بها." />
      ) : (
        <Card padding="none" className="divide-y divide-line/60">
          {rates.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <MapPin className="h-4 w-4 text-primary-500 shrink-0" />
              <span className="flex-1 font-medium text-sm">{r.city}</span>

              <div className="w-28">
                <Input
                  type="number"
                  min={0}
                  defaultValue={String(Number(r.cost))}
                  onBlur={(e) => {
                    const v = parseFloat(e.target.value);
                    if (Number.isFinite(v) && v >= 0 && v !== Number(r.cost)) patch(r.id, { cost: v });
                  }}
                />
              </div>
              <span className="text-xs text-fg-subtle w-16 text-center">{formatCurrency(Number(r.cost))}</span>

              <Switch checked={r.isActive} onChange={(v) => patch(r.id, { isActive: v })} />

              <Button size="sm" variant="soft-danger" onClick={() => remove(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
