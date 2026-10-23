import { notFound, permanentRedirect } from "next/navigation";
import { Fragment } from "react";
import { AdSlot } from "@/components/site/consent";
import { getArticles } from "@/lib/api";
import type { Locale } from "@/lib/config";
import { getT } from "@/lib/i18n";
import { StoryRow } from "./cards";
import { EmptyState, Pagination } from "./common";

/*
 * Lists paginate with path segments (/latest, /latest/page/2, ...), not query
 * strings. Every list page is then complete static output, so a page past the
 * end, an unknown section or a malformed number answers with a real 404.
 */

export const pagePath = (base: string, page: number) => (page > 1 ? `${base}/page/${page}` : base);

/** Parses the [n] segment; /page/1 permanently redirects to the base URL. */
export function pageFromParam(raw: string, base: string): number {
  if (!/^[1-9]\d{0,3}$/.test(raw)) notFound();
  const n = Number(raw);
  if (n === 1) permanentRedirect(base);
  return n;
}

export const PAGE_SIZE = 20;

export async function PagedList({
  locale,
  page,
  query,
  basePath,
  adPlacement,
}: {
  locale: Locale;
  page: number;
  query: { category?: string; tag?: string; author?: string; date?: string };
  basePath: string;
  adPlacement?: string;
}) {
  const res = await getArticles(locale, { ...query, page, limit: PAGE_SIZE });
  if (!res) notFound();
  if (page > 1 && page > res.meta.totalPages) notFound();
  const t = getT(locale, "list");
  if (res.data.length === 0) return <EmptyState title={t("noStories")} />;
  return (
    <>
      <div>
        {res.data.map((s, i) => (
          <Fragment key={s.id}>
            <StoryRow locale={locale} story={s} as="h2" />
            {adPlacement && i === 5 && <AdSlot placement={adPlacement} />}
          </Fragment>
        ))}
      </div>
      <Pagination locale={locale} page={page} totalPages={res.meta.totalPages} hrefFor={(p) => pagePath(basePath, p)} />
    </>
  );
}
