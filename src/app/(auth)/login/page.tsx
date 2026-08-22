import { AuthSwitch } from "@/components/ui/auth-switch";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "تسجيل الدخول | متجرك الإلكتروني",
};

export default function LoginPage() {
  return (
    <Suspense>
      <AuthSwitch defaultMode="login" />
    </Suspense>
  );
}
