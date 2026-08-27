import type { CartCustomField } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Compact, read-only summary of the custom fields a customer filled — shown on
 * the cart line and the checkout summary so the buyer can review their choices.
 * Files show their filename (the merchant gets the real download link on the
 * order screen).
 */
export function CartFieldSummary({
  fields,
  className,
}: {
  fields?: CartCustomField[] | null;
  className?: string;
}) {
  if (!fields || fields.length === 0) return null;
  return (
    <ul className={cn("mt-0.5 space-y-0.5", className)}>
      {fields.map((f, i) => {
        const isFile = (f.type === "file" || f.type === "image") && !!f.value;
        const shown = isFile ? f.value.split("/").pop() || "ملف مرفق" : f.value;
        return (
          <li key={i} className="text-[11px] leading-snug text-fg-muted">
            <span className="text-fg-subtle">{f.label}:</span>{" "}
            <span className="break-all">{shown}</span>
          </li>
        );
      })}
    </ul>
  );
}
