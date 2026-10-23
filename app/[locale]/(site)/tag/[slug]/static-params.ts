import { getPopularTags } from "@/lib/api";
import { isLocale, LOCALES } from "@/lib/config";

/** Values prerendered at build time; others render on first visit. Cache Components needs at least one. */
export async function staticValues(rawLocale: string): Promise<string[]> {
  const locale = isLocale(rawLocale) ? rawLocale : LOCALES[0];
  const items = (await getPopularTags(locale, 20)).flatMap((t) => (t.slug ? [t.slug] : []));
  // The placeholder renders a 404.
  return items.length ? items : ["__none__"];
}
