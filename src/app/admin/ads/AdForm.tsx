"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Search, Check, Save } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function AdForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    image: initialData?.image || "",
    link: initialData?.link || "",
    isActive: initialData?.isActive ?? true,
    targetType: initialData?.targetType || "ALL",
    placement: initialData?.placement || "DASHBOARD_MAIN",
    targetUserIds: initialData?.targetUsers?.map((u: any) => u.id) || [] as string[],
  });

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // User search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>(initialData?.targetUsers || []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.url) {
        setFormData({ ...formData, image: data.url });
      } else {
        alert("فشل رفع الصورة");
      }
    } catch (err) {
      alert("حدث خطأ أثناء رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const searchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.users) setSearchResults(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const toggleUser = (user: User) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
      setFormData({
        ...formData,
        targetUserIds: formData.targetUserIds.filter((id: string) => id !== user.id),
      });
    } else {
      setSelectedUsers([...selectedUsers, user]);
      setFormData({
        ...formData,
        targetUserIds: [...formData.targetUserIds, user.id],
      });
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.image) {
      alert("يرجى إدخال عنوان الإعلان وصورته");
      return;
    }

    setLoading(true);
    try {
      const url = initialData ? `/api/admin/ads/${initialData.id}` : "/api/admin/ads";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push("/admin/ads");
        router.refresh();
      } else {
        const error = await res.json();
        alert(error.error || "حدث خطأ أثناء الحفظ");
      }
    } catch (err) {
      alert("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-fg">
            {initialData ? "تعديل الإعلان" : "إضافة إعلان جديد"}
          </h1>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/ads")}
            className="btn-secondary"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={loading || uploading}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? "جاري الحفظ..." : "حفظ الإعلان"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card className="space-y-4">
            <h2 className="font-bold text-lg mb-4 text-fg">تفاصيل البنر</h2>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-fg">عنوان الإعلان</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: خصم 50% بمناسبة العيد"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">الرابط عند النقر (اختياري)</label>
              <Input
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://..."
                dir="ltr"
                className="text-left"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">صورة البنر</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-line-strong rounded-xl p-8 text-center cursor-pointer hover:bg-surface-hover transition-colors"
              >
                {formData.image ? (
                  <div className="relative inline-block w-full max-h-[300px] overflow-hidden rounded-lg">
                    <img src={formData.image} alt="Banner Preview" className="w-full h-auto object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData({ ...formData, image: "" });
                      }}
                      className="absolute top-2 right-2 rounded-full bg-danger-solid p-1 text-white transition-opacity hover:opacity-90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-fg-muted">
                    <Upload className="w-8 h-8" />
                    <span className="font-medium">{uploading ? "جاري الرفع..." : "انقر لرفع صورة الإعلان"}</span>
                    <span className="text-xs">يدعم الصور بصيغة PNG, JPG, GIF</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleUpload}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="font-bold text-lg mb-4 text-fg">إعدادات العرض</h2>

            <div className="flex items-center justify-between p-3 bg-surface-muted rounded-lg">
              <span className="font-medium text-sm text-fg">تفعيل الإعلان</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <div className="w-11 h-6 bg-line-strong peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">مكان العرض</label>
              <select
                value={formData.placement}
                onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                className="w-full bg-surface border border-line rounded-lg p-2.5 outline-none focus:border-primary-500 text-sm"
              >
                <option value="DASHBOARD_MAIN">لوحة تحكم العميل</option>
                <option value="STORE_HOME_TOP">الرئيسية (أعلى)</option>
                <option value="STORE_HOME_BOTTOM">الرئيسية (أسفل)</option>
                <option value="CHECKOUT_TOP">صفحة الدفع (أعلى)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-fg">الاستهداف</label>
              <select
                value={formData.targetType}
                onChange={(e) => setFormData({ ...formData, targetType: e.target.value })}
                className="w-full bg-surface border border-line rounded-lg p-2.5 outline-none focus:border-primary-500 text-sm"
              >
                <option value="ALL">جميع المستخدمين</option>
                <option value="SPECIFIC">مستخدمين محددين</option>
              </select>
            </div>
          </Card>

          {formData.targetType === "SPECIFIC" && (
            <Card className="space-y-4 border-primary-500 border-2">
              <h2 className="font-bold text-lg mb-2 text-fg">تحديد العملاء</h2>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => searchUsers(e.target.value)}
                  placeholder="ابحث بالاسم أو البريد..."
                  className="pr-9"
                />
                {searching && <div className="text-xs text-primary-500 mt-1">جاري البحث...</div>}
                
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface border border-line rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => {
                          toggleUser(user);
                          setSearchResults([]);
                          setSearchQuery("");
                        }}
                        className="px-3 py-2 hover:bg-surface-hover cursor-pointer flex justify-between items-center text-sm"
                      >
                        <div>
                          <p className="font-bold">{user.name}</p>
                          <p className="text-xs text-fg-muted">{user.email}</p>
                        </div>
                        {selectedUsers.some(u => u.id === user.id) && <Check className="w-4 h-4 text-primary-600" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedUsers.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-fg-muted mb-2 font-medium">العملاء المستهدفين ({selectedUsers.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <span key={user.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                        {user.name}
                        <button type="button" onClick={() => toggleUser(user)} className="hover:text-primary-900 ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}
