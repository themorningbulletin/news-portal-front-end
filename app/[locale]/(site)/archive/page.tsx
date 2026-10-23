import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/news/common";
import { DateJump } from "@/components/site/date-jump";
import { AlternateLink } from "@/components/site/header-controls";
import { getArchiveMonth } from "@/lib/api";
import { isLocale, otherLocale, type Locale } from "@/lib/config";
import { dhakaDay, formatDay, formatMonth } from "@/lib/format";
import { getT } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { paths } from "@/lib/urls";

export async function generateMetadata({ params }: PageProps<"/[locale]/archive">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getT(locale, "archive");
  return pageMetadata({ locale, title: t("title"), description: t("description"), path: paths.archive });
}

async function Month({ locale, searchParams }: { locale: Locale; searchParams: PageProps<"/[locale]/archive">["searchParams"] }) {
  await connection();
  const t = getT(locale, "archive");
  const today = dhakaDay(new Date().toISOString());
  const raw = (await searchParams).month;
  const requested = typeof raw === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : today.slice(0, 7);
  const [year, month] = requested.split("-").map(Number) as [number, number];
  const days = await getArchiveMonth(locale, year, month);
  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const isCurrent = requested >= today.slice(0, 7);

  return (
    <section aria-labelledby="month-title" className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <Link href={`${paths.archive(locale)}?month=${prev}`} className="min-h-11 rounded px-3 py-2 font-semibold hover:bg-surface-2" rel="nofollow">
          ← {t("previousMonth")}
        </Link>
        <h2 id="month-title" className="headline text-2xl">
          {formatMonth(locale, year, month)}
        </h2>
        {isCurrent ? (
          <span className="w-24" />
        ) : (
          <Link href={`${paths.archive(locale)}?month=${next}`} className="min-h-11 rounded px-3 py-2 font-semibold hover:bg-surface-2" rel="nofollow">
            {t("nextMonth")} →
          </Link>
        )}
      </div>
      <p className="mt-4 text-sm text-muted">{t("daysWithNews")}</p>
      {days.length === 0 ? (
        <p className="mt-3 text-ink-2">{t("noStories")}</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {days.map((d) => (
            <li key={d.day}>
              <Link href={paths.archiveDay(locale, d.day)} className="block rounded border border-rule bg-surface p-3 hover:border-brand">
                <span className="block font-semibold">{formatDay(locale, d.day)}</span>
                <span className="text-sm text-muted">{t("storiesCount", { count: d.count })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8">
        <DateJump locale={locale} label={t("chooseDate")} button={t("go")} max={today} />
      </div>
    </section>
  );
}

export default async function ArchivePage({ params, searchParams }: PageProps<"/[locale]/archive">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getT(locale, "archive");
  return (
    <>
      <AlternateLink href={paths.archive(otherLocale(locale))} />
      <div className="mx-auto max-w-4xl">
        <PageHeader title={t("title")} description={t("description")} />
        <Suspense fallback={<div className="skeleton mt-8 h-64" aria-hidden="true" />}>
          <Month locale={locale} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
