"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Archive,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Info,
  Layers,
  PlusCircle,
  SearchCheck,
  Settings2,
  Tag,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, Section } from "@/components/ui/Card";
import { Checkbox, Input, Select, Switch, Textarea } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/Modal";
import { Alert, EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { PageHeader } from "@/components/admin/PageHeader";
import {
  CompletenessCard,
  FormActions,
  ProductPreviewCard,
  SerpPreview,
  VariantsEditor,
  type ProductCategory,
  type Variant,
} from "@/components/admin/product-form";
import { BundlePicker } from "@/components/admin/BundlePicker";
import { cn } from "@/lib/utils";

interface StockItem {
  id: string;
  data: string;
  isDelivered: boolean;
  createdAt: string;
}

const TABS = [
  { value: "general", label: "المعلومات الأساسية", icon: <Info /> },
  { value: "pricing", label: "التسعير والخيارات", icon: <Tag /> },
  { value: "inventory", label: "المخزون", icon: <Archive /> },
  { value: "media", label: "الصور والمميزات", icon: <ImageIcon /> },
  { value: "seo", label: "SEO", icon: <SearchCheck /> },
  { value: "advanced", label: "إعدادات متقدمة", icon: <Settings2 /> },
];

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState("general");

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [bundleIds, setBundleIds] = useState<string[]>([]);

  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [newStockData, setNewStockData] = useState("");
  const [addingStock, setAddingStock] = useState(false);
  const [showStockData, setShowStockData] = useState<Record<string, boolean>>({});
  const [deleteStockId, setDeleteStockId] = useState<string | null>(null);
  const [deletingStock, setDeletingStock] = useState(false);

  const [form, setForm] = useState({
    nameAr: "",
    name: "",
    slug: "",
    descriptionAr: "",
    description: "",
    price: "",
    comparePrice: "",
    categoryId: "",
    image: "",
    featuresAr: "",
    features: "",
    deliveryMethod: "MANUAL",
    isFeatured: false,
    isActive: true,
    trackStock: false,
    stockCount: "0",
    sortOrder: "0",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
  });

  /* ── Load ── */
  const fetchStock = useCallback(async () => {
    const res = await fetch(`/api/admin/stock?productId=${params.id}`);
    const data = await res.json();
    if (data.success) setStockItems(data.data);
  }, [params.id]);

  const loadAll = useCallback(async () => {
    setPageLoading(true);
    setLoadError(false);
    try {
      const [catsData, productData, stockData] = await Promise.all([
        fetch("/api/admin/categories").then((r) => r.json()),
        fetch(`/api/admin/products/${params.id}`).then((r) => r.json()),
        fetch(`/api/admin/stock?productId=${params.id}`).then((r) => r.json()),
      ]);

      if (catsData.success) setCategories(catsData.data);
      if (stockData.success) setStockItems(stockData.data);

      if (!productData.success) {
        setLoadError(true);
        return;
      }

      const p = productData.data;
      const tags: string[] = p.tags || [];

      setVariants(
        tags
          .filter((t) => t.startsWith("variant:"))
          .map((t) => {
            const parts = t.split(":");
            return { label: parts[1] || "", price: parts[2] || "", comparePrice: parts[3] || "" };
          })
      );

      setBundleIds(
        tags.filter((t) => t.startsWith("bundle:")).map((t) => t.slice("bundle:".length)).filter(Boolean)
      );

      setForm({
        nameAr: p.nameAr,
        name: p.name,
        slug: p.slug,
        descriptionAr: p.descriptionAr || "",
        description: p.description || "",
        price: String(p.price),
        comparePrice: p.comparePrice ? String(p.comparePrice) : "",
        categoryId: p.categoryId,
        image: p.image || "",
        featuresAr: (p.featuresAr || []).join("\n"),
        features: (p.features || []).join("\n"),
        deliveryMethod: p.deliveryMethod,
        isFeatured: p.isFeatured,
        isActive: p.isActive,
        trackStock: p.trackStock ?? false,
        stockCount: String(p.stockCount ?? 0),
        sortOrder: String(p.sortOrder),
        seoTitle: tags.find((t) => t.startsWith("seo_title:"))?.replace("seo_title:", "") || "",
        seoDescription: tags.find((t) => t.startsWith("seo_desc:"))?.replace("seo_desc:", "") || "",
        seoKeywords: tags.find((t) => t.startsWith("seo_kw:"))?.replace("seo_kw:", "") || "",
      });
    } catch {
      setLoadError(true);
    } finally {
      setPageLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ── Stock ── */
  const handleAddStock = async () => {
    if (!newStockData.trim()) {
      toast.error("أدخل بيانات المخزون أولاً");
      return;
    }
    setAddingStock(true);
    const lines = newStockData
      .split("\n---\n")
      .map((l) => l.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: params.id, items: lines }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`تمت إضافة ${lines.length} عنصر للمخزون`);
        setNewStockData("");
        await fetchStock();
      } else {
        toast.error(data.error || "تعذّرت إضافة المخزون");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setAddingStock(false);
    }
  };

  const handleDeleteStock = async () => {
    if (!deleteStockId) return;
    setDeletingStock(true);
    try {
      const res = await fetch(`/api/admin/stock/${deleteStockId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حذف عنصر المخزون");
        await fetchStock();
      } else {
        toast.error(data.error || "تعذّر الحذف");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setDeletingStock(false);
      setDeleteStockId(null);
    }
  };

  /* ── Variants ── */
  const addVariant = () => setVariants((v) => [...v, { label: "", price: "", comparePrice: "" }]);
  const removeVariant = (i: number) => {
    setVariants((v) => v.filter((_, idx) => idx !== i));
    setSelectedVariantIdx(0);
  };
  const updateVariant = (i: number, field: keyof Variant, val: string) =>
    setVariants((v) => v.map((vr, idx) => (idx === i ? { ...vr, [field]: val } : vr)));

  /* Hidden tab panels are unmounted, so validation lives here. */
  const validate = () => {
    if (!form.nameAr.trim()) return { tab: "general", message: "أدخل اسم المنتج بالعربي" };
    if (!form.name.trim()) return { tab: "general", message: "أدخل اسم المنتج بالإنجليزي" };
    if (!form.slug.trim()) return { tab: "general", message: "أدخل رابط المنتج (slug)" };
    if (!form.categoryId) return { tab: "general", message: "اختر فئة المنتج" };
    if (variants.length === 0 && !form.price) return { tab: "pricing", message: "أدخل سعر المنتج أو أضف خيارات اشتراك" };
    for (const v of variants) {
      if (!v.label.trim() || !v.price) return { tab: "pricing", message: "كل خيار اشتراك يحتاج اسماً وسعراً" };
    }
    return null;
  };

  /* ── Submit (unchanged payload) ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setTab(problem.tab);
      toast.error(problem.message);
      return;
    }
    setLoading(true);
    try {
      const variantTags = variants.map(
        (v) => `variant:${v.label.trim()}:${parseFloat(v.price)}${v.comparePrice ? `:${parseFloat(v.comparePrice)}` : ""}`
      );
      const seoTags: string[] = [];
      if (form.seoTitle.trim()) seoTags.push(`seo_title:${form.seoTitle.trim()}`);
      if (form.seoDescription.trim()) seoTags.push(`seo_desc:${form.seoDescription.trim()}`);
      if (form.seoKeywords.trim()) seoTags.push(`seo_kw:${form.seoKeywords.trim()}`);
      const bundleTags = bundleIds.filter((id) => id !== params.id).map((id) => `bundle:${id}`);

      const basePrice = variants.length > 0 ? parseFloat(variants[0].price) : parseFloat(form.price);

      const res = await fetch(`/api/admin/products/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: basePrice,
          comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
          sortOrder: parseInt(form.sortOrder),
          stockCount: parseInt(form.stockCount) || 0,
          features: form.features.split("\n").filter(Boolean),
          featuresAr: form.featuresAr.split("\n").filter(Boolean),
          tags: [...variantTags, ...seoTags, ...bundleTags],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حفظ التغييرات");
        router.push("/admin/products");
      } else {
        toast.error(data.error || "تعذّر حفظ التغييرات");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  /* ── Derived ── */
  const selectedCat = categories.find((c) => c.id === form.categoryId);
  const activeVariant = variants.length > 0 ? variants[selectedVariantIdx] : null;
  const previewPrice = activeVariant ? parseFloat(activeVariant.price) || 0 : parseFloat(form.price) || 0;
  const previewCompare = activeVariant ? parseFloat(activeVariant.comparePrice) || 0 : parseFloat(form.comparePrice) || 0;
  const featuresList = useMemo(() => form.featuresAr.split("\n").filter(Boolean), [form.featuresAr]);
  const availableStock = stockItems.filter((s) => !s.isDelivered).length;
  const deliveredStock = stockItems.length - availableStock;

  const checks = [
    { done: !!form.nameAr, label: "الاسم بالعربي" },
    { done: !!form.name, label: "الاسم بالإنجليزي" },
    { done: !!form.slug, label: "الرابط (slug)" },
    { done: !!form.categoryId, label: "الفئة" },
    { done: variants.length > 0 || !!form.price, label: "السعر أو الخيارات" },
    { done: !!form.descriptionAr, label: "الوصف" },
    { done: !!form.image, label: "الصورة" },
    { done: featuresList.length > 0, label: "المميزات" },
  ];

  if (pageLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-full rounded-control" />
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-52 rounded-card" />
          ))}
        </div>
        <div className="hidden space-y-4 xl:block">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-48 rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <Card padding="none">
        <ErrorState
          title="تعذّر تحميل المنتج"
          description="قد يكون المنتج محذوفاً أو أن الاتصال بالخادم فشل."
          onRetry={loadAll}
        />
        <div className="flex justify-center pb-6">
          <Link href="/admin/products">
            <Button variant="secondary" size="sm">
              العودة إلى المنتجات
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/admin" },
          { label: "المنتجات", href: "/admin/products" },
          { label: form.nameAr || "تعديل المنتج" },
        ]}
        title={form.nameAr || "تعديل المنتج"}
        description="عدّل بيانات المنتج ثم احفظ التغييرات."
        badge={
          <Badge variant={form.isActive ? "success" : "gray"} dot>
            {form.isActive ? "نشط" : "معطل"}
          </Badge>
        }
        actions={
          <Link href={`/admin/products/${params.id}/options`}>
            <Button variant="outline" icon={<Layers className="h-4 w-4" />}>
              الخيارات والأسعار
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Tabs variant="underline" ariaLabel="أقسام المنتج" value={tab} onChange={setTab} items={TABS} />

          <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-4">
            <TabPanel when="general" value={tab} className="space-y-4">
              <Section title="المعلومات الأساسية" contentClassName="space-y-4 pt-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="الاسم بالعربي" required value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} />
                  <Input label="الاسم بالإنجليزي" required value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <Input
                  label="الرابط (slug)"
                  required
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  hint="تغييره يغيّر رابط المنتج في المتجر وقد يكسر الروابط القديمة."
                />
                <Select
                  label="الفئة"
                  required
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  options={[{ value: "", label: "اختر الفئة" }, ...categories.map((c) => ({ value: c.id, label: c.nameAr }))]}
                />
                <Textarea label="الوصف بالعربي" value={form.descriptionAr} onChange={(e) => set("descriptionAr", e.target.value)} rows={3} />
                <Textarea label="الوصف بالإنجليزي" value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} />
              </Section>
            </TabPanel>

            <TabPanel when="pricing" value={tab} className="space-y-4">
              <Section title="السعر والتسليم" contentClassName="space-y-4 pt-0">
                {variants.length > 0 ? (
                  <Alert tone="info" icon={Layers} title="السعر يأتي من الخيارات">
                    عند وجود خيارات اشتراك، يُحدَّد السعر تلقائياً من الخيار الذي يختاره العميل.
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="السعر (ر.س)"
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                    />
                    <Input
                      label="السعر قبل الخصم"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.comparePrice}
                      onChange={(e) => set("comparePrice", e.target.value)}
                    />
                  </div>
                )}
                <Select
                  label="طريقة التسليم"
                  value={form.deliveryMethod}
                  onChange={(e) => set("deliveryMethod", e.target.value)}
                  options={[
                    { value: "MANUAL", label: "يدوي — تسلّم البيانات بنفسك بعد الطلب" },
                    { value: "AUTOMATIC", label: "تلقائي — يُسلَّم فوراً من المخزون" },
                  ]}
                />
              </Section>

              <VariantsEditor variants={variants} onAdd={addVariant} onRemove={removeVariant} onUpdate={updateVariant} />
            </TabPanel>

            <TabPanel when="inventory" value={tab} className="space-y-4">
              <Section
                title="إدارة المخزون"
                description="بيانات الاشتراكات الجاهزة للتسليم التلقائي"
                action={
                  <div className="flex gap-1.5">
                    <Badge variant="success">{availableStock} متاح</Badge>
                    <Badge variant="gray">{deliveredStock} مُسلَّم</Badge>
                  </div>
                }
                contentClassName="space-y-4 pt-0"
              >
                {form.deliveryMethod !== "AUTOMATIC" && (
                  <Alert tone="warning">
                    طريقة التسليم لهذا المنتج «يدوي» — لن يُستخدم المخزون تلقائياً. غيّرها من تبويب «التسعير» لتفعيل
                    التسليم الفوري.
                  </Alert>
                )}

                <div className="space-y-2.5">
                  <Textarea
                    label="إضافة بيانات اشتراك"
                    value={newStockData}
                    onChange={(e) => setNewStockData(e.target.value)}
                    placeholder={"بيانات الاشتراك الأول (مثال: email:pass)\n---\nبيانات الاشتراك الثاني"}
                    rows={4}
                    hint="افصل بين كل اشتراك بسطر يحتوي على --- لإضافة أكثر من عنصر دفعة واحدة."
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddStock}
                    loading={addingStock}
                    fullWidth
                    icon={<PlusCircle className="h-4 w-4" />}
                  >
                    إضافة للمخزون
                  </Button>
                </div>

                {stockItems.length === 0 ? (
                  <EmptyState
                    size="sm"
                    icon={Archive}
                    title="لا يوجد مخزون لهذا المنتج"
                    description="أضف بيانات الاشتراكات أعلاه ليتم تسليمها تلقائياً عند الشراء."
                  />
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">عناصر المخزون</p>
                    <ul className="max-h-72 space-y-1.5 overflow-y-auto pe-1">
                      {stockItems.map((item) => (
                        <li
                          key={item.id}
                          className={cn(
                            "flex items-center gap-2 rounded-control border px-3 py-2 text-xs",
                            item.isDelivered ? "border-line bg-surface-muted opacity-70" : "border-line bg-surface"
                          )}
                        >
                          <Badge variant={item.isDelivered ? "gray" : "success"} size="sm">
                            {item.isDelivered ? "مُسلَّم" : "متاح"}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate font-mono text-fg-muted" dir="ltr">
                            {showStockData[item.id] ? item.data : "••••••••••••"}
                          </span>
                          <IconButton
                            label={showStockData[item.id] ? "إخفاء البيانات" : "عرض البيانات"}
                            onClick={() => setShowStockData((p) => ({ ...p, [item.id]: !p[item.id] }))}
                            icon={showStockData[item.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          />
                          {!item.isDelivered && (
                            <IconButton
                              label="حذف عنصر المخزون"
                              variant="soft-danger"
                              onClick={() => setDeleteStockId(item.id)}
                              icon={<Trash2 className="h-3.5 w-3.5" />}
                            />
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>
            </TabPanel>

            <TabPanel when="media" value={tab} className="space-y-4">
              <Section title="صورة المنتج" contentClassName="space-y-4 pt-0">
                <Input label="رابط الصورة" value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://..." />
              </Section>
              <Section title="المميزات" description="كل ميزة في سطر منفصل" contentClassName="space-y-4 pt-0">
                <Textarea
                  label="المميزات بالعربي"
                  value={form.featuresAr}
                  onChange={(e) => set("featuresAr", e.target.value)}
                  rows={4}
                  placeholder={"جودة 4K\nأجهزة متعددة\nدعم فني"}
                />
                <Textarea
                  label="المميزات بالإنجليزي"
                  value={form.features}
                  onChange={(e) => set("features", e.target.value)}
                  rows={4}
                  placeholder={"4K Quality\nMultiple devices"}
                />
              </Section>
            </TabPanel>

            <TabPanel when="seo" value={tab} className="space-y-4">
              <Section title="تحسين محركات البحث" description="اترك الحقول فارغة لاستخدام اسم ووصف المنتج" contentClassName="space-y-4 pt-0">
                <SerpPreview
                  slug={form.slug}
                  title={form.seoTitle || form.nameAr}
                  description={form.seoDescription || form.descriptionAr}
                  showCounters
                />
                <Input
                  label="عنوان SEO"
                  value={form.seoTitle}
                  onChange={(e) => set("seoTitle", e.target.value)}
                  placeholder={form.nameAr}
                  hint="يُفضَّل ألا يتجاوز 60 حرفاً."
                />
                <Textarea
                  label="وصف SEO"
                  value={form.seoDescription}
                  onChange={(e) => set("seoDescription", e.target.value)}
                  rows={3}
                  placeholder={form.descriptionAr}
                  hint="يُفضَّل ألا يتجاوز 160 حرفاً."
                />
                <Input
                  label="كلمات مفتاحية إضافية"
                  value={form.seoKeywords}
                  onChange={(e) => set("seoKeywords", e.target.value)}
                  placeholder="كلمة1, كلمة2"
                  hint="افصل بين الكلمات بفواصل."
                />
              </Section>
            </TabPanel>

            <TabPanel when="advanced" value={tab} className="space-y-4">
              <Section title="الحالة والظهور" contentClassName="space-y-4 pt-0">
                <Switch
                  checked={form.isActive}
                  onChange={(v) => set("isActive", v)}
                  label="نشط"
                  description="المنتج مرئي وقابل للشراء في المتجر."
                />
                <Checkbox
                  checked={form.isFeatured}
                  onChange={(e) => set("isFeatured", e.target.checked)}
                  label="منتج مميز"
                  description="يظهر ضمن المنتجات المميزة في الصفحة الرئيسية."
                />
                <Input
                  label="ترتيب العرض"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => set("sortOrder", e.target.value)}
                  hint="الأرقام الأصغر تظهر أولاً."
                />
              </Section>

              <Section title="تتبّع الكمية" contentClassName="space-y-4 pt-0">
                <Switch
                  checked={form.trackStock}
                  onChange={(v) => set("trackStock", v)}
                  label="تتبّع المخزون لهذا المنتج"
                  description="عند التفعيل، يُخصم من الكمية مع كل طلب ويُمنع البيع عند نفادها. اتركه معطلاً للمنتجات حسب الطلب (كمية غير محدودة)."
                />
                {form.trackStock && (
                  <Input
                    label="الكمية المتوفرة"
                    type="number"
                    min={0}
                    value={form.stockCount}
                    onChange={(e) => set("stockCount", e.target.value)}
                    hint="عدد القطع المتاحة للبيع."
                  />
                )}
              </Section>

              <Section
                title="كمّل طلبك (منتجات مكمّلة)"
                description="منتجات تُعرض في صفحة هذا المنتج ضمن قسم «كمّل طلبك» ليضيفها العميل بضغطة."
                contentClassName="space-y-4 pt-0"
              >
                <BundlePicker value={bundleIds} onChange={setBundleIds} excludeId={params.id} />
              </Section>
            </TabPanel>
          </form>

          <FormActions
            formId="edit-product-form"
            loading={loading}
            submitLabel="حفظ التغييرات"
            onCancel={() => router.push("/admin/products")}
          />
        </div>

        {/* ════ Live preview ════ */}
        <aside className="hidden space-y-4 xl:sticky xl:top-[calc(var(--header-h)+1.25rem)] xl:block" aria-label="معاينة المنتج">
          <CompletenessCard checks={checks} />
          <ProductPreviewCard
            nameAr={form.nameAr}
            image={form.image}
            category={selectedCat}
            deliveryMethod={form.deliveryMethod}
            isFeatured={form.isFeatured}
            price={previewPrice}
            comparePrice={previewCompare}
            features={featuresList}
            variants={variants}
            selectedVariantIdx={selectedVariantIdx}
            onSelectVariant={setSelectedVariantIdx}
          />

          {variants.length > 0 && (
            <Section title="خيارات الاشتراك" contentClassName="pt-0">
              <ul className="space-y-1.5">
                {variants.map((v, i) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span className={cn("truncate", i === selectedVariantIdx ? "font-semibold text-fg" : "text-fg-muted")}>
                      {v.label || `خيار ${i + 1}`}
                    </span>
                    <span className="shrink-0 font-bold tnum text-fg">{v.price ? `${parseFloat(v.price)} ر.س` : "—"}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="المخزون" contentClassName="pt-0">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-success/10 p-3 text-center">
                <p className="text-xl font-bold tnum text-success">{availableStock}</p>
                <p className="text-[11px] text-success">متاح</p>
              </div>
              <div className="rounded-xl bg-surface-sunken p-3 text-center">
                <p className="text-xl font-bold tnum text-fg-muted">{deliveredStock}</p>
                <p className="text-[11px] text-fg-subtle">مُسلَّم</p>
              </div>
            </div>
          </Section>
        </aside>
      </div>

      <ConfirmModal
        isOpen={!!deleteStockId}
        onClose={() => setDeleteStockId(null)}
        onConfirm={handleDeleteStock}
        title="حذف عنصر المخزون"
        message="سيُحذف هذا الاشتراك نهائياً من المخزون ولن يكون متاحاً للتسليم."
        confirmLabel="نعم، احذف"
        loading={deletingStock}
      />
    </div>
  );
}
