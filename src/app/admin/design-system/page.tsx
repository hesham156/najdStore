"use client";

import { useState } from "react";
import {
  Boxes,
  CheckCircle2,
  DollarSign,
  Download,
  Layers,
  LayoutTemplate,
  Package,
  Palette,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Users,
} from "lucide-react";
import { Badge, CountBadge, getStatusBadge, type BadgeVariant } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle, Section } from "@/components/ui/Card";
import { Checkbox, Input, Select, Switch, Textarea } from "@/components/ui/Input";
import { Column, DataTable, Pagination } from "@/components/ui/DataTable";
import { Dropdown } from "@/components/ui/Dropdown";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Alert, EmptyState, ErrorState, NoResultsState, Skeleton, SkeletonStats } from "@/components/ui/States";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { Tooltip } from "@/components/ui/Tooltip";
import { AdminStats, statColors } from "@/components/admin/AdminStats";
import { PageHeader } from "@/components/admin/PageHeader";
import { FilterSelect, SearchInput, Toolbar, ToolbarSpacer } from "@/components/admin/Toolbar";
import { CodeChip, Guidance, Row, Spec, Swatch } from "./parts";

/* ══════════════════════════════════════════════════════════════
   Living reference for the admin design system.
   Everything on this page renders the real components — if a
   component changes, this page changes with it.
   ══════════════════════════════════════════════════════════════ */

const SECTIONS = [
  { value: "foundations", label: "الأساسيات", icon: <Palette /> },
  { value: "components", label: "المكوّنات", icon: <Boxes /> },
  { value: "patterns", label: "الأنماط", icon: <LayoutTemplate /> },
];

const STATUS_KEYS = [
  "PENDING",
  "PENDING_PAYMENT_REVIEW",
  "PAYMENT_APPROVED",
  "PROCESSING",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "UPLOADED",
  "APPROVED",
  "REJECTED",
];

interface DemoRow {
  id: string;
  product: string;
  price: string;
  stock: number;
  status: string;
}

const DEMO_ROWS: DemoRow[] = [
  { id: "1", product: "اشتراك نتفلكس بريميوم", price: "49.00 ر.س", stock: 12, status: "DELIVERED" },
  { id: "2", product: "اشتراك سبوتيفاي عائلي", price: "29.00 ر.س", stock: 0, status: "PENDING" },
  { id: "3", product: "اشتراك شاهد VIP", price: "39.00 ر.س", stock: 3, status: "PROCESSING" },
];

export default function DesignSystemPage() {
  const [section, setSection] = useState("foundations");

  /* Interactive demo state */
  const [switchOn, setSwitchOn] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [demoTab, setDemoTab] = useState("all");
  const [demoSearch, setDemoSearch] = useState("");
  const [demoFilter, setDemoFilter] = useState("all");
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [demoPage, setDemoPage] = useState(2);

  const demoColumns: Column<DemoRow>[] = [
    { key: "product", title: "المنتج", primary: true, sortable: true },
    { key: "price", title: "السعر" },
    {
      key: "stock",
      title: "المخزون",
      render: (v) => (
        <Badge variant={Number(v) === 0 ? "danger" : Number(v) < 5 ? "warning" : "success"} dot>
          {Number(v) === 0 ? "نفد" : `${v} متاح`}
        </Badge>
      ),
    },
    {
      key: "status",
      title: "الحالة",
      hideOnMobile: true,
      render: (v) => {
        const b = getStatusBadge(String(v));
        return <Badge variant={b.variant}>{b.label}</Badge>;
      },
    },
    {
      key: "actions",
      title: "",
      align: "end",
      cardHidden: true,
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton label={`تعديل ${row.product}`} icon={<Pencil className="h-3.5 w-3.5" />} />
          <Dropdown
            label={`إجراءات ${row.product}`}
            items={[
              { label: "عرض التفاصيل", icon: <Package /> },
              { label: "الخيارات والأسعار", icon: <Layers /> },
              { label: "حذف", icon: <Trash2 />, danger: true, separated: true },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="نظام التصميم"
        description="مرجع حيّ لكل الألوان والمكوّنات والأنماط المستخدمة في لوحة الإدارة. اضغط على أي كود لنسخه."
        badge={<Badge variant="primary">مرجع داخلي</Badge>}
      />

      <Tabs variant="underline" ariaLabel="أقسام نظام التصميم" value={section} onChange={setSection} items={SECTIONS} />

      {/* ═══════════════ الأساسيات ═══════════════ */}
      <TabPanel when="foundations" value={section} className="space-y-5">
        <Section
          title="ألوان الأسطح والحدود"
          description="كل الألوان معرّفة كمتغيّرات CSS، وتتبدّل تلقائياً بين الوضع الفاتح والداكن. لا تستخدم ألوان Tailwind الرمادية مباشرة."
          contentClassName="space-y-5 pt-0"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Swatch className="bg-canvas" name="bg-canvas" variable="--canvas" border />
            <Swatch className="bg-surface" name="bg-surface" variable="--surface" border />
            <Swatch className="bg-surface-muted" name="bg-surface-muted" variable="--surface-muted" border />
            <Swatch className="bg-surface-sunken" name="bg-surface-sunken" variable="--surface-sunken" border />
            <Swatch className="bg-surface-hover" name="bg-surface-hover" variable="--surface-hover" border />
            <Swatch className="bg-line-strong" name="bg-line-strong" variable="--line-strong" />
          </div>

          <Guidance
            good="استخدم bg-surface للبطاقات، bg-canvas لخلفية الصفحة، وbg-surface-hover لحالة المرور."
            bad="لا تكتب bg-white dark:bg-gray-800 — ستكسر التناسق عند تغيير الثيم."
          />
        </Section>

        <Section
          title="ألوان النص"
          description="ثلاث درجات فقط: أساسي للعناوين والقيم، ثانوي للشروحات، وخفيف للتلميحات."
          contentClassName="space-y-3 pt-0"
        >
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-muted px-4 py-3">
              <p className="text-sm font-semibold text-fg">نص أساسي — العناوين والقيم المهمة</p>
              <CodeChip value="text-fg" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-muted px-4 py-3">
              <p className="text-sm text-fg-muted">نص ثانوي — الشروحات والتسميات</p>
              <CodeChip value="text-fg-muted" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-muted px-4 py-3">
              <p className="text-sm text-fg-subtle">نص خفيف — التلميحات والقيم الفارغة</p>
              <CodeChip value="text-fg-subtle" />
            </div>
          </div>
        </Section>

        <Section
          title="الألوان الدلالية"
          description="لون واحد لكل معنى، ثابت في كل الصفحات. لا تستخدم لوناً دلالياً لغرض جمالي."
          contentClassName="space-y-4 pt-0"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Swatch className="bg-primary-600" name="primary" variable="العلامة والإجراء الرئيسي" />
            <Swatch className="bg-emerald-600" name="success" variable="نجاح / مكتمل / متاح" />
            <Swatch className="bg-amber-500" name="warning" variable="تحذير / قيد الانتظار" />
            <Swatch className="bg-red-600" name="danger" variable="خطأ / حذف / مرفوض" />
            <Swatch className="bg-blue-600" name="info" variable="معلومة / قيد المراجعة" />
          </div>
          <Alert tone="info">
            حالات الطلبات والمدفوعات والتذاكر تُترجم كلها عبر <code className="font-mono">getStatusBadge()</code> — أضف
            أي حالة جديدة هناك بدل تلوينها يدوياً.
          </Alert>
        </Section>

        <Section title="الخطوط والأحجام" description="خط Cairo لكل الواجهة. الأحجام محدودة عمداً لإبقاء التسلسل البصري واضحاً." contentClassName="space-y-4 pt-0">
          <Spec title="عنوان الصفحة" usage="text-xl font-bold text-fg">
            <p className="text-xl font-bold text-fg">إدارة المنتجات</p>
          </Spec>
          <Spec title="عنوان قسم" usage="text-sm font-bold text-fg">
            <p className="text-sm font-bold text-fg">المعلومات الأساسية</p>
          </Spec>
          <Spec title="نص أساسي" usage="text-[13px] text-fg">
            <p className="text-[13px] text-fg">محتوى الجداول والحقول والقوائم.</p>
          </Spec>
          <Spec title="نص مساعد" usage="text-xs text-fg-muted">
            <p className="text-xs text-fg-muted">شرح إضافي أسفل الحقل أو العنوان.</p>
          </Spec>
          <Spec title="أرقام" usage="tnum" description="يمنع اهتزاز الأعمدة الرقمية عند تغيّر القيم.">
            <p className="text-lg font-bold tnum text-fg">12,450.00 ر.س</p>
          </Spec>
        </Section>

        <Section title="الاستدارة والظلال" description="مستويان فقط من الاستدارة، وظلال خفيفة جداً تُستخدم لفصل الأسطح لا لتزيينها." contentClassName="space-y-4 pt-0">
          <Spec title="الاستدارة" usage="rounded-card · rounded-control">
            <Row className="gap-3">
              <div className="flex h-16 w-28 items-center justify-center rounded-card border border-line bg-surface-muted text-[11px] text-fg-muted">
                البطاقات 16px
              </div>
              <div className="flex h-16 w-28 items-center justify-center rounded-control border border-line bg-surface-muted text-[11px] text-fg-muted">
                الحقول 12px
              </div>
              <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-line bg-surface-muted text-[11px] text-fg-muted">
                الأزرار الصغيرة 8px
              </div>
            </Row>
          </Spec>
          <Spec title="الظلال" usage="shadow-card · shadow-pop · shadow-overlay">
            <Row className="gap-3">
              <div className="flex h-16 w-28 items-center justify-center rounded-card border border-line bg-surface text-[11px] text-fg-muted shadow-card">
                بطاقة
              </div>
              <div className="flex h-16 w-28 items-center justify-center rounded-card border border-line bg-surface text-[11px] text-fg-muted shadow-pop">
                قائمة منسدلة
              </div>
              <div className="flex h-16 w-28 items-center justify-center rounded-card border border-line bg-surface text-[11px] text-fg-muted shadow-overlay">
                نافذة
              </div>
            </Row>
          </Spec>
        </Section>

        <Section title="المسافات" description="مقياس موحّد: 5 بين أقسام الصفحة، 4 داخل النماذج، 3 بين البطاقات المتجاورة." contentClassName="space-y-3 pt-0">
          {[
            { label: "بين أقسام الصفحة", cls: "space-y-5", px: "20px" },
            { label: "داخل النماذج والبطاقات", cls: "space-y-4", px: "16px" },
            { label: "بين العناصر المتجاورة", cls: "gap-3", px: "12px" },
            { label: "بين عنصر وأيقونته", cls: "gap-2", px: "8px" },
          ].map((s) => (
            <div key={s.cls} className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-muted px-4 py-2.5">
              <span className="text-[13px] text-fg">{s.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-[11px] tnum text-fg-subtle">{s.px}</span>
                <CodeChip value={s.cls} />
              </span>
            </div>
          ))}
        </Section>
      </TabPanel>

      {/* ═══════════════ المكوّنات ═══════════════ */}
      <TabPanel when="components" value={section} className="space-y-5">
        <Section title="الأزرار" description="زر رئيسي واحد فقط في كل شاشة. الباقي ثانوي أو شفاف." contentClassName="space-y-5 pt-0">
          <Spec title="الأنواع" usage='<Button variant="primary" />'>
            <Row>
              <Button>أساسي</Button>
              <Button variant="secondary">ثانوي</Button>
              <Button variant="outline">محدَّد</Button>
              <Button variant="ghost">شفاف</Button>
              <Button variant="danger">حذف</Button>
              <Button variant="success">تأكيد</Button>
              <Button variant="soft-danger">إجراء خطر خفيف</Button>
            </Row>
          </Spec>

          <Spec title="الأحجام" usage='size="xs | sm | md | lg"'>
            <Row>
              <Button size="xs">صغير جداً</Button>
              <Button size="sm">صغير</Button>
              <Button size="md">متوسط</Button>
              <Button size="lg">كبير</Button>
            </Row>
          </Spec>

          <Spec title="الحالات" usage="loading · disabled" description="زر التحميل يحتفظ بعرضه حتى لا تقفز الواجهة.">
            <Row>
              <Button icon={<Plus className="h-4 w-4" />}>مع أيقونة</Button>
              <Button loading>جارٍ الحفظ</Button>
              <Button disabled>معطّل</Button>
              <Button variant="secondary" loading>
                جارٍ التحديث
              </Button>
            </Row>
          </Spec>

          <Spec
            title="أزرار الأيقونات"
            usage='<IconButton label="حذف" />'
            description="يجب تمرير label دائماً — هو ما يقرأه قارئ الشاشة ويظهر كتلميح."
          >
            <Row>
              <Tooltip content="تعديل" side="top">
                <IconButton label="تعديل" icon={<Pencil className="h-4 w-4" />} />
              </Tooltip>
              <Tooltip content="تنزيل" side="top">
                <IconButton label="تنزيل" variant="secondary" icon={<Download className="h-4 w-4" />} />
              </Tooltip>
              <Tooltip content="حذف" side="top">
                <IconButton label="حذف" variant="soft-danger" icon={<Trash2 className="h-4 w-4" />} />
              </Tooltip>
            </Row>
          </Spec>

          <Guidance
            good="زر رئيسي واحد للإجراء الأهم، وبقية الإجراءات في قائمة «المزيد»."
            bad="صف من أربعة أزرار ملوّنة في كل صف من الجدول."
          />
        </Section>

        <Section title="الشارات" description="شارة الحالة تحمل معناها من اللون والنص معاً — لا تعتمد على اللون وحده." contentClassName="space-y-5 pt-0">
          <Spec title="الأنواع" usage='<Badge variant="success" dot />'>
            <Row>
              {(["primary", "success", "warning", "danger", "info", "purple", "gray"] as BadgeVariant[]).map((v) => (
                <Badge key={v} variant={v} dot>
                  {v}
                </Badge>
              ))}
            </Row>
          </Spec>

          <Spec title="حالات النظام" usage="getStatusBadge(status)" description="ترجمة ولون موحّدان لكل حالة في المتجر.">
            <Row>
              {STATUS_KEYS.map((s) => {
                const b = getStatusBadge(s);
                return (
                  <Badge key={s} variant={b.variant}>
                    {b.label}
                  </Badge>
                );
              })}
            </Row>
          </Spec>

          <Spec title="عدّاد" usage="<CountBadge value={12} />">
            <Row>
              <CountBadge value={3} />
              <CountBadge value={24} />
              <CountBadge value={128} />
            </Row>
          </Spec>
        </Section>

        <Section
          title="الحقول"
          description="لكل حقل تسمية ظاهرة دائماً. لا يُستخدم النص البديل (placeholder) بديلاً عن التسمية."
          contentClassName="space-y-5 pt-0"
        >
          <Spec title="نص وقائمة" usage="<Input /> · <Select />">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="حقل عادي" placeholder="اكتب هنا" hint="نص مساعد يوضّح المطلوب" />
              <Input label="حقل مطلوب" required placeholder="لا يمكن تركه فارغاً" />
              <Select
                label="قائمة اختيار"
                options={[
                  { value: "a", label: "الخيار الأول" },
                  { value: "b", label: "الخيار الثاني" },
                ]}
              />
              <Input label="حقل معطّل" disabled defaultValue="غير قابل للتعديل" />
            </div>
          </Spec>

          <Spec title="حالة الخطأ" usage='error="رسالة الخطأ"' description="الرسالة تشرح المشكلة وما يفعله المستخدم لحلّها.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="البريد الإلكتروني" defaultValue="user@" error="أدخل بريداً صحيحاً مثل name@example.com" />
              <Input label="السعر" type="number" defaultValue="-5" error="السعر يجب أن يكون أكبر من صفر" />
            </div>
          </Spec>

          <Spec title="نص طويل" usage="<Textarea />">
            <Textarea label="الوصف" rows={3} placeholder="اكتب وصفاً للمنتج..." hint="الوصف الجيد يحسّن الظهور في نتائج البحث." />
          </Spec>

          <Spec title="خيارات ثنائية" usage="<Switch /> · <Checkbox />" description="المفتاح للتغيير الفوري، ومربع الاختيار لما يُحفظ مع النموذج.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Switch checked={switchOn} onChange={setSwitchOn} label="المنتج نشط" description="مرئي وقابل للشراء في المتجر." />
              <Checkbox defaultChecked label="منتج مميز" description="يظهر في الصفحة الرئيسية." />
            </div>
          </Spec>

          <Guidance
            good="«أدخل بريداً صحيحاً مثل name@example.com» — تشرح الخطأ والحل."
            bad="«قيمة غير صالحة» — لا تخبر المستخدم بما عليه فعله."
          />
        </Section>

        <Section title="التبويبات" description="ثلاثة أنماط: تحتي لأقسام الصفحة، حبّي لتصفية الجداول، ومقسّم للتبديل بين عرضين." contentClassName="space-y-5 pt-0">
          <Spec title="تحتي" usage='variant="underline"' description="لتقسيم صفحة أو نموذج طويل إلى أقسام.">
            <Tabs
              variant="underline"
              ariaLabel="مثال تبويب تحتي"
              value={demoTab}
              onChange={setDemoTab}
              items={[
                { value: "all", label: "المعلومات الأساسية" },
                { value: "b", label: "التسعير" },
                { value: "c", label: "المخزون" },
              ]}
            />
          </Spec>
          <Spec title="حبّي" usage='variant="pill"' description="لتصفية جدول مع إظهار عدد العناصر في كل حالة.">
            <Tabs
              ariaLabel="مثال تبويب حبّي"
              value={demoTab}
              onChange={setDemoTab}
              items={[
                { value: "all", label: "الكل", count: 128 },
                { value: "b", label: "نشط", count: 96 },
                { value: "c", label: "معطّل", count: 32 },
              ]}
            />
          </Spec>
          <Spec title="مقسّم" usage='variant="segmented"' description="للتبديل بين عرضين متكافئين، مثل الفترة الزمنية.">
            <Tabs
              variant="segmented"
              ariaLabel="مثال تبويب مقسّم"
              value={demoTab}
              onChange={setDemoTab}
              items={[
                { value: "all", label: "7 أيام" },
                { value: "b", label: "30 يوماً" },
                { value: "c", label: "90 يوماً" },
              ]}
            />
          </Spec>
        </Section>

        <Section title="التنبيهات" description="تنبيه داخل الصفحة للمعلومات الدائمة، و Toast للنتيجة الفورية بعد إجراء." contentClassName="space-y-2.5 pt-0">
          <Alert tone="info" title="معلومة">عند وجود خيارات اشتراك، يُحدَّد السعر تلقائياً من الخيار الذي يختاره العميل.</Alert>
          <Alert tone="success" title="تم الحفظ">حُفظت التغييرات وظهرت في المتجر مباشرة.</Alert>
          <Alert tone="warning" title="المخزون منخفض">بقي أقل من 5 اشتراكات — أضف مخزوناً قبل نفاده.</Alert>
          <Alert tone="danger" title="تعذّر الاتصال">لم نتمكّن من الوصول إلى الخادم. تحقّق من اتصالك ثم أعد المحاولة.</Alert>
        </Section>

        <Section title="النوافذ والقوائم" description="النافذة تحبس التركيز وتُغلق بـ Esc وتعيد التركيز إلى الزر الذي فتحها." contentClassName="space-y-4 pt-0">
          <Spec title="نافذة" usage="<Modal /> · <ConfirmModal />">
            <Row>
              <Button variant="secondary" onClick={() => setModalOpen(true)}>
                افتح نافذة
              </Button>
              <Button variant="soft-danger" onClick={() => setConfirmOpen(true)}>
                افتح تأكيد حذف
              </Button>
            </Row>
          </Spec>
          <Spec title="قائمة منسدلة" usage="<Dropdown items={[...]} />" description="للإجراءات الثانوية في صفوف الجداول بدل صفّ من الأزرار.">
            <Dropdown
              label="مثال على قائمة الإجراءات"
              items={[
                { label: "عرض التفاصيل", icon: <Package /> },
                { label: "تعديل", icon: <Pencil /> },
                { label: "حذف", icon: <Trash2 />, danger: true, separated: true },
              ]}
            />
          </Spec>
          <Spec title="تلميح" usage="<Tooltip content='...' />" description="شرح إضافي فقط — لا تضع فيه معلومة لا توجد في مكان آخر.">
            <Tooltip content="هذا تلميح توضيحي" side="top">
              <Button variant="secondary" size="sm">
                مرّر فوقي
              </Button>
            </Tooltip>
          </Spec>
        </Section>
      </TabPanel>

      {/* ═══════════════ الأنماط ═══════════════ */}
      <TabPanel when="patterns" value={section} className="space-y-5">
        <Section
          title="ترويسة الصفحة"
          description="كل صفحة تبدأ بالمكوّن نفسه: مسار التنقّل، ثم العنوان والوصف، ثم الإجراء الرئيسي."
          contentClassName="space-y-3 pt-0"
        >
          <div className="rounded-control border border-line bg-surface-muted p-4">
            <PageHeader
              breadcrumbs={[
                { label: "لوحة التحكم", href: "/admin" },
                { label: "المنتجات", href: "/admin/products" },
                { label: "منتج جديد" },
              ]}
              title="منتج جديد"
              description="املأ المعلومات الأساسية ثم انتقل بين الأقسام."
              badge={<Badge variant="success" dot>نشط</Badge>}
              actions={
                <>
                  <Button variant="secondary">إلغاء</Button>
                  <Button icon={<Plus className="h-4 w-4" />}>حفظ</Button>
                </>
              }
            />
          </div>
          <CodeChip value="<PageHeader title description breadcrumbs actions />" />
        </Section>

        <Section
          title="صف المؤشّرات"
          description="أربعة مؤشّرات كحدّ أقصى، مع نسبة التغيّر مقارنة بالفترة السابقة عندما تكون متاحة."
          contentClassName="space-y-3 pt-0"
        >
          <AdminStats
            items={[
              {
                label: "المبيعات",
                value: "12,450.00 ر.س",
                icon: DollarSign,
                color: statColors.primary,
                delta: 18,
                deltaLabel: "مقارنة بالفترة السابقة",
              },
              { label: "الطلبات", value: 214, icon: ShoppingBag, color: statColors.blue, delta: -6, deltaLabel: "مقارنة بالفترة السابقة" },
              { label: "عملاء جدد", value: 38, icon: Users, color: statColors.green, delta: 0, deltaLabel: "بدون تغيّر" },
              { label: "منتجات نشطة", value: 56, icon: Package, color: statColors.amber, hint: "من إجمالي 61" },
            ]}
          />
          <CodeChip value="<AdminStats items={[{ label, value, icon, color, delta }]} />" />
        </Section>

        <Section
          title="شريط الأدوات والجدول"
          description="البحث أولاً، ثم التصفية، ثم إجراءات العرض. عند تحديد صفوف يظهر شريط الإجراءات الجماعية مكان الأدوات."
          contentClassName="space-y-4 pt-0"
        >
          <Toolbar>
            <SearchInput value={demoSearch} onChange={setDemoSearch} placeholder="ابحث باسم المنتج..." />
            <Tabs
              ariaLabel="مثال تصفية"
              value={demoTab}
              onChange={setDemoTab}
              items={[
                { value: "all", label: "الكل", count: 3 },
                { value: "b", label: "نشط", count: 2 },
                { value: "c", label: "معطّل", count: 1 },
              ]}
            />
            <FilterSelect
              label="تصفية حسب الفئة"
              value={demoFilter}
              onChange={setDemoFilter}
              options={[
                { value: "all", label: "كل الفئات" },
                { value: "streaming", label: "بث ومشاهدة" },
              ]}
            />
            <ToolbarSpacer />
            <Button variant="ghost" size="sm">
              مسح التصفية
            </Button>
          </Toolbar>

          <DataTable
            columns={demoColumns}
            data={DEMO_ROWS}
            selectable
            selectedIds={selectedRows}
            onSelectionChange={setSelectedRows}
            sortKey="product"
            sortDirection="asc"
            onSort={() => {}}
            bulkActions={
              <>
                <Button size="sm" variant="secondary">
                  تفعيل
                </Button>
                <Button size="sm" variant="secondary">
                  تعطيل
                </Button>
                <Button size="sm" variant="soft-danger">
                  حذف
                </Button>
              </>
            }
          />

          <Pagination
            currentPage={demoPage}
            totalPages={9}
            totalItems={87}
            pageSize={10}
            onPageChange={setDemoPage}
            onPageSizeChange={() => {}}
          />

          <Alert tone="info">
            الجدول يتحوّل تلقائياً إلى بطاقات رأسية على الشاشات الصغيرة. حدّد <code className="font-mono">primary</code>{" "}
            للعمود الذي يصبح عنوان البطاقة، و<code className="font-mono">cardHidden</code> لعمود الإجراءات.
          </Alert>
        </Section>

        <Section
          title="الحالات الفارغة والأخطاء"
          description="كل رسالة تخبر المستخدم بما حدث وبالخطوة التالية — لا تكتفِ بـ«لا توجد بيانات»."
          contentClassName="space-y-4 pt-0"
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card padding="none" flat className="border-dashed">
              <EmptyState
                icon={Package}
                title="لا توجد منتجات بعد"
                description="ابدأ بإضافة أول منتج ليظهر في متجرك ويصبح متاحاً للشراء."
                action={<Button size="sm" icon={<Plus className="h-4 w-4" />}>إضافة منتج</Button>}
              />
            </Card>
            <Card padding="none" flat className="border-dashed">
              <NoResultsState query="نتفلكس" onClear={() => {}} />
            </Card>
            <Card padding="none" flat className="border-dashed">
              <ErrorState onRetry={() => {}} />
            </Card>
          </div>
          <Row className="gap-2">
            <CodeChip value="<EmptyState />" />
            <CodeChip value="<NoResultsState />" />
            <CodeChip value="<ErrorState onRetry />" />
          </Row>
        </Section>

        <Section
          title="حالات التحميل"
          description="الهيكل العظمي يحاكي شكل المحتوى القادم حتى لا تقفز الصفحة عند وصول البيانات."
          contentClassName="space-y-4 pt-0"
        >
          <SkeletonStats count={4} />
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Row className="gap-2">
            <CodeChip value="<Skeleton className='h-4 w-1/3' />" />
            <CodeChip value="<SkeletonStats />" />
            <CodeChip value="<TableSkeleton />" />
          </Row>
        </Section>

        <Section title="البطاقات والأقسام" description="Section هو الغلاف الافتراضي لأي كتلة محتوى لها عنوان." contentClassName="space-y-4 pt-0">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section
              title="قسم بعنوان وإجراء"
              description="وصف قصير يشرح محتوى القسم"
              action={
                <Button size="sm" variant="ghost">
                  عرض الكل
                </Button>
              }
            >
              <p className="text-[13px] text-fg-muted">المحتوى يوضع هنا.</p>
            </Section>
            <Card>
              <CardTitle>بطاقة بسيطة</CardTitle>
              <CardDescription>للمحتوى الذي لا يحتاج ترويسة كاملة.</CardDescription>
              <p className="mt-3 text-[13px] text-fg-muted">المحتوى يوضع هنا.</p>
            </Card>
          </div>
          <Row className="gap-2">
            <CodeChip value="<Section title description action />" />
            <CodeChip value="<Card padding='md' hover flat />" />
          </Row>
        </Section>
      </TabPanel>

      {/* ── Demo modals ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="عنوان النافذة"
        description="وصف قصير يشرح ما تفعله هذه النافذة."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              إلغاء
            </Button>
            <Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setModalOpen(false)}>
              تأكيد
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="الاسم" placeholder="اكتب الاسم" />
          <Textarea label="ملاحظات" rows={3} />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        title="حذف المنتج"
        message="سيتم حذف هذا المنتج نهائياً من الكتالوج. لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="نعم، احذف"
      />
    </div>
  );
}
