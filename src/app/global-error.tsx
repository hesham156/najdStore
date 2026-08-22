"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort boundary: catches failures in the ROOT layout itself, where no
 * other boundary exists. It replaces the root layout entirely, so it must
 * render its own <html>/<body> and can rely on nothing but the stylesheet.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root] layout render failed:", error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="flex min-h-screen items-center justify-center px-4 py-16">
          <div className="w-full max-w-md space-y-5 rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <h1 className="text-lg font-bold text-gray-900">حدث خطأ غير متوقّع</h1>
            <p className="text-sm leading-relaxed text-gray-500">
              تعذّر تحميل الموقع. جرّب إعادة المحاولة بعد قليل.
            </p>
            {error.digest && (
              <p className="mx-auto inline-block rounded-lg bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-500" dir="ltr">
                {error.digest}
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
