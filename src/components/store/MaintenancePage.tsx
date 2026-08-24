import Link from "next/link";
import { SiteLogo } from "@/components/ui/site-logo";
import { Wrench, Clock, Mail } from "lucide-react";

export function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Background rings */}
      <style>{`
        @keyframes m-spin    { to { transform: rotate(360deg);  } }
        @keyframes m-spin-rv { to { transform: rotate(-360deg); } }
        .m-cw  { animation: m-spin    80s linear infinite; }
        .m-ccw { animation: m-spin-rv 80s linear infinite; }
      `}</style>

      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ perspective: "1200px", transform: "perspective(1200px) rotateX(10deg)", transformOrigin: "center center" }}>
        <div className="absolute inset-0 m-cw">
          <div className="absolute top-1/2 left-1/2" style={{ width: 1200, height: 1200, transform: "translate(-50%,-50%)" }}>
            <img src="https://framerusercontent.com/images/oqZEqzDEgSLygmUDuZAYNh2XQ9U.png?scale-down-to=2048" alt=""
              className="w-full h-full object-cover"
              style={{ filter: "hue-rotate(250deg) saturate(2) brightness(0.5)" }} />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 70%)" }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Logo */}
        <SiteLogo size="xl" className="mb-8 shadow-2xl shadow-primary-900/60" />

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
          <Wrench className="h-10 w-10 text-brand" />
        </div>

        <h1 className="text-4xl font-black text-white mb-3">
          تحت الصيانة
        </h1>
        <p className="text-white/50 text-lg leading-relaxed mb-8">
          نقوم حالياً بتحديث المنصة لتقديم تجربة أفضل لك.
          <br />سنعود قريباً!
        </p>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            <p className="text-xs text-white/50">العودة المتوقعة</p>
            <p className="text-sm font-bold text-white">قريباً</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col items-center gap-2">
            <Mail className="h-5 w-5 text-info" />
            <p className="text-xs text-white/50">للتواصل</p>
            <p className="text-sm font-bold text-white">راسلنا</p>
          </div>
        </div>

        <Link
          href="/login"
          className="text-xs text-white/20 hover:text-white/40 transition-colors"
        >
          دخول الإدارة
        </Link>
      </div>
    </div>
  );
}
