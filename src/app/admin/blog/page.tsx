"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Search, Eye, Globe, FileText, Archive } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/Modal";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/PageHeader";

type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface Post {
  id: string;
  titleAr: string;
  title: string;
  slug: string;
  status: PostStatus;
  readingTime: number;
  viewCount: number;
  publishedAt: string | null;
  createdAt: string;
  author: { name: string };
  category: { nameAr: string; name: string } | null;
  tags: string[];
}

const statusConfig: Record<PostStatus, { label: string; color: string; icon: typeof Globe }> = {
  PUBLISHED: { label: "منشور", color: "success", icon: Globe },
  DRAFT: { label: "مسودة", color: "secondary", icon: FileText },
  ARCHIVED: { label: "مؤرشف", color: "default", icon: Archive },
};

export default function AdminBlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PostStatus | "">("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/blog/posts?${params}`);
    const data = await res.json();
    if (data.success) setPosts(data.data);
    else toast.error("تعذّر تحميل المقالات");
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(fetchPosts, 300);
    return () => clearTimeout(t);
  }, [fetchPosts]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/admin/blog/posts/${deleteId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("تم حذف المقال"); fetchPosts(); }
    else toast.error(data.error || "حدث خطأ");
    setDeleteLoading(false);
    setDeleteId(null);
  };

  const counts = {
    all: posts.length,
    PUBLISHED: posts.filter(p => p.status === "PUBLISHED").length,
    DRAFT: posts.filter(p => p.status === "DRAFT").length,
    ARCHIVED: posts.filter(p => p.status === "ARCHIVED").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="المقالات"
        description={`${counts.all} مقال — ${counts.PUBLISHED} منشور`}
        actions={
          <>
            <Button variant="secondary" onClick={() => router.push("/admin/blog/categories")}>
              التصنيفات
            </Button>
            <Button onClick={() => router.push("/admin/blog/new")} icon={<Plus className="h-4 w-4" />}>
              مقال جديد
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-subtle" />
          <Input
            placeholder="بحث في المقالات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <div className="flex gap-1">
          {([["", "الكل"], ["PUBLISHED", "منشور"], ["DRAFT", "مسودة"], ["ARCHIVED", "مؤرشف"]] as [PostStatus | "", string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                statusFilter === val
                  ? "bg-primary-600 text-white"
                  : "bg-surface-sunken text-fg-muted hover:bg-surface-hover"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-line overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-fg-subtle">جار التحميل...</div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <FileText className="h-12 w-12 mx-auto text-fg-subtle mb-3" />
            <p className="text-fg-muted">لا توجد مقالات</p>
            <Button size="sm" className="mt-4" onClick={() => router.push("/admin/blog/new")}>
              أضف أول مقال
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-muted border-b border-line">
              <tr>
                <th className="text-right text-xs font-bold text-fg-muted uppercase tracking-wider px-4 py-3">المقال</th>
                <th className="text-right text-xs font-bold text-fg-muted uppercase tracking-wider px-4 py-3">الفئة</th>
                <th className="text-right text-xs font-bold text-fg-muted uppercase tracking-wider px-4 py-3">الحالة</th>
                <th className="text-right text-xs font-bold text-fg-muted uppercase tracking-wider px-4 py-3">المشاهدات</th>
                <th className="text-right text-xs font-bold text-fg-muted uppercase tracking-wider px-4 py-3">التاريخ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {posts.map((post) => {
                const sc = statusConfig[post.status];
                const StatusIcon = sc.icon;
                return (
                  <tr key={post.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-fg text-sm line-clamp-1">{post.titleAr}</p>
                      <p className="text-xs text-fg-subtle mt-0.5">{post.readingTime} دقيقة قراءة · {post.slug}</p>
                    </td>
                    <td className="px-4 py-4">
                      {post.category ? (
                        <span className="text-sm text-fg-muted">{post.category.nameAr}</span>
                      ) : (
                        <span className="text-xs text-fg-subtle">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium",
                        post.status === "PUBLISHED" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                        post.status === "DRAFT" && "bg-surface-sunken text-fg-muted",
                        post.status === "ARCHIVED" && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
                      )}>
                        <StatusIcon className="h-3 w-3" />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="flex items-center gap-1 text-sm text-fg-muted">
                        <Eye className="h-3.5 w-3.5" />
                        {post.viewCount.toLocaleString("ar")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-fg-subtle">
                        {formatDistanceToNow(new Date(post.publishedAt || post.createdAt), { addSuffix: true, locale: ar })}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {post.status === "PUBLISHED" && (
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-fg-subtle hover:text-blue-500 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          onClick={() => router.push(`/admin/blog/${post.id}`)}
                          className="p-1.5 text-fg-subtle hover:text-primary-500 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(post.id)}
                          className="p-1.5 text-fg-subtle hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="حذف المقال"
        message="هل أنت متأكد من حذف هذا المقال؟ لا يمكن التراجع عن هذه العملية."
        confirmLabel="حذف"
        variant="danger"
      />
    </div>
  );
}
