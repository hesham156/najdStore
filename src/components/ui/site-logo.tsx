"use client";

import { cn } from "@/lib/utils";
import { useBranding } from "@/components/providers/BrandingProvider";

interface SiteLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Overrides the configured logo — for previews in the settings screen. */
  src?: string;
}

const sizes = {
  xs: "w-6 h-6 rounded-lg",
  sm: "w-8 h-8 rounded-xl",
  md: "w-10 h-10 rounded-xl",
  lg: "w-14 h-14 rounded-2xl",
  xl: "w-20 h-20 rounded-2xl",
};

export function SiteLogo({ size = "md", className, src }: SiteLogoProps) {
  // The logo used to be a hardcoded path, so changing it meant replacing a
  // file in the repo. It now comes from settings via the branding context.
  const { logoUrl, siteName } = useBranding();

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || logoUrl}
      alt={`شعار ${siteName}`}
      className={cn(sizes[size], "object-cover ring-1 ring-white/10 shadow-lg", className)}
    />
  );
}
