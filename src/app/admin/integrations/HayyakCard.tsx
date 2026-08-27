"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Switch } from "@/components/ui/Input";
import { CheckCircle2, XCircle, Zap, RefreshCw, Unplug, Save } from "lucide-react";

export type HayyakStatus = {
  enabled: boolean;
  hasSecret: boolean;
  storeId: string;
  baseUrl: string;
  catalogUrl: string;
  eventsUrl: string;
};

const EVENTS = [
  "إنشاء/تحديث/حذف منتج → مزامنة الكتالوج",
  "إنشاء طلب → تأكيد واتساب للعميل",
  "تغيّر حالة الطلب → إشعار واتساب",
  "سلة متروكة → تذكير واتساب + إشعار التاجر",
];

export function HayyakCard({ initial }: { initial: HayyakStatus }) {
  const [status, setStatus] = useState<HayyakStatus>(initial);
  const [storeId, setStoreId] = useState(initial.storeId);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [secret, setSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const busy = saving || syncing || disconnecting;

  async function patch(payload: Record<string, unknown>, okMsg?: string) {
    const res = await fetch("/api/admin/hayyak/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.data) setStatus(data.data);
    if (!data.success) {
      toast.error(data.error || "تعذّر الحفظ");
      return false;
    }
    if (okMsg) toast.success(okMsg);
    return true;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const ok = await patch(
        { storeId, baseUrl, ...(secret.trim() ? { signingSecret: secret.trim() } : {}) },
        "تم حفظ الإعداد"
      );
      if (ok) setSecret("");
    } catch {
      toast.error("تعذّر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(next: boolean) {
    // حفظ أي مفتاح مُدخل مع التبديل حتى لا يفشل التفعيل بسبب غياب المفتاح.
    setSaving(true);
    try {
      await patch(
        { enabled: next, storeId, baseUrl, ...(secret.trim() ? { signingSecret: secret.trim() } : {}) },
        next ? "تم تفعيل حياك" : "تم إيقاف حياك"
      );
      if (secret.trim()) setSecret("");
    } catch {
      toast.error("تعذّر الاتصال بالخادم");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("إلغاء ربط حياك سيوقف الإرسال ويمسح مفتاح التوقيع المخزَّن. متابعة؟")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/admin/hayyak/config", { method: "DELETE" });
      const data = await res.json();
      if (data.data) setStatus(data.data);
      if (data.success) {
        setSecret("");
        toast.success(data.message || "تم إلغاء الربط");
      } else {
        toast.error(data.error || "تعذّر إلغاء الربط");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم");
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/hayyak/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) toast.success(data.message || "تمت المزامنة مع حياك");
      else toast.error(data.error || "فشل المزامنة");
    } catch {
      toast.error("تعذّر الاتصال بالخادم");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-fg">حياك (Hayyak)</h2>
            <p className="text-xs text-fg-muted">
              المساعد الذكي، الردود التلقائية، واسترجاع السلات المتروكة عبر واتساب
            </p>
          </div>
        </div>

        {status.enabled ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success shrink-0">
            <CheckCircle2 className="h-4 w-4" /> مفعّل
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-subtle shrink-0">
            <XCircle className="h-4 w-4" /> غير مفعّل
          </span>
        )}
      </div>

      {/* Enable toggle */}
      <div className="rounded-control border border-line bg-surface-muted px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-fg">تفعيل التكامل</p>
          <p className="text-xs text-fg-muted">
            عند الإيقاف يتوقّف إرسال كل الأحداث إلى حياك فوراً.
          </p>
        </div>
        <Switch
          checked={status.enabled}
          onChange={handleToggle}
          disabled={busy || (!status.enabled && !status.hasSecret && !secret.trim())}
          aria-label="تفعيل تكامل حياك"
        />
      </div>

      {!status.hasSecret && (
        <div className="rounded-control border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-fg">
          أدخل <span className="font-semibold">مفتاح التوقيع</span> من لوحة حياك ثم احفظ لتتمكّن من التفعيل.
        </div>
      )}

      {/* Config form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="معرّف المتجر في حياك"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          placeholder="pexelco"
          dir="ltr"
          disabled={busy}
        />
        <Input
          label="مفتاح التوقيع (signing secret)"
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={status.hasSecret ? "•••••••• (محفوظ — اتركه فارغاً للإبقاء عليه)" : "whsec_..."}
          hint={status.hasSecret ? "أدخل قيمة جديدة فقط لتغيير المفتاح." : "يظهر مرة واحدة في لوحة حياك."}
          dir="ltr"
          disabled={busy}
        />
        <Input
          label="عنوان حياك (اختياري)"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://7ayak.app"
          dir="ltr"
          wrapperClassName="sm:col-span-2"
          disabled={busy}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} loading={saving} disabled={busy}>
          <Save className="h-4 w-4" />
          حفظ الإعداد
        </Button>
        {(status.hasSecret || status.enabled) && (
          <Button variant="ghost" onClick={handleDisconnect} loading={disconnecting} disabled={busy} className="text-danger">
            <Unplug className="h-4 w-4" />
            إلغاء الربط
          </Button>
        )}
      </div>

      {/* Connection endpoints */}
      <dl className="grid grid-cols-1 gap-3 text-sm border-t border-line pt-4">
        <div className="rounded-xl bg-surface-muted px-4 py-3 min-w-0">
          <dt className="text-xs text-fg-subtle mb-1">نقطة الكتالوج</dt>
          <dd className="font-mono text-fg text-xs break-all">{status.catalogUrl}</dd>
        </div>
        <div className="rounded-xl bg-surface-muted px-4 py-3 min-w-0">
          <dt className="text-xs text-fg-subtle mb-1">نقطة الأحداث</dt>
          <dd className="font-mono text-fg text-xs break-all">{status.eventsUrl}</dd>
        </div>
      </dl>

      {/* Events sent */}
      <div>
        <p className="text-sm font-semibold text-fg mb-2">الأحداث المُرسَلة تلقائياً</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-fg-muted">
          {EVENTS.map((t) => (
            <li key={t} className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Full sync */}
      <div className="pt-4 border-t border-line flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-fg-muted max-w-sm">
          المزامنة الكاملة ترفع الكتالوج + الطلبات الأخيرة + السلات النشطة، فيتعرّف حياك على
          عملائك الحاليين. استخدمها عند الربط أول مرة أو بعد أي تغيير كبير.
        </p>
        <Button variant="secondary" onClick={handleSync} loading={syncing} disabled={busy || !status.enabled}>
          <RefreshCw className="h-4 w-4" />
          مزامنة كاملة الآن
        </Button>
      </div>
    </Card>
  );
}
