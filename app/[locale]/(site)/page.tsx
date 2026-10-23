import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { LeadStory, NumberedList, StoryCard, StoryLine, StoryRow } from "@/components/news/cards";
import { EmptyState, JsonLd, SectionHeading } from "@/components/news/common";
import { AdSlot } from "@/components/site/consent";
import { AlternateLink } from "@/components/site/header-controls";
import { getHomepage, getPopular } from "@/lib/api";
import { isLocale, otherLocale, SITE_NAME, type Locale } from "@/lib/config";
import { getT } from "@/lib/i18n";
import { organizationLd, pageMetadata, websiteLd } from "@/lib/seo";
import type { ArticleCard, Homepage } from "@/lib/types";
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

function Section({ locale, section }: { locale: Locale; section: Homepage["sections"][number] }) {
  const t = getT(locale, "home");
  const [first, ...rest] = section.items;
  const id = `section-${section.category.id}`;
  return (
    <section aria-labelledby={id} className="mt-12">
      <SectionHeading id={id} href={paths.category(locale, section.category.slug)} linkLabel={t("moreIn", { section: section.category.name })}>
        {section.category.name}
      </SectionHeading>
      {section.variant === "feature" && first ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <StoryCard locale={locale} story={first} showSummary size="lg" />
          <ul>
            {rest.map((s) => (
              <StoryLine key={s.id} locale={locale} story={s} />
            ))}
          </ul>
        </div>
      ) : section.variant === "list" ? (
        <div className="grid gap-x-8 md:grid-cols-2">
          {section.items.map((s) => (
            <StoryRow key={s.id} locale={locale} story={s} />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {section.items.slice(0, 4).map((s) => (
            <StoryCard key={s.id} locale={locale} story={s} />
          ))}
        </div>
      )}
    </section>
  );
}

function Band({ locale, title, id, stories, href }: { locale: Locale; title: string; id: string; stories: ArticleCard[]; href?: string }) {
  if (stories.length === 0) return null;
  const t = getT(locale, "home");
  return (
    <section aria-labelledby={id} className="mt-12 rounded-lg bg-surface-2 p-5 sm:p-8">
      <SectionHeading id={id} href={href} linkLabel={href ? t("moreIn", { section: title }) : undefined}>
        {title}
      </SectionHeading>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stories.map((s) => (
          <StoryCard key={s.id} locale={locale} story={s} showSummary />
        ))}
      </div>
    </section>
  );
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
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div>
              <LeadStory locale={locale} story={home.lead} />
              {home.top.length > 0 && (
                <section aria-labelledby="top-stories" className="mt-8 border-t border-rule pt-6">
                  <h2 id="top-stories" className="sr-only">
                    {t("topStories")}
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    {home.top.map((s) => (
                      <StoryCard key={s.id} locale={locale} story={s} />
                    ))}
                  </div>
                </section>
              )}
            </div>
            <aside aria-labelledby="latest-heading" className="lg:border-l lg:border-rule lg:pl-6">
              <SectionHeading id="latest-heading" href={paths.latest(locale)} linkLabel={t("seeAllLatest")}>
                {t("latest")}
              </SectionHeading>
              <ul>
                {home.latest.slice(0, 7).map((s) => (
                  <StoryLine key={s.id} locale={locale} story={s} />
                ))}
              </ul>
            </aside>
          </div>

          <AdSlot placement="home_feed" />

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
            {home.editorsPicks.length > 0 && (
              <section aria-labelledby="editors-picks">
                <SectionHeading id="editors-picks">{t("editorsPicks")}</SectionHeading>
                <div className="grid gap-6 sm:grid-cols-2">
                  {home.editorsPicks.map((s) => (
                    <StoryCard key={s.id} locale={locale} story={s} showSummary />
                  ))}
                </div>
              </section>
            )}
            <section aria-labelledby="most-read" className="lg:col-start-2">
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
          </div>

          {home.sections.map((s, i) => (
            <Fragment key={s.category.id}>
              <Section locale={locale} section={s} />
              {i === 1 && <AdSlot placement="home_feed" />}
            </Fragment>
          ))}

          <Band locale={locale} id="explainers" title={t("explainers")} stories={home.explainers} />
          <Band locale={locale} id="visual" title={t("visual")} stories={home.visual} />

          {home.opinion.length > 0 && (
            <section aria-labelledby="opinion" className="mt-12">
              <SectionHeading id="opinion">{t("opinion")}</SectionHeading>
              <div className="grid gap-x-8 md:grid-cols-2">
                {home.opinion.map((s) => (
                  <StoryRow key={s.id} locale={locale} story={s} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
