import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/store/Navbar";
import { Footer } from "@/components/store/Footer";
import { CartSidebar } from "@/components/store/CartSidebar";
import { MaintenancePage } from "@/components/store/MaintenancePage";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { AnnouncementBar } from "@/components/store/AnnouncementBar";
import { PopupManager } from "@/components/store/PopupManager";
import { UpsellProvider } from "@/components/store/UpsellModal";
import { ConversionProvider } from "@/context/ConversionContext";
import { LiveActivityToast } from "@/components/store/LiveActivityToast";
import { VisitTracker } from "@/components/store/VisitTracker";
import type { ConversionSettings } from "@/context/ConversionContext";

const CONVERSION_KEYS: (keyof ConversionSettings)[] = [
  "live_activity_enabled",
  "live_activity_interval",
  "live_activity_names",
  "live_activity_cities",
  "flash_sale_enabled",
  "flash_sale_ends_at",
  "flash_sale_label",
  "scarcity_enabled",
  "scarcity_max",
  "live_viewers_enabled",
  "live_viewers_min",
  "live_viewers_max",
  "sticky_cta_enabled",
  "cart_progress_enabled",
  "cart_progress_target",
  "cart_progress_reward",
  "cart_progress_coupon",
  "guarantee_enabled",
  "guarantee_text",
];

async function getConversionSettings(): Promise<Partial<ConversionSettings>> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: CONVERSION_KEYS as string[] } },
    select: { key: true, value: true, type: true },
  });

  const result: Record<string, string | boolean | number> = {};
  for (const row of rows) {
    if (row.type === "boolean") result[row.key] = row.value === "true";
    else if (row.type === "number") result[row.key] = parseFloat(row.value) || 0;
    else result[row.key] = row.value;
  }
  return result as Partial<ConversionSettings>;
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const maintenanceSetting = await prisma.setting.findUnique({
    where: { key: "maintenance_mode" },
    select: { value: true },
  });

  if (maintenanceSetting?.value === "true") {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "STAFF";
    if (!isAdmin) {
      return <MaintenancePage />;
    }
  }

  const conversionSettings = await getConversionSettings();

  return (
    <CurrencyProvider>
      <ConversionProvider settings={conversionSettings}>
        <UpsellProvider>
          <AnnouncementBar />
          <Navbar />
          <CartSidebar />
          <PopupManager />
          <LiveActivityToast />
          <VisitTracker />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </UpsellProvider>
      </ConversionProvider>
    </CurrencyProvider>
  );
}
