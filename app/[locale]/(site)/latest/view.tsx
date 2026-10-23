import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/news/common";
import { PagedList, pagePath } from "@/components/news/paged-list";
import { AlternateLink } from "@/components/site/header-controls";
import { isLocale, otherLocale } from "@/lib/config";
import { getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { paths } from "@/lib/urls";

export function latestMetadata(rawLocale: string, page: number): Metadata {
  if (!isLocale(rawLocale)) return {};
  const t = getT(rawLocale, "list");
  return pageMetadata({
    locale: rawLocale,
    title: page > 1 ? `${t("latestTitle")} · ${t("page", { page })}` : t("latestTitle"),
    description: t("latestDescription"),
    path: (l) => pagePath(paths.latest(l), page),
  });
}

export function LatestView({ rawLocale, page }: { rawLocale: string; page: number }) {
  if (!isLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const t = getT(locale, "list");
  return (
    <>
      <AlternateLink href={paths.latest(otherLocale(locale))} />
      <div className="mx-auto max-w-4xl">
        <PageHeader title={t("latestTitle")} description={t("latestDescription")} />
        <PagedList locale={locale} page={page} query={{}} basePath={paths.latest(locale)} adPlacement="category_feed" />
      </div>
    </>
  );
}
