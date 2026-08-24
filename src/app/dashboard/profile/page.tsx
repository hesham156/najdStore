"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { User, Lock, Phone } from "lucide-react";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [profile, setProfile] = useState({ name: "", phone: "" });
  const [password, setPassword] = useState({ current: "", new: "", confirm: "" });

  // Fetch current user data (including phone) from DB on mount
  useEffect(() => {
    fetch("/api/users/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProfile({ name: data.data.name || "", phone: data.data.phone || "" });
        }
      })
      .catch(() => {
        // Fallback to session name if fetch fails
        setProfile((prev) => ({ ...prev, name: session?.user.name || "" }));
      });
  }, [session?.user.name]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name, phone: profile.phone }),
      });
      const data = await res.json();
      if (data.success) {
        await update({ name: profile.name });
        toast.success("تم تحديث الملف الشخصي");
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.new !== password.confirm) { toast.error("كلمتا المرور غير متطابقتين"); return; }
    if (password.new.length < 8) { toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل"); return; }
    setPassLoading(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password.current, newPassword: password.new }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم تغيير كلمة المرور بنجاح");
        setPassword({ current: "", new: "", confirm: "" });
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold text-fg">الملف الشخصي</h1>

      {/* Profile Info */}
      <Card>
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-line">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-2xl shadow-lg">
            {session?.user.name?.charAt(0) || "م"}
          </div>
          <div>
            <p className="font-bold text-fg text-xl">{session?.user.name}</p>
            <p className="text-fg-subtle">{session?.user.email}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium">
              {session?.user.role === "CUSTOMER" ? "عميل" : session?.user.role === "ADMIN" ? "مدير" : "موظف"}
            </span>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <h3 className="font-bold text-fg flex items-center gap-2">
            <User className="h-4 w-4 text-primary-600" />
            المعلومات الشخصية
          </h3>
          <Input
            label="الاسم الكامل"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            required
          />
          <Input
            label="البريد الإلكتروني"
            value={session?.user.email || ""}
            disabled
            hint="لا يمكن تغيير البريد الإلكتروني"
          />
          <Input
            label="رقم الهاتف"
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            placeholder="+966 50 000 0000"
            startIcon={<Phone className="h-4 w-4" />}
          />
          <Button type="submit" loading={loading}>حفظ التغييرات</Button>
        </form>
      </Card>

      {/* Change Password */}
      <Card>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <h3 className="font-bold text-fg flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary-600" />
            تغيير كلمة المرور
          </h3>
          <Input
            label="كلمة المرور الحالية"
            type="password"
            value={password.current}
            onChange={(e) => setPassword({ ...password, current: e.target.value })}
            required
          />
          <Input
            label="كلمة المرور الجديدة"
            type="password"
            value={password.new}
            onChange={(e) => setPassword({ ...password, new: e.target.value })}
            required
            hint="8 أحرف على الأقل"
          />
          <Input
            label="تأكيد كلمة المرور الجديدة"
            type="password"
            value={password.confirm}
            onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
            required
          />
          <Button type="submit" loading={passLoading} variant="secondary">
            تغيير كلمة المرور
          </Button>
        </form>
      </Card>
    </div>
  );
}
