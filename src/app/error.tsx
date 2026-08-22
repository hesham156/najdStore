"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, Home, RefreshCw } from "lucide-react";

/**
 * Root-segment error boundary.
 *
 * Catches failures that the per-section boundaries cannot — notably errors
 * thrown inside a section's own `layout.tsx` (a segment's error.tsx never
 * catches its own layout). Deliberately dependency-free: if a layout is what
 * failed, its providers may not be mounted.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render failed:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16" dir="rtl">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertOctagon className="h-6 w-6" aria-hidden />
          </span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">حدث خطأ غير متوقّع</h1>
          <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            تعذّر تحميل الصفحة. جرّب إعادة المحاولة، وإن استمرّ الخطأ أرسل الرمز أدناه لفريق الدعم.
          </p>
        </div>

        {error.digest && (
          <p
            className="mx-auto inline-block rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            dir="ltr"
          >
            {error.digest}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            إعادة المحاولة
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Home className="h-4 w-4" aria-hidden />
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
