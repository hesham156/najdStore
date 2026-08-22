import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Edit, Image as ImageIcon, Link as LinkIcon, Plus, Users } from "lucide-react";
import { DeleteAdButton } from "./DeleteAdButton";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function AdminAdsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const ads = await prisma.advertisement.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { targetUsers: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="البنرات الإعلانية"
        description="إدارة الإعلانات المعروضة في لوحة تحكم المستخدمين"
        actions={
          <Link
            href="/admin/ads/new"
            className="inline-flex h-10 items-center gap-2 rounded-control bg-primary-600 px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            إضافة بنر جديد
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ads.length === 0 ? (
          <div className="col-span-full py-12 text-center text-fg-muted bg-surface rounded-2xl border border-line">
            لا توجد بنرات إعلانية حتى الآن
          </div>
        ) : (
          ads.map((ad) => (
            <Card key={ad.id} className="overflow-hidden p-0 group">
              {/* Banner Image */}
              <div className="relative h-40 bg-surface-sunken flex items-center justify-center overflow-hidden">
                {ad.image ? (
                  <img src={ad.image} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-fg-subtle" />
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <Badge variant={ad.isActive ? "success" : "gray"}>
                    {ad.isActive ? "نشط" : "معطل"}
                  </Badge>
                  <Badge variant="primary" className="bg-primary-500 text-white">
                    {ad.targetType === "ALL" ? "للجميع" : "مخصص"}
                  </Badge>
                </div>
              </div>

              {/* Details */}
              <div className="p-5 space-y-4">
                <h3 className="font-bold text-fg line-clamp-1 text-lg">
                  {ad.title}
                </h3>
                
                <div className="space-y-2 text-sm text-fg-muted">
                  {ad.link && (
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-primary-500" />
                      <a href={ad.link} target="_blank" rel="noreferrer" className="hover:underline truncate max-w-[200px]" dir="ltr">
                        {ad.link}
                      </a>
                    </div>
                  )}
                  {ad.targetType === "SPECIFIC" && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary-500" />
                      <span>{ad._count.targetUsers} مستخدم مستهدف</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <Link href={`/admin/ads/${ad.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                    <Edit className="w-4 h-4" />
                    تعديل
                  </Link>
                  <DeleteAdButton id={ad.id} />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
