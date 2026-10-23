import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Locale } from "./config";
import type {
  AdPlacement,
  ArticleCard,
  ArticleDetail,
  Author,
  Category,
  CategoryDetail,
  EditorialPage,
  Homepage,
  PageMeta,
  Tag,
} from "./types";

/**
 * Server-side reads from the API. Every function is cached with `use cache`
 * and tagged so the API's publish webhook (app/api/revalidate) can refresh
 * exactly what changed. Tag scheme mirrors back-end/src/services/revalidate.ts.
 */

const API = (process.env.API_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "");
/** Identifies this server to the API so cached reads are not throttled as a single client IP. */
const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

export class ApiUnavailableError extends Error {
  constructor(path: string, status?: number) {
    super(`API request failed: ${path}${status ? ` (${status})` : ""}`);
    this.name = "ApiUnavailableError";
  }
}

/** 404 becomes null; any other failure throws so it is never cached. */
async function get<T>(path: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${API}/api/v1${path}`, {
      headers: { accept: "application/json", ...(INTERNAL_KEY ? { "x-internal-key": INTERNAL_KEY } : {}) },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiUnavailableError(path);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiUnavailableError(path, res.status);
  return (await res.json()) as T;
}

const q = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  return sp.toString();
};

export type ListResult = { data: ArticleCard[]; meta: PageMeta };
const emptyList = (page: number, limit: number): ListResult => ({ data: [], meta: { page, limit, total: 0, totalPages: 1 } });

export async function getHomepage(locale: Locale): Promise<Homepage | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles", "settings", "taxonomy");
  return (await get<{ data: Homepage }>(`/homepage?${q({ locale })}`))?.data ?? null;
}

export async function getArticles(
  locale: Locale,
  opts: { category?: string; tag?: string; author?: string; date?: string; format?: string; page?: number; limit?: number } = {},
): Promise<ListResult | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  return get<ListResult>(`/articles?${q({ locale, ...opts, page, limit })}`);
}

export async function getLatest(locale: Locale, page = 1, limit = 20): Promise<ListResult> {
  return (await getArticles(locale, { page, limit })) ?? emptyList(page, limit);
}

export type ArticleResult = { article: ArticleDetail | null; redirect: string | null };

export async function getArticle(locale: Locale, slug: string): Promise<ArticleResult> {
  "use cache";
  cacheLife("hours");
  cacheTag(`article:${locale}:${slug}`);
  const res = await get<{ data: ArticleDetail | null; redirect?: { slug: string } }>(
    `/articles/by-slug/${encodeURIComponent(slug)}?${q({ locale })}`,
  );
  if (res?.data) cacheTag(`article-group:${res.data.translationGroup}`);
  return { article: res?.data ?? null, redirect: res?.redirect?.slug ?? null };
}

export async function getRelated(locale: Locale, id: string): Promise<ArticleCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  return (await get<{ data: ArticleCard[] }>(`/articles/${id}/related?${q({ locale })}`))?.data ?? [];
}

export async function getPopular(locale: Locale, limit = 5): Promise<ArticleCard[]> {
  "use cache";
  // Counts change constantly; a short lifetime keeps the list honest without hammering the API.
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  cacheTag("articles", "popular");
  return (await get<{ data: ArticleCard[] }>(`/articles/popular?${q({ locale, limit })}`))?.data ?? [];
}

export async function getCategories(locale: Locale): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("taxonomy");
  return (await get<{ data: Category[] }>(`/categories?${q({ locale })}`))?.data ?? [];
}

export async function getCategory(locale: Locale, slug: string): Promise<CategoryDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("taxonomy");
  return (await get<{ data: CategoryDetail }>(`/categories/${encodeURIComponent(slug)}?${q({ locale })}`))?.data ?? null;
}

export async function getTag(locale: Locale, slug: string): Promise<Tag | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("taxonomy");
  return (await get<{ data: Tag }>(`/tags/${encodeURIComponent(slug)}?${q({ locale })}`))?.data ?? null;
}

export async function getPopularTags(locale: Locale, limit = 30): Promise<Tag[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("taxonomy", "articles");
  return (await get<{ data: Tag[] }>(`/tags?${q({ locale, limit })}`))?.data ?? [];
}

export async function getAuthor(locale: Locale, slug: string): Promise<Author | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("authors");
  return (await get<{ data: Author }>(`/authors/${encodeURIComponent(slug)}?${q({ locale })}`))?.data ?? null;
}

export async function getAuthors(locale: Locale): Promise<Author[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("authors");
  return (await get<{ data: Author[] }>(`/authors?${q({ locale })}`))?.data ?? [];
}

export async function getArchiveMonth(locale: Locale, year: number, month: number): Promise<{ day: string; count: number }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  return (await get<{ data: { day: string; count: number }[] }>(`/archive/${year}/${month}?${q({ locale })}`))?.data ?? [];
}

export async function getEditorialPage(locale: Locale, key: string): Promise<EditorialPage | null> {
  "use cache";
  cacheLife("days");
  cacheTag("pages");
  return (await get<{ data: EditorialPage }>(`/pages/${encodeURIComponent(key)}?${q({ locale })}`))?.data ?? null;
}

export async function getPublishedPages(locale: Locale): Promise<{ key: string; title: string }[]> {
  "use cache";
  cacheLife("days");
  cacheTag("pages");
  return (await get<{ data: { key: string; title: string }[] }>(`/pages?${q({ locale })}`))?.data ?? [];
}

export async function getAdPlacements(): Promise<AdPlacement[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("ads");
  return (await get<{ data: AdPlacement[] }>(`/ads/placements`))?.data ?? [];
}

export interface SitemapEntry {
  slug: string;
  title: string;
  publishedAt: string;
  lastModified: string;
  alternate: { locale: Locale; slug: string } | null;
}

export async function getSitemapArticles(locale: Locale, page = 1, since?: string): Promise<{ data: SitemapEntry[]; meta: PageMeta }> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles");
  return (
    (await get<{ data: SitemapEntry[]; meta: PageMeta }>(`/sitemap/articles?${q({ locale, page, since })}`)) ?? {
      data: [],
      meta: { page, limit: 5000, total: 0, totalPages: 1 },
    }
  );
}

/** Recent slugs prerendered at build time; other stories render on first visit. */
export async function getRecentSlugs(locale: Locale, limit = 30): Promise<string[]> {
  const res = await getArticles(locale, { limit: Math.min(limit, 50) });
  return (res?.data ?? []).map((a) => a.slug);
}

export interface SiteConfig {
  features: { newsletter: boolean; mediaUploads: boolean; aiAssist: boolean; comments: boolean };
}

export async function getSiteConfig(): Promise<SiteConfig> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  return (
    (await get<{ data: SiteConfig }>(`/config`))?.data ?? {
      features: { newsletter: false, mediaUploads: false, aiAssist: false, comments: false },
    }
  );
}

export async function getBreaking(locale: Locale): Promise<ArticleCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");
  return (await get<{ data: ArticleCard[] }>(`/articles/breaking?${q({ locale })}`))?.data ?? [];
}
