"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Plus, Trash2, GripVertical, Check, Zap, Clock,
  Star, Package, Eye, AlertCircle, CheckCircle2, SearchCheck,
  Archive, EyeOff, PlusCircle, Layers,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface Category { id: string; nameAr: string; icon?: string }
interface Variant   { label: string; price: string; comparePrice: string }
interface StockItem { id: string; data: string; isDelivered: boolean; createdAt: string }

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-xs", done ? "text-green-600 dark:text-green-400" : "text-gray-400")}>
      {done ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 shrink-0" />}
      {label}
    </div>
  );
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [variants, setVariants]       = useState<Variant[]>([]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  // Stock
  const [stockItems, setStockItems]   = useState<StockItem[]>([]);
  const [newStockData, setNewStockData] = useState("");
  const [addingStock, setAddingStock] = useState(false);
  const [showStockData, setShowStockData] = useState<Record<string, boolean>>({});
  const [confirmDeleteStockId, setConfirmDeleteStockId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nameAr: "", name: "", slug: "", descriptionAr: "", description: "",
    price: "", comparePrice: "", categoryId: "", image: "",
    featuresAr: "", features: "",
    deliveryMethod: "MANUAL", isFeatured: false, isActive: true, sortOrder: "0",
    seoTitle: "", seoDescription: "", seoKeywords: "",
  });

  /* ── Load data ── */
  const fetchStock = async () => {
    const res = await fetch(`/api/admin/stock?productId=${params.id}`);
    const data = await res.json();
    if (data.success) setStockItems(data.data);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/categories").then(r => r.json()),
      fetch(`/api/admin/products/${params.id}`).then(r => r.json()),
      fetch(`/api/admin/stock?productId=${params.id}`).then(r => r.json()),
    ]).then(([catsData, productData, stockData]) => {
      if (catsData.success)    setCategories(catsData.data);
      if (stockData.success)   setStockItems(stockData.data);
      if (productData.success) {
        const p = productData.data;
        const tags: string[] = p.tags || [];

        // Parse variants
        const parsedVariants: Variant[] = tags
          .filter((t: string) => t.startsWith("variant:"))
          .map((t: string) => {
            const parts = t.split(":");
            return { label: parts[1] || "", price: parts[2] || "", comparePrice: parts[3] || "" };
          });
        setVariants(parsedVariants);

        // Parse SEO tags
        const seoTitle = tags.find((t: string) => t.startsWith("seo_title:"))?.replace("seo_title:", "") || "";
        const seoDesc  = tags.find((t: string) => t.startsWith("seo_desc:"))?.replace("seo_desc:", "")   || "";
        const seoKw    = tags.find((t: string) => t.startsWith("seo_kw:"))?.replace("seo_kw:", "")       || "";

        setForm({
          nameAr: p.nameAr, name: p.name, slug: p.slug,
          descriptionAr: p.descriptionAr || "", description: p.description || "",
          price: String(p.price), comparePrice: p.comparePrice ? String(p.comparePrice) : "",
          categoryId: p.categoryId, image: p.image || "",
          featuresAr: (p.featuresAr || []).join("\n"),
          features:   (p.features   || []).join("\n"),
          deliveryMethod: p.deliveryMethod,
          isFeatured: p.isFeatured, isActive: p.isActive, sortOrder: String(p.sortOrder),
          seoTitle, seoDescription: seoDesc, seoKeywords: seoKw,
        });
      }
      setPageLoading(false);
    });
  }, [params.id]);

  /* ── Stock handlers ── */
  const handleAddStock = async () => {
    if (!newStockData.trim()) { toast.error("أدخل بيانات المخزون"); return; }
    setAddingStock(true);
    const lines = newStockData.split("\n---\n").map(l => l.trim()).filter(Boolean);
    const res = await fetch("/api/admin/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: params.id, items: lines }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`✓ تم إضافة ${lines.length} عنصر للمخزون`);
      setNewStockData("");
      await fetchStock();
    } else {
      toast.error(data.error || "حدث خطأ");
    }
    setAddingStock(false);
  };

  const handleDeleteStock = async (id: string) => {
    const res = await fetch(`/api/admin/stock/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("تم الحذف");
      setConfirmDeleteStockId(null);
      await fetchStock();
    } else {
      toast.error("حدث خطأ في الحذف");
    }
  };

  /* ── Variant helpers ── */
  const addVariant    = () => setVariants(v => [...v, { label: "", price: "", comparePrice: "" }]);
  const removeVariant = (i: number) => { setVariants(v => v.filter((_, idx) => idx !== i)); setSelectedVariantIdx(0); };
  const updateVariant = (i: number, field: keyof Variant, val: string) =>
    setVariants(v => v.map((vr, idx) => idx === i ? { ...vr, [field]: val } : vr));

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const v of variants) {
      if (!v.label.trim() || !v.price) { toast.error("كل خيار يجب أن يكون له اسم وسعر"); return; }
    }
    setLoading(true);
    try {
      const variantTags = variants.map(v =>
        `variant:${v.label.trim()}:${parseFloat(v.price)}${v.comparePrice ? `:${parseFloat(v.comparePrice)}` : ""}`
      );
      const seoTags: string[] = [];
      if (form.seoTitle.trim())       seoTags.push(`seo_title:${form.seoTitle.trim()}`);
      if (form.seoDescription.trim()) seoTags.push(`seo_desc:${form.seoDescription.trim()}`);
      if (form.seoKeywords.trim())    seoTags.push(`seo_kw:${form.seoKeywords.trim()}`);

      const basePrice = variants.length > 0 ? parseFloat(variants[0].price) : parseFloat(form.price);

      const res = await fetch(`/api/admin/products/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: basePrice,
          comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
          sortOrder: parseInt(form.sortOrder),
          features:   form.features.split("\n").filter(Boolean),
          featuresAr: form.featuresAr.split("\n").filter(Boolean),
          tags: [...variantTags, ...seoTags],
        }),
      });
      const data = await res.json();
      if (data.success) { toast.success("تم حفظ التغييرات ✓"); router.push("/admin/products"); }
      else toast.error(data.error || "حدث خطأ");
    } finally { setLoading(false); }
  };

  const set = (field: string, value: string | boolean) => setForm(f => ({ ...f, [field]: value }));

  /* ── Preview computed ── */
  const selectedCat    = categories.find(c => c.id === form.categoryId);
  const activeVariant  = variants.length > 0 ? variants[selectedVariantIdx] : null;
  const previewPrice   = activeVariant ? (parseFloat(activeVariant.price) || 0) : (parseFloat(form.price) || 0);
  const previewCompare = activeVariant ? (parseFloat(activeVariant.comparePrice) || 0) : (parseFloat(form.comparePrice) || 0);
  const discount       = previewCompare > previewPrice ? Math.round(((previewCompare - previewPrice) / previewCompare) * 100) : 0;
  const featuresList   = form.featuresAr.split("\n").filter(Boolean);

  const checks = [
    { done: !!form.nameAr,                   label: "الاسم بالعربي" },
    { done: !!form.name,                     label: "الاسم بالإنجليزي" },
    { done: !!form.slug,                     label: "الرابط (slug)" },
    { done: !!form.categoryId,               label: "الفئة" },
    { done: variants.length > 0 || !!form.price, label: "السعر أو الخيارات" },
    { done: !!form.descriptionAr,            label: "الوصف" },
    { done: !!form.image,                    label: "الصورة" },
    { done: featuresList.length > 0,         label: "المميزات" },
  ];
  const completeness = Math.round((checks.filter(c => c.done).length / checks.length) * 100);

  if (pageLoading) {
    return (
      <div className="animate-pulse grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}</div>
        <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تعديل المنتج</h1>
          <p className="text-gray-500 text-sm mt-1">{form.nameAr}</p>
        </div>
        <Link
          href={`/admin/products/${params.id}/options`}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 px-4 py-2.5 text-sm font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
        >
          <Layers className="h-4 w-4" />
          الخيارات والأسعار (كمية/تصميم…)
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">

        {/* ════ LEFT: Form ════ */}
        <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-6">

          {/* Basic Info */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-gray-700 dark:text-gray-300">المعلومات الأساسية</h2>
            <Input label="الاسم بالعربي" value={form.nameAr} onChange={e => set("nameAr", e.target.value)} required />
            <Input label="الاسم بالإنجليزي" value={form.name} onChange={e => set("name", e.target.value)} required />
            <Input label="الرابط (slug)" value={form.slug} onChange={e => set("slug", e.target.value)} required />
            <Select
              label="الفئة" value={form.categoryId} onChange={e => set("categoryId", e.target.value)} required
              options={[{ value: "", label: "اختر الفئة" }, ...categories.map(c => ({ value: c.id, label: c.nameAr }))]}
            />
            <Textarea label="الوصف بالعربي" value={form.descriptionAr} onChange={e => set("descriptionAr", e.target.value)} rows={3} />
            <Textarea label="الوصف بالإنجليزي" value={form.description} onChange={e => set("description", e.target.value)} rows={3} />
          </Card>

          {/* Variants */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-700 dark:text-gray-300">خيارات الاشتراك (Variants)</h2>
                <p className="text-xs text-gray-400 mt-0.5">مثال: شهر / 3 شهور / 6 شهور</p>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={addVariant}>
                <Plus className="h-4 w-4" />إضافة خيار
              </Button>
            </div>

            {variants.length === 0 && (
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
                <p className="text-gray-400 text-sm">لا توجد خيارات – اضغط "إضافة خيار"</p>
                <p className="text-gray-300 text-xs mt-1">أو اترك فارغاً لمنتج بسعر موحد</p>
              </div>
            )}

            {variants.map((v, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <GripVertical className="h-5 w-5 text-gray-300 mt-2 shrink-0" />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Input label="اسم الخيار" value={v.label} onChange={e => updateVariant(i, "label", e.target.value)} placeholder="شهر واحد" required />
                  <Input label="السعر (ر.س)" type="number" step="0.01" value={v.price} onChange={e => updateVariant(i, "price", e.target.value)} placeholder="29.99" required />
                  <Input label="السعر الأصلي" type="number" step="0.01" value={v.comparePrice} onChange={e => updateVariant(i, "comparePrice", e.target.value)} placeholder="49.99" />
                </div>
                <button type="button" onClick={() => removeVariant(i)} className="mt-7 text-red-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </Card>

          {/* Price & Delivery */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-gray-700 dark:text-gray-300">السعر والتوصيل</h2>
            {variants.length === 0 ? (
              <div className="grid grid-cols-2 gap-4">
                <Input label="السعر (ر.س)" type="number" step="0.01" value={form.price} onChange={e => set("price", e.target.value)} required />
                <Input label="السعر الأصلي" type="number" step="0.01" value={form.comparePrice} onChange={e => set("comparePrice", e.target.value)} />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 text-sm text-primary-700 dark:text-primary-300">
                💡 السعر سيُحدَّد تلقائياً من الخيار المختار
              </div>
            )}
            <Select
              label="طريقة التوصيل" value={form.deliveryMethod} onChange={e => set("deliveryMethod", e.target.value)}
              options={[{ value: "MANUAL", label: "يدوي" }, { value: "AUTOMATIC", label: "تلقائي من المخزون" }]}
            />
          </Card>

          {/* Features & Image */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-gray-700 dark:text-gray-300">المميزات والصورة</h2>
            <Textarea label="المميزات (كل ميزة في سطر)" value={form.featuresAr} onChange={e => set("featuresAr", e.target.value)} rows={4} placeholder={"جودة 4K\nأجهزة متعددة\nدعم فني"} />
            <Textarea label="المميزات بالإنجليزي" value={form.features} onChange={e => set("features", e.target.value)} rows={4} placeholder={"4K Quality\nMultiple devices"} />
            <Input label="رابط الصورة" value={form.image} onChange={e => set("image", e.target.value)} placeholder="https://..." />
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isFeatured} onChange={e => set("isFeatured", e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">منتج مميز (يظهر في الصفحة الرئيسية)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">نشط (مرئي في المتجر)</span>
              </label>
            </div>
            <Input label="الترتيب" type="number" value={form.sortOrder} onChange={e => set("sortOrder", e.target.value)} />
          </Card>

          {/* ── Stock Management ── */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700 bg-emerald-50 dark:bg-emerald-900/10">
              <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200">
                <Archive className="h-4 w-4 text-emerald-600" />
                إدارة المخزون
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold">
                  {stockItems.filter(s => !s.isDelivered).length} متاح
                </span>
                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 font-bold">
                  {stockItems.filter(s => s.isDelivered).length} مُسلَّم
                </span>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Add stock */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  إضافة بيانات اشتراك جديدة
                </label>
                <Textarea
                  value={newStockData}
                  onChange={e => setNewStockData(e.target.value)}
                  placeholder={"بيانات الاشتراك الأول (مثال: email:pass)\n---\nبيانات الاشتراك الثاني\n---\n..."}
                  rows={4}
                  hint="افصل بين كل اشتراك بـ --- في سطر منفرد لإضافة متعددة"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddStock}
                  loading={addingStock}
                  className="w-full"
                >
                  <PlusCircle className="h-4 w-4" />
                  إضافة للمخزون
                </Button>
              </div>

              {/* Existing stock list */}
              {stockItems.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">عناصر المخزون</p>
                  {stockItems.map(item => (
                    <div key={item.id} className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-xs",
                      item.isDelivered
                        ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60"
                        : "bg-white dark:bg-gray-800 border-green-200 dark:border-green-800"
                    )}>
                      <Badge variant={item.isDelivered ? "gray" : "success"} className="shrink-0 text-[10px]">
                        {item.isDelivered ? "مُسلَّم" : "متاح"}
                      </Badge>
                      <span className="font-mono text-gray-500 flex-1 truncate">
                        {showStockData[item.id] ? item.data : "••••••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowStockData(p => ({ ...p, [item.id]: !p[item.id] }))}
                        className="text-gray-400 hover:text-gray-600 shrink-0"
                      >
                        {showStockData[item.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      {!item.isDelivered && (
                        confirmDeleteStockId === item.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDeleteStock(item.id)}
                              className="text-[10px] text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-lg"
                            >
                              تأكيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteStockId(null)}
                              className="text-[10px] text-gray-500 hover:text-gray-700 px-2 py-0.5 rounded-lg border border-gray-200"
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStockId(item.id)}
                            className="text-red-400 hover:text-red-600 shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* SEO */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2 px-6 py-4 border-b dark:border-gray-700 bg-purple-50 dark:bg-purple-900/10 font-bold text-gray-800 dark:text-gray-200">
              <SearchCheck className="h-4 w-4 text-purple-600" />تحسينات SEO للمنتج
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900 space-y-1">
                <p className="text-xs text-green-600 truncate">yourstore.com › products › {form.slug}</p>
                <p className={cn("text-sm font-medium truncate", (form.seoTitle || form.nameAr).length > 60 ? "text-orange-500" : "text-blue-600 dark:text-blue-400")}>
                  {form.seoTitle || form.nameAr || "عنوان المنتج"}
                </p>
                <p className={cn("text-xs line-clamp-2", (form.seoDescription || form.descriptionAr).length > 160 ? "text-orange-500" : "text-gray-500")}>
                  {form.seoDescription || form.descriptionAr || "وصف المنتج يظهر هنا..."}
                </p>
                <div className="flex gap-3 text-xs text-gray-400 pt-1">
                  <span className={(form.seoTitle || form.nameAr).length > 60 ? "text-orange-500 font-bold" : ""}>
                    العنوان: {(form.seoTitle || form.nameAr).length}/60
                  </span>
                  <span className={(form.seoDescription || form.descriptionAr).length > 160 ? "text-orange-500 font-bold" : ""}>
                    الوصف: {(form.seoDescription || form.descriptionAr).length}/160
                  </span>
                </div>
              </div>
              <Input label="عنوان SEO" value={form.seoTitle} onChange={e => set("seoTitle", e.target.value)} placeholder={form.nameAr} />
              <Textarea label="وصف SEO" value={form.seoDescription} onChange={e => set("seoDescription", e.target.value)} rows={3} placeholder={form.descriptionAr} />
              <Input label="كلمات مفتاحية إضافية" value={form.seoKeywords} onChange={e => set("seoKeywords", e.target.value)} placeholder="كلمة1, كلمة2" hint="مفصولة بفواصل" />
            </div>
          </Card>

          {/* أزرار الحفظ – تظهر فقط على الشاشات الصغيرة (اللوحة الجانبية مخفية) */}
          <div className="flex gap-3 justify-end pb-6 xl:hidden">
            <Button variant="secondary" type="button" onClick={() => router.push("/admin/products")}>إلغاء</Button>
            <Button type="submit" loading={loading}>حفظ التغييرات</Button>
          </div>
        </form>

        {/* ════ RIGHT: Live Preview ════ */}
        <div className="hidden xl:block sticky top-6 space-y-4">

          {/* Completeness */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-primary-600" />اكتمال المنتج
              </h3>
              <span className={cn("text-sm font-bold", completeness === 100 ? "text-green-600" : completeness >= 60 ? "text-amber-500" : "text-red-500")}>
                {completeness}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", completeness === 100 ? "bg-green-500" : completeness >= 60 ? "bg-amber-400" : "bg-red-400")}
                style={{ width: `${completeness}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {checks.map(c => <CheckItem key={c.label} done={c.done} label={c.label} />)}
            </div>
          </Card>

          {/* Product card preview */}
          <Card className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" /><div className="w-2 h-2 rounded-full bg-amber-400" /><div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-gray-400 ms-2">معاينة المنتج</span>
            </div>
            <div className="p-4">
              <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  {form.image
                    ? <Image src={form.image} alt="preview" fill className="object-contain p-4" unoptimized onError={() => {}} />
                    : <span className="text-4xl">{selectedCat?.icon || "📦"}</span>
                  }
                  {discount > 0 && <div className="absolute top-2 start-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">-{discount}%</div>}
                  <div className="absolute top-2 end-2">
                    <div className={cn("text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1",
                      form.deliveryMethod === "AUTOMATIC" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                      {form.deliveryMethod === "AUTOMATIC" ? <><Zap className="h-2.5 w-2.5" />فوري</> : <><Clock className="h-2.5 w-2.5" />يدوي</>}
                    </div>
                  </div>
                  {form.isFeatured && <div className="absolute top-8 end-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-lg flex items-center gap-1"><Star className="h-2.5 w-2.5" />مميز</div>}
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs font-medium text-primary-600">{selectedCat?.nameAr || "الفئة"}</p>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{form.nameAr || "اسم المنتج"}</h3>
                  {variants.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {variants.slice(0, 3).map((v, i) => (
                        <button key={i} type="button" onClick={() => setSelectedVariantIdx(i)}
                          className={cn("px-2 py-0.5 text-xs rounded-lg border transition-all",
                            selectedVariantIdx === i ? "border-primary-600 bg-primary-50 text-primary-700 font-medium" : "border-gray-200 text-gray-500")}>
                          {v.label || `خيار ${i + 1}`}
                        </button>
                      ))}
                    </div>
                  )}
                  {featuresList.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {featuresList.slice(0, 2).map(f => (
                        <span key={f} className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">{f}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t dark:border-gray-700">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{previewPrice > 0 ? formatCurrency(previewPrice) : "—"}</p>
                      {previewCompare > 0 && previewCompare > previewPrice && <p className="text-xs text-gray-400 line-through">{formatCurrency(previewCompare)}</p>}
                    </div>
                    <div className="flex items-center gap-1 text-xs bg-primary-600 text-white px-2.5 py-1.5 rounded-xl">
                      <Package className="h-3 w-3" />أضف
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Variants summary */}
          {variants.length > 0 && (
            <Card className="p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500">خيارات الاشتراك</p>
              {variants.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    {i === selectedVariantIdx && <Check className="h-3 w-3 text-primary-500" />}
                    {v.label || `خيار ${i + 1}`}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {v.price ? `${parseFloat(v.price)} ر.س` : "—"}
                  </span>
                </div>
              ))}
            </Card>
          )}

          {/* Status + Stock summary */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">حالة المنتج</span>
              <span className={cn("text-xs font-bold px-3 py-1 rounded-full", form.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500")}>
                {form.isActive ? "● نشط" : "● معطل"}
              </span>
            </div>
            <div className="border-t dark:border-gray-700 pt-3 grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded-xl bg-green-50 dark:bg-green-900/10">
                <p className="text-2xl font-black text-green-600 dark:text-green-400">
                  {stockItems.filter(s => !s.isDelivered).length}
                </p>
                <p className="text-xs text-green-700 dark:text-green-500">متاح</p>
              </div>
              <div className="text-center p-2 rounded-xl bg-gray-100 dark:bg-gray-800">
                <p className="text-2xl font-black text-gray-500 dark:text-gray-400">
                  {stockItems.filter(s => s.isDelivered).length}
                </p>
                <p className="text-xs text-gray-500">مُسلَّم</p>
              </div>
            </div>
          </Card>

          {/* Sticky buttons */}
          <div className="flex gap-2">
            <Button variant="secondary" type="button" fullWidth onClick={() => router.push("/admin/products")}>إلغاء</Button>
            <Button type="submit" fullWidth form="edit-product-form" loading={loading}>حفظ التغييرات</Button>
          </div>
        </div>

      </div>
    </div>
  );
}
