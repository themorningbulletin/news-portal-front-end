import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, PageHeader } from "@/components/news/common";
import { PagedList, pagePath } from "@/components/news/paged-list";
import { AlternateLink } from "@/components/site/header-controls";
import { getTag } from "@/lib/api";
import { isLocale, otherLocale } from "@/lib/config";
import { getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { decodeSlug, paths } from "@/lib/urls";

async function loadTag(rawLocale: string, rawSlug: string) {
  if (!isLocale(rawLocale)) notFound();
  const tag = await getTag(rawLocale, decodeSlug(rawSlug));
  if (!tag?.slug) notFound();
  return { locale: rawLocale, tag: { ...tag, slug: tag.slug } };
}

export async function tagMetadata(rawLocale: string, rawSlug: string, page: number): Promise<Metadata> {
  const { locale, tag } = await loadTag(rawLocale, rawSlug);
  const t = getT(locale, "list");
  return pageMetadata({
    locale,
    title: page > 1 ? `${t("tagTitle", { name: tag.name })} · ${t("page", { page })}` : t("tagTitle", { name: tag.name }),
    description: t("tagDescription", { name: tag.name }),
    path: (l) => (tag.alternates[l] ? pagePath(paths.tag(l, tag.alternates[l]!), page) : null),
  });
}

export async function TagView({ rawLocale, rawSlug, page }: { rawLocale: string; rawSlug: string; page: number }) {
  const { locale, tag } = await loadTag(rawLocale, rawSlug);
  const t = getT(locale, "list");
  const other = otherLocale(locale);
  return (
    <>
      <AlternateLink href={tag.alternates[other] ? paths.tag(other, tag.alternates[other]!) : null} />
      <div className="mx-auto max-w-4xl">
        <Breadcrumbs locale={locale} items={[{ name: getT(locale, "nav")("topics"), path: paths.topics(locale) }, { name: tag.name }]} />
        <div className="mt-4">
          <PageHeader title={t("tagTitle", { name: tag.name })} description={t("tagDescription", { name: tag.name })} />
        </div>
        <PagedList locale={locale} page={page} query={{ tag: tag.slug }} basePath={paths.tag(locale, tag.slug)} adPlacement="category_feed" />
      </div>
    </>
  );
}
