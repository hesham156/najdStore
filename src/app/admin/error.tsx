"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertOctagon, ArrowLeft, Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Error boundary for every admin page.
 *
 * In production Next.js hides the real message and gives the browser only a
 * `digest`. That digest is printed alongside the full stack in the server
 * logs, so we surface it prominently — it is the only way to correlate what
 * the user saw with what actually failed.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Also put it in the browser console for anyone with devtools open.
    console.error("[admin] render failed:", error);
  }, [error]);

  const copyDigest = () => {
    if (!error.digest) return;
    navigator.clipboard
      ?.writeText(error.digest)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {
        /* clipboard blocked — the digest is visible on screen anyway */
      });
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg space-y-5 text-center">
        <div className="flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
            <AlertOctagon className="h-6 w-6" aria-hidden />
          </span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-base font-bold text-fg">تعذّر عرض هذه الصفحة</h1>
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-fg-muted">
            حدث خطأ أثناء تجهيز البيانات على الخادم. لم يتأثّر أي شيء في متجرك — جرّب إعادة المحاولة، وإن تكرّر الخطأ
            أرسل الرمز أدناه لفريق الدعم.
          </p>
        </div>

        {error.digest && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-fg-subtle">رمز الخطأ</p>
            <button
              type="button"
              onClick={copyDigest}
              aria-label={`نسخ رمز الخطأ ${error.digest}`}
              className="group mx-auto inline-flex items-center gap-2 rounded-lg border border-line bg-surface-sunken px-3 py-1.5 font-mono text-xs text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              dir="ltr"
            >
              {error.digest}
              {copied ? (
                <Check className="h-3.5 w-3.5 text-success" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5 opacity-50" aria-hidden />
              )}
            </button>
            <p className="text-[11px] text-fg-subtle">ابحث عن هذا الرمز في سجلّات الخادم لتجد الخطأ الكامل.</p>
          </div>
        )}

        {/* The real message only exists outside production builds. */}
        {process.env.NODE_ENV !== "production" && error.message && (
          <pre
            className="max-h-40 overflow-auto rounded-control border border-line bg-surface-sunken p-3 text-start font-mono text-[11px] leading-relaxed text-danger"
            dir="ltr"
          >
            {error.message}
          </pre>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Button onClick={reset} icon={<RefreshCw className="h-4 w-4" />}>
            إعادة المحاولة
          </Button>
          <Link href="/admin">
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />}>
              العودة إلى لوحة التحكم
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
