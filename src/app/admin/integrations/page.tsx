import { getHayyakStatus } from "@/lib/hayyak";
import { HayyakCard } from "./HayyakCard";
import { PageHeader } from "@/components/admin/PageHeader";

export const dynamic = "force-dynamic";

export const metadata = { title: "التكاملات" };

export default async function IntegrationsPage() {
  const hayyak = await getHayyakStatus();

  return (
    <div className="animate-fade-in max-w-3xl">
      <PageHeader className="mb-6" title="التكاملات" description="ربط المتجر بالخدمات الخارجية" />
      <HayyakCard initial={hayyak} />
    </div>
  );
}
