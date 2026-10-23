import { notFound } from "next/navigation";
import { AdSlot, AdsProvider } from "@/components/site/consent";
import { SiteFooter } from "@/components/site/footer";
import { BreakingTicker, SiteHeader } from "@/components/site/header";
import { getAdPlacements, getBreaking, getCategories, getPublishedPages, getSiteConfig } from "@/lib/api";
import { ADSENSE_CLIENT, DEMO_ADS, isLocale } from "@/lib/config";

export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [categories, pages, config, placements, breaking] = await Promise.all([
    getCategories(locale),
    getPublishedPages(locale),
    getSiteConfig(),
    ADSENSE_CLIENT ? getAdPlacements() : Promise.resolve([]),
    getBreaking(locale),
  ]);

  return (
    <AdsProvider client={ADSENSE_CLIENT} placements={placements} demo={DEMO_ADS}>
      <SiteHeader locale={locale} categories={categories} />
      <BreakingTicker locale={locale} stories={breaking} />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <AdSlot placement="header" className="!mb-0 !mt-4" />
      </div>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none sm:px-6 sm:py-8">
        {children}
      </main>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <AdSlot placement="footer" className="!mb-0" />
      </div>
      <SiteFooter
        locale={locale}
        categories={categories}
        pages={pages}
        newsletterEnabled={config.features.newsletter}
        adsEnabled={Boolean(ADSENSE_CLIENT && placements.length) && !DEMO_ADS}
      />
    </AdsProvider>
  );
}
