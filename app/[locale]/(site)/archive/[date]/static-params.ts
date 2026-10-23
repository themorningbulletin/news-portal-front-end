import { getLatest } from "@/lib/api";
import { dhakaDay } from "@/lib/format";
import { isLocale, LOCALES } from "@/lib/config";

/** Values prerendered at build time; others render on first visit. Cache Components needs at least one. */
export async function staticValues(rawLocale: string): Promise<string[]> {
  const locale = isLocale(rawLocale) ? rawLocale : LOCALES[0];
  const items = [...new Set((await getLatest(locale, 1, 20)).data.flatMap((a) => (a.publishedAt ? [dhakaDay(a.publishedAt)] : [])))];
  // The placeholder renders a 404.
  return items.length ? items : ["2000-01-01"];
}
