import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageFromParam } from "@/components/news/paged-list";
import { isLocale, type Locale } from "@/lib/config";
import { paths } from "@/lib/urls";
import { DayView, dayMetadata } from "../../view";
import { staticValues } from "../../static-params";

export const ensureStatic = "navigation";

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const [first] = await staticValues(params.locale);
  return [{ date: first!, n: "2" }];
}

async function resolve(params: PageProps<"/[locale]/archive/[date]/page/[n]">["params"]) {
  const { locale, date, n } = await params;
  if (!isLocale(locale)) notFound();
  return { locale, date, page: pageFromParam(n, paths.archiveDay(locale as Locale, date)) };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/archive/[date]/page/[n]">): Promise<Metadata> {
  const { locale, date, page } = await resolve(params);
  return dayMetadata(locale, date, page);
}

export default async function Page({ params }: PageProps<"/[locale]/archive/[date]/page/[n]">) {
  const { locale, date, page } = await resolve(params);
  return <DayView rawLocale={locale} rawDate={date} page={page} />;
}
