import "server-only";
import { getCategories, getSitemapArticles } from "./api";
import { LOCALES, SITE_NAME, SITE_URL, type Locale } from "./config";
import { absolute, paths } from "./urls";

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const HREFLANG: Record<Locale, string> = { bn: "bn-BD", en: "en" };

export function xmlResponse(xml: string) {
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=600" },
  });
}

function urlEntry(loc: string, alternates: Partial<Record<Locale, string>>, lastmod?: string) {
  const links = Object.entries(alternates)
    .map(([l, href]) => `<xhtml:link rel="alternate" hreflang="${HREFLANG[l as Locale]}" href="${xmlEscape(absolute(href!))}"/>`)
    .join("");
  return `<url><loc>${xmlEscape(absolute(loc))}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}${links}</url>`;
}

const urlset = (body: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`;

export async function sitemapIndex(): Promise<string> {
  const names = ["pages.xml", "categories.xml"];
  for (const locale of LOCALES) {
    const first = await getSitemapArticles(locale, 1);
    for (let p = 1; p <= Math.max(1, first.meta.totalPages); p++) names.push(`articles-${locale}-${p}.xml`);
  }
  const items = names.map((n) => `<sitemap><loc>${SITE_URL}/sitemaps/${n}</loc></sitemap>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</sitemapindex>`;
}

/** Canonical, indexable URLs only. Search, account, admin and draft URLs never appear. */
export async function childSitemap(name: string): Promise<string | null> {
  if (name === "pages.xml") {
    const fixed = [paths.home, paths.latest, paths.topics, paths.archive];
    return urlset(
      fixed
        .flatMap((fn) => LOCALES.map((l) => urlEntry(fn(l), { bn: fn("bn"), en: fn("en") })))
        .join(""),
    );
  }
  if (name === "categories.xml") {
    const lists = await Promise.all(LOCALES.map((l) => getCategories(l)));
    const entries = lists.flatMap((cats, i) =>
      cats.map((c) => {
        const alternates: Partial<Record<Locale, string>> = {};
        for (const l of LOCALES) if (c.alternates[l]) alternates[l] = paths.category(l, c.alternates[l]!);
        return urlEntry(paths.category(LOCALES[i]!, c.slug), alternates);
      }),
    );
    return urlset(entries.join(""));
  }
  const m = /^articles-(bn|en)-(\d{1,4})\.xml$/.exec(name);
  if (!m) return null;
  const locale = m[1] as Locale;
  const page = Number(m[2]);
  const res = await getSitemapArticles(locale, page);
  if (page > 1 && res.data.length === 0) return null;
  return urlset(
    res.data
      .map((a) => {
        const alternates: Partial<Record<Locale, string>> = { [locale]: paths.article(locale, a.slug) };
        if (a.alternate) alternates[a.alternate.locale] = paths.article(a.alternate.locale, a.alternate.slug);
        return urlEntry(paths.article(locale, a.slug), alternates, a.lastModified);
      })
      .join(""),
  );
}

/** Google News sitemap: stories from the last two days, published only when NEWS_SITEMAP_ENABLED=true. */
export async function newsSitemap(): Promise<string> {
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const lists = await Promise.all(LOCALES.map(async (l) => ({ l, items: (await getSitemapArticles(l, 1, since)).data })));
  const entries = lists.flatMap(({ l, items }) =>
    items.slice(0, 1000).map(
      (a) =>
        `<url><loc>${xmlEscape(absolute(paths.article(l, a.slug)))}</loc><news:news><news:publication><news:name>${xmlEscape(SITE_NAME[l])}</news:name><news:language>${l}</news:language></news:publication><news:publication_date>${a.publishedAt}</news:publication_date><news:title>${xmlEscape(a.title)}</news:title></news:news></url>`,
    ),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${entries.join("")}</urlset>`;
}
