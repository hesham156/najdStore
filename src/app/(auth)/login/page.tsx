import { AuthSwitch } from "@/components/ui/auth-switch";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "تسجيل الدخول | نجد برنت",
};

export default function LoginPage() {
  return (
    <Suspense>
      <AuthSwitch defaultMode="login" />
    </Suspense>
  );
}
