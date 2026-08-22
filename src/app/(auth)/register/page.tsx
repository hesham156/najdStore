import { AuthSwitch } from "@/components/ui/auth-switch";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "إنشاء حساب | متجرك الإلكتروني",
};

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthSwitch defaultMode="register" />
    </Suspense>
  );
}
