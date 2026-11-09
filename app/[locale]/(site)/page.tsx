import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadStory, NumberedList, StoryCard } from "@/components/news/cards";
import { EmptyState, JsonLd, SectionHeading } from "@/components/news/common";
import { HomeBlocks } from "@/components/news/home-blocks";
import { AlternateLink } from "@/components/site/header-controls";
import { getHomepage, getPopular } from "@/lib/api";
import { isLocale, otherLocale, SITE_NAME } from "@/lib/config";
import { getT } from "@/lib/i18n";
import { organizationLd, pageMetadata, websiteLd } from "@/lib/seo";
import { paths } from "@/lib/urls";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getT(locale, "common");
  return {
    ...pageMetadata({ locale, title: `${SITE_NAME[locale]}: ${t("tagline")}`, description: t("tagline"), path: paths.home }),
    title: { absolute: `${SITE_NAME[locale]}: ${t("tagline")}` },
  };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [home, popular] = await Promise.all([getHomepage(locale), getPopular(locale, 5)]);
  const t = getT(locale, "home");

  return (
    <>
      <AlternateLink href={paths.home(otherLocale(locale))} />
      <JsonLd data={[organizationLd(locale), websiteLd(locale)]} />
      <h1 className="sr-only">{SITE_NAME[locale]}</h1>

      {!home?.lead ? (
        <EmptyState title={t("empty")} />
      ) : (
        <>
          {/* First block (the publisher's sketch): Editor's Pick, a lead story with three more under it, and Most read beside it. */}
          <div className="grid gap-8 lg:grid-cols-12">
            <section aria-labelledby="top-stories" className="min-w-0 lg:col-span-9">
              <SectionHeading id="top-stories">{t("editorsPick")}</SectionHeading>
              <LeadStory locale={locale} story={home.lead} />
              {home.top.length > 0 && (
                <div className="mt-6 grid gap-6 border-t border-rule pt-6 sm:grid-cols-3">
                  {home.top.map((s) => (
                    <StoryCard key={s.id} locale={locale} story={s} />
                  ))}
                </div>
              )}
            </section>
            <aside className="min-w-0 lg:col-span-3 lg:border-l lg:border-rule lg:pl-6">
              <section aria-labelledby="most-read">
                <SectionHeading id="most-read">{t("mostRead")}</SectionHeading>
                {popular.length > 0 ? (
                  <>
                    <NumberedList locale={locale} stories={popular} />
                    <p className="mt-2 text-xs text-muted">{t("mostReadNote")}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted">{t("mostReadEmpty")}</p>
                )}
              </section>
            </aside>
          </div>

          {/* Everything below follows the layout chosen on the newsroom's homepage page. */}
          <HomeBlocks locale={locale} blocks={home.sections} />
        </>
      )}
    </>
  );
}
