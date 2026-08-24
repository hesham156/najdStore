"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export function DeleteAdButton({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ads/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("تم حذف الإعلان");
        router.refresh();
      } else {
        toast.error(data.error || "حدث خطأ");
        setConfirm(false);
      }
    } catch {
      toast.error("تعذّر الحذف، حاول مرة أخرى");
      setConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="rounded-lg bg-danger-solid px-2 py-1 text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "..." : "تأكيد"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-fg-muted hover:text-fg px-2 py-1 rounded-lg border border-line"
        >
          إلغاء
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-sm font-medium text-danger hover:text-danger flex items-center gap-1"
    >
      <Trash2 className="w-4 h-4" />
      حذف
    </button>
  );
}
