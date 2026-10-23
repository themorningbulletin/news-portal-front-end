import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, PageHeader } from "@/components/news/common";
import { PagedList, pagePath } from "@/components/news/paged-list";
import { AlternateLink } from "@/components/site/header-controls";
import { isLocale, otherLocale } from "@/lib/config";
import { dhakaDay, formatDay } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { paths } from "@/lib/urls";

function loadDay(rawLocale: string, date: string) {
  const d = new Date(`${date}T12:00:00+06:00`);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(d.getTime()) && dhakaDay(d.toISOString()) === date && date >= "2000-01-01";
  if (!isLocale(rawLocale) || !valid) notFound();
  return { locale: rawLocale, date };
}

export async function dayMetadata(rawLocale: string, rawDate: string, page: number): Promise<Metadata> {
  const { locale, date } = loadDay(rawLocale, rawDate);
  const title = getT(locale, "archive")("dayTitle", { date: formatDay(locale, date) });
  return pageMetadata({ locale, title, description: title, path: (l) => pagePath(paths.archiveDay(l, date), page) });
}

export async function DayView({ rawLocale, rawDate, page }: { rawLocale: string; rawDate: string; page: number }) {
  const { locale, date } = loadDay(rawLocale, rawDate);
  const t = getT(locale, "archive");
  return (
    <>
      <AlternateLink href={paths.archiveDay(otherLocale(locale), date)} />
      <div className="mx-auto max-w-4xl">
        <Breadcrumbs locale={locale} items={[{ name: t("title"), path: paths.archive(locale) }, { name: formatDay(locale, date) }]} />
        <div className="mt-4">
          <PageHeader title={t("dayTitle", { date: formatDay(locale, date) })} />
        </div>
        <PagedList locale={locale} page={page} query={{ date }} basePath={paths.archiveDay(locale, date)} />
      </div>
    </>
  );
}
