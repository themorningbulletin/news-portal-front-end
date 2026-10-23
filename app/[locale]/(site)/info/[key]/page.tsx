import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/news/common";
import { StoryTime } from "@/components/news/story-meta";
import { AlternateLink } from "@/components/site/header-controls";
import { getEditorialPage } from "@/lib/api";
import { isLocale, otherLocale } from "@/lib/config";
import { getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { paths } from "@/lib/urls";

export const ensureStatic = "navigation";

const KEYS = ["about", "contact", "editorial-policy", "corrections", "privacy", "terms"];

export function generateStaticParams() {
  return KEYS.map((key) => ({ key }));
}

/** Publisher-written pages; unpublished ones are real 404s, never placeholder text. */
async function load(params: PageProps<"/[locale]/info/[key]">["params"]) {
  const { locale, key } = await params;
  if (!isLocale(locale) || !KEYS.includes(key)) notFound();
  const page = await getEditorialPage(locale, key);
  if (!page) notFound();
  return { locale, page };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/info/[key]">): Promise<Metadata> {
  const { locale, page } = await load(params);
  return pageMetadata({ locale, title: page.title, description: page.title, path: (l) => paths.info(l, page.key) });
}

export default async function InfoPage({ params }: PageProps<"/[locale]/info/[key]">) {
  const { locale, page } = await load(params);
  const common = getT(locale, "common");
  return (
    <>
      <AlternateLink href={paths.info(otherLocale(locale), page.key)} />
      <article className="mx-auto max-w-3xl">
        <Breadcrumbs locale={locale} items={[{ name: page.title }]} />
        <h1 className="headline mt-4 text-4xl">{page.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {common("updated")}: <StoryTime locale={locale} iso={page.updatedAt} mode="date" />
        </p>
        <div className="prose-news mt-8" dangerouslySetInnerHTML={{ __html: page.body }} />
      </article>
    </>
  );
}
