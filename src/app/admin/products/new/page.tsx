"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Image as ImageIcon, Info, Layers, Settings2, Sparkles, Tag } from "lucide-react";
import { Section } from "@/components/ui/Card";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/States";
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

const TABS = [
  { value: "general", label: "المعلومات الأساسية", icon: <Info /> },
  { value: "pricing", label: "التسعير والخيارات", icon: <Tag /> },
  { value: "media", label: "الصور والمميزات", icon: <ImageIcon /> },
  { value: "advanced", label: "إعدادات متقدمة", icon: <Settings2 /> },
];

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("general");
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [bundleIds, setBundleIds] = useState<string[]>([]);
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
    duration: "",
    isFeatured: false,
    sortOrder: "0",
  });

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategories(d.data);
      })
      .catch(() => toast.error("تعذّر تحميل الفئات — حدّث الصفحة وحاول مرة أخرى"));
  }, []);

  const set = (field: string, value: string | boolean) => setForm((f) => ({ ...f, [field]: value }));

  /* ── Variants ── */
  const addVariant = () => setVariants((v) => [...v, { label: "", price: "", comparePrice: "" }]);
  const removeVariant = (i: number) => {
    setVariants((v) => v.filter((_, idx) => idx !== i));
    setSelectedVariantIdx(0);
  };
  const updateVariant = (i: number, field: keyof Variant, val: string) =>
    setVariants((v) => v.map((vr, idx) => (idx === i ? { ...vr, [field]: val } : vr)));

  /* Hidden tab panels are unmounted, so the browser cannot run its own
     required-field validation — we check here and jump to the right tab. */
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
      const bundleTags = bundleIds.map((id) => `bundle:${id}`);
      const basePrice = variants.length > 0 ? parseFloat(variants[0].price) : parseFloat(form.price);
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: basePrice,
          comparePrice: form.comparePrice ? parseFloat(form.comparePrice) : null,
          sortOrder: parseInt(form.sortOrder),
          featuresAr: form.featuresAr.split("\n").filter(Boolean),
          features: form.features.split("\n").filter(Boolean),
          tags: [...variantTags, ...bundleTags],
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("تم إنشاء المنتج");
        router.push("/admin/products");
      } else {
        toast.error(data.error || "تعذّر إنشاء المنتج");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  /* ── Preview ── */
  const hasVariants = variants.length > 0;
  const selectedCat = categories.find((c) => c.id === form.categoryId);
  const activeVariant = hasVariants ? variants[selectedVariantIdx] : null;
  const previewPrice = activeVariant ? parseFloat(activeVariant.price) || 0 : parseFloat(form.price) || 0;
  const previewCompare = activeVariant ? parseFloat(activeVariant.comparePrice) || 0 : parseFloat(form.comparePrice) || 0;
  const featuresList = useMemo(() => form.featuresAr.split("\n").filter(Boolean), [form.featuresAr]);

  const checks = [
    { done: !!form.nameAr, label: "الاسم بالعربي" },
    { done: !!form.name, label: "الاسم بالإنجليزي" },
    { done: !!form.slug, label: "الرابط (slug)" },
    { done: !!form.categoryId, label: "الفئة" },
    { done: hasVariants || !!form.price, label: "السعر أو الخيارات" },
    { done: !!form.descriptionAr, label: "الوصف" },
    { done: !!form.image, label: "الصورة" },
    { done: featuresList.length > 0, label: "المميزات" },
  ];

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        breadcrumbs={[
          { label: "لوحة التحكم", href: "/admin" },
          { label: "المنتجات", href: "/admin/products" },
          { label: "منتج جديد" },
        ]}
        title="منتج جديد"
        description="املأ المعلومات الأساسية ثم انتقل بين الأقسام لإكمال بقية التفاصيل."
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_360px]">
        {/* ════ Form ════ */}
        <div className="min-w-0 space-y-4">
          <Tabs variant="underline" ariaLabel="أقسام المنتج" value={tab} onChange={setTab} items={TABS} />

          <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
            <TabPanel when="general" value={tab} className="space-y-4">
              <Section title="المعلومات الأساسية" description="تظهر هذه الحقول للعميل في المتجر" contentClassName="space-y-4 pt-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="الاسم بالعربي" required value={form.nameAr} onChange={(e) => set("nameAr", e.target.value)} />
                  <Input label="الاسم بالإنجليزي" required value={form.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <Input
                  label="الرابط (slug)"
                  required
                  value={form.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  hint="يظهر في رابط المنتج. استخدم حروفاً إنجليزية وشرطات فقط — مثال: netflix-premium"
                />
                <Select
                  label="الفئة"
                  required
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  options={[{ value: "", label: "اختر الفئة" }, ...categories.map((c) => ({ value: c.id, label: c.nameAr }))]}
                />
                <Textarea
                  label="الوصف بالعربي"
                  value={form.descriptionAr}
                  onChange={(e) => set("descriptionAr", e.target.value)}
                  rows={3}
                  hint="وصف واضح يزيد ثقة العميل ويحسّن ظهور المنتج في نتائج البحث."
                />
                <Textarea
                  label="الوصف بالإنجليزي"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                />
              </Section>
            </TabPanel>

            <TabPanel when="pricing" value={tab} className="space-y-4">
              <Section title="السعر والتسليم" contentClassName="space-y-4 pt-0">
                {hasVariants ? (
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
                      hint="يظهر مشطوباً بجانب السعر الحالي."
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
                <Input
                  label="مدة الاشتراك"
                  value={form.duration}
                  onChange={(e) => set("duration", e.target.value)}
                  placeholder="مثال: شهر واحد"
                  hint="اختياري — يظهر بجانب اسم المنتج."
                />
              </Section>

              <VariantsEditor variants={variants} onAdd={addVariant} onRemove={removeVariant} onUpdate={updateVariant} />
            </TabPanel>

            <TabPanel when="media" value={tab} className="space-y-4">
              <Section title="صورة المنتج" contentClassName="space-y-4 pt-0">
                <Input
                  label="رابط الصورة"
                  value={form.image}
                  onChange={(e) => set("image", e.target.value)}
                  placeholder="https://..."
                  hint="الصورة الواضحة ترفع معدل التحويل بشكل ملحوظ."
                />
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
                  placeholder={"4K Quality\nMultiple devices\nSupport"}
                />
              </Section>
            </TabPanel>

            <TabPanel when="advanced" value={tab} className="space-y-4">
              <Section title="إعدادات متقدمة" contentClassName="space-y-4 pt-0">
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

              <Section
                title="كمّل طلبك (منتجات مكمّلة)"
                description="منتجات تُعرض في صفحة هذا المنتج ضمن قسم «كمّل طلبك» ليضيفها العميل بضغطة."
                contentClassName="space-y-4 pt-0"
              >
                <BundlePicker value={bundleIds} onChange={setBundleIds} />
              </Section>
            </TabPanel>
          </form>

          <FormActions
            formId="product-form"
            loading={loading}
            submitLabel="إنشاء المنتج"
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
          <Section title="معاينة نتيجة Google" contentClassName="space-y-3 pt-0">
            <SerpPreview
              slug={form.slug}
              title={`${form.nameAr || "اسم المنتج"}${selectedCat ? ` | ${selectedCat.nameAr}` : ""}`}
              description={form.descriptionAr || `اشتر ${form.nameAr || "المنتج"} بأفضل الأسعار...`}
            />
            <Alert tone="info" icon={Sparkles} title="نصائح سريعة">
              <ul className="mt-1 space-y-0.5">
                <li>• الصورة الواضحة تزيد المبيعات بشكل ملحوظ.</li>
                <li>• الوصف الجيد يحسّن الظهور في Google.</li>
                <li>• خيارات الاشتراك ترفع متوسط قيمة الطلب.</li>
              </ul>
            </Alert>
          </Section>
        </aside>
      </div>
    </div>
  );
}
