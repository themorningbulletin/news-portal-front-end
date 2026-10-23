import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/news/common";
import { SearchApp } from "@/components/search/search-app";
import { AlternateLink } from "@/components/site/header-controls";
import { getAuthors, getCategories } from "@/lib/api";
import { isLocale, otherLocale } from "@/lib/config";
import { getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { paths } from "@/lib/urls";

export async function generateMetadata({ params }: PageProps<"/[locale]/search">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getT(locale, "search");
  // Internal search result pages are not indexed.
  return pageMetadata({ locale, title: t("title"), description: t("label"), path: paths.search, noindex: true });
}

/**
 * Results are fetched from the reader's browser so that search rate limits
 * apply per reader rather than to the site's own server.
 */
export default async function SearchPage({ params }: PageProps<"/[locale]/search">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale, "search");
  const [categories, authors] = await Promise.all([getCategories(locale), getAuthors(locale)]);
  return (
    <>
      <AlternateLink href={paths.search(otherLocale(locale))} />
      <div className="mx-auto max-w-4xl">
        <PageHeader title={t("title")} />
        <div className="mt-6">
          <Suspense fallback={<div className="skeleton h-12" aria-hidden="true" />}>
            <SearchApp
              categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
              authors={authors.filter((a) => a.slug).map((a) => ({ slug: a.slug!, name: a.name }))}
            />
          </Suspense>
        </div>
      </div>
    </>
  );
}
