import type { Metadata } from "next";
import { DayView, dayMetadata } from "./view";
import { staticValues } from "./static-params";

/** Complete static output: unknown values are real 404s. */
export const ensureStatic = "navigation";

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return (await staticValues(params.locale)).map((date) => ({ date }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/archive/[date]">): Promise<Metadata> {
  const { locale, date } = await params;
  return dayMetadata(locale, date, 1);
}

export default async function Page({ params }: PageProps<"/[locale]/archive/[date]">) {
  const { locale, date } = await params;
  return <DayView rawLocale={locale} rawDate={date} page={1} />;
}
