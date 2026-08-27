import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { serializeData, parseProductVariants, slugCandidates } from "@/lib/utils";
import ProductClient from "./ProductClient";
import type { ProductWithCategory } from "@/types";
import type { FieldType } from "@/lib/product-fields";

interface PublicSettings {
  tabby_enabled?: boolean;
  tabby_installments?: string;
  tamara_enabled?: boolean;
  tamara_installments?: string;
}


// Rendered on demand — the database is not available at build time
export const dynamic = "force-dynamic";

// Metadata for this route lives in layout.tsx. A page-level generateMetadata
// here overrode it field by field with a thinner version — bare title, and an
// og-image path that does not exist in /public.

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const [productRaw, settingsRaw] = await Promise.all([
    prisma.product.findFirst({
      where: { slug: { in: slugCandidates(params.slug) }, isActive: true, isDeleted: false },
      include: {
        category: true,
        options: { orderBy: { sortOrder: "asc" }, include: { values: { orderBy: { sortOrder: "asc" } } } },
        variants: { where: { isActive: true } },
        fields: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.setting.findMany({
      where: {
        key: { in: ["tabby_enabled", "tabby_installments", "tamara_enabled", "tamara_installments"] },
      },
    }),
  ]);

  if (!productRaw) notFound();

  // "كمّل طلبك" — complementary products the merchant picked, stored as
  // `bundle:<id>` tags on this product. Fetch them (active only) and keep the
  // merchant's chosen order.
  const bundleIds = ((productRaw.tags || []) as string[])
    .filter((t) => t.startsWith("bundle:"))
    .map((t) => t.slice("bundle:".length))
    .filter((id) => id && id !== productRaw.id);

  // Optional bundle discount, stored as `bundle_discount:<TYPE>:<VALUE>`.
  let bundleDiscount: { type: "PERCENTAGE" | "FIXED"; value: number } | null = null;
  const discTag = ((productRaw.tags || []) as string[]).find((t) => t.startsWith("bundle_discount:"));
  if (discTag) {
    const [, type, val] = discTag.split(":");
    const num = parseFloat(val);
    if ((type === "PERCENTAGE" || type === "FIXED") && Number.isFinite(num) && num > 0) {
      bundleDiscount = { type, value: num };
    }
  }

  let bundleProducts: Array<{ id: string; nameAr: string; slug: string; price: number; image: string | null; icon: string | null }> = [];
  if (bundleIds.length > 0) {
    const rows = await prisma.product.findMany({
      where: { id: { in: bundleIds }, isActive: true, isDeleted: false },
      include: { category: { select: { icon: true } } },
    });
    const order = new Map(bundleIds.map((id, i) => [id, i]));
    bundleProducts = rows
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map((p) => ({
        id: p.id,
        nameAr: p.nameAr,
        slug: p.slug,
        price: parseFloat(String(p.price)),
        image: p.image,
        icon: p.category?.icon ?? null,
      }));
  }

  const product = serializeData(productRaw) as unknown as ProductWithCategory & { variants?: any[] };

  // Matrix options + variants
  const optionsData = (productRaw.options || []).map((o) => ({
    id: o.id,
    nameAr: o.nameAr,
    label: o.name,
    required: o.required,
    values: o.values.map((v) => ({ id: v.id, labelAr: v.labelAr, label: v.label, image: v.image })),
  }));
  const optionVariants = (productRaw.variants || []).map((v) => ({
    id: v.id,
    optionValueIds: v.optionValueIds,
    label: v.label,
    price: parseFloat(String(v.price)),
    comparePrice: v.comparePrice != null ? parseFloat(String(v.comparePrice)) : null,
    stockCount: v.stockCount,
    isActive: v.isActive,
  }));

  // Legacy tag-based variants only when the product has no matrix options
  product.variants = optionsData.length > 0 ? [] : parseProductVariants((productRaw.tags || []) as string[]);

  // Salla-style custom fields (parallel system).
  const customFields = (productRaw.fields || []).map((f) => ({
    id: f.id,
    key: f.key,
    type: f.type as FieldType,
    label: f.label,
    description: f.description,
    required: f.required,
    sortOrder: f.sortOrder,
    values: (f.values as { label: string; price: number }[] | null) ?? undefined,
    config: (f.config as { extensions?: string[] } | null) ?? undefined,
    condFieldKey: f.condFieldKey,
    condValue: f.condValue,
  }));

  const publicSettings: PublicSettings = {};
  for (const s of settingsRaw) {
    if (s.key === "tabby_enabled") publicSettings.tabby_enabled = s.value === "true";
    if (s.key === "tabby_installments") publicSettings.tabby_installments = s.value;
    if (s.key === "tamara_enabled") publicSettings.tamara_enabled = s.value === "true";
    if (s.key === "tamara_installments") publicSettings.tamara_installments = s.value;
  }

  // NOTE: Product / BreadcrumbList / FAQPage JSON-LD for this route is emitted
  // by layout.tsx. It used to be emitted here as well, so every product page
  // shipped two competing copies of the same entity — and once availability and
  // the return policy were made real in the layout, the two disagreed outright.

  return (
    <>
      <ProductClient product={product} publicSettings={publicSettings} options={optionsData} optionVariants={optionVariants} customFields={customFields} bundleProducts={bundleProducts} bundleDiscount={bundleDiscount} />
    </>
  );
}
