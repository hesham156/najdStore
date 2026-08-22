"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  Save, Eye, Globe, FileText, Archive, ChevronDown, X, Tag, Image as ImageIcon, Search,
} from "lucide-react";

interface PostCategory {
  id: string;
  name: string;
  nameAr: string;
}

interface PostEditorProps {
  postId?: string;
}

const TABS = [
  { id: "ar", label: "عربي" },
  { id: "en", label: "English" },
  { id: "seo", label: "SEO" },
  { id: "settings", label: "الإعدادات" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function PostEditor({ postId }: PostEditorProps) {
  const router = useRouter();
  const isEdit = !!postId;
  const [tab, setTab] = useState<Tab>("ar");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<PostCategory[]>([]);

  const [titleAr, setTitleAr] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerptAr, setExcerptAr] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentAr, setContentAr] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [metaTitleAr, setMetaTitleAr] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescriptionAr, setMetaDescriptionAr] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  useEffect(() => {
    fetch("/api/admin/blog/categories").then(r => r.json()).then(d => {
      if (d.success) setCategories(d.data);
    });

    if (isEdit) {
      setLoading(true);
      fetch(`/api/admin/blog/posts/${postId}`).then(r => r.json()).then(d => {
        if (d.success) {
          const p = d.data;
          setTitleAr(p.titleAr); setTitle(p.title); setSlug(p.slug);
          setExcerptAr(p.excerptAr || ""); setExcerpt(p.excerpt || "");
          setContentAr(p.contentAr); setContent(p.content);
          setCoverImage(p.coverImage || ""); setCategoryId(p.categoryId || "");
          setStatus(p.status); setTags(p.tags || []);
          setMetaTitleAr(p.metaTitleAr || ""); setMetaTitle(p.metaTitle || "");
          setMetaDescriptionAr(p.metaDescriptionAr || ""); setMetaDescription(p.metaDescription || "");
        } else {
          toast.error("تعذّر تحميل المقال");
        }
        setLoading(false);
      });
    }
  }, [postId, isEdit]);

  const autoSlug = (text: string) =>
    text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  const handleTitleArChange = (val: string) => {
    setTitleAr(val);
    if (!isEdit || !slug) setSlug(autoSlug(val));
    if (!metaTitleAr) setMetaTitleAr(val);
  };

  const addTag = () => {
    const t = tagsInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagsInput("");
  };

  const save = async (overrideStatus?: "DRAFT" | "PUBLISHED" | "ARCHIVED") => {
    if (!titleAr || !title) { toast.error("العنوان مطلوب باللغتين"); return; }
    if (!contentAr || !content) { toast.error("المحتوى مطلوب باللغتين"); return; }

    setSaving(true);
    const payload = {
      title, titleAr, slug, excerpt, excerptAr, content, contentAr, coverImage,
      categoryId: categoryId || null, status: overrideStatus || status, tags,
      metaTitle, metaTitleAr, metaDescription, metaDescriptionAr,
    };

    const url = isEdit ? `/api/admin/blog/posts/${postId}` : "/api/admin/blog/posts";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      toast.success(isEdit ? "تم حفظ التغييرات" : "تم إنشاء المقال");
      if (!isEdit) router.push(`/admin/blog/${data.data.id}`);
    } else {
      toast.error(data.error || "حدث خطأ");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="py-20 text-center text-fg-subtle">جار التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-fg">
            {isEdit ? "تعديل المقال" : "مقال جديد"}
          </h1>
          {slug && <p className="text-xs text-fg-subtle mt-0.5">/blog/{slug}</p>}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="text-sm border border-line rounded-xl px-3 py-2 bg-surface text-fg"
          >
            <option value="DRAFT">مسودة</option>
            <option value="PUBLISHED">منشور</option>
            <option value="ARCHIVED">مؤرشف</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => save()} disabled={saving}>
            <Save className="h-4 w-4 ms-1" />
            حفظ
          </Button>
          {status !== "PUBLISHED" && (
            <Button size="sm" onClick={() => save("PUBLISHED")} disabled={saving}>
              <Globe className="h-4 w-4 ms-1" />
              نشر
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-fg-muted hover:text-fg"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Arabic */}
      {tab === "ar" && (
        <div className="space-y-4" dir="rtl">
          <div>
            <label className="block text-sm font-medium text-fg mb-1">العنوان (عربي) *</label>
            <Input value={titleAr} onChange={(e) => handleTitleArChange(e.target.value)} placeholder="عنوان المقال بالعربية" className="text-lg font-bold" />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1">الملخص (عربي)</label>
            <textarea
              value={excerptAr}
              onChange={(e) => setExcerptAr(e.target.value)}
              rows={2}
              placeholder="ملخص قصير يظهر في بطاقة المقال..."
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1">المحتوى (Markdown) *</label>
            <textarea
              value={contentAr}
              onChange={(e) => setContentAr(e.target.value)}
              rows={20}
              placeholder="اكتب محتوى المقال هنا بصيغة Markdown..."
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-fg-subtle mt-1">يدعم صيغة Markdown: **غامق**, *مائل*, ## عنوان, - قائمة, ` كود `</p>
          </div>
        </div>
      )}

      {/* Tab: English */}
      {tab === "en" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-fg mb-1">Title (English) *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Article title in English" className="text-lg font-bold" />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              placeholder="Short summary shown in card..."
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1">Content (Markdown) *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              placeholder="Write article content in Markdown..."
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      {/* Tab: SEO */}
      {tab === "seo" && (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              حقول SEO اختيارية. إذا تركتها فارغة، سيُستخدم عنوان وملخص المقال تلقائياً.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4" dir="rtl">
              <h3 className="font-bold text-fg">عربي</h3>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">عنوان الميتا</label>
                <Input value={metaTitleAr} onChange={(e) => setMetaTitleAr(e.target.value)} placeholder="عنوان للمحركات — 50-60 حرف" maxLength={60} />
                <p className="text-xs text-fg-subtle mt-1">{metaTitleAr.length}/60</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">وصف الميتا</label>
                <textarea
                  value={metaDescriptionAr}
                  onChange={(e) => setMetaDescriptionAr(e.target.value)}
                  rows={3}
                  placeholder="وصف للمحركات — 150-160 حرف"
                  maxLength={160}
                  className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-fg-subtle mt-1">{metaDescriptionAr.length}/160</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-bold text-fg">English</h3>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">Meta Title</label>
                <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Search engine title — 50-60 chars" maxLength={60} />
                <p className="text-xs text-fg-subtle mt-1">{metaTitle.length}/60</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">Meta Description</label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  placeholder="Search engine description — 150-160 chars"
                  maxLength={160}
                  className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-fg-subtle mt-1">{metaDescription.length}/160</p>
              </div>
            </div>
          </div>

          {/* Google Preview */}
          <div className="border border-line rounded-2xl p-5">
            <p className="text-xs font-bold text-fg-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Search className="h-3.5 w-3.5" /> معاينة نتيجة Google
            </p>
            <div className="space-y-1 max-w-xl">
              <p className="text-lg text-blue-700 dark:text-blue-400 font-medium truncate">
                {metaTitleAr || titleAr || "عنوان المقال"}
              </p>
              <p className="text-xs text-green-700 dark:text-green-500 truncate">
                {process.env.NEXTAUTH_URL || "https://yourstore.com"}/blog/{slug || "slug-المقال"}
              </p>
              <p className="text-sm text-fg-muted line-clamp-2">
                {metaDescriptionAr || excerptAr || "وصف المقال سيظهر هنا في نتائج البحث..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {tab === "settings" && (
        <div className="space-y-6 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-fg mb-1">الرابط (Slug)</label>
            <Input value={slug} onChange={(e) => setSlug(autoSlug(e.target.value))} placeholder="article-slug-here" dir="ltr" />
            <p className="text-xs text-fg-subtle mt-1">يُستخدم في رابط الصفحة. يجب أن يكون فريداً.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1">صورة الغلاف (URL)</label>
            <div className="flex gap-2">
              <Input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." dir="ltr" />
            </div>
            {coverImage && (
              <img src={coverImage} alt="" className="mt-2 h-32 w-full object-cover rounded-xl" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1">الفئة</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">بدون فئة</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nameAr}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-fg mb-1">الوسوم (Tags)</label>
            <div className="flex gap-2">
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="اكتب وسماً واضغط Enter"
              />
              <Button variant="outline" size="sm" onClick={addTag} type="button">
                <Tag className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2.5 py-1 rounded-lg text-xs font-medium">
                    {t}
                    <button onClick={() => setTags(prev => prev.filter(x => x !== t))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
