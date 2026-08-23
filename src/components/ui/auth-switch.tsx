"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Mail, Lock, User, Phone, Eye, EyeOff,
  Zap, Shield, Star, Headphones,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { SiteLogo } from "@/components/ui/site-logo";

type Mode = "login" | "register";

interface AuthSwitchProps {
  defaultMode?: Mode;
}

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

const perks = [
  { icon: Zap,         text: "تسليم فوري لمعظم الطلبات"   },
  { icon: Shield,      text: "حماية كاملة لبياناتك"           },
  { icon: Star,        text: "أفضل الأسعار في السوق"          },
  { icon: Headphones,  text: "دعم على مدار الساعة"            },
];

export function AuthSwitch({ defaultMode = "login" }: AuthSwitchProps) {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || searchParams.get("redirect") || "/dashboard";
  const redirect    = callbackUrl.startsWith("http") ? new URL(callbackUrl).pathname : callbackUrl;

  const [mode, setMode] = useState<Mode>(defaultMode);

  // ── Login state ──────────────────────────────────────────────
  const [loginForm, setLoginForm]   = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPass, setShowLoginPass] = useState(false);

  // ── Register state ───────────────────────────────────────────
  const [regForm, setRegForm] = useState({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
  });
  const [regErrors, setRegErrors]   = useState<Record<string, string>>({});
  const [regLoading, setRegLoading] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const result = await Promise.race([
        signIn("credentials", {
          email: loginForm.email,
          password: loginForm.password,
          redirect: false,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 15000)
        ),
      ]);

      if (!result?.ok) {
        setLoginError(
          result?.error === "CredentialsSignin"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : result?.error || "حدث خطأ في تسجيل الدخول"
        );
        setLoginLoading(false);
        return;
      }

      toast.success("تم تسجيل الدخول بنجاح!");
      window.location.href = redirect;
    } catch {
      setLoginError("انتهت مهلة الاتصال. تحقق من اتصالك وحاول مجدداً");
      setLoginLoading(false);
    }
  };

  const validateReg = () => {
    const errs: Record<string, string> = {};
    if (regForm.name.length < 2)                        errs.name            = "الاسم يجب أن يكون حرفين على الأقل";
    if (!regForm.email.includes("@"))                   errs.email           = "البريد الإلكتروني غير صحيح";
    if (regForm.password.length < 8)                    errs.password        = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    if (regForm.password !== regForm.confirmPassword)   errs.confirmPassword = "كلمتا المرور غير متطابقتين";
    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateReg()) return;
    setRegLoading(true);

    try {
      const res  = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regForm.name, email: regForm.email,
          phone: regForm.phone, password: regForm.password,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setRegErrors({ general: data.error || "حدث خطأ في إنشاء الحساب" });
        setRegLoading(false);
        return;
      }

      await signIn("credentials", {
        email: regForm.email, password: regForm.password, redirect: false,
      });
      toast.success("تم إنشاء حسابك بنجاح! مرحباً بك");
      router.push("/dashboard");
    } catch {
      setRegErrors({ general: "حدث خطأ. حاول مرة أخرى" });
      setRegLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setLoginError("");
    setRegErrors({});
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen flex items-center justify-center relative overflow-hidden bg-[#09090b]">

      {/* ── Animated background rings ───────────────────────── */}
      <style>{`
        @keyframes auth-spin    { to { transform: rotate(360deg);  } }
        @keyframes auth-spin-rv { to { transform: rotate(-360deg); } }
        .auth-cw  { animation: auth-spin    70s linear infinite; }
        .auth-ccw { animation: auth-spin-rv 70s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .auth-cw, .auth-ccw { animation: none; }
        }
      `}</style>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ perspective: "1200px", transform: "perspective(1200px) rotateX(10deg)", transformOrigin: "center center" }}
      >
        <div className="absolute inset-0 auth-cw">
          <div className="absolute top-1/2 left-1/2" style={{ width: 1400, height: 1400, transform: "translate(-50%,-50%)" }}>
            <img src="https://framerusercontent.com/images/oqZEqzDEgSLygmUDuZAYNh2XQ9U.png?scale-down-to=2048" alt=""
              className="w-full h-full object-cover"
              style={{ opacity: 0.2, filter: "hue-rotate(250deg) saturate(2) brightness(0.6)" }} />
          </div>
        </div>
        <div className="absolute inset-0 auth-ccw">
          <div className="absolute top-1/2 left-1/2" style={{ width: 900, height: 900, transform: "translate(-50%,-50%)" }}>
            <img src="https://framerusercontent.com/images/UbucGYsHDAUHfaGZNjwyCzViw8.png?scale-down-to=1024" alt=""
              className="w-full h-full object-cover"
              style={{ opacity: 0.25, filter: "hue-rotate(260deg) saturate(2) brightness(0.55)" }} />
          </div>
        </div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.12) 0%, transparent 70%)" }} />

      {/* ── Main card ──────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[420px] mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden"
        >
          {/* ── Brand header ─────────────────────────────────── */}
          <div className="px-8 pt-8 pb-6 text-center">
            <Link href="/" className="inline-flex flex-col items-center gap-2 mb-6">
              <SiteLogo size="lg" className="shadow-xl shadow-purple-900/50" />
              <span className="text-white/60 text-xs font-medium tracking-wide">نجد برنت</span>
            </Link>

            {/* ── Toggle pill ────────────────────────────────── */}
            <div className="relative flex rounded-full bg-white/8 border border-white/10 p-1">
              {/* RTL: the first button (تسجيل الدخول) sits on the RIGHT, so the
                  active pill hugs the right edge for login and the left for register. */}
              <motion.div
                className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm"
                initial={false}
                animate={{
                  left: mode === "login" ? "50%" : "4px",
                  right: mode === "login" ? "4px" : "50%",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
              <button
                onClick={() => switchMode("login")}
                className={cn(
                  "relative flex-1 py-2 text-sm font-semibold rounded-full transition-colors duration-200 z-10",
                  mode === "login" ? "text-gray-900" : "text-white/60 hover:text-white/80"
                )}
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => switchMode("register")}
                className={cn(
                  "relative flex-1 py-2 text-sm font-semibold rounded-full transition-colors duration-200 z-10",
                  mode === "register" ? "text-gray-900" : "text-white/60 hover:text-white/80"
                )}
              >
                إنشاء حساب
              </button>
            </div>
          </div>

          {/* ── Form area ─────────────────────────────────────── */}
          <div className="px-8 pb-8 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              {mode === "login" ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.28, ease: EASE }}
                >
                  {loginError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-red-400">
                      {loginError}
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <AuthInput
                      label="البريد الإلكتروني"
                      type="email"
                      required
                      value={loginForm.email}
                      onChange={(v) => setLoginForm({ ...loginForm, email: v })}
                      placeholder="example@email.com"
                      icon={<Mail className="h-4 w-4" />}
                      autoComplete="email"
                    />
                    <AuthInput
                      label="كلمة المرور"
                      type={showLoginPass ? "text" : "password"}
                      required
                      value={loginForm.password}
                      onChange={(v) => setLoginForm({ ...loginForm, password: v })}
                      placeholder="••••••••"
                      icon={<Lock className="h-4 w-4" />}
                      autoComplete="current-password"
                      suffix={
                        <button type="button" onClick={() => setShowLoginPass(!showLoginPass)}
                          className="text-white/40 hover:text-white/70 transition-colors">
                          {showLoginPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />

                    <AuthButton loading={loginLoading}>تسجيل الدخول</AuthButton>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28, ease: EASE }}
                >
                  {regErrors.general && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4 text-sm text-red-400">
                      {regErrors.general}
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <AuthInput
                      label="الاسم الكامل"
                      required
                      value={regForm.name}
                      onChange={(v) => setRegForm({ ...regForm, name: v })}
                      placeholder="محمد أحمد"
                      icon={<User className="h-4 w-4" />}
                      error={regErrors.name}
                    />
                    <AuthInput
                      label="البريد الإلكتروني"
                      type="email"
                      required
                      value={regForm.email}
                      onChange={(v) => setRegForm({ ...regForm, email: v })}
                      placeholder="example@email.com"
                      icon={<Mail className="h-4 w-4" />}
                      error={regErrors.email}
                    />
                    <AuthInput
                      label="رقم الهاتف (اختياري)"
                      type="tel"
                      value={regForm.phone}
                      onChange={(v) => setRegForm({ ...regForm, phone: v })}
                      placeholder="+966 50 000 0000"
                      icon={<Phone className="h-4 w-4" />}
                    />
                    <AuthInput
                      label="كلمة المرور"
                      type={showRegPass ? "text" : "password"}
                      required
                      value={regForm.password}
                      onChange={(v) => setRegForm({ ...regForm, password: v })}
                      placeholder="8 أحرف على الأقل"
                      icon={<Lock className="h-4 w-4" />}
                      error={regErrors.password}
                      suffix={
                        <button type="button" onClick={() => setShowRegPass(!showRegPass)}
                          className="text-white/40 hover:text-white/70 transition-colors">
                          {showRegPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                    <AuthInput
                      label="تأكيد كلمة المرور"
                      type="password"
                      required
                      value={regForm.confirmPassword}
                      onChange={(v) => setRegForm({ ...regForm, confirmPassword: v })}
                      placeholder="أعد إدخال كلمة المرور"
                      icon={<Lock className="h-4 w-4" />}
                      error={regErrors.confirmPassword}
                    />

                    <AuthButton loading={regLoading} className="mt-1">إنشاء الحساب</AuthButton>

                    <p className="text-xs text-center text-white/30 pt-1">
                      بالتسجيل توافق على{" "}
                      <Link href="/terms" className="text-primary-400 hover:text-primary-300 underline">
                        الشروط والأحكام
                      </Link>
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Perks strip ───────────────────────────────────── */}
          <div className="border-t border-white/8 px-6 py-4 grid grid-cols-2 gap-2">
            {perks.map((p) => (
              <div key={p.text} className="flex items-center gap-2">
                <p.icon className="h-3.5 w-3.5 text-primary-400 shrink-0" />
                <span className="text-[11px] text-white/40 leading-tight">{p.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Internal sub-components ─────────────────────────────────────

interface AuthInputProps {
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
  autoComplete?: string;
}

function AuthInput({ label, type = "text", required, value, onChange, placeholder, icon, suffix, error, autoComplete }: AuthInputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/60 mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 end-3 flex items-center pointer-events-none text-white/30">
            {icon}
          </span>
        )}
        <input
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            "w-full rounded-xl bg-white/5 border text-white text-sm placeholder:text-white/20",
            "px-3 py-2.5 transition-colors outline-none",
            icon ? "pe-9" : "",
            suffix ? "ps-9" : "",
            error
              ? "border-red-500/50 focus:border-red-500"
              : "border-white/10 focus:border-primary-500/60",
          )}
        />
        {suffix && (
          <span className="absolute inset-y-0 start-3 flex items-center">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

interface AuthButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
}

function AuthButton({ children, loading, className }: AuthButtonProps) {
  return (
    <motion.button
      type="submit"
      disabled={loading}
      whileHover={{ scale: loading ? 1 : 1.02 }}
      whileTap={{ scale: loading ? 1 : 0.97 }}
      className={cn(
        "w-full py-3 rounded-xl font-bold text-sm text-white transition-all",
        "bg-gradient-to-r from-primary-600 to-purple-600",
        "hover:from-primary-500 hover:to-purple-500",
        "shadow-lg shadow-purple-900/40",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      )}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          جاري المعالجة...
        </span>
      ) : children}
    </motion.button>
  );
}
