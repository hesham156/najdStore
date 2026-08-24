"use client";

import { useRef, useState } from "react";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/**
 * An image setting: upload a file, or paste a URL if the asset is hosted
 * elsewhere. Used by any setting whose `type` is `image` — the store logo
 * today, an OG image or a favicon tomorrow.
 *
 * Uploading only fills the field; nothing is stored until the page's own Save
 * runs, so the merchant can still back out of a change they dislike.
 */
export function ImageSettingField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (data.success && data.url) {
        setBroken(false);
        onChange(data.url);
        toast.success("تم الرفع — اضغط حفظ لتثبيت التغيير");
      } else {
        toast.error(data.error || "تعذّر رفع الصورة");
      }
    } catch {
      toast.error("تعذّر الاتصال بالخادم، حاول مرة أخرى");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-fg">{label}</label>

      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-line bg-surface-muted">
          {value && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
              onLoad={() => setBroken(false)}
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-fg-subtle" aria-hidden />
          )}
        </span>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
            icon={<Upload className="h-3.5 w-3.5" />}
          >
            رفع صورة
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="soft-danger"
              onClick={() => {
                setBroken(false);
                onChange("");
              }}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            >
              إزالة
            </Button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </div>

      <Input
        dir="ltr"
        value={value}
        onChange={(e) => {
          setBroken(false);
          onChange(e.target.value);
        }}
        placeholder="/logo.jpg"
        hint={hint || "ارفع صورة، أو الصق رابطاً مباشراً."}
      />

      {value && broken && (
        <p className="text-xs text-danger">تعذّر تحميل الصورة من هذا الرابط — تأكد أنه صحيح.</p>
      )}
    </div>
  );
}
