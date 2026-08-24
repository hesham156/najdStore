import { Card } from "@/components/ui/Card";
import { getHayyakStatus } from "@/lib/hayyak";
import { HayyakSyncButton } from "./HayyakSyncButton";
import { CheckCircle2, XCircle, Zap } from "lucide-react";
import { PageHeader } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export const metadata = { title: "التكاملات" };

export default function IntegrationsPage() {
  const hayyak = getHayyakStatus();

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageHeader className="mb-6" title="التكاملات" description="ربط المتجر بالخدمات الخارجية" />

      {/* Hayyak card */}
      <Card className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-fg">حياك (Hayyak)</h2>
              <p className="text-xs text-fg-muted">المساعد الذكي، الردود التلقائية، واسترجاع السلات المتروكة عبر واتساب</p>
            </div>
          </div>

          {hayyak.enabled ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success shrink-0">
              <CheckCircle2 className="h-4 w-4" /> مفعّل
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-subtle shrink-0">
              <XCircle className="h-4 w-4" /> غير مفعّل
            </span>
          )}
        </div>

        {!hayyak.enabled && (
          <div className="rounded-control border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-fg">
            التكامل غير مفعّل. اضبط متغيّر البيئة{" "}
            <code className="rounded bg-warning/20 px-1.5 py-0.5 font-mono">HAYYAK_SIGNING_SECRET</code>{" "}
            بمفتاح التوقيع من لوحة حياك، ثم أعد تشغيل الخادم.
          </div>
        )}

        {/* Connection details */}
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <dt className="text-xs text-fg-subtle mb-1">معرّف المتجر</dt>
            <dd className="font-mono text-fg">{hayyak.storeId}</dd>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3 sm:col-span-2 min-w-0">
            <dt className="text-xs text-fg-subtle mb-1">نقطة الكتالوج</dt>
            <dd className="font-mono text-fg text-xs break-all">{hayyak.catalogUrl}</dd>
          </div>
        </dl>

        {/* Events sent */}
        <div>
          <p className="text-sm font-semibold text-fg mb-2">الأحداث المُرسَلة تلقائياً</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-fg-muted">
            {[
              "إنشاء/تحديث/حذف منتج → مزامنة الكتالوج",
              "إنشاء طلب → تأكيد واتساب للعميل",
              "تغيّر حالة الطلب → إشعار واتساب",
              "رفع إثبات الدفع → تحديث الحالة",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Sync action */}
        <div className="pt-2 border-t border-line flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-fg-muted max-w-sm">
            ارفع الكتالوج الكامل عند الربط أول مرة أو بعد أي تغيير كبير في المنتجات. يستبدل الكتالوج المخزَّن في حياك بالكامل.
          </p>
          <HayyakSyncButton disabled={!hayyak.enabled} />
        </div>
      </Card>
    </div>
  );
}
