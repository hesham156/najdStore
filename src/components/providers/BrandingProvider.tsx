"use client";

import { createContext, useContext } from "react";

export interface Branding {
  /** URL of the store logo. Relative paths are served from /public. */
  logoUrl: string;
  siteName: string;
  /** The line under the store name in the storefront header. */
  tagline: string;
}

export const DEFAULT_BRANDING: Branding = {
  logoUrl: "/logo.jpg",
  siteName: "متجرك الإلكتروني",
  tagline: "",
};

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

/**
 * Carries the store's logo and name from the root layout — which can read the
 * database — down to the client components that display them.
 *
 * Without this, `SiteLogo` is used in eight places across server and client
 * trees, and threading the URL through every one of them by prop would mean
 * touching every intermediate component that does not care about branding.
 */
export function BrandingProvider({
  value,
  children,
}: {
  value: Branding;
  children: React.ReactNode;
}) {
  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

/** Falls back to the shipped defaults outside a provider, so nothing ever renders blank. */
export function useBranding(): Branding {
  return useContext(BrandingContext);
}

/**
 * The store's name as text.
 *
 * A server component cannot call `useBranding()`, so this tiny client wrapper
 * lets server layouts render the name from context instead of each one running
 * its own settings query.
 */
export function StoreName({ className }: { className?: string }) {
  const { siteName } = useBranding();
  return <span className={className}>{siteName}</span>;
}
