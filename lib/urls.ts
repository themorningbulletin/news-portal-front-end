import { SITE_URL, type Locale } from "./config";

/**
 * Route params arrive percent-encoded in some runtimes and decoded in others,
 * and Bangla text can be typed in more than one Unicode form. Normalising
 * here makes /bn/news/জাতীয় and its encoded form resolve to the same story.
 */
export function decodeSlug(raw: string): string {
  let value = raw;
  if (/%[0-9a-f]{2}/i.test(value)) {
    try {
      value = decodeURIComponent(value);
    } catch {
      // Leave malformed input as is; the API answers 404.
    }
  }
  return value.normalize("NFC");
}

const seg = (s: string) => encodeURIComponent(s);

export const paths = {
  home: (l: Locale) => `/${l}`,
  latest: (l: Locale) => `/${l}/latest`,
  article: (l: Locale, slug: string) => `/${l}/news/${seg(slug)}`,
  category: (l: Locale, slug: string) => `/${l}/category/${seg(slug)}`,
  tag: (l: Locale, slug: string) => `/${l}/tag/${seg(slug)}`,
  author: (l: Locale, slug: string) => `/${l}/author/${seg(slug)}`,
  archive: (l: Locale) => `/${l}/archive`,
  archiveDay: (l: Locale, day: string) => `/${l}/archive/${day}`,
  search: (l: Locale, q?: string) => `/${l}/search${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  topics: (l: Locale) => `/${l}/topics`,
  info: (l: Locale, key: string) => `/${l}/info/${key}`,
  account: (l: Locale) => `/${l}/account`,
  login: (l: Locale, next?: string) => `/${l}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`,
  admin: (l: Locale, sub = "") => `/${l}/admin${sub ? `/${sub}` : ""}`,
};

export const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

/** Only same-site relative paths are accepted as post-login destinations. */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
