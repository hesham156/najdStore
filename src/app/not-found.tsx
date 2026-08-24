import Link from "next/link";
import { Home, ShoppingBag, Headphones, ArrowRight, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950/20 flex items-center justify-center px-4 py-16" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary-500/5 dark:bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary-500/5 dark:bg-primary-500/5 rounded-full blur-3xl" />
        {/* Subtle grid */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 text-center max-w-xl mx-auto">

        {/* Giant 404 */}
        <div className="relative mb-4 select-none">
          <p
            className="text-[180px] sm:text-[220px] font-black leading-none tracking-tighter"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 4px 24px rgba(124,58,237,0.18))",
            }}
          >
            404
          </p>
          {/* Shadow text */}
          <p
            className="absolute inset-0 text-[180px] sm:text-[220px] font-black leading-none tracking-tighter text-gray-100 dark:text-gray-800/60 -z-10 translate-y-2"
            aria-hidden
          >
            404
          </p>
        </div>

        {/* Emoji */}
        <div className="flex justify-center mb-6">
          <span
            className="text-6xl"
            style={{ animation: "float 3s ease-in-out infinite" }}
          >
            🔍
          </span>
        </div>

        {/* Text */}
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-3">
          الصفحة غير موجودة
        </h1>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-10 max-w-sm mx-auto">
          يبدو أن هذه الصفحة انتقلت إلى مكان آخر — أو ربما لم تكن موجودة أصلاً. دعنا نعيدك إلى المسار الصحيح.
        </p>

        {/* Action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <Link
            href="/"
            className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-200"
          >
            <div className="w-11 h-11 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Home className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">الرئيسية</span>
          </Link>

          <Link
            href="/products"
            className="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-4 transition-all duration-200 hover:border-brand/40 hover:shadow-lg hover:shadow-primary-500/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-control bg-brand/10 transition-transform group-hover:scale-110">
              <ShoppingBag className="h-5 w-5 text-brand" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">المنتجات</span>
          </Link>

          <Link
            href="/contact"
            className="group flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-4 transition-all duration-200 hover:border-brand/40 hover:shadow-lg hover:shadow-primary-500/10"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-control bg-brand/10 transition-transform group-hover:scale-110">
              <Headphones className="h-5 w-5 text-brand" />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">الدعم</span>
          </Link>
        </div>

        {/* Primary button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-800 text-white font-bold text-sm shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <Home className="h-4 w-4" />
          العودة للرئيسية
          <ArrowRight className="h-4 w-4" />
        </Link>

      </div>

      {/* Float animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
