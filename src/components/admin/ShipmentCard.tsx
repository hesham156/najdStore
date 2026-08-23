"use client";

import { useState, useEffect } from "react";
import { Truck, RefreshCw, FileText, ExternalLink, X, PackageCheck } from "lucide-react";
import { Section } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import toast from "react-hot-toast";

interface Shipment {
  id: string;
  carrier: string;
  carrierId?: string | null;
  trackingNumber?: string | null;
  labelUrl?: string | null;
  trackingUrl?: string | null;
  status: string;
  codAmount?: number | string;
}

interface OrderLite {
  id: string;
  shipName?: string | null;
  shipPhone?: string | null;
  shipCity?: string | null;
  shipAddress?: string | null;
  user: { name: string; phone?: string | null };
  shipment?: Shipment | null;
}

const STATUS_STYLE: Record<string, "success" | "danger" | "warning" | "info" | "default"> = {
  DELIVERED: "success",
  CANCELLED: "danger",
  RETURNED: "danger",
  CREATED: "info",
};

interface CarrierInfo { id: string; label: string }

export function ShipmentCard({ order, onChange }: { order: OrderLite; onChange: () => void }) {
  const shipment = order.shipment;
  const [loading, setLoading] = useState<string | null>(null);
  const [carriers, setCarriers] = useState<CarrierInfo[]>([]);
  const [carrier, setCarrier] = useState<string>("");
  const [form, setForm] = useState({
    shipName: order.shipName || order.user.name || "",
    shipPhone: order.shipPhone || order.user.phone || "",
    shipCity: order.shipCity || "",
    shipAddress: order.shipAddress || "",
    shipPostal: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (shipment) return; // no need to pick a carrier for an existing shipment
    fetch("/api/admin/shipping/carriers")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCarriers(d.data);
          if (d.data.length > 0) setCarrier(d.data[0].id);
        }
      })
      .catch(() => {});
  }, [shipment]);

  const create = async () => {
    if (!carrier) return toast.error("لا توجد شركة شحن مفعّلة");
    if (!form.shipName.trim()) return toast.error("اسم المستلم مطلوب");
    if (!form.shipPhone.trim()) return toast.error("جوال المستلم مطلوب");
    setLoading("create");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, carrier }),
      });
      const data = await res.json();
      const label = carriers.find((c) => c.id === carrier)?.label || carrier;
      if (data.success) { toast.success(`تم إنشاء الشحنة عبر ${label} ✓`); onChange(); }
      else toast.error(data.error || "تعذّر إنشاء الشحنة");
    } catch { toast.error("حدث خطأ أثناء إنشاء الشحنة"); }
    finally { setLoading(null); }
  };

  const refresh = async () => {
    setLoading("refresh");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/shipment`);
      const data = await res.json();
      if (data.success) { toast.success("تم تحديث حالة الشحنة"); onChange(); }
      else toast.error(data.error || "تعذّر التحديث");
    } catch { toast.error("حدث خطأ"); }
    finally { setLoading(null); }
  };

  const cancel = async () => {
    if (!confirm("هل تريد إلغاء الشحنة؟")) return;
    setLoading("cancel");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/shipment/cancel`, { method: "POST" });
      const data = await res.json();
      if (data.success) { toast.success("تم إلغاء الشحنة"); onChange(); }
      else toast.error(data.error || "تعذّر الإلغاء");
    } catch { toast.error("حدث خطأ"); }
    finally { setLoading(null); }
  };

  return (
    <Section title="الشحن (RedBox)" contentClassName="pt-0 space-y-3">
      {shipment ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Truck className="h-4 w-4 text-orange-500" /> {shipment.carrier}
            </span>
            <Badge variant={STATUS_STYLE[shipment.status] || "default"}>{shipment.status}</Badge>
          </div>

          <dl className="space-y-1.5 text-[13px]">
            {shipment.trackingNumber && (
              <div className="flex justify-between gap-2">
                <dt className="text-fg-subtle">رقم التتبع</dt>
                <dd className="font-mono text-fg">{shipment.trackingNumber}</dd>
              </div>
            )}
            {shipment.carrierId && (
              <div className="flex justify-between gap-2">
                <dt className="text-fg-subtle">معرّف RedBox</dt>
                <dd className="truncate font-mono text-[11px] text-fg">{shipment.carrierId}</dd>
              </div>
            )}
            {shipment.codAmount !== undefined && Number(shipment.codAmount) > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-fg-subtle">الدفع عند الاستلام</dt>
                <dd className="text-fg">{Number(shipment.codAmount).toFixed(2)} ر.س</dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="secondary" onClick={refresh} loading={loading === "refresh"}>
              <RefreshCw className="h-3.5 w-3.5" /> تحديث الحالة
            </Button>
            {shipment.labelUrl && (
              <a href={shipment.labelUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="secondary"><FileText className="h-3.5 w-3.5" /> البوليصة</Button>
              </a>
            )}
            {shipment.trackingUrl && (
              <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="secondary"><ExternalLink className="h-3.5 w-3.5" /> صفحة التتبع</Button>
              </a>
            )}
            {shipment.status !== "CANCELLED" && (
              <Button size="sm" variant="soft-danger" onClick={cancel} loading={loading === "cancel"}>
                <X className="h-3.5 w-3.5" /> إلغاء الشحنة
              </Button>
            )}
          </div>
        </div>
      ) : carriers.length === 0 ? (
        <p className="text-[13px] text-fg-muted">
          لا توجد شركة شحن مفعّلة. فعّل RedBox أو DHL من <span className="font-medium text-fg">الإعدادات ← الشحن</span>.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Carrier selector (shown when more than one carrier is enabled) */}
          {carriers.length > 1 ? (
            <div>
              <label className="block text-xs font-medium text-fg-subtle mb-1">شركة الشحن</label>
              <div className="flex gap-2">
                {carriers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCarrier(c.id)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      carrier === c.id
                        ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                        : "border-line text-fg-muted hover:border-primary-300"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-fg-muted">
              أنشئ شحنة عبر <span className="font-medium text-fg">{carriers[0]?.label}</span> لهذا الطلب. تأكد من بيانات المستلم.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input label="اسم المستلم" value={form.shipName} onChange={(e) => set("shipName", e.target.value)} />
            <Input label="جوال المستلم" value={form.shipPhone} onChange={(e) => set("shipPhone", e.target.value)} />
            <Input label="المدينة" value={form.shipCity} onChange={(e) => set("shipCity", e.target.value)} />
            <Input label="العنوان" value={form.shipAddress} onChange={(e) => set("shipAddress", e.target.value)} />
            {carrier === "DHL" && (
              <Input label="الرمز البريدي (DHL)" value={form.shipPostal} onChange={(e) => set("shipPostal", e.target.value)} />
            )}
          </div>
          <Button size="sm" onClick={create} loading={loading === "create"} fullWidth>
            <PackageCheck className="h-4 w-4" /> إنشاء الشحنة
          </Button>
        </div>
      )}
    </Section>
  );
}
