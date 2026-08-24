import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { SiteLogo } from "@/components/ui/site-logo";
import Link from "next/link";
import { Home } from "lucide-react";
import { getSettings, BRANDING_DEFAULTS } from "@/lib/settings";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?redirect=/dashboard");

  // The header used to hardcode a placeholder name and a stand-in letter
  // instead of the store's own name and logo.
  const { site_name } = await getSettings({ site_name: BRANDING_DEFAULTS.site_name }).catch(() => ({
    site_name: BRANDING_DEFAULTS.site_name,
  }));

  return (
    <div className="min-h-screen bg-surface-sunken">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-surface border-b border-line px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-fg-muted hover:text-primary-600 dark:hover:text-primary-400 transition-colors text-sm">
              <Home className="h-4 w-4" />
              الرئيسية
            </Link>
            <span className="text-fg-subtle">/</span>
            <span className="text-sm font-medium text-fg">لوحة التحكم</span>
          </div>
          <Link href="/" className="flex items-center gap-2">
            <SiteLogo size="xs" />
            <span className="hidden text-sm font-bold text-fg sm:block">{site_name}</span>
          </Link>
        </div>
      </header>

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:block w-64 shrink-0 border-e border-line min-h-[calc(100vh-57px)] bg-surface">
          <DashboardSidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
