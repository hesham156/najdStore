import { prisma } from "@/lib/prisma";
import Script from "next/script";

/**
 * Injects the merchant's custom CSS/JS (set in Settings → "أكواد مخصّصة")
 * into the storefront. Scoped to the store layout so it never touches the
 * admin panel. Values are trusted admin input, rendered as-is.
 */
async function getCustomCode() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["custom_css", "custom_header_js", "custom_footer_js"] } },
    select: { key: true, value: true },
  });
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
}

export async function CustomCodeInjector() {
  let code: Record<string, string> = {};
  try {
    code = await getCustomCode();
  } catch {
    return null;
  }

  const css = (code.custom_css || "").trim();
  const headerJs = (code.custom_header_js || "").trim();
  const footerJs = (code.custom_footer_js || "").trim();

  if (!css && !headerJs && !footerJs) return null;

  return (
    <>
      {css && (
        // eslint-disable-next-line react/no-danger
        <style id="custom-store-css" dangerouslySetInnerHTML={{ __html: css }} />
      )}
      {headerJs && (
        <Script id="custom-header-js" strategy="afterInteractive">
          {headerJs}
        </Script>
      )}
      {footerJs && (
        <Script id="custom-footer-js" strategy="lazyOnload">
          {footerJs}
        </Script>
      )}
    </>
  );
}
