import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BookmarkButton, ReaderControls, ReadingProgress, ShareActions, VideoEmbed, ViewTracker } from "@/components/article/tools";
import { NumberedList, StoryCard } from "@/components/news/cards";
import { Breadcrumbs, JsonLd, SectionHeading } from "@/components/news/common";
import { StoryImage } from "@/components/news/story-image";
import { Byline, PublishedUpdated } from "@/components/news/story-meta";
import { AdSlot } from "@/components/site/consent";
import { AlternateLink } from "@/components/site/header-controls";
import { getArticle, getCategory, getPopular, getRecentSlugs, getRelated } from "@/lib/api";
import { splitAfterParagraph } from "@/lib/body";
import { isLocale, LOCALES, otherLocale, SITE_NAME, type Locale } from "@/lib/config";
import { getT } from "@/lib/i18n";
import { alternatesFor, articleLd, imageUrl, OG_LOCALE } from "@/lib/seo";
import type { ArticleDetail } from "@/lib/types";
import { absolute, decodeSlug, paths } from "@/lib/urls";

/**
 * Story pages must be complete static output: this lets an unknown slug
 * answer with a real 404, and a changed slug with a real 308 redirect,
 * instead of a streamed soft error.
 */
export const ensureStatic = "navigation";

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const locale = isLocale(params.locale) ? params.locale : LOCALES[0];
  const slugs = await getRecentSlugs(locale, 30);
  // Cache Components needs at least one value; this placeholder simply 404s.
  return (slugs.length ? slugs : ["__none__"]).map((slug) => ({ slug }));
}

async function load(params: PageProps<"/[locale]/news/[slug]">["params"]) {
  const { locale, slug: raw } = await params;
  if (!isLocale(locale)) notFound();
  const slug = decodeSlug(raw);
  const { article, redirect } = await getArticle(locale, slug);
  if (redirect) permanentRedirect(paths.article(locale, redirect));
  if (!article) notFound();
  return { locale, article };
}

/** URL of this story in each language it exists in (null where there is no translation). */
function articlePath(a: ArticleDetail, locale: Locale) {
  const slugs = new Map<Locale, string>([[locale, a.slug], ...a.translations.map((tr) => [tr.locale, tr.slug] as [Locale, string])]);
  return (l: Locale) => (slugs.has(l) ? paths.article(l, slugs.get(l)!) : null);
}

export async function generateMetadata({ params }: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  const { locale, article: a } = await load(params);
  const title = a.seo.title || a.title;
  const description = a.seo.description || a.summary;
  const image = a.seo.socialImage ?? a.image;
  const alternates = alternatesFor(locale, articlePath(a, locale));
  return {
    title,
    description,
    alternates: { ...alternates, canonical: a.seo.canonicalUrl || alternates?.canonical },
    authors: a.authors.map((au) => ({ name: au.name, url: au.slug ? absolute(paths.author(locale, au.slug)) : undefined })),
    openGraph: {
      type: "article",
      siteName: SITE_NAME[locale],
      locale: OG_LOCALE[locale],
      title,
      description,
      url: absolute(paths.article(locale, a.slug)),
      publishedTime: a.publishedAt ?? undefined,
      modifiedTime: a.updatedAt ?? undefined,
      section: a.category?.name,
      tags: a.tags.map((t) => t.name),
      images: image ? [{ url: imageUrl(image)!, width: image.width, height: image.height, alt: image.alt }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description },
  };
}

export default async function ArticlePage({ params }: PageProps<"/[locale]/news/[slug]">) {
  const { locale, article: a } = await load(params);
  const t = getT(locale, "article");
  const home = getT(locale, "home");
  const [related, popular, category] = await Promise.all([
    getRelated(locale, a.id),
    getPopular(locale, 5),
    a.category ? getCategory(locale, a.category.slug) : Promise.resolve(null),
  ]);
  const crumbs = [
    ...(category?.parent ? [{ name: category.parent.name, path: paths.category(locale, category.parent.slug) }] : []),
    ...(a.category ? [{ name: a.category.name, path: paths.category(locale, a.category.slug) }] : []),
    { name: a.title },
  ];
  const translation = a.translations.find((tr) => tr.locale === otherLocale(locale));
  const url = absolute(paths.article(locale, a.slug));
  const [bodyStart, bodyRest] = splitAfterParagraph(a.body, 3);

  return (
    <>
      <AlternateLink href={translation ? paths.article(translation.locale, translation.slug) : null} />
      <JsonLd data={articleLd(a, locale)} />
      <ReadingProgress targetId="article-body" />
      <ViewTracker id={a.id} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <article id="article-top" aria-labelledby="article-title" className="min-w-0">
          <div className="focus-hide">
            <Breadcrumbs locale={locale} items={crumbs} />
          </div>
          <header className="mt-4 max-w-3xl">
            {a.format === "explainer" && <p className="kicker">{home("explainers")}</p>}
            {a.format === "opinion" && <p className="kicker">{home("opinion")}</p>}
            <h1 id="article-title" className="headline mt-1 text-[2rem] sm:text-[2.6rem] lg:text-5xl">
              {a.title}
            </h1>
            {a.summary && <p className="mt-4 text-lg text-ink-2 sm:text-xl">{a.summary}</p>}
            <div className="mt-5 space-y-1 border-y border-rule py-3">
              <Byline locale={locale} story={a} />
              <PublishedUpdated locale={locale} story={a} />
            </div>
            <div className="no-print mt-4 flex flex-wrap items-center justify-between gap-3">
              <ShareActions url={url} title={a.title} />
              <BookmarkButton group={a.translationGroup} />
            </div>
            <div className="no-print mt-3">
              <ReaderControls />
            </div>
          </header>

          {a.image && (
            <figure className="mt-6">
              <StoryImage image={a.image} sizes="(min-width: 1280px) 860px, (min-width: 1024px) 66vw, 100vw" preload />
              {(a.image.caption || a.image.credit) && (
                <figcaption className="mt-2 text-sm text-muted">
                  {a.image.caption}
                  {a.image.caption && a.image.credit ? " " : ""}
                  {a.image.credit && <span className="text-xs">{t("imageCredit", { credit: a.image.credit })}</span>}
                </figcaption>
              )}
            </figure>
          )}

          {a.videoUrl && <VideoEmbed url={a.videoUrl} title={a.title} />}

          <div id="article-body" className="mt-8">
            <div className="prose-news" dangerouslySetInnerHTML={{ __html: bodyStart }} />
            {bodyRest && (
              <>
                <AdSlot placement="article_inline" className="focus-hide max-w-[68ch]" />
                <div className="prose-news mt-[1.1em]" dangerouslySetInnerHTML={{ __html: bodyRest }} />
              </>
            )}
          </div>

          {a.updatedAt && <p className="mt-8 max-w-[68ch] rounded bg-surface-2 p-3 text-sm text-ink-2">{t("updatedNote")}</p>}

          {a.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{t("tags")}:</span>
              {a.tags.map((tag) =>
                tag.slug ? (
                  <Link key={tag.id} href={paths.tag(locale, tag.slug)} className="rounded-full border border-rule-strong px-3 py-1 text-sm hover:bg-surface-2">
                    {tag.name}
                  </Link>
                ) : null,
              )}
            </div>
          )}

          {translation && (
            <p className="no-print mt-6">
              <Link
                href={paths.article(translation.locale, translation.slug)}
                hrefLang={translation.locale}
                lang={translation.locale}
                // Other-script label in the system font: no extra web-font download for one line.
                style={{ fontFamily: "system-ui, sans-serif" }}
                className="font-semibold text-link underline"
              >
                {t("translationAvailable")} →
              </Link>
            </p>
          )}
        </article>

        <aside className="focus-hide space-y-8">
          {popular.length > 0 && (
            <section aria-labelledby="aside-most-read">
              <SectionHeading id="aside-most-read">{home("mostRead")}</SectionHeading>
              <NumberedList locale={locale} stories={popular} />
            </section>
          )}
          <AdSlot placement="sidebar" />
        </aside>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related" className="focus-hide mt-14 border-t border-rule pt-8">
          <SectionHeading id="related">{t("related")}</SectionHeading>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((s) => (
              <StoryCard key={s.id} locale={locale} story={s} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
