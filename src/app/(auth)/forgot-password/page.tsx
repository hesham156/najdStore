"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setSent(true); // never reveal errors
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-[420px]">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <span className="text-white/60 text-xs font-medium tracking-wide">نجد برنت</span>
            <h1 className="text-xl font-bold text-white mt-2">استعادة كلمة المرور</h1>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
              <p className="text-sm text-white/70 leading-relaxed">
                إذا كان هناك حساب مرتبط بهذا البريد، فقد أرسلنا إليه رابط إعادة تعيين كلمة المرور. تحقّق من صندوق الوارد (والبريد المزعج).
              </p>
              <Link href="/login" className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300">
                <ArrowRight className="h-4 w-4" /> العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-white/50 leading-relaxed">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.</p>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">البريد الإلكتروني</label>
                <div className="relative">
                  <span className="absolute inset-y-0 end-3 flex items-center text-white/30"><Mail className="h-4 w-4" /></span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    autoComplete="email"
                    className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 px-3 py-2.5 pe-9 outline-none focus:border-primary-500/60"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary-600 to-primary-800 hover:from-primary-400 hover:to-primary-600 disabled:opacity-60"
              >
                {loading ? "جارٍ الإرسال…" : "إرسال رابط الاستعادة"}
              </button>
              <div className="text-center">
                <Link href="/login" className="text-xs text-white/40 hover:text-white/70">العودة لتسجيل الدخول</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
