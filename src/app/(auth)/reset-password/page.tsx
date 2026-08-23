"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    if (password !== confirm) return setError("كلمتا المرور غير متطابقتين");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        toast.success("تم تغيير كلمة المرور");
        setTimeout(() => router.push("/login"), 1800);
      } else {
        setError(data.error || "تعذّر تغيير كلمة المرور");
      }
    } catch {
      setError("حدث خطأ. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-sm text-white/70">الرابط غير صالح أو ناقص.</p>
        <Link href="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300">اطلب رابطاً جديداً</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
        <p className="text-sm text-white/70">تم تغيير كلمة المرور بنجاح. جارٍ تحويلك لتسجيل الدخول…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-white/50 leading-relaxed">أدخل كلمة مرور جديدة لحسابك.</p>
      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">كلمة المرور الجديدة</label>
        <div className="relative">
          <span className="absolute inset-y-0 end-3 flex items-center text-white/30"><Lock className="h-4 w-4" /></span>
          <input
            type={show ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8 أحرف على الأقل"
            className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 px-3 py-2.5 pe-9 ps-9 outline-none focus:border-primary-500/60"
          />
          <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 start-3 flex items-center text-white/40 hover:text-white/70">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">تأكيد كلمة المرور</label>
        <div className="relative">
          <span className="absolute inset-y-0 end-3 flex items-center text-white/30"><Lock className="h-4 w-4" /></span>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="أعد إدخال كلمة المرور"
            className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 px-3 py-2.5 pe-9 outline-none focus:border-primary-500/60"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-500 hover:to-purple-500 disabled:opacity-60"
      >
        {loading ? "جارٍ الحفظ…" : "تعيين كلمة المرور"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#09090b] px-4">
      <div className="w-full max-w-[420px]">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <span className="text-white/60 text-xs font-medium tracking-wide">نجد برنت</span>
            <h1 className="text-xl font-bold text-white mt-2">تعيين كلمة مرور جديدة</h1>
          </div>
          <Suspense fallback={<p className="text-center text-white/40 text-sm">جارٍ التحميل…</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
