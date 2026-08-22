import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Admin-scoped 404 — renders inside the admin shell so the sidebar and
 * header stay put, instead of dropping the user onto the storefront page.
 */
export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md space-y-5 text-center">
        <div className="flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-sunken text-fg-subtle">
            <FileQuestion className="h-6 w-6" aria-hidden />
          </span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-base font-bold text-fg">هذه الصفحة غير موجودة</h1>
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-fg-muted">
            قد يكون العنصر محذوفاً أو أن الرابط غير صحيح. تحقّق من الرابط أو عد إلى لوحة التحكم.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Link href="/admin">
            <Button>العودة إلى لوحة التحكم</Button>
          </Link>
          <Link href="/admin/orders">
            <Button variant="secondary">الطلبات</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
