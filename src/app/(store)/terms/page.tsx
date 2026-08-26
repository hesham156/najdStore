import { getTranslations } from "next-intl/server";

export default async function TermsPage() {
  const t = await getTranslations("termsPage");
  const sections = Array.from({ length: 8 }, (_, i) => ({
    title: t(`s${i + 1}Title`),
    content: t(`s${i + 1}Content`),
  }));

  return (
    <div className="min-h-screen py-12">
      <div className="container-custom max-w-3xl">
        <h1 className="text-4xl font-black text-fg mb-2">{t("title")}</h1>
        <p className="text-fg-subtle mb-10">{t("lastUpdated")}</p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="bg-surface rounded-2xl border border-line p-6">
              <h2 className="text-lg font-bold text-fg mb-3">{section.title}</h2>
              <p className="text-fg-muted leading-relaxed whitespace-pre-line">{section.content}</p>
            </div>
          ))}
        </div>

        <div id="refund" className="mt-10 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-fg mb-3">{t("refundTitle")}</h2>
          <p className="text-fg-muted leading-relaxed mb-4">
            {t("refundDesc")}
          </p>
          <a href="/contact" className="btn-primary inline-flex text-sm">
            {t("refundCta")}
          </a>
        </div>
      </div>
    </div>
  );
}
