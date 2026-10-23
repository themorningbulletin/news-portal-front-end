import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CmsShell } from "@/components/cms/shell";
import { IntlScope } from "@/components/providers";
import { isLocale } from "@/lib/config";
import { clientMessages } from "@/lib/i18n";
import cmsBn from "@/messages/cms.bn.json";
import cmsEn from "@/messages/cms.en.json";

export const metadata: Metadata = {
  title: { default: "Newsroom", template: "%s · Newsroom" },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The newsroom UI is a client application on top of the API. Hiding screens
 * here is only a convenience: every permission is enforced by the API.
 */
export default async function CmsLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <IntlScope locale={locale} messages={{ ...clientMessages(locale), cms: locale === "bn" ? cmsBn : cmsEn }}>
      {/* The shell reads the URL (active menu item), so it renders behind a boundary on dynamic routes. */}
      <Suspense fallback={<div className="skeleton m-6 h-64" aria-hidden="true" />}>
        <CmsShell>{children}</CmsShell>
      </Suspense>
    </IntlScope>
  );
}
